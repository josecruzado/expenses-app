<script lang="ts">
    import ArrowLeft from 'lucide-svelte/icons/arrow-left';
    import Edit3 from 'lucide-svelte/icons/edit-3';
    import Plus from 'lucide-svelte/icons/plus';
    import Trash2 from 'lucide-svelte/icons/trash-2';
    import Star from 'lucide-svelte/icons/star';
    import { SvelteSet } from 'svelte/reactivity';
    import CategoryModal from '$lib/components/CategoryModal.svelte';
    import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
    import type { Categoria } from '$lib/types';
    import {
        categorias,
        loadingCategorias as loading,
        errorCategorias as error,
        categoriaService
    } from '$lib/services/categoriaService';
    import { gastos } from '$lib/services/gastosService';
    import { toastStore } from '$lib/stores/toast';

    const deletingIds = new SvelteSet<string>();
    let editingCategory = $state<Categoria | null>(null);
    let showEditModal = $state(false);
    let pendingDelete = $state<Categoria | null>(null);
    let confirmBusy = $state(false);

    const sortedCategories = $derived(
        [...$categorias].sort((a, b) => {
            if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
            return a.name.localeCompare(b.name, 'es');
        })
    );

    const usageByCategory = $derived.by(() => {
        const usage = new Map<string, number>();
        for (const gasto of $gastos) {
            usage.set(gasto.categoriaId, (usage.get(gasto.categoriaId) ?? 0) + 1);
        }
        return usage;
    });

    const favoriteCount = $derived($categorias.filter((category) => category.isFavorite).length);

    function usageLabel(category: Categoria) {
        const count = usageByCategory.get(category.id) ?? 0;
        if (count === 0) return 'Sin gastos';
        return `${count} gasto${count !== 1 ? 's' : ''}`;
    }

    function requestDelete(categoria: Categoria) {
        if (deletingIds.has(categoria.id)) return;
        pendingDelete = categoria;
    }

    async function confirmDelete(): Promise<void> {
        if (!pendingDelete) return;
        const id = pendingDelete.id;
        confirmBusy = true;
        deletingIds.add(id);
        try {
            await categoriaService.deleteCategoria(id);
            toastStore.success('Categoría eliminada');
        } catch (err) {
            console.error('Error al eliminar categoría:', err);
            toastStore.error('No se pudo eliminar la categoría');
        } finally {
            deletingIds.delete(id);
            confirmBusy = false;
            pendingDelete = null;
        }
    }

    function handleEditCategoria(categoria: Categoria) {
        editingCategory = categoria;
        showEditModal = true;
    }

    function handleCreateCategoria() {
        editingCategory = null;
        showEditModal = true;
    }

    function handleCloseModal(result: { success: boolean }) {
        const wasEditing = editingCategory !== null;
        showEditModal = false;
        editingCategory = null;
        if (result.success) {
            toastStore.success(wasEditing ? 'Categoría actualizada' : 'Categoría creada');
        }
    }
</script>

<svelte:head>
    <title>Categorías · Expenses</title>
    <meta name="description" content="Configura tus categorías de gastos personales" />
</svelte:head>

