// Stub for @react-pdf/renderer in tests that only need the module graph to
// load (e.g. building the Swagger doc, e2e specs that boot AppModule) but
// never actually render a PDF. The real package pulls in yoga-layout, which
// uses `import.meta.url` and can't be parsed by Jest's CommonJS transform.
function stubComponent() {
  return null;
}

module.exports = {
  Document: stubComponent,
  Page: stubComponent,
  Text: stubComponent,
  View: stubComponent,
  StyleSheet: { create: (styles) => styles },
  renderToBuffer: async () => Buffer.from(''),
};
