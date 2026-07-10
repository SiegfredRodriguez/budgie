<script lang="ts">
	import { accounts, accountsLoading } from "$lib/stores/accounts";
	import { expenses, loadExpenses } from "$lib/stores/expenses";
	import { session } from "$lib/stores/auth";
	import { env } from '$env/dynamic/public';
	import ExpenseHero from "$lib/components/ExpenseHero.svelte";
	import ExpenseItem from "$lib/components/ExpenseItem.svelte";
	import NewExpenseDialog from "$lib/components/NewExpenseDialog.svelte";
	import { flags } from "$lib/stores/flags";
	import Plus from "@lucide/svelte/icons/plus";
	import Logs from "@lucide/svelte/icons/logs";

	const now = new Date();
	const currentMonth = now.getMonth();
	const currentYear = now.getFullYear();

	function isCurrentMonth(d: string) {
		const date = new Date(d + 'T00:00:00');
		return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
	}

	let currentMonthExpenses = $derived(
		$expenses
			.filter((e) => isCurrentMonth(e.date))
			.reduce((sum, e) => sum + e.amount, 0),
	);
	let currentMonthCount = $derived($expenses.filter((e) => isCurrentMonth(e.date)).length);

	function fmt(n: number, c = "PHP"): string {
		const abs = Math.abs(n);
		const p = abs.toFixed(2).split(".");
		p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		return `${c} ${p[0]}.${p[1]}`;
	}

	let scrollTop = $state(0);
	let headerHeight = $state(250);
	let scroller: HTMLElement;

	let showDialog = $state(false);
	let showCtxMenu = $state(false);

	function handleScroll() {
		scrollTop = scroller.scrollTop;
	}

	function openDialog() {
		showDialog = true;
	}

	function closeDialog() {
		showDialog = false;
	}

	async function handleCreateExpense(data: { account_id: string; amount: number; label: string; date: string }) {
		const res = await fetch(`${env.PUBLIC_SUPABASE_URL}/functions/v1/create-expense`, {
			method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'apikey': env.PUBLIC_SUPABASE_PUBLISHABLE_KEY,
			'Authorization': `Bearer ${env.PUBLIC_SUPABASE_PUBLISHABLE_KEY}`,
		},
			body: JSON.stringify({
				account_id: data.account_id,
				amount: data.amount,
				label: data.label,
				date: data.date,
				user_id: $session!.user.id,
			}),
		});
		if (!res.ok) {
			const err = await res.json();
			throw new Error(err.error);
		}
		closeDialog();
		await loadExpenses();
	}
</script>

{#if !$flags["fab"]}
	<button class="pill-btn" onclick={openDialog}>
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
		New Expense
	</button>
{/if}
{#if $flags["fab"]}
	<button class="fab" onclick={openDialog}>
		<Plus size={24} strokeWidth={3} />
	</button>
{/if}
{#if $flags["fab"] && $flags["context-menu"]}
	<div class="ctx-wrapper">
		<button class="ctx-btn" onclick={() => showCtxMenu = !showCtxMenu}>
			<Logs size={20} />
		</button>
		{#if showCtxMenu}
			<div class="ctx-dropdown">
				<button class="ctx-item">Dummy entry 1</button>
				<button class="ctx-item">Dummy entry 2</button>
				<button class="ctx-item">Dummy entry 3</button>
			</div>
		{/if}
	</div>
{/if}

<div class="scroller" onscroll={handleScroll} bind:this={scroller}>
	<ExpenseHero total={fmt(currentMonthExpenses)} count={currentMonthCount} {scrollTop} height={headerHeight} />

	<div class="list" style="margin-top: -{headerHeight}px; padding-top: {headerHeight + 12}px">
		{#each $expenses as item}
			<ExpenseItem label={item.label} formatted={`-${fmt(item.amount, item.currency)}`} current={isCurrentMonth(item.date)} />
		{/each}
	</div>
</div>

<NewExpenseDialog show={showDialog} accounts={$accounts} accountsLoading={$accountsLoading} onclose={closeDialog} onsubmit={handleCreateExpense} />

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

	.fab {
		position: fixed;
		bottom: calc(1.25rem + 3.25rem + 0.75rem);
		right: calc(1.5rem + env(safe-area-inset-right));
		width: 3.1rem;
		height: 3.1rem;
		border-radius: 50%;
		border: 0.0625rem solid rgba(255, 255, 255, 0.1);
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--meta-accent);
		color: var(--meta-darker);
		cursor: pointer;
		z-index: 200;
		box-shadow: 0 0.5rem 2rem rgba(0, 0, 0, 0.5);
		transition: transform 0.15s;
		-webkit-tap-highlight-color: transparent;
		user-select: none;
	}

	.fab:active {
		transform: scale(0.92);
	}

	.ctx-wrapper {
		position: fixed;
		top: calc(0.5rem + env(safe-area-inset-top));
		right: calc(1rem + env(safe-area-inset-right));
		z-index: 200;
	}

	.ctx-btn {
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 50%;
		border: 0.0625rem solid rgba(255, 255, 255, 0.1);
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(26, 38, 69, 0.6);
		-webkit-backdrop-filter: blur(1.25rem);
		backdrop-filter: blur(1.25rem);
		color: var(--meta-silver);
		cursor: pointer;
		box-shadow: 0 0.5rem 2rem rgba(0, 0, 0, 0.5);
		transition: transform 0.15s, background 0.15s;
		-webkit-tap-highlight-color: transparent;
		user-select: none;
	}

	.ctx-btn:active {
		transform: scale(0.92);
		background: rgba(26, 38, 69, 0.8);
	}

	.ctx-dropdown {
		position: absolute;
		top: calc(100% + 0.375rem);
		right: 0;
		min-width: 10rem;
		background: rgba(26, 38, 69, 0.9);
		-webkit-backdrop-filter: blur(1.25rem);
		backdrop-filter: blur(1.25rem);
		border: 0.0625rem solid rgba(255, 255, 255, 0.1);
		border-radius: 0.75rem;
		overflow: hidden;
		box-shadow: 0 0.5rem 2rem rgba(0, 0, 0, 0.5);
	}

	.ctx-item {
		width: 100%;
		padding: 0.75rem 1rem;
		background: transparent;
		border: none;
		color: var(--meta-light);
		font-size: 0.8125rem;
		font-weight: 500;
		text-align: left;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		transition: background 0.1s;
	}

	.ctx-item:hover {
		background: rgba(255, 255, 255, 0.06);
	}

	.ctx-item + .ctx-item {
		border-top: 0.0625rem solid rgba(255, 255, 255, 0.05);
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
</style>
