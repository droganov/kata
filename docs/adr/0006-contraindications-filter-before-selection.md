# Contraindications filter the catalog before selection

A Program's contraindications (`no_axial_load`, `no_lumbar_flexion`, `no_lumbar_extension`, `free_weight_kg_max`) remove forbidden Exercises from the candidate set before anything is drawn. A forbidden Exercise never enters selection at all.

## Considered Options

- Validate the assembled Session afterwards: rejected. A post-check can only fail a finished Session or delete an item, leaving a hole in a Block that nothing can fill. Filtering first means a Target or Muscle group whose Exercises are all forbidden is simply never chosen.
