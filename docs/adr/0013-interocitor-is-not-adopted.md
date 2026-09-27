# interocitor is not adopted; the offline Session runs on the existing Store

Ticket 15 asked whether interocitor, an MIT end-to-end encrypted local-first row store, should carry the offline Session. It is not adopted. Its outbox does not do what the ticket asks: a failed flush is not retried when the connection returns, a failed request does not turn its connection status to offline, and it exposes no count of unsent changes. It would also add a remote the stateless server does not have (ADR-0001) and a per-field merge that ADR-0009 ruled out. Offline state stays detected by the app's own failed requests, and unsent marks queue in `sessionStorage` next to the Active session (ADR-0011, ADR-0012).

Evaluation of commit 624f01b (npm core 0.2.0, web 0.2.1): ticket 15, with ticket-specific answers in tickets 09 and 13.

## Considered Options

- History in interocitor, one engine per Account, no key: works, a spike passed `src/test/store-contract.ts` unchanged. Rejected: 30.8 KB min+gzip against 2.3 KB for the current Store, deleted History entries stay as tombstones, and without a remote it gains nothing.
- interocitor as the phase 2 remote: rejected for now. Its mailbox server runs only on Cloudflare; on Deno Deploy it means a third-party S3 bucket or a storage adapter of our own. Encrypted rows would end the server-readable Postgres Store (ADR-0002), and a key held on the device turns a lost key into lost History, while ADR-0007 has no recovery codes.
- Revisit when story 59 (two devices, a sync engine) is scheduled. By then the library needs npm releases that match its repository and install cleanly, CI, and tested support for iOS Safari and Firefox; none exist today.

## Consequences

- ADR-0009 and ADR-0011 stand, and no dependency is added.
- One exception to ADR-0011: until they are sent, queued marks keep the Session's seed and its skipped marks after finalization. The queue lives in `sessionStorage` and empties on delivery, so nothing of a closed Session outlives the tab.
- Phase 1 has no server-side store, so marks are sent to a stateless `POST /marks` that acknowledges them with 204 and keeps nothing, the same way the sign-in stub keeps the phase 2 shape (ADR-0008). The server of ADR-0001 thus gains one route beside assembly and sign-in. Phase 2 puts the Postgres Store behind the same route.
- Resending on return, the offline indicator and treating a hotspot without internet as offline are app code built on failed requests and a deadline.
