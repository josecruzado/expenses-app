<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Counter from './Counter.svelte';
	import { gastos, loading, error, type Gasto } from '$lib/firebase.js';
    import { formatCurrency, formatDate, gastosService, getCategoryIcon, getCategoryName, subscribeToGastos, unsubscribeFromGastos } from '$lib/services/gastosService';
    import AddExpenseModal from '$lib/components/AddExpenseModal.svelte';
    import TransactionItem from '$lib/components/TransactionItem.svelte';

	let currentMonthTotal = 0;
	let transactionCount = 0;
	let recentTransactions: any[] = [];

	let showAddExpenseModal = false;
    let addExpenseModalComponent: AddExpenseModal; // Referencia al componente del modal

    // El evento ahora está correctamente tipado
    async function handleSaveExpense(event: CustomEvent<Gasto>) {
        const newGasto = event.detail;
        const result = await gastosService.addGasto(newGasto);

        if (result.success) {
            showAddExpenseModal = false; // Cerramos el modal si todo va bien
        } else {
            // Si hay un error, se lo comunicamos al componente modal para que lo muestre
            addExpenseModalComponent.showSaveError(result.error || 'An unknown error occurred.');
        }
    }
	
	// Helper function to parse Spanish date format
	function parseSpanishDate(fecha: string): Date {
		const monthMap: { [key: string]: number } = {
			'ene': 0, 'enero': 0,
			'feb': 1, 'febrero': 1,
			'mar': 2, 'marzo': 2,
			'abr': 3, 'abril': 3,
			'may': 4, 'mayo': 4,
			'jun': 5, 'junio': 5,
			'jul': 6, 'julio': 6,
			'ago': 7, 'agosto': 7,
			'sep': 8, 'sept': 8, 'septiembre': 8, 'setiembre': 8,
			'oct': 9, 'octubre': 9,
			'nov': 10, 'noviembre': 10,
			'dic': 11, 'diciembre': 11
		};

		// Normalize potential Unicode non-breaking spaces
		const normalized = fecha.replace(/[\u00A0\u202F]/g, ' ').trim();

		// Full format: "8 de agosto de 2025, 11:28:00 p.m. UTC-5" (seconds optional, supports UTC±HH[:MM])
		const fullPattern =
			/^(\d{1,2})\s+de\s+([a-záéíóúñ]+)\s+de\s+(\d{4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(a\.?\s?m\.?|p\.?\s?m\.?)\s+UTC([+\-−])(\d{1,2})(?::?(\d{2}))?$/i;

		// Previous short format: "8 ago 2025, 11:28 p.m."
		const shortPattern =
			/(\d{1,2})\s+([a-záéíóúñ]{3})\s+(\d{4}),?\s+(\d{1,2}):(\d{2})\s+(a\.?m\.?|p\.?m\.?)$/i;

		let m = normalized.match(fullPattern);
		if (m) {
			const [, d, monthName, y, hh, mm, ss = '0', period, sign, tzH, tzM = '0'] = m;
			const monthIndex = monthMap[monthName.toLowerCase()];
			if (monthIndex === undefined) return new Date(0);

			let h = parseInt(hh, 10);
			const isPM = period.toLowerCase().startsWith('p');
			if (isPM && h !== 12) h += 12;
			if (!isPM && h === 12) h = 0;

			const tzHours = parseInt(tzH, 10) || 0;
			const tzMinutes = parseInt(tzM, 10) || 0;
			// UTC-5 => add 5h to get UTC epoch
			const offsetMinutes = (sign === '-' || sign === '−' ? 1 : -1) * (tzHours * 60 + tzMinutes);

			const utcMs = Date.UTC(
				parseInt(y, 10),
				monthIndex,
				parseInt(d, 10),
				h,
				parseInt(mm, 10),
				parseInt(ss, 10)
			) + offsetMinutes * 60000;

			return new Date(utcMs);
		}

		// Fallback to short format (assumes local timezone, no seconds)
		m = normalized.match(shortPattern);
		if (m) {
			const [, d, mon, y, hh, mm, period] = m;
			const monthIndex = monthMap[mon.toLowerCase()];
			if (monthIndex === undefined) return new Date(0);

			let h = parseInt(hh, 10);
			const isPM = period.toLowerCase().startsWith('p');
			if (isPM && h !== 12) h += 12;
			if (!isPM && h === 12) h = 0;

			return new Date(parseInt(y, 10), monthIndex, parseInt(d, 10), h, parseInt(mm, 10));
		}

		return new Date(0); // Return epoch if parsing fails
	}

	// Calculate stats whenever gastos change
	$: {
		if ($gastos.length > 0) {
			const now = new Date();
			const currentMonth = now.getMonth();
			const currentYear = now.getFullYear();
			
			// Calculate current month expenses
			const monthlyExpenses = $gastos.filter(gasto => {
				try {
					const gastoDate = parseSpanishDate(gasto.fecha);
					return gastoDate.getMonth() === currentMonth && gastoDate.getFullYear() === currentYear;
				} catch {
					return false;
				}
			});
			
			currentMonthTotal = monthlyExpenses.reduce((sum, gasto) => sum + Math.abs(gasto.monto), 0);
			transactionCount = monthlyExpenses.length;
			recentTransactions = $gastos.slice(0, 3); // Get 3 most recent transactions
		} else {
			currentMonthTotal = 0;
			transactionCount = 0;
			recentTransactions = [];
		}
	}

	onMount(() => {
		subscribeToGastos();
	});

	onDestroy(() => {
		unsubscribeFromGastos();
	});
</script>

<svelte:head>
	<title>Dashboard - Expenses</title>
	<meta name="description" content="Personal expenses tracking dashboard" />
</svelte:head>

{#if showAddExpenseModal}
    <!-- Guardamos una referencia al componente con bind:this -->
    <AddExpenseModal
        bind:this={addExpenseModalComponent}
        on:close={() => (showAddExpenseModal = false)}
        on:save={handleSaveExpense}
    />
{/if}

<section class="dashboard">

	<div class="stats-grid">
		<div class="stat-card">
			<div class="stat-icon">💸</div>
			<div class="stat-content">
				<h3 class="stat-value">
					{#if $loading}
						Loading...
					{:else}
						${currentMonthTotal.toFixed(2)}
					{/if}
				</h3>
				<p class="stat-label">This Month</p>
			</div>
		</div>
		
		<div class="stat-card">
			<div class="stat-icon">📊</div>
			<div class="stat-content">
				<h3 class="stat-value">
					{#if $loading}
						-
					{:else}
						{transactionCount}
					{/if}
				</h3>
				<p class="stat-label">Transactions</p>
			</div>
		</div>
		
		<div class="stat-card">
			<div class="stat-icon">💳</div>
			<div class="stat-content">
				<h3 class="stat-value">
					{#if $loading}
						-
					{:else}
						{$gastos.length}
					{/if}
				</h3>
				<p class="stat-label">Total Records</p>
			</div>
		</div>
		
		<div class="stat-card">
			<div class="stat-icon">📈</div>
			<div class="stat-content">
				<h3 class="stat-value">
					{#if $loading}
						-
					{:else if $gastos.length > 0}
						{Math.max(...$gastos.map(g => g.monto)).toFixed(0)}
					{:else}
						$0
					{/if}
				</h3>
				<p class="stat-label">Largest Expense</p>
			</div>
		</div>
	</div>

	<div class="action-buttons">
		<button class="primary-button" on:click={() => (showAddExpenseModal = true)}>
            <span class="button-icon">➕</span>
            <span>Add Expense</span>
        </button>
		
		<a href="/expenses" class="secondary-button">
			<span class="button-icon">📋</span>
			<span>View All</span>
		</a>
	</div>

	<div class="recent-section">
		<h2 class="section-title">Recent Transactions</h2>
		
		{#if $loading}
			<div class="loading-message">Loading transactions...</div>
		{:else if $error}
			<div class="error-message">{$error}</div>
		{:else if recentTransactions.length === 0}
			<div class="empty-message">No transactions found</div>
		{:else}
			<div class="transaction-list">
				{#each recentTransactions as gasto (gasto.id)}
                    <TransactionItem
						{gasto}
						showDeleteButton={false}
					/>
                {/each}
			</div>
		{/if}
	</div>
</section>

<style>
	.dashboard {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-lg);
		padding-bottom: var(--spacing-xl);
		max-width: 100%;
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
		text-decoration: none;
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
	
	.loading-message,
	.error-message,
	.empty-message {
		background: var(--color-bg-secondary);
		border-radius: var(--radius-md);
		padding: var(--spacing-lg);
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
		.dashboard {
            /* Añade un margen superior para bajar el contenido en pantallas de PC */
            margin-top: var(--spacing-lg);
        }

        .stats-grid {
            grid-template-columns: repeat(4, 1fr);
        }
		
		.action-buttons {
			max-width: 400px;
			margin: 0 auto;
		}
	}
</style>
