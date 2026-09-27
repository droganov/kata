<script lang="ts">
	import type { Snippet } from 'svelte';

	import HomeScreen from './home-screen.svelte';
	import './layout.css';
	import { followWorkerUpdates } from './worker-update.ts';

	let { children, data }: { children: Snippet; data: { readonly hasExpiredSession: boolean } } =
		$props();

	$effect(() => {
		followWorkerUpdates({
			container: navigator.serviceWorker,
			document,
			reload: () => {
				location.reload();
			}
		});
	});
</script>

<HomeScreen>
	{#if data.hasExpiredSession}
		<p class="mx-auto mt-4 alert max-w-xl alert-info" role="status">
			Занятие закрылось само: два часа без Отметок. Выполненное ушло в Историю.
		</p>
	{/if}
	{@render children()}
</HomeScreen>