<section class="categories-settings" aria-labelledby="category-title">
    <header class="settings-nav">
        <a href="/settings" class="back-link" aria-label="Volver a ajustes">
            <ArrowLeft size={19} strokeWidth={2.4} />
            <span>Ajustes</span>
        </a>

        <button type="button" class="new-button" onclick={handleCreateCategoria}>
            <Plus size={18} strokeWidth={2.5} />
            <span>Nueva</span>
        </button>
    </header>

    <section class="summary-panel">
        <div>
            <p class="summary-kicker">Configuración</p>
            <h1 id="category-title">Categorías</h1>
            <p>
                {$categorias.length} activa{$categorias.length !== 1 ? 's' : ''}
                {#if favoriteCount > 0}
                    · {favoriteCount} favorita{favoriteCount !== 1 ? 's' : ''}
                {/if}
            </p>
        </div>
    </section>

    <div class="category-list-container" aria-live="polite">
        {#if $loading}
            <div class="state-message" role="status">Cargando categorías...</div>
        {:else if $error}
            <div class="state-message error" role="alert">{$error}</div>
        {:else if sortedCategories.length === 0}
            <div class="state-message">
                <strong>Aún no tienes categorías</strong>
                <span>Crea categorías para que el registro de gastos sea más rápido.</span>
            </div>
        {:else}
            <div class="category-list" role="list">
                {#each sortedCategories as categoria (categoria.id)}
                    <article class="category-row" class:deleting={deletingIds.has(categoria.id)} role="listitem">
                        <div class="category-icon" aria-hidden="true">{categoria.icon}</div>

                        <div class="category-content">
                            <div class="category-name-line">
                                <h2>{categoria.name}</h2>
                                {#if categoria.isFavorite}
                                    <span class="favorite-badge" aria-label="Favorita">
                                        <Star size={12} fill="currentColor" strokeWidth={2.4} />
                                    </span>
                                {/if}
                            </div>
                            <p>{usageLabel(categoria)}</p>
                        </div>

                        <div class="category-actions">
                            <button
                                type="button"
                                class="icon-button"
                                onclick={() => handleEditCategoria(categoria)}
                                aria-label={`Editar ${categoria.name}`}
                            >
                                <Edit3 size={18} strokeWidth={2.2} />
                            </button>
                            <button
                                type="button"
                                class="icon-button danger"
                                onclick={() => requestDelete(categoria)}
                                disabled={deletingIds.has(categoria.id)}
                                aria-label={`Eliminar ${categoria.name}`}
                            >
                                {#if deletingIds.has(categoria.id)}
                                    <span class="loading-spinner" aria-label="Eliminando"></span>
                                {:else}
                                    <Trash2 size={18} strokeWidth={2.2} />
                                {/if}
                            </button>
                        </div>
                    </article>
                {/each}
            </div>
        {/if}
    </div>

    {#if showEditModal}
        <CategoryModal category={editingCategory} onclose={handleCloseModal} />
    {/if}

    {#if pendingDelete}
        <ConfirmDialog
            title="¿Eliminar categoría?"
            message={`Vas a eliminar "${pendingDelete.name}". Los gastos asociados conservarán el nombre pero perderán el icono.`}
            confirmLabel="Eliminar"
            variant="danger"
            busy={confirmBusy}
            onconfirm={confirmDelete}
            oncancel={() => (pendingDelete = null)}
        />
    {/if}
</section>

<style>
    .categories-settings {
        display: grid;
        gap: 14px;
        padding-bottom: calc(var(--spacing-xl) + 84px);
    }

    .settings-nav {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
    }

    .back-link,
    .new-button {
        min-height: 42px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        border-radius: 16px;
        font-size: 14px;
        font-weight: 800;
        text-decoration: none;
        -webkit-tap-highlight-color: transparent;
    }

    .back-link {
        color: var(--color-blue);
    }

    .new-button {
        padding: 0 14px;
        border: 1px solid color-mix(in srgb, var(--color-blue) 22%, transparent);
        background: color-mix(in srgb, var(--color-blue) 12%, var(--color-bg-primary));
        color: var(--color-blue);
        cursor: pointer;
    }

    .back-link:active,
    .new-button:active,
    .icon-button:active {
        transform: scale(0.97);
    }

    .summary-panel {
        padding: 18px;
        border-radius: 24px;
        background: var(--color-bg-secondary);
        border: 1px solid color-mix(in srgb, var(--color-separator) 72%, transparent);
    }

    .summary-kicker {
        margin: 0 0 5px;
        color: var(--color-text-secondary);
        font-size: 12px;
        font-weight: 800;
        text-transform: uppercase;
    }

    .summary-panel h1 {
        margin: 0;
        color: var(--color-text-primary);
        font-size: 30px;
        line-height: 1.05;
        font-weight: 850;
    }

    .summary-panel p {
        margin: 6px 0 0;
        color: var(--color-text-secondary);
        font-size: 14px;
        font-weight: 650;
    }

    .category-list-container {
        min-height: 220px;
    }

    .category-list {
        display: grid;
        gap: 8px;
    }

    .category-row {
        display: grid;
        grid-template-columns: 46px minmax(0, 1fr) auto;
        align-items: center;
        gap: 12px;
        min-height: 66px;
        padding: 10px;
        border: 1px solid color-mix(in srgb, var(--color-separator) 72%, transparent);
        border-radius: 20px;
        background: var(--color-bg-secondary);
        transition: opacity 140ms ease, transform 140ms ease;
    }

    .category-row.deleting {
        opacity: 0.58;
        pointer-events: none;
    }

    .category-icon {
        width: 46px;
        height: 46px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 16px;
        background: color-mix(in srgb, var(--color-fill-secondary) 82%, var(--color-bg-primary));
        font-size: 23px;
        line-height: 1;
    }

    .category-content {
        min-width: 0;
        display: grid;
        gap: 3px;
    }

    .category-name-line {
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 7px;
    }

    .category-name-line h2 {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        margin: 0;
        color: var(--color-text-primary);
        font-size: 16px;
        line-height: 1.2;
        font-weight: 820;
    }

    .favorite-badge {
        width: 22px;
        height: 22px;
        flex: 0 0 auto;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: color-mix(in srgb, var(--color-orange, #ff9500) 16%, transparent);
        color: var(--color-orange, #ff9500);
    }

    .category-content p {
        margin: 0;
        color: var(--color-text-secondary);
        font-size: 13px;
        font-weight: 650;
    }

    .category-actions {
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .icon-button {
        width: 42px;
        height: 42px;
        border: 0;
        border-radius: 14px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        color: var(--color-text-tertiary);
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
    }

    .icon-button:hover {
        background: color-mix(in srgb, var(--color-fill-secondary) 78%, transparent);
        color: var(--color-blue);
    }

    .icon-button.danger:hover {
        background: color-mix(in srgb, var(--color-red) 10%, transparent);
        color: var(--color-red);
    }

    .icon-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .state-message {
        min-height: 180px;
        display: grid;
        place-items: center;
        gap: 6px;
        padding: 24px;
        text-align: center;
        border-radius: 22px;
        background: var(--color-bg-secondary);
        border: 1px solid color-mix(in srgb, var(--color-separator) 72%, transparent);
        color: var(--color-text-secondary);
        font-size: 14px;
        font-weight: 650;
    }

    .state-message strong {
        color: var(--color-text-primary);
        font-size: 17px;
        font-weight: 850;
    }

    .state-message span {
        max-width: 260px;
        line-height: 1.4;
    }

    .state-message.error {
        color: var(--color-red);
        background: color-mix(in srgb, var(--color-red) 10%, var(--color-bg-secondary));
        border-color: color-mix(in srgb, var(--color-red) 30%, transparent);
    }

    .loading-spinner {
        width: 17px;
        height: 17px;
        border: 2px solid color-mix(in srgb, var(--color-red) 20%, transparent);
        border-top-color: var(--color-red);
        border-radius: 50%;
        animation: spin 0.9s linear infinite;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }

    @media (max-width: 480px) {
        .categories-settings {
            gap: 12px;
            padding-bottom: calc(var(--spacing-xl) + 84px);
        }

        .summary-panel {
            padding: 16px;
        }

        .category-row {
            grid-template-columns: 44px minmax(0, 1fr) auto;
            gap: 10px;
            padding: 9px;
        }

        .category-icon {
            width: 44px;
            height: 44px;
            font-size: 21px;
        }

        .icon-button {
            width: 40px;
            height: 40px;
        }
    }
</style>
