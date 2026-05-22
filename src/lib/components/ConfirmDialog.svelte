<script lang="ts">
    import { onMount } from 'svelte';
    import { fly } from 'svelte/transition';

    type Variant = 'danger' | 'default';

    interface Props {
        title?: string;
        message?: string;
        confirmLabel?: string;
        cancelLabel?: string;
        variant?: Variant;
        busy?: boolean;
        onconfirm?: () => void;
        oncancel?: () => void;
    }

    let {
        title = '¿Confirmar?',
        message = '',
        confirmLabel = 'Confirmar',
        cancelLabel = 'Cancelar',
        variant = 'default',
        busy = false,
        onconfirm,
        oncancel
    }: Props = $props();

    let dialogElement = $state<HTMLDialogElement | null>(null);
    let cancelButton = $state<HTMLButtonElement | null>(null);
    // El onclose nativo del <dialog> se dispara tanto al cerrar con ESC como
    // tras nuestra propia llamada a close(). Esta bandera evita disparar
    // oncancel dos veces.
    let dismissed = false;

    onMount(() => {
        dialogElement?.showModal();
        // Foco inicial en la acción segura (Cancelar) — patrón iOS Alert.
        cancelButton?.focus({ preventScroll: true });
    });

    function close() {
        if (dialogElement?.open) dialogElement.close();
    }

    function handleConfirm() {
        if (busy) return;
        onconfirm?.();
    }

    function handleCancel() {
        if (busy || dismissed) return;
        dismissed = true;
        close();
        oncancel?.();
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') handleCancel();
    }

    function handleBackdropClick(e: MouseEvent) {
        if (e.target === dialogElement) handleCancel();
    }
</script>

<svelte:window onkeydown={handleKeydown} />

<dialog
    bind:this={dialogElement}
    onclose={handleCancel}
    onclick={handleBackdropClick}
    class="confirm-modal"
    aria-labelledby="confirm-title"
    aria-describedby={message ? 'confirm-message' : undefined}
>
    <div class="confirm-card" transition:fly={{ y: 12, duration: 200 }}>
        <h2 id="confirm-title" class="confirm-title">{title}</h2>
        {#if message}
            <p id="confirm-message" class="confirm-message">{message}</p>
        {/if}

        <div class="confirm-actions">
            <button
                type="button"
                class="btn btn-secondary"
                bind:this={cancelButton}
                onclick={handleCancel}
                disabled={busy}
            >
                {cancelLabel}
            </button>
            <button
                type="button"
                class="btn"
                class:btn-danger={variant === 'danger'}
                class:btn-primary={variant !== 'danger'}
                onclick={handleConfirm}
                disabled={busy}
            >
                {#if busy}
                    <span class="spinner" aria-hidden="true"></span>
                {/if}
                {confirmLabel}
            </button>
        </div>
    </div>
</dialog>

<style>
    /* Centrado EXPLÍCITO — ver nota en AddExpenseModal. */
    .confirm-modal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        margin: 0;
        border: none;
        padding: 0;
        background: transparent;
        max-width: min(360px, calc(100vw - 32px));
        width: 100%;
        max-height: calc(
            100dvh - var(--safe-area-inset-top) - var(--safe-area-inset-bottom) -
                24px
        );
        border-radius: 18px;
        overflow: visible;
    }

    .confirm-modal::backdrop {
        background: rgba(0, 0, 0, 0.45);
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
    }

    .confirm-card {
        background: var(--color-bg-primary);
        border: 1px solid var(--color-separator);
        border-radius: 18px;
        padding: var(--spacing-lg);
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md);
    }

    .confirm-title {
        margin: 0;
        font-size: var(--font-size-headline);
        font-weight: var(--font-weight-bold);
        color: var(--color-text-primary);
    }

    .confirm-message {
        margin: 0;
        color: var(--color-text-secondary);
        font-size: var(--font-size-body);
        line-height: 1.4;
        white-space: pre-line;
    }

    .confirm-actions {
        display: flex;
        gap: var(--spacing-sm);
        margin-top: var(--spacing-xs);
    }

    .btn {
        flex: 1;
        min-height: 48px;
        padding: 0 var(--spacing-md);
        border-radius: 12px;
        border: none;
        font-size: var(--font-size-body);
        font-weight: var(--font-weight-semibold);
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        -webkit-tap-highlight-color: transparent;
    }

    .btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .btn-secondary {
        background: var(--color-fill-secondary);
        color: var(--color-text-primary);
    }

    .btn-primary {
        background: var(--color-blue);
        color: white;
    }

    .btn-danger {
        background: var(--color-red);
        color: white;
    }

    .spinner {
        width: 14px;
        height: 14px;
        border: 2px solid rgba(255, 255, 255, 0.4);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 0.9s linear infinite;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .spinner {
            animation-duration: 1.6s;
        }
    }
</style>
