<script lang="ts">
    import { createEventDispatcher, onMount } from 'svelte';

    const dispatch = createEventDispatcher();

    let amount: number | null = null;
    let category = 'comida';
    let dateTime = new Date().toISOString().slice(0, 16); // formato datetime-local
    let notes = '';
    let formError: string | null = null;
    let isSaving = false;

    const categories = [
        { id: 'comida', name: 'Comida' },
        { id: 'transporte', name: 'Transporte' },
        { id: 'salud', name: 'Salud' },
        { id: 'entretenimiento', name: 'Entretenimiento' },
        { id: 'hogar', name: 'Hogar' },
        { id: 'otros', name: 'Otros' }
    ];

    let dialogElement: HTMLDialogElement;
    let amountInput: HTMLInputElement;

    // Variables para gesture
    let startY: number | null = null;
    let currentY = 0;
    let isDragging = false;

    onMount(() => {
        dialogElement.showModal();
        amountInput?.focus();
    });

    function handleClose() {
        dialogElement.close();
        dispatch('close');
    }

    async function handleSubmit() {
        if (!amount || amount <= 0) {
            formError = 'Ingresa un monto válido.';
            return;
        }
        if (!category) {
            formError = 'Selecciona una categoría.';
            return;
        }
        formError = null;
        isSaving = true;

        dispatch('save', {
            monto: amount,
            categoria: category,
            fecha: new Date(dateTime),
            nota: notes
        });
    }

    // Gestos para cerrar con swipe
    function handleTouchStart(e: TouchEvent) {
        startY = e.touches[0].clientY;
        isDragging = true;
    }

    function handleTouchMove(e: TouchEvent) {
        if (!isDragging || startY === null) return;
        currentY = e.touches[0].clientY - startY;
        if (currentY > 0) {
            dialogElement.style.transform = `translateY(${currentY}px)`;
            dialogElement.style.transition = 'none';
        }
    }

    function handleTouchEnd() {
        if (!isDragging) return;
        isDragging = false;
        if (currentY > 100) {
            handleClose();
        } else {
            dialogElement.style.transform = '';
            dialogElement.style.transition = 'transform 0.2s ease-out';
        }
        startY = null;
        currentY = 0;
    }
</script>

<dialog
    bind:this={dialogElement}
    on:close={handleClose}
    on:click|self={handleClose}
    class="ios-modal"
    on:touchstart={handleTouchStart}
    on:touchmove={handleTouchMove}
    on:touchend={handleTouchEnd}
>
    <div class="drag-indicator"></div>
    <h2 id="modal-title">Nuevo Gasto</h2>

    <form on:submit|preventDefault={handleSubmit}>
        <div class="form-group">
            <label for="amount">Monto</label>
            <input
                type="number"
                id="amount"
                bind:value={amount}
                placeholder="0.00"
                step="0.01"
                inputmode="decimal"
                required
                bind:this={amountInput}
            />
        </div>

        <div class="form-group">
            <label for="category">Categoría</label>
            <select id="category" bind:value={category} required>
                {#each categories as cat}
                    <option value={cat.id}>{cat.name}</option>
                {/each}
            </select>
        </div>

        <div class="form-group">
            <label for="date">Fecha y Hora</label>
            <input type="datetime-local" id="date" bind:value={dateTime} required />
        </div>

        <div class="form-group">
            <label for="notes">Notas (opcional)</label>
            <textarea id="notes" bind:value={notes} placeholder="Describe el gasto"></textarea>
        </div>

        {#if formError}
            <p class="error-message">{formError}</p>
        {/if}

        <div class="modal-actions">
            <button type="button" class="ios-secondary" on:click={handleClose} disabled={isSaving}>
                Cancelar
            </button>
            <button type="submit" class="ios-primary" disabled={isSaving}>
                {#if isSaving}Guardando...{:else}Guardar{/if}
            </button>
        </div>
    </form>
</dialog>

<style>
    :root {
        --primary-color: #007aff;
        --secondary-bg: #f2f2f7;
        --border-color: #ddd;
        --text-primary: #111;
        --text-secondary: #666;
        --error-color: #d93025;
    }

    @media (prefers-color-scheme: dark) {
        :root {
            --primary-color: #0a84ff;
            --secondary-bg: #1c1c1e;
            --border-color: #333;
            --text-primary: #f5f5f7;
            --text-secondary: #a1a1aa;
            --error-color: #ff453a;
        }
    }

    .ios-modal {
        background: var(--secondary-bg);
        padding: 1.5rem;
        border-radius: 20px;
        width: 92%;
        max-width: 420px;
        border: none;
        box-shadow: 0 15px 40px rgba(0,0,0,0.15);
        animation: fadeIn 0.25s ease-out;
        transition: transform 0.2s ease-out;
        touch-action: pan-y;
    }

    .ios-modal::backdrop {
        background: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(12px);
    }

    .drag-indicator {
        width: 36px;
        height: 5px;
        background: var(--border-color);
        border-radius: 3px;
        margin: 0 auto 1rem;
    }

    h2 {
        font-size: 1.25rem;
        font-weight: 600;
        margin-bottom: 1rem;
        text-align: center;
        color: var(--text-primary);
    }

    form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
    }

    label {
        font-size: 0.85rem;
        font-weight: 500;
        color: var(--text-secondary);
    }

    input, select, textarea {
        border-radius: 12px;
        border: 1px solid var(--border-color);
        padding: 0.75rem;
        font-size: 1rem;
        background: var(--secondary-bg);
        color: var(--text-primary);
        -webkit-appearance: none;
    }

    textarea {
        min-height: 80px;
        resize: vertical;
    }

    .error-message {
        color: var(--error-color);
        font-size: 0.85rem;
        text-align: center;
    }

    .modal-actions {
        display: flex;
        gap: 0.75rem;
        margin-top: 0.5rem;
    }

    .ios-primary {
        flex: 1;
        padding: 0.8rem;
        background: var(--primary-color);
        color: white;
        border: none;
        border-radius: 14px;
        font-weight: 600;
        font-size: 1rem;
    }

    .ios-secondary {
        flex: 1;
        padding: 0.8rem;
        background: var(--secondary-bg);
        color: var(--primary-color);
        border: none;
        border-radius: 14px;
        font-weight: 600;
        font-size: 1rem;
    }

    button:disabled {
        opacity: 0.6;
    }

    @keyframes fadeIn {
        from {
            transform: translateY(20px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
</style>
