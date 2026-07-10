<script lang="ts">
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";
	import { supabase } from "$lib/supabase";
	import Tag from "@lucide/svelte/icons/tag";

	let items = $state<Array<{ id: string; value: string }>>([]);
	let loading = $state(true);

	onMount(async () => {
		const { data } = await supabase.from("tag").select("id,value").order("value");
		if (data) items = data;
		loading = false;
	});
</script>

<div class="scroller">
	<div class="header">
		<button class="back-btn" onclick={() => goto("/expenses")}>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
		</button>
		<h1 class="title">Tags</h1>
	</div>

	<div class="list">
		{#if loading}
			<div class="empty">Loading…</div>
		{:else if items.length === 0}
			<div class="empty">No tags yet</div>
		{:else}
			{#each items as item}
				<div class="row">
					<Tag size={18} strokeWidth={2} />
					<span class="label">{item.value}</span>
				</div>
			{/each}
		{/if}
	</div>
</div>

<style>
	.scroller {
		height: 100%;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
	}

	.header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		padding-top: calc(0.5rem + env(safe-area-inset-top));
	}

	.back-btn {
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 50%;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		color: var(--meta-silver);
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	.back-btn svg {
		width: 1.25rem;
		height: 1.25rem;
	}

	.title {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--meta-light);
		margin: 0;
	}

	.list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.5rem 1rem 6rem;
	}

	.row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.875rem 1rem;
		background: rgba(255, 255, 255, 0.04);
		border: 0.0625rem solid rgba(255, 255, 255, 0.06);
		border-radius: 0.75rem;
		color: var(--meta-light);
	}

	.label {
		font-size: 0.9375rem;
		font-weight: 500;
	}

	.empty {
		text-align: center;
		color: var(--meta-silver);
		font-size: 0.875rem;
		padding: 3rem 1rem;
	}
</style>
