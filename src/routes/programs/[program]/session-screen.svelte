<script lang="ts">
	import { goto } from '$app/navigation';

	import type {
		RedrawLevel,
		SessionMark
	} from '../../../lib/session/interface/browser-session.ts';
	import type { SessionScreen } from '../../../lib/session/interface/session-screen.ts';
	import type { Connection } from '../../connection.svelte.ts';

	import { nextAfterMark, placeOf } from '../../../lib/session/application/session-place.ts';
	import { MARK_STATUS } from '../../../lib/session/application/store.ts';
	import {
		markBrowserSession,
		REDRAW_LEVEL,
		redrawBrowserSessionItem,
		SESSION_DEPENDENCY
	} from '../../../lib/session/interface/browser-session.ts';
	import {
		closeDisclosure,
		disclosureKeyOf,
		openDisclosure,
		sessionItemAddress
	} from '../../../lib/session/interface/session-screen.ts';
	import { browserConnection } from '../../connection.svelte.ts';
	import OfflineNotice from '../../offline-notice.svelte';

	let { connection = browserConnection, data }: { connection?: Connection; data: SessionScreen } =
		$props();

	const EQUIPMENT_DISCLOSURE = 'equipment';
	const PROGRAM_LIST_PATH = '/';
	const PROGRAM_PATH = '/programs/';
	const FINISHED_PATH = '/finished';
	const COLLAPSED_MARK = '▾';
	const EXPANDED_MARK = '▴';
	const MARK_NAMES = {
		[MARK_STATUS.done]: 'выполнено',
		[MARK_STATUS.skipped]: 'пропущено'
	} as const;

	const session = $derived(data.session);
	const account = $derived(data.session.account);

	$effect(() => {
		void connection.sync(account);
	});

	let unredrawable = $state<number | undefined>();
	let replacingAt = $state<number | undefined>();
	const place = $derived(data.current === undefined ? undefined : placeOf(session, data.current));
	const shownBlock = $derived(
		data.openedBlock === place?.inBlock.block
			? place?.blocks.find((block) => block.id === data.openedBlock)
			: undefined
	);

	const mark = async (ord: number, status: SessionMark['status']): Promise<void> => {
		const marked = await markBrowserSession(session.account, { ord, status });
		void connection.sync(session.account);
		if (marked.isFinalized) await goto(PROGRAM_PATH + session.view.program + FINISHED_PATH);
		else
			await goto(sessionItemAddress(nextAfterMark(marked.session, ord)), {
				invalidate: [SESSION_DEPENDENCY]
			});
	};
	const redraw = async (ord: number, level: RedrawLevel): Promise<void> => {
		unredrawable = undefined;
		replacingAt = undefined;
		const redrawn = await redrawBrowserSessionItem(session, level, ord, fetch);
		if (redrawn.isRedrawn)
			await goto(sessionItemAddress(ord), { invalidate: [SESSION_DEPENDENCY] });
		else unredrawable = ord;
	};
	const toggleAddress = (ord: number, block: string): string =>
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

