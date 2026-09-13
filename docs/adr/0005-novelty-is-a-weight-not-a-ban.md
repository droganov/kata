# Novelty is a weight, not a ban

Recently done Exercises come up less often but stay possible. An Exercise's weight is `max(d / 21, 0.02)`, where `d` is days since it was last done, capped at 21; an Exercise absent from History has weight 1. Muscle groups and Targets take the weight of their most recently done Exercise. The weight applies wherever selection is random: inside a pinned Muscle group, in the draw and in Stretching under the day's load. The floor of `0.02` means the catalog can never be exhausted.

## Considered Options

- Hard ban on anything done in the last three weeks: rejected by the data. The "cervical spine" Target has four Exercises and takes all four every Session; the Glutes Muscle group in static stretching has six Exercises for nine Sessions in three weeks. A ban leaves both empty.
