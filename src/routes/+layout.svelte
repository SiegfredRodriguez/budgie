<script lang="ts">
	import "../app.css";
	import favicon from "$lib/assets/favicon.svg";
	import { onMount } from "svelte";
	import { page } from "$app/stores";
	import { goto } from "$app/navigation";
	import { addAccount } from "$lib/stores/accounts";
	import { initLD } from "$lib/stores/flags";
	import { session, authReady, initAuth } from "$lib/stores/auth";
	import TabBar from "$lib/components/TabBar.svelte";
	import NewAccountDialog from "$lib/components/NewAccountDialog.svelte";

	let { children } = $props();

	let showModal = $state(false);

	let authProtected = $derived.by(() => {
		const path = $page.url.pathname;
		return path !== "/login" && path !== "/auth/callback";
	});

	$effect(() => {
		if (!$authReady) return;

		if (!$session && authProtected) {
			goto("/login");
		} else if ($session && $page.url.pathname === "/") {
			goto("/financial");
		}
	});

	async function handleCreate(data: { icon: string; name: string; initialValue: string }) {
		try {
			await addAccount({
				icon: data.icon || "wallet",
				label: data.name || "Untitled Account",
				currency: "PHP",
				balance: parseFloat(data.initialValue) || 0,
			});
		} catch (e) {
			console.error("Failed to create account", e);
			return;
		}
		showModal = false;
	}

	onMount(() => {
		initAuth();
		initLD();
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

{#if !$authReady}
	<div class="splash">
		<div class="spinner" />
	</div>
{:else if !$session}
	<main class="content">
		{@render children()}
	</main>
{:else}
	<div id="app">
		{#if $page.url.pathname === "/financial"}
			<button class="pill-btn" onclick={() => showModal = true}>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
				New Account
			</button>
		{/if}

		<NewAccountDialog show={showModal} onclose={() => showModal = false} onsubmit={handleCreate} />

		<main class="content">
			{@render children()}
		</main>

		<TabBar />
	</div>
{/if}

<style>
	.splash {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
	}

	.spinner {
		width: 1.5rem;
		height: 1.5rem;
		border: 0.125rem solid rgba(255, 255, 255, 0.15);
		border-top-color: var(--meta-accent);
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.content {
		flex: 1;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
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
