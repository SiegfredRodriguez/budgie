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
		padding: 16px;
	}

	button {
		position: relative;
		padding: 16px 40px;
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--meta-light);
		background: linear-gradient(135deg, var(--meta-primary), var(--meta-blue));
		border: 2px solid var(--meta-accent);
		border-radius: 12px;
		cursor: pointer;
		transition: transform 0.2s, box-shadow 0.2s, background 0.2s;
		box-shadow: 0 0 20px var(--meta-glow);
		letter-spacing: 0.02em;
	}

	button:active {
		transform: translateY(0);
		box-shadow: 0 0 10px var(--meta-glow);
	}

	button::after {
		content: '';
		position: absolute;
		inset: -2px;
		border-radius: 12px;
		background: linear-gradient(135deg, var(--meta-accent), transparent, var(--meta-accent));
		opacity: 0.15;
		z-index: -1;
		filter: blur(4px);
	}
</style>
