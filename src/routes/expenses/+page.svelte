<script lang="ts">
	import TransactionItem from '$lib/components/TransactionItem.svelte';
	import { 
        gastos, 
        gastosService, 
        loadingGastos as loading, 
        errorGastos as error, 
        formatCurrency 
    } from '$lib/services/gastosService';
    import type { GastoWithCategory } from '$lib/types';
    import type { Gasto } from '$lib/types';

	let searchTerm = '';
	let selectedCategory = '';
	let sortOrder = 'date-desc'; // 'date-desc', 'date-asc', 'amount-desc', 'amount-asc'
	let deletingIds = new Set<string>(); // Track which items are being deleted
	
	// Get unique categories for filter
    $: categories = [...new Set($gastos.map((gasto) => gasto.categoria.name))].sort();
	
	// Filter and sort gastos
	// CAMBIO: Se usa el tipo GastoWithCategory y se accede a `gasto.categoria.name`.
    $: filteredGastos = $gastos
        .filter((gasto: GastoWithCategory) => {
            const matchesSearch = !searchTerm || 
                gasto.categoria.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                gasto.nota.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = !selectedCategory || gasto.categoria.name === selectedCategory;
            return matchesSearch && matchesCategory;
        })
        .sort((a: GastoWithCategory, b: GastoWithCategory) => {
            // CAMBIO: Añadir comprobaciones de seguridad para la ordenación por fecha.
            switch (sortOrder) {
                case 'date-asc':
                case 'date-desc': {
                    const aIsDate = a.fecha instanceof Date;
                    const bIsDate = b.fecha instanceof Date;

                    // Si una fecha no es válida, se mueve al final de la lista.
                    if (!aIsDate) return 1;
                    if (!bIsDate) return -1;

                    // Si ambas son válidas, se comparan.
                    return sortOrder === 'date-asc'
                        ? a.fecha.getTime() - b.fecha.getTime()
                        : b.fecha.getTime() - a.fecha.getTime();
                }
                case 'amount-desc':
                    return Math.abs(b.monto) - Math.abs(a.monto);
                case 'amount-asc':
                    return Math.abs(a.monto) - Math.abs(b.monto);
                default:
                    return 0;
            }
        });
	
	// Calculate total of filtered results
    $: totalAmount = filteredGastos.reduce((sum: number, gasto: GastoWithCategory) => sum + Math.abs(gasto.monto), 0);

	// Handle delete expense
	async function handleDeleteGasto(id: string) {
		if (deletingIds.has(id)) return;
		
		// Add haptic feedback for iOS
		if (navigator.vibrate) {
			navigator.vibrate(50);
		}
		
		try {
			deletingIds = new Set([...deletingIds, id]);
			await gastosService.deleteGasto(id);
			
		} catch (err) {
			console.error('Error deleting expense:', err);
			// Show a more native-like alert
			if ('webkitRequestFullScreen' in document.documentElement) {
				// iOS-like alert
				alert('No se pudo eliminar el gasto. Inténtalo de nuevo.');
			} else {
				alert('Error al eliminar el gasto. Por favor, inténtalo de nuevo.');
			}
		} finally {
			deletingIds = new Set([...deletingIds].filter(deletingId => deletingId !== id));
		}
	}
</script>

<svelte:head>
	<title>All Expenses - Expenses</title>
	<meta name="description" content="View all your expenses" />
	<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=yes" />
</svelte:head>

<section class="expenses">
	<header class="page-header">
		<h1 class="page-title">Todos los Gastos</h1>
		{#if !$loading}
			<p class="page-subtitle">
				{filteredGastos.length} transacción{filteredGastos.length !== 1 ? 'es' : ''} 
				• Total: {formatCurrency(totalAmount)}
			</p>
		{/if}
	</header>

	<div class="filters-section">
		<div class="search-box">
			<input 
				type="text" 
				placeholder="Buscar gastos..." 
				bind:value={searchTerm}
				class="search-input"
			/>
		</div>
		
		<div class="filter-controls">
			<select bind:value={selectedCategory} class="filter-select">
				<option value="">Todas las categorias</option>
				{#each categories as category}
					<option value={category}>{category}</option>
				{/each}
			</select>
			
			<select bind:value={sortOrder} class="filter-select">
				<option value="date-desc">Más Reciente</option>
				<option value="date-asc">Más Antiguo</option>
				<option value="amount-desc">Mayor Cantidad</option>
				<option value="amount-asc">Menor Cantidad</option>
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
                <TransactionItem
                    {gasto}
                    isDeleting={deletingIds.has(gasto.id)}
                    on:delete={() => handleDeleteGasto(gasto.id)}
                />
            {/each}
        </div>
	{/if}
</section>

<style>
	.expenses {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
		padding-bottom: var(--spacing-xl);
		-webkit-overflow-scrolling: touch;
		/* min-height: 100vh;  🔴 Esto empujaba todo al medio */
		width: 100%;
	}
	
	.page-header {
		text-align: center;
		margin-bottom: var(--spacing-md);
		padding-top: var(--spacing-sm);
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
		-webkit-appearance: none; /* Remove iOS styling */
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
		-webkit-appearance: none; /* Remove iOS styling */
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
		.expenses {
			padding: 0;
			gap: var(--spacing-xs);
			margin: 0;
			/* Quitamos padding-top heredado del safe-area */
			padding-top: 0 !important;
		}

		.page-header {
			margin-bottom: var(--spacing-xs);
			padding-top: 0; /* 🔴 Esto evita el hueco en móvil */
		}
		
        .page-title {
            font-size: var(--font-size-title-1);
			margin-bottom: var(--spacing-xs);
        }
		
		.page-subtitle {
			font-size: var(--font-size-callout);
			margin-bottom: 0;
		}
		
		.filters-section {
			padding: var(--spacing-sm);
		}
		
        .filter-controls {
            flex-direction: column;
        }
		
		.expenses-list {
			gap: var(--spacing-xs);
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
			padding-bottom: max(var(--spacing-xl), env(safe-area-inset-bottom));
			padding-top: max(var(--spacing-xs), env(safe-area-inset-top, var(--spacing-xs)));
		}
	}
	
	/* Mejoras adicionales para móvil */
	@media (max-width: 768px) {
		.expenses {
			max-width: 100vw;
			overflow-x: hidden;
		}
		
		.page-header,
		.filters-section,
		.expenses-list {
			width: 100%;
		}
		
		.search-input,
		.filter-select {
			font-size: 16px; /* Evita zoom en iOS */
		}
	}
</style>