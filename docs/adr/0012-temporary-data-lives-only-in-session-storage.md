# Temporary data lives only in sessionStorage; revocation belongs to the server

Anything that is temporary on the device lives in `sessionStorage` and nowhere else. IndexedDB is permanent storage: it holds only what must survive, namely the Account, its keys, live Auth sessions, History and the device's list of Accounts. A value that is useless once used or expired, such as an email code, never goes to IndexedDB, because nothing would ever remove it. The email code of the sign-in stub is kept in `sessionStorage` under the Account's id and removed on the first confirmation attempt.

Revoking an Auth session is a server decision: only the server can tell another device that its Auth session is revoked. Phase 1 has no server-side store, so it has no revocation. Leaving the Account on this device asks the server to drop the cookie, then deletes the Auth session row on this device. Nothing records a "revoked" mark on the device.

## Considered Options

- Keep the phase 2 table `email_code` in IndexedDB so the data shape matches the data model: rejected. Used and expired codes stay forever, since the device has no cleanup job.
- Mark Auth sessions revoked locally and list them on the Account screen: rejected. A local mark cannot reach other devices, and every revoked row stays forever.

## Consequences

- The Account database moves to version 3. The upgrade drops `email_code` and deletes Auth session rows that carried a revocation mark.
- A code survives only as long as its tab. A person who closes the tab before entering the code requests a new one.
- The Account screen lists no Auth sessions until phase 2. Listing and revoking Auth sessions on other devices come with the server-side store.
- History is permanent, not temporary. It is pruned to three weeks whenever it is written, so the window holds for as long as the Account is used.
