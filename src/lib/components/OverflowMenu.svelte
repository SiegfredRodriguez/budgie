<script lang="ts">
	import { goto } from "$app/navigation";
	import Logs from "@lucide/svelte/icons/logs";
	import Tag from "@lucide/svelte/icons/tag";
	import Store from "@lucide/svelte/icons/store";

	let showCtxMenu = $state(false);
</script>

<div class="ctx-wrapper">
	<button class="ctx-btn" onclick={() => showCtxMenu = !showCtxMenu}>
		<Logs size={20} strokeWidth={3}/>
	</button>
	{#if showCtxMenu}
		<div class="ctx-overlay" onclick={() => showCtxMenu = false}></div>
		<div class="ctx-dropdown">
			<button class="ctx-item" onclick={() => { goto('/tags'); showCtxMenu = false; }}>
				<Tag size={16} strokeWidth={2} />
				Tags
			</button>
			<button class="ctx-item" onclick={() => { goto('/payees'); showCtxMenu = false; }}>
				<Store size={16} strokeWidth={2} />
				Payees
			</button>
		</div>
	{/if}
</div>

<style>
	.ctx-wrapper {
		position: fixed;
		top: calc(0.5rem + env(safe-area-inset-top));
		right: calc(1rem + env(safe-area-inset-right));
		z-index: 200;
	}

	.ctx-btn {
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 50%;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		color: var(--meta-darker);
		cursor: pointer;
		transition: opacity 0.15s;
		-webkit-tap-highlight-color: transparent;
		user-select: none;
	}

	.ctx-btn:active {
		opacity: 0.6;
	}

	.ctx-overlay {
		position: fixed;
		inset: 0;
	}

	.ctx-dropdown {
		position: absolute;
		top: calc(100% + 0.375rem);
		right: 0;
		z-index: 1;
		min-width: 10rem;
		background: rgba(26, 38, 69, 0.9);
		-webkit-backdrop-filter: blur(1.25rem);
		backdrop-filter: blur(1.25rem);
		border: 0.0625rem solid rgba(255, 255, 255, 0.1);
		border-radius: 0.75rem;
		overflow: hidden;
		box-shadow: 0 0.5rem 2rem rgba(0, 0, 0, 0.5);
	}

	.ctx-item {
		width: 100%;
		padding: 0.75rem 1rem;
		background: transparent;
		border: none;
		color: var(--meta-light);
		font-size: 0.8125rem;
		font-weight: 500;
		text-align: left;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.625rem;
		-webkit-tap-highlight-color: transparent;
		transition: background 0.1s;
	}

	.ctx-item:hover {
		background: rgba(255, 255, 255, 0.06);
	}

	.ctx-item + .ctx-item {
		border-top: 0.0625rem solid rgba(255, 255, 255, 0.05);
	}
</style>
