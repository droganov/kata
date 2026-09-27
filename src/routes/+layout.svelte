<script lang="ts">
	import type { Snippet } from 'svelte';

	import HomeScreen from './home-screen.svelte';
	import './layout.css';

	let { children, data }: { children: Snippet; data: { readonly hasExpiredSession: boolean } } =
		$props();
</script>

<HomeScreen>
	{#if data.hasExpiredSession}
		<p class="mx-auto mt-4 alert max-w-xl alert-info" role="status">
			Занятие закрылось само: два часа без Отметок. Выполненное ушло в Историю.
		</p>
	{/if}
	{@render children()}
</HomeScreen>
