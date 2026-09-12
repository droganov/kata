import type {
	BankView,
	EquipmentView,
	TargetView
} from '../../lib/catalog/application/catalog-views.ts';
import type { CatalogUseCases } from '../../lib/catalog/interface/catalog.ts';
import type { ExerciseView } from '../../lib/exercise/application/exercise-views.ts';
import type { ExerciseUseCases } from '../../lib/exercise/interface/exercise.ts';
import type {
	ProgramOutlineView,
	SlotOutline
} from '../../lib/program/application/outline-program.ts';
import type { ProgramUseCases } from '../../lib/program/interface/program.ts';
import type { PromptView } from '../../lib/storyboard/application/prompt-views.ts';
import type { StoryboardUseCases } from '../../lib/storyboard/interface/storyboard.ts';

const ROLE_SEPARATOR = ' — ';
const LIST_SEPARATOR = ' · ';
const NO_PROGRAM = 'у первого пользователя нет программы';

export interface DevPageData {
	readonly banks: readonly DevBank[];
	readonly exercises: Readonly<Record<string, DevExercise>>;
	readonly program: DevProgram;
	readonly sections: readonly DevSection[];
}

export interface DevPageInputs {
	readonly banks: readonly BankView[];
	readonly equipment: readonly EquipmentView[];
	readonly exercises: readonly ExerciseView[];
	readonly outline: ProgramOutlineView;
	readonly prompts: readonly PromptView[];
	readonly targets: readonly TargetView[];
}

export interface DevPageUseCases {
	readonly catalog: Pick<CatalogUseCases, 'findEquipment' | 'findTargets' | 'listBanks'>;
	readonly exercise: Pick<ExerciseUseCases, 'listExercises'>;
	readonly program: Pick<ProgramUseCases, 'listUsers' | 'outlineProgram'>;
	readonly storyboard: Pick<StoryboardUseCases, 'renderAllPrompts'>;
}

export interface DevRow {
	readonly dose: string;
	readonly id: string;
	readonly name: string;
}

interface DevBank {
	readonly slug: string;
	readonly title: string;
	readonly zones: readonly DevZone[];
}

interface DevContour {
	readonly exercises: readonly DevRow[];
	readonly id: string;
	readonly pick?: number;
	readonly title: string;
}

interface DevExercise {
	readonly equipment: string;
	readonly id: string;
	readonly name: string;
	readonly note?: string;
	readonly prompt?: string;
	readonly steps: readonly DevStep[];
	readonly targets: string;
}

interface DevGroup {
	readonly id: string;
	readonly slots: readonly [DevSlot, ...DevSlot[]];
	readonly zone?: DevZoneRef;
}

interface DevOracle {
	readonly counterModel: readonly string[];
	readonly id: string;
	readonly model: readonly string[];
	readonly predicate: string;
}

interface DevProgram {
	readonly id: string;
	readonly title: string;
}

interface DevSection {
	readonly base: readonly DevRow[];
	readonly groups: readonly DevGroup[];
	readonly id: string;
	readonly mode: string;
	readonly slug: string;
	readonly title: string;
}

interface DevSlot {
	readonly allowRepeat: boolean;
	readonly contourTitle?: string;
	readonly exercises: readonly DevRow[];
	readonly id: string;
	readonly label: string;
	readonly pick: number;
	readonly rule?: string;
}

interface DevStep {
	readonly active: string;
	readonly id: string;
	readonly oracles: readonly DevOracle[];
	readonly title: string;
}

interface DevZone {
	readonly contours: readonly DevContour[];
	readonly id: string;
	readonly title: string;
}

interface DevZoneRef {
	readonly id: string;
	readonly title: string;
}

interface Named {
	readonly id: string;
	readonly name: string;
}

type NameIndex = ReadonlyMap<string, string>;

const nameIndexOf = (items: readonly Named[]): NameIndex =>
	new Map(items.map((item) => [item.id, item.name]));

const nameOf = (index: NameIndex, id: string): string => index.get(id) ?? id;

const roleListOf = (
	references: readonly { readonly id: string; readonly role: string }[],
	index: NameIndex
): string =>
	references
		.map((reference) => `${nameOf(index, reference.id)}${ROLE_SEPARATOR}${reference.role}`)
		.join(LIST_SEPARATOR);

