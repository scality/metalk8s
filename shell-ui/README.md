# Dev guideline

When we develop on this project, each time your import component from core-ui.
Make sure to import the component directly from the component file.

We need to do that because we have this configuration on module federation :
``` js
'@scality/core-ui': {
    singleton: true,
}
```

We want to avoid to set the option `eager: true` because will load core-ui 
completely at the beginning and cause significative performance issues.


## Legacy - solutions-navbar

Common navbar that can be integrated in metalk8s solution UI to provide the following features : 

 - Authentication : token negociation, token renewal, claims provider
 - Theming : provide the selected theme to solution UIs
 - I18n : provide a language selector and expose selected language to solution UIs

## Contribute

```js
$ npm run start
```

## Build

```js
$ npm run build
```

## Use

```html
<script src="./dist/main.js"></script>
<solutions-navbar 
    oidc-provider-url="https://oidc.provider/" 
    scopes="openid mail scope"

 />
```

### Attributes

 - oidc-provider-url : string, required, the component will suffix it with .well-known/openid-configuration to retrieve OIDC configuration
 - scopes : string, required, scopes negiciated with the oidc provider
 - client-id : string, required  
 
 - redirect-url : string, customized redirect uri
 - provider-logout: boolean, if true, redirect to the provider logout endpoint.
 - options : {[url: string]: {en: string, fr: string, roles: string[]}} -- eg : {"/": {en: "Overview", fr: "Vue generale", roles: ["admin"]}, "/platform": {en: "Platform", fr: "Infrastructure"}, ...} - by default we display the full navbar in static mode, this attribute can be used if we want to extends the menu in a specific context

## Methods 

 - logOut(providerLogout: boolean): void - force logOut, might be called when an UI receive a 401 or 403 status code for example. If providerLogout true, redirect to the provider logout endpoint.
 - getClaims(): Promise<Claims>
 - getIdToken(): Promise<string> - jwtToken
 - getLanguage(): "en" | "fr"
 - getTheme(): Theme
 - getOptions(): {[url: string]: {en: string, fr: string}}

## Events 

 - solutions--authenticated, payload: {token, claims: {roles, instanceIds, firstName, lastName, email, scopes, ...}} --- also called when the token is renewed
 - solutions--logged-out, payload : {}
 - solutions--theme-changed, payload: {theme}
 - solutions--language-changed, payload: {language: "en" | "fr"}
