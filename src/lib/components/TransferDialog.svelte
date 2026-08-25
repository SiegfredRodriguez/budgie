<script lang="ts">
	import Icon from "./Icon.svelte";
	import { formatBalance } from "$lib/format";
	import Dialog from "./Dialog.svelte";
	import AccountCombobox from "./AccountCombobox.svelte";

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
		source:
			{ id: string; balance: number; currency: string; icon: string; label: string } | undefined;
		target:
			{ id: string; balance: number; currency: string; icon: string; label: string } | undefined;
		otherAccounts: Array<{
			id: string;
			icon: string;
			label: string;
			currency: string;
			balance: number;
		}>;
		onclose: () => void;
		ondone: () => void;
		onamount: (v: string) => void;
		onselect: (id: string) => void;
	} = $props();

	let amount = $state("");
	let busy = $state(false);

	let selectedTarget = $derived(target);

	let overBalance = $derived(!!source && parseFloat(amount) > source.balance);

	$effect(() => {
		if (show) {
			amount = "";
			busy = false;
		}
	});

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

<Dialog {show} {onclose}>
	{#if source}
		<div class="modal" role="dialog" aria-modal="true" tabindex="-1">
			<div class="transfer-widget">
				<div class="transfer-source">
					<div class="transfer-source-icon"><Icon name={source.icon} /></div>
					<span class="transfer-source-label">{source.label}</span>
				</div>
				<div class="transfer-balance">{source.currency} {source.balance.toFixed(2)}</div>
			</div>

			<AccountCombobox accounts={otherAccounts} selected={selectedTarget} {onselect} />

			<div class="modal-row">
				<input
					class="modal-input"
					type="number"
					inputmode="numeric"
					placeholder="Amount"
					value={amount}
					oninput={(e) => {
						const el = e.target as HTMLInputElement;
						let v = el.value;
						if (v.startsWith("-")) {
							v = v.replace("-", "");
							el.value = v;
						}
						onamount(v);
					}}
				/>
			</div>
			{#if overBalance}
				<div class="modal-error">Transfer amount exceeds available balance</div>
			{/if}

			<div class="modal-actions">
				<button class="btn btn-secondary" onclick={onclose}>Cancel</button>
				<button class="btn btn-primary" onclick={handleDone} disabled={overBalance || busy}
					>{busy ? "Processing..." : "Transfer"}</button
				>
			</div>
		</div>
	{/if}
</Dialog>

<style>
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

	.modal-input:focus {
		border-color: var(--meta-accent);
	}
	.modal-input::placeholder {
		color: rgba(255, 255, 255, 0.25);
	}

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

	.btn:active {
		opacity: 0.7;
	}

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
