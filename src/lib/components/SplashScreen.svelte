<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	
	let showSplash = $state(true);
	let isLoading = $state(true);

	onMount(() => {
		if (browser) {
			// Show splash for a minimum time to feel native
			const minSplashTime = 1500;
			const startTime = Date.now();
			
			// Simulate app initialization
			Promise.all([
				// Wait for minimum splash time
				new Promise(resolve => setTimeout(resolve, minSplashTime)),
				// Wait for app to be ready (you can add actual initialization here)
				new Promise(resolve => {
					// Add any async initialization here
					// For example: loading user preferences, checking authentication, etc.
					setTimeout(resolve, 500);
				})
			]).then(() => {
				isLoading = false;
				// Add a small delay for smooth transition
				setTimeout(() => {
					showSplash = false;
				}, 300);
			});
		}
	});
</script>

{#if showSplash}
	<div class="splash-screen" class:loading={isLoading}>
		<div class="splash-content">
			<!-- App Icon -->
			<div class="app-icon">
				<div class="icon-background">
					<span class="icon-emoji">💰</span>
				</div>
			</div>
			
			<!-- App Name -->
			<h1 class="app-title">Expenses</h1>
			
			<!-- Loading Animation -->
			{#if isLoading}
				<div class="loading-spinner">
					<div class="spinner"></div>
				</div>
			{/if}
			
			<!-- Version Info (Optional) -->
			<div class="app-info">
				<p class="version">Version 1.0.0</p>
			</div>
		</div>
		
		<!-- iOS-style background -->
		<div class="splash-background"></div>
	</div>
{/if}

<style>
	.splash-screen {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		height: 100vh;
		height: 100dvh; /* Dynamic viewport height */
		background: var(--color-bg-primary);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 9999;
		
		/* Handle safe areas */
		padding-top: var(--safe-area-inset-top);
		padding-bottom: var(--safe-area-inset-bottom);
		padding-left: var(--safe-area-inset-left);
		padding-right: var(--safe-area-inset-right);
		
		/* Transition out */
		opacity: 1;
		transition: opacity 0.3s ease-out;
	}
	
	.splash-screen:not(.loading) {
		opacity: 0;
		pointer-events: none;
	}
	
	.splash-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		position: relative;
		z-index: 2;
	}
	
	.app-icon {
		margin-bottom: var(--spacing-xl);
		animation: iconFadeIn 0.6s ease-out;
	}
	
	.icon-background {
		width: 120px;
		height: 120px;
		background: linear-gradient(135deg, var(--color-blue) 0%, #0056b3 100%);
		border-radius: 26px; /* iOS app icon radius */
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 
			0 10px 30px rgba(0, 0, 0, 0.2),
			0 4px 8px rgba(0, 0, 0, 0.1);
		position: relative;
		overflow: hidden;
	}
	
	/* iOS-style icon shine effect */
	.icon-background::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 50%;
		background: linear-gradient(
			to bottom,
			rgba(255, 255, 255, 0.4) 0%,
			rgba(255, 255, 255, 0.1) 50%,
			transparent 100%
		);
		border-radius: 26px 26px 0 0;
	}
	
	.icon-emoji {
		font-size: 48px;
		line-height: 1;
		position: relative;
		z-index: 1;
		filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
	}
	
	.app-title {
		font-size: var(--font-size-large-title);
		font-weight: var(--font-weight-bold);
		color: var(--color-text-primary);
		margin: 0 0 var(--spacing-xl) 0;
		letter-spacing: -0.5px;
		animation: titleFadeIn 0.8s ease-out 0.2s both;
	}
	
	.loading-spinner {
		margin-bottom: var(--spacing-xl);
		animation: spinnerFadeIn 1s ease-out 0.4s both;
	}
	
	.spinner {
		width: 32px;
		height: 32px;
		border: 3px solid var(--color-fill-tertiary);
		border-top: 3px solid var(--color-blue);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}
	
	.app-info {
		animation: infoFadeIn 1s ease-out 0.6s both;
	}
	
	.version {
		font-size: var(--font-size-caption-1);
		color: var(--color-text-tertiary);
		margin: 0;
		font-weight: var(--font-weight-medium);
	}
	
	.splash-background {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: 
			radial-gradient(
				ellipse at center,
				rgba(0, 122, 255, 0.1) 0%,
				transparent 50%
			);
		z-index: 1;
	}
	
	/* Animations */
	@keyframes iconFadeIn {
		from {
			opacity: 0;
			transform: scale(0.8) translateY(20px);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}
	
	@keyframes titleFadeIn {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	
	@keyframes spinnerFadeIn {
		from {
			opacity: 0;
			transform: scale(0.8);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
	
	@keyframes infoFadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
	
	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
	
	/* Dark mode adjustments */
	@media (prefers-color-scheme: dark) {
		.splash-background {
			background: 
				radial-gradient(
					ellipse at center,
					rgba(10, 132, 255, 0.15) 0%,
					transparent 50%
				);
		}
	}
	
	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.splash-screen,
		.app-icon,
		.app-title,
		.loading-spinner,
		.app-info {
			animation: none;
		}
		
		.spinner {
			animation: spin 2s linear infinite;
		}
	}
	
	/* iPhone-specific adjustments */
	@media screen and (max-width: 428px) and (max-height: 926px) {
		/* iPhone 14 Pro Max and similar */
		.app-icon {
			margin-bottom: var(--spacing-lg);
		}
		
		.icon-background {
			width: 100px;
			height: 100px;
			border-radius: 22px;
		}
		
		.icon-emoji {
			font-size: 40px;
		}
		
		.app-title {
			font-size: var(--font-size-title-1);
		}
	}
	
	/* iPhone SE and smaller devices */
	@media screen and (max-width: 375px) and (max-height: 667px) {
		.app-icon {
			margin-bottom: var(--spacing-md);
		}
		
		.icon-background {
			width: 80px;
			height: 80px;
			border-radius: 18px;
		}
		
		.icon-emoji {
			font-size: 32px;
		}
		
		.app-title {
			font-size: var(--font-size-title-2);
			margin-bottom: var(--spacing-lg);
		}
	}
</style>
