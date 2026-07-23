<script lang="ts">
	import { page } from "$app/stores";
	import BanknoteArrowDown from "@lucide/svelte/icons/banknote-arrow-down";
	import Wallet from "@lucide/svelte/icons/wallet";
	import Settings from "@lucide/svelte/icons/settings";
</script>

<nav class="tab-bar">
	<a href="/expenses" class="tab" class:active={$page.url.pathname === "/expenses"}>
		<BanknoteArrowDown size={24} />
		<span class="tab-label">Expenses</span>
	</a>
	<a href="/accounts" class="tab" class:active={$page.url.pathname === "/accounts"}>
		<Wallet size={24} />
		<span class="tab-label">Accounts</span>
	</a>
	<a href="/settings" class="tab" class:active={$page.url.pathname === "/settings"}>
		<Settings size={24} />
		<span class="tab-label">Settings</span>
	</a>
</nav>

<style>
	.tab-bar {
		position: fixed;
		bottom: 1.25rem;
		left: 50%;
		transform: translateX(-50%);
		width: calc(100% - 3rem);
		height: 3.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 3rem;
		background: rgba(26, 38, 69, 0.6);
		-webkit-backdrop-filter: blur(1.25rem);
		backdrop-filter: blur(1.25rem);
		border-radius: 1.75rem;
		border: 0.0625rem solid rgba(255, 255, 255, 0.1);
		box-shadow: 0 0.5rem 2rem rgba(0, 0, 0, 0.5);
		z-index: 100;
	}

	.tab {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.125rem;
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

	.tab-label {
		font-size: 0.625rem;
		font-weight: 500;
		letter-spacing: 0.01em;
	}
</style>
