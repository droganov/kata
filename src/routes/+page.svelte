<script lang="ts">
	import { goto } from '$app/navigation';

	import type { ActiveSession } from '../lib/session/application/store.ts';
	import type { ProgramList } from './+page.ts';

	import { redrawBrowserSession } from '../lib/session/interface/browser-session.ts';

	let { data }: { data: ProgramList } = $props();

	const PROGRAM_PATH = '/programs/';

	const redrawableOf = (program: string): ActiveSession | undefined =>
		data.redrawable.find((session) => session.view.program === program);
	const redraw = async (session: ActiveSession): Promise<void> => {
		await redrawBrowserSession(session, fetch);
		await goto(PROGRAM_PATH + session.view.program, { invalidateAll: true });
	};
</script>

<svelte:head><title>Программы</title></svelte:head>

<main class="mx-auto max-w-xl space-y-4 p-4">
	<h1 class="text-2xl font-bold">Программы</h1>
	<ul class="menu w-full rounded-box bg-base-200">
		{#each data.programs as program (program.id)}
			{@const session = redrawableOf(program.id)}
			<li>
				<a href="{PROGRAM_PATH}{program.id}">{program.title}</a>
				{#if session !== undefined}
					<button onclick={() => redraw(session)} type="button"
						>Пересобрать Занятие</button
					>
				{/if}
			</li>
		{/each}
	</ul>
</main>
