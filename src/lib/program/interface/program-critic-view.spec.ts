import { describe, expect, it } from 'vitest';

import type { ProgramReport } from '../application/validate-program.ts';

import { criticExitCode, criticLines } from './program-critic-view.ts';

const REPORT: ProgramReport = {
	failureCount: 1,
	findings: [
		{
			goal: 'glutes',
			message: '23.3 подходов/нед',
			rule: 'E1 GLUTES_VOLUME',
			subject: 'Программа'
		}
	],
	sessions: [
		{
			index: 1,
			minutes: 68,
			sections: [
				{
					mode: 'loaded',
					slots: [
						{
							exercises: [
								{ dose: '3×12–15', id: 'a', name: 'Мостик', slug: 'glute_bridge_m' }
							],
							kind: 'base',
							label: 'База'
						}
					],
					slug: 'strength',
					title: 'Силовой'
				}
			],
			slug: 'w1d1',
			title: 'Занятие 1'
		}
	],
	title: 'Программа'
};

const CLEAN: ProgramReport = { failureCount: 0, findings: [], sessions: [], title: 'Пустая' };

describe('criticLines', () => {
	it('печатает занятия по разделам и слотам, потом провалы и итог', () => {
		expect(criticLines([REPORT])).toEqual([
			'ПРОГРАММА Программа',
			'ЗАНЯТИЕ 1 (w1d1, 68 мин)',
			'  Силовой',
			'    База: glute_bridge_m',
			'  FAIL  E1 GLUTES_VOLUME  glutes  Программа  23.3 подходов/нед',
			'ПРОВАЛЕНО: 1'
		]);
	});

	it('складывает провалы всех программ', () => {
		expect(criticLines([REPORT, CLEAN]).at(-1)).toBe('ПРОВАЛЕНО: 1');
	});
});

describe('criticExitCode', () => {
	it('падает при провалах и молчит без них', () => {
		expect(criticExitCode([REPORT])).toBe(1);
		expect(criticExitCode([CLEAN])).toBe(0);
	});
});
