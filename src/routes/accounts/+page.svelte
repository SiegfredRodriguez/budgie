<script lang="ts">
    import { onMount } from "svelte";
    import { accounts, topUpAccount, transferAccount, deleteAccount, addAccount } from "$lib/stores/accounts";
    import { session } from "$lib/stores/auth";
    import AccountCard from "$lib/components/AccountCard.svelte";
    import AccountTransactions from "$lib/components/AccountTransactions.svelte";
    import TopUpDialog from "$lib/components/TopUpDialog.svelte";
    import TransferDialog from "$lib/components/TransferDialog.svelte";
    import NewAccountDialog from "$lib/components/NewAccountDialog.svelte";
    import Eye from "@lucide/svelte/icons/eye";
    import EyeClosed from "@lucide/svelte/icons/eye-closed";

    let scrollTop = $state(0);
    let headerHeight = $state(250);
    let scroller: HTMLElement;
    let heroCensored = $state(true);

    let total = $derived($accounts.reduce((sum, a) => sum + a.balance, 0));
    let count = $derived($accounts.length);

    let showTopUp = $state(false);
    let topUpAccountId = $state("");
    let topUpAmount = $state("");

    let topUpTarget = $derived($accounts.find((a) => a.id === topUpAccountId));

    let showTransfer = $state(false);
    let transferSourceId = $state("");
    let transferAmount = $state("");
    let transferTargetId = $state("");

    let transferSource = $derived($accounts.find((a) => a.id === transferSourceId));
    let transferTarget = $derived($accounts.find((a) => a.id === transferTargetId));
    let transferOtherAccounts = $derived($accounts.filter((a) => a.id !== transferSourceId));

    let showTransactions = $state(false);
    let showModal = $state(false);
    let selectedAccountId = $state("");
    let selectedAccount = $derived($accounts.find((a) => a.id === selectedAccountId));

    function openTransfer(id: string) {
        transferSourceId = id;
        transferAmount = "";
        transferTargetId = "";
        showTransfer = true;
    }

    async function handleTransferDone() {
        if (!transferSource || !transferTarget) return;
        const amount = parseFloat(transferAmount);
        if (amount <= 0) return;
        if (transferSource.balance < amount) return;
        try {
            await transferAccount(transferSourceId, transferTargetId, amount, $session!.user.id);
            showTransfer = false;
        } catch (e) {
            console.error("Transfer failed", e);
        }
    }

    function selectTarget(id: string) {
        transferTargetId = id;
    }

    async function handleCreate(data: { icon: string; name: string; initialValue: string }) {
        try {
            await addAccount(
                {
                    icon: data.icon || "wallet",
                    label: data.name || "Untitled Account",
                    currency: "PHP",
                    balance: parseFloat(data.initialValue) || 0,
                },
                $session!.user.id,
            );
        } catch (e) {
            console.error("Failed to create account", e);
            return;
        }
        showModal = false;
    }

    function openTransactions(id: string) {
        selectedAccountId = id;
        showTransactions = true;
    }

    function openTopUp(id: string) {
        topUpAccountId = id;
        topUpAmount = "";
        showTopUp = true;
    }

    async function handleTopUpDone() {
        if (!topUpTarget) return;
        const amount = parseFloat(topUpAmount);
        if (amount <= 0) return;
        try {
            await topUpAccount(topUpAccountId, amount, $session!.user.id);
            showTopUp = false;
        } catch (e) {
            console.error("Top-up failed", e);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Delete this account? All transactions will be lost.")) return;
        try {
            await deleteAccount(id);
        } catch (e) {
            console.error("Failed to delete account", e);
        }
    }

    function formatBalance(amount: number, currency: string): string {
        const abs = Math.abs(amount);
        const parts = abs.toFixed(2).split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return `${currency} ${amount < 0 ? "-" : ""}${parts[0]}.${parts[1]}`;
    }

    function handleScroll() {
        scrollTop = scroller.scrollTop;
    }

    onMount(() => {
        scroller = document.querySelector(".scroller") as HTMLElement;
    });
</script>

{#if !showTransactions}
    <button class="pill-btn" onclick={() => showModal = true}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        New Account
    </button>
{/if}

<NewAccountDialog show={showModal} onclose={() => showModal = false} onsubmit={handleCreate} />

<div class="scroller" onscroll={handleScroll}>
    <div class="hero" style="height: {headerHeight}px; transform: translateY({Math.max(scrollTop * 0.3, 0)}px)">
        <div class="hero-overlay"></div>
        <img class="hero-img" src="/hero-accounts.png" alt="" width="860" height="500" />
        <div class="summary">
            <div class="summary-total-row">
                <div class="summary-total">{heroCensored ? "••••••" : formatBalance(total, "PHP")}</div>
                <button class="eye-btn" onclick={() => heroCensored = !heroCensored} aria-label={heroCensored ? "Show total" : "Hide total"}>
                    {#if heroCensored}
                        <Eye size={18} />
                    {:else}
                        <EyeClosed size={18} />
                    {/if}
                </button>
            </div>
            <div class="summary-sub">{count} {count === 1 ? "account" : "accounts"}</div>
        </div>
    </div>

    <div class="card-list" style="margin-top: -{headerHeight}px; padding-top: {headerHeight + 12}px">
        {#each $accounts as account}
            <AccountCard
                id={account.id}
                icon={account.icon}
                label={account.label}
                balance={account.balance}
                currency={account.currency}
                ontopup={openTopUp}
                ontransfer={openTransfer}
                ondelete={handleDelete}
                onlongpress={openTransactions}
            />
        {/each}
    </div>
</div>

<TopUpDialog
    show={showTopUp}
    target={topUpTarget}
    amount={topUpAmount}
    onclose={() => showTopUp = false}
    ondone={handleTopUpDone}
    onamount={(v) => topUpAmount = v}
/>
<TransferDialog
    show={showTransfer}
    source={transferSource}
    target={transferTarget}
    otherAccounts={transferOtherAccounts}
    onclose={() => showTransfer = false}
    ondone={handleTransferDone}
    onamount={(v) => transferAmount = v}
    onselect={selectTarget}
/>
{#if showTransactions && selectedAccount}
    <AccountTransactions
        account={selectedAccount}
        onclose={() => showTransactions = false}
    />
{/if}

<style>
    .scroller {
        height: 100%;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
    }

    .hero {
        position: relative;
        overflow: hidden;
        will-change: transform;
        z-index: 3;
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
        z-index: 3;
        padding-top: 4rem;
    }

    .summary-total-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .summary-total {
        font-size: 2rem;
        font-weight: 800;
        color: var(--meta-light);
        letter-spacing: 0.02em;
        text-shadow: 0 0.125rem 0.75rem rgba(0, 0, 0, 0.5);
        pointer-events: none;
    }

    .eye-btn {
        background: none;
        border: none;
        color: var(--meta-silver);
        cursor: pointer;
        padding: 0.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 0.15s;
        -webkit-tap-highlight-color: transparent;
    }

    .eye-btn:active {
        color: var(--meta-light);
    }

    .summary-sub {
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--meta-silver);
        margin-top: 0.25rem;
        text-shadow: 0 0.0625rem 0.375rem rgba(0, 0, 0, 0.4);
        pointer-events: none;
    }

    .card-list {
        position: relative;
        z-index: 2;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        padding-left: 1rem;
        padding-right: 1rem;
        padding-bottom: 6rem;
    }

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
</style>
