import { describe, expect, it } from 'vitest';

import { cameraViewOf, isBilateralMuscle, isPosteriorMuscle } from './camera.ts';

const FRONT_LINE = 'Лопатки на одном уровне';
const SIDE_LINE = 'Поясница нейтральна';
const PLAIN_LINE = 'Снаряд подобран';

describe('cameraViewOf', () => {
	it('делит тайл, когда есть и фронтальные, и боковые признаки', () => {
		expect(cameraViewOf([FRONT_LINE, SIDE_LINE], false)).toBe(
			"left half of the tile front view, right half side view from the figure's left"
		);
		expect(cameraViewOf([FRONT_LINE, SIDE_LINE], true)).toBe(
			"left half of the tile rear view, right half side view from the figure's left"
		);
	});

	it('берёт боковой вид, когда фронтальных признаков нет', () => {
		expect(cameraViewOf([SIDE_LINE], false)).toBe("side view from the figure's left");
	});

	it('берёт фронтальный или задний вид, когда боковых признаков нет', () => {
		expect(cameraViewOf([FRONT_LINE], false)).toBe('front view');
		expect(cameraViewOf([PLAIN_LINE], false)).toBe('front view');
		expect(cameraViewOf([PLAIN_LINE], true)).toBe('rear view');
	});
});

describe('isPosteriorMuscle', () => {
	it('узнаёт мышцы задней цепи по латинскому имени', () => {
		expect(isPosteriorMuscle('Gluteus maximus')).toBe(true);
		expect(isPosteriorMuscle('Biceps femoris')).toBe(true);
		expect(isPosteriorMuscle('Rectus abdominis')).toBe(false);
	});
});

describe('isBilateralMuscle', () => {
	it('узнаёт мышцы, которые не делятся на стороны', () => {
		expect(isBilateralMuscle('Rectus abdominis')).toBe(true);
		expect(isBilateralMuscle('Erector spinae')).toBe(true);
		expect(isBilateralMuscle('Gluteus maximus')).toBe(false);
	});
});
