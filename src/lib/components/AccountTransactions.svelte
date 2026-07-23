<script lang="ts">
    import { onMount } from "svelte";
    import { supabase } from "$lib/supabase";
    import Icon from "./Icon.svelte";
    import TransactionTile from "./TransactionTile.svelte";
    import ArrowLeft from "@lucide/svelte/icons/arrow-left";

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

    function toLocalDate(iso: string): string {
        const d = new Date(iso);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }

    function dateLabel(iso: string): string {
        const d = new Date(iso);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const ts = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const diff = today.getTime() - ts.getTime();
        const days = Math.floor(diff / 86400000);
        if (days === 0) return "Today";
        if (days === 1) return "Yesterday";
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }

    let grouped = $derived(() => {
        const map = new Map<string, Tx[]>();
        for (const tx of transactions) {
            const key = toLocalDate(tx.created_at);
            const arr = map.get(key);
            if (arr) arr.push(tx);
            else map.set(key, [tx]);
        }
        const groups: { date: string; label: string; txs: Tx[] }[] = [];
        for (const [date, txs] of map) {
            groups.push({ date, label: dateLabel(txs[0].created_at), txs });
        }
        return groups;
    });

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
            <button class="back-btn" onclick={onclose}>
                <ArrowLeft />
            </button>
            <div class="header-icon"><Icon name={account.icon} /></div>
            <span class="header-name">{account.label}</span>
            <span class="header-balance">{fmtBalance(account.balance, account.currency)}</span>
        </div>

        <div class="panel-list">
            {#if loading}
                <div class="panel-empty">Loading...</div>
            {:else if transactions.length === 0}
                <div class="panel-empty">No transactions yet</div>
            {:else}
                {#each grouped() as group}
                    <div class="date-header">{group.label}</div>
                    {#each group.txs as tx}
                        <TransactionTile
                            type={tx.type}
                            amount={tx.type === "EXPENSE" ? -Math.abs(tx.amount) : tx.amount}
                            currency={tx.currency}
                            description={tx.description}
                            date={tx.created_at}
                        />
                    {/each}
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
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.375rem;
        padding: 1rem 1.25rem;
        padding-top: calc(6rem + env(safe-area-inset-top));
        background: var(--meta-dark);
        border-bottom: 0.0625rem solid rgba(255, 255, 255, 0.06);
    }

    .back-btn {
        position: absolute;
        left: 1.25rem;
        top: 1rem;
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

    .back-btn:active {
        opacity: 0.7;
    }

    .back-btn :global(svg) {
        width: 1.125rem;
        height: 1.125rem;
    }

    .header-icon {
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 0.625rem;
        background: var(--meta-darker);
        color: var(--meta-accent);
        overflow: hidden;
    }

    .header-icon :global(svg) {
        width: 100%;
        height: 100%;
    }

    .header-name {
        font-size: 1.1rem;
        font-weight: 800;
        font-family: "Poppins", sans-serif;
        color: var(--meta-light);
    }

    .header-balance {
        font-size: 1.5625rem;
        font-weight: 700;
        font-family: "Montserrat", sans-serif;
        color: var(--meta-accent);
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

    .date-header {
        font-size: 0.75rem;
        font-weight: 600;
        font-family: "Poppins", sans-serif;
        color: var(--meta-silver);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 0.75rem 0 0.375rem;
    }

    .date-header:first-child {
        padding-top: 0.25rem;
    }
</style>
