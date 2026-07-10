<script lang="ts">
	import Tag from "@lucide/svelte/icons/tag";

	let {
		show,
		value,
		onclose,
		ondone,
	}: {
		show: boolean;
		value: string;
		onclose: () => void;
		ondone: () => void;
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
		<div class="modal" role="dialog" aria-modal="true" tabindex="-1">
			<h2 class="modal-title">New Tag</h2>
			<div class="preview">
				<Tag size={24} strokeWidth={2} />
				<span class="preview-value">{value}</span>
			</div>
			<div class="actions">
				<button class="btn btn-secondary" onclick={onclose}>Cancel</button>
				<button class="btn btn-primary" onclick={ondone}>Done</button>
			</div>
		</div>
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
		backdrop-filter: blur(0.25rem);
		-webkit-backdrop-filter: blur(0.25rem);
		padding: 1.5rem;
	}

	.modal {
		background: var(--meta-dark);
		border: 0.0625rem solid rgba(255, 255, 255, 0.1);
		border-radius: 1.25rem;
		padding: 2rem 1.5rem 1.5rem;
		width: 100%;
		max-width: 22rem;
		box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.5);
	}

	.modal-title {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--meta-light);
		margin-bottom: 1.25rem;
	}

	.preview {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1.25rem 1rem;
		background: rgba(255, 255, 255, 0.04);
		border: 0.0625rem solid rgba(255, 255, 255, 0.06);
		border-radius: 0.75rem;
		margin-bottom: 1.25rem;
		color: var(--meta-light);
	}

	.preview-value {
		font-size: 1.125rem;
		font-weight: 600;
	}

	.actions {
		display: flex;
		gap: 0.75rem;
	}

	.btn {
		flex: 1;
		height: 3rem;
		border-radius: 0.75rem;
		border: none;
		font-size: 1rem;
		font-weight: 700;
		cursor: pointer;
		transition: opacity 0.15s;
		-webkit-tap-highlight-color: transparent;
	}

	.btn:active { opacity: 0.7; }

	.btn-primary {
		background: var(--meta-accent);
		color: var(--meta-darker);
	}

	.btn-secondary {
		background: rgba(255, 255, 255, 0.08);
		color: var(--meta-silver);
	}
</style>
