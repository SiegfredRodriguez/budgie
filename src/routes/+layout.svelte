<script lang="ts">
    import "../app.css";
    import favicon from "$lib/assets/favicon.svg";
    import { onMount } from "svelte";
    import { page } from "$app/stores";

    let { children } = $props();

    onMount(() => {
        if ("serviceWorker" in navigator) {
            const swUrl = import.meta.env.DEV ? "/dev-sw.js?dev-sw" : "/sw.js";
            navigator.serviceWorker.register(swUrl, {
                scope: "/",
                type: import.meta.env.DEV ? "module" : "classic",
            });
        }
    });
</script>

<svelte:head>
    <link rel="icon" href={favicon} />
    <link rel="apple-touch-icon" href="/pwa-192x192.png" />
</svelte:head>

<div id="app">
    <main class="content">
        {@render children()}
    </main>

    <nav class="tab-bar">
        <a href="/" class="tab" class:active={$page.url.pathname === "/"}>
            <svg
                class="tab-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
            </svg>
            <span class="tab-label">Home</span>
        </a>
        <a
            href="/financial"
            class="tab"
            class:active={$page.url.pathname === "/financial"}
        >
            <svg
                class="tab-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <rect x="1" y="4" width="22" height="16" rx="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
            <span class="tab-label">Accounts</span>
        </a>
    </nav>
</div>

<style>
    .content {
        flex: 1;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
    }

    .tab-bar {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        width: calc(100% - 48px);
        height: 52px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 48px;
        background: rgba(26, 38, 69, 0.6);
        -webkit-backdrop-filter: blur(20px);
        backdrop-filter: blur(20px);
        border-radius: 28px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        z-index: 100;
    }

    .tab {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        text-decoration: none;
        color: var(--meta-silver);
        transition: color 0.15s;
        -webkit-tap-highlight-color: transparent;
        user-select: none;
        flex: 1;
        height: 100%;
    }

    .tab.active {
        color: var(--meta-accent);
    }

    .tab-icon {
        width: 24px;
        height: 24px;
    }

    .tab-label {
        font-size: 10px;
        font-weight: 500;
        letter-spacing: 0.01em;
    }
</style>
