<script lang="ts">
	import { page } from '$app/state';
</script>

<header>
	<div class="header-content">
		<h1 class="app-title">Expenses</h1>
		<nav>
			<ul>
				<li aria-current={page.url.pathname === '/' ? 'page' : undefined}>
					<a href="/">
						<span class="nav-icon">📊</span>
						<span>Dashboard</span>
					</a>
				</li>
				<li aria-current={page.url.pathname === '/expenses' ? 'page' : undefined}>
					<a href="/expenses">
						<span class="nav-icon">💰</span>
						<span>Expenses</span>
					</a>
				</li>
				<li aria-current={page.url.pathname === '/about' ? 'page' : undefined}>
					<a href="/about">
						<span class="nav-icon">ℹ️</span>
						<span>About</span>
					</a>
				</li>
			</ul>
		</nav>
	</div>
</header>

<style>
	header {
		background: rgba(0, 0, 0, 0.8);
		border-bottom: 0.5px solid var(--color-separator);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		position: sticky;
		top: 0;
		z-index: 100;
		
		/* Handle safe areas for iOS notch - Critical for Dynamic Island */
		padding-top: max(var(--safe-area-inset-top), var(--spacing-sm));
		padding-left: max(var(--safe-area-inset-left), 0);
		padding-right: max(var(--safe-area-inset-right), 0);
		
		/* Seamless integration with Dynamic Island */
		margin-top: calc(-1 * var(--safe-area-inset-top));
		padding-top: calc(var(--safe-area-inset-top) + var(--spacing-sm));
	}
	
	.header-content {
		padding: 0 var(--spacing-md) var(--spacing-sm);
		max-width: 100%;
		margin: 0 auto;
	}
	
	.app-title {
		font-size: var(--font-size-large-title);
		font-weight: var(--font-weight-bold);
		color: var(--color-text-primary);
		margin: var(--spacing-sm) 0 var(--spacing-md) 0;
		text-align: left;
	}

	nav ul {
		display: flex;
		list-style: none;
		margin: 0;
		padding: 0;
		gap: var(--spacing-xs);
		justify-content: center;
		flex-wrap: wrap;
	}

	nav li {
		position: relative;
	}
	
	nav li[aria-current='page'] a {
		background-color: var(--color-blue);
		color: white;
	}
	
	nav li[aria-current='page'] a .nav-icon {
		filter: brightness(0) invert(1);
	}

	nav a {
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
		padding: var(--spacing-sm) var(--spacing-md);
		background-color: var(--color-fill-tertiary);
		color: var(--color-text-primary);
		text-decoration: none;
		border-radius: var(--radius-xl);
		font-size: var(--font-size-subhead);
		font-weight: var(--font-weight-medium);
		transition: all 0.2s ease;
		-webkit-tap-highlight-color: transparent;
		min-width: 80px;
		justify-content: center;
	}
	
	.nav-icon {
		font-size: 16px;
		line-height: 1;
	}

	nav a:hover,
	nav a:active {
		background-color: var(--color-fill-secondary);
		transform: scale(0.98);
	}
	
	/* Responsive design */
	@media (min-width: 768px) {
		.header-content {
			max-width: 768px;
			padding-left: var(--spacing-lg);
			padding-right: var(--spacing-lg);
		}
		
		nav ul {
			justify-content: flex-start;
		}
		
		nav a {
			min-width: 100px;
		}
	}
	
	/* Handle larger screens */
	@media (min-width: 1024px) {
		.app-title {
			text-align: center;
		}
		
		nav ul {
			justify-content: center;
		}
	}
	
	/* Theme-specific adjustments for Dynamic Island integration */
	@media (prefers-color-scheme: light) {
		header {
			background: rgba(242, 242, 247, 0.8);
		}
	}
	
	@media (prefers-color-scheme: dark) {
		header {
			background: rgba(0, 0, 0, 0.8);
		}
	}
</style>
