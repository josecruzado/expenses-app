<script lang="ts">
    import Header from "./Header.svelte";
    import PWAManager from "$lib/components/PWAManager.svelte";
    import SplashScreen from "$lib/components/SplashScreen.svelte";
    import TabBar from "$lib/components/TabBar.svelte";
    import Login from "$lib/components/Login.svelte";
    import ToastHost from "$lib/components/ToastHost.svelte";
    import "../app.css";

    import { onMount, onDestroy } from "svelte";
    import { fade } from "svelte/transition";
    import { browser } from "$app/environment";
    import { onNavigate } from "$app/navigation";
    import { authStore, initAuthListener } from "$lib/stores/auth";
    import { categoriaService } from "$lib/services/categoriaService";
    import { gastosService } from "$lib/services/gastosService";

    const SPLASH_MIN_MS = 600;

    let { children } = $props();
    let unsubscribeAuth: (() => void) | null = null;
    let authStoreUnsubscribe: (() => void) | null = null;
    let splashMinElapsed = $state(false);

    // Splash stays up while auth resolves AND for at least SPLASH_MIN_MS,
    // to avoid a sub-second flash when auth resolves instantly.
    let showSplash = $derived(
        !$authStore.initialized || $authStore.loading || !splashMinElapsed,
    );

    let dynamicIslandCleanup: (() => void) | null = null;
    const reducedMotion =
        browser && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // iOS-native-feel transitions between routes via la View Transitions API.
    onNavigate((navigation) => {
        if (!browser || reducedMotion || !("startViewTransition" in document)) return;
        return new Promise((resolve) => {
            (document as any).startViewTransition(async () => {
                resolve();
                await navigation.complete;
            });
        });
    });

    onMount(async () => {
        if (!browser) return;

        // Marca la plataforma en <html> para estilos condicionales
        const ua = navigator.userAgent || navigator.vendor || "";
        if (/iPad|iPhone|iPod/.test(ua)) {
            document.documentElement.classList.add("is-ios");
        } else if (/Android/i.test(ua)) {
            document.documentElement.classList.add("is-android");
        }

        setTimeout(() => (splashMinElapsed = true), SPLASH_MIN_MS);

        unsubscribeAuth = initAuthListener();

        authStoreUnsubscribe = authStore.subscribe(($authStore) => {
            if ($authStore.user && $authStore.initialized) {
                categoriaService.subscribeToCategorias();
                gastosService.subscribeToGastos();
            } else if ($authStore.initialized && !$authStore.user) {
                gastosService.unsubscribeFromGastos();
                categoriaService.unsubscribeFromCategorias();
            }
        });

        const { setupDynamicIsland } = await import("$lib/dynamic-island");
        dynamicIslandCleanup = setupDynamicIsland();
    });

    onDestroy(() => {
        unsubscribeAuth?.();
        authStoreUnsubscribe?.();
        dynamicIslandCleanup?.();
        gastosService.unsubscribeFromGastos();
        categoriaService.unsubscribeFromCategorias();
    });
</script>

<PWAManager />
<ToastHost />

{#if showSplash}
    <div out:fade={{ duration: 300 }}>
        <SplashScreen />
    </div>
{:else if !$authStore.user}
    <Login />
{:else}
    <div class="app">
        <Header />
        <main>
            {@render children()}
        </main>
        <TabBar />
    </div>
{/if}

<style>
    .app {
        display: grid;
        /* Fila 1 (Header) toma su altura natural. Fila 2 (main) toma el resto del espacio. */
        grid-template-rows: auto 1fr;
        min-height: 100vh; /* fallback */
        min-height: 100dvh; /* correcto en móviles/PWA */
        background-color: var(--color-bg-primary);
    }

    main {
        /* Patrón Apple HIG / iOS 26 Liquid Glass:
           - El TabBar flotante overlay-ea el contenido (content scrolls
             BEHIND the bar, that's the point of the glass material).
           - Pero el scrollable necesita padding-bottom = safe-area +
             pill height para que el último item NO quede permanentemente
             cubierto. Sí queda detrás durante scroll medio (cristal vivo)
             y queda arriba del bar al llegar al final del scroll.
           Refs: Apple HIG TabBar guidance, WWDC25 “Build a UIKit app”. */
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        padding-top: var(--spacing-lg);
        padding-left: max(var(--safe-area-inset-left), var(--spacing-lg));
        padding-right: max(var(--safe-area-inset-right), var(--spacing-lg));
        padding-bottom: calc(
            max(var(--safe-area-inset-bottom), 12px) + 64px +
                var(--spacing-md)
        );
        view-transition-name: site-main;

        scroll-padding-bottom: calc(
            max(var(--safe-area-inset-bottom), 12px) + 76px
        );
    }

    @media (min-width: 768px) {
        main {
            padding-top: var(--spacing-xl);
            padding-left: max(var(--safe-area-inset-left), var(--spacing-xl));
            padding-right: max(var(--safe-area-inset-right), var(--spacing-xl));
            padding-bottom: calc(
                max(var(--safe-area-inset-bottom), 12px) + 64px +
                    var(--spacing-lg)
            );
        }
    }
</style>
