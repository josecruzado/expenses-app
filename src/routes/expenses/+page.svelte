<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { gastos, loading, error} from '$lib/firebase.js';
    import { formatCurrency, formatDate, getCategoryIcon, getCategoryName, subscribeToGastos, unsubscribeFromGastos } from '$lib/services/gastosService';
	
	// Local type definition
	interface Gasto {
		id: string;
		categoria: string;
		fecha: string;
		monto: number;
		nota: string;
	}

	let searchTerm = '';
	let selectedCategory = '';
	let sortOrder = 'date-desc'; // 'date-desc', 'date-asc', 'amount-desc', 'amount-asc'
	
	// Get unique categories for filter
	$: categories = [...new Set($gastos.map((gasto: Gasto) => getCategoryName(gasto.categoria)))].sort();
	
	// Helper function to parse Spanish date format for sorting
	function parseSpanishDate(fecha: string): Date {
		const monthMap: { [key: string]: number } = {
			'ene': 0, 'feb': 1, 'mar': 2, 'abr': 3,
			'may': 4, 'jun': 5, 'jul': 6, 'ago': 7,
			'sep': 8, 'oct': 9, 'nov': 10, 'dic': 11
		};
		
		const datePattern = /(\d{1,2})\s+([a-z]{3})\s+(\d{4}),?\s+(\d{1,2}):(\d{2})\s+(a\.m\.|p\.m\.)/i;
		const match = fecha.match(datePattern);
		
		if (match) {
			const [, day, monthSpanish, year, hour, minute, period] = match;
			const monthIndex = monthMap[monthSpanish.toLowerCase()];
			
			if (monthIndex !== undefined) {
				const isPM = period.toLowerCase().includes('p');
				let hour24 = parseInt(hour);
				
				if (isPM && hour24 !== 12) {
					hour24 += 12;
				} else if (!isPM && hour24 === 12) {
					hour24 = 0;
				}
				
				return new Date(parseInt(year), monthIndex, parseInt(day), hour24, parseInt(minute));
			}
		}
		
		return new Date(0); // Return epoch if parsing fails
	}
	
	// Filter and sort gastos
	$: filteredGastos = $gastos
		.filter((gasto: Gasto) => {
			const matchesSearch = !searchTerm || 
				getCategoryName(gasto.categoria).toLowerCase().includes(searchTerm.toLowerCase()) ||
				gasto.nota.toLowerCase().includes(searchTerm.toLowerCase());
			const matchesCategory = !selectedCategory || getCategoryName(gasto.categoria) === selectedCategory;
			return matchesSearch && matchesCategory;
		})
		.sort((a: Gasto, b: Gasto) => {
			switch (sortOrder) {
				case 'date-asc':
					return parseSpanishDate(a.fecha).getTime() - parseSpanishDate(b.fecha).getTime();
				case 'amount-desc':
					return Math.abs(b.monto) - Math.abs(a.monto);
				case 'amount-asc':
					return Math.abs(a.monto) - Math.abs(b.monto);
				case 'date-desc':
				default:
					return parseSpanishDate(b.fecha).getTime() - parseSpanishDate(a.fecha).getTime();
			}
		});
	
	// Calculate total of filtered results
	$: totalAmount = filteredGastos.reduce((sum: number, gasto: Gasto) => sum + Math.abs(gasto.monto), 0);

	onMount(() => {
		subscribeToGastos();
	});

	onDestroy(() => {
		unsubscribeFromGastos();
	});
</script>

<svelte:head>
	<title>All Expenses - Expenses</title>
	<meta name="description" content="View all your expenses" />
</svelte:head>

