# Passkey и регистрация промышленного уровня

Собрано 10 сентября 2026 по первоисточникам: W3C, FIDO Alliance, NIST, MDN (данные совместимости взяты из BCD, снимок `2026-09-10`), документация Apple, Google, Microsoft, passkeys.dev.
Ссылка на источник стоит рядом с каждым утверждением. Где источники расходятся или молчат — сказано прямо, в разделе «Что осталось непроверенным».

Читатель — инженер, который решает форму локальной личности в фазе 1 так, чтобы в фазе 2 к ней можно было пристегнуть passkey без потери накопленных данных. Раздел 6 переводит факты в это решение.

---

## 0. Короткие выводы

1. WebAuthn **Level 3 — Рекомендация W3C от 25 августа 2026**, Level 2 ею вытеснен ([w3.org/TR/webauthn-3](https://www.w3.org/TR/webauthn-3/), [история публикации](https://www.w3.org/standards/history/webauthn-3/)). Опираться надо на `-3`: в Level 2 нет ни credential record, ни флагов BE/BS, ни Related Origin Requests.
2. Идентификатор человека в passkey — это `user.id`, он же **user handle**: непрозрачная последовательность не длиннее 64 байт, без персональных данных, задаётся один раз и после выдачи ключа не меняется ([§5.4.3](https://www.w3.org/TR/webauthn-3/#dictdef-publickeycredentialuserentity), [§14.6.1](https://www.w3.org/TR/webauthn-3/#sctn-user-handle-privacy)). Это ровно та форма, которую должен иметь локальный идентификатор человека в фазе 1.
3. Passkey как единственный путь входа спецификация не запрещает, но требует запасного: «Relying Parties SHOULD ensure that each user account has additional authenticators registered and/or an account recovery process in place» ([§6.1.3](https://www.w3.org/TR/webauthn-3/#sctn-credential-backup)). NIST формулирует то же: «SHOULD encourage subscribers to maintain at least two separate means of authentication» ([SP 800-63B-4 §4.1.2.1](https://pages.nist.gov/800-63-4/sp800-63b/events/)).
4. Для анонимного аккаунта без установления личности FIDO Alliance признаёт, что восстановление невозможно, и разрешает такой режим при условии, что человека предупредили ([FIDO Account Recovery, 2019](https://fidoalliance.org/wp-content/uploads/2019/02/FIDO_Account_Recovery_Best_Practices-1.pdf)).
5. Passkey жёстко привязан к RP ID — доменному имени. Смена домена обесценивает все выданные ключи, и Related Origin Requests **это не лечит**: он требует бессрочно сохранять контроль над старым доменом ([§5.11](https://www.w3.org/TR/webauthn-3/#sctn-related-origins)).
6. Промышленный способ склейки — не «перенести данные», а **сделать анонимную личность полноценной учётной записью с самого начала и потом привязать к ней ключ**. Так устроены Firebase, Supabase и Cognito ([Firebase](https://firebase.google.com/docs/auth/web/anonymous-auth), [Supabase](https://supabase.com/docs/guides/auth/auth-anonymous), [Cognito](https://docs.aws.amazon.com/cognito/latest/developerguide/authentication-flow.html)).
7. Отдельно для issue 04 (несколько человек на устройстве): Google прямо пишет «**To protect your account from other users, do not create a passkey on a shared device**» ([Google Account Help](https://support.google.com/accounts/answer/13548313)).

---

## 1. WebAuthn и passkey сегодня

### 1.1 Уровень спецификации

- **Web Authentication Level 3 — W3C Recommendation, 25 августа 2026** ([w3.org/TR/webauthn-3](https://www.w3.org/TR/webauthn-3/), датированная версия [REC-webauthn-3-20260825](https://www.w3.org/TR/2026/REC-webauthn-3-20260825/)). Путь: FPWD апрель 2021 → CR 13 января 2026 → CR 26 мая 2026 → REC ([история](https://www.w3.org/standards/history/webauthn-3/)). В самой Рекомендации сказано: «There have been no substantive changes since the Candidate Recommendation Snapshot of 26 May 2026».
- Level 2 — REC от 8 апреля 2021 ([webauthn-2](https://www.w3.org/TR/webauthn-2/)), вытеснена. Неверсионный `https://www.w3.org/TR/webauthn/` теперь ведёт на Level 3.
- Level 4 ещё не опубликован. Анонс W3C: «Level 3 is the successor to Web Authentication Level 2. **New features will be developed in Level 4**» ([w3.org/news](https://www.w3.org/news/2026/web-authentication-an-api-for-accessing-public-key-credentials-level-3-is-now-a-w3c-recommendation/)); веха «L4 First Published Working Draft» в трекере рабочей группы датирована 9 сентября 2026 и на момент сбора не закрыта ([milestone 27](https://github.com/w3c/webauthn/milestone/27)).

Что Level 3 добавил — по нормативному разделу «Substantive Changes» ([§18.1.1](https://www.w3.org/TR/webauthn-3/#changes-since-l2)):

- JSON-сериализация опций: `toJSON()`, `parseCreationOptionsFromJSON()`, `parseRequestOptionsFromJSON()`;
- условная медиация для `create()` — «passkey upgrades»;
- `getClientCapabilities()` ([§5.1.7](https://www.w3.org/TR/webauthn-3/#sctn-getClientCapabilities));
- сигнальные методы `signalUnknownCredential()`, `signalAllAcceptedCredentials()`, `signalCurrentUserDetails()` ([§5.1.10](https://www.w3.org/TR/webauthn-3/#sctn-signalCredentials));
- Related Origin Requests и регистрация `.well-known/webauthn` ([§5.11](https://www.w3.org/TR/webauthn-3/#sctn-related-origins), [§12.5](https://www.w3.org/TR/webauthn-3/#sctn-well-known-uri-reg));
- **флаги BE и BS в authenticator data** ([§6.1.3](https://www.w3.org/TR/webauthn-3/#sctn-credential-backup));
- транспорт `hybrid`, `topOrigin` в client data, подсказки `PublicKeyCredentialHint`, расширение `prf`.

Две поправки к расхожим спискам:

- **`largeBlob` — это возможность Level 2, а не Level 3.** Она описана в §10.1.5 обоих уровней и отсутствует в перечне новых возможностей §18.1.1.
- **`devicePubKey` (позже `supplementalPubKeys`) отменён, а не отложен.** В тексте Рекомендации и в редакторском черновике его нет; расширение убрали PR [w3c/webauthn#2109](https://github.com/w3c/webauthn/pull/2109) с формулировкой «This extension will not have two interoperable implementations within the Level 3 timeframe». Практическое следствие: **стандартного способа получить device-bound ключ рядом с синхронизированным passkey сейчас нет.**

### 1.2 Поддержка в браузерах

Базовый API — Baseline: Widely available, «available across browsers since September 2021» ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API)), только в защищённом контексте. Первые версии по BCD: Chrome 67, Edge 18, Firefox 60, Safari 13, Chrome Android 70, Safari iOS 13, Firefox Android 92. Глобальное покрытие по caniuse — около 96% ([caniuse.com/webauthn](https://caniuse.com/webauthn)).

| Возможность | Состояние на сентябрь 2026 |
| --- | --- |
| Условная медиация для входа (`mediation: "conditional"`) | Baseline widely available с октября 2023. Прокси-детект — `isConditionalMediationAvailable()`: Chrome 108, Edge 108, Firefox 119, Safari 16 ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredential/isConditionalMediationAvailable_static)) |
| `getClientCapabilities()` | Baseline 2025, «newly available» с февраля 2025: Chrome 133, Firefox 135, Safari 17.4 ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredential/getClientCapabilities_static)) |
| Conditional create (тихое создание passkey) | Chrome desktop 136, Chrome Android 142 ([Chrome blog](https://developer.chrome.com/blog/passkey-automatic-upgrades)); Safari 18.0 ([WebKit](https://webkit.org/blog/15865/webkit-features-in-safari-18-0/)); Firefox — нет |
| Сигнальные методы | Chrome 132, Edge 132, Safari 26 ([WebKit](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/)); **Firefox — нет**. MDN: «Limited availability… not Baseline» ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredential/signalUnknownCredential_static)) |
| Related Origin Requests | Chrome 128+, Safari 18.0 ([WebKit](https://webkit.org/blog/15865/webkit-features-in-safari-18-0/)); по Firefox источники расходятся, см. раздел о непроверенном |

Значения, которые возвращает `getClientCapabilities()` ([§5.1.7](https://www.w3.org/TR/webauthn-3/#sctn-getClientCapabilities)): `conditionalCreate`, `conditionalGet`, `hybridTransport`, `passkeyPlatformAuthenticator`, `userVerifyingPlatformAuthenticator`, `relatedOrigins`, три `signal*`, плюс пробы вида `extension:prf`.

Матрица платформ от passkeys.dev (обновлена 20 мая 2026, [passkeys.dev/device-support](https://passkeys.dev/device-support/)): синхронизированные passkey — Android 9+, ChromeOS 129+, iOS/iPadOS 16+, macOS 13+, Ubuntu только через расширения браузера, Windows — «Planned» со сноской «device-bound passkeys supported». Сторонние менеджеры — Android 14+, iOS 17+, macOS 14+, Windows 25H2+.

### 1.3 Как работает синхронизация ключей

Синхронность ключа сервер видит по двум флагам в `authenticatorData` ([§6.1.3](https://www.w3.org/TR/webauthn-3/#sctn-credential-backup)):

| BE | BS | Значение |
| --- | --- | --- |
| 0 | 0 | single-device credential — ключ живёт на одном устройстве |
| 0 | 1 | комбинация запрещена |
| 1 | 0 | multi-device credential, сейчас не в резервной копии |
| 1 | 1 | multi-device credential, сейчас в резервной копии |

Нормативные ограничения там же: «The value of the BE flag is set during authenticatorMakeCredential operation and **MUST NOT change**»; значение BS может меняться; «It is RECOMMENDED that Relying Parties store the most recent value of these flags with the user account». Терминологическое расхождение, которое стоит держать в голове: W3C говорит «multi-device / single-device credential», FIDO и passkeys.dev — «synced / device-bound» ([passkeys.dev, Terms](https://passkeys.dev/docs/reference/terms/)).

Конкретные механизмы:

- **Apple.** Синхронизация через iCloud Keychain, сквозное шифрование: «Keychain items are transferred from device to device, traveling through Apple servers, but are **encrypted end-to-end so that Apple and other devices can't read their contents**» ([Apple Platform Security](https://support.apple.com/guide/security/icloud-keychain-security-overview-sec1c89c6f3b/web)). Восстановление опирается на escrow в кластере HSM ([Apple](https://support.apple.com/guide/security/secure-icloud-keychain-recovery-secdeb202947/web)) с жёстким пределом: «The escrow service allows only 10 attempts to authenticate and retrieve an escrow record… **After the 10th failed attempt, the HSM cluster destroys the escrow record and the keychain is lost forever**» ([Apple](https://support.apple.com/guide/security/escrow-security-for-icloud-keychain-sec3e341e75d/web)). На Windows passkey Apple не синхронизируются — iCloud для Windows документирует только пароли ([Apple](https://support.apple.com/guide/icloud-windows/set-up-icloud-passwords-icw2babf5e03/icloud)).
- **Google.** «Google Password Manager stores, serves and synchronizes passkeys on Android and Chrome»; passkey, созданные в Chrome на Windows, Linux и ChromeOS, попадают в GPM, на macOS — в GPM или iCloud Keychain, а passkey профиля Chrome на macOS «aren't synchronized» ([Google Identity](https://developers.google.com/identity/passkeys/supported-environments)). Сквозное шифрование обеспечивает GPM PIN ([blog.google, сентябрь 2024](https://blog.google/innovation-and-ai/technology/safety-security/google-password-manager-passkeys-update-september-2024/)).
- **Microsoft — здесь надо различать два разных механизма.**
  1. Passkey Windows Hello **привязаны к устройству**: «Using asymmetric keys provisioned in the TPM, Windows Hello protects authentication by binding a user's credentials to their device» ([Microsoft Learn](https://learn.microsoft.com/en-us/windows/security/book/identity-protection-passwordless-sign-in)). Google подтверждает со своей стороны: «You can also save your passkeys in Windows Hello, but **synchronization or backup aren't supported**» ([Chrome Help](https://support.google.com/chrome/answer/13168025)).
  2. Синхронизация passkey через учётную запись Microsoft **существует** с ноября 2025: Microsoft Password Manager в Edge 142 на Windows, «passkeys sync securely via your Microsoft account and are currently available on Windows devices», при этом «**currently not available for mobile devices or for Microsoft Entra accounts**» ([Edge blog, 3 ноября 2025](https://blogs.windows.com/msedgedev/2025/11/03/microsoft-edge-introduces-passkey-saving-and-syncing-with-microsoft-password-manager/); архитектура — [Edge blog, 22 апреля 2026](https://blogs.windows.com/msedgedev/2026/04/22/engineering-secure-passkey-sync-in-microsoft-password-manager/)). Формулировок про end-to-end encryption в духе Apple и Google Microsoft не даёт: там говорится про TEE и Azure Managed HSM.
  Нативное управление passkey в Windows — начиная с Windows 11 22H2 с KB5030310 ([Microsoft Learn](https://learn.microsoft.com/en-us/windows/security/identity-protection/passkeys/)).
- **Сторонние менеджеры.** Windows: plugin authenticators начиная с 24H2, API `WebAuthNPluginAddAuthenticator` и интерфейс `IPluginAuthenticator` ([Microsoft Learn](https://learn.microsoft.com/en-us/windows/security/identity-protection/hello-for-business/webauthn-apis), [справочник Win32](https://learn.microsoft.com/en-us/windows/win32/api/_webauthn/)). Apple: `ASPasskeyCredentialIdentity` открывает сторонним провайдерам работу с passkey с iOS 17.0 / macOS 14.0 ([Apple Developer](https://developer.apple.com/documentation/authenticationservices/aspasskeycredentialidentity)). Android: `CredentialProviderService` с Android 14 ([Android Developers](https://developer.android.com/identity/sign-in/credential-provider)).
- **Перенос между провайдерами.** Статусы разошлись: **CXF 1.0 — Proposed Standard** с эрратой от 9 марта 2026, **CXP 1.0 — до сих пор Working Draft от 3 октября 2024** с оговоркой «not intended to be a basis for any implementations» ([индекс fidoalliance.org/specs/cx/](https://fidoalliance.org/specs/cx/)). Реализации опираются на формат CXF и транспорт операционной системы: Apple `ASCredentialExportManager` / `ASCredentialImportManager`, доступные с iOS 26.0 и macOS 26.0 ([Apple Developer](https://developer.apple.com/documentation/authenticationservices/ascredentialexportmanager)); Android Credentials Transfer API «using the standardized FIDO Credential Exchange Format (CXF)», библиотека в статусе alpha ([Android Developers](https://developer.android.com/identity/sign-in/credential-transfer)).
  Деталь, важная для раздела 4.2: CXF исключает из переноса ключи со счётчиком — «Passkeys using a non-zero signature counter MUST be excluded from the export» ([CXF 1.0 PS](https://fidoalliance.org/specs/cx/cxf-v1.0-ps-20250814.html)).

### 1.4 Что остаётся привязанным к устройству

- Ключ с `BE = 0` — «single-device credential… the generating authenticator will never allow the credential to be backed up» ([§6.1.3](https://www.w3.org/TR/webauthn-3/#sctn-credential-backup)).
- Аппаратные ключи FIDO2: passkeys.dev определяет device-bound passkey как «a WebAuthn Discoverable Credential that is bound to a single authenticator» ([passkeys.dev](https://passkeys.dev/docs/reference/terms/)). Chrome добавляет практическое: «**Passkeys stored on security keys aren't backed-up. If you lose or reset the security key, you can't recover your passkeys**» ([Chrome Help](https://support.google.com/chrome/answer/13168025)).
- `authenticatorAttachment` **ничего не гарантирует** о привязке к устройству. Спецификация прямо говорит, что платформенный аутентификатор телефона может выступать роуминговым по Bluetooth, и что «An authenticator's attachment modality could change over time» ([§6.2.1](https://www.w3.org/TR/webauthn-3/#platform-attachment)). Это подсказка для диалога выбора, а не свойство ключа.
- Единственные стандартные рычаги, чтобы реально получить device-bound ключ: взять несинхронизирующийся аутентификатор либо потребовать аттестацию. Но **синхронизированные passkey аттестацию не дают**: «synced passkeys do not currently provide attestations» ([FIDO Attestation White Paper, 2024](https://fidoalliance.org/wp-content/uploads/2024/06/EDWG_Attestation-White-Paper_2024-1.pdf)), и Microsoft подтверждает то же для своей платформы ([Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-synced-passkeys)). Значение по умолчанию у `attestation` — `"none"` ([§5.4.7](https://www.w3.org/TR/webauthn-3/#enum-attestation-convey)), и спецификация отдельно предупреждает о рисках прослеживаемости: «Attestation certificates and attestation key pairs can be used to track users or link various online identities of the same user together» ([§14.4.1](https://www.w3.org/TR/webauthn-3/#sctn-attestation-privacy)).
- NIST привязывает синхронизацию к уровню доверия: syncable-аутентификаторы допустимы до AAL2, но «syncing violates the non-exportability requirements of AAL3», и §2.3.2 говорит «syncable authenticators **SHALL NOT** be used at AAL3» ([SP 800-63B-4, Appendix B](https://pages.nist.gov/800-63-4/sp800-63b/syncable-authenticators/)).

---

## 2. Что считается регистрацией промышленного уровня

### 2.1 Прямая рекомендация FIDO Alliance

Документ «Recommended Account Recovery Practices for FIDO Relying Parties», февраль 2019 ([PDF](https://fidoalliance.org/wp-content/uploads/2019/02/FIDO_Account_Recovery_Best_Practices-1.pdf)) задаёт стратегию из двух шагов и больше ни из чего:

1. **Несколько аутентификаторов на аккаунт.** «The primary mechanism to reduce higher-friction account-recovery mechanisms is by encouraging users to register multiple authenticators on their accounts. The loss or breakage of a single FIDO authenticator is minimally impactful to the user when an additional authenticator is readily available.» Дополнительные аутентификаторы регистрируются «at the same or higher assurance level». Сервис обязан дать интерфейс для сообщения об утере и отзывать такие ключи.
2. **Повторное установление личности.** «RPs may fall back to identity proofing of their users using a mechanism at the same or higher assurance level as the initial account bootstrapping.»

Предупреждение против дешёвых обходных путей: «Weaker mechanisms may lower the bar for account recovery by providing a weaker pathway to user identity-proofing or authentication, but this approach would also reduce the value of the FIDO implementation. **Implementing weaker account-recovery options is not recommended by the FIDO Alliance.**» Общий принцип из введения: «The entire ecosystem is only as strong as the weakest link, so account-recovery mechanisms and policies must be clearly defined».

**Абзац, который прямо относится к нашему случаю** (§2 того же документа):

> «In some cases, such as anonymous or pseudonymous accounts established with no identity proofing, RPs may be unable to offer identity proofing-based account-recovery mechanisms, leading to account abandonment. For some users, this may be preferable to being identifiable. … Alternatively, RPs may allow both anonymous and/or identified accounts with the consumer accepting the risk of account loss on anonymous accounts. In these cases, **RPs should inform the user of the risk of account loss**, allowing the user to make an informed decision about the risks.»

Анонимный аккаунт без восстановления — легитимный, признанный FIDO режим, но с обязанностью честно предупредить.

Оговорка о возрасте источника: документ 2019 года, он старше самого понятия passkey — в нём нет ни синхронизированных ключей, ни флагов BE/BS. Единственный конкретный механизм для псевдонимных аккаунтов, который он предлагает, — Delegated Account Recovery от Facebook — **мёртв**: указанный репозиторий переехал в `facebookarchive`. Тем не менее FIDO продолжает ссылаться на этот документ как на действующий в своих материалах 2024 года.

### 2.2 Более свежие материалы FIDO

- «Multiple Authenticators for Reducing Account-Recovery Needs», июнь 2020 ([PDF](https://fidoalliance.org/wp-content/uploads/2020/06/FIDO_White_Paper_Multiple_Authenticators_CDWG.pdf)): «We strongly recommend that RPs support features to enable their users to utilize multiple authenticators per account», и единственное конкретное число во всём корпусе FIDO — «RPs should limit the time between the use of an already-registered authenticator and the connection of a new authenticator to **60 seconds or less**». Документ дописан до появления гибридного транспорта, часть советов устарела.
- **«Passkeys: The Journey to Prevent Phishing Attacks», март 2025** ([Pt1 PDF](https://fidoalliance.org/wp-content/uploads/2025/03/Passkeys-The-Journey-to-Prevent-Phishing-Pt1.pdf)) — сейчас это главный документ FIDO по теме, и он самый жёсткий. Ключевые формулировки:
  - «This classification includes account recovery methods, which are **fundamentally forms of authentication**»;
  - к **фишингуемым** отнесены пароли, OTP любым каналом, TOTP, push-уведомления и **коды восстановления**;
  - к фишингоустойчивым — passkey (и синхронизированные, и device-bound), сетевая аутентификация оператора, клиентские сертификаты TLS;
  - магические ссылки по почте отнесены к неклассифицируемым: «they don't have any theoretical protection against phishing»;
  - на верхней ступени зрелости: «RPs must not rely on phishable methods for login or account recovery under any conditions… **Fallback to phishable methods is not permitted**»;
  - и честное признание разрыва: «Without phishing-resistant account recovery options, RPs must rely on methods like email magic links when users lose passkey access… even if the RP reaches the Full Prevention stage, it may not be able to meet the RP's requirement for adequate security».
- «Synced Passkey Deployment: Emerging Practices for Consumer Use Cases», 2024 ([PDF](https://fidoalliance.org/wp-content/uploads/2024/05/Synced-Passkey-Deployment_-Emerging-Practices-for-Consumer-Use-Cases_2024-May-31.pdf)):
  - §2.1: «alternative authentication methods and/or account recovery methods should be provided for users **regardless of whether the passkeys are device-bound or synced**»;
  - §2.3: смотреть на `backupEligible` и, если ключ device-bound, «advise a user to add a passkey or authentication method to prevent them from being locked out of their account upon loss of device»;
  - §3.3, повторная аутентификация перед регистрацией ключа: «If an attacker gains access to a sign-in session, with methods such as phishing attack or Cross-Site Request Forgeries, they might change credentials to completely take over the account. **This can occur even when synced passkeys are used.**»;
  - §5.5: «a solid account recovery mechanism is critical, otherwise… the recovery process itself could become a weak point»;
  - §4.3 про пароль рядом с passkey: «From a security perspective, there are minimal benefits to combining passkeys and passwords because both can be managed by passkey providers. In the event a passkey provider account is successfully phished an attacker could obtain both sets of credentials.»
- **Внутреннее противоречие в корпусе FIDO, которое надо знать.** Документ 2024 года всё ещё допускает «password + SMS OTP or magic link via email» как способ восстановления (§5.5), а документы марта 2025 относят ровно это к фишингуемому и запрещают на верхней ступени. При расхождении новее — материалы 2025 года.
- Дизайн-руководства FIDO переехали на Passkey Central, и там про уровень доверия при восстановлении сказано прямо: «**The FIDO Alliance is not recommending any specific method of identity proofing**» ([Passkey Central](https://www.passkeycentral.org/design-guidelines/optional-patterns/create-passkey-after-account-recovery-due-to-forgotten-password)).

### 2.3 Требования NIST

**NIST SP 800-63B, ревизия 4 — финальная публикация, июль 2025**; ревизия 3 отозвана 1 августа 2025 ([CSRC](https://csrc.nist.gov/pubs/sp/800/63/b/4/final), [HTML](https://pages.nist.gov/800-63-4/sp800-63b.html)). Ревизия 4 заменила короткий §6.1.1 из ревизии 3 полноценным разделом о восстановлении — это самое существенное изменение.

- **§4.1.2.1, привязка дополнительного аутентификатора.** «To minimize the need for account recovery, CSPs and verifiers **SHOULD encourage subscribers to maintain at least two separate means of authentication**». И далее: «CSPs **SHALL** permit the binding of multiple authenticators to a subscriber account. When any new authenticator is bound… the CSP SHALL ensure that the process requires authentication at either the maximum AAL currently available in the subscriber account or the maximum AAL at which the new authenticator will be used, whichever is lower.» Практический смысл: добавление второго passkey должно происходить внутри уже аутентифицированной сессии того же уровня.
- **§4.2, разграничение понятий.** «Replacement of a forgotten password where the subscriber can authenticate with one or more other authenticators is considered to be the **binding of a new authenticator** (see Sec. 4.1.2.1) **rather than account recovery**.» То есть «добавить второе устройство, пока первое живо» и «восстановить доступ, когда всё потеряно» — разные процессы с разными требованиями.
- **§4.2.1, четыре класса методов.** «Four general classes of account recovery methods are recognized: Saved recovery codes; Issued recovery codes; Use of recovery contacts; Repeated identity proofing. **CSPs SHALL support one or more of these**.» Сохранённый код: «SHALL include at least 64 bits from an approved random bit generator», хранится офлайн, одноразовый. Выдаваемый код: не менее 6 цифр, срок жизни 10 минут для SMS и голоса, 24 часа для почты; «CSPs SHALL allow the subscriber to establish at least two recovery addresses».
- **§4.2.2.2, восстановление на уровне AAL2** — самое конкретное требование во всём корпусе. Нужно одно из трёх: **два кода восстановления, полученных разными способами**; либо **один код плюс привязанный однофакторный аутентификатор**; либо **повторное установление личности**. Одного кода недостаточно.
- **§4.2, уведомления.** «An account recovery event always causes one or more notifications to be sent to the subscriber to help detect the fraudulent use of account recovery.»
- **§3.1.1.2, запрет секретных вопросов.** «Verifiers and CSPs **SHALL NOT** prompt subscribers to use knowledge-based authentication (KBA)… or security questions.» Это запрет NIST; в текущих материалах FIDO аналогичного запрета нет.
- **§3.2.5, что считается фишингоустойчивым.** «Authenticators that involve the manual entry of an authenticator output (e.g., out-of-band and OTP authenticators) **SHALL NOT** be considered phishing-resistant because the manual entry does not bind the authenticator output to the specific session.»
- **§6.3, аргумент о слабом звене — словами самого NIST.** «**The weak point in many authentication mechanisms is the process followed when a subscriber loses control of one or more authenticators**… economic concerns… motivate the use of inexpensive and often less secure backup authentication methods.»

### 2.4 Что говорит сама спецификация

W3C формулирует то же в терминах флагов резервного копирования ([§6.1.3](https://www.w3.org/TR/webauthn-3/#sctn-credential-backup)):

- при `BE = 0`: «A single-device credential is not resilient to single device loss. **Relying Parties SHOULD ensure that each user account has additional authenticators registered and/or an account recovery process in place.**»
- при переходе `BS` из 1 в 0 (человек выключил синхронизацию или она сломалась): «the Relying Party SHOULD guide the user through a process to validate their other authentication factors. **If the user does not have another credential for their account, they SHOULD be guided through adding an additional credential to ensure they do not lose access to their account.**»

Важная оговорка о статусе этих трёх сценариев: спецификация вводит их как «a **non-exhaustive** list of how Relying Parties **might** use these flags». Жёстких запретов на выводы из BE/BS в тексте Рекомендации нет.

**Расхождение источников, которое стоит зафиксировать.** W3C строит на флаге BS рекомендации для интерфейса, а NIST для публичных сервисов советует обратное: «**Agencies SHOULD NOT condition acceptance based on this flag for public-facing applications due to user experience concerns**» ([SP 800-63B-4, Appendix B](https://pages.nist.gov/800-63-4/sp800-63b/syncable-authenticators/)). Плюс флаги не аттестованы и провайдеры выставляют их неодинаково: passkeys.dev зафиксировал, что Samsung Pass возвращает `BE = false` ([passkeys.dev, device support](https://passkeys.dev/device-support/)).

---

## 3. Passkey без пароля как единственный способ входа

### 3.1 Документированные режимы отказа

FIDO перечисляет причины потери доступа и их частоту (Synced Passkey Deployment, §2.2, Table 2 — [PDF](https://fidoalliance.org/wp-content/uploads/2024/05/Synced-Passkey-Deployment_-Emerging-Practices-for-Consumer-Use-Cases_2024-May-31.pdf)):

| Причина | Device-bound | Synced |
| --- | --- | --- |
| Потеряно устройство, на котором создан ключ | Occasionally | — |
| Бан у провайдера passkey | — | Rarely |
| Потерян доступ к самому провайдеру passkey | — | Rarely |
| Переход на устройство, где прежний провайдер не поддерживается | — | Occasionally |
| Смена провайдера passkey без переноса ключей | — | Occasionally |

Дополняющие факты из первоисточников:

- **Единственный ключ — прямой риск блокировки.** «Losing an authenticator therefore, in general, means losing all credentials bound to the lost authenticator, **which could lock the user out of an account if the user has only one credential registered**» ([§13.4.6](https://www.w3.org/TR/webauthn-3/#sctn-credential-loss-key-mobility)). Там же: «This specification defines no protocol for backing up credential private keys, or for sharing them between authenticators».
- **Потеря профиля браузера или переустановка системы.** «If you save passkeys to your Chrome Profile, **you can't recover them if your computer is lost or the Chrome profile is deleted**»; «If you save passkeys to Windows Hello, you can't recover them if your computer is lost or the operating system is reinstalled» ([Chrome Help](https://support.google.com/chrome/answer/13168025)). На стороне Windows: сброс контейнера Windows Hello «clears not only Windows Hello for Business, **but also any passkeys stored on that Windows device**» ([Microsoft Learn, WHfB FAQ](https://learn.microsoft.com/en-us/windows/security/identity-protection/hello-for-business/faq)).
- **Блокировка у провайдера синхронизации.** Apple: десять неудачных попыток — escrow уничтожен безвозвратно ([Apple](https://support.apple.com/guide/security/escrow-security-for-icloud-keychain-sec3e341e75d/web)). Google: «**You'll lose all your passwords if you: Lose all of your recovery options… Lose access to every device that's signed in**» ([Google Account Help](https://support.google.com/accounts/answer/11350823)).
- **Общие и публичные устройства.** Google формулирует запрет прямо: «**To protect your account from other users, do not create a passkey on a shared device**» ([Google Account Help](https://support.google.com/accounts/answer/13548313)). Apple вместо этого предписывает гибридный сценарий с QR-кодом для «a computer at a public library, an internet cafe, or a friend's house» ([Apple](https://support.apple.com/guide/iphone/use-passkeys-to-sign-in-to-websites-and-apps-iphf538ea8d0/ios)). В самой Рекомендации W3C guidance по общим устройствам отсутствует.
- **Вход с нового устройства без ключа.** Cross-Device Authentication требует QR-кода, камеры, Bluetooth и туннеля: «Cross-Device Authentication may be difficult for general users…» (§3.5, [FIDO](https://fidoalliance.org/wp-content/uploads/2024/05/Synced-Passkey-Deployment_-Emerging-Practices-for-Consumer-Use-Cases_2024-May-31.pdf)); Microsoft подтверждает требование Bluetooth и интернета на обоих устройствах ([Microsoft Learn](https://learn.microsoft.com/en-us/windows/security/identity-protection/passkeys/)). Наблюдение FIDO: «Most RPs do not actively promote authentication via Cross-Device Authentication and do not mandate authentication with a passkey» (§4.4).
- **Отключение синхронизации.** Переход `BS` 1→0 требует реакции сервиса ([§6.1.3](https://www.w3.org/TR/webauthn-3/#sctn-credential-backup)).
- **Устройство без поддержки.** passkeys.dev исходит из того, что запасной классический путь есть: если автозаполнение не сработало, надо «perform a "legacy" user authentication» ([passkeys.dev, Bootstrapping](https://passkeys.dev/docs/use-cases/bootstrapping/)). MDN даёт ту же развилку в комментарии к примеру `isUserVerifyingPlatformAuthenticatorAvailable()`: «Use another kind of authenticator or a classical login/password workflow» ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredential/isUserVerifyingPlatformAuthenticatorAvailable_static)).
- **Флагу UV не всегда можно верить.** passkeys.dev ведёт список провайдеров, которые «Handle request without performing UV, set UV true» даже при `userVerification: "required"`; туда попали 1Password (расширение), Bitwarden (расширение), KeepassXC, Okta Personal, Proton Pass, Strongbox ([passkeys.dev, Known Issues](https://passkeys.dev/docs/reference/known-issues/)). Это подрывает тезис «passkey сам по себе — многофакторная аутентификация», если второй фактор держится именно на UV.

### 3.2 Против чего предостерегают

- **Против слабого восстановления.** «Implementing weaker account-recovery options is not recommended by the FIDO Alliance» ([FIDO, 2019](https://fidoalliance.org/wp-content/uploads/2019/02/FIDO_Account_Recovery_Best_Practices-1.pdf)).
- **Против фишингуемого запасного пути** на верхней ступени зрелости: «Fallback to phishable methods is not permitted» ([FIDO, Journey Pt1, 2025](https://fidoalliance.org/wp-content/uploads/2025/03/Passkeys-The-Journey-to-Prevent-Phishing-Pt1.pdf)).
- **Против единственного ключа.** [§6.1.3](https://www.w3.org/TR/webauthn-3/#sctn-credential-backup) и [NIST §4.1.2.1](https://pages.nist.gov/800-63-4/sp800-63b/events/).
- **Против секретных вопросов.** «SHALL NOT prompt subscribers to use knowledge-based authentication (KBA)… or security questions» ([NIST §3.1.1.2](https://pages.nist.gov/800-63-4/sp800-63b.html)).
- **Против passkey на общем устройстве** ([Google](https://support.google.com/accounts/answer/13548313)).
- **Против молчаливой потери.** Если восстановления не будет, FIDO требует предупредить ([FIDO, 2019](https://fidoalliance.org/wp-content/uploads/2019/02/FIDO_Account_Recovery_Best_Practices-1.pdf)); NIST требует уведомлять о каждом восстановлении ([§4.2](https://pages.nist.gov/800-63-4/sp800-63b/events/)).

**Неустранимое противоречие, которое надо принять сознательно.** Коды восстановления — единственный класс методов NIST, совместимый с анонимным аккаунтом (не требует ни почты, ни телефона, ни установления личности), и NIST делает их основным механизмом ([§4.2.1](https://pages.nist.gov/800-63-4/sp800-63b/events/)). При этом FIDO в 2025 году относит коды восстановления к **фишингуемым** методам ([Journey Pt1](https://fidoalliance.org/wp-content/uploads/2025/03/Passkeys-The-Journey-to-Prevent-Phishing-Pt1.pdf)). Оба утверждения верны и не примиряются: для анонимного сервиса выбор стоит между «код восстановления, который можно выманить» и «никакого восстановления вообще». Это решение продукта, а не инженерии.

---

## 4. Что требуется на сервере

### 4.1 Что хранить: credential record

Спецификация вводит структуру `credential record` и говорит: «the Relying Party **MUST** store some properties of registered public key credential sources» ([§4](https://www.w3.org/TR/webauthn-3/#credential-record)). Обратите внимание на модальность: обязанность хранить — MUST, но сам перечень полей помечен как «RECOMMENDED in order to implement all steps of §7.1 and §7.2 as defined».

| Поле | Что это |
| --- | --- |
| `type` | тип источника учётных данных |
| `id` | Credential ID |
| `publicKey` | публичный ключ |
| `signCount` | последнее значение счётчика подписей |
| `transports` | результат `getTransports()` на момент регистрации |
| `uvInitialized` | выставлялся ли когда-либо флаг UV |
| `backupEligible` | значение флага BE при создании |
| `backupState` | последнее значение флага BS |

OPTIONAL: `attestationObject`, `attestationClientDataJSON`, `rpId` — последнее «a core property of the credential that determines where it can be used… or to use it across different domains later via Related Origins» (там же).

Предупреждение про `transports`: «Modifying or removing items from the value returned from getTransports() could negatively impact user experience, or even prevent use of the corresponding credential» (там же).

Про `uvInitialized`: пока он `false`, «the UV flag **MUST NOT** be relied upon as an authentication factor», и перевод его из `false` в `true` «SHOULD require authorization by an additional authentication factor equivalent to WebAuthn user verification» (там же).

**Важная деталь модели данных: `userHandle` в credential record отсутствует.** Запись живёт внутри учётной записи, а §7.2 требует сравнивать `response.userHandle` именно с «the user handle of **the user account**». Значит user handle хранится **на аккаунте**, один на все ключи человека, а не рядом с каждым ключом. Спецификация формулирует это прямо: «the user handle is chosen by the Relying Party and ought to be the same for all credentials registered to the same user account» ([§4](https://www.w3.org/TR/webauthn-3/#credential-record)).

Google в серверном руководстве описывает ту же таблицу: первичный ключ — Credential ID, плюс `public_key`, `passkey_user_id` как внешний ключ на таблицу пользователей, `backed_up`, AAGUID провайдера, `transports`, имя и метаданные ([Google Identity](https://developers.google.com/identity/passkeys/developer-guides/server-registration)). Счётчик подписей там не упомянут — расхождение с W3C.

Из §7.1 стоит запомнить ещё два требования: «Verify that the credentialId is ≤ 1023 bytes» и «**Verify that the credentialId is not yet registered for any user**» ([§7.1](https://www.w3.org/TR/webauthn-3/#sctn-registering-a-new-credential)).

### 4.2 Счётчик подписей

Ключевой факт для синхронизированных passkey ([§6.1.1](https://www.w3.org/TR/webauthn-3/#sctn-sign-counter)):

> «Authenticators that do not implement a signature counter leave the `signCount` in the authenticator data constant at zero.»

Счётчик — SHOULD, не MUST: «Authenticators SHOULD implement a signature counter feature», и назначение узкое — «to aid Relying Parties in detecting cloned authenticators».

Проверка в §7.2 включается по условию: «**If `authData.signCount` is nonzero or `credentialRecord.signCount` is nonzero**, then run the following sub-step». То есть нулевой счётчик с обеих сторон — нормальный случай синхронизированного passkey, проверка просто не выполняется, и это не ошибка. Когда проверка всё же срабатывает и новое значение «less than or equal to» сохранённого — «This is a signal, but **not proof**, that the authenticator may be cloned»: возможны параллельные копии ключа, неисправность или гонка при обработке ответов. Что делать — оставлено сервису: «Whether the Relying Party updates `credentialRecord.signCount`… or not, or fails the authentication ceremony or not, is Relying Party-specific».

Практический вывод: счётчик хранить, сравнивать только когда он ненулевой, использовать как сигнал для оценки риска, но не как основание для жёсткой блокировки. Дополнительный довод: ключи с ненулевым счётчиком вообще нельзя переносить между менеджерами по CXF ([CXF 1.0 PS](https://fidoalliance.org/specs/cx/cxf-v1.0-ps-20250814.html)).

### 4.3 User handle — идентификатор человека

Полная нормативная формулировка ([§5.4.3](https://www.w3.org/TR/webauthn-3/#dictdef-publickeycredentialuserentity)):

> «The user handle of the user account. A user handle is an **opaque byte sequence with a maximum size of 64 bytes**, and is not meant to be displayed to the user.
> To ensure secure operation, authentication and authorization decisions **MUST** be made on the basis of this `id` member, not the `displayName` nor `name` members.
> The user handle **MUST NOT** contain personally identifying information about the user, such as a username or e-mail address… The user handle **MUST NOT** be empty.
> The user handle **SHOULD NOT** be a constant value across different user accounts, even for non-discoverable credentials, because some authenticators always create discoverable credentials. Thus a constant user handle would prevent a user from using such an authenticator with more than one user account at the Relying Party.»

Длина проверяется клиентом: «If the length of `pkOptions.user.id` is not between 1 and 64 bytes (inclusive) then throw a `TypeError`» ([§5.1.3](https://www.w3.org/TR/webauthn-3/#sctn-createCredential)).

Privacy-раздел даёт прямой рецепт ([§14.6.1](https://www.w3.org/TR/webauthn-3/#sctn-user-handle-privacy)):

> «the Relying Party MUST NOT include personally identifying information, e.g., e-mail addresses or usernames, in the user handle. This includes hash values of personally identifying information, **unless the hash function is salted with salt values private to the Relying Party**… **It is RECOMMENDED to let the user handle be 64 random bytes, and store this value in the user account.**»

Google формулирует те же требования словами: user id должен быть «a random, unique string generated upon account creation», «should be permanent, unlike a username that may be editable», «should not contain any personally identifiable information (PII)» ([Google Identity](https://developers.google.com/identity/passkeys/developer-guides/server-registration)).

**Handle нельзя поменять задним числом, и причина механическая.** Аутентификатор индексирует ключи парой (RP ID, user handle): «Authenticators map pairs of RP ID and user handle to public key credential sources. As a consequence, **an authenticator will store at most one discoverable credential per user handle per Relying Party**» ([§4](https://www.w3.org/TR/webauthn-3/#credential-record)). Отсюда два следствия: смена handle осиротит все существующие ключи, а повторное использование чужого handle молча **заменит** уже существующий ключ. Сигнальный метод Level 3 позволяет обновить только `name` и `displayName`; `userId` в нём — способ указать, о каком ключе речь ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredential/signalCurrentUserDetails_static)).

### 4.4 Как сервер находит аккаунт при входе

Два случая ([§7.2](https://www.w3.org/TR/webauthn-3/#sctn-verifying-assertion)):

- человек опознан заранее (по логину или cookie) — «verify that the identified user account contains a credential record whose `id` equals `credential.rawId`… If `response.userHandle` is present, verify that it equals the user handle of the user account»;
- человек не опознан заранее (типичный passkey-вход без ввода логина) — «verify that `response.userHandle` is present. Verify that the user account identified by `response.userHandle` contains a credential record whose `id` equals `credential.rawId`».

Google описывает оба варианта как равноправные ([Google Identity](https://developers.google.com/identity/passkeys/developer-guides/server-authentication)).

Прочие проверки §7.2, которые нельзя пропускать: тип `webauthn.get`, совпадение challenge, ожидаемый origin, `rpIdHash`, установленный флаг UP, согласованность BE («If `credentialRecord.backupEligible` is set, verify that `currentBe` is set» и наоборот — BE неизменяем, поэтому его переворот означает отказ), подпись над `authData || SHA-256(clientDataJSON)`. Обновление состояния (`signCount`, `backupState`, `uvInitialized`) выполняется после проверок, причём «the above state updates SHOULD be deferred to after those additional checks are completed successfully», если сервис делает свои дополнительные проверки.

Отсюда важное следствие: **при беспарольном входе именно user handle — единственное, что связывает подпись с аккаунтом.**

### 4.5 Привязка к домену и что ломается при переезде

Определение ([§4, RP ID](https://www.w3.org/TR/webauthn-3/#relying-party-identifier)):

> «A public key credential can only be used for authentication with the same entity (as identified by RP ID) it was registered with. By default, the RP ID for a WebAuthn operation is set to the caller's origin's effective domain. This default MAY be overridden by the caller, as long as the caller-specified RP ID value is a registrable domain suffix of or is equal to the caller's origin's effective domain.»

Правила области действия (там же):

- RP ID равен effective domain источника либо его registrable domain suffix;
- схема `https`, либо `http` при хосте `localhost`; порт не ограничен;
- RP ID «is based on a host's domain name. It does not itself include a scheme or port» — только доменная форма, IP-адреса не годятся;
- пример из спецификации: для origin `https://login.example.com:1337` допустимы `login.example.com` и `example.com`, но не `m.login.example.com` и не `com`.

Отдельно сервер обязан проверять origin ([§13.4.9](https://www.w3.org/TR/webauthn-3/#sctn-validating-origin)): «the Relying Party **MUST** validate the `origin` member of the client data… **MUST NOT** accept unexpected values of `origin`», потому что «the Relying Party's origin validation serves as an additional layer of protection in case a faulty authenticator fails to enforce credential scope». Там же — предупреждение против огульного разрешения поддоменов: «Any malicious code executing on an origin within the scope of a Relying Party's public key credentials has the potential to invalidate any and all security guarantees» ([§13.4.8](https://www.w3.org/TR/webauthn-3/#sctn-security-considerations-rp)).

**Что ломается при смене домена.** Ключ, выданный для RP ID `a.example`, невозможно использовать на `b.example`: это разные сущности по определению выше, и обе церемонии сверяют `rpIdHash`. Механизма перепривязки в спецификации нет: «This specification defines no protocol for backing up credential private keys, or for sharing them between authenticators» ([§13.4.6](https://www.w3.org/TR/webauthn-3/#sctn-credential-loss-key-mobility)). Все passkey придётся выдавать заново — а значит на момент переезда нужен работающий второй путь входа.

**Related Origin Requests — не инструмент миграции.** Это самое частое заблуждение по теме. ROR позволяет *дополнительным* origin работать под **одним неизменным RP ID** ([§5.11](https://www.w3.org/TR/webauthn-3/#sctn-related-origins)):

- «Such Relying Parties MUST choose a common RP ID to use across all ceremonies from related origins»;
- по адресу `https://<RP ID>/.well-known/webauthn` публикуется JSON: «The content type MUST be `application/json`. The top-level JSON object MUST contain a key named `origins` whose value MUST be an array of one or more strings containing web origins»;
- «WebAuthn Clients supporting this feature MUST support at least **five registrable origin labels**. Client policy SHOULD define an upper limit to prevent abuse». passkeys.dev уточняет: «there are no known clients which support more than 5, so that should be treated as the maximum for deployments», а label — «the name directly preceding the effective top level domain», поэтому `shopping.com`, `shopping.co.uk` и `shopping.de` считаются за один label ([passkeys.dev](https://passkeys.dev/docs/advanced/related-origins/));
- запрос выполняется «without credentials, without a referrer, and using the `https:` scheme», редиректы обязаны оставаться на https.

Отсюда два неприятных следствия. Первое: **старый домен придётся держать под контролем бессрочно**, потому что именно он обслуживает well-known для общего RP ID. Второе: человек продолжит видеть старое имя — «Sign in to otherExampleB.com with your passkey for exampleA.com?», поскольку клиенты «SHOULD ensure that the credential and authenticator selection interfaces provide clear context» с показом обоих ([§14.5.5](https://www.w3.org/TR/webauthn-3/#sctn-cross-origin-use)).

Совет passkeys.dev, который надо применить до первой выдачи ключа: «It is recommended to pick the most commonly used and/or understood domain for the common RP ID», и отдельно — «**ROR is designed to be used when federation is not possible!** It is recommended that Relying Parties first consider leveraging industry-standard federation protocols such as OpenID Connect» ([passkeys.dev](https://passkeys.dev/docs/advanced/related-origins/)).

### 4.6 Имя, которое увидит менеджер паролей

`user.name` и `user.displayName` попадают в менеджер паролей и показываются в автозаполнении. FIDO рекомендует делать их уникальными и по возможности неизменяемыми: «The unique identifier for a user account is preferably user.name and user.displayName. Moreover, an unchangeable identifier is more desirable since **there is no way to change the user.name and user.displayName values registered in a password manager from the RP**» ([Synced Passkey Deployment, §3.2](https://fidoalliance.org/wp-content/uploads/2024/05/Synced-Passkey-Deployment_-Emerging-Practices-for-Consumer-Use-Cases_2024-May-31.pdf)). Там же — против маскирования: «We do not recommend masking as an approach as it would make account identification more challenging».

Оговорка: сигнальный метод `signalCurrentUserDetails()` из Level 3 как раз и создан, чтобы обновлять эти значения ([§5.1.10](https://www.w3.org/TR/webauthn-3/#sctn-signalCredentials)), но он не поддержан в Firefox и помечен на MDN как «Limited availability» ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredential/signalCurrentUserDetails_static)) — то есть цитата FIDO 2024 года верна как практическое допущение, хотя формально механизм уже существует.

Для анонимного аккаунта это создаёт напряжение: почты нет, а показать в системном диалоге что-то узнаваемое надо. Спецификация разрешает пустой `displayName`: «If no suitable or human-palatable name is available, the Relying Party SHOULD set this value to an empty string» ([§5.4.3](https://www.w3.org/TR/webauthn-3/#dictdef-publickeycredentialuserentity)).

---

## 5. Склейка анонимной локальной личности с аккаунтом

Главная часть для решения фазы 1.

### 5.1 Почему браузерное хранилище нельзя считать анкером личности

- Данные по умолчанию хранятся в режиме best-effort и вытесняются: при нехватке места браузер применяет LRU по origin, при превышении общего лимита «starts evicting best-effort origins» ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)).
- Вытеснение всегда полное: «When an origin's data is evicted by the browser, **all of its data, not parts of it**, is deleted at the same time» (там же). Нельзя рассчитывать, что «идентификатор переживёт, а история — нет».
- Safari удаляет данные проактивно: «If an origin has no user interaction… in the last seven days of browser use, its data created from script will be deleted» (там же). Первоисточник WebKit перечисляет, что именно стирается: «Indexed DB, LocalStorage, Media keys, SessionStorage, Service Worker registrations and cache» ([WebKit](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/)).
- Исключение, прямо касающееся PWA: «**Web applications added to the home screen are not part of Safari and thus have their own counter of days of use**… We do not expect the first-party in such a web application to have its website data deleted. If your web application does experience website data deletion, please let us know since we would consider it a serious bug» ([WebKit](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/)).
- `navigator.storage.persist()` переводит хранилище в persistent-режим, но «The browser may or may not honor the request, depending on browser-specific rules» ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist)). Firefox спрашивает разрешение, Safari и Chromium «automatically approve or deny the request based on the user's history of interaction with the site and do not show any prompts» ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)).

### 5.2 Схема A. Локальный идентификатор сразу становится user handle

Самая дешёвая по коду и самая жёсткая по последствиям.

При первом запуске приложение генерирует 64 случайных байта и делает их идентификатором человека. Вся локальная история пишется с этим ключом. В фазе 2 те же байты подставляются в `user.id` при `navigator.credentials.create()`.

Почему это законно и почему именно 64 байта: «It is RECOMMENDED to let the user handle be 64 random bytes, and store this value in the user account» ([§14.6.1](https://www.w3.org/TR/webauthn-3/#sctn-user-handle-privacy)), при верхней границе в 64 байта и запрете на PII и пустое значение ([§5.4.3](https://www.w3.org/TR/webauthn-3/#dictdef-publickeycredentialuserentity)).

Что это даёт: после входа с passkey сервер получает `response.userHandle`, находит по нему аккаунт ([§7.2](https://www.w3.org/TR/webauthn-3/#sctn-verifying-assertion)) — и это ровно тот же ключ, под которым лежит локальная история. Миграции данных не требуется вообще.

Чем платим: идентификатор становится неизменяемым навсегда ([§4](https://www.w3.org/TR/webauthn-3/#credential-record)). Требование «SHOULD NOT be a constant value across different user accounts» означает: если на устройстве живёт несколько человек, у каждого должен быть свой идентификатор, иначе аутентификатор не даст завести им разные аккаунты у нас — и, более того, повторное использование handle молча заменит существующий ключ.

### 5.3 Схема B. Гостевой аккаунт с рождения, потом привязка ключа

Промышленный стандарт де-факто. Анонимная личность — уже полноценная серверная учётная запись; «регистрация» не создаёт аккаунт, а добавляет способ входа.

- **Firebase.** «When the user signs up, complete the sign-in flow for the user's authentication provider up to, but not including, calling one of the `Auth.signInWith` methods», затем `linkWithCredential(auth.currentUser, credential)` ([Firebase](https://firebase.google.com/docs/auth/web/anonymous-auth)). После привязки аккаунт перестаёт быть временным: «If you 'upgrade' an anonymous account by linking it to any sign-in method, the account will not get automatically deleted». Без апгрейда доступна автоочистка: «anonymous accounts older than 30 days will be automatically deleted» (там же).
- **Supabase.** `signInAnonymously()` создаёт пользователя без PII, дальше личность привязывается через `updateUser()` или `linkIdentity()` ([Supabase](https://supabase.com/docs/guides/auth/auth-anonymous)). Ограничение сформулировано честно: анонимный пользователь «behaves like a permanent user, except the user can't access their account if they sign out, clear browsing data, or use another device». Политики доступа обязаны различать состояния: «Anonymous users use the `authenticated` role. To distinguish between anonymous users and permanent users, your policies need to check the `is_anonymous` field of the user's JWT» (там же).
- **AWS Cognito.** Гостевая личность получает identity ID через `GetId`; «The application is expected to cache this identity ID». Дальше — самое ценное описание семантики: «**Linking logins.** If you submit a token for a login that is not already associated with any identity, the login is considered to be "linked" to the associated identity… If a login is merely linked to an existing identity, the identity ID returned from `GetOpenIdToken` **is the same as the one that you passed in**» ([AWS](https://docs.aws.amazon.com/cognito/latest/developerguide/authentication-flow.html)).

Общий инвариант всех трёх: **идентификатор человека не меняется при регистрации**, поэтому все привязанные к нему данные остаются на месте. Миграции нет, потому что мигрировать нечего.

### 5.4 Схема C. Локальные данные загружаются в момент регистрации

Применяется, когда в фазе 1 сервера нет вовсе. При первой регистрации клиент отправляет накопленную историю вместе с только что созданным ключом.

Требования, которые из этого вытекают:

- запрос обязан быть идемпотентным по локальному идентификатору: сеть может оборваться после записи, но до ответа, а повторная отправка не должна удваивать историю;
- локальные данные нельзя удалять до подтверждения. Firebase формулирует порядок операций явно: «Get the data which you will want to merge. **This should be done now while the app is still signed in as this user**», и предусматривает откат — «If there are errors we want to undo the data merge/deletion» ([Firebase, Account Linking](https://firebase.google.com/docs/auth/web/account-linking));
- нужно правило разрешения конфликта, если под этим ключом на сервере уже что-то есть.

### 5.5 Конфликт: у человека уже есть аккаунт

Неизбежный случай — человек накопил историю на новом устройстве, а потом вошёл ключом от старого аккаунта.

- Firebase: «Account linking will fail if the credentials are already linked to another user account. In this situation, **you must handle merging the accounts and associated data as appropriate for your app**» ([Firebase](https://firebase.google.com/docs/auth/web/account-linking)). Документированная последовательность: забрать данные, пока сессия принадлежит анонимному пользователю; удалить; войти под другим аккаунтом; слить; привязать; восстановить — с откатом при ошибке.
- Cognito делает слияние сам, но предупреждает о смене идентификатора: «**Merging identities.** If you pass in a token for a login that is not currently linked to the given identity, but is linked to another identity, the two identities are merged. Once merged, one identity becomes the parent/owner of all associated logins and the other is disabled. In this case, the identity ID of the parent/owner is returned. **You must update your local cache if this value differs**» ([AWS](https://docs.aws.amazon.com/cognito/latest/developerguide/authentication-flow.html)).
- Supabase: «Reassign entities tied to the anonymous user» и реализовать разрешение конфликтов ([Supabase](https://supabase.com/docs/guides/auth/auth-anonymous)).

Три независимые реализации сходятся: **слияние двух историй — прикладное решение, которое ни один провайдер за вас не принимает.** Для истории упражнений за три недели слияние сводится к объединению множества записей, но правило нужно записать явно.

### 5.6 Механика, которая делает переход из фазы 1 в фазу 2 незаметным

Conditional create позволяет создать passkey без единого клика сразу после входа другим способом: «lets your site request a passkey for the user without requiring any action from them» ([Chrome for Developers](https://developer.chrome.com/docs/identity/webauthn-conditional-create)). Вызов — `navigator.credentials.create({ publicKey: options, mediation: 'conditional' })` после проверки `capabilities.conditionalCreate`.

Оговорки, важные для сервера (там же):

- предусловие — у человека в менеджере паролей есть **недавно использованный сохранённый пароль**: «Ideally, call Conditional Create immediately after a successful password-based login». **Для аккаунта, у которого пароля никогда не было, это предусловие не выполняется** — то есть для чисто анонимного сценария conditional create не сработает;
- «the registration response returns "User Presence" and "User Verified" as `false`» и «the server should ignore these flags during credential verification»;
- ошибки `InvalidStateError`, `NotAllowedError`, `AbortError` надо глотать молча.

FIDO отмечает, что самый результативный момент для предложения passkey — операции с аккаунтом: «Suggest passkey registration during account-related operations such as account creation and account recovery. This approach is recommended by UX guidelines» ([Synced Passkey Deployment, §3.1](https://fidoalliance.org/wp-content/uploads/2024/05/Synced-Passkey-Deployment_-Emerging-Practices-for-Consumer-Use-Cases_2024-May-31.pdf)). passkeys.dev добавляет условие на регистрацию: «First, verify that the user is sufficiently strongly authenticated using other login methods, including multi-factor authentication» ([passkeys.dev](https://passkeys.dev/docs/use-cases/bootstrapping/)).

Ещё одна формулировка passkeys.dev, важная именно для сценария с общим устройством: показывать «longer descriptions explaining that **all users that are able to unlock the current device will be able to access the account**… to ensure that the user is giving fully informed consent» (там же).

### 5.7 Восстановление анонимного аккаунта без раскрытия личности

FIDO упоминает единственный известный путь для псевдонимных аккаунтов — Delegated Account Recovery ([FIDO, 2019](https://fidoalliance.org/wp-content/uploads/2019/02/FIDO_Account_Recovery_Best_Practices-1.pdf)). Проект **архивирован**: указанный в документе репозиторий Facebook переехал в `facebookarchive`. Считать это живой опцией нельзя.

Реалистичный аналог — сохранённый код восстановления из NIST: не менее 64 бит от одобренного генератора, одноразовый, хранится офлайн, выдаётся при регистрации ([SP 800-63B-4 §4.2.1](https://pages.nist.gov/800-63-4/sp800-63b/events/)). Он единственный из четырёх классов NIST не требует ни почты, ни телефона, ни установления личности. При этом на уровне AAL2 одного кода недостаточно — нужны два, полученные разными способами, либо код плюс привязанный однофакторный аутентификатор (§4.2.2.2 там же), а FIDO в 2025 году относит коды к фишингуемым методам ([Journey Pt1](https://fidoalliance.org/wp-content/uploads/2025/03/Passkeys-The-Journey-to-Prevent-Phishing-Pt1.pdf)). Для приложения с историей тренировок AAL2 не требуется, поэтому один код — приемлемый компромисс, но принять его надо осознанно.

---

## 6. Что из этого следует для формы локальной личности в фазе 1

Прямые следствия, в порядке важности.

**1. Локальный идентификатор человека обязан быть 64 случайными байтами, непрозрачными и без персональных данных — с первого запуска.**
Это условие того, что в фазе 2 его можно подставить в `user.id` без перекладывания данных ([§14.6.1](https://www.w3.org/TR/webauthn-3/#sctn-user-handle-privacy), [§5.4.3](https://www.w3.org/TR/webauthn-3/#dictdef-publickeycredentialuserentity)). Автоинкремент, имя человека или что-либо производное от введённых данных заставят в фазе 2 завести второй идентификатор, таблицу соответствия и миграцию истории. UUID технически влезает в 64 байта, но спецификация рекомендует именно 64 случайных байта, и запас ничего не стоит.

**2. Идентификатор становится неизменяемым в момент выдачи первого passkey — значит, он должен быть неизменяемым уже в фазе 1.**
Аутентификатор индексирует ключи парой (RP ID, user handle), и на пару приходится не более одного discoverable credential ([§4](https://www.w3.org/TR/webauthn-3/#credential-record)). Смена handle осиротит ключи, повторное использование — молча заменит. Отсюда: **имя человека, которое он вводит и может передумать, обязано быть отдельным изменяемым полем, а не ключом истории.** Ключ истории — только байты.

**3. Несколько человек на устройстве требуют по идентификатору на каждого, а не одного на origin.**
«The user handle SHOULD NOT be a constant value across different user accounts… Thus a constant user handle would prevent a user from using such an authenticator with more than one user account at the Relying Party» ([§5.4.3](https://www.w3.org/TR/webauthn-3/#dictdef-publickeycredentialuserentity)). Форма хранилища из issue 05 («одно хранилище с индексом по человеку») этому удовлетворяет; «одна база на устройство без разделения» — нет.

**4. Сценарий «несколько человек на одном устройстве» плохо совместим с passkey, и это надо решить в фазе 1, а не в фазе 2.**
Google прямо не рекомендует создавать passkey на общем устройстве ([Google Account Help](https://support.google.com/accounts/answer/13548313)), а passkeys.dev требует объяснять человеку, что «all users that are able to unlock the current device will be able to access the account» ([passkeys.dev](https://passkeys.dev/docs/use-cases/bootstrapping/)). Если продукт рассчитан на семейное устройство с несколькими людьми, то passkey защитит аккаунт от чужих устройств, но не разделит людей внутри одного. Реалистичная формулировка для фазы 1: локальные личности разделяют данные для удобства, а не для безопасности, и в фазе 2 аккаунт получит каждый отдельно.

**5. Изоляция «по выбору в интерфейсе» — не изоляция, и passkey её не чинит.**
Passkey подтверждает владение аккаунтом на сервере; локальная IndexedDB остаётся общей для всех, кто открыл браузер. Если нужно, чтобы один человек не видел историю другого, это задача шифрования локальных данных. Спецификация даёт для этого расширение `prf` ([§10.1.4](https://www.w3.org/TR/webauthn-3/#prf-extension)), но оно работает только после появления passkey — то есть в фазе 1 не помогает.

**6. Домен надо выбрать до первого выданного ключа, и выбрать окончательно.**
Passkey нельзя перенести с одного RP ID на другой ([§4](https://www.w3.org/TR/webauthn-3/#relying-party-identifier)), а Related Origin Requests не миграция: он требует бессрочно сохранять контроль над старым доменом, ограничен пятью labels и оставляет старое имя в системном диалоге ([§5.11](https://www.w3.org/TR/webauthn-3/#sctn-related-origins), [§14.5.5](https://www.w3.org/TR/webauthn-3/#sctn-cross-origin-use), [passkeys.dev](https://passkeys.dev/docs/advanced/related-origins/)). Решение issue 09 о хостинге и площадке развёртывания — фактически решение о RP ID на весь срок жизни продукта.

**7. Схема B (гостевой аккаунт с рождения) дороже в фазе 1 и радикально дешевле в фазе 2 — но только если сервер вообще есть.**
Три независимые промышленные реализации сохраняют идентификатор неизменным при регистрации, и именно поэтому у них нет миграции ([Firebase](https://firebase.google.com/docs/auth/web/anonymous-auth), [Supabase](https://supabase.com/docs/guides/auth/auth-anonymous), [Cognito](https://docs.aws.amazon.com/cognito/latest/developerguide/authentication-flow.html)). Если по issue 09 серверный слой всё равно появляется, гостевой аккаунт стоит недорого. Если фаза 1 остаётся полностью клиентской, схема A даёт тот же инвариант без сервера, а фаза 2 сводится к схеме C.

**8. Заранее записать правило слияния историй.**
Ни один провайдер не решает это за нас ([Firebase](https://firebase.google.com/docs/auth/web/account-linking), [Supabase](https://supabase.com/docs/guides/auth/auth-anonymous), [Cognito](https://docs.aws.amazon.com/cognito/latest/developerguide/authentication-flow.html)). Для истории из голых идентификаторов упражнений за три недели правило простое — объединение множеств с усечением по окну, — но записать его надо в фазе 1, потому что от него зависит, хранится ли рядом с записью время (по issue 05 это открытый вопрос).

**9. Не рассчитывать, что переход в фазу 2 будет бесшовным автоматически.**
Conditional create — самый гладкий путь, но его предусловие — недавно использованный **сохранённый пароль** в менеджере ([Chrome](https://developer.chrome.com/docs/identity/webauthn-conditional-create)). У аккаунта, который никогда не имел пароля, этого предусловия нет. Значит переход из анонимности в аккаунт будет явным действием человека, и его надо спроектировать как экран, а не как фоновый апгрейд.

**10. Решить сейчас, признаём ли мы потерю данных допустимой, и сказать об этом человеку.**
Если passkey останется единственным путём входа без второго ключа и без кода восстановления, потеря доступа означает потерю истории. FIDO считает такой режим допустимым для анонимных аккаунтов, но обязывает предупредить: «RPs should inform the user of the risk of account loss, allowing the user to make an informed decision about the risks» ([FIDO, 2019](https://fidoalliance.org/wp-content/uploads/2019/02/FIDO_Account_Recovery_Best_Practices-1.pdf)). Если такой ответ не устраивает — минимальный совместимый с анонимностью механизм — сохранённый код восстановления ([NIST §4.2.1](https://pages.nist.gov/800-63-4/sp800-63b/events/)); его форму надо предусмотреть в модели аккаунта заранее.

**11. До появления аккаунта данные защищает не аутентификация, а установка PWA.**
Script-writable storage в Safari стирается после семи дней без взаимодействия, но приложения с домашнего экрана из-под правила выведены ([WebKit](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/)), плюс `navigator.storage.persist()`, который может и отказать ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist)). Это делает issue 08 («продвижение установки») не вопросом роста, а вопросом сохранности данных в фазе 1.

---

## Источники

**W3C**
- [Web Authentication Level 3, W3C Recommendation, 25 августа 2026](https://www.w3.org/TR/webauthn-3/) · [история публикации](https://www.w3.org/standards/history/webauthn-3/) · [анонс W3C](https://www.w3.org/news/2026/web-authentication-an-api-for-accessing-public-key-credentials-level-3-is-now-a-w3c-recommendation/)
  - [§4 Credential Record и RP ID](https://www.w3.org/TR/webauthn-3/#credential-record) · [§5.1.7 getClientCapabilities](https://www.w3.org/TR/webauthn-3/#sctn-getClientCapabilities) · [§5.1.10 signal methods](https://www.w3.org/TR/webauthn-3/#sctn-signalCredentials)
  - [§5.4.3 PublicKeyCredentialUserEntity](https://www.w3.org/TR/webauthn-3/#dictdef-publickeycredentialuserentity) · [§5.11 Related origins](https://www.w3.org/TR/webauthn-3/#sctn-related-origins)
  - [§6.1.1 Signature Counter](https://www.w3.org/TR/webauthn-3/#sctn-sign-counter) · [§6.1.3 Credential Backup State](https://www.w3.org/TR/webauthn-3/#sctn-credential-backup) · [§6.2.1 Attachment](https://www.w3.org/TR/webauthn-3/#platform-attachment)
  - [§7.1 Registering a New Credential](https://www.w3.org/TR/webauthn-3/#sctn-registering-a-new-credential) · [§7.2 Verifying an Authentication Assertion](https://www.w3.org/TR/webauthn-3/#sctn-verifying-assertion)
  - [§13.4.6 Credential Loss and Key Mobility](https://www.w3.org/TR/webauthn-3/#sctn-credential-loss-key-mobility) · [§13.4.9 Validating the origin](https://www.w3.org/TR/webauthn-3/#sctn-validating-origin) · [§14.4.1 Attestation Privacy](https://www.w3.org/TR/webauthn-3/#sctn-attestation-privacy) · [§14.6.1 User Handle Contents](https://www.w3.org/TR/webauthn-3/#sctn-user-handle-privacy) · [§18.1.1 Changes since Level 2](https://www.w3.org/TR/webauthn-3/#changes-since-l2)
- [Web Authentication Level 2 (вытеснена)](https://www.w3.org/TR/webauthn-2/)

**FIDO Alliance**
- [Recommended Account Recovery Practices for FIDO Relying Parties, февраль 2019 (PDF)](https://fidoalliance.org/wp-content/uploads/2019/02/FIDO_Account_Recovery_Best_Practices-1.pdf)
- [Multiple Authenticators for Reducing Account-Recovery Needs, июнь 2020 (PDF)](https://fidoalliance.org/wp-content/uploads/2020/06/FIDO_White_Paper_Multiple_Authenticators_CDWG.pdf)
- [Synced Passkey Deployment: Emerging Practices for Consumer Use Cases, 2024 (PDF)](https://fidoalliance.org/wp-content/uploads/2024/05/Synced-Passkey-Deployment_-Emerging-Practices-for-Consumer-Use-Cases_2024-May-31.pdf)
- [Passkeys: The Journey to Prevent Phishing Attacks, Pt1, март 2025 (PDF)](https://fidoalliance.org/wp-content/uploads/2025/03/Passkeys-The-Journey-to-Prevent-Phishing-Pt1.pdf)
- [FIDO Attestation White Paper, 2024 (PDF)](https://fidoalliance.org/wp-content/uploads/2024/06/EDWG_Attestation-White-Paper_2024-1.pdf)
- [Credential Exchange, индекс версий /specs/cx/](https://fidoalliance.org/specs/cx/) · [CXF 1.0 Proposed Standard](https://fidoalliance.org/specs/cx/cxf-v1.0-ps-20250814.html)
- [Passkey Central — design guidelines, восстановление](https://www.passkeycentral.org/design-guidelines/optional-patterns/create-passkey-after-account-recovery-due-to-forgotten-password)

**NIST**
- [SP 800-63B-4, финальная публикация, июль 2025](https://csrc.nist.gov/pubs/sp/800/63/b/4/final) · [HTML](https://pages.nist.gov/800-63-4/sp800-63b.html) · [§4 Authenticator Event Management](https://pages.nist.gov/800-63-4/sp800-63b/events/) · [Appendix B, Syncable Authenticators](https://pages.nist.gov/800-63-4/sp800-63b/syncable-authenticators/)

**MDN и caniuse**
- [Web Authentication API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API) · [caniuse: webauthn](https://caniuse.com/webauthn)
- [getClientCapabilities()](https://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredential/getClientCapabilities_static) · [isConditionalMediationAvailable()](https://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredential/isConditionalMediationAvailable_static) · [isUserVerifyingPlatformAuthenticatorAvailable()](https://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredential/isUserVerifyingPlatformAuthenticatorAvailable_static) · [signalCurrentUserDetails()](https://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredential/signalCurrentUserDetails_static) · [signalUnknownCredential()](https://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredential/signalUnknownCredential_static)
- [Storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) · [StorageManager.persist()](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist)

**Apple**
- [iCloud Keychain security overview](https://support.apple.com/guide/security/icloud-keychain-security-overview-sec1c89c6f3b/web) · [Secure iCloud Keychain recovery](https://support.apple.com/guide/security/secure-icloud-keychain-recovery-secdeb202947/web) · [Escrow security for iCloud Keychain](https://support.apple.com/guide/security/escrow-security-for-icloud-keychain-sec3e341e75d/web)
- [Use passkeys to sign in (iPhone)](https://support.apple.com/guide/iphone/use-passkeys-to-sign-in-to-websites-and-apps-iphf538ea8d0/ios) · [ASPasskeyCredentialIdentity](https://developer.apple.com/documentation/authenticationservices/aspasskeycredentialidentity) · [ASCredentialExportManager](https://developer.apple.com/documentation/authenticationservices/ascredentialexportmanager)
- [WebKit: Full Third-Party Cookie Blocking and More](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/) · [WebKit Features in Safari 18.0](https://webkit.org/blog/15865/webkit-features-in-safari-18-0/) · [WebKit Features in Safari 26.0](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/)

**Google**
- [Passkeys supported environments](https://developers.google.com/identity/passkeys/supported-environments) · [server-side registration](https://developers.google.com/identity/passkeys/developer-guides/server-registration) · [server-side authentication](https://developers.google.com/identity/passkeys/developer-guides/server-authentication)
- [Chrome for Developers: Conditional Create](https://developer.chrome.com/docs/identity/webauthn-conditional-create) · [Passkey automatic upgrades](https://developer.chrome.com/blog/passkey-automatic-upgrades)
- [Google Account Help: passkeys](https://support.google.com/accounts/answer/13548313) · [Chrome Help: passkeys](https://support.google.com/chrome/answer/13168025) · [On-device encryption](https://support.google.com/accounts/answer/11350823) · [blog.google: passkeys update, сентябрь 2024](https://blog.google/innovation-and-ai/technology/safety-security/google-password-manager-passkeys-update-september-2024/)
- [Firebase: Anonymous Authentication](https://firebase.google.com/docs/auth/web/anonymous-auth) · [Firebase: Account Linking](https://firebase.google.com/docs/auth/web/account-linking)
- [Android: Credential Provider](https://developer.android.com/identity/sign-in/credential-provider) · [Android: Credential Transfer](https://developer.android.com/identity/sign-in/credential-transfer)

**Microsoft**
- [Support for Passkeys in Windows](https://learn.microsoft.com/en-us/windows/security/identity-protection/passkeys/) · [WebAuthn APIs и plugin authenticators](https://learn.microsoft.com/en-us/windows/security/identity-protection/hello-for-business/webauthn-apis) · [справочник Win32 WebAuthn](https://learn.microsoft.com/en-us/windows/win32/api/_webauthn/) · [Windows Hello FAQ](https://learn.microsoft.com/en-us/windows/security/identity-protection/hello-for-business/faq)
- [Edge blog: passkey saving and syncing, ноябрь 2025](https://blogs.windows.com/msedgedev/2025/11/03/microsoft-edge-introduces-passkey-saving-and-syncing-with-microsoft-password-manager/) · [Edge blog: архитектура синхронизации, апрель 2026](https://blogs.windows.com/msedgedev/2026/04/22/engineering-secure-passkey-sync-in-microsoft-password-manager/)
- [Entra: synced passkeys](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-synced-passkeys)

**Прочее**
- [passkeys.dev: Terms](https://passkeys.dev/docs/reference/terms/) · [Bootstrapping](https://passkeys.dev/docs/use-cases/bootstrapping/) · [Related Origin Requests](https://passkeys.dev/docs/advanced/related-origins/) · [Device support](https://passkeys.dev/device-support/) · [Known Issues](https://passkeys.dev/docs/reference/known-issues/)
- [Supabase: Anonymous Sign-Ins](https://supabase.com/docs/guides/auth/auth-anonymous)
- [AWS: Identity pools authentication flow](https://docs.aws.amazon.com/cognito/latest/developerguide/authentication-flow.html)

---

## Что осталось непроверенным и где источники расходятся

1. **FIDO противоречит сама себе** насчёт «password + SMS OTP или магическая ссылка» как способа восстановления: документ 2024 года допускает, документы марта 2025 запрещают на верхней ступени зрелости. Приоритет у более новых.
2. **NIST и W3C расходятся по флагу BS.** WebAuthn §6.1.3 строит на нём рекомендации интерфейса; NIST Appendix B советует «SHOULD NOT condition acceptance based on this flag for public-facing applications».
3. **Флаги BE/BS не аттестованы** и выставляются провайдерами неодинаково — passkeys.dev зафиксировал `BE = false` у Samsung Pass. Опираться на них как на надёжный признак нельзя.
4. **passkeys.dev не покрывает** ни восстановление, ни BE/BS, ни PRF, ни largeBlob, ни сигнальные методы. Ссылка `passkeys.dev/docs/advanced/attestation/` возвращает 404 — расхожая цитата «не запрашивайте аттестацию» в живых первоисточниках не находится.
5. **Related Origin Requests в Firefox**: passkeys.dev указывает Firefox 152+, но в примечаниях к выпуску Firefox 152 на MDN записей про WebAuthn нет. Считать поддержку подтверждённой нельзя.
6. **Данные совместимости внутренне противоречивы** в нескольких местах (BCD против chromestatus против passkeys.dev), особенно по Edge, Firefox Android и по расширениям `prf` и `largeBlob`. Приведённые в таблице значения — консервативные.
7. **Расширение области синхронизации Microsoft.** На сентябрь 2026 синхронизация passkey через учётную запись Microsoft ограничена Edge на Windows и явно не покрывает мобильные устройства и Entra; заявлено намерение расширить, но первоисточника с датами нет.
8. **Enterprise-политика согласия на доступ к passkey в Windows 11** документирована как доступная в Insider с целью общедоступности «к концу июня 2026»; страница после этой даты не обновлялась.
9. **Delegated Account Recovery мёртв** — репозиторий, на который ссылается документ FIDO 2019 года, перенесён в архив. Иных стандартизованных механизмов восстановления псевдонимного аккаунта первоисточники не предлагают.
10. **CXP против CXF.** Формат переноса стандартизован (Proposed Standard с эрратой марта 2026), протокол переноса — нет (Working Draft 2024 с оговоркой «not intended to be a basis for any implementations»). Реализации Apple и Android используют CXF поверх транспорта операционной системы; статус Samsung и Microsoft по переносу не подтверждён первоисточниками.
11. **Счётчик подписей**: W3C относит `signCount` к RECOMMENDED-полям credential record, серверное руководство Google его в схеме таблицы не приводит.
12. **Уровень 4 WebAuthn** — веха первого рабочего черновика датирована 9 сентября 2026 и на момент сбора не закрыта; документа на /TR нет.
