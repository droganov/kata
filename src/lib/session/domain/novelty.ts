const WEIGHT_FLOOR = 0.02;
const DAY_MS = 86_400_000;
const FULL_WEIGHT = 1;

export const HISTORY_DAYS = 21;

export type NoveltyWeight = (exercise: string) => number;

export interface Performed {
	readonly doneAt: string;
	readonly exercise: string;
}

export const WITHOUT_HISTORY: NoveltyWeight = () => FULL_WEIGHT;

export const noveltyOf = (history: readonly Performed[], now: Date): NoveltyWeight => {
	const lastDone = new Map<string, number>();
	for (const entry of history) {
		const doneAt = Date.parse(entry.doneAt);
		if (doneAt > (lastDone.get(entry.exercise) ?? -Infinity))
			lastDone.set(entry.exercise, doneAt);
	}
	return (exercise) => {
		const doneAt = lastDone.get(exercise);
		if (doneAt === undefined) return FULL_WEIGHT;
		const days = Math.min((now.getTime() - doneAt) / DAY_MS, HISTORY_DAYS);
		return Math.max(days / HISTORY_DAYS, WEIGHT_FLOOR);
	};
};
