import type { Bank } from '../lib/catalog/domain/bank.ts';

type BankExercise = Bank['zones'][number]['contours'][number]['exercises'][number];

import { uuidOfLabel } from './uuid.ts';

export const BANK_EXERCISE_BASE: BankExercise = {
	constraints: { axial: false, free_weight: false, lumbar_ext: false, lumbar_flex: false },
	dose: '3×12',
	equipment: [{ id: uuidOfLabel('bank-equipment'), role: 'main' }],
	id: uuidOfLabel('bank-exercise'),
	mode: 'dynamic',
	name: 'Упражнение банка',
	slug: 'bank_exercise',
	targets: [{ id: uuidOfLabel('bank-target'), role: 'primary' }]
};
