<script lang="ts">
    import { onMount, untrack } from 'svelte';
    import { categoriaService } from '$lib/services/categoriaService.ts';
    import { fly } from 'svelte/transition';
    import type { Categoria } from '$lib/types';

    interface Props {
        category?: Categoria | null;
        onclose?: (result: { success: boolean }) => void;
    }

    let { category = null, onclose }: Props = $props();

    // El padre recrea el modal por cada categoría (via {#if}) — se captura el
    // valor inicial intencionalmente. `untrack` evita el warning del compilador.
    const initialCategory = untrack(() => category);
    const isCreate = !initialCategory;

    let editedName = $state(initialCategory?.name || '');
    let editedIcon = $state(initialCategory?.icon || '✨');
    let editedIsFavorite = $state(initialCategory?.isFavorite || false);
    let sending = $state(false);
    let errorMsg = $state<string | null>(null);

    const suggestedEmojis = ['🍔', '💰', '🛍️', '🚗', '🏠', '📄', '🎉', '🐾', '🧘', '📚', '🎮', '💊', '✈️', '👶'];

    let dialogElement = $state<HTMLDialogElement | null>(null);
    let nameInput = $state<HTMLInputElement | null>(null);

    onMount(() => {
        dialogElement?.showModal();
        nameInput?.focus({ preventScroll: true });
    });

    function close(success = false) {
        if (dialogElement?.open) dialogElement.close();
        onclose?.({ success });
    }

    function selectEmoji(emoji: string) {
        editedIcon = emoji;
    }

    async function handleSubmit(e: SubmitEvent) {
        e.preventDefault();
        if (!editedName.trim()) {
            errorMsg = 'El nombre de la categoría no puede estar vacío.';
            return;
        }
        if (sending) return;
        sending = true;
        errorMsg = null;

        try {
            if (isCreate) {
                await categoriaService.addCategoria({
                    name: editedName,
                    icon: editedIcon,
                    isFavorite: editedIsFavorite
                });
            } else if (initialCategory) {
                await categoriaService.updateCategoria(initialCategory.id, {
                    name: editedName,
                    icon: editedIcon,
                    isFavorite: editedIsFavorite
                });
            }
            close(true);
        } catch (err) {
            console.error('Save failed:', err);
            errorMsg = isCreate
                ? 'Error al crear la categoría. Inténtalo de nuevo.'
                : 'Error al actualizar la categoría. Inténtalo de nuevo.';
        } finally {
            sending = false;
        }
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') close(false);
    }

    function handleBackdropClick(e: MouseEvent) {
        if (e.target === dialogElement) close(false);
    }
</script>

<svelte:window onkeydown={handleKeydown} />

<dialog
    bind:this={dialogElement}
    onclose={() => close(false)}
    onclick={handleBackdropClick}
    class="modal"
    aria-labelledby="category-modal-title"
