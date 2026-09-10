import type { Finding } from './finding.ts';
import type { Program } from './program.ts';

import { PROGRAM_GOAL, programSubject, ruleCheck, slotSubject } from './finding.ts';
import { pairingsOf, pickOf, sectionSlotsOf, SLOT_KIND } from './program.ts';

const RULE_SLOT_REFERENCES = 'I1 SLOT_REFERENCES';
const RULE_BASE_FILLED = 'I2 BASE_FILLED';
const RULE_POOL_DEPTH = 'I3 POOL_DEPTH';
const RULE_PAIRING_SLOT = 'I4 PAIRING_SLOT';
const LIST_SEPARATOR = ', ';

export function programInvariants(
	program: Program,
	knownExerciseIds: ReadonlySet<string>
): readonly Finding[] {
	return [
		...slotInvariants(program, knownExerciseIds),
		...pairingInvariants(program, knownExerciseIds)
	];
}

function pairingInvariants(
	program: Program,
	knownExerciseIds: ReadonlySet<string>
): readonly Finding[] {
	const slotIds = new Set(sectionSlotsOf(program).map(({ slot }) => slot.id));
	return pairingsOf(program).flatMap((pairing) => {
		const lost = pairing.exercises.filter((id) => !knownExerciseIds.has(id));
		return ruleCheck(
			slotIds.has(pairing.slot) && lost.length === 0,
			PROGRAM_GOAL.structure,
			RULE_PAIRING_SLOT,
			programSubject(program),
			`пара для слота ${pairing.slot}: висячие ссылки ${lost.join(LIST_SEPARATOR)}`
		);
	});
}

function slotInvariants(
	program: Program,
	knownExerciseIds: ReadonlySet<string>
): readonly Finding[] {
	return sectionSlotsOf(program).flatMap(({ section, slot }) => {
		const subject = slotSubject(program, section, slot);
		const lost = slot.exercises.filter((id) => !knownExerciseIds.has(id));
		const isPool = slot.kind === SLOT_KIND.pool;
		return [
			...ruleCheck(
				lost.length === 0,
				PROGRAM_GOAL.structure,
				RULE_SLOT_REFERENCES,
				subject,
				`висячие ссылки на упражнения: ${lost.join(LIST_SEPARATOR)}`
			),
			...ruleCheck(
				isPool || slot.exercises.length > 0,
				PROGRAM_GOAL.structure,
				RULE_BASE_FILLED,
				subject,
				`база пуста`
			),
			...ruleCheck(
				!isPool || pickOf(slot) <= slot.exercises.length,
				PROGRAM_GOAL.structure,
				RULE_POOL_DEPTH,
				subject,
				`pick ${String(pickOf(slot))} больше числа кандидатов ${String(slot.exercises.length)}`
			)
		];
	});
}
