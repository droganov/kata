import type {
	Frame,
	FrameOracle,
	OracleLine,
	Prompt,
	PromptCatalog,
	PromptExercise,
	PromptOracle,
	PromptStep
} from './prompt.ts';
import type { StepKind } from './step-kind.ts';
import type { PromptHead, RuleCounts } from './template.ts';

import { parseDose } from '../../shared/dose.ts';
import { cameraViewOf, isBilateralMuscle, isPosteriorMuscle } from './camera.ts';
import { hasNoVisualForm } from './line-classes.ts';
import { isCarriedKind, STEP_KIND, stepKindOf } from './step-kind.ts';
import {
	assertTemplateWords,
	decisionLines,
	frameLines,
	headLines,
	promptTextOf
} from './template.ts';

const MAIN_ROLE = 'main';
const PRIMARY_ROLE = 'primary';
const LEFT_SIDE = 'left';
const RIGHT_SIDE = 'right';

interface FrameInput {
	readonly catalog: PromptCatalog;
	readonly index: number;
	readonly isPosterior: boolean;
	readonly isUnilateral: boolean;
	readonly kind: StepKind;
	readonly side: string;
	readonly step: PromptStep;
}

const oracleLineOf = (id: string, text: string): OracleLine => ({
	id,
	isMarked: hasNoVisualForm(text),
	text
});

export const promptOf = (exercise: PromptExercise, catalog: PromptCatalog): Prompt => {
	const frames = framesOf(exercise, catalog);
	const lines = [
		...headLines(headOf(exercise, catalog, frames.length)),
		...frames.flatMap((frame) => frameLines(frame)),
		...decisionLines(countsOf(frames))
	];
	assertTemplateWords(lines);
	return { exercise: exercise.id, frames, text: promptTextOf(lines) };
};

const countsOf = (frames: readonly Frame[]): RuleCounts => {
	const lines = frames.flatMap((frame) =>
		frame.oracles.flatMap((oracle) => [
			oracle.predicate,
			...oracle.model,
			...oracle.counterModel
		])
	);
	const marked = lines.filter((line) => line.isMarked).length;
	return { frameCount: frames.length, marked, rule: lines.length - marked };
};

const equipmentName = (catalog: PromptCatalog, id: string): string => {
	const found = catalog.equipment.get(id);
	if (found === undefined) throw new Error(`нет средства ${id}`);
	return found.canonEn;
};

const equipmentNames = (
	exercise: PromptExercise,
	catalog: PromptCatalog,
	isMain: boolean
): readonly string[] =>
	exercise.equipment
		.filter((reference) => (reference.role === MAIN_ROLE) === isMain)
		.map((reference) => equipmentName(catalog, reference.id));

const frameOf = (input: FrameInput): Frame => {
	const number = input.index + 1;
	const oracles = input.step.oracles.map((oracle, at) => frameOracleOf(oracle, number, at + 1));
	const visible = oracles
		.flatMap((oracle) => [oracle.predicate, ...oracle.model])
		.filter((line) => !line.isMarked)
		.map((line) => line.text);
	return {
		activeMuscles: input.step.active.map((id) => muscleName(input, id)),
		camera: cameraViewOf(visible, input.isPosterior),
		...(isCarriedKind(input.kind) && { carry: { kind: input.kind, source: number - 1 } }),
		number,
		oracles,
		title: input.step.title,
		...(input.isUnilateral && { workingSide: input.side })
	};
};

const frameOracleOf = (oracle: PromptOracle, frame: number, at: number): FrameOracle => {
	const prefix = `F${String(frame)}.O${String(at)}`;
	return {
		counterModel: oracle.counterModel.map((text, index) =>
			oracleLineOf(`${prefix}.C${String(index + 1)}`, text)
		),
		model: oracle.model.map((text, index) =>
			oracleLineOf(`${prefix}.M${String(index + 1)}`, text)
		),
		predicate: oracleLineOf(`${prefix}.P`, oracle.predicate)
	};
};

const framesOf = (exercise: PromptExercise, catalog: PromptCatalog): readonly Frame[] => {
	const isUnilateral = parseDose(exercise.dose).isPerSide;
	const isPosterior = exercise.targets
		.filter((reference) => reference.role === PRIMARY_ROLE)
		.some((reference) => isPosteriorMuscle(targetLatin(catalog, reference.id)));
	const frames: Frame[] = [];
	let side = LEFT_SIDE;
	for (const [index, step] of exercise.procedure.steps.entries()) {
		const kind = stepKindOf(step.title);
		if (kind === STEP_KIND.switch) side = RIGHT_SIDE;
		frames.push(frameOf({ catalog, index, isPosterior, isUnilateral, kind, side, step }));
	}
	return frames;
};

const headOf = (
	exercise: PromptExercise,
	catalog: PromptCatalog,
	frameCount: number
): PromptHead => ({
	auxiliary: equipmentNames(exercise, catalog, false),
	dose: exercise.dose,
	frameCount,
	main: equipmentNames(exercise, catalog, true),
	name: exercise.name
});

const muscleName = (input: FrameInput, id: string): string => {
	const latin = targetLatin(input.catalog, id);
	return !input.isUnilateral || isBilateralMuscle(latin) ? latin : `${input.side} ${latin}`;
};

const targetLatin = (catalog: PromptCatalog, id: string): string => {
	const found = catalog.targets.get(id);
	if (found === undefined) throw new Error(`нет цели ${id}`);
	return found.latin;
};
