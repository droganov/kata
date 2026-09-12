const UNICODE_FLAG = 'u';
const ALTERNATION = '|';

const anyOf = (parts: readonly string[]): RegExp =>
	new RegExp(parts.join(ALTERNATION), UNICODE_FLAG);

const FRONT = anyOf([
	'ширин',
	'симметр',
	'на одной высоте',
	'на одном уровне',
	'на уровне',
	'лопат',
	'хват',
	'ладон',
	'кист',
	'локт',
	'колен[аи] (?:внутрь|наружу|сход|расход)',
	'ух[ао]',
	'уши',
	'уш[аи]',
	'вбок',
	'в сторон',
	'об[ае] ',
	'обе',
	'оба',
	'лев',
	'прав',
	'к плеч',
	'ключиц',
	'гриф',
	'рукоят'
]);

const SIDE = anyOf([
	'вертикал',
	'поясниц',
	'позвоноч',
	'нейтрал',
	'наклон',
	'угол',
	'градус',
	'над пятк',
	'голен',
	'корпус',
	'груд',
	'макушк',
	'голов',
	'взгляд',
	'подбород',
	'затыл',
	'таз',
	'бедр',
	'параллел',
	'вперёд',
	'назад',
	'над стоп',
	'над колен'
]);

const POSTERIOR_PARTS: readonly string[] = [
	'latissimus',
	'trapezius',
	'rhomboid',
	'erector',
	'gluteus',
	'biceps femoris',
	'semitendinosus',
	'semimembranosus',
	'posterior',
	'teres',
	'gastrocnemius',
	'soleus',
	'multifidus',
	'levator',
	'splenius',
	'infraspinatus',
	'supraspinatus',
	'quadratus'
];

const BILATERAL_NAMES: ReadonlySet<string> = new Set([
	'diaphragm',
	'erector spinae',
	'multifidus',
	'rectus abdominis',
	'transversus abdominis'
]);

const FRONT_VIEW = 'front view';
const REAR_VIEW = 'rear view';
const SIDE_VIEW = "side view from the figure's left";
const SPACE = ' ';

export const cameraViewOf = (lines: readonly string[], isPosterior: boolean): string => {
	const text = lines.join(SPACE).toLowerCase();
	const isFrontal = FRONT.test(text);
	const isLateral = SIDE.test(text);
	const coronal = isPosterior ? REAR_VIEW : FRONT_VIEW;
	if (isFrontal && isLateral) return `left half of the tile ${coronal}, right half ${SIDE_VIEW}`;
	return isLateral ? SIDE_VIEW : coronal;
};

export const isBilateralMuscle = (latin: string): boolean =>
	BILATERAL_NAMES.has(latin.toLowerCase());

export const isPosteriorMuscle = (latin: string): boolean => {
	const lowered = latin.toLowerCase();
	return POSTERIOR_PARTS.some((part) => lowered.includes(part));
};
