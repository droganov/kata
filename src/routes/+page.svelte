<script lang="ts">
	import type { SignedOut } from '../lib/account/interface/browser-account.ts';
	import type { ProgramList as Screen } from './+page.ts';

	import Authorized from './authorized.svelte';
	import ProgramList from './program-list.svelte';

	let { data }: { data: Screen | SignedOut } = $props();
</script>

<Authorized {data}>
	{#snippet children(screen)}
		<ProgramList data={screen} />
	{/snippet}
</Authorized>
