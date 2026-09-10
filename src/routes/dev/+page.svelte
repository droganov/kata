<script lang="ts">
	import type { Bank, Exercise, Link, Procedure, Slot } from '$lib/domain/model';

	import {
		activeNames,
		axesOf,
		axisTitle,
		bankKey,
		COPIED_MS,
		doseOf,
		groupByZone,
		jointOf,
		linkText,
		nameMap,
		OPEN_SLOTS_STORAGE_KEY,
		ORIGIN,
		promptOf,
		SLOT_KIND,
		TAB,
		type Tab
	} from '$lib/application/session-view';
	import { SvelteSet } from 'svelte/reactivity';

	import type { load } from './+page';

	let { data }: { data: Awaited<ReturnType<typeof load>> } = $props();
	let days = $derived(data.days);
	let exercises: Exercise[] = $derived(data.exercises);
	let banks: Record<string, Bank | null | undefined> = $derived(data.banks);
	let eqName = $derived(nameMap(data.equipment));
	let tgName = $derived(nameMap(data.targets));
	let prompts: Record<string, string> = $derived(data.prompts);
	const ACTIVE_TAB_CLASS = 'tab-active';
	const ZONE_ROW_CLASS = 'bg-base-300';
	const SLOT_ROW_CLASS = 'bg-base-100';
	const CHEVRON = { closed: '▸', open: '▾' };
	const COPY_LABEL = { done: 'Скопировано', idle: 'Копировать' };
	let copied = $state('');
	let tab = $state<Record<string, Tab>>({});
	const tabOf = (key: string): Tab => tab[key] ?? TAB.procedure;
	async function copyPrompt(key: string): Promise<void> {
		try {
			await navigator.clipboard.writeText(promptOf(prompts, key));
			copied = key;
			setTimeout(() => (copied = ''), COPIED_MS);
		} catch {
			copied = '';
		}
	}

	let axes = $derived(
		axesOf(days).map((axis) => ({
			groups: groupByZone(
				axis.id,
				axis.slots.filter((slot: Slot) => slot.kind === SLOT_KIND.pool)
			),
			id: axis.id,
			title: axisTitle(axis)
		}))
	);

	const baseOf = (axis: string): Exercise[] =>
		exercises.filter((e) => e.origin === ORIGIN.base && e.axis === axis);
	const bankOf = (slot: string): Exercise[] =>
		exercises.filter((e) => e.origin === ORIGIN.pool && e.slot === slot);

	const open = new SvelteSet<string>();
	function toggle(id: string): void {
		if (open.has(id)) open.delete(id);
		else open.add(id);
	}

	const openSlots = new SvelteSet<string>();
	$effect(() => {
		try {
			const raw = sessionStorage.getItem(OPEN_SLOTS_STORAGE_KEY);
			if (raw !== null) for (const id of JSON.parse(raw) as string[]) openSlots.add(id);
		} catch {
			openSlots.clear();
		}
	});
	function persistOpenSlots(): void {
		try {
			sessionStorage.setItem(OPEN_SLOTS_STORAGE_KEY, JSON.stringify([...openSlots]));
		} catch {
			openSlots.clear();
		}
	}
	function toggleSlot(id: string): void {
		if (openSlots.has(id)) openSlots.delete(id);
		else openSlots.add(id);
		persistOpenSlots();
	}
</script>

<svelte:head><title>/dev — оси занятия</title></svelte:head>

