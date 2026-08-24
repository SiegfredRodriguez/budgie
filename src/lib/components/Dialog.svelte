<script lang="ts">
	import type { Snippet } from "svelte";

	let {
		show,
		onclose,
		children,
	}: {
		show: boolean;
		onclose: () => void;
		children: Snippet;
	} = $props();

	function handleOverlay(e: MouseEvent) {
		if (e.target === e.currentTarget) onclose();
	}

	function handleKey(e: KeyboardEvent) {
		if (e.key === "Escape") onclose();
	}
</script>

{#if show}
	<div class="overlay" onclick={handleOverlay} onkeydown={handleKey} role="presentation">
		{@render children()}
	</div>
{/if}

<style>
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
</style>
