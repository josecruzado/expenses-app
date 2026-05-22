<script lang="ts">
	import { page } from '$app/state';
	import { onMount, tick } from 'svelte';
	import { browser } from '$app/environment';
	import Home from 'lucide-svelte/icons/home';
	import Receipt from 'lucide-svelte/icons/receipt';
	import Settings from 'lucide-svelte/icons/settings';
	import LiquidGlass from './LiquidGlass.svelte';

	type Tab = {
		href: string;
		label: string;
		icon: typeof Home;
		badge?: boolean | number; // Nuevo: Soporte para notificaciones nativas
	};

	const tabs: Tab[] = [
		{ href: '/', label: 'Inicio', icon: Home },
		{ href: '/expenses', label: 'Gastos', icon: Receipt },
		{ href: '/settings', label: 'Ajustes', icon: Settings }
	];

	function handleTabClick(event: MouseEvent, href: string) {
		// UX Nativo: Si tocas el tab activo, scrollea suavemente hacia arriba
		if (page.url.pathname === href) {
			event.preventDefault();
			const mainContainer = document.querySelector('main');
			if (mainContainer) {
				mainContainer.scrollTo({ top: 0, behavior: 'smooth' });
			}
		}
	}

	const activeIndex = $derived.by(() => {
		const path = page.url.pathname;
		if (path === '/') return 0;
		if (path.startsWith('/expenses')) return 1;
		if (path.startsWith('/settings') || path.startsWith('/categories')) return 2;
		return -1;
	});

	// --- Indicator Logic ---
	let indicatorLeft = $state(0);
	let indicatorWidth = $state(0);
	let tabbarEl = $state<HTMLElement | null>(null);
	let itemEls = $state<Array<HTMLAnchorElement | null>>([]);
	let isReady = $state(false);

	async function updateIndicator(index: number) {
		if (!browser || !tabbarEl || index < 0) return;
		await tick(); // Aseguramos que el DOM esté sincronizado

		const activeEl = itemEls[index];
		if (!activeEl) return;

		const parentRect = tabbarEl.getBoundingClientRect();
		const activeRect = activeEl.getBoundingClientRect();

		indicatorLeft = activeRect.left - parentRect.left;
		indicatorWidth = activeRect.width;
		
		// Permitimos la animación CSS solo después de haber medido la primera vez
		if (!isReady) {
			requestAnimationFrame(() => isReady = true);
		}
	}

	$effect(() => {
		// Pasamos explícitamente activeIndex para que Svelte 5 rastree la dependencia limpiamente
		updateIndicator(activeIndex);
	});

	$effect(() => {
		if (browser && tabbarEl) {
			const ro = new ResizeObserver(() => updateIndicator(activeIndex));
			ro.observe(tabbarEl);
			return () => ro.disconnect();
		}
	});
</script>

<nav
	class="tabbar-shell"
	aria-label="Navegación principal"
