<script lang="ts">
	import Icon from "./Icon.svelte";
	import { formatBalance } from "$lib/format";

	type Account = { id: string; icon: string; label: string; balance: number; currency: string };

	let {
		accounts,
		selected,
		onselect,
	}: {
		accounts: Account[];
		selected: Account | undefined;
		onselect: (id: string) => void;
	} = $props();

	let searchQuery = $state("");
	let showDropdown = $state(false);
	let searchInput: HTMLInputElement | undefined = $state();

	let filteredAccounts = $derived(
		searchQuery
			? accounts.filter((a) => a.label.toLowerCase().includes(searchQuery.toLowerCase()))
			: accounts,
	);

	function select(id: string) {
		onselect(id);
		searchQuery = "";
		showDropdown = false;
	}
</script>

<div class="source-endpoint">
	<div class="source-combo">
		<div class="source-combo-icon">
			{#if searchQuery === "" && selected}
				<Icon name={selected.icon} />
			{/if}
		</div>
		<input
			class="source-combo-input"
			type="text"
			placeholder={selected && searchQuery === "" ? selected.label : "Search account…"}
			value={searchQuery}
			oninput={(e) => {
				searchQuery = (e.target as HTMLInputElement).value;
				if (searchQuery) onselect("");
				showDropdown = true;
			}}
			onfocus={() => {
				showDropdown = true;
			}}
			onblur={() => setTimeout(() => (showDropdown = false), 150)}
			bind:this={searchInput}
		/>
		{#if selected && searchQuery === ""}
			<span class="source-combo-balance"
				>{formatBalance(selected.balance, selected.currency, "none")}</span
			>
		{/if}
	</div>
	{#if showDropdown && filteredAccounts.length > 0}
		<div class="source-dropdown">
			{#each filteredAccounts as acct}
				<div
					class="source-option"
					role="button"
					tabindex="0"
					onclick={() => select(acct.id)}
					onkeydown={(e) => e.key === "Enter" && select(acct.id)}
				>
					<div class="source-option-icon"><Icon name={acct.icon} /></div>
					<div class="source-option-text">
						<span class="source-option-label">{acct.label}</span>
						<span class="source-option-balance"
							>{formatBalance(acct.balance, acct.currency, "none")}</span
						>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.source-endpoint {
		width: 100%;
		position: relative;
	}

	.source-combo {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.5rem 0.75rem;
		border-radius: 0.625rem;
		border: 0.0625rem solid rgba(255, 255, 255, 0.1);
		background: var(--meta-darker);
		color: var(--meta-light);
		transition: border-color 0.15s;
	}

	.source-combo:focus-within {
		border-color: var(--meta-accent);
	}

	.source-combo-icon {
		width: 1.75rem;
		height: 1.75rem;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.source-combo-input {
		flex: 1;
		background: transparent;
		border: none;
		outline: none;
		color: var(--meta-light);
		font-size: 0.875rem;
		font-weight: 600;
		min-width: 0;
	}

	.source-combo-input::placeholder {
		color: rgba(255, 255, 255, 0.35);
	}

	.source-combo-balance {
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--meta-silver);
		white-space: nowrap;
	}

	.source-dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		margin-top: 0.25rem;
		background: var(--meta-darker);
		border: 0.0625rem solid rgba(255, 255, 255, 0.1);
		border-radius: 0.625rem;
		overflow-y: auto;
		z-index: 350;
		max-height: 9rem;
	}

	.source-option {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.5rem 0.75rem;
		background: transparent;
		color: var(--meta-light);
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		outline: none;
	}

	.source-option:hover {
		background: rgba(255, 255, 255, 0.05);
	}
	.source-option:focus-visible {
		outline: none;
	}

	.source-option-icon {
		width: 1.75rem;
		height: 1.75rem;
		flex-shrink: 0;
	}

	.source-option-text {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.source-option-label {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--meta-light);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		text-align: left;
	}

	.source-option-balance {
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--meta-silver);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
