import type { SourceProgramBlocks } from './program-blocks.ts';
import type { SourceCatalog, SourceExercise, SourcePlacement } from './source-catalog.ts';
import type { Row, Tables } from './table.ts';

import { idOf } from './catalog-ids.ts';
import { derivedId } from './derived-id.ts';
import { GOAL_NAMES } from './goal-names.ts';
import { procedureTablesOf } from './procedure.ts';
import { PROGRAM_BLOCKS } from './program-blocks.ts';
import { programTablesOf } from './program.ts';
import { prototypeTablesOf } from './prototype.ts';
import { sourcePlacements, sourceRecords } from './source-catalog.ts';
import {
	CATALOG_TARGETS,
	DICTIONARY_TARGET_KIND,
	JOINT_MUSCLE_GROUP,
	MUSCLE_GROUP_FILE,
	TARGET_KIND
} from './target-map.ts';

const FIRST_ORD = 1;
const NO_ALIAS = 'мишень словаря не найдена: ';
const NO_FILE = 'в источнике нет файла ';
const NO_GROUP = 'группа мышц не найдена: ';
const NO_KIND = 'вид мишени не объявлен: ';
const NO_REFERENCE = 'источник упражнения не найден: ';
const NO_GOAL = 'цель не названа: ';
const NO_TARGET_GROUP = 'анатомическая группа не найдена: ';
const GOAL_MARK = 'goal';
const TARGET_GROUP_MARK = 'target_group';

interface Catalogued {
	readonly exercises: readonly Row[];
	readonly idBySlug: ReadonlyMap<string, string>;
	readonly targets: readonly Row[];
}

interface NamingContext {
	readonly dictionaryBySlug: ReadonlyMap<string, Row>;
	readonly goalIdBySlug: ReadonlyMap<string, string>;
	readonly groupIdBySlug: ReadonlyMap<string, string>;
}

export const tablesOf = (
	catalog: SourceCatalog,
	declared: Readonly<Record<string, SourceProgramBlocks>> = PROGRAM_BLOCKS
): Tables => {
	const groups = muscleGroupRows(catalog);
	const groupIdBySlug = new Map(groups.map((group) => [String(group.slug), String(group.id)]));
	const targetGroups = targetGroupRows(catalog);
	const targetGroupIdBySlug = idsBySlug(targetGroups);
	const goals = goalRows(catalog);
	const goalIdBySlug = idsBySlug(goals);
	const dictionary = dictionaryTargetRows(catalog, groupIdBySlug, targetGroupIdBySlug);
	const context = {
		dictionaryBySlug: new Map(dictionary.map((row) => [String(row.slug), row])),
		goalIdBySlug,
		groupIdBySlug
	};
	const catalogued = cataloguedRows(catalog, context);
	const procedure = procedureTablesOf(catalog);
	const targets = [...dictionary, ...catalogued.targets];
	const ids = {
		goalIdBySlug,
		groupIdBySlug,
		groupIdByTarget: new Map(
			targets.flatMap((row) =>
				row.muscle_group_id === null ? [] : [[String(row.id), String(row.muscle_group_id)]]
			)
		),
		groupOrdById: new Map(groups.map((group) => [String(group.id), Number(group.ord)])),
		targetGroupIdBySlug,
		targetIdByContourSlug: catalogued.idBySlug,
		targetIdByExercise: new Map(
			catalogued.exercises.map((row) => [String(row.id), String(row.catalog_target_id)])
		)
	};
	const program = programTablesOf(catalog, declared, ids);
	const prototype = prototypeTablesOf(catalog, ids);
	return {
		block: program.block,
		block_draw: program.block_draw,
		block_excluded: program.block_excluded,
		block_pair: program.block_pair,
		block_pin_group: program.block_pin_group,
		block_pin_target: program.block_pin_target,
		block_rule: program.block_rule,
		equipment: equipmentRows(catalog),
		exercise: catalogued.exercises,
		exercise_equipment: exerciseEquipmentRows(catalog),
		exercise_source: exerciseSourceRows(catalog),
		exercise_target: exerciseTargetRows(catalog),
		goal: goals,
		muscle_group: groups,
		oracle: procedure.oracle,
		oracle_line: procedure.oracle_line,
		person: catalog.persons.map((person) => ({ id: person.id, nickname: person.name })),
		program: program.program,
		program_goal: program.program_goal,
		program_hip_plane: program.program_hip_plane,
		program_outside_gym: program.program_outside_gym,
		program_progression: program.program_progression,
		program_timing: program.program_timing,
		program_volume: program.program_volume,
		prototype_bank: prototype.prototype_bank,
		prototype_contour: prototype.prototype_contour,
		prototype_contour_exercise: prototype.prototype_contour_exercise,
		prototype_pairing: prototype.prototype_pairing,
		prototype_program: prototype.prototype_program,
		prototype_section: prototype.prototype_section,
		prototype_slot: prototype.prototype_slot,
		prototype_slot_exercise: prototype.prototype_slot_exercise,
		prototype_target: prototype.prototype_target,
		prototype_zone: prototype.prototype_zone,
		step: procedure.step,
		step_target: procedure.step_target,
		target: targets,
		target_group: targetGroups,
		verdict: procedure.verdict,
		verdict_line: procedure.verdict_line
	};
};

