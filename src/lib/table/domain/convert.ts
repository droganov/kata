import type { SourceProgramBlocks } from './program-blocks.ts';
import type { SourceCatalog, SourceExercise, SourcePlacement } from './source-catalog.ts';
import type { Row, Tables } from './table.ts';

import { procedureTablesOf } from './procedure.ts';
import { PROGRAM_BLOCKS } from './program-blocks.ts';
import { programTablesOf } from './program.ts';
import { sourcePlacements, sourceRecords } from './source-catalog.ts';
import {
	CATALOG_TARGETS,
	DICTIONARY_TARGET_KIND,
	JOINT_MUSCLE_GROUP,
	MUSCLE_GROUP_FILE
} from './target-map.ts';

const FIRST_ORD = 1;
const NO_ALIAS = 'мишень словаря не найдена: ';
const NO_FILE = 'в источнике нет файла ';
const NO_GROUP = 'группа мышц не найдена: ';
const NO_KIND = 'вид мишени не объявлен: ';
const NO_REFERENCE = 'источник упражнения не найден: ';

interface Catalogued {
	readonly exercises: readonly Row[];
	readonly targets: readonly Row[];
}

interface NamingContext {
	readonly dictionaryBySlug: ReadonlyMap<string, Row>;
	readonly groupIdBySlug: ReadonlyMap<string, string>;
}

export const tablesOf = (
	catalog: SourceCatalog,
	declared: Readonly<Record<string, SourceProgramBlocks>> = PROGRAM_BLOCKS
): Tables => {
	const groups = muscleGroupRows(catalog);
	const groupIdBySlug = new Map(groups.map((group) => [String(group.slug), String(group.id)]));
	const dictionary = dictionaryTargetRows(catalog, groupIdBySlug);
	const context = {
		dictionaryBySlug: new Map(dictionary.map((row) => [String(row.slug), row])),
		groupIdBySlug
	};
	const catalogued = cataloguedRows(catalog, context);
	const procedure = procedureTablesOf(catalog);
	const targets = [...dictionary, ...catalogued.targets];
	const program = programTablesOf(catalog.programs, declared, {
		groupIdBySlug,
		targetIdBySlug: new Map(targets.map((row) => [String(row.slug), String(row.id)]))
	});
	return {
		block: program.block,
		block_draw: program.block_draw,
		block_pin_group: program.block_pin_group,
		block_pin_target: program.block_pin_target,
		equipment: equipmentRows(catalog),
		exercise: catalogued.exercises,
		exercise_equipment: exerciseEquipmentRows(catalog),
		exercise_source: exerciseSourceRows(catalog),
		exercise_target: exerciseTargetRows(catalog),
		muscle_group: groups,
		oracle: procedure.oracle,
		oracle_line: procedure.oracle_line,
		program: program.program,
		step: procedure.step,
		step_target: procedure.step_target,
		target: targets,
		verdict: procedure.verdict
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
			exercises.push(exerciseRow(exercise, id));
	}
	return { exercises, targets };
};

const dictionaryTargetRows = (
	catalog: SourceCatalog,
	groupIdBySlug: ReadonlyMap<string, string>
): readonly Row[] =>
	catalog.targets.flatMap((target) => {
		const groupId = groupIdBySlug.get(JOINT_MUSCLE_GROUP[target.slug] ?? target.group);
		return groupId === undefined
			? []
			: [
					{
						id: target.id,
						kind: DICTIONARY_TARGET_KIND.get(target.slug) ?? target.kind,
						latin: target.latin,
						muscle_group_id: groupId,
						name: target.name,
						slug: target.slug
					}
				];
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

const exerciseRow = (exercise: SourceExercise, catalogTargetId: string): Row => ({
	axial: exercise.constraints.axial,
	catalog_target_id: catalogTargetId,
	dose: exercise.dose,
	free_weight: exercise.constraints.freeWeight,
	id: exercise.id,
	kg_max: exercise.constraints.kgMax ?? null,
	lumbar_ext: exercise.constraints.lumbarExt,
	lumbar_flex: exercise.constraints.lumbarFlex,
	modality: exercise.modality,
	name: exercise.name,
	note: exercise.note ?? null,
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
		slug: catalogTarget.slug
	};
};

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
