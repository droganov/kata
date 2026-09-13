# Stateless server on Deno Deploy, mutable data on the device in phase 1

The app is hosted on Deno Deploy through the official `@deno/svelte-adapter`. Deno Deploy has a read-only file system and no persistence, so in phase 1 the server holds no state: the catalog tables ship with the deployment, are read into memory at isolate cold start, and the server only assembles a Session. Everything mutable (Accounts, Sessions, History) lives on the device in `sessionStorage` and IndexedDB. Phase 2 moves mutable data into Deno Deploy's managed Postgres.

## Considered Options

- A host with a writable disk: rejected, the platform was chosen first and its constraint shapes the rest.
- Third-party SvelteKit adapters for Deno: rejected in favour of the one maintained by the Deno team.

## Consequences

- Starting a Session needs the network; the client sends its History to the server as assembly input.
- On iOS a Safari tab evicts IndexedDB after seven days without interaction, so installing the app is a data-safety matter (see ADR-0010).
