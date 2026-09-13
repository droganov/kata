# Sign-in exists from phase 1, as a stub

Every person signs in from the first release; data isolation on a shared device comes from the Account. Phase 1 ships the real screens and the real data shape, but WebAuthn is not called, no email is sent and any code is accepted. Phase 2 swaps the internals without rewriting screens.

## Considered Options

- An anonymous local identity (64 random bytes on first launch) merged into an Account later, as the passkey research suggested: rejected. With sign-in from day one there is nothing to merge and no mapping table to carry forever.
