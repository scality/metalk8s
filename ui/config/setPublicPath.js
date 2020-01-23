// For lazy loading within an application to work you need to set webpack's public path
// basically webpack's internal module system always looks for code-splits (modules) at the root
export default function setPublicPath() {
  return Promise.all([getUrl()]).then(values => {
    const [url] = values;
    const webpackPublicPath = url.slice(0, url.lastIndexOf('/') + 1);

    __webpack_public_path__ = webpackPublicPath;
    return true;
  });
}

function getUrl() {
  console.log(window.System);
  for (const [id, ns] of window.System.entries()) {
    //TODO to be improved
    if (id.includes('metalK8s')) {
      return window.System.resolve(id);
    }
  }
  return '';
}
