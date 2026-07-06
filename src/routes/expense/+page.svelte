<script lang="ts">
	import { onMount } from 'svelte';
	import { accounts } from "$lib/stores/accounts";
	import { session } from "$lib/stores/auth";
	import { env } from '$env/dynamic/public';
	import { supabase } from '$lib/supabase';
	import ExpenseHero from "$lib/components/ExpenseHero.svelte";
	import ExpenseItem from "$lib/components/ExpenseItem.svelte";
	import NewExpenseDialog from "$lib/components/NewExpenseDialog.svelte";

	const now = new Date();
	const currentMonth = now.getMonth();
	const currentYear = now.getFullYear();

	interface Expense {
		id: string;
		amount: number;
		date: string;
		label: string;
		accountId: string;
		currency: string;
		createdAt: string;
	}

	let expenses = $state<Expense[]>([]);

	async function loadExpenses() {
		const { data, error } = await supabase
			.from('transactions')
			.select('amount, currency, account_id, created_at, expense_details!inner(id, label, date)')
			.eq('type', 'EXPENSE');
		if (error || !data) return;
		expenses = data.map((t: any) => ({
			id: t.expense_details.id,
			amount: Math.abs(t.amount),
			label: t.expense_details.label,
			date: t.expense_details.date,
			accountId: t.account_id,
			currency: t.currency,
			createdAt: t.created_at,
		})).sort((a, b) => b.date.localeCompare(a.date));
	}

	onMount(() => {
		loadExpenses();
	});

	function isCurrentMonth(d: string) {
		const date = new Date(d + 'T00:00:00');
		return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
	}

	let currentMonthExpenses = $derived(
		expenses
			.filter((e) => isCurrentMonth(e.date))
			.reduce((sum, e) => sum + e.amount, 0),
	);
	let currentMonthCount = $derived(expenses.filter((e) => isCurrentMonth(e.date)).length);

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

<button class="pill-btn" onclick={openDialog}>
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
	New Expense
</button>

<div class="scroller" onscroll={handleScroll} bind:this={scroller}>
	<ExpenseHero total={fmt(currentMonthExpenses)} count={currentMonthCount} {scrollTop} height={headerHeight} />

	<div class="list" style="margin-top: -{headerHeight}px; padding-top: {headerHeight + 12}px">
		{#each expenses as item}
			<ExpenseItem label={item.label} formatted={`-${fmt(item.amount, item.currency)}`} current={isCurrentMonth(item.date)} />
		{/each}
	</div>
</div>

<NewExpenseDialog show={showDialog} accounts={$accounts} onclose={closeDialog} onsubmit={handleCreateExpense} />

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
