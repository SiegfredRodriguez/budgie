<script lang="ts">
	import { goto } from "$app/navigation";
	import Tag from "@lucide/svelte/icons/tag";
	import Plus from "@lucide/svelte/icons/plus";
	import NewTagDialog from "$lib/components/NewTagDialog.svelte";

	const items = [
		{ id: "1", value: "Groceries" },
		{ id: "2", value: "Utilities" },
		{ id: "3", value: "Transportation" },
		{ id: "4", value: "Dining Out" },
		{ id: "5", value: "Entertainment" },
		{ id: "6", value: "Healthcare" },
	];

	let showNewTag = $state(false);
	let query = $state("");
	let filtered = $derived(
		query ? items.filter((i) => i.value.toLowerCase().includes(query.toLowerCase())) : items,
	);
</script>

<div class="scroller">
	<div class="header">
		<button class="back-btn" onclick={() => goto("/expenses")}>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
		</button>
		<h1 class="title">Tags</h1>
	</div>

	<div class="search-row">
		<input
			class="search-input"
			type="text"
			placeholder="Search tags…"
			value={query}
			oninput={(e) => query = (e.target as HTMLInputElement).value}
		/>
	</div>

	<div class="list">
		{#each filtered as item}
			<div class="row">
				<Tag size={18} strokeWidth={2} />
				<span class="label">{item.value}</span>
			</div>
		{/each}
		{#if query && filtered.length === 0}
			<button class="row" onclick={() => showNewTag = true}>
				<Plus size={18} strokeWidth={2} />
				<span class="label" style="color: var(--meta-accent);">Create New Tag</span>
			</button>
		{/if}
	</div>
</div>

<NewTagDialog show={showNewTag} value={query} onclose={() => showNewTag = false} ondone={() => showNewTag = false} />

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

	.search-row {
		padding: 0 1rem 0.5rem;
	}

	.search-input {
		width: 100%;
		height: 2.5rem;
		padding: 0 0.75rem;
		border-radius: 0.625rem;
		border: 0.0625rem solid rgba(255, 255, 255, 0.1);
		background: var(--meta-darker);
		color: var(--meta-light);
		font-size: 0.9375rem;
		outline: none;
		transition: border-color 0.15s;
		box-sizing: border-box;
	}

	.search-input:focus {
		border-color: var(--meta-accent);
	}

	.search-input::placeholder {
		color: rgba(255, 255, 255, 0.25);
	}

	.list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.5rem 1rem 6rem;
	}

	button.row {
		all: unset;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.875rem 1rem;
		background: rgba(255, 255, 255, 0.04);
		border: 0.0625rem solid rgba(255, 255, 255, 0.06);
		border-radius: 0.75rem;
		color: var(--meta-light);
		width: 100%;
		box-sizing: border-box;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	button.row:active {
		background: rgba(255, 255, 255, 0.08);
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