<section class="expenses">
	<header class="page-header">
		<h1 class="page-title">All Expenses</h1>
		{#if !$loading}
			<p class="page-subtitle">
				{filteredGastos.length} transaction{filteredGastos.length !== 1 ? 's' : ''} 
				• Total: ${totalAmount.toFixed(2)}
			</p>
		{/if}
	</header>

	<div class="filters-section">
		<div class="search-box">
			<input 
				type="text" 
				placeholder="Search expenses..." 
				bind:value={searchTerm}
				class="search-input"
			/>
		</div>
		
		<div class="filter-controls">
			<select bind:value={selectedCategory} class="filter-select">
				<option value="">All Categories</option>
				{#each categories as category}
					<option value={category}>{category}</option>
				{/each}
			</select>
			
			<select bind:value={sortOrder} class="filter-select">
				<option value="date-desc">Newest First</option>
				<option value="date-asc">Oldest First</option>
				<option value="amount-desc">Highest Amount</option>
				<option value="amount-asc">Lowest Amount</option>
			</select>
		</div>
	</div>

	{#if $loading}
		<div class="loading-message">Loading all expenses...</div>
	{:else if $error}
		<div class="error-message">{$error}</div>
	{:else if filteredGastos.length === 0}
		<div class="empty-message">
			{searchTerm || selectedCategory ? 'No expenses match your filters' : 'No expenses found'}
		</div>
	{:else}
		<div class="expenses-list">
			{#each filteredGastos as gasto (gasto.id)}
				<div class="expense-item">
					<div class="expense-icon">{getCategoryIcon(gasto.categoria)}</div>
					<div class="expense-details">
						<h3 class="expense-title">{getCategoryName(gasto.categoria)}</h3>
						<p class="expense-date">{formatDate(gasto.fecha)}</p>
						{#if gasto.nota}
							<p class="expense-note">{gasto.nota}</p>
						{/if}
					</div>
					<div class="expense-amount">{formatCurrency(gasto.monto)}</div>
				</div>
			{/each}
		</div>
	{/if}
</section>

<style>
	.expenses {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-lg);
		padding-bottom: var(--spacing-xl);
	}
	
	.page-header {
		text-align: center;
		margin-bottom: var(--spacing-md);
	}
	
	.page-title {
		font-size: var(--font-size-large-title);
		font-weight: var(--font-weight-bold);
		margin: 0 0 var(--spacing-xs) 0;
		color: var(--color-text-primary);
	}
	
	.page-subtitle {
		font-size: var(--font-size-body);
		color: var(--color-text-secondary);
		margin: 0;
		font-weight: var(--font-weight-medium);
	}
	
	.filters-section {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
		background: var(--color-bg-secondary);
		border-radius: var(--radius-lg);
		padding: var(--spacing-md);
		border: 1px solid var(--color-separator);
	}
	
	.search-box {
		width: 100%;
	}
	
	.search-input {
		width: 100%;
		padding: var(--spacing-sm) var(--spacing-md);
		border: 1px solid var(--color-separator);
		border-radius: var(--radius-md);
		background: var(--color-fill-secondary);
		color: var(--color-text-primary);
		font-size: var(--font-size-body);
		box-sizing: border-box;
	}
	
	.search-input:focus {
		outline: none;
		border-color: var(--color-blue);
		background: var(--color-bg-primary);
	}
	
	.filter-controls {
		display: flex;
		gap: var(--spacing-sm);
	}
	
	.filter-select {
		flex: 1;
		padding: var(--spacing-sm) var(--spacing-md);
		border: 1px solid var(--color-separator);
		border-radius: var(--radius-md);
		background: var(--color-fill-secondary);
		color: var(--color-text-primary);
		font-size: var(--font-size-body);
		cursor: pointer;
	}
	
	.filter-select:focus {
		outline: none;
		border-color: var(--color-blue);
		background: var(--color-bg-primary);
	}
	
	.expenses-list {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}
	
	.expense-item {
		background: var(--color-bg-secondary);
		border-radius: var(--radius-lg);
		padding: var(--spacing-md);
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
		border: 1px solid var(--color-separator);
		transition: all 0.2s ease;
	}
	
	.expense-item:active {
		background: var(--color-fill-tertiary);
		transform: scale(0.99);
	}
	
	.expense-icon {
		width: 48px;
		height: 48px;
		background: var(--color-fill-secondary);
		border-radius: var(--radius-md);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 20px;
		flex-shrink: 0;
	}
	
	.expense-details {
		flex: 1;
		min-width: 0;
	}
	
	.expense-title {
		font-size: var(--font-size-headline);
		font-weight: var(--font-weight-semibold);
		margin: 0 0 var(--spacing-xs) 0;
		color: var(--color-text-primary);
	}
	
	.expense-date {
		font-size: var(--font-size-footnote);
		color: var(--color-text-secondary);
		margin: 0;
		margin-bottom: 2px;
	}
	
	.expense-note {
		font-size: var(--font-size-footnote);
		color: var(--color-text-tertiary);
		margin: 0;
		font-style: italic;
	}
	
	.expense-amount {
		font-size: var(--font-size-title-3);
		font-weight: var(--font-weight-bold);
		color: var(--color-red);
		text-align: right;
		flex-shrink: 0;
	}
	
	.loading-message,
	.error-message,
	.empty-message {
		background: var(--color-bg-secondary);
		border-radius: var(--radius-lg);
		padding: var(--spacing-xl);
		text-align: center;
		border: 1px solid var(--color-separator);
	}
	
	.loading-message {
		color: var(--color-text-secondary);
	}
	
	.error-message {
		color: var(--color-red);
		background: rgba(255, 59, 48, 0.1);
		border-color: rgba(255, 59, 48, 0.3);
	}
	
	.empty-message {
		color: var(--color-text-secondary);
	}
	
	/* Responsive adjustments */
	@media (max-width: 480px) {
		.page-title {
			font-size: var(--font-size-title-1);
		}
		
		.filter-controls {
			flex-direction: column;
		}
		
		.expense-item {
			padding: var(--spacing-sm);
		}
		
		.expense-icon {
			width: 40px;
			height: 40px;
			font-size: 18px;
		}
		
		.expense-title {
			font-size: var(--font-size-body);
		}
		
		.expense-amount {
			font-size: var(--font-size-headline);
		}
	}
</style>
