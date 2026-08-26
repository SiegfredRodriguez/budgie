<script lang="ts">
	import { untrack } from "svelte";
	import Dialog from "./Dialog.svelte";
	import AccountCombobox from "./AccountCombobox.svelte";
	import PayeeCombobox from "./PayeeCombobox.svelte";
	import { notifyError } from "$lib/stores/snackbar";

	let {
		show,
		accounts,
		payees = [],
		onclose,
		onsubmit,
	}: {
		show: boolean;
		accounts: Array<{ id: string; icon: string; label: string; balance: number; currency: string }>;
		payees: Array<{ id: string; label: string; icon: string }>;
		onclose: () => void;
		onsubmit: (data: {
			account_id: string;
			amount: number;
			label: string;
			date: string;
			payee_id?: string;
			payee_label?: string;
		}) => void;
	} = $props();

	let amount = $state("");
	let label = $state("");
	let sourceId = $state("");
	let dateStr = $state(new Date().toISOString().slice(0, 10));
	let busy = $state(false);

	let selectedPayee = $state<{ id?: string; label: string; novel: boolean } | null>(null);

	let selectedSource = $derived(accounts.find((a) => a.id === sourceId));
	let amountInput: HTMLInputElement | undefined = $state();

	$effect(() => {
		if (show) {
			amount = "";
			label = "";
			// Deliberately not tracked: `accounts` updates live once the
			// dialog is open (most visibly from this same dialog's own
			// submission — createExpense debits the account optimistically
			// before the network call resolves). Without untrack(), that
			// reactive write re-runs this whole block — wiping the in-flight
			// form back to defaults (including `busy`, re-enabling the
			// submit button mid-request) instead of only resetting once when
			// the dialog actually opens.
			untrack(() => {
				sourceId = accounts.length > 0 ? accounts[0].id : "";
			});
			dateStr = new Date().toISOString().slice(0, 10);
			busy = false;
			selectedPayee = null;
			amountInput?.focus();
		}
	});

	function selectExistingPayee(payee: { id: string; label: string }) {
		selectedPayee = { id: payee.id, label: payee.label, novel: false };
	}

	function selectNovelPayee(payeeLabel: string) {
		selectedPayee = { label: payeeLabel, novel: true };
	}

	function clearPayee() {
		selectedPayee = null;
	}

	async function handleSubmit() {
		if (busy) return;
		if (!amount || !label || !sourceId || !dateStr || !selectedPayee) return;
		busy = true;
		try {
			// createExpense (local/expenses.ts) ensures the account and, for
			// an existing payee, the payee itself are server-confirmed before
			// it fires create-expense — same FK reasoning as ensureTagSynced
			// in NewPayeeDialog, just centralized there now instead of here.
			await onsubmit({
				account_id: sourceId,
				amount: parseFloat(amount),
				label,
				date: dateStr,
				...(selectedPayee.novel
					? { payee_label: selectedPayee.label }
					: { payee_id: selectedPayee.id }),
			});
			onclose();
		} catch (e: any) {
			notifyError(e?.message ?? "Failed to create expense");
		} finally {
			busy = false;
		}
	}
</script>

<Dialog {show} {onclose}>
	<div class="modal" role="dialog" aria-modal="true" tabindex="-1">
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
					amount = v;
				}}
				bind:this={amountInput}
			/>
		</div>

		<div class="modal-row">
			<input
				class="modal-input"
				type="text"
				placeholder="Label"
				value={label}
				oninput={(e) => (label = (e.target as HTMLInputElement).value)}
			/>
		</div>

		<AccountCombobox {accounts} selected={selectedSource} onselect={(id) => (sourceId = id)} />

		<PayeeCombobox
			{payees}
			selected={selectedPayee}
			onselect={selectExistingPayee}
			oncreate={selectNovelPayee}
			onclear={clearPayee}
		/>

		<div class="modal-row date-row">
			<input
				class="modal-input date-input"
				type="date"
				value={dateStr}
				oninput={(e) => (dateStr = (e.target as HTMLInputElement).value)}
			/>
		</div>

		<div class="modal-actions">
			<button class="btn btn-secondary" onclick={onclose}>Cancel</button>
			<button class="btn btn-primary" onclick={handleSubmit} disabled={busy || !selectedPayee}
				>{busy ? "Processing..." : "Done"}</button
			>
		</div>
	</div>
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
	.modal-input::-webkit-outer-spin-button,
	.modal-input::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
	.modal-input[type="number"] {
		-moz-appearance: textfield;
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
