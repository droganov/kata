<script lang="ts">
	import type { AccountScreen } from './+page.ts';

	let { data }: { data: AccountScreen } = $props();

	const HOME_PATH = '/';
</script>

<svelte:head><title>Аккаунт</title></svelte:head>

<main class="mx-auto max-w-xl space-y-4 p-4">
	<a class="btn btn-ghost btn-sm" href={HOME_PATH}>Программы</a>
	<h1 class="text-2xl font-bold">Аккаунт</h1>
	<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
		<dt class="opacity-70">Никнейм</dt>
		<dd>{data.signedIn.account.nickname}</dd>
		<dt class="opacity-70">Почта</dt>
		<dd>{data.signedIn.account.email}</dd>
	</dl>
</main>
