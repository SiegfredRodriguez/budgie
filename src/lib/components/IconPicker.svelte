<script lang="ts">
	let {
		value = "",
		uploaded = "",
		onchoose,
	}: {
		value: string;
		uploaded: string;
		onchoose: (icon: string, isUpload: boolean, file?: File) => void;
	} = $props();

	const icons = ["wallet"] as const;

	let fileInput: HTMLInputElement;

	function handleUpload(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		onchoose("", true, file);
	}

	function triggerUpload() {
		fileInput?.click();
	}
</script>

<div class="icon-picker">
	{#each icons as ic}
		<button class="icon-option" class:selected={value === ic} onclick={() => onchoose(ic, false)} aria-label={ic}>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
		</button>
	{/each}
	<button class="icon-option" class:selected={!!uploaded} onclick={triggerUpload} aria-label="upload">
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
	</button>
</div>
<input type="file" accept="image/*" class="file-input" bind:this={fileInput} onchange={handleUpload} />

<style>
	.icon-picker {
		display: flex;
		gap: 0.625rem;
		margin-bottom: 0.5rem;
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

	.file-input {
		display: none;
	}
</style>
