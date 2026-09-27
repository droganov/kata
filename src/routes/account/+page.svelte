<script lang="ts">
	import type { SignedOut } from '../../lib/account/interface/browser-account.ts';
	import type { AccountScreen as Screen } from './+page.ts';

	import Authorized from '../authorized.svelte';
	import AccountScreen from './account-screen.svelte';

	let { data }: { data: Screen | SignedOut } = $props();
</script>

<Authorized {data}>
	{#snippet children(screen)}
		<AccountScreen data={screen} />
	{/snippet}
</Authorized>
