<script lang="ts">
  import { authStore, authMethods } from '$lib/stores/auth';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';

  let showUserMenu = $state(false);
  let confirmLogout = $state(false);
  let loggingOut = $state(false);

  async function performLogout() {
    loggingOut = true;
    const result = await authMethods.signOut();
    loggingOut = false;
    if (result.success) {
      showUserMenu = false;
      confirmLogout = false;
    }
  }

  function requestLogout() {
    showUserMenu = false;
    confirmLogout = true;
  }

  function toggleUserMenu() {
    showUserMenu = !showUserMenu;
  }

  function handleKeydownGlobal(e: KeyboardEvent) {
    if (e.key === 'Escape') showUserMenu = false;
  }

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu-container')) {
      showUserMenu = false;
    }
  }
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeydownGlobal} />

<header>
  <div class="header-content">
    <!-- No es <h1>: cada página tiene su propio <h1>. Evita duplicado en a11y. -->
    <p class="app-title" aria-hidden="true">Expenses</p>

    {#if $authStore.user}
      <div class="user-menu-container">
        <button class="user-button" onclick={toggleUserMenu} aria-haspopup="menu" aria-expanded={showUserMenu} aria-controls="user-menu">
          <div class="user-avatar" aria-hidden="true">
            {#if $authStore.user.photoURL}
              <img src={$authStore.user.photoURL} alt="" />
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
          <div class="user-menu" id="user-menu" role="menu" aria-orientation="vertical">
            <div class="user-info">
              <p class="user-email">{$authStore.user.email}</p>
              {#if $authStore.user.displayName}
                <p class="user-name">{$authStore.user.displayName}</p>
              {/if}
            </div>
            <hr />
            <button class="menu-item logout" onclick={requestLogout} role="menuitem">
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

{#if confirmLogout}
  <ConfirmDialog
    title="¿Cerrar sesión?"
    message="Tendrás que volver a iniciar sesión para acceder a tus gastos."
    confirmLabel="Cerrar sesión"
    variant="danger"
    busy={loggingOut}
    onconfirm={performLogout}
    oncancel={() => (confirmLogout = false)}
  />
{/if}

<style>
  /* Header: cristal CSS-only. No usa LiquidGlass component porque al ser
     full-width sin border-radius, la refracción física no aporta — solo
     fondo blurred + tinte + separator inferior. SIN isolation/transform
     porque convertirían al header en backdrop root y matarían el filtro. */
  header {
    position: sticky;
    top: 0;
    z-index: 100;
    view-transition-name: site-header;

    background: color-mix(in oklab, var(--color-bg-secondary) 64%, transparent);
    backdrop-filter: blur(22px) saturate(180%);
    -webkit-backdrop-filter: blur(22px) saturate(180%);

    border-bottom: 1px solid color-mix(in oklab, white 12%, transparent);
    box-shadow:
      inset 0 1px 0 0 color-mix(in oklab, white 35%, transparent),
      0 1px 0 0 color-mix(in oklab, black 4%, transparent);

    padding-top: var(--spacing-sm);
    padding-left: max(var(--safe-area-inset-left), var(--spacing-md));
    padding-right: max(var(--safe-area-inset-right), var(--spacing-md));
    padding-bottom: var(--spacing-sm);
  }

  @media (prefers-color-scheme: dark) {
    header {
      border-bottom-color: color-mix(in oklab, white 8%, transparent);
      box-shadow:
        inset 0 1px 0 0 color-mix(in oklab, white 14%, transparent),
        0 1px 0 0 rgba(0, 0, 0, 0.4);
    }
  }

  @supports not (backdrop-filter: blur(1px)) {
    header {
      background: var(--color-bg-secondary);
    }
  }

  /* Solo iOS: aplica el hack para que el fondo se extienda al notch y el contenido no se tape */
  :root.is-ios header {
    margin-top: calc(-1 * var(--safe-area-inset-top));
    padding-top: calc(var(--safe-area-inset-top) + var(--spacing-sm));
  }

  .header-content {
    max-width: 1280px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-md);
  }

  .app-title {
    font-size: var(--font-size-large-title);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    margin: var(--spacing-sm) 0;
    letter-spacing: -0.5px;
  }

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
    background: linear-gradient(135deg, var(--color-blue) 0%, #0051d5 100%);
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
    top: calc(100% + 8px);
    right: 0;
    background: var(--color-bg-primary);
    border: 1px solid var(--color-separator, var(--color-border, #e5e7eb));
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
    color: var(--color-text-primary);
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
    color: var(--color-red, #dc2626);
    font-weight: 600;
  }

  .menu-item.logout:hover {
    background: color-mix(in oklab, var(--color-red, #dc2626) 12%, transparent);
  }

  @media (max-width: 480px) {
    .app-title {
      font-size: var(--font-size-title-1);
    }

    .user-button {
      padding: 8px 12px;
      min-height: 44px;
      gap: 10px;
    }

    .user-label {
      display: none;
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
</style>
