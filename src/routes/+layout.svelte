<script lang="ts">
	import type { Snippet } from 'svelte';

	import './layout.css';

	let { children }: { children: Snippet } = $props();
</script>

<svelte:head><link href="/favicon.svg" rel="icon" /></svelte:head>
{@render children()}
