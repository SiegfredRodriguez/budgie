<script lang="ts">
    import "../app.css";
    import favicon from "$lib/assets/favicon.svg";
    import { onMount } from "svelte";
    import { page } from "$app/stores";
    import { addAccount } from "$lib/stores/accounts";

    let { children } = $props();

    let showModal = $state(false);
    let icon = $state("");
    let uploadedIcon = $state("");
    let name = $state("");
    let initialValue = $state("");
    let fileInput = $state<HTMLInputElement>();

    const icons = ["bank", "piggy", "card"] as const;

    function randomIcon() {
        return icons[Math.floor(Math.random() * icons.length)];
    }

    function slugify(text: string) {
        return text.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    }

    function handleUpload(e: Event) {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            uploadedIcon = reader.result as string;
            icon = "";
        };
        reader.readAsDataURL(file);
    }

    function handleSubmit() {
        const picked = uploadedIcon || icon || randomIcon();
        addAccount({
            id: slugify(name) || crypto.randomUUID(),
            icon: picked,
            label: name || "Untitled Account",
            currency: "PHP",
            balance: parseFloat(initialValue) || 0,
        });
        icon = "";
        uploadedIcon = "";
        name = "";
        initialValue = "";
        showModal = false;
    }

    function handleOverlayClick(e: MouseEvent) {
        if (e.target === e.currentTarget) showModal = false;
    }

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
    {#if $page.url.pathname === "/financial"}
        <button class="pill-btn" onclick={() => showModal = true}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        New Account
    </button>
    {/if}

    {#if showModal}
        <div class="overlay" onclick={handleOverlayClick} onkeydown={(e) => e.key === 'Escape' && (showModal = false)} role="presentation">
            <div class="modal" role="dialog" aria-modal="true" tabindex="-1">
                <button class="modal-close" onclick={() => showModal = false} aria-label="Close">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
                <h2 class="modal-title">New Account</h2>

                <div class="field">
                    <span class="field-label">Icon</span>
                    <div class="icon-picker">
                        {#each icons as ic}
                            <button
                                class="icon-option"
                                class:selected={icon === ic}
                                onclick={() => { icon = ic; uploadedIcon = ""; }}
                                aria-label={ic}
                            >
                                {#if ic === 'bank'}
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M3 21h18"/><path d="M3 10h18"/><path d="M5 6l7-3 7 3"/><path d="M4 10v11"/><path d="M20 10v11"/><path d="M8 14v3"/><path d="M12 14v3"/><path d="M16 14v3"/>
                                    </svg>
                                {:else if ic === 'piggy'}
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.4-1 1.4-1.8"/><path d="M21 5.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/><line x1="7" y1="11" x2="7" y2="11.01" stroke-width="3" stroke-linecap="round"/>
                                    </svg>
                                {:else if ic === 'card'}
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/><line x1="6" y1="15" x2="10" y2="15"/>
                                    </svg>
                                {/if}
                            </button>
                        {/each}

                        <button class="icon-option upload-option" class:selected={!!uploadedIcon} onclick={() => fileInput?.click()} aria-label="Upload custom icon">
                            {#if uploadedIcon}
                                <img class="upload-preview" src={uploadedIcon} alt="" />
                            {:else}
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                                </svg>
                            {/if}
                        </button>
                    </div>
                    <input type="file" accept="image/*" class="file-input" bind:this={fileInput} onchange={handleUpload} />
                </div>

                <div class="field">
                    <label class="field-label" for="name">Account Name</label>
                    <input id="name" class="field-input" type="text" placeholder="e.g. Savings Account" bind:value={name} />
                </div>

                <div class="field">
                    <label class="field-label" for="initial">Initial Value</label>
                    <input id="initial" class="field-input" type="number" placeholder="0" bind:value={initialValue} />
                </div>

                <button class="submit-btn" onclick={handleSubmit}>Create Account</button>
            </div>
        </div>
    {/if}

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

    .pill-btn {
        position: fixed;
        top: calc(8px + env(safe-area-inset-top));
        right: calc(16px + env(safe-area-inset-right));
        height: 36px;
        border-radius: 18px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 0 14px 0 10px;
        background: rgba(26, 38, 69, 0.6);
        -webkit-backdrop-filter: blur(20px);
        backdrop-filter: blur(20px);
        color: var(--meta-light);
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        z-index: 200;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        transition: transform 0.15s, background 0.15s;
        -webkit-tap-highlight-color: transparent;
        user-select: none;
    }

    .pill-btn:active {
        transform: scale(0.96);
        background: rgba(26, 38, 69, 0.8);
    }

    .pill-btn svg {
        width: 16px;
        height: 16px;
        color: var(--meta-accent);
    }

    .overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 300;
        -webkit-backdrop-filter: blur(4px);
        backdrop-filter: blur(4px);
        padding: 24px;
    }

    .modal {
        background: var(--meta-dark);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        padding: 32px 24px 24px;
        width: 100%;
        max-width: 400px;
        position: relative;
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
    }

    .modal-close {
        position: absolute;
        top: 12px;
        right: 12px;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.08);
        color: var(--meta-silver);
        cursor: pointer;
        transition: background 0.15s;
        -webkit-tap-highlight-color: transparent;
    }

    .modal-close:hover {
        background: rgba(255, 255, 255, 0.15);
    }

    .modal-close svg {
        width: 18px;
        height: 18px;
    }

    .modal-title {
        font-size: 20px;
        font-weight: 600;
        color: var(--meta-light);
        margin-bottom: 20px;
    }

    .field {
        margin-bottom: 16px;
    }

    .field-label {
        display: block;
        font-size: 13px;
        font-weight: 600;
        color: var(--meta-silver);
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }

    .field-input {
        width: 100%;
        height: 44px;
        padding: 0 14px;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: var(--meta-darker);
        color: var(--meta-light);
        font-size: 16px;
        outline: none;
        transition: border-color 0.15s;
    }

    .field-input:focus {
        border-color: var(--meta-accent);
    }

    .field-input::placeholder {
        color: rgba(255, 255, 255, 0.25);
    }

    .icon-picker {
        display: flex;
        gap: 10px;
    }

    .icon-option {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        border: 2px solid rgba(255, 255, 255, 0.08);
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--meta-darker);
        color: var(--meta-silver);
        cursor: pointer;
        transition: border-color 0.15s, color 0.15s, background 0.15s;
        -webkit-tap-highlight-color: transparent;
    }

    .icon-option.selected {
        border-color: var(--meta-accent);
        color: var(--meta-accent);
        background: rgba(64, 224, 208, 0.1);
    }

    .icon-option svg {
        width: 24px;
        height: 24px;
    }

    .upload-option {
        margin-left: auto;
    }

    .upload-preview {
        width: 32px;
        height: 32px;
        border-radius: 6px;
        object-fit: cover;
    }

    .file-input {
        display: none;
    }

    .submit-btn {
        width: 100%;
        height: 48px;
        border-radius: 12px;
        border: none;
        background: var(--meta-accent);
        color: var(--meta-darker);
        font-size: 16px;
        font-weight: 700;
        cursor: pointer;
        margin-top: 8px;
        transition: opacity 0.15s;
        -webkit-tap-highlight-color: transparent;
    }

    .submit-btn:active {
        opacity: 0.7;
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
