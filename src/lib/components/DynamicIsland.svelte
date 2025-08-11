<script lang="ts">
    import { onMount } from 'svelte';
    
    // onMount asegura que este código solo se ejecute en el navegador,
    // después de que el DOM esté listo.
    onMount(() => {
        // Obtener o crear meta tags necesarios
        let themeColorMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
        let statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]') as HTMLMetaElement;
        let viewportMeta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
        
        // Crear meta tags si no existen
        if (!themeColorMeta) {
            themeColorMeta = document.createElement('meta');
            themeColorMeta.name = 'theme-color';
            document.head.appendChild(themeColorMeta);
        }
        
        if (!statusBarMeta) {
            statusBarMeta = document.createElement('meta');
            statusBarMeta.name = 'apple-mobile-web-app-status-bar-style';
            document.head.appendChild(statusBarMeta);
        }

        // Optimizar viewport para iOS y Dynamic Island
        if (viewportMeta) {
            viewportMeta.setAttribute('content', 
                'width=device-width, initial-scale=1, user-scalable=no, viewport-fit=cover'
            );
        }
        
        // Detectar si es iOS
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS) {
            document.body.classList.add('ios-device');
        }

        const updateThemeColors = () => {
            const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
            
            // Colores que coinciden exactamente con iOS Dynamic Island
            const themeColor = isDarkMode ? '#000000' : '#f2f2f7';
            
            // Actualizar meta tags
            if (themeColorMeta) themeColorMeta.setAttribute('content', themeColor);
            if (statusBarMeta) statusBarMeta.setAttribute('content', 'black-translucent');
            
            // Actualizar CSS custom properties
            document.documentElement.style.setProperty('--dynamic-island-color', themeColor);
            
            console.log(`Theme updated: ${isDarkMode ? 'Dark' : 'Light'} mode`);
        };

        // Función para manejar safe areas (Dynamic Island)
        const handleSafeAreas = () => {
            const safeAreaTop = getComputedStyle(document.documentElement)
                .getPropertyValue('--safe-area-inset-top') || 'env(safe-area-inset-top)';
            
            // Asegurar safe area mínima para Dynamic Island
            if (!safeAreaTop || safeAreaTop === '0px') {
                document.documentElement.style.setProperty('--safe-area-inset-top', '47px');
            }
        };

        // Listener para cambios de tema del sistema
        const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleThemeChange = () => {
            updateThemeColors();
            // Transición suave para cambios de tema
            document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
            setTimeout(() => {
                document.body.style.transition = '';
            }, 300);
        };
        
        darkModeQuery.addEventListener('change', handleThemeChange);
        
        // Listener para cambios de orientación (iOS)
        let resizeTimer: ReturnType<typeof setTimeout>;
        const handleResize = () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                updateThemeColors();
                handleSafeAreas();
            }, 100);
        };
        
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);
        
        // Inicializar al montar
        updateThemeColors();
        handleSafeAreas();
        
        console.log('Dynamic Island integration initialized via Svelte component.');
        
        // onDestroy se ejecuta cuando el componente se destruye.
        // Es el lugar perfecto para la limpieza.
        return () => {
            darkModeQuery.removeEventListener('change', handleThemeChange);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
            clearTimeout(resizeTimer);
            
            if (isIOS) {
                document.body.classList.remove('ios-device');
            }
            
            console.log('Dynamic Island listeners cleaned up.');
        };
    });
</script>
