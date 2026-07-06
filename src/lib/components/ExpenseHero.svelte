<script lang="ts">
	let {
		total,
		count,
		scrollTop,
		height,
	}: {
		total: string;
		count: number;
		scrollTop: number;
		height: number;
	} = $props();
</script>

<div class="hero" style="height: {height}px; transform: translateY({Math.max(scrollTop * 0.3, 0)}px)">
	<div class="hero-overlay"></div>
	<img class="hero-img" src="/hero-expenses.png" alt="" width="860" height="500" />
	<div class="summary">
		<div class="summary-total">{total}</div>
		<div class="summary-sub">{count} {count === 1 ? "expense" : "expenses"} this month</div>
	</div>
</div>

<style>
	.hero {
		position: relative;
		overflow: hidden;
		will-change: transform;
	}

	.hero-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.hero-overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(180deg, transparent 50%, var(--meta-darker));
		z-index: 1;
	}

	.summary {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		z-index: 2;
		pointer-events: none;
		padding-top: 4rem;
	}

	.summary-total {
		font-size: 2rem;
		font-weight: 800;
		color: var(--meta-light);
		letter-spacing: 0.02em;
		text-shadow: 0 0.125rem 0.75rem rgba(0, 0, 0, 0.5);
	}

	.summary-sub {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--meta-silver);
		margin-top: 0.25rem;
		text-shadow: 0 0.0625rem 0.375rem rgba(0, 0, 0, 0.4);
	}
</style>
