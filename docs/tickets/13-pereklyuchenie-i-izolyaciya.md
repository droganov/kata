# 13: Переключение между Аккаунтами с изоляцией данных

**What to build:** На одном устройстве живут несколько Аккаунтов. Каждый видит только своё, переключение ничего не стирает.

**Blocked by:** 12

**Status:** closed

- [x] Меню по аватару показывает текущего и всех, кто входил на этом устройстве
- [x] Переключение требует подтверждения ключом, в заглушке имитируется
- [x] Запись из списка удаляется, данные при этом остаются
- [x] После повторного входа удалённая запись возвращается вместе со всей Историей
- [x] Хранилище ключуется идентификатором Аккаунта
- [x] Данные разных Аккаунтов не пересекаются, проверено тестом
- [x] Активное Занятие принадлежит Аккаунту: переключение не показывает чужое

## Comments

**Evaluate interocitor before implementing this ticket** (added 2026-09-14). General criteria and context are in ticket 15. Specific to this ticket:

- **Isolation.** Here isolation comes from keying storage by Account id. In interocitor the unit of access is the mesh. Is that one mesh per Account on a shared device? How does switching open one mesh and close another without wiping either?
- **Forgetting an Account.** Removing an Account's entry from the device must not delete its data, and signing in again must bring back all of its History. Does that hold with local mesh stores and stored credentials, or does forgetting the Account also forget its key?
- **Switching.** Switching Accounts requires confirming with a passkey. Does interocitor's WebAuthn credential custody fit that flow, or duplicate it?

Interpretations taken during implementation, 2026-09-27:

- The device list lives in the Account capsule, next to Auth sessions: `knownAccounts` and `forgetAccount` are on `AccountStore`, not on the Session Store as `store-interface.md` draws them, following ticket 12. It is a `device_account` table in the `training-account` IndexedDB database, now at version 2; an existing version 1 database is upgraded in place and keeps its Accounts.
- An entry is the Account id, the nickname at sign-in, the key id that signed in and the sign-in time. It holds no secret. The avatar is the first letter of the nickname, not a stored field.
- Every `signIn` writes the entry in the same transaction as the Auth session, so a sign-in after `forgetAccount` brings the entry back. The list shows the last sign-in first. Someone who signed in before this ticket appears after their next sign-in.
- `forgetAccount` removes the entry only. Account, keys, Auth sessions, History and the Active session stay, and a test proves History comes back after signing in again.
- Switching (`account/application/switch-account.ts`) asks the Authenticator to confirm with the key named in the entry, so the system dialog asks about that Account and does not offer a choice of all keys. The stub's `confirmKey` takes that key without calling WebAuthn. A declined key leaves the person where they were.
- A switch opens a new Auth session for the chosen Account, asks the server to set its cookie, and only then revokes the previous Auth session on this device. If the cookie request fails, the person stays in the current Account.
- The avatar menu sits in the Program list header. It shows the current Account (a link to the Account screen) and everyone else on the list, each with switch and remove. It also has «Войти в другой Аккаунт», which revokes the current Auth session so the sign-in form shows: without it a second person could not reach the list.
- Isolation needed no new storage: History and the Active session were already keyed by Account id. Tests at the Program list load prove that after a switch neither the other Account's Active session nor its History is visible, and that both come back on switching back.

interocitor evaluation for this ticket, 2026-09-27 (repo read at commit 624f01b, `@interocitor/core` and `@interocitor/web` 0.3.0; npm latest core 0.2.0, web 0.2.1):

- **Isolation.** One engine per Account, each with its own `dbName`, maps onto keying by Account id. Credentials are stored per `dbName` (`interocitor-creds:<dbName>` in localStorage), and reusing a `dbName` for another mesh throws `MeshCredentialMismatchError`. `engine.disconnect()` flushes and closes the local store without deleting anything, and opening one engine never touches another database. There is no multi-mesh manager, so the app would hold one engine per Account itself. Local stores do not encrypt rows at rest, so isolation on a shared device would be by name only.
- **Forgetting an Account.** interocitor has no leave or forget API. Dropping our list entry keeps the mesh database and its stored key, and reopening the same `dbName` restores the key silently. Its only "forget", `clearCredentials()`, removes the key: the rows stay but cannot be reopened without re-pairing or the recovery phrase, and a reopen after it mints a new key and risks forking the mesh. Our `forgetAccount` must therefore never call `clearCredentials()` or `resetLocalDatabase()`.
- **Switching.** Its WebAuthn custody (`WebAuthnBlobStore`) enrolls its own credential through largeBlob and runs its own `navigator.credentials.get`, which would duplicate our passkey prompt. It does accept an external key source (`MeshKeySource`, `PortablePassphraseKeySource` with no credential store, or a custom `CredentialEnvelopeKeyProvider`), so one assertion with the PRF extension could both confirm the switch and unwrap the mesh key. `keySource: null` means an unencrypted mesh.
- **Outcome: defer.** Switching needs nothing from interocitor now. This ticket adds no dependency, and its shape (one store per Account id, forget touches only the list) does not block a later move to one `dbName` per Account. The ADR belongs to ticket 15.
