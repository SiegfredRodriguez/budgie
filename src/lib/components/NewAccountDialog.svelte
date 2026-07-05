<script lang="ts">
	import IconPicker from "./IconPicker.svelte";

	let {
		show,
		onclose,
		onsubmit,
	}: {
		show: boolean;
		onclose: () => void;
		onsubmit: (data: { icon: string; uploadedIcon: string; name: string; initialValue: string }) => void;
	} = $props();

	let icon = $state("");
	let uploadedIcon = $state("");
	let name = $state("");
	let initialValue = $state("");

	function handleOverlay(e: MouseEvent) {
		if (e.target === e.currentTarget) onclose();
	}

	function handleKey(e: KeyboardEvent) {
		if (e.key === "Escape") onclose();
	}

	function handleChoose(ic: string, isUpload: boolean) {
		if (isUpload) {
			uploadedIcon = ic;
			icon = "";
		} else {
			icon = ic;
			uploadedIcon = "";
		}
	}

	function handleSubmit() {
		onsubmit({ icon, uploadedIcon, name, initialValue });
		icon = "";
		uploadedIcon = "";
		name = "";
		initialValue = "";
	}
</script>

{#if show}
	<div class="overlay" onclick={handleOverlay} onkeydown={handleKey} role="presentation">
		<div class="modal" role="dialog" aria-modal="true" tabindex="-1">
			<button class="modal-close" onclick={onclose} aria-label="Close">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
			</button>
			<h2 class="modal-title">New Account</h2>

			<div class="field">
				<span class="field-label">Icon</span>
				<IconPicker value={icon} uploaded={uploadedIcon} onchoose={handleChoose} />
			</div>

			<div class="field">
				<label class="field-label" for="name">Account Name</label>
				<input id="name" class="field-input" type="text" placeholder="e.g. Savings Account" bind:value={name} />
			</div>

			<div class="field">
				<label class="field-label" for="initial">Initial Value</label>
				<input id="initial" class="field-input" type="number" placeholder="0" bind:value={initialValue} />
			</div>

			<button class="submit-btn" onclick={handleSubmit}>Create Account</button>
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

	.field {
		margin-bottom: 1rem;
	}

	.field-label {
		display: block;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--meta-silver);
		margin-bottom: 0.5rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.field-input {
		width: 100%;
		height: 2.75rem;
		padding: 0 0.875rem;
		border-radius: 0.625rem;
		border: 0.0625rem solid rgba(255, 255, 255, 0.1);
		background: var(--meta-darker);
		color: var(--meta-light);
		font-size: 1rem;
		outline: none;
		transition: border-color 0.15s;
	}

	.field-input:focus { border-color: var(--meta-accent); }
	.field-input::placeholder { color: rgba(255, 255, 255, 0.25); }

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
</style>
