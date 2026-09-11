import { describe, expect, it } from 'vitest';

import type { Bank, BankExercise, Contour, Zone } from './bank.ts';

import { uuidOf } from '../../shared/uuid.ts';
import { bankSubject, contourSubject, exerciseSubject, ruleCheck } from './finding.ts';

const ID = uuidOf('01a0889d-3852-7051-a039-c9778729a468');
const bank = { id: ID, rules: [], slug: 'stretch', title: 'Растяжка', zones: [] } as Bank;
const zone = { contours: [], id: ID, slug: 'neck', title: 'Шея' } as Zone;
const contour = { exercises: [], id: ID, slug: 'neck_flexors', title: 'Сгибатели' } as Contour;
const exercise = { id: ID, slug: 'st_nk_ext' } as BankExercise;

describe('bankSubject', () => {
	it('это slug банка', () => {
		expect(bankSubject(bank)).toBe('stretch');
	});
});

describe('contourSubject', () => {
	it('склеивает банк, зону и контур', () => {
		expect(contourSubject(bank, zone, contour)).toBe('stretch:neck/neck_flexors');
	});
});

describe('exerciseSubject', () => {
	it('склеивает банк и slug записи', () => {
		expect(exerciseSubject(bank, exercise)).toBe('stretch:st_nk_ext');
	});
});

describe('ruleCheck', () => {
	it('молчит, когда проверка пройдена', () => {
		expect(ruleCheck(true, 'R1 SRP', 'stretch', 'сообщение')).toEqual([]);
	});

	it('даёт один провал, когда проверка не пройдена', () => {
		expect(ruleCheck(false, 'R1 SRP', 'stretch', 'сообщение')).toEqual([
			{ message: 'сообщение', rule: 'R1 SRP', subject: 'stretch' }
		]);
	});
});
