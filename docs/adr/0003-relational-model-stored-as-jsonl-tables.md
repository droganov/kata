# Canonical relational model, stored as one jsonl file per table

The data model is a canonical Postgres schema in BCNF. Until a database exists, each table lives in `data/<table>.jsonl`: one line is one tuple, object keys equal column names, values are scalars only (an array or nested object is an error). Moving to Postgres is a `COPY` with no reshaping. A critic checks the format rules and every foreign key.

Normalisation settled several shape questions at once: an Exercise is a leaf that knows nothing about Programs or Blocks; the four source catalogs collapsed into the `exercise.modality` column; the target tree has two explicit levels (`muscle_group`, `target`) rather than a self-referencing tree, so the database guarantees the level.

## Considered Options

- Keep the nested JSON catalogs: human-readable trees, but they duplicated one Target three times, stored links in both directions and held arrays inside records.
- A self-referencing target tree: rejected, needs recursive queries and cannot enforce depth.

Full schema: [data-model.md](../intake/data-model.md).
