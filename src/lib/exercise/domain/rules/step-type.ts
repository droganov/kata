const EXIT_VERB = /^(?:выйти|опустить|положить|поставить)/u;
const EXIT_OBJECT =
	/на пол(?![\p{L}\p{N}_])|на пятки|стек|плит|на стопку|на раму|из положения|из виса|из упора|из планки|из приседа|снаряд|гантел|блин|на подставку/u;

export const STEP_TYPE = {
	exit: 'exit',
	hold: 'hold',
	initial: 'initial',
	move: 'move',
	repeat: 'repeat',
	setup: 'setup',
	switch: 'switch'
} as const;

export type StepType = (typeof STEP_TYPE)[keyof typeof STEP_TYPE];

const TYPE_PATTERNS: readonly (readonly [RegExp, StepType])[] = [
	[/^сменить сторон/u, STEP_TYPE.switch],
	[/^удерж/u, STEP_TYPE.hold],
	[/^повтор/u, STEP_TYPE.repeat],
	[/^сменить направлен/u, STEP_TYPE.move],
	[
		/^(?:настро|закреп|выстав|надеть|взять|установ|подобр|выбрать|застегн|отрегул|перекин|положить резин)/u,
		STEP_TYPE.setup
	],
	[
		/^(?:принять|встать|лечь|сесть|повиснуть|занять|выйти в|стать|опереться|упереться|расположиться|разместиться|поставить стоп|поставить ног|прислониться)/u,
		STEP_TYPE.initial
	],
	[
		/^(?:вернуть|сойти|слезть|отпустить|встать с|снять|остановить|замедлить|завершить|поставить стек|отстегн|спрыг|перейти на другую)/u,
		STEP_TYPE.exit
	]
];

const REPEATED_TYPES: ReadonlySet<StepType> = new Set([
	STEP_TYPE.hold,
	STEP_TYPE.move,
	STEP_TYPE.repeat
]);

export const isWorkingType = (type: StepType): boolean => REPEATED_TYPES.has(type);

export const stepTypeOf = (title: string): StepType => {
	const text = title.toLowerCase();
	const matched = TYPE_PATTERNS.find(([pattern]) => pattern.test(text));
	if (matched !== undefined) return matched[1];
	return EXIT_VERB.test(text) && EXIT_OBJECT.test(text) ? STEP_TYPE.exit : STEP_TYPE.move;
};
