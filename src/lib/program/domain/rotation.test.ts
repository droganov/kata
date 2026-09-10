import { describe, expect, it } from 'vitest';

import type { PlanExercise, PlanExercises } from './plan-exercise.ts';
import type { CorePlane, HipPlane, Program, Section, Slot } from './program.ts';
import type { Session, SessionSlot } from './session.ts';

import { HIP_PLANE_RULE, LATERAL_RULE, sessionsOf } from './rotation.ts';

interface ExerciseSeed {
	readonly hipPlane?: HipPlane;
	readonly id: string;
	readonly plane?: CorePlane;
}

const TIMING = {
	hold_rest_sec: 10,
	rest_sec_accessory: 60,
	rest_sec_strength: 70,
	transition_sec: 45,
	work_sec_per_set: 45
};

const exercisesOf = (seeds: readonly ExerciseSeed[]): PlanExercises =>
	new Map(
		seeds.map((seed) => [
			seed.id,
			{
				constraints: {
					axial: false,
					free_weight: false,
					lumbar_ext: false,
					lumbar_flex: false
				},
				dose: '3×12–15',
				hasProcedure: true,
				...(seed.hipPlane !== undefined && { hipPlane: seed.hipPlane }),
				id: seed.id,
				mode: 'loaded',
				name: seed.id,
				...(seed.plane !== undefined && { plane: seed.plane }),
				slug: seed.id,
				targets: []
			} satisfies PlanExercise
		])
	);

const sectionOf = (slots: readonly Slot[]): Section => ({
	bank: 'bank',
	id: 'section',
	mode: 'loaded',
	slots,
	slug: 'strength',
	title: 'Силовой'
});

const programOf = (sections: readonly Section[], over: Partial<Program> = {}): Program =>
	({
		contraindications: {
			axial_load: true,
			free_weight_kg_max: 10,
			loaded_lumbar_extension: true,
			loaded_lumbar_flexion: true
		},
		goals: { primary: [], secondary: [] },
		id: 'program',
		progression: { base: 'b', isometric: 'i', pool: 'p', stop_rule: 's' },
		schedule: { rotation_weeks: 1, session_budget_min: 70, sessions_per_week: 3 },
		sections,
		timing: TIMING,
		title: 'Программа',
		user: 'user',
		...over
	}) satisfies Program;

const slotSlugsOf = (slot: SessionSlot): readonly string[] =>
	slot.exercises.map((exercise) => exercise.slug);

const sessionSlugsOf = (session: Session): readonly string[] =>
	session.sections.flatMap((section) => section.slots.flatMap((slot) => slotSlugsOf(slot)));

const slugsOf = (program: Program, exercises: PlanExercises): readonly (readonly string[])[] =>
	sessionsOf(program, exercises).map((session) => sessionSlugsOf(session));

