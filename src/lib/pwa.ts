// PWA Service Worker registration and iOS optimizations.
// Single source of truth: the `pwaManager` singleton. UI subscribes via events.

interface BeforeInstallPromptEvent extends Event {
	readonly platforms: string[];
	readonly userChoice: Promise<{
		outcome: 'accepted' | 'dismissed';
		platform: string;
	}>;
	prompt(): Promise<void>;
}

declare global {
	interface WindowEventMap {
		beforeinstallprompt: BeforeInstallPromptEvent;
	}
}

export type Platform = 'ios' | 'android' | 'desktop';

export interface PWAEventDetailMap {
	'install-available': void;
	'install-completed': void;
	'update-available': { apply: () => void };
	'online': void;
	'offline': void;
}

class PWAManager extends EventTarget {
	private deferredPrompt: BeforeInstallPromptEvent | null = null;
	private waitingWorker: ServiceWorker | null = null;
	private applyingUpdate = false;
	private started = false;
	private _isIOS = false;
	private _isStandalone = false;

	init(): void {
		if (this.started || typeof window === 'undefined') return;
		this.started = true;

		this.detectPlatform();
		this.registerServiceWorker();
		this.setupInstallPrompt();
		this.setupOfflineHandling();
		this.setupUpdateChecks();
		this.setupKeyboardTracking();

		if (this._isIOS) this.setupIOSFeatures();
	}

	private detectPlatform(): void {
		const ua = navigator.userAgent || '';
		// iPadOS 13+ reports as MacIntel with touch — catch it.
		const isiPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
		this._isIOS = (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) || isiPadOS;

		this._isStandalone =
			window.matchMedia('(display-mode: standalone)').matches ||
			(window.navigator as any).standalone === true ||
			document.referrer.startsWith('android-app://');
	}

	private async registerServiceWorker(): Promise<void> {
		if (!('serviceWorker' in navigator)) return;

		try {
			const registration = await navigator.serviceWorker.register('/sw.js');

			// A worker may already be waiting from a previous session.
			if (registration.waiting && navigator.serviceWorker.controller) {
				this.waitingWorker = registration.waiting;
				this.dispatchUpdateAvailable();
			}

			registration.addEventListener('updatefound', () => {
				const newWorker = registration.installing;
				if (!newWorker) return;
				newWorker.addEventListener('statechange', () => {
					if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
						this.waitingWorker = newWorker;
						this.dispatchUpdateAvailable();
					}
				});
			});

			navigator.serviceWorker.addEventListener('controllerchange', () => {
				// Only reload when the user explicitly accepted the update.
				if (this.applyingUpdate) window.location.reload();
			});
		} catch (err) {
			console.error('Service Worker registration failed:', err);
		}
	}

	private dispatchUpdateAvailable(): void {
		this.dispatchEvent(
			new CustomEvent('update-available', {
				detail: { apply: () => this.applyUpdate() }
			})
		);
	}

	private applyUpdate(): void {
		this.applyingUpdate = true;
		if (this.waitingWorker) {
			this.waitingWorker.postMessage({ type: 'SKIP_WAITING' });
		} else {
			window.location.reload();
		}
	}

	private setupInstallPrompt(): void {
		window.addEventListener('beforeinstallprompt', (e) => {
			e.preventDefault();
			this.deferredPrompt = e;
			this.dispatchEvent(new CustomEvent('install-available'));
		});

		window.addEventListener('appinstalled', () => {
			this.deferredPrompt = null;
			this.dispatchEvent(new CustomEvent('install-completed'));
		});
	}

	private setupOfflineHandling(): void {
		const emit = (online: boolean) => {
			this.dispatchEvent(new CustomEvent(online ? 'online' : 'offline'));
			document.body.classList.toggle('offline', !online);
			if (online) this.syncOfflineData();
		};
		window.addEventListener('online', () => emit(true));
		window.addEventListener('offline', () => emit(false));
		if (!navigator.onLine) emit(false);
	}

	private setupUpdateChecks(): void {
		// Check for SW updates whenever the app regains visibility — no polling.
		document.addEventListener('visibilitychange', async () => {
			if (document.visibilityState !== 'visible') return;
			if (!('serviceWorker' in navigator)) return;
			try {
				const reg = await navigator.serviceWorker.getRegistration();
				if (reg) await reg.update();
			} catch {
				/* ignore */
			}
		});
	}

	private setupIOSFeatures(): void {
		// Enable :active state delegation on iOS.
		document.addEventListener('touchstart', () => {}, { passive: true });

		// Scroll focused input into view (iOS quirk on standalone).
		document.addEventListener('focusin', (e) => {
			const t = e.target;
			if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) {
				setTimeout(() => t.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
			}
		});
	}

	// Exposes --keyboard-inset-height + .keyboard-open class so any component can
	// pad against the on-screen keyboard. Prefers VirtualKeyboard API; falls back
	// to visualViewport — but only treats viewport shrink as a keyboard when an
	// editable element actually has focus. Otherwise the iOS Safari URL bar
	// collapsing/expanding on scroll triggers a false keyboard-open.
	private setupKeyboardTracking(): void {
		const setInset = (px: number) => {
			const v = Math.max(0, Math.round(px));
			document.documentElement.style.setProperty('--keyboard-inset-height', `${v}px`);
			document.body.classList.toggle('keyboard-open', v > 80);
		};

		const vk = (navigator as any).virtualKeyboard;
		if (vk) {
			vk.overlaysContent = true;
			vk.addEventListener('geometrychange', () => {
				setInset(vk.boundingRect?.height ?? 0);
			});
			return;
		}

		const vv = window.visualViewport;
		if (!vv) return;

		const isEditable = () => {
			const el = document.activeElement as HTMLElement | null;
			if (!el) return false;
			if (el instanceof HTMLInputElement) {
				const skip = ['button', 'submit', 'reset', 'checkbox', 'radio', 'file'];
				return !skip.includes(el.type);
			}
			if (el instanceof HTMLTextAreaElement) return true;
			return el.isContentEditable;
		};

		const update = () => {
			if (!isEditable()) {
				setInset(0);
				return;
			}
			setInset(window.innerHeight - vv.height - vv.offsetTop);
		};

		vv.addEventListener('resize', update);
		vv.addEventListener('scroll', update);
		// Re-evaluate when focus leaves an input — vv events may not fire.
		document.addEventListener('focusin', update);
		document.addEventListener('focusout', () => setInset(0));
	}

	private syncOfflineData(): void {
		if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
			navigator.serviceWorker.controller.postMessage({ type: 'SYNC_DATA' });
		}
	}

	async installApp(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
		if (!this.deferredPrompt) return 'unavailable';
		await this.deferredPrompt.prompt();
		const { outcome } = await this.deferredPrompt.userChoice;
		if (outcome === 'accepted') this.deferredPrompt = null;
		return outcome;
	}

	get isIOS(): boolean {
		return this._isIOS;
	}
	get isStandalone(): boolean {
		return this._isStandalone;
	}
	get canInstall(): boolean {
		return this.deferredPrompt !== null;
	}
	get platform(): Platform {
		if (this._isIOS) return 'ios';
		if (typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent)) return 'android';
		return 'desktop';
	}
}

export const pwaManager = new PWAManager();

export default PWAManager;
