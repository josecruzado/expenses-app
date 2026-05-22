<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { SvelteSet } from 'svelte/reactivity';
	import TransactionItem from '$lib/components/TransactionItem.svelte';
	import {
		gastos,
		gastosService,
		loadingGastos as loading,
		errorGastos as error,
		formatCurrency
	} from '$lib/services/gastosService';
	import type { GastoWithCategory } from '$lib/types';
	import { toastStore } from '$lib/stores/toast';

	type DateRange = 'all' | 'today' | 'week' | 'month';

	interface CategoryOption {
		id: string;
		name: string;
		icon: string;
		count: number;
		total: number;
	}

	interface ExpenseGroup {
		key: string;
		label: string;
		total: number;
		items: GastoWithCategory[];
	}

	let searchTerm = $state('');
	let selectedCategoryId = $state('');
	let dateRange = $state<DateRange>('month');
	let showAdvancedFilters = $state(false);
	const deletingIds = new SvelteSet<string>();

	const dateRangeOptions: { value: DateRange; label: string }[] = [
		{ value: 'month', label: 'Mes' },
		{ value: 'week', label: '7 días' },
		{ value: 'today', label: 'Hoy' },
		{ value: 'all', label: 'Todo' }
	];

	const categoryOptions = $derived.by(() => {
		const options = new Map<string, CategoryOption>();

		for (const gasto of $gastos) {
			const id = gasto.categoriaId || gasto.categoria.id;
			const current = options.get(id);
			const amount = Math.abs(gasto.monto);

			if (current) {
				current.count += 1;
				current.total += amount;
				continue;
			}

			options.set(id, {
				id,
				name: gasto.categoria.name,
				icon: gasto.categoria.icon,
				count: 1,
				total: amount
			});
		}

		return [...options.values()].sort((a, b) => b.total - a.total);
	});

	const selectedCategoryName = $derived(
		categoryOptions.find((category) => category.id === selectedCategoryId)?.name ?? ''
	);

	onMount(() => {
		const categoryParam = page.url.searchParams.get('category');
		if (categoryParam) {
			selectedCategoryId = categoryParam;
			dateRange = 'month';
		}
	});

	function toValidDate(value: Date) {
		const date = value instanceof Date ? value : new Date(value);
		return Number.isNaN(date.getTime()) ? null : date;
	}

	function startOfDay(date: Date) {
		return new Date(date.getFullYear(), date.getMonth(), date.getDate());
	}

	function isSameDay(a: Date, b: Date) {
		return (
			a.getFullYear() === b.getFullYear() &&
			a.getMonth() === b.getMonth() &&
			a.getDate() === b.getDate()
		);
	}

	function matchesDateRange(gasto: GastoWithCategory, range: DateRange) {
		if (range === 'all') return true;

		const date = toValidDate(gasto.fecha);
		if (!date) return false;

		const today = new Date();

		if (range === 'today') return isSameDay(date, today);

		if (range === 'week') {
			const firstDay = startOfDay(today);
			firstDay.setDate(firstDay.getDate() - 6);
			return date >= firstDay;
		}

		return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
	}

	function formatGroupKey(date: Date) {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	function formatGroupLabel(date: Date) {
		const today = new Date();
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);

		if (isSameDay(date, today)) return 'Hoy';
		if (isSameDay(date, yesterday)) return 'Ayer';

		return date.toLocaleDateString('es-PE', {
			weekday: 'short',
			day: 'numeric',
			month: 'short'
		});
	}

	const filteredGastos = $derived.by(() => {
		const term = searchTerm.trim().toLowerCase();
		return $gastos
			.filter((gasto: GastoWithCategory) => {
				const matchesSearch =
					!term ||
					gasto.categoria.name.toLowerCase().includes(term) ||
					(gasto.nota?.toLowerCase().includes(term) ?? false);
				const matchesCategory = !selectedCategoryId || gasto.categoriaId === selectedCategoryId;
				return matchesSearch && matchesCategory && matchesDateRange(gasto, dateRange);
			})
			.sort((a: GastoWithCategory, b: GastoWithCategory) => {
				return (toValidDate(b.fecha)?.getTime() ?? 0) - (toValidDate(a.fecha)?.getTime() ?? 0);
			});
	});

	const totalAmount = $derived(
		filteredGastos.reduce((sum, gasto) => sum + Math.abs(gasto.monto), 0)
	);

	const selectedRangeLabel = $derived(
		dateRangeOptions.find((option) => option.value === dateRange)?.label ?? 'Mes'
	);

	const groupedExpenses = $derived.by(() => {
		const groups = new Map<string, ExpenseGroup>();

		for (const gasto of filteredGastos) {
			const date = toValidDate(gasto.fecha);
			const key = date ? formatGroupKey(date) : 'sin-fecha';
			const group = groups.get(key);

			if (group) {
				group.total += Math.abs(gasto.monto);
				group.items.push(gasto);
				continue;
			}

			groups.set(key, {
				key,
				label: date ? formatGroupLabel(date) : 'Sin fecha',
				total: Math.abs(gasto.monto),
				items: [gasto]
			});
		}

		return [...groups.values()];
	});

	const hasActiveFilters = $derived(
		Boolean(searchTerm.trim()) || Boolean(selectedCategoryId) || dateRange !== 'month'
	);

	function resetFilters() {
		searchTerm = '';
		selectedCategoryId = '';
		dateRange = 'month';
	}

	async function handleDeleteGasto(id: string) {
		if (deletingIds.has(id)) return;
		deletingIds.add(id);
		try {
			await gastosService.deleteGasto(id);
			toastStore.success('Gasto eliminado');
		} catch (err) {
			console.error('Error deleting expense:', err);
			toastStore.error('No se pudo eliminar el gasto. Inténtalo de nuevo.');
		} finally {
			deletingIds.delete(id);
		}
	}
