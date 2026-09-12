import { describe, expect, it } from 'vitest';

import type { PlanConstraints, PlanExercise } from '../plan-exercise.ts';
import type { ProgramPlan } from '../program-plan.ts';
import type { Contraindications, CorePlane, Program, SectionMode } from '../program.ts';
import type { Session } from '../session.ts';

import { PROGRAM_BASE } from '../../../../test/program-base.ts';
import {
	isometricProgression,
	isometricThreePlanes,
	spineSafeLoad,
	stretchWithoutLumbarFlexion
} from './lumbar-rules.ts';

interface PlanSeed {
	readonly constraints?: Partial<PlanConstraints>;
	readonly contraindications?: Contraindications;
	readonly isometric?: string;
	readonly mode?: SectionMode;
	readonly name?: string;
	readonly planes?: readonly (CorePlane | undefined)[];
}

const FREE: PlanConstraints = {
	axial: false,
	free_weight: false,
	lumbar_ext: false,
	lumbar_flex: false
};
const ALL_FORBIDDEN: Contraindications = {
	axial_load: true,
	free_weight_kg_max: 10,
	loaded_lumbar_extension: true,
	loaded_lumbar_flexion: true
};
const NOTHING_FORBIDDEN: Contraindications = {
	axial_load: false,
	free_weight_kg_max: 10,
	loaded_lumbar_extension: false,
	loaded_lumbar_flexion: false
};
const HOLD_PROGRESSION = 'удержание 10с × 5 → 15с × 5';

const exerciseOf = (
	id: string,
	mode: SectionMode,
	over: Partial<PlanExercise> = {}
): PlanExercise => ({
	constraints: FREE,
	dose: '3×12',
	hasProcedure: true,
	id,
	mode,
	name: id,
	slug: id,
	targets: [],
	...over
});

const sessionOf = (planes: readonly (CorePlane | undefined)[]): Session => ({
	index: 1,
	minutes: 60,
	program: 'program',
	sections: [
		{
			mode: 'isometric',
			section: 'calisthenics',
			slots: [
				{
					exercises: planes.map((plane, at) =>
						exerciseOf(`hold${String(at)}`, 'isometric', {
							...(plane !== undefined && { plane })
						})
					),
					kind: 'pool',
					label: 'Статика',
					slot: 'pool'
				}
			],
			slug: 'calisthenics',
			title: 'Калистеника'
		}
	],
	slug: 'w1d1',
	title: 'Занятие 1'
});

const planOf = (seed: PlanSeed = {}): ProgramPlan => {
	const mode = seed.mode ?? 'loaded';
	const exercise = exerciseOf('a', mode, {
		constraints: { ...FREE, ...seed.constraints },
		...(seed.name !== undefined && { name: seed.name })
	});
	const program: Program = {
		...PROGRAM_BASE,
		contraindications: seed.contraindications ?? ALL_FORBIDDEN,
		progression: {
			base: 'b',
			isometric: seed.isometric ?? HOLD_PROGRESSION,
			pool: 'p',
			stop_rule: 's'
		},
		sections: [
			{
				bank: 'bank',
				id: mode,
				mode,
				slots: [{ exercises: ['a'], id: 'base', kind: 'base', label: 'База' }],
				slug: mode,
				title: mode
			}
		],
		title: 'Программа'
	};
	return {
		exercises: new Map([[exercise.id, exercise]]),
		hipMobilityExerciseIds: new Set(),
		program,
		sessions: seed.planes === undefined ? [] : [sessionOf(seed.planes)],
		volume: { frequency: new Map(), volume: new Map() }
	};
};

describe('isometricThreePlanes', () => {
	it('молчит, когда занятие закрывает три плоскости', () => {
		const plan = planOf({ planes: ['anterior', 'lateral', 'posterior'] });
		expect(isometricThreePlanes(plan)).toEqual([]);
	});

	it('говорит и перечисляет занятия без трёх плоскостей', () => {
		const findings = isometricThreePlanes(planOf({ planes: ['lateral', undefined] }));
		expect(findings.map((finding) => finding.rule)).toEqual(['E3 ISOMETRIC_THREE_PLANES']);
		expect(findings[0]?.message).toBe('w1d1: lateral');
	});
});

describe('spineSafeLoad', () => {
	it('молчит, когда нагрузка безопасна', () => {
		expect(spineSafeLoad(planOf())).toEqual([]);
	});

	it('ловит осевую нагрузку, сгибание и переразгибание поясницы', () => {
		expect(spineSafeLoad(planOf({ constraints: { axial: true } }))).toHaveLength(1);
		expect(spineSafeLoad(planOf({ constraints: { lumbar_flex: true } }))).toHaveLength(1);
		expect(spineSafeLoad(planOf({ constraints: { lumbar_ext: true } }))).toHaveLength(1);
	});

	it('молчит, когда противопоказаний нет', () => {
		const plan = planOf({
			constraints: { axial: true, lumbar_ext: true, lumbar_flex: true },
			contraindications: NOTHING_FORBIDDEN
		});
		expect(spineSafeLoad(plan)).toEqual([]);
	});
});

describe('isometricProgression', () => {
	it('молчит, когда прописана ступень удержания', () => {
		expect(isometricProgression(planOf())).toEqual([]);
	});

	it('говорит, когда ступени нет', () => {
		expect(isometricProgression(planOf({ isometric: 'как получится' }))).toHaveLength(1);
	});
});

describe('stretchWithoutLumbarFlexion', () => {
	it('молчит, когда в растяжке нет наклонов стоя', () => {
		const plan = planOf({ mode: 'static_stretch', name: 'Голубь на скамье' });
		expect(stretchWithoutLumbarFlexion(plan)).toEqual([]);
	});

	it('ловит наклон стоя', () => {
		const plan = planOf({ mode: 'static_stretch', name: 'Наклон вперёд стоя' });
		expect(stretchWithoutLumbarFlexion(plan)).toHaveLength(1);
	});
});
