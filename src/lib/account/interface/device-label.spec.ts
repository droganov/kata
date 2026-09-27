import { describe, expect, it } from 'vitest';

import { deviceLabelOf } from './device-label.ts';

describe('метка устройства в списке Сеансов', () => {
	it.each([
		[
			'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
			'iPhone · Safari'
		],
		[
			'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
			'Android · Chrome'
		],
		[
			'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7; rv:143.0) Gecko/20100101 Firefox/143.0',
			'Mac · Firefox'
		],
		[
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',
			'Windows · Edge'
		],
		['curl/8.7.1', 'Неизвестное устройство']
	])('%s', (userAgent, label) => {
		expect(deviceLabelOf(userAgent)).toBe(label);
	});
});
