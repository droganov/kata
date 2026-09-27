import { describe, expect, it } from 'vitest';

import { emailOf, InvalidEmailError, InvalidNicknameError, nicknameOf } from './person.ts';

describe('никнейм Аккаунта', () => {
	it('обрезает пробелы по краям', () => {
		expect(nicknameOf('  Sergei ')).toBe('Sergei');
	});

	it('пустой никнейм не принимает', () => {
		expect(() => nicknameOf(' '.repeat(3))).toThrow(InvalidNicknameError);
		expect(() => nicknameOf('')).toThrow('Никнейм пуст');
	});
});

describe('почта Аккаунта', () => {
	it('обрезает пробелы и приводит к нижнему регистру', () => {
		expect(emailOf(' Sergei@Example.COM ')).toBe('sergei@example.com');
	});

	it('без собачки, имени или домена не принимает', () => {
		for (const text of ['sergei', '@example.com', 'sergei@', 'a b@example.com'])
			expect(() => emailOf(text)).toThrow(InvalidEmailError);
		expect(() => emailOf('sergei')).toThrow('Почта не похожа на почту: sergei');
	});
});
