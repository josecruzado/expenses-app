<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	
	let showInstallBanner = $state(false);
	let showUpdateBanner = $state(false);
	let showOfflineBanner = $state(false);
	let showIOSInstructions = $state(false);
	let isIOS = $state(false);
	let isInstalled = $state(false);
	let pwaManager: any = null;

	onMount(async () => {
		if (browser) {
			// Dynamically import PWA manager to avoid SSR issues
			const PWAManager = (await import('$lib/pwa')).default;
			pwaManager = new PWAManager();
			
			// Detect iOS
			isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
			
			// Check if app is installed
			isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
						 (navigator as any).standalone ||
						 document.referrer.includes('android-app://');
			
			// Show iOS instructions if on iOS and not installed
			showIOSInstructions = isIOS && !isInstalled;
			
			// Setup event listeners for PWA events
			setupPWAEventListeners();
		}
	});

	function setupPWAEventListeners() {
		// Listen for install prompt
		window.addEventListener('beforeinstallprompt', () => {
			showInstallBanner = true;
		});
		
		// Listen for app installed
		window.addEventListener('appinstalled', () => {
			showInstallBanner = false;
			showIOSInstructions = false;
			isInstalled = true;
		});
		
		// Listen for online/offline
		window.addEventListener('online', () => {
			showOfflineBanner = false;
		});
		
		window.addEventListener('offline', () => {
			showOfflineBanner = true;
		});
		
		// Check initial offline state
		if (!navigator.onLine) {
			showOfflineBanner = true;
		}
	}

	async function installApp() {
		if (pwaManager) {
			await pwaManager.installApp();
		}
	}

	function dismissInstallBanner() {
		showInstallBanner = false;
	}

	function dismissIOSInstructions() {
		showIOSInstructions = false;
	}

	function reloadApp() {
		window.location.reload();
	}
</script>

<!-- Install Banner for Android/Desktop -->
{#if showInstallBanner && !isIOS}
	<div id="install-banner" class="pwa-banner install-banner">
		<div class="banner-content">
			<div class="banner-icon">📱</div>
			<div class="banner-text">
				<h4>Install Expenses App</h4>
				<p>Add to your home screen for a better experience</p>
			</div>
			<div class="banner-actions">
				<button class="install-button" onclick={installApp}>Install</button>
				<button class="dismiss-button" onclick={dismissInstallBanner}>✕</button>
			</div>
		</div>
	</div>
{/if}

<!-- iOS Installation Instructions -->
{#if showIOSInstructions}
	<div id="ios-install-instructions" class="pwa-banner ios-instructions">
		<div class="banner-content">
			<div class="banner-icon">🍎</div>
			<div class="banner-text">
				<h4>Instalar en iPhone</h4>
				<p>Dale tap en el boton de <strong>Share</strong> <span class="share-icon">⬆️</span> luego <strong>"Agregar a inicio"</strong></p>
			</div>
			<button class="dismiss-button" onclick={dismissIOSInstructions}>✕</button>
		</div>
		<div class="ios-steps">
			<div class="step">
				<span class="step-number">1</span>
				<span>Dale Tap <span class="share-icon">⬆️</span> en Safari</span>
			</div>
			<div class="step">
				<span class="step-number">2</span>
				<span>Scrollea y dale tap en "Agregar a inicio"</span>
			</div>
			<div class="step">
				<span class="step-number">3</span>
				<span>Tap "Agregar" en la esquina superior derecha</span>
			</div>
		</div>
	</div>
{/if}

<!-- Update Available Banner -->
{#if showUpdateBanner}
	<div id="update-banner" class="pwa-banner update-banner">
		<div class="banner-content">
			<div class="banner-icon">🔄</div>
			<div class="banner-text">
				<h4>Update Available</h4>
				<p>A new version of the app is ready</p>
			</div>
			<button class="update-button" onclick={reloadApp}>Update</button>
		</div>
	</div>
{/if}

<!-- Offline Banner -->
{#if showOfflineBanner}
	<div id="offline-banner" class="pwa-banner offline-banner">
		<div class="banner-content">
			<div class="banner-icon">📴</div>
			<div class="banner-text">
				<h4>You're Offline</h4>
				<p>Some features may be limited</p>
			</div>
		</div>
	</div>
{/if}

<style>
	.pwa-banner {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 1000;
		background: var(--color-bg-secondary);
		border-bottom: 1px solid var(--color-separator);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		
		/* Handle safe areas */
		padding-top: max(var(--safe-area-inset-top), var(--spacing-sm));
		padding-left: max(var(--safe-area-inset-left), var(--spacing-md));
		padding-right: max(var(--safe-area-inset-right), var(--spacing-md));
		padding-bottom: var(--spacing-sm);
		
		/* Slide in animation */
		transform: translateY(-100%);
		animation: slideDown 0.3s ease-out forwards;
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
	
	/* iOS Instructions specific styles */
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
		padding-left: 48px; /* Align with text */
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
		display: inline-block;
		margin: 0 2px;
		font-size: 16px;
	}
	
	/* Banner variants */
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
	
	/* Responsive adjustments */
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
	
	/* Dark mode adjustments */
	@media (prefers-color-scheme: dark) {
		.pwa-banner {
			border-bottom-color: var(--color-separator);
		}
	}
</style>
