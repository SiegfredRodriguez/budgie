<script lang="ts">
    import { onMount } from "svelte";
    import { accounts } from "$lib/stores/accounts";

    let scrollTop = $state(0);
    let headerHeight = $state(250);
    let scroller: HTMLElement;

    let total = $derived($accounts.reduce((sum, a) => sum + a.balance, 0));
    let count = $derived($accounts.length);

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
                    <button class="btn btn-primary">Top Up</button>
                    <button class="btn btn-secondary">Move</button>
                </div>
            </div>
        {/each}
    </div>
</div>

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
        padding-bottom: 1.5rem;
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
</style>
