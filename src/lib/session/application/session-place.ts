import type { SessionView } from './session-views.ts';
import type { ActiveSession, SessionMark } from './store.ts';

export interface PlaceInSession {
	readonly blocks: readonly BlockMarks[];
	readonly inBlock: BlockPlace;
	readonly item: SessionItemView;
	readonly mark?: MarkStatus;
	readonly next?: number;
	readonly previous?: number;
}
interface BlockMarks {
	readonly id: string;
	readonly items: readonly MarkedSessionItem[];
	readonly marked: number;
	readonly name: string;
}
interface BlockPlace {
	readonly block: string;
	readonly name: string;
	readonly number: number;
	readonly size: number;
}

interface MarkedSessionItem {
	readonly dose: string;
	readonly mark?: MarkStatus;
	readonly name: string;
	readonly ord: number;
}

type MarkStatus = SessionMark['status'];

type SessionBlockView = SessionView['blocks'][number];

type SessionItemView = SessionBlockView['items'][number];

export const resumeAt = (session: ActiveSession): number | undefined => {
	const items = itemsOf(session.view);
	const marks = marksOf(session);
	return (items.find((item) => !marks.has(item.ord)) ?? items.at(-1))?.ord;
};

export const nextAfterMark = (session: ActiveSession, ord: number): number => {
	const items = itemsOf(session.view);
	const marks = marksOf(session);
	const at = items.findIndex((item) => item.ord === ord);
	const unmarked = [...items.slice(at + 1), ...items.slice(0, at)].find(
		(item) => !marks.has(item.ord)
	);
	return unmarked?.ord ?? ord;
};

export const placeOf = (session: ActiveSession, ord: number): PlaceInSession | undefined => {
	const items = itemsOf(session.view);
	const at = items.findIndex((item) => item.ord === ord);
	const item = items[at];
	const block = session.view.blocks.find((candidate) =>
		candidate.items.some((sessionItem) => sessionItem.ord === ord)
	);
	if (item === undefined || block === undefined) return;
	const marks = marksOf(session);
	const mark = marks.get(ord);
	const previous = items[at - 1]?.ord;
	const next = items[at + 1]?.ord;
	return {
		blocks: session.view.blocks.map((candidate) => blockMarksOf(candidate, marks)),
		item,
		...(mark !== undefined && { mark }),
		...(next !== undefined && { next }),
		inBlock: {
			block: block.id,
			name: block.name,
			number: block.items.indexOf(item) + 1,
			size: block.items.length
		},
		...(previous !== undefined && { previous })
	};
};

const blockMarksOf = (
	block: SessionBlockView,
	marks: ReadonlyMap<number, MarkStatus>
): BlockMarks => ({
	id: block.id,
	items: block.items.map((item) => {
		const mark = marks.get(item.ord);
		return {
			dose: item.dose,
			...(mark !== undefined && { mark }),
			name: item.name,
			ord: item.ord
		};
	}),
	marked: block.items.filter((item) => marks.has(item.ord)).length,
	name: block.name
});

const itemsOf = (view: SessionView): readonly SessionItemView[] =>
	view.blocks.flatMap((block) => block.items);

const marksOf = (session: ActiveSession): ReadonlyMap<number, MarkStatus> =>
	new Map(session.marks.map((mark) => [mark.ord, mark.status]));