const capitalized = (text: string): string => text.slice(0, 1).toUpperCase() + text.slice(1);

const cataloguedRows = (catalog: SourceCatalog, context: NamingContext): Catalogued => {
	const idBySlug = new Map<string, string>();
	const targets: Row[] = [];
	const exercises: Row[] = [];
	for (const placement of sourcePlacements(catalog)) {
		const slug = placement.catalogTarget.slug;
		const id = idBySlug.get(slug) ?? targetIdOf(placement, context, targets);
		idBySlug.set(slug, id);
		for (const exercise of placement.catalogTarget.exercises)
			exercises.push(exerciseRow(exercise, id, context.goalIdBySlug));
	}
	return { exercises, idBySlug, targets };
};

const dictionaryTargetRows = (
	catalog: SourceCatalog,
	groupIdBySlug: ReadonlyMap<string, string>,
	targetGroupIdBySlug: ReadonlyMap<string, string>
): readonly Row[] =>
	catalog.targets.map((target) => {
		const kind = DICTIONARY_TARGET_KIND.get(target.slug) ?? target.kind;
		const groupSlug = JOINT_MUSCLE_GROUP[target.slug] ?? target.group;
		const groupId = groupIdBySlug.get(groupSlug);
		if (groupId === undefined && kind !== TARGET_KIND.system)
			throw new TypeError(NO_GROUP + groupSlug);
		return {
			id: target.id,
			kind,
			latin: target.latin,
			muscle_group_id: groupId ?? null,
			name: target.name,
			slug: target.slug,
			target_group_id:
				target.targetGroup === undefined
					? null
					: idOf(targetGroupIdBySlug, target.targetGroup, NO_TARGET_GROUP)
		};
	});

const equipmentRows = (catalog: SourceCatalog): readonly Row[] =>
	catalog.equipment.map((item) => ({
		canon_en: item.canonEn,
		id: item.id,
		kind: item.kind,
		name: item.name,
		slug: item.slug
	}));

const exerciseEquipmentRows = (catalog: SourceCatalog): readonly Row[] =>
	sourceRecords(catalog).flatMap(({ exercise }) =>
		exercise.equipment.map((link) => ({
			equipment_id: link.id,
			exercise_id: exercise.id,
			role: link.role
		}))
	);

