<script lang="ts">
	import Icon from "./Icon.svelte";

	let {
		show,
		accounts,
		accountsLoading = false,
		onclose,
		onsubmit,
	}: {
		show: boolean;
		accounts: Array<{ id: string; icon: string; label: string; balance: number; currency: string }>;
		accountsLoading?: boolean;
		onclose: () => void;
		onsubmit: (data: { account_id: string; amount: number; label: string; date: string }) => void;
	} = $props();

	let amount = $state("");
	let label = $state("");
	let sourceId = $state("");
	let searchQuery = $state("");
	let showSourceDropdown = $state(false);
	let dateStr = $state(new Date().toISOString().slice(0, 10));
	let busy = $state(false);

	let selectedSource = $derived(accounts.find((a) => a.id === sourceId));
	let filteredAccounts = $derived(
		searchQuery
			? accounts.filter((a) => a.label.toLowerCase().includes(searchQuery.toLowerCase()))
			: accounts,
	);
	let amountInput: HTMLInputElement | undefined = $state();
	let searchInput: HTMLInputElement | undefined = $state();

	function fmt(n: number, c: string): string {
		const p = Math.abs(n).toFixed(2).split(".");
		p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		return `${c} ${p[0]}.${p[1]}`;
	}

	$effect(() => {
		if (show) {
			amount = "";
			label = "";
			sourceId = accounts.length > 0 ? accounts[0].id : "";
			searchQuery = "";
			showSourceDropdown = false;
			dateStr = new Date().toISOString().slice(0, 10);
			busy = false;
			amountInput?.focus();
		}
	});

	function handleOverlay(e: MouseEvent) {
		if (e.target === e.currentTarget) onclose();
	}

	function handleKey(e: KeyboardEvent) {
		if (e.key === "Escape") onclose();
	}

	function selectSource(id: string) {
		sourceId = id;
		searchQuery = "";
		showSourceDropdown = false;
	}

	async function handleSubmit() {
		if (busy) return;
		if (!amount || !label || !sourceId || !dateStr) return;
		busy = true;
		try {
			await onsubmit({
				account_id: sourceId,
				amount: parseFloat(amount),
				label,
				date: dateStr,
			});
			onclose();
		} finally {
			busy = false;
		}
	}
</script>

{#if show}
	<div class="overlay" onclick={handleOverlay} onkeydown={handleKey} role="presentation">
		<div class="modal" role="dialog" aria-modal="true" tabindex="-1">
			<div class="modal-row">
				<input class="modal-input" type="number" inputmode="numeric" placeholder="Amount" value={amount} oninput={(e) => { const el = e.target as HTMLInputElement; let v = el.value; if (v.startsWith('-')) { v = v.replace('-', ''); el.value = v; } amount = v; }} bind:this={amountInput} />
			</div>

			<div class="modal-row">
				<input class="modal-input" type="text" placeholder="Label" value={label} oninput={(e) => label = (e.target as HTMLInputElement).value} />
			</div>

			<div class="source-endpoint">
				<div class="source-combo">
					<div class="source-combo-icon">
						{#if searchQuery === "" && selectedSource}
							<Icon name={selectedSource.icon} />
						{/if}
					</div>
					<input
						class="source-combo-input"
						type="text"
						placeholder={selectedSource && searchQuery === "" ? selectedSource.label : "Search account…"}
						value={searchQuery}
						oninput={(e) => {
							searchQuery = (e.target as HTMLInputElement).value;
							if (searchQuery) sourceId = "";
							showSourceDropdown = true;
						}}
						onfocus={() => { showSourceDropdown = true; }}
						onblur={() => setTimeout(() => showSourceDropdown = false, 150)}
						bind:this={searchInput}
					/>
					{#if selectedSource && searchQuery === ""}
						<span class="source-combo-balance">{fmt(selectedSource.balance, selectedSource.currency)}</span>
					{/if}
				</div>
				{#if showSourceDropdown && filteredAccounts.length > 0}
					<div class="source-dropdown">
						{#each filteredAccounts as acct}
							<div class="source-option" role="button" tabindex="0" onclick={() => selectSource(acct.id)} onkeydown={(e) => e.key === "Enter" && selectSource(acct.id)}>
								<div class="source-option-icon"><Icon name={acct.icon} /></div>
								<div class="source-option-text">
									<span class="source-option-label">{acct.label}</span>
									<span class="source-option-balance">{fmt(acct.balance, acct.currency)}</span>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<div class="modal-row date-row">
				<input class="modal-input date-input" type="date" value={dateStr} oninput={(e) => dateStr = (e.target as HTMLInputElement).value} />
			</div>

			<div class="modal-actions">
				<button class="btn btn-secondary" onclick={onclose}>Cancel</button>
				<button class="btn btn-primary" onclick={handleSubmit} disabled={busy}>{busy ? "Processing..." : "Done"}</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 300;
		-webkit-backdrop-filter: blur(0.25rem);
		backdrop-filter: blur(0.25rem);
		padding: 1.5rem;
	}

	.modal {
		background: var(--meta-dark);
		border: 0.0625rem solid rgba(255, 255, 255, 0.1);
		border-radius: 1.25rem;
		padding: 1.5rem;
		width: 100%;
		max-width: 22rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.5);
	}

	.modal-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.modal-input {
		width: 100%;
		height: 2.5rem;
		padding: 0 0.75rem;
		border-radius: 0.625rem;
		border: 0.0625rem solid rgba(255, 255, 255, 0.1);
		background: var(--meta-darker);
		color: var(--meta-light);
		font-size: 1rem;
		text-align: left;
		outline: none;
		transition: border-color 0.15s;
	}

	.modal-input:focus { border-color: var(--meta-accent); }
	.modal-input::placeholder { color: rgba(255, 255, 255, 0.25); }
	.modal-input::-webkit-outer-spin-button,
	.modal-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
	.modal-input[type="number"] { -moz-appearance: textfield; }

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

	.source-combo:focus-within { border-color: var(--meta-accent); }

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

	.source-combo-input::placeholder { color: rgba(255, 255, 255, 0.35); }

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

	.source-option:hover { background: rgba(255, 255, 255, 0.05); }
	.source-option:focus-visible { outline: none; }

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

	.date-row {
		position: relative;
	}

	.date-input {
		color-scheme: dark;
		appearance: none;
		-webkit-appearance: none;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.date-input::-webkit-calendar-picker-indicator {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		opacity: 0;
		cursor: pointer;
	}

	.modal-actions {
		display: flex;
		gap: 0.75rem;
	}

	.modal-actions .btn {
		padding: 0.75rem;
		font-size: 1rem;
		border-radius: 0.75rem;
	}

	.btn {
		flex: 1;
		padding: 0.625rem;
		font-size: 0.875rem;
		font-weight: 600;
		border-radius: 0.625rem;
		border: none;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		transition: opacity 0.15s;
	}

	.btn:active { opacity: 0.7; }

	.btn-primary {
		color: var(--meta-darker);
		background: var(--meta-accent);
	}

	.btn-primary:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.btn-secondary {
		color: var(--meta-light);
		background: var(--meta-blue);
		border: 0.0625rem solid rgba(255, 255, 255, 0.08);
	}
</style>
