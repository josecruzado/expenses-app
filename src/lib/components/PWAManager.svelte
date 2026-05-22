<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import type { pwaManager as PwaManagerType } from '$lib/pwa';

	const IOS_HINT_KEY = 'ios-install-hint-dismissed-until';
	const IOS_HINT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

	let showInstallBanner = $state(false);
	let showUpdateBanner = $state(false);
	let showOfflineBanner = $state(false);
	let showIOSInstructions = $state(false);
	let isIOS = $state(false);
	let isInstalled = $state(false);

	// Solo se muestra un banner a la vez. Prioridad:
	// update > offline > install (Android/Chrome) > iOS A2HS hint.
	const visibleBanner = $derived.by<'update' | 'offline' | 'install' | 'ios' | null>(() => {
		if (showUpdateBanner) return 'update';
		if (showOfflineBanner) return 'offline';
		if (showInstallBanner && !isIOS) return 'install';
		if (showIOSInstructions) return 'ios';
		return null;
	});

	let manager: typeof PwaManagerType | null = null;
	let applyUpdate: (() => void) | null = null;
	let cleanups: Array<() => void> = [];

	function iosHintActive(): boolean {
		if (typeof localStorage === 'undefined') return true;
		const until = Number(localStorage.getItem(IOS_HINT_KEY) || 0);
		return !until || Date.now() > until;
	}

	onMount(async () => {
		if (!browser) return;

		const mod = await import('$lib/pwa');
		manager = mod.pwaManager;
		manager.init();

		isIOS = manager.isIOS;
		isInstalled = manager.isStandalone;

		showIOSInstructions = isIOS && !isInstalled && iosHintActive();

		if (manager.canInstall) showInstallBanner = true;

		const onInstallAvail = () => {
			showInstallBanner = true;
		};
		const onInstallDone = () => {
			showInstallBanner = false;
			showIOSInstructions = false;
			isInstalled = true;
			// Persiste el descarte en iOS: si reabre desde Safari tras
			// instalar, no le mostramos el banner de instalación otra vez.
			if (typeof localStorage !== 'undefined') {
				localStorage.setItem(IOS_HINT_KEY, String(Date.now() + IOS_HINT_TTL_MS));
			}
		};
		const onUpdate = (e: Event) => {
			const detail = (e as CustomEvent<{ apply: () => void }>).detail;
			applyUpdate = detail.apply;
			showUpdateBanner = true;
		};
		const onOffline = () => {
			showOfflineBanner = true;
		};
		const onOnline = () => {
			showOfflineBanner = false;
		};

		manager.addEventListener('install-available', onInstallAvail);
		manager.addEventListener('install-completed', onInstallDone);
		manager.addEventListener('update-available', onUpdate);
		manager.addEventListener('offline', onOffline);
		manager.addEventListener('online', onOnline);

		cleanups = [
			() => manager?.removeEventListener('install-available', onInstallAvail),
			() => manager?.removeEventListener('install-completed', onInstallDone),
			() => manager?.removeEventListener('update-available', onUpdate),
			() => manager?.removeEventListener('offline', onOffline),
			() => manager?.removeEventListener('online', onOnline)
		];
	});

	onDestroy(() => {
		cleanups.forEach((c) => c());
		cleanups = [];
	});

	async function installApp() {
		if (manager) await manager.installApp();
	}
	function dismissInstallBanner() {
		showInstallBanner = false;
	}
	function dismissOfflineBanner() {
		showOfflineBanner = false;
	}
	function dismissIOSInstructions() {
		showIOSInstructions = false;
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(IOS_HINT_KEY, String(Date.now() + IOS_HINT_TTL_MS));
		}
	}
	function reloadApp() {
		if (applyUpdate) applyUpdate();
		else window.location.reload();
	}
</script>

