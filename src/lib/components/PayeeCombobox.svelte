<script lang="ts">
	import X from "@lucide/svelte/icons/x";

	type Payee = { id: string; label: string; icon: string };
	type SelectedPayee = { id?: string; label: string; novel: boolean } | null;

	let {
		payees,
		selected,
		onselect,
		oncreate,
		onclear,
	}: {
		payees: Payee[];
		selected: SelectedPayee;
		onselect: (payee: { id: string; label: string }) => void;
		oncreate: (label: string) => void;
		onclear: () => void;
	} = $props();

	let payeeQuery = $state("");
	let showPayeeDropdown = $state(false);
	let payeeInput: HTMLInputElement | undefined = $state();

	let filteredPayees = $derived(
		payeeQuery
			? payees.filter((p) => p.label.toLowerCase().includes(payeeQuery.toLowerCase()))
			: payees,
	);
	let showCreateOption = $derived(
		payeeQuery.trim() !== "" &&
			!payees.some((p) => p.label.toLowerCase() === payeeQuery.trim().toLowerCase()),
	);

	function handleClear() {
		onclear();
		requestAnimationFrame(() => payeeInput?.focus());
	}

	function selectExisting(payee: Payee) {
		onselect({ id: payee.id, label: payee.label });
		payeeQuery = "";
		showPayeeDropdown = false;
	}

	function selectNovel(payeeLabel: string) {
		oncreate(payeeLabel);
		payeeQuery = "";
		showPayeeDropdown = false;
	}

	function handleKey(e: KeyboardEvent) {
		if (e.key === "Escape") {
			showPayeeDropdown = false;
		} else if (e.key === "Enter") {
			e.preventDefault();
			if (filteredPayees.length > 0) {
				selectExisting(filteredPayees[0]);
			} else if (payeeQuery.trim()) {
				selectNovel(payeeQuery.trim());
			}
		}
	}
</script>

<div class="payee-endpoint">
	<div class="pills">
		{#if selected}
			<span class="pill {selected.novel ? 'pill-novel' : 'pill-existing'}">
				{selected.novel ? "+ " : ""}{selected.label}
				<button class="pill-x" onclick={handleClear} aria-label="Remove payee">
					<X size={12} strokeWidth={3} />
				</button>
			</span>
		{:else}
			<input
				class="pill-text"
				type="text"
				placeholder="Search payee…"
				value={payeeQuery}
				oninput={(e) => {
					payeeQuery = (e.target as HTMLInputElement).value;
					showPayeeDropdown = true;
				}}
				onfocus={() => {
					showPayeeDropdown = true;
				}}
				onblur={() => setTimeout(() => (showPayeeDropdown = false), 150)}
				onkeydown={handleKey}
				bind:this={payeeInput}
			/>
		{/if}
	</div>
	{#if showPayeeDropdown && (filteredPayees.length > 0 || showCreateOption)}
		<div class="source-dropdown">
			{#each filteredPayees as payee (payee.id)}
				<div
					class="source-option"
					role="button"
					tabindex="0"
					onmousedown={() => selectExisting(payee)}
					onkeydown={(e) => e.key === "Enter" && selectExisting(payee)}
				>
					<span class="payee-label">{payee.label}</span>
				</div>
			{/each}
			{#if showCreateOption}
				<div
					class="source-option source-option-novel"
					role="button"
					tabindex="0"
					onmousedown={() => selectNovel(payeeQuery.trim())}
					onkeydown={(e) => e.key === "Enter" && selectNovel(payeeQuery.trim())}
				>
					<span class="payee-label">+ Create "{payeeQuery.trim()}"</span>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.payee-endpoint {
		width: 100%;
		position: relative;
	}

	.pills {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.375rem;
		min-height: 2.5rem;
		padding: 0.375rem 0.625rem;
		border-radius: 0.625rem;
		border: 0.0625rem solid rgba(255, 255, 255, 0.1);
		background: var(--meta-darker);
		transition: border-color 0.15s;
	}

	.pills:focus-within {
		border-color: var(--meta-accent);
	}

	.pill {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.1875rem 0.5rem 0.1875rem 0.625rem;
		border-radius: 1rem;
		font-size: 0.8125rem;
		font-weight: 600;
		white-space: nowrap;
	}

	.pill-existing {
		background: rgba(64, 224, 208, 0.12);
		color: var(--meta-accent);
	}

	.pill-novel {
		background: rgba(234, 179, 8, 0.15);
		color: #fff;
	}

	.pill-x {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1rem;
		height: 1rem;
		border-radius: 50%;
		border: none;
		background: transparent;
		color: inherit;
		cursor: pointer;
		padding: 0;
		transition: background 0.1s;
		-webkit-tap-highlight-color: transparent;
	}

	.pill-x:hover {
		background: rgba(255, 255, 255, 0.15);
	}

	.pill-text {
		flex: 1;
		min-width: 5rem;
		background: transparent;
		border: none;
		outline: none;
		color: var(--meta-light);
		font-size: 0.875rem;
		padding: 0.125rem 0;
	}

	.pill-text::placeholder {
		color: rgba(255, 255, 255, 0.25);
	}

	.payee-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--meta-light);
	}

	.source-option-novel .payee-label {
		color: #eab308;
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
</style>
