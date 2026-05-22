<script lang="ts">
    import { fly, fade } from 'svelte/transition';
    import { toastStore } from '$lib/stores/toast';

    // Los errores son críticos para el usuario: deben anunciarse con
    // `assertive` para que VoiceOver los interrumpa. Info/éxito usan `polite`.
    const hasError = $derived($toastStore.some((t) => t.variant === 'error'));
</script>

<div
    class="toast-host"
    role="region"
    aria-label="Notificaciones"
    aria-live={hasError ? 'assertive' : 'polite'}
>
    {#each $toastStore as toast (toast.id)}
        <button
            type="button"
            class="toast {toast.variant}"
            in:fly={{ y: 24, duration: 220 }}
            out:fade={{ duration: 180 }}
            onclick={() => toastStore.dismiss(toast.id)}
        >
            <span class="toast-message">{toast.message}</span>
        </button>
    {/each}
</div>

<style>
    .toast-host {
        position: fixed;
        left: 50%;
        bottom: calc(max(var(--safe-area-inset-bottom), 12px) + 76px + var(--spacing-sm));
        transform: translateX(-50%);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--spacing-xs);
        z-index: 2000;
        pointer-events: none;
        width: min(420px, calc(100% - 32px));
    }

    .toast {
        pointer-events: auto;
        background: var(--color-bg-secondary);
        color: var(--color-text-primary);
        border: 1px solid var(--color-separator);
        border-radius: 14px;
        padding: var(--spacing-sm) var(--spacing-md);
        font-size: var(--font-size-body);
        font-weight: var(--font-weight-medium);
        box-shadow: 0 12px 32px -8px rgba(0, 0, 0, 0.25);
        backdrop-filter: blur(16px) saturate(160%);
        -webkit-backdrop-filter: blur(16px) saturate(160%);
        max-width: 100%;
        width: 100%;
        text-align: center;
        cursor: pointer;
    }

    .toast.success {
        border-color: color-mix(in oklab, var(--color-green, #34c759) 60%, transparent);
        color: var(--color-green, #34c759);
    }

    .toast.error {
        border-color: color-mix(in oklab, var(--color-red, #ff3b30) 60%, transparent);
        color: var(--color-red, #ff3b30);
    }

    .toast-message {
        display: block;
    }
</style>
