<script lang="ts">
	import ImageCropper from "./ImageCropper.svelte";
	import { supabase } from "$lib/supabase";
	import { PUBLIC_SUPABASE_URL } from "$env/static/public";

	let {
		value = "",
		onchoose,
	}: {
		value: string;
		onchoose: (icon: string) => void;
	} = $props();

	const builtin = ["wallet", "store"] as const;
	let uploadedIcons = $state<string[]>([]);
	let cropFile = $state<File | null>(null);

	let fileInput: HTMLInputElement;

	$effect(() => {
		supabase.storage.from("account-icons").list().then(({ data, error }) => {
			if (error || !data) return;
			uploadedIcons = data
				.filter((f) => f.id) // skip folders
				.map((f) => `${PUBLIC_SUPABASE_URL}/storage/v1/object/public/account-icons/${f.name}`);
		});
	});

	function handleFilePick(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		cropFile = file;
		fileInput.value = "";
	}

	function handleCrop(url: string) {
		uploadedIcons = [...uploadedIcons, url];
		onchoose(url);
		cropFile = null;
	}

	function handleCancelCrop() {
		cropFile = null;
	}

	function triggerUpload() {
		fileInput?.click();
	}
</script>

<div class="icon-picker">
	{#each builtin as ic}
		<button class="icon-option" class:selected={value === ic} onclick={() => onchoose(ic)} aria-label={ic}>
			{#if ic === "wallet"}
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
			{:else if ic === "store"}
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/></svg>
			{/if}
		</button>
	{/each}
	{#each uploadedIcons as url}
		<button class="icon-option icon-img" class:selected={value === url} onclick={() => onchoose(url)} aria-label="uploaded icon">
			<img src={url} alt="" />
		</button>
	{/each}
	<button class="icon-option icon-add" onclick={triggerUpload} aria-label="add icon">
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
	</button>
</div>
<input type="file" accept="image/*" class="file-input" bind:this={fileInput} onchange={handleFilePick} />

{#if cropFile}
	<ImageCropper file={cropFile} oncrop={handleCrop} oncancel={handleCancelCrop} />
{/if}

<style>
	.icon-picker {
		display: flex;
		gap: 0.625rem;
		margin-bottom: 0.5rem;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none;
	}

	.icon-picker::-webkit-scrollbar {
		display: none;
	}

	.icon-option {
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
		transition: border-color 0.15s, color 0.15s, background 0.15s;
		-webkit-tap-highlight-color: transparent;
		overflow: hidden;
	}

	.icon-option.selected {
		border-color: var(--meta-accent);
		color: var(--meta-accent);
		background: rgba(64, 224, 208, 0.1);
	}

	.icon-option svg,
	.icon-img img {
		width: 100%;
		height: 100%;
		border-radius: inherit;
		object-fit: cover;
	}

	.file-input {
		display: none;
	}
</style>
