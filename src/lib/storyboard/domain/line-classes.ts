const UNICODE_FLAG = 'u';
const ALTERNATION = '|';
const WORD_END = String.raw`(?![\p{L}\p{N}_])`;
const WORD_START = String.raw`(?<![\p{L}\p{N}_])`;

const anyOf = (parts: readonly string[]): RegExp =>
	new RegExp(parts.join(ALTERNATION), UNICODE_FLAG);

const PAIN = `${WORD_START}бол(?:ь${WORD_END}|ью${WORD_END}|и${WORD_END}|ев|езн)`;

const SYMPTOM = anyOf([
	PAIN,
	'болит',
	'жжен',
	'прострел',
	'онемен',
	'покалыван',
	'судорог',
	'хруст',
	'щелч',
	'немеет',
	'тянет в',
	'дрожь',
	'головокруж',
	'пульс',
	'тошнот'
]);

const BREATHING = anyOf(['дыхан', 'вдох', 'выдох']);

const DRIFT = anyOf([
	'к концу',
	'с каждой',
	'постепенно',
	'со временем',
	String.raw`к \d+`,
	'на последних',
	'последни[ехй]'
]);

const SOUND = anyOf([
	'звук',
	'стук',
	'скрип',
	'грохот',
	'люфт',
	'болтает',
	'тишин',
	'бесшумн',
	'без звука',
	'шум',
	'расстёгнут',
	'ослаб'
]);

const TEMPO = anyOf([
	'темп',
	'плавн',
	'ритм',
	'каденс',
	'скорост',
	'медленн',
	'быстр',
	'рывк',
	'рывок',
	'резк',
	'инерци',
	'толчк',
	'непрерывн',
	'длится',
	'за две секунды',
	'за три секунды'
]);

const SENSATION = anyOf([
	'ощущ',
	'чувств',
	'натяжен',
	'терпим',
	'распредел',
	'своим весом',
	'собственн(?:ый|ым) вес',
	'усили',
	'напряжен',
	'расслаб',
	'тяжест',
	'восстанав',
	'отдых',
	'комфорт'
]);

export const LINE_CLASS = {
	breathing: 'breathing',
	drift: 'drift',
	sensation: 'sensation',
	sound: 'sound',
	symptom: 'symptom',
	tempo: 'tempo'
} as const;

export type LineClass = (typeof LINE_CLASS)[keyof typeof LINE_CLASS];

const CLASS_PATTERNS: readonly (readonly [LineClass, RegExp])[] = [
	[LINE_CLASS.symptom, SYMPTOM],
	[LINE_CLASS.breathing, BREATHING],
	[LINE_CLASS.drift, DRIFT],
	[LINE_CLASS.sound, SOUND],
	[LINE_CLASS.tempo, TEMPO],
	[LINE_CLASS.sensation, SENSATION]
];

export function hasNoVisualForm(text: string): boolean {
	return lineClassOf(text) !== undefined;
}

export function lineClassOf(text: string): LineClass | undefined {
	const lowered = text.toLowerCase();
	const matched = CLASS_PATTERNS.find(([, pattern]) => pattern.test(lowered));
	return matched === undefined ? undefined : matched[0];
}
