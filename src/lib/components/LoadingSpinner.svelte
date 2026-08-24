<script lang="ts">
	let { style = "" }: { style?: string } = $props();
</script>

<div class="spinner-wrapper" {style}>
	<div class="spinner"></div>
</div>

<style>
	.spinner-wrapper {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.spinner {
		width: 2rem;
		height: 2rem;
		border: 0.1875rem solid rgba(255, 255, 255, 0.1);
		border-top-color: var(--meta-accent);
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>
