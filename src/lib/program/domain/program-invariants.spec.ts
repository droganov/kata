import { describe, expect, it } from 'vitest';

import type { Program, Section, Slot } from './program.ts';

import { PROGRAM_BASE } from '../../../test/program-base.ts';
import { programInvariants } from './program-invariants.ts';

const KNOWN = new Set(['a', 'b']);

const sectionOf = (slots: readonly Slot[]): Section => ({
	bank: 'bank',
	id: 'section',
	mode: 'loaded',
	slots,
	slug: 'strength',
	title: 'Силовой'
});

const programOf = (slots: readonly Slot[], pairing?: Program['pairing']): Program => ({
	...PROGRAM_BASE,
	sections: [sectionOf(slots)],
	title: 'Программа',
	...(pairing !== undefined && { pairing })
});

const rulesOf = (program: Program): string[] =>
	programInvariants(program, KNOWN).map((finding) => finding.rule);

describe('programInvariants', () => {
	it('молчит на здоровой программе', () => {
		const program = programOf([
			{ exercises: ['a'], id: 'base', kind: 'base', label: 'База' },
			{
				allow_repeat: false,
				exercises: ['a', 'b'],
				id: 'pool',
				kind: 'pool',
				label: 'Пул',
				pick: 2
			}
		]);
		expect(rulesOf(program)).toEqual([]);
	});

	it('ловит висячие ссылки слота', () => {
		const program = programOf([
			{ exercises: ['a', 'lost'], id: 'base', kind: 'base', label: 'База' }
		]);
		const findings = programInvariants(program, KNOWN);
		expect(findings.map((finding) => finding.rule)).toEqual(['I1 SLOT_REFERENCES']);
		expect(findings[0]?.subject).toBe('Программа:strength/База');
		expect(findings[0]?.message).toContain('lost');
	});

	it('ловит пустую базу', () => {
		const program = programOf([{ exercises: [], id: 'base', kind: 'base', label: 'База' }]);
		expect(rulesOf(program)).toEqual(['I2 BASE_FILLED']);
	});

	it('ловит pick глубже пула', () => {
		const program = programOf([
			{
				allow_repeat: false,
				exercises: ['a'],
				id: 'pool',
				kind: 'pool',
				label: 'Пул',
				pick: 2
			}
		]);
		expect(rulesOf(program)).toEqual(['I3 POOL_DEPTH']);
	});

	it('ловит пару с неизвестным слотом или упражнением', () => {
		const slots: readonly Slot[] = [
			{ exercises: ['a'], id: 'base', kind: 'base', label: 'База' }
		];
		expect(rulesOf(programOf(slots, [{ exercises: ['a'], slot: 'base' }]))).toEqual([]);
		expect(rulesOf(programOf(slots, [{ exercises: ['a'], slot: 'lost' }]))).toEqual([
			'I4 PAIRING_SLOT'
		]);
		expect(rulesOf(programOf(slots, [{ exercises: ['lost'], slot: 'base' }]))).toEqual([
			'I4 PAIRING_SLOT'
		]);
	});
});
