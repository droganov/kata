<script lang="ts">
	import type { DevPageData, DevRow } from './dev-page.ts';

	let { data }: { data: DevPageData } = $props();

	let copied = $state('');
	let failed = $state('');
	const opened: Record<string, boolean> = $state({});

	async function copy(key: string, text: string): Promise<void> {
		try {
			await navigator.clipboard.writeText(text);
			copied = key;
			failed = '';
		} catch {
			failed = key;
			copied = '';
		}
	}
</script>

<svelte:head><title>/dev — {data.program.title}</title></svelte:head>

{#snippet oracles(exercise: DevRow)}
	{@const detail = data.exercises[exercise.id]}
	{#if detail === undefined}
		<p class="text-sm">упражнения нет в банках</p>
	{:else}
		<p class="text-sm">Средства: {detail.equipment}</p>
		<p class="text-sm">Цели: {detail.targets}</p>
		{#if detail.note !== undefined}
			<p class="text-sm">Заметка: {detail.note}</p>
		{/if}
		{#if detail.steps.length === 0}
			<p class="mt-2 text-sm">процедуры нет</p>
		{:else}
			<ol class="mt-2 list-decimal space-y-3 pl-5 text-sm">
				{#each detail.steps as step (step.id)}
					<li>
						<p class="font-semibold">{step.title}</p>
						<p class="text-xs opacity-70">Активны: {step.active}</p>
						{#each step.oracles as oracle (oracle.id)}
							<p class="mt-1">{oracle.predicate}</p>
							<p class="opacity-70">∀ правильно</p>
							<ul class="list-disc pl-5">
								{#each oracle.model as line, index (index)}
									<li>{line}</li>
								{/each}
							</ul>
							<p class="opacity-70">¬∃ неправильно</p>
							<ul class="list-disc pl-5">
								{#each oracle.counterModel as line, index (index)}
									<li>{line}</li>
								{/each}
							</ul>
						{/each}
					</li>
				{/each}
			</ol>
		{/if}
	{/if}
{/snippet}

{#snippet prompt(exercise: DevRow, key: string)}
	{@const text = data.exercises[exercise.id]?.prompt}
	{#if text === undefined}
		<p class="text-sm">промпта нет</p>
	{:else}
		<button
			class="btn mb-2 btn-xs"
			onclick={() => {
				void copy(key, text);
			}}
			type="button"
		>
			{#if copied === key}
				Скопировано
			{:else if failed === key}
				Не скопировано
			{:else}
				Копировать
			{/if}
		</button>
		<pre
			class="max-h-[32rem] overflow-auto rounded bg-base-100 p-2 text-xs whitespace-pre-wrap">{text}</pre>
	{/if}
{/snippet}

{#snippet exerciseRow(exercise: DevRow, scope: string)}
	{@const key = `${scope}-${exercise.id}`}
	<details
		class="collapse-arrow collapse rounded-none border-b border-base-300"
		bind:open={opened[key]}
	>
		<summary class="collapse-title flex min-h-0 justify-between gap-4 py-2 text-sm">
			<span>{exercise.name}</span>
			<span class="whitespace-nowrap opacity-70">{exercise.dose}</span>
		</summary>
		<div class="collapse-content bg-base-200">
			{#if opened[key]}
				<div class="tabs tabs-border">
					<input
						name="tab-{key}"
						class="tab"
						aria-label="Процедура"
						checked
						type="radio"
					/>
					<div class="tab-content pt-2">{@render oracles(exercise)}</div>
					<input name="tab-{key}" class="tab" aria-label="Промпт" type="radio" />
					<div class="tab-content pt-2">{@render prompt(exercise, key)}</div>
				</div>
			{/if}
		</div>
	</details>
{/snippet}

<div class="mx-auto max-w-3xl space-y-8 p-4">
	<div>
		<h1 class="text-2xl font-bold">{data.program.title}</h1>
		<p class="text-sm opacity-60">
			БАЗА — в каждом занятии без изменений. ПУЛ — из слота берётся указанное число позиций,
			ротация. Разминка: зона → контур, ни один контур не пропускается.
		</p>
	</div>

	{#each data.sections as section, index (section.id)}
		<section id="section-{section.id}" class="space-y-2">
			<h2 class="text-lg font-bold">{index + 1}. {section.title}</h2>
			{#each section.base as exercise (exercise.id)}
				<div class="flex items-baseline gap-2">
					<span class="w-16 shrink-0 text-xs font-semibold">БАЗА</span>
					<div class="grow">{@render exerciseRow(exercise, section.id)}</div>
				</div>
			{/each}
			{#each section.groups as group (group.id)}
				<details id="group-{group.id}" class="collapse-arrow collapse bg-base-300">
					<summary class="collapse-title font-bold">
						{#if group.zone === undefined}
							ПУЛ · {group.slots[0].label} — взять {group.slots[0].pick} из {group
								.slots[0].exercises.length}
						{:else}
							Зона · {group.zone.title}
						{/if}
					</summary>
					<div class="collapse-content bg-base-100">
						{#each group.slots as slot (slot.id)}
							<div id="slot-{slot.id}" class="pt-2">
								{#if group.zone !== undefined}
									<p class="font-semibold">
										{slot.contourTitle} — взять {slot.pick} из {slot.exercises
											.length}
									</p>
								{/if}
								{#if slot.rule !== undefined}
									<p class="text-xs opacity-70">Правило: {slot.rule}</p>
								{/if}
								{#if slot.allowRepeat}
									<p class="text-xs opacity-70">повтор в ротации разрешён</p>
								{/if}
								{#each slot.exercises as exercise (exercise.id)}
									{@render exerciseRow(exercise, slot.id)}
								{/each}
							</div>
						{/each}
					</div>
				</details>
			{/each}
		</section>
	{/each}

	<h2 class="text-xl font-bold">Банки</h2>
	{#each data.banks as bank (bank.slug)}
		<section id="bank-{bank.slug}" class="space-y-2">
			<h3 class="text-lg font-bold">{bank.title}</h3>
			{#each bank.zones as zone (zone.id)}
				<details id="zone-{zone.id}" class="collapse-arrow collapse bg-base-300">
					<summary class="collapse-title font-bold">Зона · {zone.title}</summary>
					<div class="collapse-content bg-base-100">
						{#each zone.contours as contour (contour.id)}
							<div id="contour-{contour.id}" class="pt-2">
								<p class="font-semibold">
									{contour.title}
									{#if contour.pick !== undefined}
										— взять {contour.pick} из {contour.exercises.length}
									{/if}
								</p>
								{#each contour.exercises as exercise (exercise.id)}
									{@render exerciseRow(exercise, contour.id)}
								{/each}
							</div>
						{/each}
					</div>
				</details>
			{/each}
		</section>
	{/each}
</div>
