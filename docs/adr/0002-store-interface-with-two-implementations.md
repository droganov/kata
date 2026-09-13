# One Store interface, two implementations, one contract test suite

The app never talks to IndexedDB or Postgres directly. It talks to a Store whose operations are named after the domain (`openSession`, `markExercise`, `closeSession`), never after table rows, and whose errors are domain errors ("email already taken", not "unique constraint violated"). Phase 1 ships an IndexedDB implementation, phase 2 a Postgres one. A single test suite is written against the interface and runs on both: it is the only real guarantee that moving to Postgres breaks nothing.

The Store computes nothing. Weights, selection, contraindication filtering and Block order belong to session assembly (ADR-0004), not to storage. The Store does not know about the network either.

Full interface: [store-interface.md](../intake/store-interface.md).
