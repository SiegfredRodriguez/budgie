<script lang="ts">
    let {
        type,
        amount,
        currency,
        description,
        date,
    }: {
        type: string;
        amount: number;
        currency: string;
        description: string | null;
        date: string;
    } = $props();

    function fmt(n: number, c: string): string {
        const abs = Math.abs(n);
        const p = abs.toFixed(2).split(".");
        p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return `${c} ${n < 0 ? "-" : "+"}${p[0]}.${p[1]}`;
    }

    let typeLabel = $derived(
        type === "EXPENSE"
            ? "Expense"
            : type === "TOP_UP"
              ? "Top Up"
              : type === "TRANSFER"
                ? "Transfer"
                : "Created",
    );

    let colorClass = $derived(
        type === "EXPENSE"
            ? "tx-red"
            : type === "TOP_UP"
              ? "tx-teal"
              : type === "TRANSFER"
                ? "tx-blue"
                : "tx-silver",
    );

    let formattedDate = $derived(() => {
        const d = new Date(date);
        return d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    });
</script>

<div class="tile">
    <div class="tile-icon {colorClass}">
        {#if type === "EXPENSE"}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg>
        {:else if type === "TOP_UP"}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>
        {:else if type === "TRANSFER"}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>
        {:else}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
        {/if}
    </div>
    <div class="tile-body">
        <span class="tile-type">{typeLabel}</span>
        {#if description}
            <span class="tile-desc">{description}</span>
        {/if}
    </div>
    <span class="tile-amount {amount < 0 ? "tx-red" : "tx-teal"}">{fmt(amount, currency)}</span>
</div>

<style>
    .tile {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 0;
        border-bottom: 0.0625rem solid rgba(255, 255, 255, 0.06);
    }

    .tile:last-child {
        border-bottom: none;
    }

    .tile-icon {
        width: 2rem;
        height: 2rem;
        border-radius: 0.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .tile-icon :global(svg) {
        width: 1rem;
        height: 1rem;
    }

    .tx-red {
        color: #ff4d4d;
        background: rgba(255, 77, 77, 0.12);
    }

    .tx-teal {
        color: var(--meta-accent);
        background: rgba(64, 224, 208, 0.12);
    }

    .tx-blue {
        color: #5b8def;
        background: rgba(91, 141, 239, 0.12);
    }

    .tx-silver {
        color: var(--meta-silver);
        background: rgba(160, 176, 192, 0.12);
    }

    .tile-body {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
    }

    .tile-type {
        font-size: 0.875rem;
        font-weight: 600;
        font-family: "Poppins", sans-serif;
        color: var(--meta-light);
    }

    .tile-desc {
        font-size: 0.75rem;
        color: var(--meta-silver);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .tile-amount {
        font-size: 0.875rem;
        font-weight: 700;
        font-family: "Montserrat", sans-serif;
        flex-shrink: 0;
    }
</style>
