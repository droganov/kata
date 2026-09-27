<script lang="ts">
	import type { Snippet } from 'svelte';

	import type { InstallScreen } from './install-promotion.ts';
	import type { Install } from './install.svelte.ts';

	import InstallInstruction from './install-instruction.svelte';
	import { unsupportedTextOf } from './install-promotion.ts';
	import { browserInstall } from './install.svelte.ts';

	let { children, install = browserInstall }: { children: Snippet; install?: Install } = $props();

	const DESKTOP: InstallScreen['device'] = 'desktop';
	const ROOT_PATH = '/';

	let isCopied = $state(false);
	const unsupported = $derived(unsupportedTextOf(install.instruction));
	const isDesktop = $derived(install.screen.device === DESKTOP);

	const forgetCopy = (): void => {
		isCopied = false;
	};
	const copyAddress = async (): Promise<void> => {
		await navigator.clipboard.writeText(new URL(ROOT_PATH, location.href).href);
		isCopied = true;
	};
</script>

<svelte:window onfocus={forgetCopy} />

{#if install.isShown}
	<main class="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 p-6">
		<header class="flex flex-col items-center gap-4 text-center">
			<img class="size-24 rounded-3xl shadow-lg" alt="" src="/icons/icon-192.png" />
			<h1 class="text-4xl font-bold">Training</h1>
			<p class="text-lg opacity-80">
				Занятие, собранное под вас: каждый раз заново по правилам Программы и с учётом того,
				что вы делали последние три недели.
			</p>
		</header>

		{#if unsupported === undefined}
			<section class="flex flex-col gap-4" aria-labelledby="install-heading">
				<h2 id="install-heading" class="text-center text-2xl font-bold">
					{#if isDesktop}Поставьте Training на компьютер{:else}Поставьте Training на экран
						«Домой»{/if}
				</h2>
				<ul class="space-y-2">
					<li>
						{#if isDesktop}✓ Открывается в своём окне, из Dock или с панели задач{:else}✓
							Открывается одним касанием, на весь экран, без адресной строки{/if}
					</li>
					{#if install.screen.isSafari}
						<li role="note">
							{#if isDesktop}✓ История не пропадёт: Safari стирает данные сайтов через
								семь дней без захода, у установленного приложения такого срока нет{:else}✓
								История не пропадёт: на iPhone без установки Safari стирает
								локальные данные через семь дней без захода, у установленного
								приложения такого срока нет{/if}
						</li>
					{/if}
				</ul>
				<InstallInstruction {install} />
			</section>
		{:else}
			<section class="flex flex-col gap-4" aria-labelledby="install-heading">
				<h2 id="install-heading" class="text-center text-2xl font-bold">
					В этом браузере поставить нельзя
				</h2>
				<p>{unsupported}</p>
				<button
					class="btn btn-block btn-lg btn-primary"
					onclick={copyAddress}
					type="button"
				>
					{#if isCopied}Адрес скопирован{:else}Скопировать адрес{/if}
				</button>
			</section>
		{/if}

		<button
			class="link self-center text-sm link-hover opacity-60"
			onclick={install.refuse}
			type="button">Продолжить в браузере</button
		>
	</main>
{:else}
	{@render children()}
{/if}
