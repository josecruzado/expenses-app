// PWA Service Worker Registration and iOS optimizations
// This file handles service worker registration and iOS-specific PWA features

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

class PWAManager {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private isIOS = false;
  private isStandalone = false;

  constructor() {
    this.detectPlatform();
    this.init();
  }

  private detectPlatform() {
    // Detect iOS
    this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    
    // Detect standalone mode (PWA is installed)
    this.isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                      (window.navigator as any).standalone ||
                      document.referrer.includes('android-app://');
  }

  private async init() {
    // Register service worker
    await this.registerServiceWorker();
    
    // Setup PWA installation prompt
    this.setupInstallPrompt();
    
    // Setup iOS-specific features
    if (this.isIOS) {
      this.setupIOSFeatures();
    }
    
    // Setup app update handling
    this.setupAppUpdates();
    
    // Setup offline handling
    this.setupOfflineHandling();
  }

  private async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        console.log('Registering service worker...');
        
        const registration = await navigator.serviceWorker.register('/sw.js');
        
        console.log('Service Worker registered successfully:', registration);
        
        // Handle service worker updates
        registration.addEventListener('updatefound', () => {
          console.log('New service worker found, installing...');
          
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('New content available, reload required');
                this.showUpdateAvailable();
              }
            });
          }
        });
        
        // Listen for controlling service worker change
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('New service worker activated, reloading...');
          window.location.reload();
        });
        
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    } else {
      console.warn('Service Workers are not supported');
    }
  }

  private setupInstallPrompt() {
    // Listen for the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('beforeinstallprompt event fired');
      
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      
      // Stash the event so it can be triggered later
      this.deferredPrompt = e;
      
      // Show install button/banner
      this.showInstallPrompt();
    });
    
    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
      this.deferredPrompt = null;
      this.hideInstallPrompt();
      
      // Track installation
      this.trackInstallation();
    });
  }

  private setupIOSFeatures() {
    console.log('Setting up iOS-specific PWA features');
    
    // Prevent zoom on input focus (iOS Safari bug)
    document.addEventListener('touchstart', () => {}, { passive: true });
    
    // Handle iOS status bar styling
    this.setupIOSStatusBar();
    
    // Handle iOS safe areas
    this.setupIOSSafeAreas();
    
    // Show iOS installation instructions
    if (!this.isStandalone) {
      this.showIOSInstallInstructions();
    }
    
    // Handle iOS keyboard issues
    this.handleIOSKeyboard();
  }

  private setupIOSStatusBar() {
    // Set status bar style for iOS
    const metaTag = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (metaTag) {
      // Dynamic status bar style based on theme
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      metaTag.setAttribute('content', isDarkMode ? 'black' : 'black-translucent');
    }
    
    // Listen for theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      const metaTag = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
      if (metaTag) {
        metaTag.setAttribute('content', e.matches ? 'black' : 'black-translucent');
      }
    });
  }

  private setupIOSSafeAreas() {
    // Add CSS custom properties for safe areas if not supported
    if (!CSS.supports('top: env(safe-area-inset-top)')) {
      console.warn('Safe area insets not supported');
      document.documentElement.style.setProperty('--safe-area-inset-top', '20px');
      document.documentElement.style.setProperty('--safe-area-inset-bottom', '0px');
      document.documentElement.style.setProperty('--safe-area-inset-left', '0px');
      document.documentElement.style.setProperty('--safe-area-inset-right', '0px');
    }
  }

  private handleIOSKeyboard() {
    // Handle viewport changes when keyboard appears/disappears on iOS
    let initialViewportHeight = window.innerHeight;
    
    window.addEventListener('resize', () => {
      const currentHeight = window.innerHeight;
      const heightDifference = initialViewportHeight - currentHeight;
      
      // If height decreased significantly, keyboard is likely open
      if (heightDifference > 150) {
        document.body.classList.add('keyboard-open');
      } else {
        document.body.classList.remove('keyboard-open');
      }
    });
    
    // Prevent scroll when keyboard is open
    document.addEventListener('focusin', (e) => {
      if (this.isIOS && e.target instanceof HTMLInputElement) {
        setTimeout(() => {
          if (e.target instanceof HTMLElement) {
            e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 300);
      }
    });
  }

  private setupAppUpdates() {
    // Check for app updates periodically
    setInterval(async () => {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            await registration.update();
          }
        } catch (error) {
          console.error('Failed to check for updates:', error);
        }
      }
    }, 60000); // Check every minute
  }

  private setupOfflineHandling() {
    // Handle online/offline status
    window.addEventListener('online', () => {
      console.log('App is back online');
      this.hideOfflineMessage();
      this.syncOfflineData();
    });
    
    window.addEventListener('offline', () => {
      console.log('App is offline');
      this.showOfflineMessage();
    });
    
    // Show initial offline status
    if (!navigator.onLine) {
      this.showOfflineMessage();
    }
  }

  // Public methods for UI interaction
  public async installApp() {
    if (this.deferredPrompt) {
      console.log('Showing install prompt');
      
      await this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      
      console.log(`User response to install prompt: ${outcome}`);
      
      if (outcome === 'accepted') {
        this.deferredPrompt = null;
      }
    }
  }

  private showInstallPrompt() {
    // Show install button or banner
    const installBanner = document.getElementById('install-banner');
    if (installBanner) {
      installBanner.style.display = 'block';
    }
  }

  private hideInstallPrompt() {
    const installBanner = document.getElementById('install-banner');
    if (installBanner) {
      installBanner.style.display = 'none';
    }
  }

  private showIOSInstallInstructions() {
    // Show iOS-specific installation instructions
    const instructions = document.getElementById('ios-install-instructions');
    if (instructions) {
      instructions.style.display = 'block';
    }
  }

  private showUpdateAvailable() {
    // Show update available notification
    console.log('Showing update notification');
    
    // You can implement a custom notification here
    const updateBanner = document.getElementById('update-banner');
    if (updateBanner) {
      updateBanner.style.display = 'block';
    }
  }

  private showOfflineMessage() {
    const offlineBanner = document.getElementById('offline-banner');
    if (offlineBanner) {
      offlineBanner.style.display = 'block';
    }
    
    document.body.classList.add('offline');
  }

  private hideOfflineMessage() {
    const offlineBanner = document.getElementById('offline-banner');
    if (offlineBanner) {
      offlineBanner.style.display = 'none';
    }
    
    document.body.classList.remove('offline');
  }

  private async syncOfflineData() {
    // Sync any offline data when connection is restored
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SYNC_DATA'
      });
    }
  }

  private trackInstallation() {
    // Track PWA installation for analytics
    console.log('PWA installed successfully');
    
    // You can send analytics data here
    // analytics.track('pwa_installed', {
    //   platform: this.isIOS ? 'ios' : 'android',
    //   timestamp: Date.now()
    // });
  }

  // Utility methods
  public isInstalled(): boolean {
    return this.isStandalone;
  }

  public canInstall(): boolean {
    return this.deferredPrompt !== null || (this.isIOS && !this.isStandalone);
  }

  public getPlatform(): 'ios' | 'android' | 'desktop' {
    if (this.isIOS) return 'ios';
    if (/Android/.test(navigator.userAgent)) return 'android';
    return 'desktop';
  }
}

// Initialize PWA Manager when DOM is loaded
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const pwaManager = new PWAManager();
    
    // Expose PWA manager globally for UI components
    (window as any).pwaManager = pwaManager;
  });
}

export default PWAManager;
