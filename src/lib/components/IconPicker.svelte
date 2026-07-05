<script lang="ts">
	let {
		value = "",
		uploaded = "",
		onchoose,
	}: {
		value: string;
		uploaded: string;
		onchoose: (icon: string, isUpload: boolean) => void;
	} = $props();

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

	function triggerUpload() {
		fileInput?.click();
	}
</script>

<div class="icon-picker">
	{#each icons as ic}
		<button class="icon-option" class:selected={value === ic} onclick={() => onchoose(ic, false)} aria-label={ic}>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				{#if ic === "bank"}
					<path d="M3 21h18"/><path d="M3 10h18"/><path d="M5 6l7-3 7 3"/><path d="M4 10v11"/><path d="M20 10v11"/><path d="M8 14v3"/><path d="M12 14v3"/><path d="M16 14v3"/>
				{:else if ic === "piggy"}
					<path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.4-1 1.4-1.8"/><path d="M21 5.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/><line x1="7" y1="11" x2="7" y2="11.01" stroke-width="3" stroke-linecap="round"/>
				{:else if ic === "card"}
					<rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/><line x1="6" y1="15" x2="10" y2="15"/>
				{/if}
			</svg>
		</button>
	{/each}
</div>
<button class="upload-link" onclick={triggerUpload}>Upload</button>
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

	.upload-link {
		background: none;
		border: none;
		color: var(--meta-accent);
		font-size: 0.8125rem;
		font-weight: 600;
		cursor: pointer;
		padding: 0.25rem 0;
		-webkit-tap-highlight-color: transparent;
	}

	.file-input {
		display: none;
	}
</style>
