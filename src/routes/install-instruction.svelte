<script lang="ts">
	import type { InstallInstruction, InstallStep } from './install-promotion.ts';
	import type { Install } from './install.svelte.ts';

	import { installStepsOf } from './install-promotion.ts';

	let { install }: { install: Install } = $props();

	const PROMPT: InstallInstruction['kind'] = 'prompt';
	const SHARE: InstallStep['icon'] = 'share';
	const MORE: InstallStep['icon'] = 'more';
	const ADD_TO_HOME: InstallStep['icon'] = 'add-to-home';
	const ICON_CLASS = 'ml-1 inline size-[1.15em] align-[-0.2em]';

	const steps = $derived(installStepsOf(install.instruction));
</script>

{#if install.instruction.kind === PROMPT}
	{#if install.canPrompt}
		<button class="btn btn-block btn-lg btn-primary" onclick={install.prompt} type="button"
			>Установить Kato.one</button
		>
		<p class="text-center text-sm opacity-70">
			Бесплатно, одним нажатием, без магазина приложений.
		</p>
	{:else}
		<button class="btn btn-block btn-lg btn-primary" disabled type="button"
			>Готовим установку…</button
		>
		<p class="text-center text-sm opacity-70">
			Если кнопка не оживает, нажмите значок установки справа в адресной строке браузера.
		</p>
	{/if}
{:else}
	<ol class="list-decimal space-y-1.5 pl-6 marker:opacity-60" aria-label="Как поставить">
		{#each steps as step (step.text)}
			<li>
				{step.text}{#if step.icon === SHARE}<svg
						class={ICON_CLASS}
						aria-label="значок «Поделиться»"
						fill="none"
						role="img"
						stroke="currentColor"
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						viewBox="0 0 24 24"
					>
						<path d="M12 15V3M8 7l4-4 4 4" />
						<path d="M8 11H6v10h12V11h-2" />
					</svg>{:else if step.icon === MORE}<svg
						class={ICON_CLASS}
						aria-label="значок «три точки»"
						fill="currentColor"
						role="img"
						viewBox="0 0 24 24"
					>
						<circle cx="5" cy="12" r="2" />
						<circle cx="12" cy="12" r="2" />
						<circle cx="19" cy="12" r="2" />
					</svg>{:else if step.icon === ADD_TO_HOME}<svg
						class={ICON_CLASS}
						aria-label="значок «На экран «Домой»»"
						fill="none"
						role="img"
						stroke="currentColor"
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						viewBox="0 0 24 24"
					>
						<rect height="18" rx="4" width="18" x="3" y="3" />
						<path d="M12 8v8M8 12h8" />
					</svg>{/if}
			</li>
		{/each}
	</ol>
{/if}
