const STATE_INCREMENT = 0x6d_2b_79_f5;
const MIX_SHIFT = 15;
const SPREAD_SHIFT = 7;
const SPREAD_ODD = 61;
const OUTPUT_SHIFT = 14;
const UINT32_RANGE = 4_294_967_296;

export type Random = () => number;

export const randomOf = (seed: number): Random => {
	let state = seed >>> 0;
	return () => {
		state = (state + STATE_INCREMENT) >>> 0;
		let mixed = Math.imul(state ^ (state >>> MIX_SHIFT), state | 1);
		mixed ^= mixed + Math.imul(mixed ^ (mixed >>> SPREAD_SHIFT), mixed | SPREAD_ODD);
		return ((mixed ^ (mixed >>> OUTPUT_SHIFT)) >>> 0) / UINT32_RANGE;
	};
};

export const sampled = <Item>(
	items: readonly Item[],
	count: number,
	random: Random
): readonly Item[] => {
	const rest = [...items];
	const picked: Item[] = [];
	while (picked.length < count && rest.length > 0) {
		const at = Math.floor(random() * rest.length);
		picked.push(...rest.splice(at, 1));
	}
	return picked;
};
