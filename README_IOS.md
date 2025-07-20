# Expenses App - iOS 18 Optimized PWA

A modern Progressive Web App (PWA) for expense tracking, specifically optimized for iOS 18 and iPhone users with a native-like interface and functionality.

## ✨ iOS 18 Features

### 🍎 Native iOS Experience
- **iOS 18 Design System**: Uses Apple's latest design language with SF Pro fonts, proper spacing, and color schemes
- **Safe Area Support**: Full compatibility with iPhone notches, Dynamic Island, and home indicators  
- **Dark Mode**: Automatic dark/light mode switching following system preferences
- **Haptic-like Feedback**: Visual feedback that mimics iOS haptic responses
- **Native Status Bar**: Proper status bar integration with translucent styling

### 📱 PWA Optimizations
- **App-like Installation**: Custom install prompts for both Android and iOS
- **iOS Installation Guide**: Step-by-step instructions for adding to home screen on iPhone
- **Offline Support**: Full offline functionality with smart caching strategies
- **Background Sync**: Automatic data synchronization when connection is restored
- **Push Notifications**: Ready for iOS push notification support
- **App Updates**: Automatic update detection and installation prompts

### 🎨 iOS 18 UI Components
- **Splash Screen**: Native-like app launch experience
- **Floating Action Button**: iOS-style FAB for quick actions
- **Card-based Layout**: Modern card design following iOS guidelines
- **Segmented Controls**: Native iOS segmented control styling
- **Activity Indicators**: iOS-style loading animations
- **Context Menus**: Native-style context menus and action sheets

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or Bun
- Modern browser with PWA support

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd expenses-app

# Install dependencies
bun install

# Start development server
bun run dev
```

### Building for Production

```bash
# Build the app
bun run build

# Preview production build
bun run preview
```

## 📱 iPhone Installation Instructions

### For iPhone Users:
1. Open the app in Safari on your iPhone
2. Tap the **Share** button (⬆️) at the bottom of the screen
3. Scroll down and tap **"Add to Home Screen"**
4. Tap **"Add"** in the top-right corner
5. The app will now appear on your home screen like a native app!

### Features After Installation:
- ✅ Launches in fullscreen mode (no Safari UI)
- ✅ Appears in app switcher
- ✅ Works offline
- ✅ Receives update notifications
- ✅ Native-like performance and feel

## 🛠️ Technical Features

### Service Worker
- **Caching Strategy**: Intelligent caching for static assets and dynamic content
- **Offline Support**: App works completely offline
- **Update Management**: Automatic detection and installation of updates
- **Background Sync**: Syncs data when connection is restored

### iOS-Specific Optimizations
- **Viewport Meta Tags**: Proper viewport configuration for iOS
- **Apple Touch Icons**: Complete set of iOS icon sizes
- **Status Bar Styling**: Dynamic status bar color based on theme
- **Safe Area Variables**: CSS custom properties for safe areas
- **Keyboard Handling**: Proper keyboard behavior on iOS
- **Momentum Scrolling**: Native iOS scrolling behavior

### Performance
- **Code Splitting**: Optimized loading with dynamic imports
- **Image Optimization**: WebP support with fallbacks
- **CSS Optimization**: Minimal CSS with CSS custom properties
- **Bundle Size**: Optimized bundle size for fast loading

## 🎨 Design System

### Colors
The app uses iOS 18's color system with:
- Dynamic color adaptation for light/dark modes
- Semantic color names (primary, secondary, tertiary)
- Proper contrast ratios for accessibility

### Typography
- **SF Pro Display/Text**: Apple's system fonts with fallbacks
- **Dynamic Type**: Responsive typography scale
- **Font Weights**: Full range from ultralight to black

### Spacing & Layout
- **8pt Grid System**: Consistent spacing using iOS guidelines
- **Safe Areas**: Proper handling of iPhone screen variations
- **Responsive Design**: Optimized for all iPhone screen sizes

## 📊 App Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── PWAManager.svelte     # PWA functionality management
│   │   └── SplashScreen.svelte   # Native-like splash screen
│   └── pwa.ts                    # PWA service worker registration
├── routes/
│   ├── +layout.svelte           # Main app layout
│   ├── +page.svelte             # Dashboard page
│   └── Header.svelte            # iOS-style navigation
└── app.css                      # iOS 18 design system styles

static/
├── manifest.webmanifest         # PWA manifest with iOS optimizations
├── sw.js                        # Service worker for offline support
└── [icons]                      # Complete set of iOS icons
```

## 🔧 Configuration

### PWA Manifest
The `manifest.webmanifest` includes:
- iOS-specific display modes
- Complete icon set (36x36 to 512x512)
- App shortcuts for quick actions
- Theme and background colors optimized for iOS

### Service Worker
The service worker provides:
- Cache-first strategy for static assets
- Network-first for dynamic content
- Background sync capabilities
- Update management

## 📱 Browser Support

### Fully Supported:
- ✅ Safari iOS 14.0+
- ✅ Chrome iOS 90+
- ✅ Safari macOS 14+
- ✅ Chrome Desktop 90+
- ✅ Edge 90+

### PWA Features:
- ✅ iOS Safari: Add to Home Screen, Offline, Service Worker
- ✅ Android Chrome: Full PWA support including install prompts
- ✅ Desktop: Install as desktop app

## 🚀 Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Netlify
```bash
# Build the app
bun run build

# Deploy the build folder
```

### Other Platforms
The app can be deployed to any static hosting service. Make sure to:
1. Serve the app over HTTPS (required for PWA features)
2. Configure proper MIME types for the manifest and service worker
3. Set up proper caching headers for static assets

## 🧪 Testing on iOS

### Safari Developer Tools
1. Connect iPhone to Mac
2. Enable Web Inspector in iOS Settings > Safari > Advanced
3. Use Safari Developer menu to inspect the mobile web app

### iOS Simulator
1. Open Xcode
2. Launch iOS Simulator
3. Open Safari and navigate to your local development URL
4. Test PWA installation and features

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes following the iOS design guidelines
4. Test on real iOS devices when possible
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For iOS-specific issues:
- Test on actual iOS devices, not just simulators
- Check Safari Web Inspector for console errors
- Verify PWA manifest validation
- Ensure HTTPS is enabled for PWA features

---

Built with ❤️ for iOS 18 and modern web standards.
