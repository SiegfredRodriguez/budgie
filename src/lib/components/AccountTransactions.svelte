<script lang="ts">
    import { onMount } from "svelte";
    import { supabase } from "$lib/supabase";
    import Icon from "./Icon.svelte";
    import TransactionTile from "./TransactionTile.svelte";

    let {
        account,
        onclose,
    }: {
        account: {
            id: string;
            icon: string;
            label: string;
            balance: number;
            currency: string;
        };
        onclose: () => void;
    } = $props();

    interface Tx {
        id: string;
        type: string;
        amount: number;
        currency: string;
        description: string | null;
        created_at: string;
    }

    let transactions = $state<Tx[]>([]);
    let loading = $state(true);

    function handleOverlay(e: MouseEvent) {
        if (e.target === e.currentTarget) onclose();
    }

    function handleKey(e: KeyboardEvent) {
        if (e.key === "Escape") onclose();
    }

    function fmtBalance(n: number, c: string): string {
        const abs = Math.abs(n);
        const p = abs.toFixed(2).split(".");
        p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return `${c} ${n < 0 ? "-" : ""}${p[0]}.${p[1]}`;
    }

    onMount(async () => {
        try {
            const { data, error } = await supabase
                .from("transactions")
                .select("*")
                .eq("account_id", account.id)
                .order("created_at", { ascending: false });
            if (error) {
                console.error("Transactions query error", error);
                return;
            }
            if (data) {
                transactions = data as Tx[];
            }
        } finally {
            loading = false;
        }
    });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="overlay" onclick={handleOverlay} onkeydown={handleKey}>
    <div class="panel" role="dialog" aria-modal="true" tabindex="-1">
        <div class="panel-header">
            <div class="panel-account">
                <div class="panel-icon"><Icon name={account.icon} /></div>
                <span class="panel-label">{account.label}</span>
            </div>
            <button class="close-btn" onclick={onclose}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
        </div>

        <div class="panel-balance">{fmtBalance(account.balance, account.currency)}</div>

        <div class="panel-list">
            {#if loading}
                <div class="panel-empty">Loading...</div>
            {:else if transactions.length === 0}
                <div class="panel-empty">No transactions yet</div>
            {:else}
                {#each transactions as tx}
                    <TransactionTile
                        type={tx.type}
                        amount={tx.type === "EXPENSE" ? -Math.abs(tx.amount) : tx.amount}
                        currency={tx.currency}
                        description={tx.description}
                        date={tx.created_at}
                    />
                {/each}
            {/if}
        </div>
    </div>
</div>

<style>
    .overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 500;
        -webkit-backdrop-filter: blur(0.25rem);
        backdrop-filter: blur(0.25rem);
        padding: 1rem;
    }

    .panel {
        position: fixed;
        inset: 0;
        background: var(--meta-darker);
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem 1.25rem;
        padding-top: calc(1rem + env(safe-area-inset-top));
        background: var(--meta-dark);
        border-bottom: 0.0625rem solid rgba(255, 255, 255, 0.06);
    }

    .panel-account {
        display: flex;
        align-items: center;
        gap: 0.625rem;
    }

    .panel-icon {
        width: 2rem;
        height: 2rem;
        border-radius: 0.5rem;
        background: var(--meta-dark);
        color: var(--meta-accent);
        overflow: hidden;
    }

    .panel-icon :global(svg) {
        width: 100%;
        height: 100%;
    }

    .panel-label {
        font-size: 1.1rem;
        font-weight: 800;
        font-family: "Poppins", sans-serif;
        color: var(--meta-light);
    }

    .close-btn {
        width: 2rem;
        height: 2rem;
        border: none;
        background: rgba(255, 255, 255, 0.08);
        color: var(--meta-silver);
        border-radius: 0.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        transition: opacity 0.15s;
    }

    .close-btn:active {
        opacity: 0.7;
    }

    .close-btn svg {
        width: 1.125rem;
        height: 1.125rem;
    }

    .panel-balance {
        font-size: 1.5625rem;
        font-weight: 700;
        font-family: "Montserrat", sans-serif;
        color: var(--meta-accent);
        text-align: center;
        padding: 1rem;
        background: var(--meta-dark);
        border-bottom: 0.0625rem solid rgba(255, 255, 255, 0.06);
    }

    .panel-list {
        flex: 1;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        padding: 0.5rem 1.25rem;
        padding-bottom: calc(1.25rem + env(safe-area-inset-bottom));
    }

    .panel-empty {
        text-align: center;
        color: var(--meta-silver);
        font-size: 0.875rem;
        padding: 3rem 0;
    }
</style>
