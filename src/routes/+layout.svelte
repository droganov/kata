<script lang="ts">
	import './layout.css';
	import type { Snippet } from 'svelte';

	import favicon from '$lib/assets/favicon.svg';

	let { children }: { children: Snippet } = $props();
</script>

<svelte:head><link href={favicon} rel="icon" /></svelte:head>
{@render children()}
