export interface Axis {
	id: string;
	slots: Slot[];
	title: string;
}
export interface Bank {
	excluded: { name: string; reason: string }[];
	zones: BankZone[];
}
export interface Day {
	axes: Axis[];
	id: string;
	index: number;
	minutes: number;
	title: string;
}
export type Exercise = Record<string, unknown> & {
	axis: string;
	dose?: string;
	equipment: Link[];
	id: string;
	mode: string;
	name: string;
	origin: 'base' | 'pool';
	procedure: Procedure;
	slot?: string;
	targets: Link[];
};
export interface Link {
	id: string;
	role: string;
}
export interface Named {
	id: string;
	name: string;
}
export interface Procedure {
	steps: Step[];
}
export interface Slot {
	id: string;
	items: Item[];
	joint?: string;
	kind: 'base' | 'pool';
	label: string;
	unit?: string;
	zone?: string;
}
interface BankExercise {
	dose: string;
	equipment?: Link[];
	id: string;
	name: string;
	procedure?: Procedure;
	targets?: Link[];
}
interface BankZone {
	contours: Contour[];
	id: string;
	rule?: string;
	title: string;
}
interface Contour {
	bank: BankExercise[];
	id: string;
	title: string;
}
interface Item {
	dose: string;
	id: string;
	images: string[];
	instructions: string;
	name: string;
}
interface Oracle {
	counterModel: string[];
	model: string[];
	predicate: string;
}
interface Step {
	active: string[];
	oracles: Oracle[];
	title: string;
}
