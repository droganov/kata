<script lang="ts">
	import { goto } from '$app/navigation';

	import type { SessionMark } from '../../../lib/session/interface/browser-session.ts';
	import type { SessionScreen } from '../../../lib/session/interface/session-screen.ts';

	import { nextAfterMark, placeOf } from '../../../lib/session/application/session-place.ts';
	import { MARK_STATUS } from '../../../lib/session/application/store.ts';
	import { markBrowserSession } from '../../../lib/session/interface/browser-session.ts';
	import {
		closeDisclosure,
		disclosureKeyOf,
		openDisclosure,
		sessionItemAddress
	} from '../../../lib/session/interface/session-screen.ts';

	let { data }: { data: SessionScreen } = $props();

	const EQUIPMENT_DISCLOSURE = 'equipment';
	const MARK_NAMES = {
		[MARK_STATUS.done]: 'выполнено',
		[MARK_STATUS.skipped]: 'пропущено'
	} as const;

	const session = $derived(data.session);
	const place = $derived(data.current === undefined ? undefined : placeOf(session, data.current));
	const shownBlock = $derived(place?.blocks.find((block) => block.id === data.openedBlock));

	const mark = async (ord: number, status: SessionMark['status']): Promise<void> => {
		const marked = await markBrowserSession(session.account, { ord, status });
		await goto(sessionItemAddress(nextAfterMark(marked, ord)), { invalidateAll: true });
	};
	const blockAddress = (ord: number, block: string): string =>
		block === data.openedBlock ? sessionItemAddress(ord) : sessionItemAddress(ord, block);
	const isDisclosureOpen = (ord: number, element: string): boolean =>
		data.openDisclosures.includes(disclosureKeyOf(session, ord, element));
	const rememberDisclosure =
		(ord: number, element: string) =>
		(event: Event & { currentTarget: HTMLDetailsElement }): void => {
			const key = disclosureKeyOf(session, ord, element);
			if (event.currentTarget.open) openDisclosure(key);
			else closeDisclosure(key);
		};
</script>

<svelte:head><title>{session.view.title}</title></svelte:head>

