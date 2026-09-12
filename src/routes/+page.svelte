<script lang="ts">
	import type { ProgramCardView } from '../lib/session/application/session-views.ts';

	let { data }: { data: { readonly programs: readonly ProgramCardView[] } } = $props();
</script>

<svelte:head><title>Программы</title></svelte:head>

<main class="mx-auto max-w-xl space-y-4 p-4">
	<h1 class="text-2xl font-bold">Программы</h1>
	<ul class="menu w-full rounded-box bg-base-200">
		{#each data.programs as program (program.id)}
			<li><a href="/programs/{program.id}">{program.title}</a></li>
		{/each}
	</ul>
</main>
