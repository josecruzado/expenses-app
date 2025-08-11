<script lang="ts">
  import { authStore, authMethods } from '$lib/stores/auth';
  import { page } from '$app/state';

  let showUserMenu = false;

  const handleLogout = async () => {
    const result = await authMethods.signOut();
    if (result.success) {
      showUserMenu = false;
    }
  };

  const toggleUserMenu = () => {
    showUserMenu = !showUserMenu;
  };

  // Cerrar con Escape
  const handleKeydownGlobal = (e: KeyboardEvent) => {
    if (e.key === 'Escape') showUserMenu = false;
  };

  // Cerrar menú si se hace clic fuera
  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu-container')) {
      showUserMenu = false;
    }
  };
</script>

<svelte:window on:click={handleClickOutside} on:keydown={handleKeydownGlobal} />

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

    {#if $authStore.user}
      <div class="user-menu-container">
        <button class="user-button" on:click={toggleUserMenu} aria-haspopup="menu" aria-expanded={showUserMenu} aria-controls="user-menu">
          <div class="user-avatar">
            {#if $authStore.user.photoURL}
              <img src={$authStore.user.photoURL} alt="Avatar" />
            {:else}
              <span>{$authStore.user.email?.charAt(0).toUpperCase()}</span>
            {/if}
          </div>
          <span class="user-label">{$authStore.user.displayName || $authStore.user.email}</span>
          <svg class="chevron" class:rotate={showUserMenu} width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path fill="currentColor" d="M4.427 9.573L8 6l3.573 3.573l.708-.708L8 4.585L3.719 8.865z"/>
          </svg>
        </button>

        {#if showUserMenu}
          <div class="user-menu" id="user-menu" role="menu">
            <div class="user-info">
              <p class="user-email">{$authStore.user.email}</p>
              {#if $authStore.user.displayName}
                <p class="user-name">{$authStore.user.displayName}</p>
              {/if}
            </div>
            <hr />
            <button class="menu-item logout" on:click={handleLogout} role="menuitem">
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <path fill="currentColor" d="M6 2v2H2v8h4v2H0V2h6zm3 0l5 4-5 4V7H4V5h5V2z"/>
              </svg>
              Cerrar sesión
            </button>
          </div>
        {/if}
      </div>
    {/if}
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

    /* Esta técnica extiende el fondo del header hasta el borde superior de la pantalla */
    margin-top: calc(-1 * var(--safe-area-inset-top));
    /* Y este padding empuja el contenido hacia abajo para que no lo tape el notch */
    padding-top: calc(var(--safe-area-inset-top) + var(--spacing-sm));

    /* Padding para los lados y abajo */
    padding-left: max(var(--safe-area-inset-left), var(--spacing-md));
    padding-right: max(var(--safe-area-inset-right), var(--spacing-md));
    padding-bottom: var(--spacing-sm);
  }

  .header-content {
    /* El contenido interno del header */
    max-width: 1280px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: auto 1fr auto; /* Título | Nav | Menú Usuario */
    align-items: center;
    gap: var(--spacing-md);
  }

  .app-title {
    font-size: var(--font-size-large-title);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    margin: var(--spacing-sm) 0;
  }

  nav ul {
    display: flex;
    list-style: none;
    margin: 0;
    padding: 0;
    gap: var(--spacing-xs);
    flex-wrap: wrap;
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
    min-width: 80px;
    justify-content: center;
  }

  nav a:hover,
  nav a:active {
    background-color: var(--color-fill-secondary);
    transform: scale(0.98);
  }

  .nav-icon {
    font-size: 16px;
    line-height: 1;
  }

  /* User menu styles from second component */
  .user-menu-container {
    position: relative;
  }

  .user-button {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--color-fill-tertiary);
    border: 1px solid var(--color-border, #e5e7eb);
    cursor: pointer;
    padding: 6px 10px;
    border-radius: 9999px; /* chip */
    transition: background-color 0.2s, border-color 0.2s;
    color: var(--color-text-primary);
  }

  .user-button:hover {
    background: var(--color-fill-secondary);
  }

  .user-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    flex: 0 0 28px;
  }

  .user-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .user-avatar span {
    color: white;
    font-weight: 600;
    font-size: 0.85rem;
    line-height: 1;
  }

  .user-label {
    max-width: 160px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .chevron {
    transition: transform 0.2s;
    color: var(--color-text-secondary, #999);
  }

  .chevron.rotate {
    transform: rotate(180deg);
  }

  .user-menu {
    position: absolute;
    top: calc(100% + 8px); /* anclado al botón */
    right: 0;
    background: white;
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: 14px;
    box-shadow: 0 12px 24px rgba(0,0,0,0.12);
    min-width: 220px;
    max-width: min(280px, calc(100vw - 16px));
    padding: 8px;
    z-index: 1001;
  }

  .user-info {
    padding: 8px 10px;
  }

  .user-email {
    margin: 0;
    font-size: 0.9rem;
    color: #111827; /* contraste alto */
    font-weight: 600;
  }

  .user-name {
    margin: 4px 0 0 0;
    font-size: 0.8rem;
    color: var(--color-text-secondary, #666);
  }

  .user-menu hr {
    border: none;
    height: 1px;
    background: var(--color-border, #e5e7eb);
    margin: 8px 0;
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 12px 12px; /* mayor área táctil */
    background: none;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    font-size: 0.95rem;
    transition: background-color 0.15s;
    text-align: left;
    color: var(--color-text-primary);
  }

  .menu-item:hover {
    background: var(--color-bg-tertiary, #f3f4f6);
  }

  .menu-item.logout {
    color: #dc2626;
    font-weight: 600;
  }

  .menu-item.logout:hover {
    background: #fef2f2;
  }

  @media (max-width: 480px) {
    /* Coloca título a la izquierda y usuario a la derecha (fila 1), nav abajo (fila 2) */
    .header-content {
      display: grid;
      grid-template-columns: 1fr auto;
      grid-auto-rows: auto;
      align-items: center;
      column-gap: var(--spacing-sm);
      row-gap: var(--spacing-xs);
    }

    .app-title {
      grid-column: 1;
      grid-row: 1;
      margin: var(--spacing-sm) 0;
    }

    .user-menu-container {
      grid-column: 2;
      grid-row: 1;
      justify-self: end;
    }

    nav {
      grid-column: 1 / -1;
      grid-row: 2;
    }

    .user-button {
      padding: 8px 12px;
      min-height: 44px; /* guía iOS */
      gap: 10px;
    }

    .user-label {
      display: none; /* compacto en pantallas pequeñas */
    }

    .user-menu {
      right: 8px;
      max-width: calc(100vw - 16px);
    }

    .menu-item {
      padding: 14px 14px;
      font-size: 1rem;
    }
  }

  /* --- MODIFICACIÓN PARA VISTA DE ESCRITORIO --- */
  @media (min-width: 768px) {
    .header-content {
      /* Cambiamos a Grid para un control preciso del layout de 3 columnas */
      display: grid;
      grid-template-columns: auto 1fr auto; /* Título | Navegación (flexible) | Menú Usuario */
      align-items: center;
      gap: var(--spacing-lg);
      
      max-width: 1280px; /* Aumentamos el ancho máximo para pantallas grandes */
      padding-left: var(--spacing-lg);
      padding-right: var(--spacing-lg);
    }

    .app-title {
      grid-column: 1; /* Columna izquierda */
      margin: 0;
    }

    nav {
      grid-column: 2; /* Columna central */
      justify-self: center; /* Centramos el bloque de navegación */
    }

    .user-menu-container {
      grid-column: 3; /* Columna derecha */
    }

    nav ul {
      justify-content: center;
    }

    nav a {
      min-width: 100px;
    }
  }

  @media (min-width: 1024px) {
    .app-title {
      text-align: center;
    }
    nav ul {
      justify-content: center;
    }
  }

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
