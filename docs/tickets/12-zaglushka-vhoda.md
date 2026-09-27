# 12: Заглушка входа и Аккаунт

**What to build:** Человек регистрируется и входит. WebAuthn не вызывается, письмо не уходит, код принимается любой, но экраны и форма данных настоящие.

**Blocked by:** 06

**Status:** closed

- [x] Регистрация спрашивает никнейм и почту
- [x] Код подтверждения запрашивается, в заглушке принимается любой
- [x] Аккаунт получает постоянный непрозрачный идентификатор на 64 байта
- [x] Вход держится между запусками приложения
- [x] Токен Сеанса лежит в куке, которую ставит сервер, а не скрипт
- ~~Список Сеансов виден, любой гасится по отдельности~~ moved to phase 2, see ADR-0012
- ~~Есть гашение всех Сеансов кроме текущего~~ moved to phase 2, see ADR-0012
- [x] При регистрации показано предупреждение, что аккаунт живёт в связке ключей
- [x] Форма данных совпадает с настоящей: фаза 2 меняет начинку, а не переписывает экраны

## Comments

Interpretations taken during implementation, 2026-09-27:

- Account, key, email code and Auth session operations live in their own capsule `account`, behind `AccountStore` (`src/lib/account/application/account-store.ts`) with its own contract suite `src/test/account-store-contract.ts`. The intake draws one `Store`; the split follows the capsule layout and keeps the Session Store untouched. Phase 1 keeps them in a separate IndexedDB database `training-account`, rows shaped as `person`, `email_code`, `credential`, `auth_session` of the data model.
- The Account's persistent opaque identifier is `handle`: 64 random bytes, hex. `id` stays a UUIDv7 as in the data model, and Session and History are keyed by it.
- The stub sits in two places only: `confirmEmail` accepts any code while an unused code issued less than ten minutes ago exists (the code hash is stored, the mail is not sent), and `createStubAuthenticator` makes a key of the passkey's shape without calling WebAuthn.
- The server stays stateless: `POST /auth/session` sets the Auth session token as an `httpOnly` cookie for 400 days, `DELETE` removes it, and `+layout.server.ts` hands the token to the client, which resolves it against IndexedDB. In phase 2 the server resolves it itself.
- Sign-in is not a route and never redirects (operator, 2026-09-27). `src/routes/authorized.svelte` is a high-level component: each page wraps its screen in it, and without an Auth session it renders the sign-in form instead of the screen. Page loads return a signed-out marker instead of reading the Account's data.
- A registration on an email that already has an Account on this device attaches a new key to that Account instead of failing, as the second-device flow of the map describes.
- Programs are listed to every Account; the active Session is keyed by the signed-in Account, not by the Program's owner. `ProgramCardView` lost its `account` field.
- Revoking an Auth session on another device is only as real as phase 1 allows: the list shows what this device's store holds.

Correction, 2026-09-27 ([ADR-0012](../adr/0012-temporary-data-lives-only-in-session-storage.md)):

- The email code no longer lives in IndexedDB. The `email_code` table kept every used and expired code forever. The code now lives in `sessionStorage` under the Account's id and is removed on the first confirmation attempt.
- Revocation is removed from phase 1. A revocation mark on this device cannot reach any other device, and only the server can revoke. `revokeSession`, `revokeOtherSessions`, `sessionsOf` and `revokedAt` are gone, and the Account screen shows only the nickname and email. Leaving the Account asks the server to drop the cookie, then deletes this device's Auth session row (`signOut`).
- The Account database is at version 3. The upgrade drops `email_code` and deletes Auth session rows that carried a revocation mark.
- The two checklist items on revoking Auth sessions move to phase 2, together with the server-side store.
