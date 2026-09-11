import { describe, expect, it } from 'vitest';

import { sourceCatalog } from '../../../test/table-fixtures.ts';
import { sourcePlacements, sourceRecords } from './source-catalog.ts';

const catalog = sourceCatalog();

describe('sourcePlacements', () => {
	it('разворачивает файлы в мишени каталога с их группой мышц', () => {
		const placements = sourcePlacements(catalog);
		expect(placements.map(({ catalogTarget }) => catalogTarget.slug)).toEqual([
			'cervical',
			'neck_flexors',
			'lats',
			'rhomboids'
		]);
		expect(placements[0]?.file.slug).toBe('warmup');
		expect(placements[0]?.group.slug).toBe('neck');
	});
});

describe('sourceRecords', () => {
	it('разворачивает мишени каталога в упражнения', () => {
		expect(sourceRecords(catalog).map(({ exercise }) => exercise.slug)).toEqual([
			'neck_roll',
			'neck_press',
			'pulldown',
			'row'
		]);
	});
});
