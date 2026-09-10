import { describe, expect, it } from 'vitest';

import { createProgram } from './program.ts';

const useCases = createProgram();
const [user] = useCases.listUsers();
const [program] = useCases.listPrograms(user?.id ?? '');
const programId = program?.id ?? '';

describe('createProgram на боевых данных', () => {
	it('читает пользователя и его программу', () => {
		expect(user?.name).toBe('Sergei');
		expect(program?.title).toBe('Программа: БАЗА + ПУЛ');
		expect(program?.sections.map((section) => section.slug)).toEqual([
			'warmup_cardio',
			'warmup',
			'strength',
			'calisthenics',
			'stretch'
		]);
		expect(useCases.findProgram(programId)?.sessionsPerWeek).toBe(3);
		expect(useCases.findProgram('нет такой')).toBeUndefined();
	});

	it('строит план секций: разминка по зонам, силовой без зон', () => {
		const outline = useCases.outlineProgram(programId);
		const warmup = outline.sections.find((section) => section.slug === 'warmup');
		expect(warmup?.groups.map((group) => [group.zone?.title, group.slots.length])).toEqual([
			['Шея', 1],
			['Плечевой пояс', 5],
			['Грудь, спина', 1],
			['Поясница', 1],
			['Бёдра', 1],
			['Колени', 1],
			['Стопы', 1]
		]);
		const strength = outline.sections.find((section) => section.slug === 'strength');
		expect(strength?.baseExerciseIds).toHaveLength(2);
		expect(strength?.groups.every((group) => group.zone === undefined)).toBe(true);
	});

	it('собирает шесть занятий ротации', () => {
		const sessions = useCases.buildSessions(programId);
		expect(sessions.map((session) => session.slug)).toEqual([
			'w1d1',
			'w1d2',
			'w1d3',
			'w2d1',
			'w2d2',
			'w2d3'
		]);
		expect(sessions.every((session) => session.minutes >= 60 && session.minutes <= 70)).toBe(
			true
		);
		const strength = sessions[0]?.sections.find((section) => section.slug === 'strength');
		expect(strength?.slots.map((slot) => slot.exercises.map((one) => one.slug))).toEqual([
			['glute_bridge_m', 'hip_abd_cable'],
			['leg_press'],
			['leg_curl_seated'],
			['chest_press_m'],
			['lat_pd_wide'],
			['rear_delt_m']
		]);
	});

	it('прогоняет правила и находит известные провалы', () => {
		const report = useCases.validateProgram(programId);
		expect(report.failureCount).toBe(report.findings.length);
		const rules = report.findings.map((finding) => finding.rule);
		expect(rules.toSorted((first, second) => first.localeCompare(second))).toEqual([
			'E1 GLUTES_VOLUME',
			'E1 GROUP_VOLUME_CORRIDOR'
		]);
	});
});
