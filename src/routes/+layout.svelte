<script lang="ts">
	import Header from './Header.svelte';
	import PWAManager from '$lib/components/PWAManager.svelte';
	import SplashScreen from '$lib/components/SplashScreen.svelte';
	import '../app.css';
	
	// Import Dynamic Island integration
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let { children } = $props();
	
	onMount(async () => {
		if (browser) {
			// Initialize Dynamic Island integration
			await import('$lib/dynamic-island');
		}
	});
</script>

<SplashScreen />
<PWAManager />

<div class="app">
	<Header />

	<main>
		{@render children()}
	</main>
</div>

<style>
	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		min-height: 100dvh; /* Dynamic viewport height for mobile */
		background-color: var(--color-bg-primary);
		
		/* Handle safe areas for iOS */
		padding-bottom: max(var(--safe-area-inset-bottom), var(--spacing-md));
	}

	main {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: var(--spacing-md);
		width: 100%;
		max-width: 100%;
		margin: 0 auto;
		box-sizing: border-box;
		
		/* iOS-style momentum scrolling */
		-webkit-overflow-scrolling: touch;
		overflow-y: auto;
		
		/* Handle safe areas */
		padding-left: max(var(--safe-area-inset-left), var(--spacing-md));
		padding-right: max(var(--safe-area-inset-right), var(--spacing-md));
	}
	
	/* Large screen adjustments */
	@media (min-width: 768px) {
		main {
			max-width: 768px;
			padding-left: var(--spacing-lg);
			padding-right: var(--spacing-lg);
		}
	}
</style>