const exerciseRow = (
	exercise: SourceExercise,
	catalogTargetId: string,
	goalIdBySlug: ReadonlyMap<string, string>
): Row => ({
	axial: exercise.constraints.axial,
	catalog_target_id: catalogTargetId,
	core_plane: exercise.corePlane ?? null,
	dose: exercise.dose,
	free_weight: exercise.constraints.freeWeight,
	goal_id: exercise.goal === undefined ? null : idOf(goalIdBySlug, exercise.goal, NO_GOAL),
	hip_plane: exercise.hipPlane ?? null,
	id: exercise.id,
	kg_max: exercise.constraints.kgMax ?? null,
	lumbar_ext: exercise.constraints.lumbarExt,
	lumbar_flex: exercise.constraints.lumbarFlex,
	met: exercise.met ?? null,
	modality: exercise.modality,
	name: exercise.name,
	note: exercise.note ?? null,
	seconds: exercise.seconds ?? null,
	slug: exercise.slug
});

const exerciseSourceRows = (catalog: SourceCatalog): readonly Row[] => {
	const byId = new Map(catalog.references.map((reference) => [reference.id, reference]));
	return sourceRecords(catalog).map(({ exercise }) => {
		const reference = byId.get(exercise.reference);
		if (reference === undefined) throw new TypeError(NO_REFERENCE + exercise.slug);
		return {
			exercise_id: exercise.id,
			id: reference.id,
			note: reference.note ?? null,
			title: reference.title,
			url: reference.url ?? null
		};
	});
};

const exerciseTargetRows = (catalog: SourceCatalog): readonly Row[] =>
	sourceRecords(catalog).flatMap(({ exercise }) =>
		exercise.targets.map((link) => ({
			exercise_id: exercise.id,
			role: link.role,
			target_id: link.id
		}))
	);

const goalRows = (catalog: SourceCatalog): readonly Row[] =>
	uniqueSlugs([
		...catalog.programs.flatMap((program) => [
			...program.goals.primary,
			...program.goals.secondary
		]),
		...sourceRecords(catalog).flatMap(({ exercise }) => exercise.goal ?? [])
	]).map((slug) => {
		const name = GOAL_NAMES[slug];
		if (name === undefined) throw new TypeError(NO_GOAL + slug);
		return { id: derivedId([GOAL_MARK, slug]), name, slug };
	});

const idsBySlug = (rows: readonly Row[]): ReadonlyMap<string, string> =>
	new Map(rows.map((row) => [String(row.slug), String(row.id)]));

const muscleGroupRows = (catalog: SourceCatalog): readonly Row[] => {
	const file = catalog.files.find((item) => item.slug === MUSCLE_GROUP_FILE);
	if (file === undefined) throw new TypeError(NO_FILE + MUSCLE_GROUP_FILE);
	return file.groups.map((group, at) => ({
		id: group.id,
		name: group.name,
		ord: at + FIRST_ORD,
		slug: group.slug
	}));
};

const newTargetRow = (placement: SourcePlacement, context: NamingContext, kind: string): Row => {
	const { catalogTarget, group } = placement;
	const groupId = context.groupIdBySlug.get(group.slug);
	if (groupId === undefined) throw new TypeError(NO_GROUP + group.slug);
	return {
		id: catalogTarget.id,
		kind,
		latin: null,
		muscle_group_id: groupId,
		name: capitalized(catalogTarget.name),
		slug: catalogTarget.slug,
		target_group_id: null
	};
};

const targetGroupRows = (catalog: SourceCatalog): readonly Row[] =>
	uniqueSlugs(catalog.targets.flatMap((target) => target.targetGroup ?? [])).map((slug) => ({
		id: derivedId([TARGET_GROUP_MARK, slug]),
		slug
	}));

const targetIdOf = (placement: SourcePlacement, context: NamingContext, targets: Row[]): string => {
	const slug = placement.catalogTarget.slug;
	const entry = CATALOG_TARGETS[slug];
	if (entry === undefined) throw new TypeError(NO_KIND + slug);
	if (entry.alias === undefined) {
		targets.push(newTargetRow(placement, context, entry.kind));
		return placement.catalogTarget.id;
	}
	const twin = context.dictionaryBySlug.get(entry.alias);
	if (twin === undefined) throw new TypeError(NO_ALIAS + entry.alias);
	return String(twin.id);
};

const uniqueSlugs = (slugs: readonly string[]): readonly string[] => [...new Set(slugs)];
