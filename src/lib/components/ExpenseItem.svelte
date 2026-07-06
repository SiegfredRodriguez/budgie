<script lang="ts">
	let {
		label,
		amount,
		current,
	}: {
		label: string;
		amount: number;
		current: boolean;
	} = $props();
</script>

<div class="item" class:current>
	<span class="item-label">{label}</span>
	<span class="amount">-{amount.toFixed(2)}</span>
</div>

<style>
	.item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.875rem 1rem;
		background: var(--meta-dark);
		border-radius: 0.75rem;
		border: 0.0625rem solid rgba(255, 255, 255, 0.06);
		opacity: 0.4;
	}

	.item.current {
		opacity: 1;
	}

	.item-label {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--meta-light);
	}

	.amount {
		font-family: 'Poppins', sans-serif;
		font-size: 1rem;
		font-weight: 800;
		color: #ff6b6b;
	}
</style>
