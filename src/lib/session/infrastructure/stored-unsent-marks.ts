import type { UnsentMark, UnsentMarks } from '../application/unsent-marks.ts';

import { isSameMark, isSameSessionItem } from '../application/unsent-marks.ts';
import { unsentMarksOf } from './session-records.ts';

const UNSENT_MARKS_KEY = 'training:unsent-marks:';

export const createStoredUnsentMarks = (storage: Storage): UnsentMarks => {
	const read = (account: string): readonly UnsentMark[] =>
		unsentMarksOf(storage.getItem(UNSENT_MARKS_KEY + account));
	const write = (account: string, marks: readonly UnsentMark[]): void => {
		if (marks.length === 0) storage.removeItem(UNSENT_MARKS_KEY + account);
		else storage.setItem(UNSENT_MARKS_KEY + account, JSON.stringify(marks));
	};
	return {
		keep: (account, mark) => {
			write(account, [
				...read(account).filter((kept) => !isSameSessionItem(kept, mark)),
				mark
			]);
		},
		sent: (account, marks) => {
			write(
				account,
				read(account).filter((kept) => marks.every((sent) => !isSameMark(kept, sent)))
			);
		},
		unsent: read
	};
};
