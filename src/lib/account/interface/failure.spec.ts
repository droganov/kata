import { describe, expect, it } from 'vitest';

import { InvalidEmailError } from '../application/sign-in.ts';
import { failureOf } from './failure.ts';

describe('сообщение об отказе', () => {
	it('показывает предметное сообщение ошибки', () => {
		expect(failureOf(new InvalidEmailError('sergei'))).toBe('Почта не похожа на почту: sergei');
	});

	it('не-ошибку показывает строкой', () => {
		expect(failureOf('сбой')).toBe('сбой');
	});
});
