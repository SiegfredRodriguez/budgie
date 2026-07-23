<script lang="ts">
	import "../app.css";
	import favicon from "$lib/assets/favicon.svg";
	import { onMount } from "svelte";
	import { goto, onNavigate } from "$app/navigation";
	import { page } from "$app/stores";
	import { initAccounts } from "$lib/stores/accounts";
	import { initExpenses } from "$lib/stores/expenses";
	import { initTags } from "$lib/stores/tags";
	import { initPayees } from "$lib/stores/payees";
	import { bootstrapReady } from "$lib/stores/init";
	import { initLD } from "$lib/stores/flags";
	import { session, authReady, initAuth } from "$lib/stores/auth";
	import TabBar from "$lib/components/TabBar.svelte";


	let { children } = $props();

	let splashDone = $state(false);
	let splashStart = $state(Date.now());

	let authProtected = $derived.by(() => {
		const path = $page.url.pathname;
		return path !== "/login" && path !== "/auth/callback";
	});

	$effect(() => {
		if (!$authReady) return;

		if (!$session && authProtected) {
			goto("/login");
		} else if ($session && ($page.url.pathname === "/" || $page.url.pathname === "/login")) {
			goto("/expenses");
		}
	});

	$effect(() => {
		if ($bootstrapReady && splashStart > 0) {
			const elapsed = Date.now() - splashStart;
			const remaining = Math.max(0, 2000 - elapsed);
			setTimeout(() => splashDone = true, remaining);
		}
	});

	onNavigate((navigation) => {
		if (!document.startViewTransition) return;
		const to = navigation.to?.url.pathname;
		const from = navigation.from?.url.pathname;
		if (!to || !from) return;
		if (to === from) return;
		if (from === '/' || from === '/login' || to === '/login') return;

		return new Promise<void>((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});


	onMount(() => {
		initAuth();
		initLD();
		initAccounts();
		initExpenses();
		initTags();
		initPayees();
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

{#if !$session}
	<main class="content">
		{@render children()}
	</main>
{:else}
	<div id="app">
		<main class="content">
			{@render children()}
		</main>

		<TabBar />
	</div>
{/if}

<div class="splash-overlay" class:done={splashDone}>
	<img src={favicon} alt="budgie" class="splash-logo" />
	<span class="splash-name">budgie</span>
</div>

<style>
	.content {
		flex: 1;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
	}


	.splash-overlay {
		position: fixed;
		inset: 0;
		z-index: 9999;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		background: var(--meta-darker);
		opacity: 1;
		transition: opacity 0.5s ease;
		pointer-events: all;
	}

	.splash-overlay.done {
		opacity: 0;
		pointer-events: none;
	}

	.splash-logo {
		width: 3rem;
		height: 3rem;
	}

	.splash-name {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--meta-light);
		letter-spacing: 0.04em;
	}

	::view-transition-old(root) {
		animation: ft-out 0.2s cubic-bezier(0.4, 0, 1, 1) forwards;
	}

	::view-transition-new(root) {
		animation: ft-in 0.2s linear both;
	}

	@keyframes ft-out {
		from { opacity: 1; }
		to { opacity: 0; }
	}

	@keyframes ft-in {
		0% { opacity: 0; transform: translateY(8%); }
		10% { opacity: 0; transform: translateY(8%); }
		20% { opacity: 0; transform: translateY(8%); }
		30% { opacity: 0; transform: translateY(8%); }
		35% { opacity: 0; transform: translateY(8%); }
		40% { opacity: 0.19; transform: translateY(6.8%); }
		45% { opacity: 0.38; transform: translateY(4.9%); }
		50% { opacity: 0.58; transform: translateY(3.1%); }
		55% { opacity: 0.77; transform: translateY(1.6%); }
		60% { opacity: 0.96; transform: translateY(0.5%); }
		65% { opacity: 1; transform: translateY(0); }
		70% { opacity: 1; transform: translateY(0); }
		75% { opacity: 1; transform: translateY(0); }
		80% { opacity: 1; transform: translateY(0); }
		85% { opacity: 1; transform: translateY(0); }
		90% { opacity: 1; transform: translateY(0); }
		95% { opacity: 1; transform: translateY(0); }
		100% { opacity: 1; transform: translateY(0); }
	}
</style>
