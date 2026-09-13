# Account identity is the WebAuthn user handle

An Account is identified by 64 random bytes used as the WebAuthn user handle. The handle belongs to the Account, not to a key, and becomes immutable once the first passkey exists: authenticators index keys by relying party and handle, so reusing a handle silently replaces a key and changing it orphans all of them. The editable nickname is a separate field.

Recovery relies on keychain sync (Apple, Google); there are no recovery codes, and registration warns that losing the keychain loses the Account. The domain lives in an environment variable and must be fixed before phase 2, because the handle is bound to it and Related Origin Requests is not a migration tool. The Auth session cookie is set by the server, since script-set cookies on iOS expire after seven days.

## Considered Options

- Recovery codes: the only NIST recovery class compatible with an account that has no verified identity, but FIDO (2025) classes them as phishable. Rejected in favour of keychain sync.
- Whether the verified email becomes a recovery path is still open.

Research: [passkey-auth.md](../intake/research/passkey-auth.md).
