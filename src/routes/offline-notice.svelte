<script lang="ts">
	import type { Connection } from './connection.svelte.ts';

	import { browserConnection } from './connection.svelte.ts';

	let { connection = browserConnection }: { connection?: Connection } = $props();
</script>

{#if connection.isOffline}
	<p class="flex items-baseline gap-2 text-sm" role="status">
		<span class="font-semibold">Нет связи</span>
		<span class="opacity-70">Отметки сохраняются на устройстве и уйдут сами</span>
		{#if connection.unsent > 0}
			<span class="ml-auto badge badge-outline whitespace-nowrap tabular-nums"
				>не отправлено {connection.unsent}</span
			>
		{/if}
	</p>
{/if}
