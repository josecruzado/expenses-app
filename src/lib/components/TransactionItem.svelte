<script lang="ts">
    import { formatCurrency, formatGastoDate } from '$lib/services/gastosService';
    import type { GastoWithCategory } from '$lib/types';
    import ConfirmDialog from './ConfirmDialog.svelte';

    interface Props {
        gasto: GastoWithCategory;
        isDeleting?: boolean;
        showDeleteButton?: boolean;
        ondelete?: (id: string) => void;
    }

    let {
        gasto,
        isDeleting = false,
        showDeleteButton = true,
        ondelete
    }: Props = $props();

    let showConfirm = $state(false);

    function requestDelete(e: MouseEvent) {
        e.stopPropagation();
        showConfirm = true;
    }

    function confirmDelete() {
        showConfirm = false;
        ondelete?.(gasto.id);
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
            onclick={requestDelete}
            disabled={isDeleting}
            aria-label={`Eliminar gasto de ${gasto.categoria.name}, ${formatCurrency(gasto.monto)}`}
        >
            {#if isDeleting}
                <span class="loading-spinner" aria-label="Eliminando…"></span>
            {:else}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6h18"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
            {/if}
        </button>
        {/if}
    </div>
</div>

{#if showConfirm}
    <ConfirmDialog
        title="¿Eliminar este gasto?"
        message={`${gasto.categoria.name} · ${formatCurrency(gasto.monto)}${gasto.nota ? '\n' + gasto.nota : ''}\n\nEsta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
        onconfirm={confirmDelete}
        oncancel={() => (showConfirm = false)}
    />
{/if}

<style>
    .expense-item-container {
        position: relative;
        overflow: visible;
    }

    .expense-item-container.deleting {
        opacity: 0.6;
        pointer-events: none;
    }

    .expense-item {
        display: grid;
        grid-template-columns: 46px minmax(0, 1fr) auto auto;
        align-items: center;
        gap: 12px;
        min-height: 68px;
        padding: 12px;
        border: 1px solid color-mix(in srgb, var(--color-separator) 72%, transparent);
        border-radius: 20px;
        background:
            linear-gradient(180deg, color-mix(in srgb, white 4%, transparent), transparent),
            var(--color-bg-secondary);
        box-shadow: inset 0 1px 0 color-mix(in srgb, white 7%, transparent);
        -webkit-tap-highlight-color: transparent;
        transition: transform 140ms ease, background 140ms ease, border-color 140ms ease;
    }

    .expense-item:active {
        transform: scale(0.99);
        background: color-mix(in srgb, var(--color-bg-secondary) 84%, var(--color-fill-secondary));
    }

    .expense-icon {
        width: 46px;
        height: 46px;
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: color-mix(in srgb, var(--color-fill-secondary) 82%, var(--color-bg-primary));
        box-shadow: inset 0 0 0 1px color-mix(in srgb, white 6%, transparent);
        font-size: 22px;
        line-height: 1;
    }

    .expense-details {
        min-width: 0;
        display: grid;
        gap: 3px;
    }

    .expense-title {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        margin: 0;
        font-size: 15px;
        line-height: 1.25;
        font-weight: 750;
        color: var(--color-text-primary);
    }

    .expense-date {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        margin: 0;
        font-size: 12px;
        line-height: 1.25;
        font-weight: 550;
        color: var(--color-text-secondary);
    }

    .expense-note {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        margin: 1px 0 0;
        font-size: 12px;
        line-height: 1.25;
        color: var(--color-text-tertiary);
    }

    .expense-amount {
        justify-self: end;
        align-self: center;
        min-width: 74px;
        padding-left: 8px;
        text-align: right;
        font-size: 16px;
        line-height: 1.15;
        font-weight: 850;
        color: var(--color-red);
        font-variant-numeric: tabular-nums;
    }

    .delete-icon-button {
        grid-column: 4;
        width: 38px;
        height: 38px;
        margin-left: -4px;
        border: 1px solid transparent;
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        color: var(--color-text-tertiary);
        cursor: pointer;
        flex-shrink: 0;
        -webkit-tap-highlight-color: transparent;
        transition: background 140ms ease, color 140ms ease, transform 140ms ease;
    }

    .delete-icon-button:hover {
        background: color-mix(in srgb, var(--color-red) 10%, transparent);
        color: var(--color-red);
    }

    .delete-icon-button:active {
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
        display: inline-block;
        width: 16px;
        height: 16px;
        border: 2px solid var(--color-fill-tertiary);
        border-top-color: var(--color-red);
        border-radius: 50%;
        animation: spin 0.9s linear infinite;
    }

    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }

    @media (prefers-reduced-motion: reduce) {
        .loading-spinner { animation-duration: 1.8s; }
    }

    /* Mobile adjustments */
    @media (max-width: 480px) {
        .expense-item {
            grid-template-columns: 44px minmax(0, 1fr) auto auto;
            min-height: 64px;
            padding: 10px;
            gap: 10px;
        }

        .expense-icon {
            width: 44px;
            height: 44px;
            border-radius: 15px;
            font-size: 21px;
        }

        .expense-amount {
            min-width: 66px;
            font-size: 15px;
        }

        .delete-icon-button {
            width: 38px;
            height: 38px;
        }

        .delete-icon-button svg {
            width: 18px;
            height: 18px;
        }
    }

    /* Desktop adjustments */
    @media (min-width: 768px) {
        .expense-item {
            grid-template-columns: 48px minmax(0, 1fr) auto auto;
            padding: 12px 14px;
        }
    }
</style>
