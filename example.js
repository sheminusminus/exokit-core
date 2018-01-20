const browserPoly = require('.');

const appUrl = `http://127.0.0.1:8000`;
const html = browserPoly(`\
  <html>
    <body>
      <script>
        console.log('run inline script');
      </script>
      <script src="${appUrl}/archae/index.js"></script>
    </body>
  </html>
`, {
  url: appUrl,
});
const {window} = html;
window.addEventListener('error', err => {
  console.warn('got error', err.error.stack);
});
const {document} = window;

const blob = new window.Blob(['function lol() { console.log("run blob script"); }; lol();'], {type: 'application/javascript'});
const worker = new window.Worker(blob);
/* setTimeout(() => {
  worker.terminate();
}, 1000); */