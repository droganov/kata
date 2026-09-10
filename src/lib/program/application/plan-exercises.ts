import type { BankView, TargetView } from '../../catalog/application/catalog-views.ts';
import type { ExerciseView } from '../../exercise/application/exercise-views.ts';
import type { PlanExercise, PlanExercises, PlanTarget } from '../domain/plan-exercise.ts';
import type { ProgramRepositories } from './program-repositories.ts';

const HIP_CONTOUR_SLUG = 'hip';

export interface PlanCatalogue {
	readonly exercises: PlanExercises;
	readonly hipMobilityExerciseIds: ReadonlySet<string>;
}

export function planCatalogueOf(repositories: ProgramRepositories): PlanCatalogue {
	return {
		exercises: planExercisesOf(
			repositories.exercises.readExercises(),
			repositories.catalog.readTargets()
		),
		hipMobilityExerciseIds: hipMobilityIdsOf(repositories.catalog.readBanks())
	};
}

function hipMobilityIdsOf(banks: readonly BankView[]): ReadonlySet<string> {
	return new Set(
		banks
			.flatMap((bank) => bank.zones)
			.flatMap((zone) => zone.contours)
			.filter((contour) => contour.slug === HIP_CONTOUR_SLUG)
			.flatMap((contour) => contour.exerciseIds)
	);
}

function planExerciseOf(view: ExerciseView, groups: ReadonlyMap<string, string>): PlanExercise {
	return {
		constraints: {
			axial: view.constraints.axial,
			free_weight: view.constraints.free_weight,
			...(view.constraints.kg_max !== undefined && { kg_max: view.constraints.kg_max }),
			lumbar_ext: view.constraints.lumbar_ext,
			lumbar_flex: view.constraints.lumbar_flex
		},
		dose: view.dose,
		...(view.goal !== undefined && { goal: view.goal }),
		hasProcedure: view.procedure.steps.length > 0,
		...(view.hipPlane !== undefined && { hipPlane: view.hipPlane }),
		id: view.id,
		mode: view.mode,
		name: view.name,
		...(view.plane !== undefined && { plane: view.plane }),
		...(view.seconds !== undefined && { seconds: view.seconds }),
		slug: view.slug,
		targets: planTargetsOf(view, groups)
	};
}

function planExercisesOf(
	views: readonly ExerciseView[],
	targets: readonly TargetView[]
): PlanExercises {
	const groups = new Map(
		targets.flatMap((target) => (target.group === undefined ? [] : [[target.id, target.group]]))
	);
	return new Map(views.map((view) => [view.id, planExerciseOf(view, groups)]));
}

function planTargetsOf(
	view: ExerciseView,
	groups: ReadonlyMap<string, string>
): readonly PlanTarget[] {
	return view.targets.flatMap((reference) => {
		const group = groups.get(reference.id);
		return group === undefined ? [] : [{ group, role: reference.role }];
	});
}
