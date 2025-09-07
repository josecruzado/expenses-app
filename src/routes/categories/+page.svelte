<script lang="ts">
    import { fly, fade } from 'svelte/transition';
    import CategoryModal from '$lib/components/CategoryModal.svelte';
    import type { Categoria } from '$lib/types';
    import { 
        categorias, 
        loadingCategorias as loading, 
        errorCategorias as error, 
        categoriaService 
    } from '$lib/services/categoriaService';
    // Estados
    let deletingIds = new Set<string>();
    let editingCategory: Categoria | null = null;
    let showEditModal = false;
    let feedbackMsg: string | null = null;
    let feedbackType: 'success' | 'error' | null = null;

    function showFeedback(msg: string, type: 'success' | 'error' = 'success') {
        feedbackMsg = msg;
        feedbackType = type;
        setTimeout(() => {
            feedbackMsg = null;
            feedbackType = null;
        }, 3000);
    }

    async function handleDeleteCategoria(id: string): Promise<void> {
        if (deletingIds.has(id)) return;
        if (!confirm('¿Eliminar esta categoría?')) return;
        
        deletingIds.add(id);
        try {
            await categoriaService.deleteCategoria(id);
            showFeedback('Categoría eliminada exitosamente', 'success');
        } catch (err) {
            console.error('Error al eliminar categoría:', err);
            showFeedback('Error al eliminar la categoría', 'error');
        } finally {
            deletingIds.delete(id);
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
    
    function handleCloseModal(event: CustomEvent<{ success?: boolean }>) {
        // Solo muestra el feedback si el evento 'close' incluye el detalle de éxito.
        if (event.detail?.success) {
            const message = editingCategory 
                ? 'Categoría actualizada correctamente.' 
                : 'Categoría creada exitosamente.';
            showFeedback(message, 'success');
        }
        
        // Siempre cierra el modal y resetea el estado, independientemente del resultado.
        showEditModal = false;
        editingCategory = null;
    }

    $: totalCategorias = $categorias.length;
</script>

<svelte:head>
    <title>Administrar Categorías</title>
    <meta name="description" content="Administra tus categorías de gastos personales" />
	<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=yes" />
</svelte:head>

<section class="category-manager" aria-labelledby="category-title">
    <header class="page-header">
        <h1 id="category-title" class="page-title">Administrar Categorías</h1>
        {#if !$loading}
            <p class="page-subtitle">Total de categorías: {totalCategorias}</p>
        {/if}
    </header>

    <!-- Botón para crear nueva categoría -->
    <button class="add-category-btn" on:click={handleCreateCategoria} aria-label="Crear nueva categoría">
        <span class="add-icon" role="img" aria-label="Añadir">➕</span> 
        Nueva categoría
    </button>

    <div class="category-list-container" aria-live="polite">
        {#if $loading}
            <div class="loading-message" role="status" aria-label="Cargando categorías">
                <svg class="spinner" viewBox="0 0 50 50" aria-hidden="true">
                    <circle class="path" cx="25" cy="25" r="20" />
                </svg>
                <span>Cargando categorías...</span>
            </div>
        {:else if $error}
            <div class="error-message" role="alert">
                <span class="error-icon" aria-hidden="true">⚠️</span>
                <span>{$error}</span>
            </div>
        {:else if $categorias.length === 0}
            <div class="empty-message">
                <span class="empty-icon" aria-hidden="true">📝</span>
                <h3>Aún no tienes categorías</h3>
                <p>¡Agrega tu primera categoría para comenzar a organizar tus gastos!</p>
            </div>
        {:else}
            <div class="category-grid" role="list">
                {#each $categorias as categoria (categoria.id)}
                    <div class="category-card-container" 
                        in:fly={{y: 20, duration: 300, delay: 50}} 
                        out:fade={{duration: 200}}>
                        <div class="category-card" class:deleting={deletingIds.has(categoria.id)}>
                            <div class="category-card-icon">
                                {categoria.icon}
                            </div>
                            <div class="category-card-details">
                                <h3 class="category-card-name">{categoria.name}</h3>
                                <div class="category-card-meta">
                                    {#if categoria.isFavorite}
                                        <span class="category-favorite" aria-label="Categoría favorita">⭐️ Favorita</span>
                                    {:else}
                                        <span class="category-status">Categoría</span>
                                    {/if}
                                </div>
                            </div>
                            <div class="category-card-actions">
                                <button 
                                    on:click={() => handleEditCategoria(categoria)} 
                                    class="action-button edit-button" 
                                    aria-label="Editar categoría {categoria.name}"
                                    title="Editar categoría">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                        <path d="m18.5 2.5 a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                    </svg>
                                </button>
                                <button 
                                    on:click={() => handleDeleteCategoria(categoria.id)}
                                    class="action-button delete-button"
                                    disabled={deletingIds.has(categoria.id)}
                                    aria-label="Eliminar categoría {categoria.name}"
                                    title="Eliminar categoría">
                                    {#if deletingIds.has(categoria.id)}
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
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>

    <!-- Modal de Crear/Editar Categoría -->
    {#if showEditModal}
        <CategoryModal
            category={editingCategory}
            on:close={handleCloseModal}
        />
    {/if}

    <!-- Notificaciones de feedback -->
    {#if feedbackMsg}
        <div class="feedback {feedbackType}" 
             role="alert" 
             aria-live="polite"
             in:fly={{y: 50, duration: 300}}
             out:fade={{duration: 200}}>
            <span class="feedback-icon" aria-hidden="true">
                {feedbackType === 'success' ? '✅' : '❌'}
            </span>
            {feedbackMsg}
        </div>
    {/if}
</section>

<style>
    .category-manager {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md);
        padding: var(--spacing-md);
        margin: 0 auto;
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

    .add-category-btn {
        background: var(--color-blue);
        color: white;
        font-weight: var(--font-weight-bold);
        border: none;
        border-radius: var(--radius-md);
        padding: var(--spacing-sm) var(--spacing-md);
        cursor: pointer;
        margin-bottom: var(--spacing-md);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--spacing-xs);
        font-size: var(--font-size-body);
        transition: all 0.2s ease;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .add-category-btn:hover {
        background: var(--color-blue-dark, #2980b9);
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    }

    .add-category-btn:active {
        transform: translateY(0);
    }

    .add-icon {
        font-size: 1.2em;
    }

    .category-list-container { 
        flex: 1;  
        border-radius: var(--radius-lg);
        min-height: 400px;
    }

    /* ===== NUEVOS ESTILOS PARA CARDS ===== */
    .category-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: var(--spacing-md);
        padding: 0;
        margin: 0;
    }

    .category-card-container {
        position: relative;
        overflow: visible;
        transition: box-shadow 0.2s ease;
    }

    .category-card-container.deleting {
        opacity: 0.6;
        pointer-events: none;
    }

    .category-card {
        background: var(--color-bg-secondary);
        border-radius: var(--radius-lg);
        padding: var(--spacing-lg);
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
        border: 1px solid var(--color-separator);
        position: relative;
        z-index: 2;
        cursor: pointer;
        transform: scale(var(--pressScale, 1));
        transform-origin: center;
        transition: transform 120ms ease-out, box-shadow 120ms ease-out;
        box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        min-height: 80px;
    }

    .category-card:hover {
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        transform: translateY(-1px);
    }

    .category-card:active {
        --pressScale: 0.995;
        box-shadow: 0 1px 6px rgba(0,0,0,0.12);
    }

    .category-card.deleting {
        opacity: 0.6;
        pointer-events: none;
    }

    .category-card-icon {
        width: 56px;
        height: 56px;
        background: var(--color-fill-secondary);
        border-radius: var(--radius-lg);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;
        flex-shrink: 0;
        transition: background 0.2s ease;
    }

    .category-card:hover .category-card-icon {
        background: var(--color-fill-tertiary);
    }

    .category-card-details {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .category-card-name {
        font-size: var(--font-size-body);
        font-weight: var(--font-weight-semibold);
        margin: 0;
        color: var(--color-text-primary);
        line-height: 1.4;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .category-card-meta {
        font-size: var(--font-size-caption);
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
    }

    .category-favorite {
        color: var(--color-orange, #f39c12);
        font-weight: var(--font-weight-medium);
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .category-status {
        color: var(--color-text-secondary);
    }

    .category-card-actions {
        display: flex;
        gap: var(--spacing-xs);
        flex-shrink: 0;
    }

    .action-button {
        background: transparent;
        border: none;
        width: 36px;
        height: 36px;
        border-radius: var(--radius-md);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.15s ease;
        color: var(--color-text-tertiary);
    }

    .edit-button:hover {
        background: var(--color-fill-tertiary);
        color: var(--color-blue, #3498db);
        transform: scale(1.05);
    }

    .delete-button:hover:not(:disabled) {
        background: rgba(255, 59, 48, 0.1);
        color: var(--color-red, #e74c3c);
        transform: scale(1.05);
    }

    .action-button:active {
        transform: scale(0.95);
    }

    .action-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
    }

    .action-button:disabled:hover {
        background: transparent;
        transform: none;
    }

    /* ===== ESTILOS PARA ESTADOS DE CARGA Y ERROR ===== */
    .loading-message, 
    .error-message, 
    .empty-message { 
        text-align: center; 
        padding: var(--spacing-xl);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--spacing-sm);
    }

    .empty-message h3 {
        margin: 0;
        color: var(--color-text-primary);
        font-size: var(--font-size-title);
    }

    .empty-message p {
        margin: 0;
        color: var(--color-text-secondary);
        font-size: var(--font-size-body);
    }

    .empty-icon,
    .error-icon {
        font-size: 3em;
        opacity: 0.7;
    }

    .spinner {
        width: 2em; 
        height: 2em; 
        animation: spin 1.2s linear infinite; 
        display: inline-block;
    }

    .spinner.small {
        width: 1em;
        height: 1em;
    }

    .spinner .path {
        stroke: var(--color-primary, #3498db);
        stroke-linecap: round; 
        stroke-width: 4; 
        fill: none;
        stroke-dasharray: 90, 150; 
        stroke-dashoffset: 0;
        animation: dash 1.5s ease-in-out infinite;
    }

    .loading-spinner {
        font-size: 16px;
        animation: spin 1s linear infinite;
    }

    @keyframes spin { 
        100% { transform: rotate(360deg); } 
    }

    @keyframes dash {
        0% { 
            stroke-dasharray: 1, 150; 
            stroke-dashoffset: 0; 
        }
        50% { 
            stroke-dasharray: 90, 150; 
            stroke-dashoffset: -35; 
        }
        100% { 
            stroke-dasharray: 90, 150; 
            stroke-dashoffset: -124; 
        }
    }

    .feedback {
        position: fixed; 
        bottom: 2rem; 
        left: 50%; 
        transform: translateX(-50%);
        padding: var(--spacing-sm) var(--spacing-lg); 
        border-radius: var(--radius-md);
        font-size: var(--font-size-body); 
        z-index: 1000;
        background: var(--color-bg-secondary); 
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        min-width: 200px;
        max-width: 400px;
    }

    .feedback.success { 
        color: var(--color-green, #27ae60); 
        border: 1px solid var(--color-green, #27ae60); 
    }

    .feedback.error { 
        color: var(--color-red, #e74c3c); 
        border: 1px solid var(--color-red, #e74c3c); 
    }

    .feedback-icon {
        font-size: 1.2em;
    }

    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
    }

    /* ===== RESPONSIVE DESIGN ===== */
    @media (max-width: 768px) {
        .category-manager {
            padding: var(--spacing-sm);
        }

        .category-grid {
            grid-template-columns: 1fr;
            gap: var(--spacing-sm);
        }
        
        .category-card {
            padding: var(--spacing-md);
            gap: var(--spacing-sm);
            min-height: 70px;
        }
        
        .category-card-icon {
            width: 48px;
            height: 48px;
            font-size: 24px;
        }
        
        .action-button {
            width: 32px;
            height: 32px;
        }
        
        .action-button svg {
            width: 16px;
            height: 16px;
        }

        .page-title {
            font-size: var(--font-size-title);
        }

        .feedback {
            left: var(--spacing-sm);
            right: var(--spacing-sm);
            transform: none;
            max-width: none;
        }
    }

    @media (max-width: 480px) {
        .category-card {
            padding: var(--spacing-sm);
            gap: 10px;
        }
        
        .category-card-icon {
            width: 44px;
            height: 44px;
            font-size: 20px;
        }
    }

    /* Large screens */
    @media (min-width: 1200px) {
        .category-grid {
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
        }
    }
</style>