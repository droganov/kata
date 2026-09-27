<script lang="ts">
	import type { SignedOut } from '../../../lib/account/interface/browser-account.ts';
	import type { SessionPage } from './+page.ts';

	import Authorized from '../../authorized.svelte';
	import SessionScreen from './session-screen.svelte';

	let { data }: { data: SessionPage | SignedOut } = $props();
</script>

<Authorized {data}>
	{#snippet children(screen)}
		<SessionScreen data={screen} />
	{/snippet}
</Authorized>
