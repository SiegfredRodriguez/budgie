<script lang="ts">
	import TagPillInput from "./TagPillInput.svelte";

	let {
		selected = [],
		onchange,
		staged = [],
		onstage,
	}: {
		selected: string[];
		onchange: (ids: string[]) => void;
		staged: string[];
		onstage: (values: string[]) => void;
	} = $props();
</script>

<div class="field">
	<span class="field-label">Tags</span>
	<TagPillInput {selected} {onchange} {staged} {onstage} />
</div>

<style>
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
</style>