describe('sessionsOf', () => {
	it('нумерует занятия по неделям и дням', () => {
		const program = programOf(
			[sectionOf([{ exercises: ['a'], id: 'base', kind: 'base', label: 'База' }])],
			{
				schedule: { rotation_weeks: 2, session_budget_min: 70, sessions_per_week: 2 }
			}
		);
		const sessions = sessionsOf(program, exercisesOf([{ id: 'a' }]));
		expect(sessions.map((session) => session.slug)).toEqual(['w1d1', 'w1d2', 'w2d1', 'w2d2']);
		expect(sessions.map((session) => session.title)).toEqual([
			'Занятие 1',
			'Занятие 2',
			'Занятие 3',
			'Занятие 4'
		]);
		expect(sessions[0]?.program).toBe('program');
	});

	it('даёт базовому слоту все его упражнения в каждом занятии', () => {
		const program = programOf([
			sectionOf([{ exercises: ['a', 'b'], id: 'base', kind: 'base', label: 'База' }])
		]);
		expect(slugsOf(program, exercisesOf([{ id: 'a' }, { id: 'b' }]))).toEqual([
			['a', 'b'],
			['a', 'b'],
			['a', 'b']
		]);
	});

	it('пропускает неизвестные ссылки слота', () => {
		const program = programOf([
			sectionOf([{ exercises: ['a', 'lost'], id: 'base', kind: 'base', label: 'База' }])
		]);
		expect(slugsOf(program, exercisesOf([{ id: 'a' }]))[0]).toEqual(['a']);
	});

	it('крутит пул по кругу', () => {
		const program = programOf([
			sectionOf([
				{
					allow_repeat: false,
					exercises: ['a', 'b'],
					id: 'pool',
					kind: 'pool',
					label: 'Пул',
					pick: 1
				}
			])
		]);
		expect(slugsOf(program, exercisesOf([{ id: 'a' }, { id: 'b' }]))).toEqual([
			['a'],
			['b'],
			['a']
		]);
	});

	it('убирает повтор в занятии, когда повторы запрещены, и оставляет при разрешении', () => {
		const strict = programOf([
			sectionOf([
				{
					allow_repeat: false,
					exercises: ['a', 'b'],
					id: 'pool',
					kind: 'pool',
					label: 'Пул',
					pick: 3
				}
			])
		]);
		const loose = programOf([
			sectionOf([
				{
					allow_repeat: true,
					exercises: ['a', 'b'],
					id: 'pool',
					kind: 'pool',
					label: 'Пул',
					pick: 3
				}
			])
		]);
		const exercises = exercisesOf([{ id: 'a' }, { id: 'b' }]);
		expect(slugsOf(strict, exercises)[0]).toEqual(['a', 'b']);
		expect(slugsOf(loose, exercises)[0]).toEqual(['a', 'b', 'a']);
	});

	it('оставляет слот пустым, когда кандидатов нет', () => {
		const program = programOf([
			sectionOf([
				{
					allow_repeat: false,
					exercises: ['lost'],
					id: 'pool',
					kind: 'pool',
					label: 'Пул',
					pick: 1
				}
			])
		]);
		expect(slugsOf(program, exercisesOf([{ id: 'a' }]))[0]).toEqual([]);
	});

	it('идёт по направлениям сустава, когда правило требует покрыть их все', () => {
		const program = programOf(
			[
				sectionOf([
					{
						allow_repeat: false,
						exercises: ['flex1', 'flex2', 'ext1'],
						id: 'pool',
						kind: 'pool',
						label: 'Бедро',
						pick: 1,
						rule: HIP_PLANE_RULE
					}
				])
			],
			{ hip_planes: ['flexion', 'extension'] }
		);
		const exercises = exercisesOf([
			{ hipPlane: 'flexion', id: 'flex1' },
			{ hipPlane: 'flexion', id: 'flex2' },
			{ hipPlane: 'extension', id: 'ext1' }
		]);
		expect(slugsOf(program, exercises)).toEqual([['flex1'], ['ext1'], ['flex2']]);
	});

	it('молчит о направлении без кандидатов и крутит пул без списка направлений', () => {
		const slot: Slot = {
			allow_repeat: false,
			exercises: ['flex1'],
			id: 'pool',
			kind: 'pool',
			label: 'Бедро',
			pick: 1,
			rule: HIP_PLANE_RULE
		};
		const exercises = exercisesOf([{ hipPlane: 'flexion', id: 'flex1' }]);
		const withoutAbduction = programOf([sectionOf([slot])], {
			hip_planes: ['flexion', 'abduction'],
			schedule: { rotation_weeks: 1, session_budget_min: 70, sessions_per_week: 2 }
		});
		expect(slugsOf(withoutAbduction, exercises)).toEqual([['flex1'], []]);
		const withoutPlanes = programOf([sectionOf([slot])], {
			schedule: { rotation_weeks: 1, session_budget_min: 70, sessions_per_week: 1 }
		});
		expect(slugsOf(withoutPlanes, exercises)).toEqual([['flex1']]);
	});

	it('ставит боковую плоскость первой, когда правило её требует', () => {
		const program = programOf([
			sectionOf([
				{
					allow_repeat: false,
					exercises: ['side', 'front', 'rot'],
					id: 'pool',
					kind: 'pool',
					label: 'Статика',
					pick: 2,
					rule: LATERAL_RULE
				}
			])
		]);
		const exercises = exercisesOf([
			{ id: 'side', plane: 'lateral' },
			{ id: 'front', plane: 'anterior' },
			{ id: 'rot', plane: 'anti_rotation' }
		]);
		expect(slugsOf(program, exercises)).toEqual([
			['side', 'front'],
			['side', 'rot'],
			['side', 'front']
		]);
	});

	it('сужает пул растяжки до пар нагруженных сегодня слотов', () => {
		const program = programOf(
			[
				sectionOf([
					{
						allow_repeat: false,
						exercises: ['press', 'row'],
						id: 'load',
						kind: 'pool',
						label: 'Нагрузка',
						pick: 1
					},
					{
						allow_repeat: true,
						exercises: ['st_press', 'st_row', 'st_free'],
						id: 'paired',
						kind: 'pool',
						label: 'Растяжка',
						pick: 1
					}
				])
			],
			{
				pairing: [
					{ exercises: ['st_press'], slot: 'load' },
					{ exercises: ['st_row'], slot: 'missing' }
				]
			}
		);
		const exercises = exercisesOf([
			{ id: 'press' },
			{ id: 'row' },
			{ id: 'st_press' },
			{ id: 'st_row' },
			{ id: 'st_free' }
		]);
		expect(slugsOf(program, exercises)).toEqual([
			['press', 'st_press'],
			['row', 'st_press'],
			['press', 'st_press']
		]);
	});
});
