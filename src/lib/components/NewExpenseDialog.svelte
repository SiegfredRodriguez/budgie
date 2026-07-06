<script lang="ts">
	import Icon from "./Icon.svelte";

	let {
		show,
		accounts,
		onclose,
		onsubmit,
	}: {
		show: boolean;
		accounts: Array<{ id: string; icon: string; label: string }>;
		onclose: () => void;
		onsubmit: (data: { account_id: string; amount: number; label: string; date: string }) => void;
	} = $props();

	let amount = $state("");
	let label = $state("");
	let sourceId = $state("");
	let showSourceDropdown = $state(false);
	let dateStr = $state("");
	let busy = $state(false);

	let selectedSource = $derived(accounts.find((a) => a.id === sourceId));

	$effect(() => {
		if (show) {
			amount = "";
			label = "";
			sourceId = "";
			showSourceDropdown = false;
			dateStr = "";
			busy = false;
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
				<input class="modal-input" type="number" inputmode="numeric" placeholder="Amount" value={amount} oninput={(e) => { const el = e.target as HTMLInputElement; let v = el.value; if (v.startsWith('-')) { v = v.replace('-', ''); el.value = v; } amount = v; }} />
			</div>

			<div class="modal-row">
				<input class="modal-input" type="text" placeholder="Label" value={label} oninput={(e) => label = (e.target as HTMLInputElement).value} />
			</div>

			<div class="source-endpoint">
				<button class="source-btn" onclick={() => showSourceDropdown = !showSourceDropdown}>
					<div class="source-btn-icon">
						{#if selectedSource}
							<Icon name={selectedSource.icon} />
						{/if}
					</div>
					<span class="source-btn-label" class:source-placeholder={!selectedSource}>{selectedSource ? selectedSource.label : "Select source account"}</span>
					<svg class="source-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>
				</button>
				{#if showSourceDropdown}
					<div class="source-dropdown">
						{#each accounts as acct}
							<div class="source-option" role="button" tabindex="0" onclick={() => selectSource(acct.id)} onkeydown={(e) => e.key === "Enter" && selectSource(acct.id)}>
								<div class="source-option-icon"><Icon name={acct.icon} /></div>
								<span class="source-option-label">{acct.label}</span>
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

	.source-endpoint {
		width: 100%;
		position: relative;
	}

	.source-btn {
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

	.source-btn:active { border-color: var(--meta-accent); }

	.source-btn-icon {
		width: 1.75rem;
		height: 1.75rem;
		flex-shrink: 0;
	}

	.source-btn-label {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--meta-light);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.source-placeholder {
		color: rgba(255, 255, 255, 0.35);
	}

	.source-chevron {
		width: 1rem;
		height: 1rem;
		color: var(--meta-silver);
		margin-left: auto;
		flex-shrink: 0;
	}

	.source-dropdown {
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

	.source-option-label {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--meta-light);
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