{#snippet links(e: { equipment?: Link[]; targets?: Link[] })}
	<div class="text-sm">Средства: {linkText(e.equipment, eqName)}</div>
	<div class="mb-2 text-sm">Цели: {linkText(e.targets, tgName)}</div>
{/snippet}

{#snippet procedure(p: Procedure | undefined)}
	{#if p?.steps.length}
		<ol class="list-decimal space-y-3 pl-5 text-sm">
			{#each p.steps as st, si (si)}
				<li>
					<div class="font-semibold">{st.title}</div>
					<div class="text-xs opacity-70">
						Активны: {activeNames(st.active, tgName)}
					</div>
					{#each st.oracles as o, oi (oi)}
						<div class="mt-1">{o.predicate}</div>
						<div class="opacity-70">∀ правильно</div>
						<ul class="list-disc pl-5">
							{#each o.model as m (m)}<li>{m}</li>{/each}
						</ul>
						<div class="opacity-70">¬∃ неправильно</div>
						<ul class="list-disc pl-5">
							{#each o.counterModel as c (c)}<li>{c}</li>{/each}
						</ul>
					{/each}
				</li>
			{/each}
		</ol>
	{:else}
		<span class="text-sm">процедуры нет</span>
	{/if}
{/snippet}

{#snippet panel(e: { equipment?: Link[]; procedure?: Procedure; targets?: Link[] }, key: string)}
	<div class="tabs tabs-border mb-2" role="tablist">
		<button
			class="tab {tabOf(key) === TAB.procedure ? ACTIVE_TAB_CLASS : ''}"
			onclick={() => (tab = { ...tab, [key]: TAB.procedure })}
			role="tab"
			type="button">Процедура</button
		>
		<button
			class="tab {tabOf(key) === TAB.prompt ? ACTIVE_TAB_CLASS : ''}"
			onclick={() => (tab = { ...tab, [key]: TAB.prompt })}
			role="tab"
			type="button">Промпт</button
		>
	</div>
	{#if tabOf(key) === TAB.procedure}
		{@render links(e)}{@render procedure(e.procedure)}
	{:else if prompts[key]}
		<button class="btn mb-2 btn-xs" onclick={() => copyPrompt(key)} type="button"
			>{copied === key ? COPY_LABEL.done : COPY_LABEL.idle}</button
		>
		<pre
			class="max-h-[32rem] overflow-auto rounded bg-base-100 p-2 text-xs whitespace-pre-wrap">{prompts[
				key
			]}</pre>
	{:else}
		<span class="text-sm">промпта нет</span>
	{/if}
{/snippet}

<div class="mx-auto max-w-3xl space-y-8 p-4">
	<div>
		<h1 class="text-2xl font-bold">Оси занятия</h1>
		<p class="text-sm opacity-60">
			БАЗА — в каждом занятии без изменений. ПУЛ — из слота берётся указанное число позиций,
			ротация. Разминка: зона → контур, ни один контур не пропускается.
		</p>
	</div>

	{#each axes as a, i (a.id)}
		{@const bank = banks[a.id]}
		{#if bank}
			<section class="space-y-2">
				<h2 class="text-lg font-bold">{i + 1}. {a.title}</h2>
				<table class="table table-sm">
					<thead
						><tr
							><th class="w-36"></th><th>Упражнение</th><th class="w-40 text-right"
								>Доза</th
							></tr
						></thead
					>
					<tbody>
						{#each bank.zones as z (z.id)}
							{@const zk = `${a.id}:${z.id}`}
							{@const isZOpen = openSlots.has(zk)}
							<tr
								id="g-{zk}"
								class="cursor-pointer bg-base-300 select-none"
								onclick={() => {
									toggleSlot(zk);
								}}
							>
								<td class="font-bold" colspan="3"
									><span class="mr-1 inline-block w-3 opacity-50"
										>{isZOpen ? CHEVRON.open : CHEVRON.closed}</span
									>Зона · {z.title}</td
								>
							</tr>
							{#if isZOpen}
								{#each z.contours as c (c.id)}
									<tr class="bg-base-100">
										<td class="align-top font-semibold">контур</td>
										<td class="font-semibold" colspan="2"
											>{c.title} — взять 1 из {c.bank.length}</td
										>
									</tr>
									{#each c.bank as e (e.id)}
										<tr
											class="hover cursor-pointer align-top"
											onclick={() => {
												toggle(e.id);
											}}
										>
											<td class="pl-6 opacity-50">↳</td>
											<td>{e.name}</td>
											<td class="text-right whitespace-nowrap">{e.dose}</td>
										</tr>
										{#if open.has(e.id)}
											<tr class="bg-base-200"
												><td></td><td colspan="2"
													>{@render panel(e, bankKey(a.id, e.id))}</td
												></tr
											>
										{/if}
									{/each}
								{/each}
							{/if}
						{/each}
					</tbody>
				</table>
			</section>
		{:else}
			<section class="space-y-2">
				<h2 class="text-lg font-bold">{i + 1}. {a.title}</h2>
				<table class="table table-sm">
					<thead>
						<tr
							><th class="w-36"></th><th>Упражнение</th><th class="w-40 text-right"
								>Доза</th
							></tr
						>
					</thead>
					<tbody>
						{#each baseOf(a.id) as e (e.id)}
							<tr
								class="hover cursor-pointer align-top"
								onclick={() => {
									toggle(e.id);
								}}
							>
								<td class="font-semibold">БАЗА</td>
								<td>{e.name}</td>
								<td class="text-right whitespace-nowrap">{doseOf(e)}</td>
							</tr>
							{#if open.has(e.id)}
								<tr class="bg-base-200"
									><td></td><td colspan="2">{@render panel(e, `plan:${e.id}`)}</td
									></tr
								>
							{/if}
						{/each}

						{#each a.groups as g (g.key)}
							{@const isOpen = openSlots.has(g.key)}
							{@const head = g.slots[0]}
							<tr
								id="g-{g.key}"
								class="{g.zone
									? ZONE_ROW_CLASS
									: SLOT_ROW_CLASS} cursor-pointer select-none"
								onclick={() => {
									toggleSlot(g.key);
								}}
							>
								{#if g.zone}
									<td class="font-bold" colspan="3"
										><span class="mr-1 inline-block w-3 opacity-50"
											>{isOpen ? CHEVRON.open : CHEVRON.closed}</span
										>Зона · {g.zone}</td
									>
								{:else}
									<td class="align-top font-semibold">ПУЛ · слот {head.id}</td>
									<td class="font-semibold" colspan="2"
										><span class="mr-1 inline-block w-3 opacity-50"
											>{isOpen ? CHEVRON.open : CHEVRON.closed}</span
										>{head.label} — взять {head.pick} из {bankOf(head.id)
											.length}</td
									>
								{/if}
							</tr>
							{#if isOpen}
								{#each g.slots as s (s.id)}
									{@const bank = bankOf(s.id)}
									{#if g.zone}
										<tr class="bg-base-100">
											<td class="align-top font-semibold">{s.unit}</td>
											<td class="font-semibold" colspan="2"
												>{jointOf(s.label)} — взять {s.pick} из {bank.length}</td
											>
										</tr>
									{/if}
									{#each bank as e (e.id)}
										<tr
											class="hover cursor-pointer align-top"
											onclick={() => {
												toggle(e.id);
											}}
										>
											<td class="pl-6 opacity-50">↳</td>
											<td>{e.name}</td>
											<td class="text-right whitespace-nowrap">{doseOf(e)}</td
											>
										</tr>
										{#if open.has(e.id)}
											<tr class="bg-base-200"
												><td></td><td colspan="2"
													>{@render panel(e, `plan:${e.id}`)}</td
												></tr
											>
										{/if}
									{/each}
								{/each}
							{/if}
						{/each}
					</tbody>
				</table>
			</section>
		{/if}
	{/each}
</div>
