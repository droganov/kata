# Issue tracker: Local Markdown

Specs and tickets for this repo live as markdown files under `docs/`.

## Conventions

- Specs: `docs/specs/<feature-slug>.md`
- Intake documents a spec builds on: `docs/intake/`
- Tickets: one file per ticket at `docs/tickets/<NN>-<slug>.md`, numbered from `01` across the repo, never a single combined tickets file
- Each ticket opens with `**What to build:**`, `**Blocked by:**` and `**Status:**` lines, followed by a checklist of acceptance checks
- Triage state is the `**Status:**` value (see `triage-labels.md` for the role strings)
- A finished ticket has every check ticked and `**Status:** closed`
- Comments and conversation history append to the bottom of the ticket under a `## Comments` heading
- Exploration maps and open questions live in `.scratch/<feature-slug>/` (see Wayfinding operations)

## When a skill says "publish to the issue tracker"

Create a new ticket file under `docs/tickets/` with the next free number. A spec goes to `docs/specs/<feature-slug>.md`.

## When a skill says "fetch the relevant ticket"

Read the file at `docs/tickets/<NN>-<slug>.md`. The user will normally pass the path or the ticket number directly.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a file with one **child** file per ticket.

- **Map**: `.scratch/<effort>/map.md` (the Notes / Decisions-so-far / Fog body).
- **Child ticket**: `.scratch/<effort>/issues/NN-<slug>.md`, numbered from `01`, with the question in the body. A `Type:` line records the ticket type (`research`/`prototype`/`grilling`/`task`); a `Status:` line records `claimed`/`resolved`.
- **Blocking**: a `Blocked by: NN, NN` line near the top. A ticket is unblocked when every file it lists is `resolved`.
- **Frontier**: scan `.scratch/<effort>/issues/` for files that are open, unblocked, and unclaimed; first by number wins.
- **Claim**: set `Status: claimed` and save before any work.
- **Resolve**: append the answer under an `## Answer` heading, set `Status: resolved`, then append a context pointer (gist + link) to the map's Decisions-so-far in `map.md`.
