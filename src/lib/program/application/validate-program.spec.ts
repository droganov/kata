import { describe, expect, it } from 'vitest';

import { REPOSITORIES } from '../../../test/program-fixtures.ts';
import { validateProgram } from './validate-program.ts';

describe('validateProgram', () => {
	it('прогоняет правила и считает провалы', () => {
		const report = validateProgram(REPOSITORIES, 'program-1');
		expect(report.title).toBe('Программа');
		expect(report.sessions).toHaveLength(2);
		expect(report.failureCount).toBe(report.findings.length);
		expect(report.findings.map((finding) => finding.rule)).toContain(
			'E3 ISOMETRIC_THREE_PLANES'
		);
	});
});
