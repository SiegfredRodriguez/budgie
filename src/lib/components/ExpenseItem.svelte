<script lang="ts">
	import Icon from "./Icon.svelte";

	let {
		label,
		formatted,
		current,
		payeeLabel,
		payeeIcon,
		tags,
	}: {
		label: string;
		formatted: string;
		current: boolean;
		payeeLabel: string | null;
		payeeIcon: string | null;
		tags: { id: string; value: string }[];
	} = $props();
</script>

<div class="item" class:current>
	{#if payeeIcon}
		<div class="item-icon"><Icon name={payeeIcon} /></div>
	{/if}
	<div class="item-body">
		<span class="amount">{formatted}</span>
		{#if payeeLabel}
			<span class="payee">{payeeLabel}</span>
		{/if}
		{#if tags.length > 0}
			<div class="tags">
				{#each tags as tag}
					<span class="tag">{tag.value}</span>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.875rem 1rem;
		height: 5rem;
		background: var(--meta-dark);
		border-radius: 0.75rem;
		border: 0.0625rem solid rgba(255, 255, 255, 0.06);
		opacity: 0.4;
	}

	.item.current {
		opacity: 1;
	}

	.item-icon {
		width: 2rem;
		height: 2rem;
		border-radius: 0.5rem;
		background: var(--meta-darker);
		color: var(--meta-accent);
		flex-shrink: 0;
		overflow: hidden;
	}

	.item-icon :global(svg) {
		width: 100%;
		height: 100%;
	}

	.item-body {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 0.125rem;
	}

	.amount {
		font-family: 'Poppins', sans-serif;
		font-size: 1rem;
		font-weight: 800;
		color: #ff6b6b;
	}

	.payee {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--meta-light);
	}

	.tags {
		display: flex;
		flex-wrap: nowrap;
		gap: 0.375rem;
		overflow: hidden;
	}

	.tag {
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--meta-light);
		background: var(--meta-blue);
		border: 0.0625rem solid rgba(255, 255, 255, 0.08);
		border-radius: 0.625rem;
		padding: 0.125rem 0.5rem;
		white-space: nowrap;
		flex-shrink: 0;
	}
</style>
