<script lang="ts">
    import { createEventDispatcher, onMount } from 'svelte';
    import { categoriaService, type Categoria } from '$lib/services/categoriaService.ts';
    import { fly } from 'svelte/transition';

    // Propiedades del componente
    export let category: Categoria | null = null;
    
    // Lógica para determinar si el modal es para crear o editar
    const isCreate = !category;

    // Estado interno del formulario, inicializado directamente
    let editedName: string = category?.name || '';
    let editedIcon: string = category?.icon || '✨';
    let editedIsFavorite: boolean = category?.isFavorite || false;
    let sending = false;
    let errorMsg: string | null = null;

    const dispatch = createEventDispatcher();
    const suggestedEmojis = ["🍔","💰","🛍️","🚗","🏠","📄","🎉","🐾","🧘","📚","🎮","💊","✈️","👶"];

    // Referencias a elementos del DOM
    let dialogElement: HTMLDialogElement;
    let nameInput: HTMLInputElement;

    onMount(() => {
        // Mostrar el modal y enfocar el input al montar el componente
        dialogElement?.showModal();
        nameInput?.focus();
    });

    function handleClose(): void {
        if (dialogElement?.open) {
            dialogElement.close();
        }
        dispatch('close');
    }

    function selectEmoji(emoji: string): void {
        editedIcon = emoji;
    }

    async function handleSaveCategory(): Promise<void> {
        if (!editedName.trim()) {
            errorMsg = 'El nombre de la categoría no puede estar vacío.';
            return;
        }
        
        if (sending) return;
        sending = true;
        errorMsg = null;

        try {
            if (isCreate) {
                await categoriaService.addCategoria(editedName, editedIcon, editedIsFavorite);
            } else if (category) {
                await categoriaService.updateCategoria(category.id, {
                    name: editedName,
                    icon: editedIcon,
                    isFavorite: editedIsFavorite,
                });
            }
            handleClose(); // Cierra el modal al guardar
        } catch (err) {
            console.error('Save failed:', err);
            errorMsg = isCreate
                ? 'Error al crear la categoría. Inténtalo de nuevo.'
                : 'Error al actualizar la categoría. Inténtalo de nuevo.';
        } finally {
            sending = false;
        }
    }

    // Manejar la tecla 'Escape' para cerrar el modal
    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            handleClose();
        }
    }
</script>

<svelte:window on:keydown={handleKeydown} />

<dialog bind:this={dialogElement} on:close={handleClose} on:click|self={handleClose} class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h2>{isCreate ? 'Crear Categoría' : 'Editar Categoría'}</h2>
            <button on:click={handleClose} class="close-button" aria-label="Cerrar">×</button>
        </div>
        
        <form on:submit|preventDefault={handleSaveCategory} class="edit-form">
            <label for="category-name">Nombre</label>
            <input
                type="text"
                id="category-name"
                bind:value={editedName}
                bind:this={nameInput}
                class="input-field"
                placeholder="Nombre de la categoría"
                disabled={sending}
                autocomplete="off"
                required
            />

            <label for="category-icon">Icono</label>
            <input
                type="text"
                id="category-icon"
                bind:value={editedIcon}
                class="input-field icon-field"
                placeholder="Icono (ej: 🍔)"
                maxlength="2"
                disabled={sending}
                autocomplete="off"
                required
            />
            <div class="emoji-list" aria-label="Elegir emoji">
                {#each suggestedEmojis as emoji}
                    <button type="button"
                        class="emoji-btn"
                        aria-label={"Seleccionar emoji " + emoji}
                        on:click={() => selectEmoji(emoji)}
                        disabled={sending}
                        aria-pressed={editedIcon === emoji}
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
                    {isCreate ? "Creando..." : "Guardando..."}
                {:else}
                    {isCreate ? "Crear categoría" : "Guardar cambios"}
                {/if}
            </button>
        </form>
    </div>
</dialog>

<style>
    .modal {
        border: none;
        padding: 0;
        background: transparent;
        max-width: 400px;
        width: 90%;
        border-radius: var(--radius-lg);
        box-shadow: 0 0 0 1px rgba(0,0,0,0.05), 0 10px 30px -5px rgba(0,0,0,0.3);
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
    }
    .modal::backdrop {
        background-color: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
    }
    .modal-content { background: var(--color-bg-primary); padding: var(--spacing-xl); border-radius: var(--radius-lg); width: 100%; box-sizing: border-box;         border: 1px solid var(--color-separator, rgba(255, 255, 255, 0.1));}
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
    .emoji-btn[aria-pressed="true"] {
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