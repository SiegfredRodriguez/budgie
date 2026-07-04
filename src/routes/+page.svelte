<script lang="ts">
	let count = $state(0);

	function handleClick() {
		count++;
	}
</script>

<div class="container">
	<button onclick={handleClick}>
		{count === 0 ? 'Click me' : `Clicked ${count} times`}
	</button>
</div>

<style>
	.container {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 100%;
		padding: 1rem;
	}

	button {
		position: relative;
		padding: 1rem 2.5rem;
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--meta-light);
		background: linear-gradient(135deg, var(--meta-primary), var(--meta-blue));
		border: 0.125rem solid var(--meta-accent);
		border-radius: 0.75rem;
		cursor: pointer;
		transition: transform 0.2s, box-shadow 0.2s, background 0.2s;
		box-shadow: 0 0 1.25rem var(--meta-glow);
		letter-spacing: 0.02em;
	}

	button:active {
		transform: translateY(0);
		box-shadow: 0 0 0.625rem var(--meta-glow);
	}

	button::after {
		content: '';
		position: absolute;
		inset: -0.125rem;
		border-radius: 0.75rem;
		background: linear-gradient(135deg, var(--meta-accent), transparent, var(--meta-accent));
		opacity: 0.15;
		z-index: -1;
		filter: blur(0.25rem);
	}
</style>
