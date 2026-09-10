import { describe, expect, it } from 'vitest';

import { isCarriedKind, STEP_KIND, stepKindOf } from './step-kind.ts';

describe('stepKindOf', () => {
	it('различает смену стороны, удержание и повтор по началу заголовка', () => {
		expect(stepKindOf('Сменить сторону')).toBe(STEP_KIND.switch);
		expect(stepKindOf('Удерживать 20 секунд')).toBe(STEP_KIND.hold);
		expect(stepKindOf('Удержать положение')).toBe(STEP_KIND.hold);
		expect(stepKindOf('Повторить подход')).toBe(STEP_KIND.repeat);
	});

	it('считает остальные шаги прочими', () => {
		expect(stepKindOf('Лечь на спину')).toBe(STEP_KIND.other);
		expect(stepKindOf('Сменить направление')).toBe(STEP_KIND.other);
	});
});

describe('isCarriedKind', () => {
	it('переносит правила предыдущего кадра только для удержания и повтора', () => {
		expect(isCarriedKind(STEP_KIND.hold)).toBe(true);
		expect(isCarriedKind(STEP_KIND.repeat)).toBe(true);
		expect(isCarriedKind(STEP_KIND.switch)).toBe(false);
		expect(isCarriedKind(STEP_KIND.other)).toBe(false);
	});
});
