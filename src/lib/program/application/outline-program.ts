import type { BankView } from '../../catalog/application/catalog-views.ts';
import type { ContourLocator, SectionOutline } from '../domain/section-outline.ts';
import type { ProgramRepositories } from './program-repositories.ts';

import { sectionOutlinesOf } from '../domain/section-outline.ts';
import { programOf } from './program-repositories.ts';

export interface ProgramOutlineView {
	readonly id: string;
	readonly sections: readonly SectionOutline[];
	readonly title: string;
}

const contourLocatorsOf = (banks: readonly BankView[]): readonly ContourLocator[] =>
	banks.flatMap((bank) =>
		bank.zones.flatMap((zone) =>
			zone.contours.map((contour) => ({
				contourTitle: contour.title,
				exerciseIds: contour.exerciseIds,
				zoneId: zone.id,
				zoneTitle: zone.title
			}))
		)
	);

export function outlineProgram(
	repositories: ProgramRepositories,
	programId: string
): ProgramOutlineView {
	const program = programOf(repositories, programId);
	return {
		id: program.id,
		sections: sectionOutlinesOf(program, contourLocatorsOf(repositories.catalog.readBanks())),
		title: program.title
	};
}

export { type SlotOutline } from '../domain/section-outline.ts';
