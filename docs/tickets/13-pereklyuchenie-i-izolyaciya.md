# 13: Переключение между Аккаунтами с изоляцией данных

**What to build:** На одном устройстве живут несколько Аккаунтов. Каждый видит только своё, переключение ничего не стирает.

**Blocked by:** 12

**Status:** ready-for-agent

- [ ] Меню по аватару показывает текущего и всех, кто входил на этом устройстве
- [ ] Переключение требует подтверждения ключом, в заглушке имитируется
- [ ] Запись из списка удаляется, данные при этом остаются
- [ ] После повторного входа удалённая запись возвращается вместе со всей Историей
- [ ] Хранилище ключуется идентификатором Аккаунта
- [ ] Данные разных Аккаунтов не пересекаются, проверено тестом
- [ ] Активное Занятие принадлежит Аккаунту: переключение не показывает чужое

## Comments

**Evaluate interocitor before implementing this ticket** (added 2026-09-14). General criteria and context are in ticket 15. Specific to this ticket:

- **Isolation.** Here isolation comes from keying storage by Account id. In interocitor the unit of access is the mesh. Is that one mesh per Account on a shared device? How does switching open one mesh and close another without wiping either?
- **Forgetting an Account.** Removing an Account's entry from the device must not delete its data, and signing in again must bring back all of its History. Does that hold with local mesh stores and stored credentials, or does forgetting the Account also forget its key?
- **Switching.** Switching Accounts requires confirming with a passkey. Does interocitor's WebAuthn credential custody fit that flow, or duplicate it?
