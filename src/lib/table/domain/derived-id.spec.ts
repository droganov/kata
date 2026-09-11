import { describe, expect, it } from 'vitest';

import { isUuid } from '../../shared/uuid.ts';
import { derivedId } from './derived-id.ts';

const ORACLE = '01a0889d-3854-78be-a741-f14e631d24f1';

describe('порождённый идентификатор', () => {
	it('имеет вид UUIDv7', () => {
		expect(isUuid(derivedId([ORACLE, 'counter', 'вес перенесён на пятки']))).toBe(true);
	});

	it('повторяется на тех же составляющих', () => {
		expect(derivedId([ORACLE, 'model', 'корпус вертикален'])).toBe(
			derivedId([ORACLE, 'model', 'корпус вертикален'])
		);
	});

	it('расходится на разной стороне и на разном тексте', () => {
		const model = derivedId([ORACLE, 'model', 'корпус вертикален']);
		expect(derivedId([ORACLE, 'counter', 'корпус вертикален'])).not.toBe(model);
		expect(derivedId([ORACLE, 'model', 'корпус завален'])).not.toBe(model);
	});

	it('не склеивает составляющие встык', () => {
		expect(derivedId(['ab', 'c'])).not.toBe(derivedId(['a', 'bc']));
	});

	it('разводит тридцать тысяч строк наблюдений по разным идентификаторам', () => {
		const ids = Array.from({ length: 30_000 })
			.keys()
			.map((at) => derivedId([ORACLE, 'counter', `наблюдение ${String(at)}`]))
			.toArray();
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('занимает все варианты старшего полубайта', () => {
		const variants = Array.from({ length: 400 })
			.keys()
			.map((at) => derivedId([String(at)]).slice(19, 20));
		expect(new Set(variants)).toEqual(new Set(['8', '9', 'a', 'b']));
	});
});
