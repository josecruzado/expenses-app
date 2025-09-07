<script lang="ts">
    import Header from "./Header.svelte";
    import PWAManager from "$lib/components/PWAManager.svelte";
    import SplashScreen from "$lib/components/SplashScreen.svelte";
    import Login from "$lib/components/Login.svelte";
    import "../app.css";

    // Import Dynamic Island integration
    import { onMount, onDestroy } from "svelte";
    import { browser } from "$app/environment";
    import { authStore, initAuthListener } from "$lib/stores/auth";

    import DynamicIsland from "$lib/components/DynamicIsland.svelte";
    import { categoriaService } from "$lib/services/categoriaService";
    import { gastosService } from "$lib/services/gastosService";

    let { children } = $props();
    let unsubscribeAuth: (() => void) | null = null;
    let authStoreUnsubscribe: (() => void) | null = null;

    onMount(async () => {
        if (browser) {
            // Marca la plataforma en <html> para estilos condicionales
            const ua = navigator.userAgent || navigator.vendor || "";
            if (/iPad|iPhone|iPod/.test(ua)) {
                document.documentElement.classList.add("is-ios");
            } else if (/Android/i.test(ua)) {
                document.documentElement.classList.add("is-android");
            }
            // Initialize Firebase Auth listener
            unsubscribeAuth = initAuthListener();

            // CAMBIO: Suscribirse a los cambios de autenticación para manejar los datos
            authStoreUnsubscribe = authStore.subscribe(($authStore) => {
                if ($authStore.user && $authStore.initialized) {
                    // Usuario autenticado: suscribirse a los datos
                    console.log("Usuario autenticado, suscribiendo a datos...");
                    categoriaService.subscribeToCategorias();
                    gastosService.subscribeToGastos();
                } else if ($authStore.initialized && !$authStore.user) {
                    // Usuario no autenticado: limpiar suscripciones
                    console.log(
                        "Usuario no autenticado, limpiando suscripciones...",
                    );
                    gastosService.unsubscribeFromGastos();
                    categoriaService.unsubscribeFromCategorias();
                }
            });

            // Initialize Dynamic Island integration
            await import("$lib/dynamic-island");
        }
    });

    onDestroy(() => {
        // CAMBIO: Limpiar todas las suscripciones al destruir el layout
        if (unsubscribeAuth) {
            unsubscribeAuth();
        }
        if (authStoreUnsubscribe) {
            authStoreUnsubscribe();
        }
        // Limpieza final por si acaso
        gastosService.unsubscribeFromGastos();
        categoriaService.unsubscribeFromCategorias();
    });
</script>

<DynamicIsland />
<PWAManager />

{#if !$authStore.initialized || $authStore.loading}
    <SplashScreen />
{:else if !$authStore.user}
    <Login />
{:else}
    <div class="app">
        <Header />
        <main>
            {@render children()}
        </main>
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
        /* Hacemos que SOLO el área principal sea la que tenga scroll */
        overflow-y: auto;
        -webkit-overflow-scrolling: touch; /* Scroll suave en iOS */
        padding: var(--spacing-lg);

        /* Padding para las 'safe areas' de iOS (notch, etc.) */
        padding-left: max(var(--safe-area-inset-left), var(--spacing-lg));
        padding-right: max(var(--safe-area-inset-right), var(--spacing-lg));
        padding-bottom: max(var(--safe-area-inset-bottom), var(--spacing-lg));
    }

    /* Ajustes para pantallas grandes */
    @media (min-width: 768px) {
        main {
            padding: var(--spacing-xl);
            padding-left: max(var(--safe-area-inset-left), var(--spacing-xl));
            padding-right: max(var(--safe-area-inset-right), var(--spacing-xl));
            padding-bottom: max(
                var(--safe-area-inset-bottom),
                var(--spacing-xl)
            );
        }
    }
</style>
