import { describe, expect, it } from 'vitest';

import type { BankExercise, EquipmentRef, ExerciseConstraints } from '../bank.ts';
import type { Catalog } from '../catalog.ts';

import { uuidOf } from '../../../shared/uuid.ts';
import {
	hasCompoundDose,
	hasGluedName,
	hasLatinLetters,
	hasPerSideSuffix,
	hasSpineFlag,
	isSameList,
	mainEquipmentOf,
	matchedPatterns,
	normalizedName
} from './rule-helpers.ts';

const ID = uuidOf('01a0889d-3852-7051-a039-c9778729a468');
const OTHER_ID = uuidOf('01a0889d-3800-7ef5-adfd-a56bcb2334c5');
const CLEAR: ExerciseConstraints = {
	axial: false,
	free_weight: false,
	lumbar_ext: false,
	lumbar_flex: false
};
const catalog: Catalog = {
	banks: [],
	equipment: [
		{
			canon_en: 'Bodyweight',
			exercises: [],
			id: ID,
			kind: 'body',
			name: 'Тело',
			slug: 'body'
		}
	],
	targets: []
};

const exerciseWith = (equipment: readonly EquipmentRef[]): BankExercise => ({
	constraints: CLEAR,
	dose: '3×12',
	equipment,
	id: ID,
	mode: 'loaded',
	name: 'Запись',
	slug: 'record',
	targets: [{ id: ID, role: 'primary' }]
});

describe('hasCompoundDose', () => {
	it('видит склейку доз через плюс', () => {
		expect(hasCompoundDose('3×12+3×15')).toBe(true);
	});

	it('пропускает одиночную дозу со стороной', () => {
		expect(hasCompoundDose('8/сторона')).toBe(false);
	});
});

describe('hasGluedName', () => {
	it('видит союз, плюс и слэш', () => {
		expect(hasGluedName('приседания и выпады')).toBe(true);
		expect(hasGluedName('жим+тяга')).toBe(true);
		expect(hasGluedName('90/90')).toBe(true);
	});

	it('пропускает одиночное движение', () => {
		expect(hasGluedName('приседания')).toBe(false);
	});
});

describe('hasLatinLetters', () => {
	it('видит латиницу', () => {
		expect(hasLatinLetters('Couch stretch у стены')).toBe(true);
	});

	it('пропускает кириллицу', () => {
		expect(hasLatinLetters('Приседания')).toBe(false);
	});
});

describe('hasPerSideSuffix', () => {
	it('видит суффикс стороны', () => {
		expect(hasPerSideSuffix('Планка/сторона')).toBe(true);
	});

	it('пропускает имя без суффикса', () => {
		expect(hasPerSideSuffix('Планка')).toBe(false);
	});
});

describe('hasSpineFlag', () => {
	it('видит осевую нагрузку', () => {
		expect(hasSpineFlag({ ...CLEAR, axial: true })).toBe(true);
	});

	it('видит сгибание поясницы', () => {
		expect(hasSpineFlag({ ...CLEAR, lumbar_flex: true })).toBe(true);
	});

	it('видит разгибание поясницы', () => {
		expect(hasSpineFlag({ ...CLEAR, lumbar_ext: true })).toBe(true);
	});

	it('молчит без флагов', () => {
		expect(hasSpineFlag(CLEAR)).toBe(false);
	});
});

describe('isSameList', () => {
	it('сравнивает списки по длине и порядку', () => {
		expect(isSameList(['a', 'b'], ['a', 'b'])).toBe(true);
		expect(isSameList(['a'], ['a', 'b'])).toBe(false);
		expect(isSameList(['a', 'b'], ['b', 'a'])).toBe(false);
	});
});

describe('mainEquipmentOf', () => {
	it('находит средство с ролью main', () => {
		const main = mainEquipmentOf(catalog, exerciseWith([{ id: ID, role: 'main' }]));
		expect(main?.slug).toBe('body');
	});

	it('возвращает undefined, когда главного средства нет', () => {
		const exercise = exerciseWith([{ id: ID, role: 'auxiliary' }]);
		expect(mainEquipmentOf(catalog, exercise)).toBeUndefined();
	});

	it('возвращает undefined, когда средство неизвестно', () => {
		const exercise = exerciseWith([{ id: OTHER_ID, role: 'main' }]);
		expect(mainEquipmentOf(catalog, exercise)).toBeUndefined();
	});
});

describe('matchedPatterns', () => {
	it('возвращает найденные подстроки без учёта регистра', () => {
		expect(matchedPatterns('Становая тяга', ['становая', 'ролик'])).toEqual(['становая']);
	});
});

describe('normalizedName', () => {
	it('оставляет только кириллицу в нижнем регистре', () => {
		expect(normalizedName('Фигура 4 сидя на скамье')).toBe('фигурасидянаскамье');
	});
});
