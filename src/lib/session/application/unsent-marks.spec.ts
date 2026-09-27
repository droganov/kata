import { describe, expect, it } from 'vitest';

import type { UnsentMark } from './unsent-marks.ts';

import { memoryStorage } from '../../../test/memory-storage.ts';
import { SESSION_START, SESSION_VIEW } from '../../../test/store-contract.ts';
import { createStoredUnsentMarks } from '../infrastructure/stored-unsent-marks.ts';
import { sendMarks, unsentMarkOf } from './unsent-marks.ts';

const ACCOUNT = 'person-a';
const OTHER_ACCOUNT = 'person-b';
const MARKED_AT = SESSION_START.toISOString();
const LATER = '2026-09-14T08:05:00.000Z';

const unsentOf = (ord: number, status: UnsentMark['status'], markedAt = MARKED_AT): UnsentMark => ({
	exercise: `exercise-${String(ord)}`,
	markedAt,
	ord,
	program: SESSION_VIEW.program,
	seed: SESSION_VIEW.seed,
	status
});

describe('unsentMarkOf', () => {
	it('несёт Упражнение Позиции, Занятие и время Отметки', () => {
		const session = {
			account: ACCOUNT,
			markedAt: MARKED_AT,
			marks: [{ ord: 2, status: 'done' as const }],
			openedAt: MARKED_AT,
			rejected: { exercises: [], targets: [] },
			view: SESSION_VIEW
		};
		expect(unsentMarkOf(session, { ord: 2, status: 'done' })).toEqual({
			exercise: 'ex-bridge',
			markedAt: MARKED_AT,
			ord: 2,
			program: SESSION_VIEW.program,
			seed: SESSION_VIEW.seed,
			status: 'done'
		});
	});
});

describe('unsentMarkOf без Позиции', () => {
	it('оставляет Упражнение пустым, если Позиции в Занятии нет', () => {
		const session = {
			account: ACCOUNT,
			markedAt: MARKED_AT,
			marks: [],
			openedAt: MARKED_AT,
			rejected: { exercises: [], targets: [] },
			view: SESSION_VIEW
		};
		expect(unsentMarkOf(session, { ord: 99, status: 'done' }).exercise).toBe('');
	});
});

describe('sendMarks', () => {
	it('отправленные Отметки уходят из очереди, счётчик обнуляется', async () => {
		const marks = createStoredUnsentMarks(memoryStorage());
		marks.keep(ACCOUNT, unsentOf(1, 'done'));
		marks.keep(ACCOUNT, unsentOf(2, 'skipped'));
		const posted: (readonly UnsentMark[])[] = [];
		const delivery = await sendMarks(marks, ACCOUNT, (sent) => {
			posted.push(sent);
			return Promise.resolve(true);
		});
		expect(posted).toEqual([[unsentOf(1, 'done'), unsentOf(2, 'skipped')]]);
		expect(delivery).toEqual({ isReachable: true, unsent: 0 });
		expect(marks.unsent(ACCOUNT)).toEqual([]);
	});

	it('без связи Отметки остаются на устройстве и считаются', async () => {
		const marks = createStoredUnsentMarks(memoryStorage());
		marks.keep(ACCOUNT, unsentOf(1, 'done'));
		const delivery = await sendMarks(marks, ACCOUNT, () => Promise.resolve(false));
		expect(delivery).toEqual({ isReachable: false, unsent: 1 });
		expect(marks.unsent(ACCOUNT)).toEqual([unsentOf(1, 'done')]);
	});

	it('с пустой очередью запрос всё равно уходит и проверяет связь', async () => {
		const marks = createStoredUnsentMarks(memoryStorage());
		let requests = 0;
		const delivery = await sendMarks(marks, ACCOUNT, () => {
			requests += 1;
			return Promise.resolve(false);
		});
		expect(requests).toBe(1);
		expect(delivery).toEqual({ isReachable: false, unsent: 0 });
	});

	it('Отметка, поставленная во время отправки, остаётся неотправленной', async () => {
		const marks = createStoredUnsentMarks(memoryStorage());
		marks.keep(ACCOUNT, unsentOf(1, 'done'));
		const delivery = await sendMarks(marks, ACCOUNT, () => {
			marks.keep(ACCOUNT, unsentOf(1, 'skipped', LATER));
			return Promise.resolve(true);
		});
		expect(delivery).toEqual({ isReachable: true, unsent: 1 });
		expect(marks.unsent(ACCOUNT)).toEqual([unsentOf(1, 'skipped', LATER)]);
	});
});

describe('очередь неотправленных Отметок', () => {
	it('новая Отметка той же Позиции заменяет старую: побеждает последняя', () => {
		const marks = createStoredUnsentMarks(memoryStorage());
		marks.keep(ACCOUNT, unsentOf(1, 'done'));
		marks.keep(ACCOUNT, unsentOf(2, 'done'));
		marks.keep(ACCOUNT, unsentOf(1, 'skipped', LATER));
		expect(marks.unsent(ACCOUNT)).toEqual([unsentOf(2, 'done'), unsentOf(1, 'skipped', LATER)]);
	});

	it('Отметки другого Занятия той же Позиции не заменяются', () => {
		const marks = createStoredUnsentMarks(memoryStorage());
		marks.keep(ACCOUNT, unsentOf(1, 'done'));
		marks.keep(ACCOUNT, { ...unsentOf(1, 'done'), seed: SESSION_VIEW.seed + 1 });
		expect(marks.unsent(ACCOUNT)).toHaveLength(2);
	});

	it('очередь принадлежит Аккаунту', () => {
		const marks = createStoredUnsentMarks(memoryStorage());
		marks.keep(ACCOUNT, unsentOf(1, 'done'));
		expect(marks.unsent(OTHER_ACCOUNT)).toEqual([]);
		marks.sent(OTHER_ACCOUNT, [unsentOf(1, 'done')]);
		expect(marks.unsent(ACCOUNT)).toEqual([unsentOf(1, 'done')]);
	});

	it('испорченную запись очереди читает как пустую', () => {
		const storage = memoryStorage();
		storage.setItem('training:unsent-marks:' + ACCOUNT, '{не JSON');
		expect(createStoredUnsentMarks(storage).unsent(ACCOUNT)).toEqual([]);
		storage.setItem('training:unsent-marks:' + ACCOUNT, JSON.stringify([{ ord: 1 }]));
		expect(createStoredUnsentMarks(storage).unsent(ACCOUNT)).toEqual([]);
	});

	it('последняя отправленная Отметка убирает запись очереди целиком', () => {
		const storage = memoryStorage();
		const marks = createStoredUnsentMarks(storage);
		marks.keep(ACCOUNT, unsentOf(1, 'done'));
		marks.sent(ACCOUNT, [unsentOf(1, 'done')]);
		expect(storage).toHaveLength(0);
	});
});
