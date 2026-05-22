<script lang="ts">
    import ChevronRight from 'lucide-svelte/icons/chevron-right';
    import Grid3X3 from 'lucide-svelte/icons/grid-3x3';
    import { categorias } from '$lib/services/categoriaService';
    import { monthlyBudget } from '$lib/stores/preferences';
    import { formatCurrency } from '$lib/services/gastosService';
    import { toastStore } from '$lib/stores/toast';

    let budgetInput = $state($monthlyBudget > 0 ? String($monthlyBudget) : '');
    const favoriteCount = $derived($categorias.filter((category) => category.isFavorite).length);

    $effect(() => {
        budgetInput = $monthlyBudget > 0 ? String($monthlyBudget) : '';
    });

    function saveBudget() {
        const parsed = Number(budgetInput.replace(',', '.'));
        if (!Number.isFinite(parsed) || parsed < 0) {
            toastStore.error('Ingresa un presupuesto válido');
            return;
        }
        monthlyBudget.set(parsed);
        toastStore.success(parsed > 0 ? 'Presupuesto actualizado' : 'Presupuesto eliminado');
    }

    function clearBudget() {
        budgetInput = '';
        monthlyBudget.set(0);
        toastStore.success('Presupuesto eliminado');
    }
</script>

<svelte:head>
    <title>Ajustes · Expenses</title>
    <meta name="description" content="Configura tus preferencias de gastos" />
</svelte:head>

