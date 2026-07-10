<script lang="ts">
	import Icon from "./Icon.svelte";

	let {
		show,
		source,
		target,
		otherAccounts,
		onclose,
		ondone,
		onamount,
		onselect,
	}: {
		show: boolean;
		source: { id: string; balance: number; currency: string; icon: string; label: string } | undefined;
		target: { id: string; balance: number; currency: string; icon: string; label: string } | undefined;
		otherAccounts: Array<{ id: string; icon: string; label: string; currency: string; balance: number }>;
		onclose: () => void;
		ondone: () => void;
		onamount: (v: string) => void;
		onselect: (id: string) => void;
	} = $props();

	let amount = $state("");
	let searchQuery = $state("");
	let showDropdown = $state(false);
	let busy = $state(false);

	let selectedTarget = $derived(target);
	let filteredAccounts = $derived(
		searchQuery
			? otherAccounts.filter((a) => a.label.toLowerCase().includes(searchQuery.toLowerCase()))
			: otherAccounts,
	);
	let searchInput: HTMLInputElement | undefined = $state();

	let overBalance = $derived(!!source && parseFloat(amount) > source.balance);

	function fmt(n: number, c: string): string {
		const p = Math.abs(n).toFixed(2).split(".");
		p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		return `${c} ${p[0]}.${p[1]}`;
	}

	$effect(() => {
		if (show) {
			amount = "";
			searchQuery = "";
			showDropdown = false;
			busy = false;
		}
	});

	function handleOverlay(e: MouseEvent) {
		if (e.target === e.currentTarget) onclose();
	}

	function handleKey(e: KeyboardEvent) {
		if (e.key === "Escape") onclose();
	}

	function selectTarget(id: string) {
		onselect(id);
		searchQuery = "";
		showDropdown = false;
	}

	async function handleDone() {
		if (busy) return;
		busy = true;
		try {
			await ondone();
		} finally {
			busy = false;
		}
	}
</script>

{#if show && source}
	<div class="overlay" onclick={handleOverlay} onkeydown={handleKey} role="presentation">
		<div class="modal" role="dialog" aria-modal="true" tabindex="-1">
			<div class="transfer-widget">
				<div class="transfer-source">
					<div class="transfer-source-icon"><Icon name={source.icon} /></div>
					<span class="transfer-source-label">{source.label}</span>
				</div>
				<div class="transfer-balance">{source.currency} {source.balance.toFixed(2)}</div>
			</div>

			<div class="source-endpoint">
				<div class="source-combo">
					<div class="source-combo-icon">
						{#if searchQuery === "" && selectedTarget}
							<Icon name={selectedTarget.icon} />
						{/if}
					</div>
					<input
						class="source-combo-input"
						type="text"
						placeholder={selectedTarget && searchQuery === "" ? selectedTarget.label : "Search account…"}
						value={searchQuery}
						oninput={(e) => {
							searchQuery = (e.target as HTMLInputElement).value;
							if (searchQuery && selectedTarget) onselect("");
							showDropdown = true;
						}}
						onfocus={() => { showDropdown = true; }}
						onblur={() => setTimeout(() => showDropdown = false, 150)}
						bind:this={searchInput}
					/>
					{#if selectedTarget && searchQuery === ""}
						<span class="source-combo-balance">{fmt(selectedTarget.balance, selectedTarget.currency)}</span>
					{/if}
				</div>
				{#if showDropdown && filteredAccounts.length > 0}
					<div class="source-dropdown">
						{#each filteredAccounts as acct}
							<div class="source-option" role="button" tabindex="0" onclick={() => selectTarget(acct.id)} onkeydown={(e) => e.key === "Enter" && selectTarget(acct.id)}>
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

			<div class="modal-row">
				<input class="modal-input" type="number" inputmode="numeric" placeholder="Amount" value={amount} oninput={(e) => { const el = e.target as HTMLInputElement; let v = el.value; if (v.startsWith('-')) { v = v.replace('-', ''); el.value = v; } onamount(v); }} />
			</div>
			{#if overBalance}
				<div class="modal-error">Transfer amount exceeds available balance</div>
			{/if}

			<div class="modal-actions">
				<button class="btn btn-secondary" onclick={onclose}>Cancel</button>
				<button class="btn btn-primary" onclick={handleDone} disabled={overBalance || busy}>{busy ? "Processing..." : "Transfer"}</button>
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

	.transfer-widget {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 1rem;
		background: var(--meta-darker);
		border-radius: 0.75rem;
	}

	.transfer-source {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
	}

	.transfer-source-icon {
		width: 1.75rem;
		height: 1.75rem;
		flex-shrink: 0;
	}

	.transfer-source-label {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--meta-silver);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.transfer-balance {
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--meta-accent);
		letter-spacing: 0.01em;
	}

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

	.modal-error {
		font-size: 0.75rem;
		color: #ff4444;
		text-align: left;
		margin-top: -0.75rem;
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