const devExerciseOf = (
	exercise: ExerciseView,
	equipment: NameIndex,
	targets: NameIndex,
	prompt: string | undefined
): DevExercise => ({
	equipment: roleListOf(exercise.equipment, equipment),
	id: exercise.id,
	name: exercise.name,
	...(exercise.note !== undefined && { note: exercise.note }),
	...(prompt !== undefined && { prompt }),
	steps: exercise.procedure.steps.map((step) => ({
		active: step.active.map((id) => nameOf(targets, id)).join(LIST_SEPARATOR),
		id: step.id,
		oracles: step.oracles.map((oracle) => ({
			counterModel: oracle.counterModel,
			id: oracle.id,
			model: oracle.model,
			predicate: oracle.predicate
		})),
		title: step.title
	})),
	targets: roleListOf(exercise.targets, targets)
});

const rowsOf = (ids: readonly string[], exercises: ReadonlyMap<string, ExerciseView>): DevRow[] =>
	ids.map((id) => {
		const exercise = exercises.get(id);
		return exercise === undefined
			? { dose: '', id, name: id }
			: { dose: exercise.dose, id, name: exercise.name };
	});

const devSlotOf = (slot: SlotOutline, exercises: ReadonlyMap<string, ExerciseView>): DevSlot => ({
	allowRepeat: slot.allowRepeat,
	...(slot.contourTitle !== undefined && { contourTitle: slot.contourTitle }),
	exercises: rowsOf(slot.exerciseIds, exercises),
	id: slot.id,
	label: slot.label,
	pick: slot.pick,
	...(slot.rule !== undefined && { rule: slot.rule })
});

const sectionsOf = (
	outline: ProgramOutlineView,
	exercises: ReadonlyMap<string, ExerciseView>
): DevSection[] =>
	outline.sections.map((section) => ({
		base: rowsOf(section.baseExerciseIds, exercises),
		groups: section.groups.map((group) => {
			const [first, ...rest] = group.slots;
			return {
				id: group.id,
				slots: [
					devSlotOf(first, exercises),
					...rest.map((slot) => devSlotOf(slot, exercises))
				],
				...(group.zone !== undefined && {
					zone: { id: group.zone.id, title: group.zone.title }
				})
			};
		}),
		id: section.id,
		mode: section.mode,
		slug: section.slug,
		title: section.title
	}));

const banksOf = (
	banks: readonly BankView[],
	exercises: ReadonlyMap<string, ExerciseView>
): DevBank[] =>
	banks.map((bank) => ({
		slug: bank.slug,
		title: bank.title,
		zones: bank.zones.map((zone) => ({
			contours: zone.contours.map((contour) => ({
				exercises: rowsOf(contour.exerciseIds, exercises),
				id: contour.id,
				...(contour.pick !== undefined && { pick: contour.pick }),
				title: contour.title
			})),
			id: zone.id,
			title: zone.title
		}))
	}));

export const devPageDataOf = (inputs: DevPageInputs): DevPageData => {
	const exercises = new Map(inputs.exercises.map((exercise) => [exercise.id, exercise]));
	const equipment = nameIndexOf(inputs.equipment);
	const targets = nameIndexOf(inputs.targets);
	const prompts = new Map(inputs.prompts.map((prompt) => [prompt.exercise, prompt.text]));
	return {
		banks: banksOf(inputs.banks, exercises),
		exercises: Object.fromEntries(
			inputs.exercises.map((exercise) => [
				exercise.id,
				devExerciseOf(exercise, equipment, targets, prompts.get(exercise.id))
			])
		),
		program: { id: inputs.outline.id, title: inputs.outline.title },
		sections: sectionsOf(inputs.outline, exercises)
	};
};

export const loadDevPage = (useCases: DevPageUseCases): DevPageData => {
	const programId = useCases.program.listUsers()[0]?.programs[0];
	if (programId === undefined) throw new Error(NO_PROGRAM);
	return devPageDataOf({
		banks: useCases.catalog.listBanks(),
		equipment: useCases.catalog.findEquipment(),
		exercises: useCases.exercise.listExercises(),
		outline: useCases.program.outlineProgram(programId),
		prompts: useCases.storyboard.renderAllPrompts(),
		targets: useCases.catalog.findTargets()
	});
};
