<script lang="ts">
	import Icon from "./Icon.svelte";

	let { value = "", uploaded = "", onchoose }: { value: string; uploaded: string; onchoose: (icon: string, isUpload: boolean) => void } = $props();

	const icons = ["bank", "piggy", "card"] as const;

	let fileInput: HTMLInputElement;

	function handleUpload(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			onchoose(reader.result as string, true);
		};
		reader.readAsDataURL(file);
	}
</script>

<div class="icon-picker">
	{#each icons as ic}
		<button class="icon-option" class:selected={value === ic} onclick={() => onchoose(ic, false)} aria-label={ic}>
			<Icon name={ic} />
		</button>
	{/each}

	<button class="icon-option upload-option" class:selected={!!uploaded} onclick={() => fileInput?.click()} aria-label="Upload custom icon">
		{#if uploaded}
			<img class="upload-preview" src={uploaded} alt="" />
		{:else}
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
		{/if}
	</button>
</div>
<input type="file" accept="image/*" class="file-input" bind:this={fileInput} onchange={handleUpload} />

<style>
	.icon-picker {
		display: flex;
		gap: 0.625rem;
	}

	.icon-option {
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
		transition: border-color 0.15s, color 0.15s, background 0.15s;
		-webkit-tap-highlight-color: transparent;
	}

	.icon-option.selected {
		border-color: var(--meta-accent);
		color: var(--meta-accent);
		background: rgba(64, 224, 208, 0.1);
	}

	.icon-option svg {
		width: 1.5rem;
		height: 1.5rem;
	}

	.upload-option {
		margin-left: auto;
	}

	.upload-preview {
		width: 2rem;
		height: 2rem;
		border-radius: 0.375rem;
		object-fit: cover;
	}

	.file-input {
		display: none;
	}
</style>
