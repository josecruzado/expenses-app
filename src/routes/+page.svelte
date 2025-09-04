<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Counter from './Counter.svelte';
	import { gastos, loading, error, type Gasto } from '$lib/firebase.js';
    import { formatCurrency, formatDate, gastosService, subscribeToGastos, unsubscribeFromGastos } from '$lib/services/gastosService';
    import AddExpenseModal from '$lib/components/AddExpenseModal.svelte';
    import TransactionItem from '$lib/components/TransactionItem.svelte';

	let currentMonthTotal = 0;
	let transactionCount = 0;
	let recentTransactions: any[] = [];
	let monthlySpendingTrend: Array<{month: string, amount: number}> = [];
	let categoryBreakdown: Array<{name: string, amount: number, percentage: number}> = [];
	let weeklyAverage = 0;
	let dailyAverage = 0;
	let topCategory = '';
	let previousMonthTotal = 0;
	let monthlyChange = 0;
	let spendingByDayOfWeek: Array<{day: string, amount: number}> = [];
	let projectedMonthEnd = 0;
	let spendingVelocityChange = 0;

	let showAddExpenseModal = false;
    let addExpenseModalComponent: AddExpenseModal;

    async function handleSaveExpense(event: CustomEvent<Gasto>) {
        const newGasto = event.detail;
        const result = await gastosService.addGasto(newGasto);

        if (result.success) {
            showAddExpenseModal = false;
        } else {
            addExpenseModalComponent.showSaveError(result.error || 'An unknown error occurred.');
        }
    }
	
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

		const normalized = fecha.replace(/[\u00A0\u202F]/g, ' ').trim();

		const fullPattern =
			/^(\d{1,2})\s+de\s+([a-záéíóúñ]+)\s+de\s+(\d{4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(a\.?\s?m\.?|p\.?\s?m\.?)\s+UTC([+\-−])(\d{1,2})(?::?(\d{2}))?$/i;

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

		return new Date(0);
	}

	// Función para obtener el nombre del día de la semana
	function getDayOfWeek(date: Date): string {
		const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
		return days[date.getDay()];
	}

	// Calcular analytics avanzados
	$: {
		if ($gastos.length > 0) {
			const now = new Date();
			const currentMonth = now.getMonth();
			const currentYear = now.getFullYear();
			const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
			const previousMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
			
			// Gastos del mes actual
			const monthlyExpenses = $gastos.filter(gasto => {
				try {
					const gastoDate = parseSpanishDate(gasto.fecha);
					return gastoDate.getMonth() === currentMonth && gastoDate.getFullYear() === currentYear;
				} catch {
					return false;
				}
			});

			// Gastos del mes anterior
			const previousMonthExpenses = $gastos.filter(gasto => {
				try {
					const gastoDate = parseSpanishDate(gasto.fecha);
					return gastoDate.getMonth() === previousMonth && gastoDate.getFullYear() === previousMonthYear;
				} catch {
					return false;
				}
			});
			
			currentMonthTotal = monthlyExpenses.reduce((sum, gasto) => sum + Math.abs(gasto.monto), 0);
			previousMonthTotal = previousMonthExpenses.reduce((sum, gasto) => sum + Math.abs(gasto.monto), 0);
			transactionCount = monthlyExpenses.length;
			recentTransactions = $gastos.slice(0, 4);

			// Calcular cambio mensual
			monthlyChange = previousMonthTotal > 0 ? ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100 : 0;

			// Promedio semanal y diario
			const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
			const currentDay = now.getDate();
			dailyAverage = currentMonthTotal / currentDay;
			weeklyAverage = dailyAverage * 7;

			// Proyección fin de mes
			projectedMonthEnd = dailyAverage * daysInMonth;

			// Velocidad de gasto comparada con mes anterior
			const daysPassed = now.getDate();
			const dailyAverageThisMonth = currentMonthTotal / daysPassed;
			const daysInPreviousMonth = new Date(previousMonthYear, previousMonth + 1, 0).getDate();
			const dailyAveragePreviousMonth = previousMonthTotal / daysInPreviousMonth;
			spendingVelocityChange = dailyAveragePreviousMonth > 0 ? 
				((dailyAverageThisMonth - dailyAveragePreviousMonth) / dailyAveragePreviousMonth) * 100 : 0;

			// Análisis por categorías
			const categoryTotals: {[key: string]: number} = monthlyExpenses.reduce((acc, gasto) => {
				const category = gasto.categoria || 'Sin categoría';
				acc[category] = (acc[category] || 0) + Math.abs(gasto.monto);
				return acc;
			}, {} as {[key: string]: number});

			categoryBreakdown = Object.entries(categoryTotals)
				.map(([name, amount]) => ({ 
					name, 
					amount, 
					percentage: currentMonthTotal > 0 ? (amount / currentMonthTotal) * 100 : 0 
				}))
				.sort((a, b) => b.amount - a.amount)
				.slice(0, 5);

			topCategory = categoryBreakdown[0]?.name || 'Sin datos';

			// Gastos por día de la semana
			const dayTotals: {[key: string]: number} = monthlyExpenses.reduce((acc, gasto) => {
				try {
					const gastoDate = parseSpanishDate(gasto.fecha);
					const dayName = getDayOfWeek(gastoDate);
					acc[dayName] = (acc[dayName] || 0) + Math.abs(gasto.monto);
					return acc;
				} catch {
					return acc;
				}
			}, {} as {[key: string]: number});

			spendingByDayOfWeek = Object.entries(dayTotals)
				.map(([day, amount]) => ({ day, amount }))
				.sort((a, b) => b.amount - a.amount);

			// Tendencia de últimos 6 meses
			monthlySpendingTrend = [];
			for (let i = 5; i >= 0; i--) {
				const targetMonth = (currentMonth - i + 12) % 12;
				const targetYear = currentMonth - i < 0 ? currentYear - 1 : currentYear;
				
				const monthExpenses = $gastos.filter(gasto => {
					try {
						const gastoDate = parseSpanishDate(gasto.fecha);
						return gastoDate.getMonth() === targetMonth && gastoDate.getFullYear() === targetYear;
					} catch {
						return false;
					}
				});
				
				const total = monthExpenses.reduce((sum, gasto) => sum + Math.abs(gasto.monto), 0);
				const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
				
				monthlySpendingTrend.push({
					month: monthNames[targetMonth],
					amount: total
				});
			}
		} else {
			// Reset all values
			currentMonthTotal = 0;
			transactionCount = 0;
			recentTransactions = [];
			monthlySpendingTrend = [];
			categoryBreakdown = [];
			weeklyAverage = 0;
			dailyAverage = 0;
			topCategory = '';
			previousMonthTotal = 0;
			monthlyChange = 0;
			spendingByDayOfWeek = [];
			projectedMonthEnd = 0;
			spendingVelocityChange = 0;
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
    <AddExpenseModal
        bind:this={addExpenseModalComponent}
        on:close={() => (showAddExpenseModal = false)}
        on:save={handleSaveExpense}
    />
{/if}

<section class="dashboard">
	<!-- Stats principales -->
	<div class="stats-grid">
		<div class="stat-card primary">
			<div class="stat-icon">💸</div>
			<div class="stat-content">
				<h3 class="stat-value">
					{#if $loading}
						Loading...
					{:else}
						{formatCurrency(currentMonthTotal)}
					{/if}
				</h3>
				<p class="stat-label">Mes Actual</p>
				{#if !$loading && monthlyChange !== 0}
					<p class="stat-change" class:positive={monthlyChange < 0} class:negative={monthlyChange > 0}>
						{monthlyChange > 0 ? '↗' : '↘'} {Math.abs(monthlyChange).toFixed(1)}%
					</p>
				{/if}
			</div>
		</div>
		
		<div class="stat-card">
			<div class="stat-icon">📈</div>
			<div class="stat-content">
				<h3 class="stat-value">
					{#if $loading}
						-
					{:else}
						{formatCurrency(projectedMonthEnd)}
					{/if}
				</h3>
				<p class="stat-label">Proyección Fin de Mes</p>
				{#if !$loading && spendingVelocityChange !== 0}
					<p class="stat-change" class:positive={spendingVelocityChange < 0} class:negative={spendingVelocityChange > 0}>
						{spendingVelocityChange > 0 ? '⚡' : '🐌'} {Math.abs(spendingVelocityChange).toFixed(1)}%
					</p>
				{/if}
			</div>
		</div>
		
		<div class="stat-card">
			<div class="stat-icon">📊</div>
			<div class="stat-content">
				<h3 class="stat-value">
					{#if $loading}
						-
					{:else}
						{formatCurrency(dailyAverage)}
					{/if}
				</h3>
				<p class="stat-label">Promedio Diario</p>
			</div>
		</div>
		
		<div class="stat-card">
			<div class="stat-icon">🏆</div>
			<div class="stat-content">
				<h3 class="stat-value">
					{#if $loading}
						-
					{:else}
						{topCategory.length > 10 ? topCategory.substring(0, 10) + '...' : topCategory}
					{/if}
				</h3>
				<p class="stat-label">Top Categoría</p>
			</div>
		</div>
	</div>

	<!-- Breakdown por categorías -->
	{#if categoryBreakdown.length > 0}
		<div class="category-breakdown">
			<h3 class="section-title">Gastos por Categoría</h3>
			<div class="category-list">
				{#each categoryBreakdown as category}
					<div class="category-item">
						<div class="category-info">
							<span class="category-name">{category.name}</span>
							<span class="category-amount">{formatCurrency(category.amount)}</span>
						</div>
						<div class="category-bar">
							<div class="category-fill" style="width: {category.percentage}%"></div>
						</div>
						<span class="category-percentage">{category.percentage.toFixed(1)}%</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Botones de acción -->
	<div class="action-buttons">
		<button class="primary-button" on:click={() => (showAddExpenseModal = true)}>
            <span class="button-icon">➕</span>
            <span>Agregar Gasto</span>
        </button>
		
		<a href="/expenses" class="secondary-button">
			<span class="button-icon">📋</span>
			<span>Ver Todos</span>
		</a>
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
		position: relative;
	}

	.stat-card.primary {
		background: linear-gradient(135deg, var(--color-blue) 0%, #0066CC 100%);
		color: white;
		box-shadow: 0 8px 24px rgba(0, 122, 255, 0.3);
	}

	.stat-card.primary .stat-value,
	.stat-card.primary .stat-label {
		color: white;
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

	.stat-change {
		font-size: var(--font-size-caption);
		font-weight: var(--font-weight-semibold);
		margin: 2px 0 0 0;
	}

	.stat-change.positive {
		color: #34C759;
	}

	.stat-change.negative {
		color: #FF3B30;
	}

	.category-breakdown{
		background: var(--color-bg-secondary);
		border-radius: var(--radius-lg);
		padding: var(--spacing-lg);
		border: 1px solid var(--color-separator);
	}

	.category-list{
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.category-item {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
	}

	.category-info {
		min-width: 120px;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.category-name {
		font-size: var(--font-size-footnote);
		font-weight: var(--font-weight-medium);
		color: var(--color-text-primary);
	}

	.category-amount {
		font-size: var(--font-size-caption);
		color: var(--color-text-secondary);
	}

	.category-bar{
		flex: 1;
		height: 8px;
		background: var(--color-fill-tertiary);
		border-radius: 4px;
		overflow: hidden;
	}

	.category-fill {
		height: 100%;
		background: linear-gradient(90deg, var(--color-blue), #66B3FF);
		border-radius: 4px;
		transition: width 0.3s ease;
	}

	.category-percentage {
		font-size: var(--font-size-caption);
		font-weight: var(--font-weight-medium);
		color: var(--color-text-secondary);
		min-width: 40px;
		text-align: right;
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
	
	.section-title {
		font-size: var(--font-size-title-3);
		font-weight: var(--font-weight-semibold);
		margin: 0 0 var(--spacing-md) 0;
		color: var(--color-text-primary);
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
            margin-top: var(--spacing-lg);
        }

        .stats-grid {
            grid-template-columns: repeat(4, 1fr);
        }
		
		.action-buttons {
			max-width: 400px;
			margin: 0 auto;
		}

		.category-info {
			min-width: 150px;
		}
	}

	@media (min-width: 1024px) {
		.dashboard {
			max-width: 1200px;
			margin: var(--spacing-lg) auto;
		}

		.stats-grid {
			gap: var(--spacing-lg);
		}

		.category-breakdown {
			padding: var(--spacing-xl);
		}
	}
</style>