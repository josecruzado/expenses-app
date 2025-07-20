<script lang="ts">
	import Counter from './Counter.svelte';
</script>

<svelte:head>
	<title>Dashboard - Expenses</title>
	<meta name="description" content="Personal expenses tracking dashboard" />
</svelte:head>

<section class="dashboard">
	<div class="welcome-card">
		<div class="welcome-content">
			<h1 class="welcome-title">Welcome back!</h1>
			<p class="welcome-subtitle">Track your expenses with ease</p>
		</div>
		<div class="welcome-icon">
			💰
		</div>
	</div>

	<div class="stats-grid">
		<div class="stat-card">
			<div class="stat-icon">💸</div>
			<div class="stat-content">
				<h3 class="stat-value">$1,234.56</h3>
				<p class="stat-label">This Month</p>
			</div>
		</div>
		
		<div class="stat-card">
			<div class="stat-icon">📊</div>
			<div class="stat-content">
				<h3 class="stat-value">24</h3>
				<p class="stat-label">Transactions</p>
			</div>
		</div>
		
		<div class="stat-card">
			<div class="stat-icon">💳</div>
			<div class="stat-content">
				<h3 class="stat-value">$456.78</h3>
				<p class="stat-label">Budget Left</p>
			</div>
		</div>
		
		<div class="stat-card">
			<div class="stat-icon">📈</div>
			<div class="stat-content">
				<h3 class="stat-value">+12%</h3>
				<p class="stat-label">vs Last Month</p>
			</div>
		</div>
	</div>

	<div class="action-buttons">
		<button class="primary-button">
			<span class="button-icon">➕</span>
			<span>Add Expense</span>
		</button>
		
		<button class="secondary-button">
			<span class="button-icon">📋</span>
			<span>View All</span>
		</button>
	</div>

	<div class="recent-section">
		<h2 class="section-title">Recent Transactions</h2>
		
		<div class="transaction-list">
			<div class="transaction-item">
				<div class="transaction-icon">🛒</div>
				<div class="transaction-details">
					<h4 class="transaction-title">Groceries</h4>
					<p class="transaction-date">Today, 2:30 PM</p>
				</div>
				<div class="transaction-amount">-$67.45</div>
			</div>
			
			<div class="transaction-item">
				<div class="transaction-icon">⛽</div>
				<div class="transaction-details">
					<h4 class="transaction-title">Gas Station</h4>
					<p class="transaction-date">Yesterday, 8:15 AM</p>
				</div>
				<div class="transaction-amount">-$45.20</div>
			</div>
			
			<div class="transaction-item">
				<div class="transaction-icon">☕</div>
				<div class="transaction-details">
					<h4 class="transaction-title">Coffee Shop</h4>
					<p class="transaction-date">Dec 18, 3:45 PM</p>
				</div>
				<div class="transaction-amount">-$5.75</div>
			</div>
		</div>
	</div>

	<Counter />
</section>

