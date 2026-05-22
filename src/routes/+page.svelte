<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/state';
    import { goto } from '$app/navigation';
    import AddExpenseModal from '$lib/components/AddExpenseModal.svelte';
    import TransactionItem from '$lib/components/TransactionItem.svelte';
    import { gastos, loadingGastos as loading, gastosService, formatCurrency } from '$lib/services/gastosService';
    import { toastStore } from '$lib/stores/toast';
    import { monthlyBudget } from '$lib/stores/preferences';
    import type { CreateGastoData, GastoWithCategory } from '$lib/types';

    interface CategorySlice {
        id: string;
        name: string;
        icon: string;
        amount: number;
        percentage: number;
    }

    interface DayInsight {
        key: string;
        weekday: string;
        dayNumber: number;
        amount: number;
        intensity: number;
        expenses: GastoWithCategory[];
        dominantName: string;
        dominantIcon: string;
        differenceFromAverage: number;
    }

    interface DashboardStats {
        currentMonthTotal: number;
        transactionCount: number;
        categoryBreakdown: CategorySlice[];
        dailyAverage: number;
        projectedMonthEnd: number;
        maxCategoryAmount: number;
        daysInMonth: number;
        currentDay: number;
        daysRemaining: number;
        dayInsights: DayInsight[];
    }

    const CHART_COLORS = ['#FF3B30', '#FF9500', '#34C759', '#007AFF', '#AF52DE'];
    const WEEKDAY_FORMATTER = new Intl.DateTimeFormat('es-PE', { weekday: 'short' });

    function dateKey(date: Date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    let showAddExpenseModal = $state(false);
    let selectedDayKey = $state(dateKey(new Date()));
    let showDayDetailSheet = $state(false);
    let dayStripElement = $state<HTMLDivElement | null>(null);

    async function handleSaveExpense(data: CreateGastoData) {
        // No capturamos la excepción: el modal hace await y muestra su propio
        // estado de error inline si la persistencia falla. Si tiene éxito, el
        // modal cierra solo y dispara onclose, que apaga showAddExpenseModal.
        await gastosService.addGasto(data);
        toastStore.success('Gasto registrado');
    }

    // Soporta el shortcut del manifest: /?action=new-expense
    onMount(() => {
        requestAnimationFrame(() => {
            dayStripElement?.scrollTo({ left: dayStripElement.scrollWidth, behavior: 'instant' });
        });

        if (page.url.searchParams.get('action') === 'new-expense') {
            showAddExpenseModal = true;
            // Limpia el query para evitar re-abrir al refrescar.
            goto('/', { replaceState: true, noScroll: true, keepFocus: true });
        }
    });

    function tapFeedback() {
        navigator.vibrate?.(8);
    }

    function openDayDetail(key: string) {
        selectedDayKey = key;
        showDayDetailSheet = true;
        tapFeedback();
    }

    function openCategoryExpenses(category: CategorySlice) {
        tapFeedback();
        goto(`/expenses?category=${encodeURIComponent(category.id)}`);
    }

    // Badging API (iOS 16.4+ instalado, Chrome desktop). Refleja el nº de
    // gastos registrados este mes en el icono de la PWA. Silencio errores:
    // requiere permiso y solo funciona en instalación.
    $effect(() => {
        if (typeof navigator === 'undefined') return;
        const setBadge = (navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void> })
            .setAppBadge;
        const clearBadge = (navigator as Navigator & { clearAppBadge?: () => Promise<void> })
            .clearAppBadge;
        if (!setBadge) return;
        const count = stats.transactionCount;
        if (count > 0) setBadge.call(navigator, count).catch(() => {});
        else clearBadge?.call(navigator).catch(() => {});
    });

    const stats: DashboardStats = $derived.by(() => {
        const list = $gastos || [];

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const monthlyExpenses = list.filter((g) =>
            g.fecha instanceof Date && g.fecha.getMonth() === currentMonth && g.fecha.getFullYear() === currentYear
        );

        const currentMonthTotal = monthlyExpenses.reduce((sum, g) => sum + Math.abs(g.monto), 0);

        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const today = now.getDate();
        const daysRemaining = daysInMonth - today + 1;
        const dailyAverage = currentMonthTotal / today;
        const projectedMonthEnd = dailyAverage * daysInMonth;

        const categoryTotals = monthlyExpenses.reduce<
            Record<string, { id: string; name: string; icon: string; amount: number }>
        >((acc, g) => {
            const id = g.categoriaId || g.categoria?.id || 'uncategorized';
            const name = g.categoria?.name || 'Sin categoría';
            const icon = g.categoria?.icon || '•';
            if (!acc[id]) acc[id] = { id, name, icon, amount: 0 };
            acc[id].amount += Math.abs(g.monto);
            return acc;
        }, {});

        const categoryBreakdown: CategorySlice[] = Object.values(categoryTotals)
            .map((category) => ({
                ...category,
                percentage: currentMonthTotal > 0 ? (category.amount / currentMonthTotal) * 100 : 0
            }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);

        const dayBuckets = list.reduce<Record<string, GastoWithCategory[]>>((acc, g) => {
            if (!(g.fecha instanceof Date)) return acc;
            const key = dateKey(g.fecha);
            if (!acc[key]) acc[key] = [];
            acc[key].push(g);
            return acc;
        }, {});

        const rawDayInsights = Array.from({ length: 7 }, (_, index) => {
            const date = new Date(now);
            date.setDate(now.getDate() - (6 - index));
            const key = dateKey(date);
            const expenses = dayBuckets[key] || [];
            const amount = expenses.reduce((sum, g) => sum + Math.abs(g.monto), 0);
            const categoryMap = expenses.reduce<
                Record<string, { name: string; icon: string; amount: number }>
            >((acc, g) => {
                const categoryId = g.categoriaId || g.categoria?.id || 'uncategorized';
                if (!acc[categoryId]) {
                    acc[categoryId] = {
                        name: g.categoria?.name || 'Sin categoría',
                        icon: g.categoria?.icon || '•',
                        amount: 0
                    };
                }
                acc[categoryId].amount += Math.abs(g.monto);
                return acc;
            }, {});
            const dominantCategory = Object.values(categoryMap).sort((a, b) => b.amount - a.amount)[0];
            return {
                key,
                weekday: WEEKDAY_FORMATTER.format(date).replace('.', ''),
                dayNumber: date.getDate(),
                amount,
                expenses,
                dominantName: dominantCategory?.name || 'Sin gasto',
                dominantIcon: dominantCategory?.icon || '•',
                differenceFromAverage: amount - dailyAverage
            };
        });
        const maxDayAmount = Math.max(...rawDayInsights.map((point) => point.amount), 0);
        const dayInsights: DayInsight[] = rawDayInsights.map((point) => ({
            ...point,
            intensity: maxDayAmount > 0 ? point.amount / maxDayAmount : 0
        }));

        return {
            currentMonthTotal,
            transactionCount: monthlyExpenses.length,
            categoryBreakdown,
            dailyAverage,
            projectedMonthEnd,
            maxCategoryAmount: categoryBreakdown.length > 0 ? categoryBreakdown[0].amount : 0,
            daysInMonth,
            currentDay: today,
            daysRemaining,
            dayInsights
        };
    });

    const selectedDay = $derived.by(() => {
        return (
            stats.dayInsights.find((day) => day.key === selectedDayKey) ||
            stats.dayInsights[stats.dayInsights.length - 1] ||
            null
        );
    });

    const selectedDayMessage = $derived.by(() => {
        if (!selectedDay) return 'Selecciona un día para ver el detalle';
        if (selectedDay.amount === 0) return 'No registraste gastos este día';
        const diff = Math.abs(selectedDay.differenceFromAverage);
        if (selectedDay.differenceFromAverage > 0) {
            return `${formatCurrency(diff)} sobre tu promedio diario`;
        }
        return `${formatCurrency(diff)} debajo de tu promedio diario`;
    });

    const todayInsight = $derived.by(() => {
        const todayKey = dateKey(new Date());
        return stats.dayInsights.find((day) => day.key === todayKey) || null;
    });

    const dailyTarget = $derived.by(() => {
        if ($monthlyBudget > 0) return $monthlyBudget / Math.max(stats.daysInMonth, 1);
        return stats.dailyAverage;
    });

    const todayDelta = $derived((todayInsight?.amount || 0) - dailyTarget);

    const closingTone = $derived.by(() => {
        if ($monthlyBudget > 0 && stats.currentMonthTotal > $monthlyBudget) return 'danger';
        if (!todayInsight || todayInsight.amount === 0) return 'neutral';
        return todayDelta <= 0 ? 'good' : 'warning';
    });

    const closingMessage = $derived.by(() => {
        if (!todayInsight || todayInsight.amount === 0) return 'Aún no registras gastos hoy';
        if ($monthlyBudget > 0 && stats.currentMonthTotal > $monthlyBudget) return 'El presupuesto mensual ya fue superado';
        const diff = Math.abs(todayDelta);
        if (todayDelta <= 0) return `${formatCurrency(diff)} debajo del ritmo diario`;
        return `${formatCurrency(diff)} sobre el ritmo diario`;
    });
</script>

<svelte:head>
	<title>Dashboard - Expenses</title>
	<meta name="description" content="Personal expenses tracking dashboard" />
</svelte:head>

{#if showAddExpenseModal}
    <AddExpenseModal
        onclose={() => (showAddExpenseModal = false)}
        onsave={handleSaveExpense}
    />
{/if}

<section class="dashboard" aria-label="Resumen de gastos">

	<header class="review-card" class:good={closingTone === 'good'} class:warning={closingTone === 'warning'} class:danger={closingTone === 'danger'} aria-labelledby="review-title">
		<div class="review-copy">
			<p class="review-kicker">Cierre de hoy</p>
			<h1 id="review-title" class="review-total">
				{$loading ? 'Cargando...' : formatCurrency(todayInsight?.amount || 0)}
			</h1>
			<p class="review-message">{closingMessage}</p>
		</div>

		<div class="review-actions">
			<button class="review-primary" onclick={() => { tapFeedback(); showAddExpenseModal = true; }}>
				<span aria-hidden="true">+</span>
				Registrar
			</button>
		</div>

		<div class="review-metrics" aria-label="Resumen mensual">
			<div>
				<span>Mes</span>
				<strong>{formatCurrency(stats.currentMonthTotal)}</strong>
			</div>
			<div>
				<span>Proyección</span>
				<strong>{formatCurrency(stats.projectedMonthEnd)}</strong>
			</div>
		</div>
	</header>

	{#if stats.dayInsights.length > 0}
		<section class="day-card" aria-labelledby="day-title">
			<div class="day-header">
				<div>
					<h3 id="day-title" class="chart-title">Días recientes</h3>
					<p class="chart-subtitle">Toca un día para ver sus gastos</p>
				</div>
				<span class="day-average">{formatCurrency(stats.dailyAverage)} / día</span>
			</div>

			<div class="day-strip" role="list" aria-label="Seleccionar día reciente" bind:this={dayStripElement}>
				{#each stats.dayInsights as day}
					<button
						type="button"
						class="day-chip"
						class:active={selectedDay?.key === day.key}
						style="--intensity: {day.intensity};"
						aria-label={`${day.weekday} ${day.dayNumber}: ${formatCurrency(day.amount)}`}
						onclick={() => openDayDetail(day.key)}
					>
						<span class="day-weekday">{day.weekday}</span>
						<span class="day-number">{day.dayNumber}</span>
						<span class="day-amount">{day.amount > 0 ? formatCurrency(day.amount) : 'S/0'}</span>
					</button>
				{/each}
			</div>

			{#if showDayDetailSheet && selectedDay}
				<div class="day-inline-detail" aria-live="polite">
					<div class="day-inline-header">
						<div>
							<p class="day-inline-kicker">{selectedDay.weekday} {selectedDay.dayNumber}</p>
							<h4>{formatCurrency(selectedDay.amount)}</h4>
						</div>
						<button type="button" class="day-inline-close" onclick={() => (showDayDetailSheet = false)} aria-label="Ocultar detalle">×</button>
					</div>

					<p class="day-inline-summary">{selectedDayMessage}</p>

					<div class="day-inline-metrics">
						<div>
							<span>Categoría clave</span>
							<strong>{selectedDay.dominantIcon} {selectedDay.dominantName}</strong>
						</div>
						<div>
							<span>Movimientos</span>
							<strong>{selectedDay.expenses.length}</strong>
						</div>
					</div>

					{#if selectedDay.expenses.length > 0}
						<div class="day-inline-list">
							{#each selectedDay.expenses as gasto (gasto.id)}
								<TransactionItem {gasto} showDeleteButton={false} />
							{/each}
						</div>
					{:else}
						<button class="day-inline-primary" onclick={() => { showDayDetailSheet = false; tapFeedback(); showAddExpenseModal = true; }}>
							Registrar gasto
						</button>
					{/if}
				</div>
			{/if}
		</section>
	{/if}

	<!-- 3. Category Spending Chart -->
	{#if stats.categoryBreakdown.length > 0}
		<div class="chart-card">
			<div class="chart-header">
				<h3 class="chart-title">Top Categorías</h3>
				<p class="chart-subtitle">Distribución del gasto mensual</p>
			</div>
			
			<div class="category-chart" role="list" aria-label="Gastos por categoría">
				{#each stats.categoryBreakdown as category, i}
					<div role="listitem">
						<button
							type="button"
							class="category-row"
							style="--accent: {CHART_COLORS[i % CHART_COLORS.length]}; --bar-width: {(category.amount / stats.maxCategoryAmount) * 100}%; --delay: {i * 70}ms;"
							aria-label={`Ver gastos de ${category.name}: ${category.percentage.toFixed(1)}% del mes, ${formatCurrency(category.amount)}`}
							onclick={() => openCategoryExpenses(category)}
						>
							<div class="category-icon-badge" aria-hidden="true">{category.icon}</div>
							<div class="category-metric">
								<div class="category-row-top">
									<span class="category-name">{category.name}</span>
									<span class="category-amount">{formatCurrency(category.amount)}</span>
								</div>
								<div class="category-track" aria-hidden="true">
									<div class="category-fill"></div>
								</div>
								<span class="category-percent">{category.percentage.toFixed(1)}%</span>
							</div>
						</button>
					</div>
				{/each}
			</div>
		</div>
	{/if}

</section>

<style>
	.dashboard {
		display: flex;
		flex-direction: column;
		gap: 20px;
		padding-bottom: 24px;
		max-width: 100%;
		animation: fadeScaleIn 0.5s cubic-bezier(0.25, 1, 0.3, 1.05);
	}

	@keyframes fadeScaleIn {
		0% { opacity: 0; transform: translateY(16px) scale(0.98); }
		100% { opacity: 1; transform: translateY(0) scale(1); }
	}
	
	/* --- 1. DAILY REVIEW --- */
	.review-card {
		--review-accent: var(--color-blue);
		display: grid;
		gap: 18px;
		padding: 24px;
		border-radius: 30px;
		background:
			linear-gradient(145deg, color-mix(in srgb, var(--review-accent) 18%, transparent), transparent 62%),
			var(--color-bg-secondary);
		border: 1px solid color-mix(in srgb, var(--review-accent) 22%, var(--color-separator));
		box-shadow: 0 18px 44px rgba(0, 0, 0, 0.08);
	}

	.review-card.good { --review-accent: var(--color-green); }
	.review-card.warning { --review-accent: var(--color-orange); }
	.review-card.danger { --review-accent: var(--color-red); }

	.review-kicker {
		margin: 0 0 8px;
		font-size: 13px;
		font-weight: 750;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.4px;
	}

	.review-total {
		margin: 0;
		font-size: clamp(40px, 12vw, 58px);
		line-height: 1;
		font-weight: 850;
		color: var(--color-text-primary);
	}

	.review-message {
		margin: 10px 0 0;
		font-size: 16px;
		font-weight: 700;
		color: var(--review-accent);
	}

	.review-actions {
		display: flex;
	}

	.review-primary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		width: 100%;
		min-height: 52px;
		border: none;
		border-radius: 18px;
		font-size: 16px;
		font-weight: 800;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		transition: transform 140ms ease, opacity 140ms ease;
		background: var(--color-text-primary);
		color: var(--color-bg-primary);
	}

	.review-primary span {
		font-size: 22px;
		line-height: 1;
		margin-top: -2px;
	}

	.review-primary:active {
		transform: scale(0.97);
		opacity: 0.86;
	}

	.review-metrics {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}

	.review-metrics > div {
		min-width: 0;
		padding: 12px;
		border-radius: 18px;
		background: color-mix(in srgb, var(--color-bg-primary) 58%, transparent);
	}

	.review-metrics span {
		display: block;
		margin-bottom: 4px;
		font-size: 12px;
		font-weight: 650;
		color: var(--color-text-secondary);
	}

	.review-metrics strong {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 17px;
		font-weight: 850;
		color: var(--color-text-primary);
	}

	/* --- 3. DAY INSIGHTS --- */
	.day-card {
		background: var(--color-bg-secondary);
		border-radius: 28px;
		padding: 22px;
		border: 1px solid var(--color-separator);
	}

	.day-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 16px;
		margin-bottom: 18px;
	}

	.day-average {
		font-size: 13px;
		font-weight: 750;
		color: var(--color-text-primary);
		white-space: nowrap;
		padding: 7px 10px;
		border-radius: 9999px;
		background: var(--color-fill-secondary);
	}

	.day-strip {
		display: flex;
		gap: 10px;
		overflow-x: auto;
		padding: 2px 2px 12px;
		margin: 0 -2px;
		scroll-snap-type: x proximity;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none;
	}

	.day-strip::-webkit-scrollbar {
		display: none;
	}

	.day-chip {
		--day-accent: color-mix(in srgb, var(--color-blue) calc(16% + (var(--intensity) * 28%)), var(--color-fill-secondary));
		flex: 0 0 74px;
		min-height: 104px;
		display: grid;
		grid-template-rows: auto 1fr auto;
		align-items: center;
		justify-items: center;
		gap: 4px;
		border: 1px solid color-mix(in srgb, var(--color-blue) calc(12% + (var(--intensity) * 22%)), var(--color-separator));
		border-radius: 22px;
		background:
			linear-gradient(180deg, var(--day-accent), transparent),
			var(--color-fill-quaternary);
		color: var(--color-text-primary);
		padding: 12px 8px;
		cursor: pointer;
		scroll-snap-align: start;
		-webkit-tap-highlight-color: transparent;
		transition: transform 150ms ease, border-color 150ms ease, background 150ms ease;
	}

	.day-chip:active {
		transform: scale(0.96);
	}

	.day-chip.active {
		background:
			linear-gradient(180deg, color-mix(in srgb, var(--color-blue) 36%, transparent), color-mix(in srgb, var(--color-purple) 12%, transparent)),
			var(--color-fill-secondary);
		border-color: color-mix(in srgb, var(--color-blue) 68%, white);
	}

	.day-weekday {
		font-size: 11px;
		font-weight: 800;
		color: var(--color-text-secondary);
		text-transform: uppercase;
	}

	.day-number {
		font-size: 26px;
		font-weight: 850;
		line-height: 1;
		color: var(--color-text-primary);
	}

	.day-amount {
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 12px;
		font-weight: 750;
		color: var(--color-text-primary);
	}

	.day-inline-detail {
		margin-top: 4px;
		border-radius: 24px;
		padding: 16px;
		background: color-mix(in srgb, var(--color-bg-primary) 58%, transparent);
		border: 1px solid var(--color-separator);
		animation: detailIn 180ms ease-out;
	}

	.day-inline-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 14px;
		margin-bottom: 8px;
	}

	.day-inline-kicker {
		margin: 0 0 3px;
		font-size: 12px;
		font-weight: 800;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.35px;
	}

	.day-inline-header h4 {
		margin: 0;
		font-size: 26px;
		line-height: 1.05;
		font-weight: 850;
		color: var(--color-text-primary);
	}

	.day-inline-close {
		width: 34px;
		height: 34px;
		border: none;
		border-radius: 50%;
		background: var(--color-fill-secondary);
		color: var(--color-text-secondary);
		font-size: 24px;
		line-height: 1;
		cursor: pointer;
	}

	.day-inline-summary {
		margin: 0 0 14px;
		font-size: 14px;
		font-weight: 650;
		color: var(--color-text-secondary);
	}

	.day-inline-metrics {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
		margin-bottom: 12px;
	}

	.day-inline-metrics > div {
		min-width: 0;
		padding: 12px;
		border-radius: 18px;
		background: var(--color-fill-secondary);
	}

	.day-inline-metrics span {
		display: block;
		margin-bottom: 5px;
		font-size: 12px;
		font-weight: 650;
		color: var(--color-text-secondary);
	}

	.day-inline-metrics strong {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 15px;
		font-weight: 800;
		color: var(--color-text-primary);
	}

	.day-inline-list {
		display: grid;
		gap: 8px;
	}

	.day-inline-primary {
		min-height: 50px;
		width: 100%;
		border: none;
		border-radius: 18px;
		background: var(--color-blue);
		color: white;
		font-size: 16px;
		font-weight: 800;
		cursor: pointer;
	}

	@keyframes detailIn {
		from { opacity: 0; transform: translateY(-6px); }
		to { opacity: 1; transform: translateY(0); }
	}

	/* --- 4. CHART CARD --- */
	.chart-card {
		background: var(--color-bg-secondary);
		border-radius: 28px;
		padding: 24px;
		border: 1px solid var(--color-separator);
	}

	.chart-header {
		margin-bottom: 20px;
	}

	.chart-title {
		font-size: 18px;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0 0 4px 0;
	}

	.chart-subtitle {
		font-size: 13px;
		font-weight: 500;
		color: var(--color-text-secondary);
		margin: 0;
	}

	.category-chart {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.category-row {
		display: grid;
		grid-template-columns: 48px minmax(0, 1fr);
		gap: 14px;
		align-items: center;
		width: 100%;
		padding: 12px;
		border: 0;
		border-radius: 20px;
		background: color-mix(in srgb, var(--accent) 8%, transparent);
		color: inherit;
		text-align: left;
		cursor: pointer;
		transition: transform 160ms ease, background 160ms ease;
		-webkit-tap-highlight-color: transparent;
	}

	.category-row:hover {
		background: color-mix(in srgb, var(--accent) 12%, transparent);
		transform: translateY(-1px);
	}

	.category-icon-badge {
		width: 48px;
		height: 48px;
		border-radius: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: color-mix(in srgb, var(--accent) 16%, var(--color-bg-primary));
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 24%, transparent);
		font-size: 24px;
		line-height: 1;
		flex-shrink: 0;
	}

	.category-metric {
		min-width: 0;
		display: grid;
		gap: 7px;
	}

	.category-row-top {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
		min-width: 0;
	}

	.category-name {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 14px;
		font-weight: 650;
		color: var(--color-text-primary);
	}

	.category-amount {
		font-size: 15px;
		font-weight: 700;
		color: var(--color-text-primary);
		white-space: nowrap;
	}

	.category-track {
		position: relative;
		height: 10px;
		border-radius: 9999px;
		background: rgba(120, 120, 128, 0.14);
		overflow: hidden;
	}

	.category-fill {
		width: var(--bar-width);
		height: 100%;
		border-radius: inherit;
		background: linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 70%, white));
		transform-origin: left center;
		animation: growCategoryBar 700ms cubic-bezier(0.25, 1, 0.3, 1.05) var(--delay) both;
	}

	.category-percent {
		font-size: 12px;
		font-weight: 600;
		color: var(--color-text-secondary);
	}

	@keyframes growCategoryBar {
		from { transform: scaleX(0); }
		to { transform: scaleX(1); }
	}

	/* Responsive */
	@media (min-width: 768px) {
		.dashboard { gap: 24px; padding-top: 24px; }
		.review-card { padding: 32px; }
		.chart-card { padding: 28px; }
		.category-chart { gap: 14px; }
	}

	@media (prefers-reduced-motion: reduce) {
		.category-fill {
			animation: none;
		}
	}
</style>
