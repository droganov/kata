import type { Bank, Day, Exercise, Named } from '$lib/domain/model';
import type { Load } from '@sveltejs/kit';

import { loadJsonl } from '$lib/infrastructure/jsonl';

const DATA = {
	calisthenics: '/data/calisthenics.json',
	days: '/data/days.jsonl',
	equipment: '/data/equipment.jsonl',
	exercises: '/data/exercises.jsonl',
	prompts: '/data/prompts.json',
	strength: '/data/strength.json',
	stretch: '/data/stretch.json',
	targets: '/data/targets.jsonl'
};

export const load = (async ({ fetch }: Parameters<Load>[0]) => {
	const [days, exercises, equipment, targets, promptsRes, ...banks] = await Promise.all([
		loadJsonl<Day>(fetch, DATA.days),
		loadJsonl<Exercise>(fetch, DATA.exercises),
		loadJsonl<Named>(fetch, DATA.equipment),
		loadJsonl<Named>(fetch, DATA.targets),
		fetch(DATA.prompts),
		fetch(DATA.strength),
		fetch(DATA.calisthenics),
		fetch(DATA.stretch)
	]);
	const [strength, calisthenics, stretch] = await Promise.all(
		banks.map((res) => (res.ok ? (res.json() as Promise<Bank>) : Promise.resolve(null)))
	);
	const prompts = promptsRes.ok ? ((await promptsRes.json()) as Record<string, string>) : {};
	return {
		banks: { static: calisthenics, strength, stretch },
		days,
		equipment,
		exercises,
		prompts,
		targets
	};
}) satisfies Load;
