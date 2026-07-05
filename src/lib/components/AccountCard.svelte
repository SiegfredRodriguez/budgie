<script lang="ts">
	import Icon from "./Icon.svelte";
	import { flags } from "$lib/stores/flags";

	let {
		id,
		icon,
		label,
		balance,
		currency,
		ontopup,
		ontransfer,
		ondelete,
	}: {
		id: string;
		icon: string;
		label: string;
		balance: number;
		currency: string;
		ontopup: (id: string) => void;
		ontransfer: (id: string) => void;
		ondelete: (id: string) => void;
	} = $props();

	function fmt(n: number, c: string): string {
		const abs = Math.abs(n);
		const p = abs.toFixed(2).split(".");
		p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		return `${c} ${n < 0 ? "-" : ""}${p[0]}.${p[1]}`;
	}
</script>

<div class="card">
	<div class="card-top">
		<div class="card-icon"><Icon name={icon} /></div>
		<span class="card-label">{label}</span>
	</div>

	<div class="card-balance">{fmt(balance, currency)}</div>

	<div class="card-actions">
		<button class="btn btn-primary" onclick={() => ontopup(id)}>Top Up</button>
		<button class="btn btn-secondary" onclick={() => ontransfer(id)}>Transfer</button>
		{#if $flags['account.delete']}
			<button class="btn btn-danger" onclick={() => ondelete(id)}>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
			</button>
		{/if}
	</div>
</div>

<style>
	.card {
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
		padding: 1rem;
		background: var(--meta-dark);
		border-radius: 0.875rem;
		border: 0.0625rem solid rgba(255, 255, 255, 0.06);
	}

	.card-top {
		display: flex;
		align-items: center;
		gap: 0.625rem;
	}

	.card-icon {
		width: 2rem;
		height: 2rem;
		padding: 0.3125rem;
		border-radius: 0.5rem;
		background: var(--meta-darker);
		color: var(--meta-accent);
		flex-shrink: 0;
	}

	.card-icon :global(svg) {
		width: 100%;
		height: 100%;
	}

	.card-label {
		font-size: 0.938rem;
		font-weight: 600;
		color: var(--meta-light);
	}

	.card-balance {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--meta-accent);
		letter-spacing: 0.01em;
	}

	.card-actions {
		display: flex;
		gap: 0.5rem;
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

	.btn-danger {
		color: #ff4d4d;
		background: rgba(255, 77, 77, 0.1);
		border: 0.0625rem solid rgba(255, 77, 77, 0.2);
		padding: 0.375rem 0.625rem;
		margin-left: auto;
	}

	.btn-danger svg {
		width: 1rem;
		height: 1rem;
	}
</style>
