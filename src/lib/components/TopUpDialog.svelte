<script lang="ts">
	let {
		show,
		target,
		amount,
		onclose,
		ondone,
		onamount,
	}: {
		show: boolean;
		target: { id: string; balance: number; currency: string } | undefined;
		amount: string;
		onclose: () => void;
		ondone: () => void;
		onamount: (v: string) => void;
	} = $props();

	function fmt(n: number, c: string): string {
		const abs = Math.abs(n);
		const p = abs.toFixed(2).split(".");
		p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		return `${c} ${n < 0 ? "-" : ""}${p[0]}.${p[1]}`;
	}

	let result = $derived(target ? target.balance + (parseFloat(amount) || 0) : 0);
	let amountInput: HTMLInputElement;

	$effect(() => {
		if (show) {
			requestAnimationFrame(() => amountInput?.focus());
		}
	});

	function handleOverlay(e: MouseEvent) {
		if (e.target === e.currentTarget) onclose();
	}

	function handleKey(e: KeyboardEvent) {
		if (e.key === "Escape") onclose();
	}
</script>

{#if show && target}
	<div class="overlay" onclick={handleOverlay} onkeydown={handleKey} role="presentation">
		<div class="modal" role="dialog" aria-modal="true" tabindex="-1">
			<div class="modal-header">
				<div class="modal-header-main">{fmt(result, target.currency)}</div>
				<div class="modal-header-sub">New Balance</div>
			</div>
			<div class="modal-row">
				<input class="modal-input" type="number" placeholder="Top Up Amount" value={amount} oninput={(e) => { const el = e.target as HTMLInputElement; let v = el.value; if (v.startsWith('-')) { v = v.replace('-', ''); el.value = v; } onamount(v); }} bind:this={amountInput} />
			</div>
			<div class="modal-actions">
				<button class="btn btn-secondary" onclick={onclose}>Cancel</button>
				<button class="btn btn-primary" onclick={ondone}>Top Up</button>
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

	.modal-header {
		text-align: center;
		padding-bottom: 0.5rem;
	}

	.modal-header-main {
		font-size: 1.625rem;
		font-weight: 800;
		color: var(--meta-light);
		letter-spacing: 0.01em;
		line-height: 1.2;
	}

	.modal-header-sub {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--meta-silver);
		margin-top: 0.125rem;
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