<section class="settings" aria-labelledby="settings-title">
    <header class="settings-header">
        <h1 id="settings-title">Ajustes</h1>
        <p>Preferencias que no necesitas tocar todos los días.</p>
    </header>

    <section class="settings-card" aria-labelledby="budget-title">
        <div class="settings-card-header">
            <div>
                <p class="settings-kicker">Finanzas</p>
                <h2 id="budget-title">Presupuesto mensual</h2>
            </div>
            <span class="budget-status">{$monthlyBudget > 0 ? formatCurrency($monthlyBudget) : 'Sin definir'}</span>
        </div>

        <p class="settings-copy">
            Se usa para calcular tu ritmo diario en el dashboard. Se guarda solo en este dispositivo.
        </p>

        <label class="budget-label" for="monthly-budget">Monto en soles</label>
        <div class="budget-control">
            <span aria-hidden="true">S/</span>
            <input
                id="monthly-budget"
                bind:value={budgetInput}
                inputmode="decimal"
                enterkeyhint="done"
                autocomplete="off"
                placeholder="0.00"
            />
        </div>

        <div class="settings-actions">
            <button type="button" class="secondary-action" onclick={clearBudget}>Quitar</button>
            <button type="button" class="primary-action" onclick={saveBudget}>Guardar</button>
        </div>
    </section>

    <section class="settings-list" aria-labelledby="personalization-title">
        <div class="settings-list-header">
            <p class="settings-kicker">Personalización</p>
            <h2 id="personalization-title">Tu app</h2>
        </div>

        <a class="settings-row" href="/categories" aria-label="Gestionar categorías">
            <span class="row-icon" aria-hidden="true">
                <Grid3X3 size={20} strokeWidth={2.2} />
            </span>
            <span class="row-content">
                <strong>Categorías</strong>
                <small>
                    {$categorias.length} activa{$categorias.length !== 1 ? 's' : ''}
                    {#if favoriteCount > 0}
                        · {favoriteCount} favorita{favoriteCount !== 1 ? 's' : ''}
                    {/if}
                </small>
            </span>
            <ChevronRight class="row-chevron" size={20} strokeWidth={2.2} aria-hidden="true" />
        </a>
    </section>
</section>

<style>
    .settings {
        display: flex;
        flex-direction: column;
        gap: 20px;
        padding-bottom: 24px;
    }

    .settings-header {
        padding: 4px 2px 0;
    }

    .settings-header h1 {
        margin: 0 0 6px;
        font-size: var(--font-size-large-title);
        line-height: 1.05;
        font-weight: 850;
        color: var(--color-text-primary);
    }

    .settings-header p {
        margin: 0;
        font-size: 15px;
        font-weight: 550;
        color: var(--color-text-secondary);
    }

    .settings-card {
        padding: 22px;
        border-radius: 28px;
        background: var(--color-bg-secondary);
        border: 1px solid var(--color-separator);
    }

    .settings-card-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 12px;
    }

    .settings-kicker {
        margin: 0 0 5px;
        font-size: 12px;
        font-weight: 800;
        color: var(--color-text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.35px;
    }

    .settings-card h2 {
        margin: 0;
        font-size: 22px;
        line-height: 1.1;
        font-weight: 850;
        color: var(--color-text-primary);
    }

    .budget-status {
        flex-shrink: 0;
        padding: 7px 10px;
        border-radius: 9999px;
        background: var(--color-fill-secondary);
        color: var(--color-text-primary);
        font-size: 13px;
        font-weight: 800;
        font-variant-numeric: tabular-nums;
    }

    .settings-copy {
        margin: 0 0 18px;
        font-size: 14px;
        line-height: 1.4;
        color: var(--color-text-secondary);
    }

    .budget-label {
        display: block;
        margin-bottom: 8px;
        font-size: 13px;
        font-weight: 700;
        color: var(--color-text-secondary);
    }

    .budget-control {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 14px 16px;
        border-radius: 18px;
        border: 1px solid var(--color-separator);
        background: var(--color-fill-secondary);
    }

    .budget-control span {
        color: var(--color-text-secondary);
        font-size: 18px;
        font-weight: 800;
    }

    .budget-control input {
        min-width: 0;
        width: 100%;
        border: none;
        outline: none;
        background: transparent;
        color: var(--color-text-primary);
        font-size: 28px;
        line-height: 1;
        font-weight: 850;
        font-variant-numeric: tabular-nums;
    }

    .settings-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-top: 16px;
    }

    .primary-action,
    .secondary-action {
        min-height: 52px;
        border: none;
        border-radius: 18px;
        font-size: 16px;
        font-weight: 850;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
    }

    .primary-action {
        background: var(--color-blue);
        color: white;
    }

    .secondary-action {
        background: var(--color-fill-secondary);
        color: var(--color-text-primary);
    }

    .primary-action:active,
    .secondary-action:active {
        transform: scale(0.97);
    }

    .settings-list {
        padding: 18px;
        border-radius: 26px;
        background: var(--color-bg-secondary);
        border: 1px solid var(--color-separator);
    }

    .settings-list-header {
        margin-bottom: 12px;
    }

    .settings-list-header h2 {
        margin: 0;
        color: var(--color-text-primary);
        font-size: 22px;
        line-height: 1.1;
        font-weight: 850;
    }

    .settings-row {
        display: grid;
        grid-template-columns: 42px minmax(0, 1fr) auto;
        align-items: center;
        gap: 12px;
        min-height: 58px;
        padding: 10px 4px;
        color: inherit;
        text-decoration: none;
        -webkit-tap-highlight-color: transparent;
    }

    .settings-row:active {
        transform: scale(0.99);
    }

    .row-icon {
        width: 42px;
        height: 42px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 14px;
        background: color-mix(in srgb, var(--color-blue) 14%, var(--color-fill-secondary));
        color: var(--color-blue);
    }

    .row-content {
        min-width: 0;
        display: grid;
        gap: 3px;
    }

    .row-content strong,
    .row-content small {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .row-content strong {
        color: var(--color-text-primary);
        font-size: 16px;
        font-weight: 800;
    }

    .row-content small {
        color: var(--color-text-secondary);
        font-size: 13px;
        font-weight: 650;
    }

    :global(.row-chevron) {
        color: var(--color-text-tertiary);
    }
</style>
