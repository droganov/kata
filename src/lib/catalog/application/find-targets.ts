import type { TargetView } from './catalog-views.ts';
import type { TargetRepository } from './target-repository.ts';

import { targetViewOf } from './catalog-views.ts';

export function findTargets(repository: TargetRepository, ids?: readonly string[]): TargetView[] {
	const targets = repository.readAll();
	const wanted =
		ids === undefined ? targets : targets.filter((target) => ids.includes(target.id));
	return wanted.map((target) => targetViewOf(target));
}
