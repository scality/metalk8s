import ReactDOM from 'react-dom';
import "@fortawesome/fontawesome-free/js/all.js";

import NavbarMdx from './src/navbar/index.mdx';

import AlertsMdx from './src/alerts/index.mdx';

ReactDOM.render(<>
    <NavbarMdx />
    <AlertsMdx />
</>, document.getElementById('app'));
