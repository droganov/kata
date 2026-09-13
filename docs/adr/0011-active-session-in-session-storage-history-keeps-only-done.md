# Active Session lives in sessionStorage; History keeps only done Exercises

The active Session lives whole in `sessionStorage`. It closes when every item is marked, when the person cancels it, or when it expires two hours after the last mark; all three run the same finalization. Finalization writes to IndexedDB only the ids of Exercises marked done, with the date, keyed by Account. The Session itself is not kept: not its skipped or rejected items, not its seed. Entries older than three weeks are removed on write.

History exists for one purpose: weighting random selection (ADR-0005), so a randomly drawn Exercise does not come back day after day. What is pinned is taken every Session regardless.

## Considered Options

- Keep closed Sessions whole and derive History by query: rejected, it fills storage with copies of what is gone.
- Count skipped Exercises as shown: rejected, only what was done pushes an Exercise back.

## Consequences

- `sessionStorage` dies with the tab. A Session whose tab closes before finalization never reaches History; accepted consciously.
- A closed Session cannot be replayed from its seed.
- Phase 2 stores History the same way in Postgres, not as a view over Sessions.
