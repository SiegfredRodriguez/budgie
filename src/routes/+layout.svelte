<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(() => {
		if ('serviceWorker' in navigator) {
			const swUrl = import.meta.env.DEV ? '/dev-sw.js?dev-sw' : '/sw.js';
			navigator.serviceWorker.register(swUrl, { scope: '/', type: import.meta.env.DEV ? 'module' : 'classic' });
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="apple-touch-icon" href="/pwa-192x192.png" />
</svelte:head>

{@render children()}
