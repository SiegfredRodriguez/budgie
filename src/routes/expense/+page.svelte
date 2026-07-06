<script lang="ts">
	import Icon from "$lib/components/Icon.svelte";
	import { accounts } from "$lib/stores/accounts";

	const now = new Date();
	const currentMonth = now.getMonth();
	const currentYear = now.getFullYear();

	function randomDate(): Date {
		const d = new Date(currentYear, currentMonth, 1);
		const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
		const day = Math.floor(Math.random() * 35) - 5;
		d.setDate(day);
		return d;
	}

	const labels = ["Groceries", "Transport", "Dining", "Utilities", "Entertainment", "Shopping", "Health", "Education", "Rent", "Insurance", "Subscriptions", "Coffee", "Parking", "Phone", "Internet", "Streaming", "Clothing", "Gifts", "Travel", "Fitness"];

	const dummy = Array.from({ length: 20 }, (_, i) => {
		const d = randomDate();
		return {
			id: i,
			amount: -(Math.random() * 5000 + 50),
			date: d,
			label: labels[i],
			isCurrentMonth: d.getMonth() === currentMonth && d.getFullYear() === currentYear,
		};
	});

	let currentMonthExpenses = $derived(
		dummy
			.filter((e) => e.isCurrentMonth)
			.reduce((sum, e) => sum + e.amount, 0),
	);
	let currentMonthCount = $derived(dummy.filter((e) => e.isCurrentMonth).length);

	function fmt(n: number): string {
		const abs = Math.abs(n);
		const p = abs.toFixed(2).split(".");
		p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		return `PHP ${n < 0 ? "-" : ""}${p[0]}.${p[1]}`;
	}

	let scrollTop = $state(0);
	let headerHeight = $state(250);
	let scroller: HTMLElement;

	let showDialog = $state(false);
	let amount = $state("");
	let label = $state("");
	let sourceId = $state("");
	let showSourceDropdown = $state(false);
	let dateStr = $state("");
	let busy = $state(false);

	let sourceAccounts = $derived($accounts);
	let selectedSource = $derived(sourceAccounts.find((a) => a.id === sourceId));

	function handleScroll() {
		scrollTop = scroller.scrollTop;
	}

	function openDialog() {
		amount = "";
		label = "";
		sourceId = "";
		showSourceDropdown = false;
		dateStr = "";
		showDialog = true;
	}

	function closeDialog() {
		showDialog = false;
	}

	function handleOverlay(e: MouseEvent) {
		if (e.target === e.currentTarget) closeDialog();
	}

	function handleKey(e: KeyboardEvent) {
		if (e.key === "Escape") closeDialog();
	}

	function selectSource(id: string) {
		sourceId = id;
		showSourceDropdown = false;
	}

	async function handleDone() {
		if (busy) return;
		busy = true;
		try {
			await new Promise((r) => setTimeout(r, 500));
			closeDialog();
		} finally {
			busy = false;
		}
	}
</script>

<button class="pill-btn" onclick={openDialog}>
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
	New Expense
</button>

<div class="scroller" onscroll={handleScroll} bind:this={scroller}>
	<div class="hero" style="height: {headerHeight}px; transform: translateY({Math.max(scrollTop * 0.3, 0)}px)">
		<div class="hero-overlay"></div>
		<img class="hero-img" src="https://picsum.photos/seed/expense/860/500" alt="" width="860" height="500" />
		<div class="summary">
			<div class="summary-total">{fmt(currentMonthExpenses)}</div>
			<div class="summary-sub">{currentMonthCount} {currentMonthCount === 1 ? "expense" : "expenses"} this month</div>
		</div>
	</div>

	<div class="list" style="margin-top: -{headerHeight}px; padding-top: {headerHeight + 12}px">
		{#each dummy as item}
			<div class="item" class:current={item.isCurrentMonth}>
				<span class="item-label">{item.label}</span>
				<span class="amount">{item.amount.toFixed(2)}</span>
			</div>
		{/each}
	</div>
</div>

{#if showDialog}
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
						{#each sourceAccounts as acct}
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
				<button class="btn btn-secondary" onclick={closeDialog}>Cancel</button>
				<button class="btn btn-primary" onclick={handleDone} disabled={busy}>{busy ? "Processing..." : "Done"}</button>
			</div>
		</div>
	</div>
{/if}

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
