<script lang="ts">
	import Icon from "./Icon.svelte";

	let {
		show,
		source,
		target,
		targetId,
		amount,
		showDropdown,
		otherAccounts,
		onclose,
		ondone,
		onamount,
		onselect,
		ontoggle,
	}: {
		show: boolean;
		source: { id: string; balance: number; currency: string; icon: string; label: string } | undefined;
		target: { id: string; balance: number; currency: string; icon: string; label: string } | undefined;
		targetId: string;
		amount: string;
		showDropdown: boolean;
		otherAccounts: Array<{ id: string; icon: string; label: string; currency: string; balance: number }>;
		onclose: () => void;
		ondone: () => void;
		onamount: (v: string) => void;
		onselect: (id: string) => void;
		ontoggle: () => void;
	} = $props();

	let overBalance = $derived(!!source && parseFloat(amount) > source.balance);
	let busy = $state(false);

	function handleOverlay(e: MouseEvent) {
		if (e.target === e.currentTarget) onclose();
	}

	function handleKey(e: KeyboardEvent) {
		if (e.key === "Escape") onclose();
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

			<div class="transfer-endpoint">
				<button class="transfer-target-btn" onclick={ontoggle}>
					<div class="transfer-target-icon">
						{#if target}
							<Icon name={target.icon} />
						{/if}
					</div>
					<span class="transfer-target-label" class:transfer-placeholder={!target}>{target ? target.label : "Select target account"}</span>
					<svg class="transfer-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>
				</button>
				{#if showDropdown}
					<div class="transfer-dropdown">
						{#each otherAccounts as acct}
							<div class="transfer-option" role="button" tabindex="0" onclick={() => onselect(acct.id)} onkeydown={(e) => e.key === "Enter" && onselect(acct.id)}>
								<div class="transfer-option-icon"><Icon name={acct.icon} /></div>
								<span class="transfer-option-label">{acct.label}</span>
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

	.transfer-endpoint {
		width: 100%;
		position: relative;
	}

	.transfer-target-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.5rem 0.75rem;
		border-radius: 0.625rem;
		border: 0.0625rem solid rgba(255, 255, 255, 0.1);
		background: transparent;
		color: var(--meta-light);
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		transition: border-color 0.15s;
	}

	.transfer-target-btn:active { border-color: var(--meta-accent); }

	.transfer-target-icon {
		width: 1.75rem;
		height: 1.75rem;
		flex-shrink: 0;
	}

	.transfer-target-label {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--meta-light);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.transfer-placeholder {
		color: rgba(255, 255, 255, 0.35);
	}

	.transfer-chevron {
		width: 1rem;
		height: 1rem;
		color: var(--meta-silver);
		margin-left: auto;
		flex-shrink: 0;
	}

	.transfer-dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		margin-top: 0.25rem;
		background: var(--meta-darker);
		border-radius: 0.625rem;
		overflow: hidden;
		z-index: 10;
	}

	.transfer-option {
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

	.transfer-option:hover { background: rgba(255, 255, 255, 0.05); }
	.transfer-option:focus-visible { outline: none; }

	.transfer-option-icon {
		width: 1.75rem;
		height: 1.75rem;
		flex-shrink: 0;
	}

	.transfer-option-label {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--meta-light);
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
