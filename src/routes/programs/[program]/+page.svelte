<script lang="ts">
	import type { SessionView } from '../../../lib/session/application/session-views.ts';

	let { data }: { data: SessionView } = $props();
</script>

<svelte:head><title>{data.title}</title></svelte:head>

<main class="mx-auto max-w-xl space-y-6 p-4">
	<h1 class="text-2xl font-bold">{data.title}</h1>
	{#each data.blocks as block (block.id)}
		<section class="space-y-2">
			<h2 class="text-lg font-semibold">{block.name}</h2>
			{#if block.items.length === 0}
				<p class="text-sm opacity-60">Упражнений нет</p>
			{:else}
				<ol class="divide-y divide-base-300">
					{#each block.items as item (item.ord)}
						<li>
							<details class="collapse-arrow collapse rounded-none">
								<summary
									class="collapse-title flex min-h-0 justify-between gap-4 py-2"
								>
									<span>{item.name}</span>
									<span class="whitespace-nowrap opacity-70">{item.dose}</span>
								</summary>
								<div class="collapse-content space-y-2 bg-base-200 text-sm">
									<p>Оборудование: {item.detail.equipment}</p>
									<p>Мишени: {item.detail.targets}</p>
									{#if item.detail.note !== undefined}
										<p>Заметка: {item.detail.note}</p>
									{/if}
									{#if item.detail.steps.length === 0}
										<p>Процедуры нет</p>
									{:else}
										<ol class="list-decimal space-y-3 pl-5">
											{#each item.detail.steps as step (step.id)}
												<li>
													<p class="font-semibold">{step.title}</p>
													<p class="text-xs opacity-70">
														Активны: {step.active}
													</p>
													{#each step.oracles as oracle (oracle.id)}
														<p class="mt-1">{oracle.predicate}</p>
														<p class="opacity-70">∀ правильно</p>
														<ul class="list-disc pl-5">
															{#each oracle.model as line, index (index)}
																<li>{line}</li>
															{/each}
														</ul>
														<p class="opacity-70">¬∃ неправильно</p>
														<ul class="list-disc pl-5">
															{#each oracle.counterModel as line, index (index)}
																<li>{line}</li>
															{/each}
														</ul>
													{/each}
												</li>
											{/each}
										</ol>
									{/if}
								</div>
							</details>
						</li>
					{/each}
				</ol>
			{/if}
		</section>
	{/each}
</main>
