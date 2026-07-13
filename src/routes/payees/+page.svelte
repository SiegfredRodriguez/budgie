<script lang="ts">
	import { goto } from "$app/navigation";
	import Store from "@lucide/svelte/icons/store";
	import Plus from "@lucide/svelte/icons/plus";
	import NewPayeeDialog from "$lib/components/NewPayeeDialog.svelte";
	import Icon from "$lib/components/Icon.svelte";
	import { payees, payeesLoading, createPayee } from "$lib/stores/payees";
	import { session } from "$lib/stores/auth";

	let showNewPayee = $state(false);
	let query = $state("");
	let filtered = $derived(
		query
			? $payees.filter((i) => i.label.toLowerCase().includes(query.toLowerCase()))
			: $payees,
	);

	function resetDialog() {
		showNewPayee = false;
		query = "";
	}

	async function handleDone(data: { label: string; icon: string; tagIds: string[] }) {
		try {
			await createPayee(data.label, data.icon, data.tagIds, $session!.user.id);
		} catch (e) {
			console.error("Failed to create payee", e);
			return;
		}
		resetDialog();
	}
</script>

<div class="scroller">
	<div class="header">
		<button class="back-btn" onclick={() => goto("/expenses")}>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
		</button>
		<h1 class="title">Payees</h1>
	</div>

	<div class="search-row">
		<input
			class="search-input"
			type="text"
			placeholder="Search payees…"
			value={query}
			oninput={(e) => query = (e.target as HTMLInputElement).value}
		/>
	</div>

	{#if $payeesLoading && $payees.length === 0}
		<div class="spinner-wrapper">
			<div class="spinner"></div>
		</div>
	{:else}
		<div class="list">
			{#each filtered as item (item.id)}
				<div class="row">
					<div class="row-icon">
						<Icon name={item.icon || "store"} />
					</div>
					<div class="row-content">
						<span class="label">{item.label}</span>
						{#if item.tags?.length}
							<div class="tag-pills">
								{#each item.tags as tag}
									<span class="tag-pill">{tag.value}</span>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			{/each}
			{#if filtered.length === 0}
				<button class="row" onclick={() => showNewPayee = true}>
					<Plus size={18} strokeWidth={2} />
					<span class="label" style="color: var(--meta-accent);">Create New Payee</span>
				</button>
			{/if}
		</div>
	{/if}
</div>

<NewPayeeDialog show={showNewPayee} {query} onclose={() => showNewPayee = false} onsubmit={handleDone} />

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

	.spinner-wrapper {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 4rem 1rem;
	}

	.spinner {
		width: 2rem;
		height: 2rem;
		border: 0.1875rem solid rgba(255, 255, 255, 0.1);
		border-top-color: var(--meta-accent);
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
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
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.875rem 1rem;
		background: rgba(255, 255, 255, 0.04);
		border: 0.0625rem solid rgba(255, 255, 255, 0.06);
		border-radius: 0.75rem;
		color: var(--meta-light);
	}

	.row-icon {
		width: 1.5rem;
		height: 1.5rem;
		flex-shrink: 0;
		margin-top: 0.0625rem;
	}

	.row-content {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		min-width: 0;
		flex: 1;
	}

	.label {
		font-size: 0.9375rem;
		font-weight: 500;
	}

	.tag-pills {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.tag-pill {
		display: inline-block;
		padding: 0.125rem 0.5rem;
		border-radius: 0.75rem;
		border: 0.0625rem solid var(--meta-blue);
		background: transparent;
		color: var(--meta-blue);
		font-size: 0.75rem;
		font-weight: 500;
		line-height: 1.25;
		white-space: nowrap;
	}
</style>
