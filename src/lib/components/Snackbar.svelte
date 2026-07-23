<script lang="ts">
	import { fly, fade } from "svelte/transition";
	import AlertCircle from "@lucide/svelte/icons/alert-circle";
	import CheckCircle from "@lucide/svelte/icons/check-circle";
	import X from "@lucide/svelte/icons/x";

	let {
		message = "",
		show = false,
		type = "error",
		ondismiss = () => {},
	}: {
		message: string;
		show: boolean;
		type?: "error" | "success";
		ondismiss?: () => void;
	} = $props();

	let timer: ReturnType<typeof setTimeout>;

	$effect(() => {
		if (show) {
			clearTimeout(timer);
			timer = setTimeout(() => {
				ondismiss();
			}, 3000);
		}
		return () => clearTimeout(timer);
	});
</script>

{#if show}
	<div
		class="snackbar {type}"
		role="alert"
		transition:fly={{ y: 80, duration: 200 }}
	>
		<div class="icon">
			{#if type === "error"}
				<AlertCircle size={18} />
			{:else}
				<CheckCircle size={18} />
			{/if}
		</div>
		<span class="message">{message}</span>
		<button class="close-btn" onclick={ondismiss}>
			<X size={16} />
		</button>
	</div>
{/if}

<style>
	.snackbar {
		position: fixed;
		bottom: calc(1.25rem + 3.25rem + 0.75rem);
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.75rem 1rem;
		border-radius: 0.75rem;
		background: rgba(26, 38, 69, 0.95);
		-webkit-backdrop-filter: blur(1.25rem);
		backdrop-filter: blur(1.25rem);
		border: 0.0625rem solid rgba(255, 255, 255, 0.1);
		box-shadow: 0 0.5rem 2rem rgba(0, 0, 0, 0.5);
		z-index: 300;
		max-width: calc(100% - 2rem);
		min-width: 12rem;
	}

	.snackbar.error {
		border-color: rgba(255, 107, 107, 0.3);
	}

	.snackbar.success {
		border-color: rgba(64, 224, 208, 0.3);
	}

	.icon {
		flex-shrink: 0;
		display: flex;
		align-items: center;
	}

	.snackbar.error .icon {
		color: #ff6b6b;
	}

	.snackbar.success .icon {
		color: var(--meta-accent);
	}

	.message {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--meta-light);
		flex: 1;
	}

	.close-btn {
		flex-shrink: 0;
		background: none;
		border: none;
		color: var(--meta-silver);
		cursor: pointer;
		padding: 0.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color 0.15s;
		-webkit-tap-highlight-color: transparent;
	}

	.close-btn:hover {
		color: var(--meta-light);
	}
</style>
