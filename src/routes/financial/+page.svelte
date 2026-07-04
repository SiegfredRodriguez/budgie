<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { accounts, topUpAccount, transferAccount, loadAccounts, subscribeAccounts, unsubscribeAccounts } from "$lib/stores/accounts";

    let scrollTop = $state(0);
    let headerHeight = $state(250);
    let scroller: HTMLElement;

    let total = $derived($accounts.reduce((sum, a) => sum + a.balance, 0));
    let count = $derived($accounts.length);

    let showTopUp = $state(false);
    let topUpAccountId = $state("");
    let topUpAmount = $state("");

    let topUpTarget = $derived($accounts.find((a) => a.id === topUpAccountId));
    let topUpResult = $derived(topUpTarget ? topUpTarget.balance + (parseFloat(topUpAmount) || 0) : 0);

    let showTransfer = $state(false);
    let transferSourceId = $state("");
    let transferAmount = $state("");
    let transferTargetId = $state("");
    let showTargetDropdown = $state(false);

    let transferSource = $derived($accounts.find((a) => a.id === transferSourceId));
    let transferTarget = $derived($accounts.find((a) => a.id === transferTargetId));
    let transferOtherAccounts = $derived($accounts.filter((a) => a.id !== transferSourceId));
    let transferNewSource = $derived(transferSource ? transferSource.balance - (parseFloat(transferAmount) || 0) : 0);
    let transferNewTarget = $derived(transferTarget ? transferTarget.balance + (parseFloat(transferAmount) || 0) : 0);

    function openTransfer(id: string) {
        transferSourceId = id;
        transferAmount = "";
        transferTargetId = "";
        showTargetDropdown = false;
        showTransfer = true;
    }

    function handleTransferDone() {
        if (!transferSource || !transferTarget) return;
        const amount = parseFloat(transferAmount);
        if (amount <= 0) return;
        if (transferSource.balance < amount) return;
        transferAccount(transferSourceId, transferTargetId, amount);
        showTransfer = false;
    }

    function handleTransferOverlayClick(e: MouseEvent) {
        if (e.target === e.currentTarget) showTransfer = false;
    }

    function selectTarget(id: string) {
        transferTargetId = id;
        showTargetDropdown = false;
    }

    function openTopUp(id: string) {
        topUpAccountId = id;
        topUpAmount = "";
        showTopUp = true;
    }

    function handleTopUpDone() {
        if (!topUpTarget) return;
        const amount = parseFloat(topUpAmount);
        if (amount <= 0) return;
        topUpAccount(topUpAccountId, amount);
        showTopUp = false;
    }

    function handleTopUpOverlayClick(e: MouseEvent) {
        if (e.target === e.currentTarget) showTopUp = false;
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
        loadAccounts();
        subscribeAccounts();
    });

    onDestroy(() => {
        unsubscribeAccounts();
    });
</script>

