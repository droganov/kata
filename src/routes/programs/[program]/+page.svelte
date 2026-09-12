<script lang="ts">
	import type { SessionView } from '../../../lib/session/application/session-views.ts';

	let { data }: { data: SessionView } = $props();
</script>

<svelte:head><title>{data.title}</title></svelte:head>

<main class="mx-auto max-w-xl space-y-6 p-4">
	<h1 class="text-2xl font-bold">{data.title}</h1>
	{#each data.blocks as block (block.id)}
		<section class="space-y-2">
			<h2 class="text-lg font-semibold">{block.name}</h2>
			{#if block.items.length === 0}
				<p class="text-sm opacity-60">Упражнений нет</p>
			{:else}
				<ol class="divide-y divide-base-300">
					{#each block.items as item (item.ord)}
						<li class="flex justify-between gap-4 py-2">
							<span>{item.name}</span>
							<span class="whitespace-nowrap opacity-70">{item.dose}</span>
						</li>
					{/each}
				</ol>
			{/if}
		</section>
	{/each}
</main>
