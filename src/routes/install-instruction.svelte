<script lang="ts">
	import type { InstallInstruction, InstallStep } from './install-promotion.ts';
	import type { Install } from './install.svelte.ts';

	import { installStepsOf } from './install-promotion.ts';

	let { install }: { install: Install } = $props();

	const PROMPT: InstallInstruction['kind'] = 'prompt';
	const SHARE: InstallStep['icon'] = 'share';

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
	<ol class="space-y-3">
		{#each steps as step, index (step.text)}
			<li class="flex items-center gap-4 rounded-box bg-base-200 p-4">
				<span
					class="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-content"
					>{index + 1}</span
				>
				<span class="grow">{step.text}</span>
				{#if step.icon === SHARE}
					<svg
						class="size-7 shrink-0 text-primary"
						aria-label="кнопка «Поделиться»"
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
					</svg>
				{/if}
			</li>
		{/each}
	</ol>
{/if}
