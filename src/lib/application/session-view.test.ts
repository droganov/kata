import type { Slot } from '$lib/domain/model';

import { describe, expect, it } from 'vitest';

import {
	activeNames,
	axesOf,
	AXIS_TITLE,
	axisTitle,
	BANK_OF_AXIS,
	bankKey,
	doseOf,
	groupByZone,
	jointOf,
	linkText,
	nameMap,
	promptOf
} from './session-view';

const slot = (id: string, zone?: string, unit?: string): Slot => ({
	id,
	items: [{ dose: '1', id: 'a', images: [], instructions: '', name: 'A' }],
	kind: 'pool',
	label: `${zone ?? 'x'} · ${id}`,
	...(zone !== undefined && { zone }),
	...(unit !== undefined && { unit })
});

describe('groupByZone', () => {
	it('объединяет соседние слоты одной зоны, ключ — латинский id первого слота', () => {
		const groups = groupByZone('warmup', [
			slot('W_a', 'Шея'),
			slot('W_b', 'Шея'),
			slot('W_c', 'Бёдра')
		]);
		expect(groups.map((g) => g.key)).toEqual(['warmup:W_a', 'warmup:W_c']);
		expect(groups[0]?.slots.map((s) => s.id)).toEqual(['W_a', 'W_b']);
		expect(groups[0]?.slots[0]?.unit).toBe('контур');
	});
	it('слот без зоны — своя группа; unit берётся из слота', () => {
		const groups = groupByZone('strength', [slot('K'), slot('Z', undefined, 'сустав')]);
		expect(groups).toHaveLength(2);
		expect(groups[1]?.slots[0]?.unit).toBe('сустав');
		expect(groups[0]?.zone).toBeUndefined();
	});
});

describe('подписи', () => {
	it('nameMap + linkText', () => {
		const names = nameMap([{ id: 'a', name: 'Тело' }]);
		expect(
			linkText(
				[
					{ id: 'a', role: 'главное' },
					{ id: 'b', role: 'вспомогательное' }
				],
				names
			)
		).toBe('Тело — главное · b — вспомогательное');
		expect(linkText(undefined, names)).toBe('');
	});
	it('jointOf', () => {
		expect(jointOf('Шея · шейный отдел')).toBe('шейный отдел');
		expect(jointOf('БАЗА')).toBe('БАЗА');
	});
	it('словари разделов', () => {
		expect(AXIS_TITLE.static).toBe('Калистеника');
		expect(BANK_OF_AXIS.static).toBe('calisthenics');
	});
});

describe('подстановки для страницы', () => {
	it('axisTitle: словарь, иначе заголовок из данных', () => {
		expect(axisTitle({ id: 'static', slots: [], title: 'x' })).toBe('Калистеника');
		expect(axisTitle({ id: 'other', slots: [], title: 'Другое' })).toBe('Другое');
	});
	it('bankKey: банк раздела, иначе id раздела', () => {
		expect(bankKey('static', 'a')).toBe('calisthenics:a');
		expect(bankKey('warmup', 'a')).toBe('warmup:a');
	});
	it('axesOf: разделы первого дня, без дней — пусто', () => {
		expect(axesOf([])).toEqual([]);
		expect(
			axesOf([
				{
					axes: [{ id: 'w', slots: [], title: 'W' }],
					id: 'd',
					index: 1,
					minutes: 1,
					title: 'D'
				}
			])
		).toHaveLength(1);
	});
	it('doseOf: пустая строка без дозы', () => {
		const base = {
			axis: 'strength',
			equipment: [],
			id: 'x',
			mode: 'loaded',
			name: 'X',
			origin: 'base' as const,
			procedure: { steps: [] },
			targets: []
		};
		expect(doseOf(base)).toBe('');
		expect(doseOf({ ...base, dose: '3×12' })).toBe('3×12');
	});
	it('activeNames: имена через точку, неизвестный id как есть, пусто — тире', () => {
		expect(activeNames(['a', 'b'], { a: 'А' })).toBe('А · b');
		expect(activeNames([], { a: 'А' })).toBe('—');
	});
	it('promptOf: пустая строка без промпта', () => {
		expect(promptOf({ k: 'P' }, 'k')).toBe('P');
		expect(promptOf({}, 'k')).toBe('');
	});
});