</script>

<svelte:head>
	<title>Todos los gastos · Expenses</title>
	<meta name="description" content="Consulta todos tus gastos" />
</svelte:head>

<section class="expenses" aria-label="Historial de gastos">
	<header class="expenses-summary">
		{#if !$loading}
			<div class="summary-total" aria-label={`Total filtrado ${formatCurrency(totalAmount)}`}>
				<span>{selectedRangeLabel}</span>
				<strong>{formatCurrency(totalAmount)}</strong>
				<p>
					{filteredGastos.length} movimiento{filteredGastos.length !== 1 ? 's' : ''}
					{#if selectedCategoryName}
						· {selectedCategoryName}
					{:else if searchTerm.trim()}
						· busqueda activa
					{/if}
				</p>
			</div>
		{:else}
			<div class="summary-total">
				<span>Historial</span>
				<strong>Gastos</strong>
				<p>Cargando movimientos</p>
			</div>
		{/if}
	</header>

	<div class="filters-panel" aria-label="Filtros de gastos">
		<div class="segment-row" role="group" aria-label="Periodo">
			{#each dateRangeOptions as option}
				<button
					type="button"
					class:active={dateRange === option.value}
					aria-pressed={dateRange === option.value}
					onclick={() => (dateRange = option.value)}
				>
					{option.label}
				</button>
			{/each}
		</div>

		<div class="list-toolbar">
			<div class="toolbar-summary">
				<span>{filteredGastos.length} movimiento{filteredGastos.length !== 1 ? 's' : ''}</span>
				{#if selectedCategoryName}
					<strong>{selectedCategoryName}</strong>
				{:else if searchTerm.trim()}
					<strong>Busqueda activa</strong>
				{:else}
					<strong>Ordenado por fecha</strong>
				{/if}
			</div>

			<button
				type="button"
				class="advanced-button"
				class:active={showAdvancedFilters}
				aria-expanded={showAdvancedFilters}
				onclick={() => (showAdvancedFilters = !showAdvancedFilters)}
			>
				{showAdvancedFilters ? 'Ocultar' : 'Buscar'}
			</button>

			{#if hasActiveFilters}
				<button type="button" class="clear-button" onclick={resetFilters}>Limpiar</button>
			{/if}
		</div>

		{#if showAdvancedFilters}
			<div class="advanced-panel">
				<input
					type="search"
					placeholder="Buscar por categoría o nota"
					aria-label="Buscar gastos"
					inputmode="search"
					enterkeyhint="search"
					autocomplete="off"
					bind:value={searchTerm}
					class="search-input"
				/>

				{#if categoryOptions.length > 0}
					<div class="category-strip" aria-label="Categorías">
						<button
							type="button"
							class="category-chip"
							class:active={!selectedCategoryId}
							aria-pressed={!selectedCategoryId}
							onclick={() => (selectedCategoryId = '')}
						>
							<span class="chip-icon">•</span>
							<span>Todas</span>
						</button>
						{#each categoryOptions as category}
							<button
								type="button"
								class="category-chip"
								class:active={selectedCategoryId === category.id}
								aria-pressed={selectedCategoryId === category.id}
								onclick={() => (selectedCategoryId = category.id)}
							>
								<span class="chip-icon">{category.icon}</span>
								<span>{category.name}</span>
							</button>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</div>

	{#if $loading}
		<div class="loading-message" role="status">Cargando gastos…</div>
	{:else if $error}
		<div class="error-message" role="alert">{$error}</div>
	{:else if filteredGastos.length === 0}
		<div class="empty-message">
			<strong>{searchTerm || selectedCategoryId || dateRange !== 'month' ? 'Sin resultados' : 'Aún no tienes gastos'}</strong>
			<span>
				{searchTerm || selectedCategoryId || dateRange !== 'month'
					? 'Ajusta los filtros para revisar otros movimientos.'
					: 'Cuando registres gastos aparecerán aquí agrupados por día.'}
			</span>
		</div>
	{:else}
		<div class="expense-groups">
			{#each groupedExpenses as group (group.key)}
				<section class="expense-group" aria-label={`${group.label}, ${formatCurrency(group.total)}`}>
					<header class="group-header">
						<div>
							<h2>{group.label}</h2>
							<span>{group.items.length} movimiento{group.items.length !== 1 ? 's' : ''}</span>
						</div>
						<strong>{formatCurrency(group.total)}</strong>
					</header>

					<div class="expenses-list">
						{#each group.items as gasto (gasto.id)}
							<TransactionItem
								{gasto}
								isDeleting={deletingIds.has(gasto.id)}
								ondelete={handleDeleteGasto}
							/>
						{/each}
					</div>
				</section>
			{/each}
		</div>
	{/if}
</section>

<style>
	.expenses {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding-bottom: calc(var(--spacing-xl) + 84px);
		-webkit-overflow-scrolling: touch;
		width: 100%;
	}

	.expenses-summary {
		padding: 16px 18px;
		border: 1px solid color-mix(in srgb, var(--color-separator) 72%, transparent);
		border-radius: 22px;
		background:
			linear-gradient(180deg, color-mix(in srgb, white 5%, transparent), transparent),
			var(--color-bg-secondary);
		box-shadow: inset 0 1px 0 color-mix(in srgb, white 7%, transparent);
	}

	.summary-total {
		display: grid;
		gap: 4px;
	}

	.summary-total span {
		color: var(--color-text-secondary);
		margin: 0;
		font-size: 12px;
		font-weight: 750;
		text-transform: uppercase;
	}

	.summary-total strong {
		color: var(--color-red);
		font-size: clamp(28px, 8vw, 38px);
		line-height: 1.05;
		font-weight: 850;
		font-variant-numeric: tabular-nums;
	}

	.summary-total p {
		margin: 0;
		color: var(--color-text-secondary);
		font-size: 14px;
		font-weight: 650;
	}

	.filters-panel {
		display: flex;
		flex-direction: column;
		gap: 12px;
		background: var(--color-bg-secondary);
		border-radius: 22px;
		padding: 12px;
		border: 1px solid color-mix(in srgb, var(--color-separator) 72%, transparent);
	}
	
	.search-input {
		width: 100%;
		min-height: 46px;
		padding: 0 14px;
		border: 1px solid color-mix(in srgb, var(--color-separator) 70%, transparent);
		border-radius: 16px;
		background: color-mix(in srgb, var(--color-fill-secondary) 82%, var(--color-bg-primary));
		color: var(--color-text-primary);
		font-size: 16px;
		font-weight: 560;
		box-sizing: border-box;
		appearance: none;
		-webkit-appearance: none;
	}
	
	.search-input:focus {
		outline: none;
		border-color: var(--color-blue);
		background: var(--color-bg-primary);
	}

	.segment-row,
	.toolbar-summary {
		display: grid;
		gap: 6px;
		padding: 4px;
		border-radius: 16px;
		background: color-mix(in srgb, var(--color-fill-secondary) 78%, transparent);
	}

	.segment-row {
		grid-template-columns: repeat(4, minmax(0, 1fr));
	}

	.segment-row button {
		min-width: 0;
		min-height: 36px;
		padding: 0 10px;
		border: 0;
		border-radius: 12px;
		background: transparent;
		color: var(--color-text-secondary);
		font-size: 13px;
		font-weight: 750;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		transition: background 140ms ease, color 140ms ease, transform 140ms ease;
	}

	.segment-row button.active {
		background: var(--color-bg-primary);
		color: var(--color-text-primary);
		box-shadow: 0 1px 4px color-mix(in srgb, black 12%, transparent);
	}

	.segment-row button:active,
	.category-chip:active,
	.clear-button:active,
	.advanced-button:active {
		transform: scale(0.98);
	}

	.category-strip {
		display: flex;
		gap: 8px;
		overflow-x: auto;
		scrollbar-width: none;
		padding: 1px 2px 4px;
		margin: 0 -2px;
		-webkit-overflow-scrolling: touch;
	}

	.category-strip::-webkit-scrollbar {
		display: none;
	}
	
	.category-chip {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		min-height: 38px;
		max-width: 190px;
		padding: 0 12px 0 8px;
		border: 1px solid color-mix(in srgb, var(--color-separator) 70%, transparent);
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-fill-secondary) 74%, transparent);
		color: var(--color-text-primary);
		font-size: 13px;
		font-weight: 750;
		cursor: pointer;
		white-space: nowrap;
		-webkit-tap-highlight-color: transparent;
		transition: background 140ms ease, border-color 140ms ease, transform 140ms ease;
	}

	.category-chip span:last-child {
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.category-chip.active {
		border-color: var(--color-blue);
		background: color-mix(in srgb, var(--color-blue) 14%, var(--color-bg-primary));
		color: var(--color-blue);
	}

	.chip-icon {
		width: 26px;
		height: 26px;
		border-radius: 10px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: color-mix(in srgb, var(--color-bg-primary) 72%, transparent);
		font-size: 15px;
		line-height: 1;
		flex: 0 0 auto;
	}

	.list-toolbar {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.toolbar-summary {
		flex: 1;
		min-width: 0;
		background: transparent;
		padding: 0;
	}

	.toolbar-summary span,
	.toolbar-summary strong {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 13px;
		line-height: 1.25;
	}

	.toolbar-summary span {
		color: var(--color-text-secondary);
		font-weight: 650;
	}

	.toolbar-summary strong {
		color: var(--color-text-primary);
		font-weight: 800;
	}

	.advanced-button,
	.clear-button {
		min-height: 42px;
		padding: 0 14px;
		border: 1px solid color-mix(in srgb, var(--color-separator) 70%, transparent);
		border-radius: 15px;
		background: var(--color-bg-primary);
		color: var(--color-blue);
		font-size: 13px;
		font-weight: 800;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		transition: transform 140ms ease, background 140ms ease;
	}

	.advanced-button {
		background: color-mix(in srgb, var(--color-blue) 12%, var(--color-bg-primary));
		color: var(--color-blue);
	}

	.advanced-button.active {
		background: var(--color-blue);
		color: white;
	}

	.advanced-panel {
		display: grid;
		gap: 10px;
		padding-top: 2px;
	}
	
	.expense-groups {
		display: grid;
		gap: 14px;
	}

	.expense-group {
		display: grid;
		gap: 8px;
	}

	.group-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 2px 4px 0;
	}

	.group-header h2 {
		margin: 0;
		color: var(--color-text-primary);
		font-size: 17px;
		line-height: 1.2;
		font-weight: 850;
		text-transform: capitalize;
	}

	.group-header span {
		color: var(--color-text-secondary);
		font-size: 12px;
		font-weight: 650;
	}

	.group-header strong {
		color: var(--color-text-primary);
		font-size: 15px;
		font-weight: 850;
		font-variant-numeric: tabular-nums;
	}

	.expenses-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
		flex: 1;
		width: 100%;
	}
	
	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
	
	.loading-message,
	.error-message,
	.empty-message {
		background: var(--color-bg-secondary);
		border-radius: 22px;
		padding: var(--spacing-xl);
		text-align: center;
		border: 1px solid color-mix(in srgb, var(--color-separator) 72%, transparent);
	}

	.empty-message {
		display: grid;
		gap: 6px;
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

	.empty-message strong {
		color: var(--color-text-primary);
		font-size: 17px;
		font-weight: 850;
	}

	.empty-message span {
		font-size: 14px;
		line-height: 1.4;
	}
	
	/* Responsive adjustments */
	@media (max-width: 480px) {
		.expenses {
			padding: 0 0 calc(var(--spacing-xl) + 84px);
			gap: 12px;
			margin: 0;
			padding-top: 0 !important;
		}

		.expenses-summary {
			padding: 16px;
			border-radius: 22px;
		}
		
		.loading-message,
		.error-message,
		.empty-message {
			padding: var(--spacing-lg);
			margin: var(--spacing-xs);
		}
    }
	
	/* Safe area support for iPhone X+ */
	@media screen and (max-width: 480px) {
		.expenses {
			padding-left: max(var(--spacing-xs), env(safe-area-inset-left));
			padding-right: max(var(--spacing-xs), env(safe-area-inset-right));
			padding-bottom: max(calc(var(--spacing-xl) + 84px), calc(env(safe-area-inset-bottom) + 84px));
			padding-top: max(var(--spacing-xs), env(safe-area-inset-top, var(--spacing-xs)));
		}
	}
	
	/* Mejoras adicionales para móvil */
	@media (max-width: 768px) {
		.expenses {
			max-width: 100vw;
			overflow-x: hidden;
		}
		
		.expenses-summary,
		.filters-panel,
		.expenses-list {
			width: 100%;
		}
		
		.search-input {
			font-size: 16px;
		}

		.list-toolbar {
			align-items: stretch;
		}

		.clear-button {
			flex: 0 0 auto;
		}
	}
</style>
