<script lang="ts">
	import { invalidateAll } from '$app/navigation';

	import type { Person } from '../lib/account/interface/browser-account.ts';

	import {
		requestBrowserEmailCode,
		signInBrowser
	} from '../lib/account/interface/browser-account.ts';
	import { failureOf } from '../lib/account/interface/failure.ts';

	const CODE_REJECTED = 'Код не подошёл или истёк. Запросите новый.';

	let nickname = $state('');
	let email = $state('');
	let code = $state('');
	let account = $state<Person | undefined>();
	let failure = $state<string | undefined>();

	const attempt = async (event: SubmitEvent, work: () => Promise<void>): Promise<void> => {
		event.preventDefault();
		failure = undefined;
		try {
			await work();
		} catch (error) {
			failure = failureOf(error);
		}
	};
	const requestCode = (event: SubmitEvent): Promise<void> =>
		attempt(event, async () => {
			account = await requestBrowserEmailCode(nickname, email);
		});
	const confirmCode = (event: SubmitEvent, person: Person): Promise<void> =>
		attempt(event, async () => {
			const authSession = await signInBrowser(person, code, fetch);
			if (authSession === undefined) failure = CODE_REJECTED;
			else await invalidateAll();
		});
	const changeEmail = (): void => {
		account = undefined;
		code = '';
		failure = undefined;
	};
</script>

<svelte:head><title>Вход</title></svelte:head>

<main class="mx-auto max-w-xl space-y-4 p-4">
	<h1 class="text-2xl font-bold">Вход</h1>
	{#if account === undefined}
		<p>
			Никнейм и почта заводят Аккаунт. Если Аккаунт на эту почту уже есть, к нему добавится
			ключ этого устройства.
		</p>
		<form class="space-y-4" onsubmit={requestCode}>
			<fieldset class="fieldset">
				<label class="label" for="nickname">Никнейм</label>
				<input
					id="nickname"
					class="input w-full"
					autocomplete="nickname"
					required
					bind:value={nickname}
				/>
				<label class="label" for="email">Почта</label>
				<input
					id="email"
					class="input w-full"
					autocomplete="email"
					required
					type="email"
					bind:value={email}
				/>
			</fieldset>
			<div class="alert alert-warning" role="note">
				<p>
					Аккаунт живёт в связке ключей Apple или Google: там хранится passkey, и оттуда
					он приходит на ваши устройства. Потеря связки ключей означает потерю Аккаунта,
					кодов восстановления нет.
				</p>
			</div>
			{#if failure !== undefined}
				<p class="text-error" role="alert">{failure}</p>
			{/if}
			<button class="btn btn-block btn-neutral" type="submit">Получить код</button>
		</form>
	{:else}
		{@const person = account}
		<p>Код подтверждения отправлен на {person.email}.</p>
		<p class="text-sm opacity-70">Письма пока не уходят: подойдёт любой код.</p>
		<form class="space-y-4" onsubmit={(event) => confirmCode(event, person)}>
			<fieldset class="fieldset">
				<label class="label" for="code">Код</label>
				<input
					id="code"
					class="input w-full"
					autocomplete="one-time-code"
					inputmode="numeric"
					required
					bind:value={code}
				/>
			</fieldset>
			<p class="text-sm opacity-70">
				Код привяжет к Аккаунту новый passkey этого устройства, и вы войдёте.
			</p>
			{#if failure !== undefined}
				<p class="text-error" role="alert">{failure}</p>
			{/if}
			<button class="btn btn-block btn-neutral" type="submit">Создать ключ и войти</button>
		</form>
		<button class="btn btn-block btn-ghost btn-sm" onclick={changeEmail} type="button"
			>Другая почта</button
		>
	{/if}
</main>
