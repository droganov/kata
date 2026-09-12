import type { CatalogIds } from './catalog-ids.ts';
import type { SourceCatalog, SourceFile, SourceSection } from './source-catalog.ts';
import type { Row } from './table.ts';

import { idOf } from './catalog-ids.ts';
import { sourcePlacements } from './source-catalog.ts';

const FIRST_ORD = 1;
const NO_CONTOUR_TARGET = 'мишень контура не найдена: ';

export interface PrototypeTables {
	readonly prototype_bank: readonly Row[];
	readonly prototype_contour: readonly Row[];
	readonly prototype_contour_exercise: readonly Row[];
	readonly prototype_pairing: readonly Row[];
	readonly prototype_program: readonly Row[];
	readonly prototype_section: readonly Row[];
	readonly prototype_slot: readonly Row[];
	readonly prototype_slot_exercise: readonly Row[];
	readonly prototype_target: readonly Row[];
	readonly prototype_zone: readonly Row[];
}

export const prototypeTablesOf = (catalog: SourceCatalog, ids: CatalogIds): PrototypeTables => {
	const sections = catalog.programs.flatMap((program) => program.sections);
	return {
		prototype_bank: catalog.files.map((file) => ({
			id: file.id,
			slug: file.slug,
			title: file.title
		})),
		prototype_contour: catalog.files.flatMap((file) => contourRows(file, ids)),
		prototype_contour_exercise: sourcePlacements(catalog).flatMap(({ catalogTarget }) =>
			catalogTarget.exercises.map((exercise, at) => ({
				contour_id: catalogTarget.id,
				exercise_id: exercise.id,
				ord: at + FIRST_ORD,
				procedure_id: exercise.procedureId
			}))
		),
		prototype_pairing: catalog.programs.flatMap((program) =>
			program.pairings.flatMap((pairing, pairingAt) =>
				pairing.exercises.map((exercise, at) => ({
					exercise_id: exercise,
					ord: at + FIRST_ORD,
					pairing_ord: pairingAt + FIRST_ORD,
					slot_id: pairing.slot
				}))
			)
		),
		prototype_program: catalog.programs.map((program) => ({
			program_id: program.id,
			rotation_weeks: program.rotationWeeks
		})),
		prototype_section: sections.map((section) => ({
			bank_id: section.bank,
			block_id: section.id,
			title: section.title
		})),
		prototype_slot: sections.flatMap((section) => slotRows(section)),
		prototype_slot_exercise: sections.flatMap((section) => slotExerciseRows(section)),
		prototype_target: catalog.targets.map((target) => ({
			kind: target.kind,
			target_id: target.id,
			zone: target.group
		})),
		prototype_zone: catalog.files.flatMap((file) =>
			file.groups.map((group, at) => ({
				bank_id: file.id,
				id: group.id,
				muscle_group_id: ids.groupIdBySlug.get(group.slug) ?? null,
				ord: at + FIRST_ORD,
				slug: group.slug,
				title: group.name
			}))
		)
	};
};

const contourRows = (file: SourceFile, ids: CatalogIds): readonly Row[] =>
	file.groups.flatMap((group) =>
		group.targets.map((contour, at) => ({
			id: contour.id,
			ord: at + FIRST_ORD,
			pick: contour.pick ?? null,
			slug: contour.slug,
			target_id: idOf(ids.targetIdByContourSlug, contour.slug, NO_CONTOUR_TARGET),
			title: contour.name,
			zone_id: group.id
		}))
	);

const slotExerciseRows = (section: SourceSection): readonly Row[] =>
	section.slots.flatMap((slot) =>
		slot.exercises.map((exercise, at) => ({
			exercise_id: exercise,
			ord: at + FIRST_ORD,
			slot_id: slot.id
		}))
	);

const slotRows = (section: SourceSection): readonly Row[] =>
	section.slots.map((slot, at) => ({
		allow_repeat: slot.allowRepeat ?? null,
		block_id: section.id,
		id: slot.id,
		kind: slot.kind,
		label: slot.label,
		ord: at + FIRST_ORD,
		pick: slot.pick ?? null,
		rule: slot.rule ?? null,
		sec_each: slot.secEach ?? null
	}));
