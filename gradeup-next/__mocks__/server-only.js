// Jest mock for the 'server-only' package.
// The real package throws to prevent client-side bundling.
// In Jest (jsdom) we just no-op so server-side modules can be tested normally.
module.exports = {};