<div class="scroller" onscroll={handleScroll}>
    <div
        class="hero"
        style="height: {headerHeight}px; transform: translateY({Math.max(
            scrollTop * 0.3,
            0,
        )}px)"
    >
        <div class="hero-overlay"></div>
        <img
            class="hero-img"
            src="https://picsum.photos/seed/budgie/860/500"
            alt=""
            width="860"
            height="500"
        />
        <div class="summary">
            <div class="summary-total">{formatBalance(total, "PHP")}</div>
            <div class="summary-sub">
                {count}
                {count === 1 ? "account" : "accounts"}
            </div>
        </div>
    </div>

    <div
        class="card-list"
        style="margin-top: -{headerHeight}px; padding-top: {headerHeight +
            12}px"
    >
        {#each $accounts as account}
            <div class="card">
                <div class="card-top">
                    <div class="card-icon">
                        {#if account.icon === "bank"}
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <path d="M3 21h18" />
                                <path d="M3 10h18" />
                                <path d="M5 6l7-3 7 3" />
                                <path d="M4 10v11" />
                                <path d="M20 10v11" />
                                <path d="M8 14v3" />
                                <path d="M12 14v3" />
                                <path d="M16 14v3" />
                            </svg>
                        {:else if account.icon === "piggy"}
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <path
                                    d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.4-1 1.4-1.8"
                                />
                                <path
                                    d="M21 5.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"
                                />
                                <line
                                    x1="7"
                                    y1="11"
                                    x2="7"
                                    y2="11.01"
                                    stroke-width="3"
                                    stroke-linecap="round"
                                />
                            </svg>
                        {:else if account.icon === "card"}
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <rect
                                    x="1"
                                    y="4"
                                    width="22"
                                    height="16"
                                    rx="2"
                                />
                                <line x1="1" y1="10" x2="23" y2="10" />
                                <line x1="6" y1="15" x2="10" y2="15" />
                            </svg>
                        {/if}
                    </div>
                    <span class="card-label">{account.label}</span>
                </div>

                <div class="card-balance">
                    {formatBalance(account.balance, account.currency)}
                </div>

                <div class="card-actions">
                    <button class="btn btn-primary" onclick={() => openTopUp(account.id)}>Top Up</button>
                    <button class="btn btn-secondary" onclick={() => openTransfer(account.id)}>Transfer</button>
                </div>
            </div>
        {/each}
    </div>
</div>

{#if showTopUp && topUpTarget}
    <div class="overlay" onclick={handleTopUpOverlayClick} onkeydown={(e) => e.key === "Escape" && (showTopUp = false)} role="presentation">
        <div class="modal" role="dialog" aria-modal="true" tabindex="-1">
            <div class="modal-header">
                <div class="modal-header-main">{formatBalance(topUpResult, topUpTarget.currency)}</div>
                <div class="modal-header-sub">New Balance</div>
            </div>
            <div class="modal-row">
                <input class="modal-input" type="number" placeholder="Top Up Amount" bind:value={topUpAmount} />
            </div>
            <div class="modal-actions">
                <button class="btn btn-secondary" onclick={() => showTopUp = false}>Cancel</button>
                <button class="btn btn-primary" onclick={handleTopUpDone}>Top Up</button>
            </div>
        </div>
    </div>
{/if}

{#if showTransfer && transferSource}
    <div class="overlay" onclick={handleTransferOverlayClick} onkeydown={(e) => e.key === "Escape" && (showTransfer = false)} role="presentation">
        <div class="modal" role="dialog" aria-modal="true" tabindex="-1">
            <div class="modal-row">
                <input class="modal-input" type="number" placeholder="Transfer Amount" bind:value={transferAmount} />
            </div>

            <div class="transfer-endpoint">
                    <button class="transfer-dropdown-btn" onclick={() => showTargetDropdown = !showTargetDropdown}>
                        {#if transferTarget}
                            <div class="card-icon">
                                {#if transferTarget.icon === "bank"}
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18" /><path d="M3 10h18" /><path d="M5 6l7-3 7 3" /><path d="M4 10v11" /><path d="M20 10v11" /><path d="M8 14v3" /><path d="M12 14v3" /><path d="M16 14v3" /></svg>
                                {:else if transferTarget.icon === "piggy"}
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.4-1 1.4-1.8" /><path d="M21 5.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z" /><line x1="7" y1="11" x2="7" y2="11.01" stroke-width="3" stroke-linecap="round" /></svg>
                                {:else if transferTarget.icon === "card"}
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /><line x1="6" y1="15" x2="10" y2="15" /></svg>
                                {/if}
                            </div>
                            <span class="transfer-label">{transferTarget.label}</span>
                        {:else}
                            <span class="transfer-placeholder">Select account</span>
                        {/if}
                        <svg class="transfer-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                    </button>
                    {#if showTargetDropdown}
                        <div class="transfer-dropdown">
                            {#each transferOtherAccounts as acct}
                                <button class="transfer-option" onclick={() => selectTarget(acct.id)}>
                                    <div class="card-icon">
                                        {#if acct.icon === "bank"}
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18" /><path d="M3 10h18" /><path d="M5 6l7-3 7 3" /><path d="M4 10v11" /><path d="M20 10v11" /><path d="M8 14v3" /><path d="M12 14v3" /><path d="M16 14v3" /></svg>
                                        {:else if acct.icon === "piggy"}
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.4-1 1.4-1.8" /><path d="M21 5.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z" /><line x1="7" y1="11" x2="7" y2="11.01" stroke-width="3" stroke-linecap="round" /></svg>
                                        {:else if acct.icon === "card"}
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /><line x1="6" y1="15" x2="10" y2="15" /></svg>
                                        {/if}
                                    </div>
                                    <span class="transfer-label">{acct.label}</span>
                                </button>
                            {/each}
                        </div>
                    {/if}
                </div>

            <div class="modal-actions">
                <button class="btn btn-secondary" onclick={() => showTransfer = false}>Cancel</button>
                <button class="btn btn-primary" onclick={handleTransferDone}>Transfer</button>
            </div>
        </div>
    </div>
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
        background: linear-gradient(
            180deg,
            transparent 50%,
            var(--meta-darker)
        );
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

    .card {
        display: flex;
        flex-direction: column;
        gap: 0.875rem;
        padding: 1rem;
        background: var(--meta-dark);
        border-radius: 0.875rem;
        border: 0.0625rem solid rgba(255, 255, 255, 0.06);
    }

    .card-top {
        display: flex;
        align-items: center;
        gap: 0.625rem;
    }

    .card-icon {
        width: 2rem;
        height: 2rem;
        padding: 0.3125rem;
        border-radius: 0.5rem;
        background: var(--meta-darker);
        color: var(--meta-accent);
        flex-shrink: 0;
    }

    .card-icon :global(svg) {
        width: 100%;
        height: 100%;
    }

    .card-label {
        font-size: 0.938rem;
        font-weight: 600;
        color: var(--meta-light);
    }

    .card-balance {
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--meta-accent);
        letter-spacing: 0.01em;
    }

    .card-actions {
        display: flex;
        gap: 0.5rem;
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

    .btn:active {
        opacity: 0.7;
    }

    .btn-primary {
        color: var(--meta-darker);
        background: var(--meta-accent);
    }

    .btn-secondary {
        color: var(--meta-light);
        background: var(--meta-blue);
        border: 0.0625rem solid rgba(255, 255, 255, 0.08);
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

    .modal-header {
        text-align: center;
        padding-bottom: 0.5rem;
    }

    .modal-header-main {
        font-size: 1.625rem;
        font-weight: 800;
        color: var(--meta-light);
        letter-spacing: 0.01em;
        line-height: 1.2;
    }

    .modal-header-sub {
        font-size: 0.8125rem;
        font-weight: 500;
        color: var(--meta-silver);
        margin-top: 0.125rem;
    }

    .modal-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
    }

    .modal-label {
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--meta-silver);
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

    .modal-input:focus {
        border-color: var(--meta-accent);
    }

    .modal-input::placeholder {
        color: rgba(255, 255, 255, 0.25);
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

    .transfer-endpoint {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        min-width: 0;
        width: 100%;
        position: relative;
    }

    .transfer-endpoint .card-icon {
        width: 1.75rem;
        height: 1.75rem;
        padding: 0.25rem;
        flex-shrink: 0;
    }

    .transfer-label {
        font-size: 0.8125rem;
        font-weight: 600;
        color: var(--meta-light);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .transfer-dropdown-btn {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.375rem 0.5rem;
        border-radius: 0.625rem;
        border: 0.0625rem solid rgba(255, 255, 255, 0.1);
        background: var(--meta-darker);
        color: var(--meta-light);
        cursor: pointer;
        width: 100%;
        -webkit-tap-highlight-color: transparent;
    }

    .transfer-dropdown-btn:active {
        opacity: 0.7;
    }

    .transfer-placeholder {
        font-size: 0.8125rem;
        color: rgba(255, 255, 255, 0.35);
    }

    .transfer-chevron {
        width: 1rem;
        height: 1rem;
        color: var(--meta-silver);
        margin-left: auto;
        flex-shrink: 0;
    }

    .transfer-dropdown {
        position: absolute;
        inset: 100% 0 auto 0;
        margin-top: 0.25rem;
        background: var(--meta-darker);
        border: 0.0625rem solid rgba(255, 255, 255, 0.1);
        border-radius: 0.625rem;
        overflow: hidden;
        z-index: 10;
    }

    .transfer-option {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        width: 100%;
        padding: 0.5rem 0.625rem;
        border: none;
        background: transparent;
        color: var(--meta-light);
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
    }

    .transfer-option:hover {
        background: rgba(255, 255, 255, 0.05);
    }

    .transfer-option .card-icon {
        width: 1.5rem;
        height: 1.5rem;
        padding: 0.1875rem;
    }

    .transfer-sub {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.375rem;
        font-size: 0.8125rem;
        font-weight: 500;
        color: var(--meta-silver);
        text-align: center;
        flex-wrap: wrap;
    }

    .transfer-sub-sep {
        color: var(--meta-accent);
    }
</style>
