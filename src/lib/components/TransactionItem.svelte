<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    // CAMBIO: Importar solo las funciones necesarias y el tipo correcto.
    import { formatCurrency, formatGastoDate } from '$lib/services/gastosService';
    import type { GastoWithCategory } from '$lib/types';

    // Props
    // CAMBIO: Usar el tipo GastoWithCategory.
    export let gasto: GastoWithCategory;
    export let isDeleting: boolean = false;
    export let showDeleteButton: boolean = true;

    const dispatch = createEventDispatcher();

    function handleDelete() {
        const confirmed = confirm(
            `⚠️ ¿Eliminar este gasto?\n\n` +
            `Categoría: ${gasto.categoria.name}\n` +
            `Monto: ${formatCurrency(gasto.monto)}\n` +
            (gasto.nota ? `Nota: ${gasto.nota}\n` : "") +
            `\nEsta acción no se puede deshacer.`
        );

        if (confirmed) {
            dispatch("delete", { id: gasto.id });
        }
    }
</script>

<div class="expense-item-container" class:deleting={isDeleting}>
    <div
        class="expense-item"
    >
        <div class="expense-icon">{gasto.categoria.icon}</div>
        <div class="expense-details">
            <h3 class="expense-title">{gasto.categoria.name}</h3>
            <p class="expense-date">{formatGastoDate(gasto.fecha)}</p>
            {#if gasto.nota}
                <p class="expense-note">{gasto.nota}</p>
            {/if}
        </div>
        <div class="expense-amount">{formatCurrency(gasto.monto)}</div>
        
        <!-- Icono de eliminación -->
        {#if showDeleteButton}
        <button 
            class="delete-icon-button"
            on:click|stopPropagation={handleDelete}
            disabled={isDeleting}
            title="Eliminar gasto"
        >
            {#if isDeleting}
                <div class="loading-spinner">⏳</div>
            {:else}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6h18"/>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                    <path d="M8 6V4c0-1 1-2 2-2h4c-1 0 2 1 2 2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
            {/if}
        </button>
        {/if}
    </div>
</div>

<style>
    .expense-item-container {
        position: relative;
        overflow: visible; /* importante: deja ver la sombra */
        transition: box-shadow 0.2s ease;
    }
    .expense-item-container.deleting {
        opacity: 0.6;
        pointer-events: none;
    }

    .expense-item {
        background: var(--color-bg-secondary);
        border-radius: var(--radius-lg);
        padding: var(--spacing-md);
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        border: 1px solid var(--color-separator);

        position: relative;
        z-index: 2;
        -webkit-user-select: none;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
        cursor: pointer;

        transform: scale(var(--pressScale, 1));
        transform-origin: center;

        transition: transform 120ms ease-out, box-shadow 120ms ease-out;
        box-shadow: 0 1px 3px rgba(0,0,0,0.06); /* sombra inicial suave */
    }

    /* Tap sutil */
    .expense-item:active {
        --pressScale: 0.995; /* casi imperceptible, natural */
        box-shadow: 0 1px 6px rgba(0,0,0,0.12);
    }

    .expense-icon {
        width: clamp(40px, 5vw, 48px);
        height: clamp(40px, 5vw, 48px);
        background: var(--color-fill-secondary);
        border-radius: var(--radius-md);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: clamp(18px, 2vw, 22px);
        flex-shrink: 0;
    }

    .expense-details {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .expense-title {
        font-size: clamp(14px, 1.4vw, 18px);
        font-weight: var(--font-weight-semibold);
        margin: 0;
        color: var(--color-text-primary);
        line-height: 1.3;
    }

    .expense-date {
        font-size: clamp(12px, 1.1vw, 14px);
        color: var(--color-text-secondary);
        margin: 0;
    }

    .expense-note {
        font-size: clamp(12px, 1.1vw, 14px);
        color: var(--color-text-tertiary);
        margin: 0;
        font-style: italic;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .expense-amount {
        font-size: clamp(16px, 1.6vw, 20px);
        font-weight: var(--font-weight-bold);
        color: var(--color-red);
        text-align: right;
        flex-shrink: 0;
        min-width: 60px;
    }

    /* Botón de eliminación */
    .delete-icon-button {
        background: transparent;
        border: none;
        color: var(--color-text-tertiary);
        width: 32px;
        height: 32px;
        border-radius: var(--radius-sm);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        transition: all 0.15s ease;
        flex-shrink: 0;
        margin-left: var(--spacing-xs);
    }

    .delete-icon-button:hover {
        background: var(--color-fill-tertiary);
        color: var(--color-red);
        transform: scale(1.05);
    }

    .delete-icon-button:active {
        background: var(--color-fill-secondary);
        transform: scale(0.95);
    }

    .delete-icon-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
    }

    .delete-icon-button:disabled:hover {
        background: transparent;
        color: var(--color-text-tertiary);
        transform: none;
    }

    .loading-spinner {
        font-size: 14px;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }

    /* Mobile adjustments */
    @media (max-width: 480px) {
        .expense-item {
            padding: 10px;
            gap: 10px;
        }
        .expense-details {
            gap: 1px;
        }
        .delete-icon-button {
            width: 28px;
            height: 28px;
        }
        .delete-icon-button svg {
            width: 16px;
            height: 16px;
        }
    }

    /* Desktop adjustments */
    @media (min-width: 768px) {
        .expense-details {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr; /* título, fecha, nota */
            align-items: center;
            gap: 8px;
            min-width: 0;
        }
        .expense-title {
            grid-column: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .expense-date {
            grid-column: 2;
            text-align: center;
            min-width: 0;
        }
        .expense-note {
            grid-column: 3;
            text-align: right;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            min-width: 0;
        }
    }
</style>