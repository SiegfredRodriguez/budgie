<script lang="ts">
</script>

<div class="list">
	<div class="account">
		<div class="account-info">
			<span class="account-name">Checking Account</span>
			<span class="account-balance">$4,250.60</span>
		</div>
	</div>
	<div class="account">
		<div class="account-info">
			<span class="account-name">Savings Account</span>
			<span class="account-balance">$12,800.00</span>
		</div>
	</div>
	<div class="account">
		<div class="account-info">
			<span class="account-name">Credit Card</span>
			<span class="account-balance">-$430.25</span>
		</div>
	</div>
</div>

<style>
	.list {
		padding: 8px 16px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.account {
		display: flex;
		align-items: center;
		padding: 14px 12px;
		background: var(--meta-dark);
		border-radius: 10px;
		border: 1px solid rgba(255, 255, 255, 0.06);
	}

	.account-info {
		display: flex;
		flex-direction: column;
		gap: 4px;
		flex: 1;
	}

	.account-name {
		font-size: 0.938rem;
		font-weight: 500;
		color: var(--meta-light);
	}

	.account-balance {
		font-size: 1rem;
		font-weight: 700;
		color: var(--meta-accent);
	}
</style>
