# Session assembly is a pure function, run on the server

A Session is assembled at start time by a pure function of the Program, the catalog, the History of the last 21 days, the current moment and a random seed. Same input, same output; the seed is kept with the active Session so it can be reproduced and explained while it runs (a closed Session is not kept, see ADR-0011). The function does no I/O, which makes it the main test seam.

It runs in a thin server route while the app itself stays client-side (`ssr = false`). Only the Exercises of the assembled Session, with their Procedures and Oracles, are sent to the client, so a Session is self-contained and can be finished offline (ADR-0009).

## Considered Options

- Pre-baked days on a fixed rotation (the prototype): rejected, six days repeating meant the same Session came back literally every two weeks.
- Assembling on the client: rejected, it would ship the whole catalog (about 4.5 MB) to the phone.

Contract: [session-assembly.md](../intake/session-assembly.md).
