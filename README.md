# CareFund V17 — Live deployment fix

This version fixes the login/register buttons being unresponsive on deployments using Helmet.
The frontend uses inline JavaScript and inline onclick handlers, so the server disables Helmet's
Content Security Policy while retaining the other Helmet security headers.

Render settings:
- Build Command: npm install
- Start Command: node server.js
- Health Check Path: /api/health