<style>
	.dashboard {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-lg);
		padding-bottom: var(--spacing-xl);
		max-width: 100%;
	}
	
	.welcome-card {
		background: linear-gradient(135deg, var(--color-blue) 0%, #0056b3 100%);
		border-radius: var(--radius-xl);
		padding: var(--spacing-lg);
		display: flex;
		align-items: center;
		justify-content: space-between;
		color: white;
		box-shadow: 0 8px 32px rgba(0, 122, 255, 0.3);
		position: relative;
		overflow: hidden;
	}
	
	.welcome-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: 
			radial-gradient(
				circle at top right,
				rgba(255, 255, 255, 0.2) 0%,
				transparent 50%
			);
		pointer-events: none;
	}
	
	.welcome-content {
		position: relative;
		z-index: 1;
	}
	
	.welcome-title {
		font-size: var(--font-size-title-1);
		font-weight: var(--font-weight-bold);
		margin: 0 0 var(--spacing-xs) 0;
		color: white;
	}
	
	.welcome-subtitle {
		font-size: var(--font-size-body);
		margin: 0;
		opacity: 0.9;
		color: white;
	}
	
	.welcome-icon {
		font-size: 48px;
		line-height: 1;
		position: relative;
		z-index: 1;
	}
	
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--spacing-md);
	}
	
	.stat-card {
		background: var(--color-bg-secondary);
		border-radius: var(--radius-lg);
		padding: var(--spacing-md);
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		border: 1px solid var(--color-separator);
		transition: transform 0.2s ease, box-shadow 0.2s ease;
	}
	
	.stat-card:active {
		transform: scale(0.98);
	}
	
	.stat-icon {
		font-size: 24px;
		line-height: 1;
		flex-shrink: 0;
	}
	
	.stat-content {
		flex: 1;
		min-width: 0;
	}
	
	.stat-value {
		font-size: var(--font-size-headline);
		font-weight: var(--font-weight-bold);
		margin: 0 0 2px 0;
		color: var(--color-text-primary);
	}
	
	.stat-label {
		font-size: var(--font-size-footnote);
		color: var(--color-text-secondary);
		margin: 0;
		font-weight: var(--font-weight-medium);
	}
	
	.action-buttons {
		display: flex;
		gap: var(--spacing-md);
	}
	
	.primary-button,
	.secondary-button {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--spacing-sm);
		padding: var(--spacing-md);
		border-radius: var(--radius-lg);
		border: none;
		font-size: var(--font-size-body);
		font-weight: var(--font-weight-semibold);
		cursor: pointer;
		transition: all 0.2s ease;
		-webkit-tap-highlight-color: transparent;
	}
	
	.primary-button {
		background: var(--color-blue);
		color: white;
		box-shadow: 0 4px 16px rgba(0, 122, 255, 0.3);
	}
	
	.primary-button:hover,
	.primary-button:active {
		opacity: 0.9;
		transform: scale(0.98);
	}
	
	.secondary-button {
		background: var(--color-fill-secondary);
		color: var(--color-text-primary);
	}
	
	.secondary-button:hover,
	.secondary-button:active {
		background: var(--color-fill-tertiary);
		transform: scale(0.98);
	}
	
	.button-icon {
		font-size: 18px;
		line-height: 1;
	}
	
	.recent-section {
		margin-top: var(--spacing-md);
	}
	
	.section-title {
		font-size: var(--font-size-title-3);
		font-weight: var(--font-weight-semibold);
		margin: 0 0 var(--spacing-md) 0;
		color: var(--color-text-primary);
	}
	
	.transaction-list {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}
	
	.transaction-item {
		background: var(--color-bg-secondary);
		border-radius: var(--radius-md);
		padding: var(--spacing-md);
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
		border: 1px solid var(--color-separator);
		transition: background-color 0.2s ease, transform 0.2s ease;
	}
	
	.transaction-item:active {
		background: var(--color-fill-tertiary);
		transform: scale(0.99);
	}
	
	.transaction-icon {
		width: 40px;
		height: 40px;
		background: var(--color-fill-secondary);
		border-radius: var(--radius-sm);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 18px;
		flex-shrink: 0;
	}
	
	.transaction-details {
		flex: 1;
		min-width: 0;
	}
	
	.transaction-title {
		font-size: var(--font-size-body);
		font-weight: var(--font-weight-medium);
		margin: 0 0 2px 0;
		color: var(--color-text-primary);
	}
	
	.transaction-date {
		font-size: var(--font-size-footnote);
		color: var(--color-text-secondary);
		margin: 0;
	}
	
	.transaction-amount {
		font-size: var(--font-size-body);
		font-weight: var(--font-weight-semibold);
		color: var(--color-red);
		text-align: right;
	}
	
	/* Responsive adjustments */
	@media (max-width: 480px) {
		.welcome-card {
			padding: var(--spacing-md);
		}
		
		.welcome-title {
			font-size: var(--font-size-title-2);
		}
		
		.welcome-subtitle {
			font-size: var(--font-size-subhead);
		}
		
		.welcome-icon {
			font-size: 36px;
		}
		
		.stats-grid {
			gap: var(--spacing-sm);
		}
		
		.stat-card {
			padding: var(--spacing-sm);
		}
		
		.stat-value {
			font-size: var(--font-size-body);
		}
		
		.action-buttons {
			flex-direction: column;
			gap: var(--spacing-sm);
		}
	}
	
	/* Large screen adjustments */
	@media (min-width: 768px) {
		.stats-grid {
			grid-template-columns: repeat(4, 1fr);
		}
		
		.action-buttons {
			max-width: 400px;
			margin: 0 auto;
		}
	}
</style>
