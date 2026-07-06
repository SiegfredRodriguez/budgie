<script lang="ts">
	const dummy = Array.from({ length: 20 }, (_, i) => ({
		id: i,
		amount: -(Math.random() * 5000 + 50),
	}));

	let scrollTop = $state(0);
	let headerHeight = $state(250);
	let scroller: HTMLElement;

	function handleScroll() {
		scrollTop = scroller.scrollTop;
	}
</script>

<button class="pill-btn" onclick={() => {}}>
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
	New Expense
</button>

<div class="scroller" onscroll={handleScroll} bind:this={scroller}>
	<div class="hero" style="height: {headerHeight}px; transform: translateY({Math.max(scrollTop * 0.3, 0)}px)">
		<div class="hero-overlay"></div>
		<img class="hero-img" src="https://picsum.photos/seed/expense/860/500" alt="" width="860" height="500" />
		<div class="summary">
			<div class="summary-total">PHP 0.00</div>
			<div class="summary-sub">20 expenses</div>
		</div>
	</div>

	<div class="list" style="margin-top: -{headerHeight}px; padding-top: {headerHeight + 12}px">
		{#each dummy as item}
			<div class="item">
				<span class="amount">{item.amount.toFixed(2)}</span>
			</div>
		{/each}
	</div>
</div>

<style>
	.pill-btn {
		position: fixed;
		top: calc(0.5rem + env(safe-area-inset-top));
		right: calc(1rem + env(safe-area-inset-right));
		height: 2.25rem;
		border-radius: 1.125rem;
		border: 0.0625rem solid rgba(255, 255, 255, 0.1);
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0 0.875rem 0 0.625rem;
		background: rgba(26, 38, 69, 0.6);
		-webkit-backdrop-filter: blur(1.25rem);
		backdrop-filter: blur(1.25rem);
		color: var(--meta-light);
		font-size: 0.8125rem;
		font-weight: 600;
		cursor: pointer;
		z-index: 200;
		box-shadow: 0 0.5rem 2rem rgba(0, 0, 0, 0.5);
		transition: transform 0.15s, background 0.15s;
		-webkit-tap-highlight-color: transparent;
		user-select: none;
	}

	.pill-btn:active {
		transform: scale(0.96);
		background: rgba(26, 38, 69, 0.8);
	}

	.pill-btn svg {
		width: 1rem;
		height: 1rem;
		color: var(--meta-accent);
	}

	.scroller {
		height: 100%;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
	}

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

	.list {
		position: relative;
		z-index: 2;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding-left: 1rem;
		padding-right: 1rem;
		padding-bottom: 6rem;
	}

	.item {
		display: flex;
		align-items: center;
		padding: 0.875rem 1rem;
		background: var(--meta-dark);
		border-radius: 0.75rem;
		border: 0.0625rem solid rgba(255, 255, 255, 0.06);
	}

	.amount {
		font-family: 'Poppins', sans-serif;
		font-size: 1rem;
		font-weight: 800;
		color: #ff6b6b;
	}
</style>
