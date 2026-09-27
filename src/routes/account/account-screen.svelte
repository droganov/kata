<script lang="ts">
	import { invalidateAll } from '$app/navigation';

	import type { AccountScreen } from './+page.ts';

	import {
		revokeBrowserAuthSession,
		revokeOtherBrowserAuthSessions
	} from '../../lib/account/interface/browser-account.ts';
	import { momentOf } from '../../lib/account/interface/moment.ts';

	let { data }: { data: AccountScreen } = $props();

	const HOME_PATH = '/';

	const revoke = async (authSession: string): Promise<void> => {
		await revokeBrowserAuthSession(data.signedIn, authSession, fetch);
		await invalidateAll();
	};
	const revokeOthers = async (): Promise<void> => {
		await revokeOtherBrowserAuthSessions(data.signedIn);
		await invalidateAll();
	};
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
	<h2 class="text-lg font-bold">Сеансы</h2>
	<p class="text-sm opacity-70">
		Погашенный Сеанс теряет доступ к Аккаунту. Данные, которые уже лежат на том устройстве, этим
		не стираются.
	</p>
	<ul class="space-y-3">
		{#each data.authSessions as authSession (authSession.id)}
			{@const isCurrent = authSession.id === data.signedIn.authSession.id}
			<li class="card bg-base-200">
				<div class="card-body flex-row items-center justify-between gap-3 p-4">
					<div>
						<p class="font-bold">
							{authSession.deviceLabel}
							{#if isCurrent}
								<span class="badge badge-outline badge-sm">это устройство</span>
							{/if}
						</p>
						<p class="text-sm opacity-70">Вход {momentOf(authSession.createdAt)}</p>
					</div>
					<button
						class="btn btn-outline btn-sm"
						onclick={() => revoke(authSession.id)}
						type="button">Погасить</button
					>
				</div>
			</li>
		{/each}
	</ul>
	{#if data.authSessions.length > 1}
		<button class="btn btn-block btn-outline" onclick={revokeOthers} type="button"
			>Погасить все, кроме текущего</button
		>
	{/if}
</main>
