<script generics="Screen extends { readonly signedIn: SignedIn }" lang="ts">
	import type { Snippet } from 'svelte';

	import type { SignedIn, SignedOut } from '../lib/account/interface/browser-account.ts';

	import SignIn from './sign-in.svelte';

	let { children, data }: { children: Snippet<[Screen]>; data: Screen | SignedOut } = $props();
</script>

{#if data.signedIn === undefined}
	<SignIn />
{:else}
	{@render children(data)}
{/if}