>
    <div class="modal-content">
        <div class="modal-header">
            <h2 id="category-modal-title">{isCreate ? 'Crear Categoría' : 'Editar Categoría'}</h2>
            <button type="button" onclick={() => close(false)} class="close-button" aria-label="Cerrar">×</button>
        </div>

        <form onsubmit={handleSubmit} class="edit-form">
            <label for="category-name">Nombre</label>
            <input
                type="text"
                id="category-name"
                name="name"
                bind:value={editedName}
                bind:this={nameInput}
                class="input-field"
                placeholder="Nombre de la categoría"
                disabled={sending}
                autocomplete="off"
                autocapitalize="sentences"
                enterkeyhint="done"
                required
            />

            <label for="category-icon">Icono</label>
            <input
                type="text"
                id="category-icon"
                bind:value={editedIcon}
                class="input-field icon-field"
                placeholder="🍔"
                maxlength="2"
                disabled={sending}
                autocomplete="off"
                required
            />
            <div class="emoji-list" role="radiogroup" aria-label="Elegir un emoji">
                {#each suggestedEmojis as emoji}
                    <button
                        type="button"
                        class="emoji-btn"
                        role="radio"
                        aria-checked={editedIcon === emoji}
                        aria-label={`Usar ${emoji}`}
                        onclick={() => selectEmoji(emoji)}
                        disabled={sending}
                    >{emoji}</button>
                {/each}
            </div>

            <label class="favorite-label">
                <input type="checkbox" bind:checked={editedIsFavorite} disabled={sending} />
                Marcar como favorita
            </label>

            {#if errorMsg}
                <div class="error-message" role="alert" transition:fly={{ y: 10, duration: 200 }}>
                    {errorMsg}
                </div>
            {/if}

            <button type="submit" class="btn btn-primary" disabled={sending}>
                {#if sending}
                    <span class="spinner" aria-hidden="true"></span>
                    {isCreate ? 'Creando…' : 'Guardando…'}
                {:else}
                    {isCreate ? 'Crear categoría' : 'Guardar cambios'}
                {/if}
            </button>
        </form>
    </div>
</dialog>

<style>
    /* Centrado EXPLÍCITO — ver nota en AddExpenseModal. El default UA de
       :modal falla en iOS Safari standalone con altura intrínseca + width:100%. */
    .modal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        margin: 0;
        border: none;
        padding: 0;
        background: transparent;
        max-width: min(400px, calc(100vw - 32px));
        width: 100%;
        max-height: calc(
            100dvh - var(--safe-area-inset-top) - var(--safe-area-inset-bottom) -
                24px
        );
        border-radius: var(--radius-lg);
        box-shadow: 0 0 0 1px rgba(0,0,0,0.05), 0 10px 30px -5px rgba(0,0,0,0.3);
        overflow: visible;
    }
    .modal::backdrop {
        background-color: rgba(0, 0, 0, 0.45);
        backdrop-filter: blur(24px) saturate(180%);
        -webkit-backdrop-filter: blur(24px) saturate(180%);
    }
    .modal-content {
        background: var(--color-bg-primary);
        padding: var(--spacing-xl);
        border-radius: var(--radius-lg);
        width: 100%;
        max-height: inherit;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        overscroll-behavior: contain;
        box-sizing: border-box;
        border: 1px solid var(--color-separator, rgba(255, 255, 255, 0.1));
    }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-md);}
    .close-button { background: none; border: none; font-size: 1.7em; color: var(--color-text-secondary); cursor: pointer;}
    .edit-form { display: flex; flex-direction: column; gap: var(--spacing-sm);}
    label { font-size: var(--font-size-callout); font-weight: var(--font-weight-medium); color: var(--color-text-secondary);}
    .input-field { padding: var(--spacing-sm) var(--spacing-md); border: 1px solid var(--color-separator); border-radius: var(--radius-md); background: var(--color-fill-secondary); color: var(--color-text-primary); font-size: var(--font-size-body);}
    .input-field:focus { outline: none; border-color: var(--color-blue);}
    .icon-field { width: 60px; text-align: center;}
    .emoji-list { display: flex; gap: 4px; margin: 6px 0 12px 0; flex-wrap: wrap;}
    .emoji-btn {
        font-size: 1.3em; background: none; border: 1px solid var(--color-separator);
        border-radius: var(--radius-md); cursor: pointer; padding: 2px 7px;
        transition: background 0.15s, border-color 0.15s;
    }
    .emoji-btn[aria-checked="true"] {
        background: var(--color-fill-secondary); border-color: var(--color-blue);
        outline: 2px solid var(--color-blue);
    }
    .emoji-btn:disabled { opacity: 0.5; cursor: not-allowed;}
    .favorite-label { display: flex; align-items: center; font-size: var(--font-size-body);}
    .btn{
        padding: var(--spacing-md) var(--spacing-md); font-size: var(--font-size-body);
        border-radius: var(--radius-md);
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
    }
    .btn-primary {
        background-color: var(--color-blue);
        color: white;
    }
    .btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
    .error-message { color: red; background: #ffeaea; padding: 0.5em 1em; border-radius: var(--radius-md); margin-bottom: 0.5em;}
    .spinner { display: inline-block; width: 1em; height: 1em; vertical-align: middle; border: 2px solid rgba(255,255,255,0.4); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite;}
    @keyframes spin { 100% { transform: rotate(360deg); } }
</style>