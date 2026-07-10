<script lang="ts">
	let { name = "wallet" }: { name: string } = $props();

	let src = $state("");

	$effect(() => {
		if (name.startsWith("http")) {
			iconCache.load(name).then((url) => src = url);
		}
	});
</script>

<script context="module" lang="ts">
	const blobCache = new Map<string, string>();

	const iconCache = {
		async load(url: string): Promise<string> {
			const cached = blobCache.get(url);
			if (cached) return cached;
			try {
				const res = await fetch(url);
				const blob = await res.blob();
				const blobUrl = URL.createObjectURL(blob);
				blobCache.set(url, blobUrl);
				return blobUrl;
			} catch {
				return url;
			}
		},
	};
</script>

{#if name.startsWith("http")}
	<img {src} alt="" />
{:else if name === "wallet"}
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
{:else if name === "store"}
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/></svg>
{:else if name === "bank"}
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M3 10h18"/><path d="M5 6l7-3 7 3"/><path d="M4 10v11"/><path d="M20 10v11"/><path d="M8 14v3"/><path d="M12 14v3"/><path d="M16 14v3"/></svg>
{:else if name === "piggy"}
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.4-1 1.4-1.8"/><path d="M21 5.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/><line x1="7" y1="11" x2="7" y2="11.01" stroke-width="3" stroke-linecap="round"/></svg>
{:else if name === "card"}
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/><line x1="6" y1="15" x2="10" y2="15"/></svg>
{/if}

<style>
	svg, img {
		width: 100%;
		height: 100%;
	}

	img {
		border-radius: 0.25rem;
		object-fit: cover;
	}
</style>
