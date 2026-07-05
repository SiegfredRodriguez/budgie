<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { goto } from '$app/navigation';

	onMount(async () => {
		await supabase.auth.getSession();
		goto('/financial');
	});
</script>

<div class="callback">
	<p>Signing you in...</p>
</div>

<style>
	.callback {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		color: var(--meta-silver);
		font-size: 0.938rem;
	}
</style>