{#if place === undefined}
	<main class="mx-auto flex min-h-dvh max-w-xl flex-col items-start gap-4 p-4">
		<p class="opacity-60">Упражнений нет</p>
		<a class="btn btn-ghost btn-sm" href={PROGRAM_LIST_PATH}>На главную</a>
	</main>
{:else}
	{@const item = place.item}
	<header class="sticky top-0 z-10 border-b border-base-300 bg-base-100/95 backdrop-blur">
		<div class="mx-auto max-w-xl space-y-2 px-4 pt-2 pb-3">
			<div class="flex items-center gap-1">
				<a
					class="btn -ml-2 btn-square btn-ghost btn-sm"
					aria-label="На главную"
					href={PROGRAM_LIST_PATH}
				>
					<svg
						class="size-5"
						aria-hidden="true"
						fill="none"
						stroke="currentColor"
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						viewBox="0 0 24 24"
						><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h5v-6h4v6h5V9.5" /></svg
					>
				</a>
				<p class="grow truncate">
					<span class="font-semibold">{place.inBlock.name}</span>
					<span class="text-sm tabular-nums opacity-60"
						>{place.inBlock.number} из {place.inBlock.size}</span
					>
				</p>
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
				{#if place.next === undefined}
					<span
						class="btn btn-disabled -mr-2 btn-square btn-ghost btn-sm"
						aria-hidden="true">›</span
					>
				{:else}
					<a
						class="btn -mr-2 btn-square btn-ghost btn-sm"
						aria-label="Следующая Позиция"
						href={sessionItemAddress(place.next)}>›</a
					>
				{/if}
			</div>
			<ol class="-mx-4 flex gap-1.5 overflow-x-auto px-4 text-xs" aria-label="Блоки Занятия">
				{#each place.blocks as block (block.id)}
					<li class="shrink-0">
						{#if block.id === place.inBlock.block}
							<a
								class="badge gap-1 whitespace-nowrap badge-neutral"
								aria-expanded={shownBlock !== undefined}
								href={toggleAddress(item.ord, block.id)}
							>
								{block.name}
								<span class="tabular-nums">{block.marked}/{block.items.length}</span
								>
								<span aria-hidden="true"
									>{shownBlock === undefined
										? COLLAPSED_MARK
										: EXPANDED_MARK}</span
								>
							</a>
						{:else if block.entry === undefined}
							<span class="badge gap-1 badge-ghost whitespace-nowrap opacity-40">
								{block.name}
								<span class="tabular-nums">{block.marked}/{block.items.length}</span
								>
							</span>
						{:else}
							<a
								class="badge gap-1 badge-ghost whitespace-nowrap"
								href={sessionItemAddress(block.entry)}
							>
								{block.name}
								<span class="tabular-nums">{block.marked}/{block.items.length}</span
								>
							</a>
						{/if}
					</li>
				{/each}
			</ol>
			<OfflineNotice {connection} />
			{#if shownBlock !== undefined}
				<ol
					class="max-h-[50dvh] divide-y divide-base-300 overflow-y-auto rounded-box bg-base-200 px-3 text-sm"
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
		</div>
	</header>

	<main class="mx-auto flex max-w-xl flex-col gap-6 p-4 pb-32">
		{#if data.isHistoryWarningDue}
			<p class="alert alert-warning" role="alert">
				История не сохраняется: браузер не даёт хранить данные. Выполненные Упражнения не
				будут учитываться, и повторы станут чаще.
			</p>
		{/if}

		<section class="space-y-2">
			{#if place.mark !== undefined}
				<span class="badge badge-outline">{MARK_NAMES[place.mark]}</span>
			{/if}
			<h1 class="text-4xl leading-tight font-bold">{item.name}</h1>
			<div class="flex items-center justify-between gap-3">
				<p class="text-2xl font-semibold tabular-nums opacity-80">{item.dose}</p>
				{#if place.mark === undefined && !connection.isOffline && (item.isExerciseRedrawable || item.isTargetRedrawable)}
					<div class="relative">
						<button
							class="btn gap-1.5 btn-ghost btn-sm"
							aria-expanded={replacingAt === item.ord}
							onclick={() =>
								(replacingAt = replacingAt === item.ord ? undefined : item.ord)}
							type="button"
						>
							<svg
								class="size-4"
								aria-hidden="true"
								fill="none"
								stroke="currentColor"
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								viewBox="0 0 24 24"><path d="M4 7h13l-3-3M20 17H7l3 3" /></svg
							>
							Заменить
						</button>
						{#if replacingAt === item.ord}
							<ul
								class="menu absolute right-0 z-20 mt-1 w-64 rounded-box bg-base-100 p-2 shadow-lg ring-1 ring-base-300"
								aria-label="Замена"
							>
								{#if item.isExerciseRedrawable}
									<li>
										<button
											class="flex flex-col items-start gap-0"
											onclick={() => redraw(item.ord, REDRAW_LEVEL.exercise)}
											type="button"
										>
											<span class="font-medium">Другое Упражнение</span>
											<span class="text-xs opacity-60">та же Мишень</span>
										</button>
									</li>
								{/if}
								{#if item.isTargetRedrawable}
									<li>
										<button
											class="flex flex-col items-start gap-0"
											onclick={() => redraw(item.ord, REDRAW_LEVEL.target)}
											type="button"
										>
											<span class="font-medium">Другая Мишень</span>
											<span class="text-xs opacity-60">та же Группа мышц</span
											>
										</button>
									</li>
								{/if}
							</ul>
						{/if}
					</div>
				{/if}
			</div>
			{#if unredrawable === item.ord}
				<p class="text-sm opacity-70" role="status">
					Замены нет: всё подходящее уже в Занятии или отклонено.
				</p>
			{/if}
			{#if item.detail.note !== undefined}
				<p class="text-base">{item.detail.note}</p>
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
			<div class="mx-auto grid max-w-xl grid-cols-2 gap-3">
				<button
					class="btn btn-outline btn-lg"
					class:btn-active={place.mark === MARK_STATUS.skipped}
					onclick={() => mark(item.ord, MARK_STATUS.skipped)}
					type="button">Пропущено</button
				>
				<button
					class="btn btn-neutral btn-lg"
					class:btn-active={place.mark === MARK_STATUS.done}
					onclick={() => mark(item.ord, MARK_STATUS.done)}
					type="button">Выполнено</button
				>
			</div>
		</footer>
	</main>
{/if}
