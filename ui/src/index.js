import 'whatwg-fetch'
import { JWK, JWS } from 'node-jose';
import { OIDC_PROVIDER, API_SERVER } from './config';

const UNSAFE_NONCE = 'abcde';

async function renderLoginLink() {
    const response = await fetch(OIDC_PROVIDER + '/.well-known/openid-configuration');
    const openidConfiguration = await response.json();
    const endpoint = openidConfiguration['authorization_endpoint'];

    const auth = new URL(endpoint);
    const qa = auth.searchParams;
    qa.set('audience', '');
    qa.set('client_id', 'kubernetes');
    qa.set('redirect_uri', 'http://localhost:8000/callback');
    qa.set('response_type', 'id_token');
    qa.set('scope', 'openid profile email offline_access');
    qa.set('nonce', UNSAFE_NONCE);

    const link = document.createElement('a');
    link.href = auth.toString();
    link.text = 'Login';
    document.body.append(link);
}

async function doLogin() {
    const idTokenEncoded = RegExp('[#&]id_token=([^&]*)').exec(window.location.hash);
    if(!idTokenEncoded) {
        throw 'Blah';
    }
    const idToken = decodeURIComponent(idTokenEncoded[1].replace(/\+/g, ' '));

    const response = await fetch(OIDC_PROVIDER + '/.well-known/openid-configuration');
    const openidConfiguration = await response.json();
    const keysLocation = openidConfiguration['jwks_uri'];
    const keysResponse = await fetch(keysLocation);
    const keys = await keysResponse.json();
    const keystore = await JWK.asKeyStore(keys);

    const verifiedIdToken = await JWS.createVerify(keystore).verify(idToken);

    const payload = JSON.parse(verifiedIdToken.payload.toString());

    if(payload['nonce'] != UNSAFE_NONCE) {
        throw 'Nonce mismatch';
    }
    if(payload['iss'] != OIDC_PROVIDER) {
        throw 'Huh?!';
    }
    const p = document.createElement('p');
    // Yeah yeah HTML injection blah
    p.innerHTML = 'Welcome, ' + payload['name'] + '!';
    document.body.append(p);

    const nodes = await apiGetNodes(idToken);


    let l = '<h1>Node list</h1><ul>';
    for(const node in nodes.items) {
        l += '<li>' + nodes.items[node].metadata.name + '</li>';
    }
    l += '</ul>';

    const d = document.createElement('div');
    d.innerHTML = l;
    document.body.append(d);
}

async function apiGetNodes(token) {
    const url = API_SERVER + '/api/v1/nodes';
    const result = await fetch(url, {
        headers: {
            'Authorization': 'Bearer ' + token,
        },
    });
    return await result.json();
}

async function main() {
    if(window.location.pathname == '/callback') {
        doLogin();
    }
    else {
        renderLoginLink();
    }
}

main();
