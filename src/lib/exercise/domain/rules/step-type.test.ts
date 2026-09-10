import { describe, expect, it } from 'vitest';

import { isWorkingType, stepTypeOf } from './step-type.ts';

describe('stepTypeOf', () => {
	it.each([
		['Сменить сторону', 'switch'],
		['Удержать положение 30 секунд', 'hold'],
		['Повторить 10 раз', 'repeat'],
		['Сменить направление', 'move'],
		['Настроить упор', 'setup'],
		['Закрепить манжету', 'setup'],
		['Принять исходное положение', 'initial'],
		['Встать в стойку', 'initial'],
		['Вернуть таз назад', 'exit'],
		['Опустить гантели на пол', 'exit'],
		['Подать таз вперёд', 'move'],
		['Опустить подбородок к груди', 'move']
	])('%s → %s', (title, type) => {
		expect(stepTypeOf(title)).toBe(type);
	});

	it('считает рабочими шаги движения, удержания и повтора', () => {
		expect(isWorkingType('move')).toBe(true);
		expect(isWorkingType('setup')).toBe(false);
	});
});