>
	<LiquidGlass
		class="tabbar-glass"
		as="div"
		radius="9999px"
		bezelWidth={8}
		glassThickness={45}
		refractiveIndex={1.42}
		scaleRatio={0.7}
		blur={28}
		specularOpacity={0.8}
		specularSaturation={3}
		tint="var(--tab-bar-tint)"
		fallbackFilter="blur(36px) saturate(200%) brightness(1.12)"
	>
		<div class="tabbar-inner" bind:this={tabbarEl}>
			<div
				class="tabbar-indicator"
				aria-hidden="true"
				data-visible={activeIndex >= 0 ? 'true' : 'false'}
				data-ready={isReady ? 'true' : 'false'}
				style:--indicator-left={`${indicatorLeft}px`}
				style:--indicator-width={`${indicatorWidth}px`}
			></div>

			{#each tabs as tab, i (tab.href)}
				{@const active = i === activeIndex}
				<a
					bind:this={itemEls[i]}
					href={tab.href}
					onclick={(e) => handleTabClick(e, tab.href)}
					class="tabbar-item"
					class:active
					aria-current={active ? 'page' : undefined}
					aria-label={tab.label}
				>
					<span class="tabbar-icon" aria-hidden="true">
						<tab.icon size={24} strokeWidth={active ? 2.4 : 1.85} />
						{#if tab.badge}
							<span class="tabbar-badge" class:dot={tab.badge === true}>
								{typeof tab.badge === 'number' ? tab.badge : ''}
							</span>
						{/if}
					</span>
					<span class="tabbar-label">{tab.label}</span>
				</a>
			{/each}
		</div>
	</LiquidGlass>
</nav>

<style>
	.tabbar-shell {
		position: fixed;
		left: 0;
		right: 0;
		margin: 0 auto;
		bottom: calc(16px + env(safe-area-inset-bottom));
		z-index: 100;
		view-transition-name: site-tabbar;
		pointer-events: none; /* Let clicks pass through gaps */
		
		width: min(
			calc(100vw - 32px - env(safe-area-inset-left) - env(safe-area-inset-right)),
			360px
		);

		--tab-bar-tint: rgba(28, 28, 30, 0.75);
		
		will-change: width, transform;
		transition:
			width 320ms cubic-bezier(.25, 1, .3, 1),
			transform 320ms cubic-bezier(.25, 1, .3, 1),
			opacity 220ms ease;
	}

	/* Fix: Expande la caja de captura de la View Transition para que el navegador 
	   no recorte las sombras exteriores del cristal al cambiar de página. */
	.tabbar-shell::before {
		content: "";
		position: absolute;
		inset: -60px;
		pointer-events: none;
		z-index: -10;
	}

	@media (prefers-color-scheme: light) {
		.tabbar-shell {
			--tab-bar-tint: rgba(250, 250, 250, 0.85);
		}
	}

	/* Inner grid for LiquidGlass */
	:global(.tabbar-glass) {
		pointer-events: auto; /* Re-enable clicks on the pill itself */
		width: 100%;
		padding: 4px;
		margin: 0;
	}

	.tabbar-inner {
		position: relative;
		z-index: 1;
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0;
		width: 100%;
		border-radius: 9999px;
		
		/* Textura de ruido muy sutil para mejorar el frosted glass (sin alterar la luz) */
		background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E");
	}

	/* Indicator */
	.tabbar-indicator {
		position: absolute;
		top: 0;
		bottom: 0;
		left: var(--indicator-left, 0px);
		width: var(--indicator-width, 0px);
		z-index: 0;
		border-radius: 9999px;
		pointer-events: none;

		background: rgba(255, 255, 255, 0.12);
		box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1);

		/* Sin transición hasta que esté listo */
		transition: none;
		will-change: left, width;
	}

	.tabbar-indicator[data-ready='true'] {
		transition:
			left 320ms cubic-bezier(.25, 1, .3, 1.05),
			width 320ms cubic-bezier(.25, 1, .3, 1.05),
			opacity 180ms ease;
	}

	.tabbar-indicator[data-visible='false'] {
		opacity: 0;
	}

	@media (prefers-color-scheme: light) {
		.tabbar-indicator {
			background: rgba(0, 0, 0, 0.05);
			box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.04);
		}
	}

	@media (prefers-color-scheme: dark) {
		.tabbar-indicator {
			background: rgba(255, 255, 255, 0.14);
		}
	}

	/* Items */
	.tabbar-item {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		
		min-width: 0;
		height: 52px;
		padding: 6px 4px;

		color: rgba(160, 160, 160, 0.9);
		text-decoration: none;
		font-size: 10px;
		font-weight: var(--font-weight-medium);
		letter-spacing: 0.1px;

		-webkit-tap-highlight-color: transparent;
		user-select: none;
		touch-action: manipulation;

		transition:
			color 220ms ease;
	}

	.tabbar-item.active {
		color: #fff;
	}

	/* Accesibilidad (A11y): Soporte para navegación por teclado */
	.tabbar-item:focus-visible {
		outline: none;
	}
	.tabbar-item:focus-visible .tabbar-icon {
		outline: 2px solid var(--color-blue, #007aff);
		outline-offset: 4px;
		border-radius: 8px;
	}

	@media (prefers-color-scheme: light) {
		.tabbar-item {
			color: rgba(110, 110, 110, 0.9);
		}
		.tabbar-item.active {
			color: #000;
		}
	}

	.tabbar-icon {
		display: grid;
		place-items: center;
		transform: translateZ(0);
		position: relative;
	}

	.tabbar-badge {
		position: absolute;
		top: -2px;
		right: -8px;
		background: #ff3b30; /* Red iOS nativo */
		color: white;
		font-size: 10px;
		font-weight: 700;
		min-width: 16px;
		height: 16px;
		border-radius: 8px;
		display: grid;
		place-items: center;
		padding: 0 4px;
		/* Sombra para despegarlo del icono si se tocan */
		box-shadow: 0 0 0 2px var(--tab-bar-tint); 
		pointer-events: none;
	}

	.tabbar-badge.dot {
		min-width: unset;
		width: 8px;
		height: 8px;
		padding: 0;
		top: 0;
		right: -2px;
	}

	.tabbar-label {
		line-height: 1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 100%;
	}

	/* Slide off when the on-screen keyboard is up. */
	:global(body.keyboard-open) .tabbar-shell {
		transform: translateY(calc(100% + 32px));
		opacity: 0;
	}

	@media (prefers-reduced-motion: reduce) {
		.tabbar-shell,
		.tabbar-item,
		.tabbar-icon,
		.tabbar-label,
		.tabbar-indicator {
			transition: none !important;
			animation: none !important;
		}
	}

	/* Evitar duplicación de iconos y parpadeos transparentes (doble render) en la transición */
	:global(::view-transition-group(site-tabbar)) {
		animation: none !important;
	}
	:global(::view-transition-old(site-tabbar)) {
		display: none !important;
	}
	:global(::view-transition-new(site-tabbar)) {
		animation: none !important;
		opacity: 1 !important;
	}
</style>
