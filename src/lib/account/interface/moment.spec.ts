import { describe, expect, it } from 'vitest';

import { momentOf } from './moment.ts';

describe('момент Сеанса', () => {
	it('показывает дату и время по-русски', () => {
		expect(momentOf('2026-09-27T08:00:00.000Z')).toMatch(/2026/);
		expect(momentOf('2026-09-27T08:00:00.000Z')).toMatch(/сент/);
	});
});
