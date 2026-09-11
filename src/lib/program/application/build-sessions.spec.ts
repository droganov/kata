import { describe, expect, it } from 'vitest';

import { REPOSITORIES } from '../../../test/program-fixtures.ts';
import { buildSessions } from './build-sessions.ts';

describe('buildSessions', () => {
	it('собирает занятия ротации с упражнениями слотов', () => {
		const sessions = buildSessions(REPOSITORIES, 'program-1');
		expect(sessions.map((session) => session.slug)).toEqual(['w1d1', 'w1d2']);
		expect(
			sessions[0]?.sections[0]?.slots.map((slot) => slot.exercises.map((one) => one.slug))
		).toEqual([['a'], ['b']]);
		expect(sessions[1]?.sections[0]?.slots[1]?.exercises[0]?.dose).toBe('3×12–15');
	});
});
