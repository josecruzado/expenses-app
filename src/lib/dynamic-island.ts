// Dynamic Theme Color Management for iOS Dynamic Island Integration
// This script ensures perfect color integration with iPhone Dynamic Island

class DynamicIslandIntegration {
  private themeColorMeta: HTMLMetaElement | null = null;
  private statusBarMeta: HTMLMetaElement | null = null;

  constructor() {
    this.init();
  }

  private init() {
    // Get theme color meta tags
    this.themeColorMeta = document.querySelector('meta[name="theme-color"]');
    this.statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    
    // Set initial colors
    this.updateThemeColors();
    
    // Listen for system theme changes
    this.setupThemeListener();
    
    // Handle iOS specific configurations
    this.setupiOSConfiguration();
  }

  private updateThemeColors() {
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Colors that match exactly with iOS Dynamic Island
    const darkModeColor = '#000000';  // Perfect black to match Dynamic Island
    const lightModeColor = '#f2f2f7'; // iOS light system background
    
    const themeColor = isDarkMode ? darkModeColor : lightModeColor;
    
    // Update theme color for browser UI
    if (this.themeColorMeta) {
      this.themeColorMeta.setAttribute('content', themeColor);
    }
    
    // Update status bar style
    if (this.statusBarMeta) {
      // Always use black-translucent for seamless integration
      this.statusBarMeta.setAttribute('content', 'black-translucent');
    }
    
    // Update CSS custom properties for dynamic theming
    document.documentElement.style.setProperty('--dynamic-island-color', themeColor);
    
    console.log(`Theme updated: ${isDarkMode ? 'Dark' : 'Light'} mode with color ${themeColor}`);
  }

  private setupThemeListener() {
    // Listen for system theme changes
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    darkModeQuery.addEventListener('change', (e) => {
      console.log('System theme changed:', e.matches ? 'Dark' : 'Light');
      this.updateThemeColors();
      
      // Add smooth transition for theme changes
      document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
      
      // Remove transition after animation
      setTimeout(() => {
        document.body.style.transition = '';
      }, 300);
    });
  }

  private setupiOSConfiguration() {
    // Detect if running on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isIOS) {
      // Add iOS-specific class for enhanced styling
      document.body.classList.add('ios-device');
      
      // Handle safe area insets dynamically
      this.handleSafeAreas();
      
      // Optimize viewport for Dynamic Island integration
      this.optimizeViewport();
      
      // Handle orientation changes
      this.handleOrientationChanges();
    }
  }

  private handleSafeAreas() {
    // Function to update safe area insets
    const updateSafeAreas = () => {
      const safeAreaTop = getComputedStyle(document.documentElement)
        .getPropertyValue('--safe-area-inset-top') || 'env(safe-area-inset-top)';
      
      // Ensure minimum safe area for Dynamic Island
      if (safeAreaTop === '0px' || !safeAreaTop) {
        document.documentElement.style.setProperty('--safe-area-inset-top', '47px'); // Dynamic Island height
      }
    };
    
    updateSafeAreas();
    
    // Update on resize (orientation change)
    window.addEventListener('resize', updateSafeAreas);
  }

  private optimizeViewport() {
    // Ensure viewport meta tag is optimized for iOS
    let viewportMeta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
    
    if (viewportMeta) {
      viewportMeta.setAttribute('content', 
        'width=device-width, initial-scale=1, user-scalable=no, viewport-fit=cover'
      );
    }
  }

  private handleOrientationChanges() {
    // Handle orientation changes for consistent Dynamic Island integration
    const handleOrientationChange = () => {
      setTimeout(() => {
        this.updateThemeColors();
        this.handleSafeAreas();
      }, 100); // Small delay for iOS to settle
    };
    
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // Also listen for resize events
    let resizeTimer: number;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(handleOrientationChange, 100);
    });
  }

  // Public method to manually update theme (useful for testing)
  public updateTheme(forceDark?: boolean) {
    if (forceDark !== undefined) {
      // Temporarily override system preference
      const color = forceDark ? '#000000' : '#f2f2f7';
      
      if (this.themeColorMeta) {
        this.themeColorMeta.setAttribute('content', color);
      }
      
      document.documentElement.style.setProperty('--dynamic-island-color', color);
    } else {
      this.updateThemeColors();
    }
  }

  // Method to get current theme info
  public getThemeInfo() {
    return {
      isDark: window.matchMedia('(prefers-color-scheme: dark)').matches,
      currentColor: this.themeColorMeta?.getAttribute('content'),
      isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
      safeAreaTop: getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top')
    };
  }
}

// Initialize when DOM is ready
let dynamicIslandIntegration: DynamicIslandIntegration;

if (typeof document !== 'undefined') {
  const initDynamicIsland = () => {
    dynamicIslandIntegration = new DynamicIslandIntegration();
    
    // Expose globally for debugging
    (window as any).dynamicIslandIntegration = dynamicIslandIntegration;
    
    console.log('Dynamic Island integration initialized');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDynamicIsland);
  } else {
    initDynamicIsland();
  }
}

export default DynamicIslandIntegration;
