<script lang="ts">
	import { tags } from "$lib/stores/tags";
	import X from "@lucide/svelte/icons/x";

	let {
		selected = [],
		onchange,
	}: {
		selected: string[];
		onchange: (ids: string[]) => void;
	} = $props();

	let query = $state("");
	let showDropdown = $state(false);
	let inputEl: HTMLInputElement;

	let selectedTags = $derived(
		$tags.filter((t) => selected.includes(t.id)),
	);

	let suggestions = $derived(
		query
			? $tags.filter(
					(t) =>
						t.value.toLowerCase().includes(query.toLowerCase()) &&
						!selected.includes(t.id),
				)
			: $tags.filter((t) => !selected.includes(t.id)),
	);

	function addTag(id: string) {
		if (!selected.includes(id)) {
			onchange([...selected, id]);
		}
		query = "";
		showDropdown = false;
		inputEl?.focus();
	}

	function removeTag(id: string) {
		onchange(selected.filter((i) => i !== id));
	}

	function handleKey(e: KeyboardEvent) {
		if (e.key === "Escape") {
			showDropdown = false;
		} else if (e.key === "Backspace" && query === "" && selected.length > 0) {
			onchange(selected.slice(0, -1));
		}
	}
</script>

<div class="pill-input">
	<div class="pills">
		{#each selectedTags as tag (tag.id)}
			<span class="pill">
				{tag.value}
				<button class="pill-x" onclick={() => removeTag(tag.id)} aria-label="Remove tag">
					<X size={12} strokeWidth={3} />
				</button>
			</span>
		{/each}
		<input
			class="pill-text"
			type="text"
			placeholder={selected.length === 0 ? "Add tags…" : ""}
			value={query}
			oninput={(e) => { query = (e.target as HTMLInputElement).value; showDropdown = true; }}
			onfocus={() => showDropdown = true}
			onblur={() => setTimeout(() => showDropdown = false, 150)}
			onkeydown={handleKey}
			bind:this={inputEl}
		/>
	</div>

	{#if showDropdown && suggestions.length > 0}
		<div class="dropdown">
			{#each suggestions as tag (tag.id)}
				<button class="dropdown-item" onmousedown={() => addTag(tag.id)}>
					{tag.value}
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.pill-input {
		position: relative;
	}

	.pills {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.375rem;
		min-height: 2.5rem;
		padding: 0.375rem 0.625rem;
		border-radius: 0.625rem;
		border: 0.0625rem solid rgba(255, 255, 255, 0.1);
		background: var(--meta-darker);
		transition: border-color 0.15s;
	}

	.pills:focus-within {
		border-color: var(--meta-accent);
	}

	.pill {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.1875rem 0.5rem 0.1875rem 0.625rem;
		border-radius: 1rem;
		background: rgba(64, 224, 208, 0.12);
		color: var(--meta-accent);
		font-size: 0.8125rem;
		font-weight: 600;
		white-space: nowrap;
	}

	.pill-x {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1rem;
		height: 1rem;
		border-radius: 50%;
		border: none;
		background: transparent;
		color: var(--meta-accent);
		cursor: pointer;
		padding: 0;
		transition: background 0.1s;
		-webkit-tap-highlight-color: transparent;
	}

	.pill-x:hover {
		background: rgba(64, 224, 208, 0.2);
	}

	.pill-text {
		flex: 1;
		min-width: 5rem;
		background: transparent;
		border: none;
		outline: none;
		color: var(--meta-light);
		font-size: 0.875rem;
		padding: 0.125rem 0;
	}

	.pill-text::placeholder {
		color: rgba(255, 255, 255, 0.25);
	}

	.dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		margin-top: 0.25rem;
		background: var(--meta-darker);
		border: 0.0625rem solid rgba(255, 255, 255, 0.1);
		border-radius: 0.625rem;
		overflow-y: auto;
		z-index: 350;
		max-height: 9rem;
	}

	.dropdown-item {
		width: 100%;
		padding: 0.5rem 0.75rem;
		background: transparent;
		border: none;
		color: var(--meta-light);
		font-size: 0.875rem;
		font-weight: 500;
		text-align: left;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	.dropdown-item:hover {
		background: rgba(255, 255, 255, 0.05);
	}
</style>
