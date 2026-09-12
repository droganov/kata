export const STEP_KIND = {
	hold: 'hold',
	other: 'other',
	repeat: 'repeat',
	switch: 'switch'
} as const;

export type StepKind = (typeof STEP_KIND)[keyof typeof STEP_KIND];

const KIND_PATTERNS: readonly (readonly [RegExp, StepKind])[] = [
	[/^сменить сторон/u, STEP_KIND.switch],
	[/^удерж/u, STEP_KIND.hold],
	[/^повтор/u, STEP_KIND.repeat]
];

const CARRIED_KINDS: ReadonlySet<StepKind> = new Set([STEP_KIND.hold, STEP_KIND.repeat]);

export const isCarriedKind = (kind: StepKind): boolean => CARRIED_KINDS.has(kind);

export const stepKindOf = (title: string): StepKind => {
	const text = title.toLowerCase();
	const matched = KIND_PATTERNS.find(([pattern]) => pattern.test(text));
	return matched === undefined ? STEP_KIND.other : matched[1];
};
