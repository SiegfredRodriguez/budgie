<script lang="ts">
	import { session } from "$lib/stores/auth";
	import { supabase } from "$lib/supabase";
	import { onMount } from "svelte";
	import Fingerprint from "@lucide/svelte/icons/fingerprint";
	import Trash2 from "@lucide/svelte/icons/trash-2";

	let scrollTop = $state(0);
	let headerHeight = $state(300);
	let scroller: HTMLElement;

	let user = $derived($session?.user);
	let avatarUrl = $derived(user?.user_metadata?.avatar_url ?? "");
	let fullName = $derived(user?.user_metadata?.full_name ?? "User");

	let passkeys = $state<any[]>([]);
	let passkeysLoading = $state(true);
	let toggling = $state(false);

	let hasPasskey = $derived(passkeys.length > 0);

	async function loadPasskeys() {
		try {
			const { data } = await supabase.auth.passkey.list();
			passkeys = data ?? [];
		} catch {
			passkeys = [];
		} finally {
			passkeysLoading = false;
		}
	}

	async function togglePasskey() {
		if (toggling) return;
		toggling = true;

		try {
			if (hasPasskey) {
				for (const pk of passkeys) {
					await supabase.auth.passkey.delete({ passkeyId: pk.id });
				}
				passkeys = [];
			} else {
				const { error } = await supabase.auth.registerPasskey();
				if (error) throw error;
				await loadPasskeys();
			}
		} catch (e) {
			console.error("Passkey toggle failed", e);
		} finally {
			toggling = false;
		}
	}

	async function deletePasskey(id: string) {
		try {
			await supabase.auth.passkey.delete({ passkeyId: id });
			passkeys = passkeys.filter((pk) => pk.id !== id);
		} catch (e) {
			console.error("Failed to delete passkey", e);
		}
	}

	function handleScroll() {
		scrollTop = scroller.scrollTop;
	}

	onMount(() => {
		loadPasskeys();
	});
</script>

<div class="scroller" onscroll={handleScroll} bind:this={scroller}>
	<div class="hero" style="height: {headerHeight}px; transform: translateY({Math.max(scrollTop * 0.3, 0)}px)">
		<div class="hero-overlay"></div>
		<img class="hero-img" src="/hero-settings.png" alt="" width="860" height="500" />
		<div class="profile">
			{#if avatarUrl}
				<img class="avatar" src={avatarUrl} alt="" />
			{:else}
				<div class="avatar avatar-placeholder">{fullName.charAt(0).toUpperCase()}</div>
			{/if}
			<div class="name">{fullName}</div>
		</div>
	</div>

	<div class="content" style="margin-top: -{headerHeight}px; padding-top: {headerHeight + 12}px">
		<div class="section">
			<h2 class="section-title">Security</h2>

			<div class="setting-row">
				<div class="setting-info">
					<Fingerprint size={20} />
					<div>
						<div class="setting-label">FaceID Sign-In</div>
						<div class="setting-desc">Use biometrics to sign in</div>
					</div>
				</div>
				<button
					class="toggle"
					class:active={hasPasskey}
					onclick={togglePasskey}
					disabled={toggling || passkeysLoading}
				>
					<span class="toggle-track">
						<span class="toggle-thumb"></span>
					</span>
				</button>
			</div>

			{#if hasPasskey}
				<div class="passkey-list">
					{#each passkeys as pk}
						<div class="passkey-item">
							<div class="passkey-name">{pk.friendly_name ?? "Passkey"}</div>
							<button class="icon-btn" onclick={() => deletePasskey(pk.id)}>
								<Trash2 size={16} />
							</button>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.scroller {
		height: 100%;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
	}

	.hero {
		position: relative;
		overflow: hidden;
		will-change: transform;
	}

	.hero-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.hero-overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(180deg, transparent 50%, var(--meta-darker));
		z-index: 1;
	}

	.profile {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		z-index: 2;
		pointer-events: none;
		padding-top: 2rem;
	}

	.avatar {
		width: 5rem;
		height: 5rem;
		border-radius: 50%;
		object-fit: cover;
		border: 0.1875rem solid rgba(255, 255, 255, 0.2);
		box-shadow: 0 0.25rem 1rem rgba(0, 0, 0, 0.5);
	}

	.avatar-placeholder {
		background: var(--meta-accent);
		color: var(--meta-darker);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 2rem;
		font-weight: 700;
	}

	.name {
		margin-top: 0.75rem;
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--meta-light);
		text-shadow: 0 0.125rem 0.75rem rgba(0, 0, 0, 0.5);
	}

	.content {
		position: relative;
		z-index: 2;
		padding-left: 1rem;
		padding-right: 1rem;
		padding-bottom: 6rem;
	}

	.section {
		margin-bottom: 1.5rem;
	}

	.section-title {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--meta-silver);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.75rem;
	}

	.setting-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.875rem 1rem;
		background: rgba(255, 255, 255, 0.04);
		border: 0.0625rem solid rgba(255, 255, 255, 0.06);
		border-radius: 0.75rem;
	}

	.setting-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		color: var(--meta-light);
	}

	.setting-label {
		font-size: 0.9375rem;
		font-weight: 600;
	}

	.setting-desc {
		font-size: 0.75rem;
		color: var(--meta-silver);
		margin-top: 0.125rem;
	}

	.toggle {
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	.toggle:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.toggle-track {
		display: flex;
		align-items: center;
		width: 2.75rem;
		height: 1.5rem;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 0.75rem;
		padding: 0.125rem;
		transition: background 0.2s;
	}

	.toggle.active .toggle-track {
		background: var(--meta-accent);
	}

	.toggle-thumb {
		width: 1.25rem;
		height: 1.25rem;
		background: var(--meta-light);
		border-radius: 50%;
		transition: transform 0.2s;
	}

	.toggle.active .toggle-thumb {
		transform: translateX(1.25rem);
	}

	.passkey-list {
		margin-top: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.passkey-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		background: rgba(255, 255, 255, 0.03);
		border: 0.0625rem solid rgba(255, 255, 255, 0.05);
		border-radius: 0.625rem;
	}

	.passkey-name {
		font-size: 0.8125rem;
		color: var(--meta-silver);
	}

	.icon-btn {
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

	.icon-btn:hover {
		color: #ff6b6b;
	}
</style>
