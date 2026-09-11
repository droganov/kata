import { describe, expect, it } from 'vitest';

import { counterClassesOf, frameClassesOf } from './coverage.ts';

const namesOf = (classes: readonly { readonly name: string }[]): readonly string[] =>
	classes.map((coverage) => coverage.name);

describe('coverage', () => {
	it('добавляет класс снаряда, направления и стороны', () => {
		expect(namesOf(frameClassesOf('move', true, true))).toEqual([
			'голова',
			'корпус',
			'таз',
			'руки',
			'ноги',
			'опора',
			'снаряд',
			'направление',
			'конечная точка',
			'сторона'
		]);
	});

	it('не требует сторону в шаге настройки и снаряд при теле', () => {
		expect(namesOf(frameClassesOf('setup', false, true))).toEqual([
			'голова',
			'корпус',
			'таз',
			'руки',
			'ноги',
			'опора'
		]);
	});

	it('требует длительность в удержании и число повторов в повторе', () => {
		expect(namesOf(frameClassesOf('hold', false, false))).toContain('длительность');
		expect(namesOf(frameClassesOf('repeat', false, false))).toContain('число повторов');
		expect(namesOf(frameClassesOf('exit', false, false))).not.toContain('длительность');
	});

	it('добавляет симптом при нагрузке поясницы', () => {
		expect(namesOf(counterClassesOf('move', true))).toEqual([
			'компенсация',
			'рывок/темп',
			'симптом'
		]);
		expect(namesOf(counterClassesOf('switch', false))).toEqual([]);
	});
});