<main class="mx-auto flex min-h-dvh max-w-xl flex-col gap-5 p-4 pb-32">
	{#if data.isHistoryWarningDue}
		<p class="alert alert-warning" role="alert">
			История не сохраняется: браузер не даёт хранить данные. Выполненные Упражнения не будут
			учитываться, и повторы станут чаще.
		</p>
	{/if}
	{#if place === undefined}
		<p class="opacity-60">Упражнений нет</p>
	{:else}
		{@const item = place.item}
		<header class="space-y-2">
			<div class="flex items-center gap-2">
				<span class="grow text-lg font-semibold">{place.inBlock.name}</span>
				{#if place.previous === undefined}
					<span class="btn btn-disabled btn-square btn-ghost btn-sm" aria-hidden="true"
						>‹</span
					>
				{:else}
					<a
						class="btn btn-square btn-ghost btn-sm"
						aria-label="Предыдущая Позиция"
						href={sessionItemAddress(place.previous)}>‹</a
					>
				{/if}
				<span class="tabular-nums opacity-70"
					>{place.inBlock.number} из {place.inBlock.size}</span
				>
				{#if place.next === undefined}
					<span class="btn btn-disabled btn-square btn-ghost btn-sm" aria-hidden="true"
						>›</span
					>
				{:else}
					<a
						class="btn btn-square btn-ghost btn-sm"
						aria-label="Следующая Позиция"
						href={sessionItemAddress(place.next)}>›</a
					>
				{/if}
			</div>
			<ol class="flex flex-wrap gap-x-3 gap-y-1 text-xs" aria-label="Блоки Занятия">
				{#each place.blocks as block (block.id)}
					<li>
						<a
							class="underline-offset-2"
							class:font-semibold={block.id === place.inBlock.block}
							class:opacity-50={block.id !== place.inBlock.block}
							class:underline={block.id === data.openedBlock}
							href={blockAddress(item.ord, block.id)}
						>
							{block.name}
							<span class="tabular-nums">{block.marked}/{block.items.length}</span>
						</a>
					</li>
				{/each}
			</ol>
			{#if shownBlock !== undefined}
				<ol
					class="divide-y divide-base-300 rounded-box bg-base-200 px-3 text-sm"
					aria-label="Позиции Блока {shownBlock.name}"
				>
					{#each shownBlock.items as sessionItem (sessionItem.ord)}
						<li>
							<a
								class="flex w-full items-baseline justify-between gap-3 py-2"
								class:font-semibold={sessionItem.ord === item.ord}
								href={sessionItemAddress(sessionItem.ord)}
							>
								<span>{sessionItem.name}</span>
								<span class="whitespace-nowrap opacity-60">
									{sessionItem.mark === undefined
										? sessionItem.dose
										: MARK_NAMES[sessionItem.mark]}
								</span>
							</a>
						</li>
					{/each}
				</ol>
			{/if}
		</header>

		<section class="space-y-1">
			{#if place.mark !== undefined}
				<span class="badge badge-outline">{MARK_NAMES[place.mark]}</span>
			{/if}
			<h1 class="text-4xl leading-tight font-bold">{item.name}</h1>
			<p class="text-2xl font-semibold tabular-nums opacity-80">{item.dose}</p>
			{#if item.detail.note !== undefined}
				<p class="pt-2 text-base">{item.detail.note}</p>
			{/if}
		</section>

		<section class="space-y-2">
			<details
				class="collapse-arrow collapse bg-base-200"
				ontoggle={rememberDisclosure(item.ord, EQUIPMENT_DISCLOSURE)}
				open={isDisclosureOpen(item.ord, EQUIPMENT_DISCLOSURE)}
			>
				<summary class="collapse-title min-h-0 py-3 font-medium"
					>Оборудование и Мишени</summary
				>
				<div class="collapse-content space-y-3 text-sm">
					<div>
						<p class="text-xs uppercase opacity-60">Оборудование</p>
						{#each item.detail.equipment as entry (entry.name)}
							<p>{entry.name} <span class="opacity-60">· {entry.role}</span></p>
						{/each}
					</div>
					{#each item.detail.targets as group (group.role)}
						<div>
							<p class="text-xs uppercase opacity-60">{group.role}</p>
							<p>{group.names}</p>
						</div>
					{/each}
				</div>
			</details>

			<h2 class="pt-2 text-sm font-semibold uppercase opacity-60">
				Процедура · шагов {item.detail.steps.length}
			</h2>
			{#each item.detail.steps as step, stepIndex (step.id)}
				<details
					class="collapse-arrow collapse bg-base-200"
					ontoggle={rememberDisclosure(item.ord, step.id)}
					open={isDisclosureOpen(item.ord, step.id)}
				>
					<summary class="collapse-title min-h-0 py-3 font-medium"
						>{stepIndex + 1}. {step.title}</summary
					>
					<div class="collapse-content space-y-4 text-sm">
						{#each step.oracles as oracle (oracle.id)}
							<div class="space-y-1">
								<p class="font-semibold">{oracle.predicate}</p>
								<ul class="list-disc pl-5">
									{#each oracle.model as line, lineIndex (lineIndex)}
										<li>{line}</li>
									{/each}
								</ul>
								<p class="pt-1 text-xs uppercase opacity-60">неправильно</p>
								<ul class="list-disc pl-5 opacity-70">
									{#each oracle.counterModel as line, lineIndex (lineIndex)}
										<li>{line}</li>
									{/each}
								</ul>
							</div>
						{/each}
					</div>
				</details>
			{/each}
		</section>

		<footer class="fixed inset-x-0 bottom-0 border-t border-base-300 bg-base-100 p-4">
			<div class="mx-auto flex max-w-xl gap-3">
				<button
					class="btn flex-1 btn-outline btn-lg"
					class:btn-active={place.mark === MARK_STATUS.skipped}
					onclick={() => mark(item.ord, MARK_STATUS.skipped)}
					type="button">Пропущено</button
				>
				<button
					class="btn flex-2 btn-neutral btn-lg"
					class:btn-active={place.mark === MARK_STATUS.done}
					onclick={() => mark(item.ord, MARK_STATUS.done)}
					type="button">Выполнено</button
				>
			</div>
		</footer>
	{/if}
</main>
