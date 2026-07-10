<script lang="ts">
    import { onMount } from "svelte";
    import { accounts, topUpAccount, transferAccount, deleteAccount } from "$lib/stores/accounts";
    import { session } from "$lib/stores/auth";
    import AccountCard from "$lib/components/AccountCard.svelte";
    import TopUpDialog from "$lib/components/TopUpDialog.svelte";
    import TransferDialog from "$lib/components/TransferDialog.svelte";

    let scrollTop = $state(0);
    let headerHeight = $state(250);
    let scroller: HTMLElement;

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

<div class="scroller" onscroll={handleScroll}>
    <div class="hero" style="height: {headerHeight}px; transform: translateY({Math.max(scrollTop * 0.3, 0)}px)">
        <div class="hero-overlay"></div>
        <img class="hero-img" src="/hero-accounts.png" alt="" width="860" height="500" />
        <div class="summary">
            <div class="summary-total">{formatBalance(total, "PHP")}</div>
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
</style>
