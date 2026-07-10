<script lang="ts">
	import Icon from "./Icon.svelte";
	import ImageCropper from "./ImageCropper.svelte";
	import TagsField from "./TagsField.svelte";
	import { session } from "$lib/stores/auth";
	import { createTag } from "$lib/stores/tags";

	let {
		show,
		query = "",
		onclose,
		onsubmit,
	}: {
		show: boolean;
		query: string;
		onclose: () => void;
		onsubmit: (data: { label: string; icon: string; tagIds: string[] }) => void;
	} = $props();

	let icon = $state("store");
	let label = $state("");
	let tagIds = $state<string[]>([]);
	let stagedTags = $state<string[]>([]);
	let busy = $state(false);
	let labelInput: HTMLInputElement;
	let fileInput: HTMLInputElement;
	let cropFile = $state<File | null>(null);

	$effect(() => {
		if (show) {
			icon = "store";
			label = query;
			tagIds = [];
			stagedTags = [];
			busy = false;
			cropFile = null;
			requestAnimationFrame(() => labelInput?.focus());
		}
	});

	function handleOverlay(e: MouseEvent) {
		if (e.target === e.currentTarget) onclose();
	}

	function handleKey(e: KeyboardEvent) {
		if (e.key === "Escape") onclose();
	}

	function triggerFilePick() {
		fileInput?.click();
	}

	function handleFilePick(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		cropFile = file;
		fileInput.value = "";
	}

	function handleCrop(url: string) {
		icon = url;
		cropFile = null;
	}

	function handleCancelCrop() {
		cropFile = null;
	}

	async function handleSubmit() {
		if (busy || !label.trim()) return;
		busy = true;
		try {
			const allTagIds = [...tagIds];
			for (const value of stagedTags) {
				const created = await createTag(value, $session!.user.id);
				allTagIds.push(created.id);
			}
			await onsubmit({ label: label.trim(), icon, tagIds: allTagIds });
		} finally {
			busy = false;
		}
	}
</script>

{#if show}
	<div class="overlay" onclick={handleOverlay} onkeydown={handleKey} role="presentation">
		<div class="modal" role="dialog" aria-modal="true" tabindex="-1">
			<button class="modal-close" onclick={onclose} aria-label="Close">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
			</button>
			<h2 class="modal-title">New Payee</h2>

			<div class="name-row">
				<button class="icon-btn" onclick={triggerFilePick} aria-label="Change icon">
					<Icon name={icon} />
				</button>
				<input class="name-input" type="text" placeholder="e.g. Starbucks" value={label} oninput={(e) => label = (e.target as HTMLInputElement).value} bind:this={labelInput} />
			</div>

			<TagsField selected={tagIds} onchange={(ids) => tagIds = ids} staged={stagedTags} onstage={(v) => stagedTags = v} />

			<button class="submit-btn" onclick={handleSubmit} disabled={busy || !label.trim()}>{busy ? "Creating..." : "Create Payee"}</button>
		</div>
	</div>
{/if}

<input type="file" accept="image/*" class="file-input" bind:this={fileInput} onchange={handleFilePick} />

{#if cropFile}
	<ImageCropper file={cropFile} oncrop={handleCrop} oncancel={handleCancelCrop} />
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

	.modal {
		background: var(--meta-dark);
		border: 0.0625rem solid rgba(255, 255, 255, 0.1);
		border-radius: 1.25rem;
		padding: 2rem 1.5rem 1.5rem;
		width: 100%;
		max-width: 25rem;
		position: relative;
		box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.5);
	}

	.modal-close {
		position: absolute;
		top: 0.75rem;
		right: 0.75rem;
		width: 2rem;
		height: 2rem;
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

	.modal-close:hover { background: rgba(255, 255, 255, 0.15); }

	.modal-close svg {
		width: 1.125rem;
		height: 1.125rem;
	}

	.modal-title {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--meta-light);
		margin-bottom: 1.25rem;
	}

	.name-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.icon-btn {
		flex-shrink: 0;
		width: 3rem;
		height: 3rem;
		border-radius: 0.75rem;
		border: 0.125rem solid rgba(255, 255, 255, 0.08);
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--meta-darker);
		color: var(--meta-silver);
		cursor: pointer;
		transition: border-color 0.15s, color 0.15s;
		-webkit-tap-highlight-color: transparent;
		overflow: hidden;
		padding: 0;
	}

	.icon-btn :global(svg),
	.icon-btn :global(img) {
		width: 100%;
		height: 100%;
		border-radius: inherit;
		object-fit: cover;
	}

	.icon-btn:hover {
		border-color: var(--meta-accent);
		color: var(--meta-accent);
	}

	.name-input {
		flex: 1;
		height: 3rem;
		padding: 0 0.875rem;
		border-radius: 0.625rem;
		border: 0.0625rem solid rgba(255, 255, 255, 0.1);
		background: var(--meta-darker);
		color: var(--meta-light);
		font-size: 1rem;
		outline: none;
		transition: border-color 0.15s;
		box-sizing: border-box;
	}

	.name-input:focus { border-color: var(--meta-accent); }
	.name-input::placeholder { color: rgba(255, 255, 255, 0.25); }

	.submit-btn {
		width: 100%;
		height: 3rem;
		border-radius: 0.75rem;
		border: none;
		background: var(--meta-accent);
		color: var(--meta-darker);
		font-size: 1rem;
		font-weight: 700;
		cursor: pointer;
		margin-top: 0.5rem;
		transition: opacity 0.15s;
		-webkit-tap-highlight-color: transparent;
	}

	.submit-btn:active { opacity: 0.7; }

	.submit-btn:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.file-input {
		display: none;
	}
</style>
