# Secrets typed into a browser app

Oct 24, 2026 · For [11 Optional plugins](../plans/11-optional-plugins.md)

**Question.** Connections to Azure SQL, MongoDB, AWS and Google need passwords, keys and connection strings, and the user types them into the app. There is no backend to keep them. Where should the browser keep them, and how?

**Answer.** Keep them in memory while the app runs. Save one only when the user asks, encrypted with a key derived from a passphrase. Serve the app from an origin of its own, and ask for read-only, least-privilege, short-lived credentials.

## What the sources say

- **OWASP HTML5 Security Cheat Sheet:** don't keep sensitive data in `localStorage`. One XSS reads everything in it, and anyone with access to the machine can too. `sessionStorage` narrows the exposure to one tab when the data needn't persist. The Web Security Testing Guide adds: keep sensitive data on the server where you can.
- **How password managers' web vaults do it (Bitwarden):**
  - the key is derived from the master password on the device, with PBKDF2-SHA256 at 600,000 iterations by default (Argon2id optional);
  - the vault is encrypted at rest;
  - the key never leaves the device and is deleted when the vault locks.
- **OWASP Password Storage Cheat Sheet:** Argon2id is preferred; PBKDF2-HMAC-SHA256 needs at least 600,000 iterations. WebCrypto has PBKDF2 but no Argon2id, so a browser-only vault uses PBKDF2 at 600k.
- **WebAuthn PRF** (a passkey derives the key, so no passphrase):
  - reliable with Google Password Manager and iCloud Keychain passkeys;
  - newer on Windows Hello (Windows 11 25H2, recent Chrome and Firefox);
  - inconsistent across third-party managers (a 2026 1Password regression).

  Worth adding as a second unlock method later, not as the only one.

## What this means here

- **The origin is shared.** GitHub Pages serves every project site of an account from `<user>.github.io`, and they all share one `localStorage`. Another of the user's sites could:
  - read saved data, which is why secrets are encrypted;
  - **rewrite a connection's settings**, for example its relay URL, so that the next query sends the decrypted secrets elsewhere. The vault therefore keeps each connection's settings, as saved, inside the encrypted entry, and refuses to use the secrets when the stored settings differ.

  A dedicated origin removes the problem: a custom domain (the Student Developer Pack lists free Namecheap domains) or a host that gives each project its own subdomain.

- **Encryption at rest doesn't stop XSS while the vault is unlocked.** The real limits are:
  - credentials that can only read: a `db_datareader` login, Atlas's `read` role, an IAM policy per service, BigQuery Data Viewer and Job User;
  - short lifetimes: AWS session tokens, Google access tokens;
  - keeping secrets out of everything that leaves the vault: dashboards, exports, URLs, query keys, Inspect, toasts and logs.

## Sources

- [OWASP HTML5 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html)
- [OWASP Web Security Testing Guide: browser storage](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/11-Client-side_Testing/12-Testing_Browser_Storage)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Bitwarden: KDF algorithms](https://bitwarden.com/pdf/help-kdf-algorithms.pdf)
- [Bitwarden: security fundamentals](https://bitwarden.com/blog/bitwarden-security-fundamentals-and-multifactor-encryption/)
- [Corbado: passkeys and the WebAuthn PRF extension](https://www.corbado.com/blog/passkeys-prf-webauthn)
- [1Password community: PRF regression](https://www.1password.community/developers-69/browser-extension-webauthn-prf-extension-not-spec-compliant-24672)
- [Student developer perks in 2026](https://www.buildmvpfast.com/blog/student-developer-perks-free-ai-tools-copilot-cursor-2026)
