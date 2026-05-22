// Integración con el Dynamic Island / status bar de iOS.
// Sincroniza el meta theme-color con el modo claro/oscuro del sistema y
// expone una CSS var `--dynamic-island-color` para componentes que la usen.
//
// Se importa de forma lazy desde +layout.svelte; solo corre en el cliente.

const LIGHT = '#f2f2f7';
const DARK = '#000000';

function applyTheme(themeColorMeta: HTMLMetaElement | null) {
	const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
	const color = isDark ? DARK : LIGHT;
	themeColorMeta?.setAttribute('content', color);
	document.documentElement.style.setProperty('--dynamic-island-color', color);
}

export function setupDynamicIsland(): () => void {
	const themeColorMeta = document.querySelector(
		'meta[name="theme-color"]:not([media])'
	) as HTMLMetaElement | null;

	// Detección de iOS robusta — iPadOS 13+ reporta `MacIntel` con touch.
	const ua = navigator.userAgent || '';
	const isiPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
	const isIOS = (/iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream) || isiPadOS;
	if (isIOS) document.body.classList.add('ios-device');

	const update = () => applyTheme(themeColorMeta);

	const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
	const onSchemeChange = () => {
		update();
		document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
		setTimeout(() => {
			document.body.style.transition = '';
		}, 300);
	};
	darkModeQuery.addEventListener('change', onSchemeChange);

	let resizeTimer: ReturnType<typeof setTimeout> | null = null;
	const onResize = () => {
		if (resizeTimer) clearTimeout(resizeTimer);
		resizeTimer = setTimeout(update, 100);
	};
	window.addEventListener('resize', onResize);
	screen.orientation?.addEventListener('change', onResize);

	update();

	return () => {
		darkModeQuery.removeEventListener('change', onSchemeChange);
		window.removeEventListener('resize', onResize);
		screen.orientation?.removeEventListener('change', onResize);
		if (resizeTimer) clearTimeout(resizeTimer);
		if (isIOS) document.body.classList.remove('ios-device');
	};
}
