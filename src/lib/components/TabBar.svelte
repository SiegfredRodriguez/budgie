<script lang="ts">
	import { page } from "$app/stores";
</script>

<nav class="tab-bar">
	<a href="/expense" class="tab" class:active={$page.url.pathname === "/expense"}>
		<svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
		<span class="tab-label">Expense</span>
	</a>
	<a href="/financial" class="tab" class:active={$page.url.pathname === "/financial"}>
		<svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
		<span class="tab-label">Accounts</span>
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

	.tab-icon {
		width: 1.5rem;
		height: 1.5rem;
	}

	.tab-label {
		font-size: 0.625rem;
		font-weight: 500;
		letter-spacing: 0.01em;
	}
</style>
