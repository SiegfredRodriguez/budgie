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

	function handleOverlay(e: MouseEvent) {
		if (e.target === e.currentTarget) onclose();
	}

	function handleKey(e: KeyboardEvent) {
		if (e.key === "Escape") onclose();
	}
</script>

{#if show && source}
	<div class="overlay" onclick={handleOverlay} onkeydown={handleKey} role="presentation">
		<div class="modal" role="dialog" aria-modal="true" tabindex="-1">
			<div class="modal-row">
				<input class="modal-input" type="number" placeholder="Transfer Amount" value={amount} oninput={(e) => onamount((e.target as HTMLInputElement).value)} />
			</div>

			<div class="transfer-endpoint">
				<button class="transfer-dropdown-btn" onclick={ontoggle}>
					{#if target}
						<div class="card-icon"><Icon name={target.icon} /></div>
						<span class="transfer-label">{target.label}</span>
					{:else}
						<span class="transfer-placeholder">Select account</span>
					{/if}
					<svg class="transfer-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>
				</button>
				{#if showDropdown}
					<div class="transfer-dropdown">
						{#each otherAccounts as acct}
							<button class="transfer-option" onclick={() => onselect(acct.id)}>
								<div class="card-icon"><Icon name={acct.icon} /></div>
								<span class="transfer-label">{acct.label}</span>
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<div class="modal-actions">
				<button class="btn btn-secondary" onclick={onclose}>Cancel</button>
				<button class="btn btn-primary" onclick={ondone}>Transfer</button>
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

	.modal-actions {
		display: flex;
		gap: 0.75rem;
	}

	.modal-actions .btn {
		padding: 0.75rem;
		font-size: 1rem;
		border-radius: 0.75rem;
	}

	.transfer-endpoint {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		min-width: 0;
		width: 100%;
		position: relative;
	}

	.transfer-endpoint .card-icon {
		width: 1.75rem;
		height: 1.75rem;
		padding: 0.25rem;
		flex-shrink: 0;
	}

	.transfer-label {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--meta-light);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.transfer-dropdown-btn {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.5rem;
		border-radius: 0.625rem;
		border: 0.0625rem solid rgba(255, 255, 255, 0.1);
		background: var(--meta-darker);
		color: var(--meta-light);
		cursor: pointer;
		width: 100%;
		-webkit-tap-highlight-color: transparent;
	}

	.transfer-dropdown-btn:active { opacity: 0.7; }

	.transfer-placeholder {
		font-size: 0.8125rem;
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
		inset: 100% 0 auto 0;
		margin-top: 0.25rem;
		background: var(--meta-darker);
		border: 0.0625rem solid rgba(255, 255, 255, 0.1);
		border-radius: 0.625rem;
		overflow: hidden;
		z-index: 10;
	}

	.transfer-option {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		width: 100%;
		padding: 0.5rem 0.625rem;
		border: none;
		background: transparent;
		color: var(--meta-light);
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	.transfer-option:hover { background: rgba(255, 255, 255, 0.05); }

	.transfer-option .card-icon {
		width: 1.5rem;
		height: 1.5rem;
		padding: 0.1875rem;
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

	.btn-secondary {
		color: var(--meta-light);
		background: var(--meta-blue);
		border: 0.0625rem solid rgba(255, 255, 255, 0.08);
	}
</style>