<!-- Update Available -->
{#if visibleBanner === 'update'}
	<div class="pwa-banner update-banner" role="alert">
		<div class="banner-content">
			<div class="banner-icon" aria-hidden="true">↻</div>
			<div class="banner-text">
				<h4>Actualización disponible</h4>
				<p>Hay una nueva versión lista</p>
			</div>
			<button class="update-button" onclick={reloadApp}>Actualizar</button>
		</div>
	</div>
{:else if visibleBanner === 'offline'}
	<div class="pwa-banner offline-banner" role="status" aria-live="polite">
		<div class="banner-content">
			<div class="banner-icon" aria-hidden="true">📴</div>
			<div class="banner-text">
				<h4>Sin conexión</h4>
				<p>No podrás registrar ni sincronizar gastos hasta recuperar la conexión.</p>
			</div>
			<button class="dismiss-button" aria-label="Cerrar" onclick={dismissOfflineBanner}>✕</button>
		</div>
	</div>
{:else if visibleBanner === 'install'}
	<div class="pwa-banner install-banner" role="region" aria-label="Instalar app">
		<div class="banner-content">
			<div class="banner-icon" aria-hidden="true">📱</div>
			<div class="banner-text">
				<h4>Instalar Expenses</h4>
				<p>Instálala para acceso rápido desde tu pantalla de inicio</p>
			</div>
			<div class="banner-actions">
				<button class="install-button" onclick={installApp}>Instalar</button>
				<button class="dismiss-button" aria-label="Cerrar" onclick={dismissInstallBanner}>✕</button>
			</div>
		</div>
	</div>
{:else if visibleBanner === 'ios'}
	<div class="pwa-banner ios-instructions" role="region" aria-label="Instalar en iPhone">
		<div class="banner-content">
			<div class="banner-icon" aria-hidden="true">🍎</div>
			<div class="banner-text">
				<h4>Instalar en iPhone</h4>
				<p>
					Toca el icono <span class="share-icon" aria-hidden="true">
						<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d="M12 3v12"/>
							<polyline points="7 8 12 3 17 8"/>
							<path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>
						</svg>
					</span> en Safari y luego <strong>Añadir a pantalla de inicio</strong>
				</p>
			</div>
			<button
				class="dismiss-button"
				aria-label="Cerrar instrucciones"
				onclick={dismissIOSInstructions}>✕</button
			>
		</div>
		<ol class="ios-steps">
			<li class="step"><span class="step-number" aria-hidden="true">1</span><span>Abre la app en Safari.</span></li>
			<li class="step"><span class="step-number" aria-hidden="true">2</span><span>Toca el icono Compartir.</span></li>
			<li class="step"><span class="step-number" aria-hidden="true">3</span><span>Elige “Añadir a pantalla de inicio”.</span></li>
		</ol>
	</div>
{/if}

<style>
	.pwa-banner {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 1000;

		/* Liquid Glass material */
		background: color-mix(in oklab, var(--color-bg-secondary) 72%, transparent);
		backdrop-filter: blur(24px) saturate(180%);
		-webkit-backdrop-filter: blur(24px) saturate(180%);
		border-bottom: 1px solid
			color-mix(in oklab, var(--color-text-primary) 8%, transparent);
		box-shadow:
			inset 0 1px 0 0 color-mix(in oklab, white 18%, transparent),
			0 8px 32px -8px rgba(0, 0, 0, 0.32);

		padding-top: max(var(--safe-area-inset-top), var(--spacing-sm));
		padding-left: max(var(--safe-area-inset-left), var(--spacing-md));
		padding-right: max(var(--safe-area-inset-right), var(--spacing-md));
		padding-bottom: var(--spacing-sm);

		transform: translateY(-100%);
		animation: slideDown 0.3s cubic-bezier(0.32, 0.72, 0, 1) forwards;
	}

	@supports not (backdrop-filter: blur(1px)) {
		.pwa-banner {
			background: var(--color-bg-secondary);
		}
	}

	@keyframes slideDown {
		to {
			transform: translateY(0);
		}
	}

	.banner-content {
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
		max-width: 768px;
		margin: 0 auto;
	}

	.banner-icon {
		font-size: 24px;
		line-height: 1;
	}

	.banner-text {
		flex: 1;
	}

	.banner-text h4 {
		margin: 0;
		font-size: var(--font-size-headline);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-primary);
	}

	.banner-text p {
		margin: 2px 0 0 0;
		font-size: var(--font-size-subhead);
		color: var(--color-text-secondary);
	}

	.banner-actions {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
	}

	.install-button,
	.update-button {
		background: var(--color-blue);
		color: white;
		border: none;
		border-radius: var(--radius-lg);
		padding: var(--spacing-sm) var(--spacing-md);
		font-size: var(--font-size-subhead);
		font-weight: var(--font-weight-semibold);
		cursor: pointer;
		transition: opacity 0.2s ease;
	}

	.install-button:hover,
	.update-button:hover {
		opacity: 0.8;
	}

	.dismiss-button {
		background: none;
		border: none;
		color: var(--color-text-secondary);
		font-size: 18px;
		cursor: pointer;
		padding: var(--spacing-xs);
		border-radius: 50%;
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background-color 0.2s ease;
	}

	.dismiss-button:hover {
		background: var(--color-fill-tertiary);
	}

	.ios-instructions {
		position: relative;
		padding-bottom: var(--spacing-lg);
	}

	.ios-instructions .banner-content {
		align-items: flex-start;
		margin-bottom: var(--spacing-md);
	}

	.ios-instructions .dismiss-button {
		position: absolute;
		top: var(--spacing-sm);
		right: var(--spacing-md);
	}

	.ios-steps {
		max-width: 768px;
		margin: 0 auto;
		padding-left: 48px;
		list-style: none;
	}

	.step {
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
		margin-bottom: var(--spacing-sm);
		font-size: var(--font-size-subhead);
		color: var(--color-text-primary);
	}

	.step-number {
		background: var(--color-blue);
		color: white;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--font-size-caption-1);
		font-weight: var(--font-weight-semibold);
		flex-shrink: 0;
	}

	.share-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		vertical-align: middle;
		margin: 0 2px;
		color: var(--color-blue);
	}

	.install-banner {
		background: linear-gradient(135deg, var(--color-blue) 0%, #0056b3 100%);
		color: white;
	}

	.install-banner .banner-text h4,
	.install-banner .banner-text p {
		color: white;
	}

	.install-banner .install-button {
		background: rgba(255, 255, 255, 0.2);
		border: 1px solid rgba(255, 255, 255, 0.3);
	}

	.install-banner .dismiss-button {
		color: rgba(255, 255, 255, 0.8);
	}

	.install-banner .dismiss-button:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	.update-banner {
		background: linear-gradient(135deg, var(--color-green) 0%, #28a745 100%);
		color: white;
	}

	.update-banner .banner-text h4,
	.update-banner .banner-text p {
		color: white;
	}

	.update-banner .update-button {
		background: rgba(255, 255, 255, 0.2);
		border: 1px solid rgba(255, 255, 255, 0.3);
	}

	.offline-banner {
		background: linear-gradient(135deg, var(--color-orange) 0%, #e17000 100%);
		color: white;
	}

	.offline-banner .banner-text h4,
	.offline-banner .banner-text p {
		color: white;
	}

	@media (max-width: 480px) {
		.banner-content {
			gap: var(--spacing-sm);
		}

		.banner-text h4 {
			font-size: var(--font-size-body);
		}

		.banner-text p {
			font-size: var(--font-size-caption-1);
		}

		.install-button,
		.update-button {
			font-size: var(--font-size-caption-1);
			padding: var(--spacing-xs) var(--spacing-sm);
		}

		.ios-steps {
			padding-left: var(--spacing-lg);
		}
	}

	@media (prefers-color-scheme: dark) {
		.pwa-banner {
			border-bottom-color: var(--color-separator);
		}
	}
</style>
