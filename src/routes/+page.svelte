<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';

	import type { ActiveSession } from '../lib/session/application/store.ts';
	import type { ProgramList } from './+page.ts';

	import {
		cancelBrowserSession,
		isSessionRedrawable,
		redrawBrowserSession
	} from '../lib/session/interface/browser-session.ts';

	let { data }: { data: ProgramList } = $props();

	const PROGRAM_PATH = '/programs/';

	const sessionOf = (program: string): ActiveSession | undefined =>
		data.sessions.find((session) => session.view.program === program);
	const sizeOf = (session: ActiveSession): number =>
		session.view.blocks.reduce((size, block) => size + block.items.length, 0);
	const cancel = async (session: ActiveSession): Promise<void> => {
		await cancelBrowserSession(session.account);
		await invalidateAll();
	};
	const redraw = async (session: ActiveSession): Promise<void> => {
		await redrawBrowserSession(session, fetch);
		await goto(PROGRAM_PATH + session.view.program, { invalidateAll: true });
	};
</script>

<svelte:head><title>Программы</title></svelte:head>

<main class="mx-auto max-w-xl space-y-4 p-4">
	<h1 class="text-2xl font-bold">Программы</h1>
	<ul class="space-y-3">
		{#each data.programs as program (program.id)}
			{@const session = sessionOf(program.id)}
			<li class="card bg-base-200">
				<div class="card-body gap-3 p-4">
					<h2 class="card-title text-lg">{program.title}</h2>
					{#if session === undefined}
						<a class="btn btn-block btn-neutral" href="{PROGRAM_PATH}{program.id}"
							>Начать Занятие</a
						>
					{:else}
						<p class="text-sm opacity-70">
							Занятие идёт · отмечено {session.marks.length} из {sizeOf(session)}
						</p>
						<div class="grid auto-cols-fr grid-flow-col gap-2">
							<a class="btn btn-neutral" href="{PROGRAM_PATH}{program.id}"
								>Продолжить</a
							>
							{#if isSessionRedrawable(session)}
								<button
									class="btn btn-outline"
									onclick={() => redraw(session)}
									type="button">Пересобрать</button
								>
							{/if}
						</div>
						<button
							class="btn self-center btn-ghost btn-sm"
							onclick={() => cancel(session)}
							type="button">Отменить Занятие</button
						>
					{/if}
				</div>
			</li>
		{/each}
	</ul>
</main>
