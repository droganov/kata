<script lang="ts">
	import { invalidateAll } from '$app/navigation';

	import type { DeviceAccount, SignedIn } from '../lib/account/interface/browser-account.ts';

	import {
		forgetBrowserAccount,
		revokeBrowserAuthSession,
		switchBrowserAccount
	} from '../lib/account/interface/browser-account.ts';

	let { accounts, signedIn }: { accounts: readonly DeviceAccount[]; signedIn: SignedIn } =
		$props();

	const ACCOUNT_PATH = '/account';
	const KEY_DECLINED = 'Ключ не подтвердил переключение.';

	let failure = $state<string | undefined>();
	const avatar = $derived(signedIn.account.nickname.at(0)?.toUpperCase());

	const switchTo = async (known: DeviceAccount): Promise<void> => {
		failure = undefined;
		const authSession = await switchBrowserAccount(signedIn, known, fetch);
		if (authSession === undefined) failure = KEY_DECLINED;
		else await invalidateAll();
	};
	const forget = async (known: DeviceAccount): Promise<void> => {
		await forgetBrowserAccount(known.account);
		await invalidateAll();
	};
	const signInAnother = async (): Promise<void> => {
		await revokeBrowserAuthSession(signedIn, signedIn.authSession.id, fetch);
		await invalidateAll();
	};
</script>

<details class="dropdown dropdown-end">
	<summary class="btn btn-circle btn-neutral" aria-label="Меню Аккаунта">{avatar}</summary>
	<div class="dropdown-content z-10 mt-2 w-72 space-y-2 rounded-box bg-base-200 p-3 shadow">
		<ul class="menu w-full p-0">
			<li class="menu-title">Сейчас</li>
			<li><a href={ACCOUNT_PATH}>{signedIn.account.nickname}</a></li>
			{#if accounts.length > 0}
				<li class="menu-title">Входили на этом устройстве</li>
			{/if}
			{#each accounts as known (known.account)}
				<li class="flex-row flex-nowrap">
					<button
						class="grow"
						aria-label="Переключиться на {known.nickname}"
						onclick={() => switchTo(known)}
						type="button">{known.nickname}</button
					>
					<button
						aria-label="Убрать {known.nickname} из списка"
						onclick={() => forget(known)}
						type="button">✕</button
					>
				</li>
			{/each}
			<li><button onclick={signInAnother} type="button">Войти в другой Аккаунт</button></li>
		</ul>
		<p class="text-xs opacity-70">
			Переключение подтверждается ключом. Убранный из списка Аккаунт вернётся со всей Историей
			после входа.
		</p>
		{#if failure !== undefined}
			<p class="text-sm text-error" role="alert">{failure}</p>
		{/if}
	</div>
</details>
