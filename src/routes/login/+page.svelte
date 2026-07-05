<script lang="ts">
	import { signInWithGoogle } from '$lib/stores/auth';
	import { dev } from '$app/environment';

	let loading = $state(false);

	async function handleGoogle() {
		loading = true;
		try {
			await signInWithGoogle();
		} catch {
			loading = false;
		}
	}
</script>

<div class="login">
	<div class="login-card">
		<svg class="wallet-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
			<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
			<path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
			<path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
		</svg>

		<h1 class="title">Budgie</h1>
		<p class="subtitle">Sign in to manage your accounts</p>

		<button class="google-btn" onclick={handleGoogle} disabled={loading}>
			<svg viewBox="0 0 48 48" class="google-icon">
				<path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
				<path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
				<path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
				<path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
			</svg>
			{loading ? 'Signing in...' : 'Continue with Google'}
		</button>

		{#if dev}
			<p class="dev-hint">Dev mode: auto-login with dev@example.com if user exists</p>
		{/if}
	</div>
</div>

<style>
	.login {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		padding: 1.5rem;
	}

	.login-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
		text-align: center;
		max-width: 22rem;
	}

	.wallet-icon {
		width: 4rem;
		height: 4rem;
		color: var(--meta-accent);
	}

	.title {
		font-size: 1.75rem;
		font-weight: 800;
		color: var(--meta-light);
		margin: 0;
		font-family: 'Poppins', sans-serif;
	}

	.subtitle {
		font-size: 0.938rem;
		color: var(--meta-silver);
		margin: 0;
	}

	.google-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.625rem;
		width: 100%;
		height: 3rem;
		border-radius: 0.75rem;
		border: 0.0625rem solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.05);
		color: var(--meta-light);
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		transition: background 0.15s;
	}

	.google-btn:active {
		background: rgba(255, 255, 255, 0.1);
	}

	.google-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.google-icon {
		width: 1.375rem;
		height: 1.375rem;
		flex-shrink: 0;
	}

	.dev-hint {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.25);
		margin: 0;
	}
</style>
