# Security Policy

## Reporting a vulnerability

Please **do not** open a public issue for a security problem.

Use GitHub's [private vulnerability reporting](https://github.com/can4hou6joeng4/Semaphore/security/advisories/new)
instead. Expect a first reply within a few days.

## Scope

Semaphore is a static site. There is no backend, no database, no accounts and no
user data at rest — which rules out most of the usual categories. What is in scope:

- XSS or HTML injection through a filename, a share-card caption, or converted output
- A way to make the page send image data off the device (this should be impossible:
  production ships `Content-Security-Policy: … connect-src 'none'`)
- Supply-chain problems in the three build dependencies
- A `_headers` misconfiguration that weakens the deployed CSP or cache policy

Out of scope: anything requiring a compromised browser or physical access to the
device, and reports about the absence of features the project deliberately does not
have (accounts, uploads, server-side rendering).
