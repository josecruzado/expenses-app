<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { authMethods } from '$lib/stores/auth';

  let isSignUp = $state(false);
  let email = $state('');
  let password = $state('');
  let confirmPassword = $state('');
  let loading = $state(false);
  let error = $state('');
  let showPassword = $state(false);
  let showConfirmPassword = $state(false);

  let emailTouched = $state(false);
  let passwordTouched = $state(false);

  const emailValid = $derived(!email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
  const passwordValid = $derived(!password || password.length >= 6);

  onMount(() => {
    document.body.classList.add('login-lock');
  });

  onDestroy(() => {
    document.body.classList.remove('login-lock');
  });

  function handleEmailInput() {
    emailTouched = true;
  }

  function handlePasswordInput() {
    passwordTouched = true;
  }

  function toggleMode() {
    isSignUp = !isSignUp;
    error = '';
    password = '';
    confirmPassword = '';
    showPassword = false;
    showConfirmPassword = false;
    passwordTouched = false;
  }

  async function handleEmailAuth(e?: SubmitEvent) {
    e?.preventDefault();
    if (!email || !password) {
      error = 'Por favor completa todos los campos';
      return;
    }
    if (!emailValid) {
      error = 'Por favor ingresa un correo electrónico válido';
      return;
    }
    if (isSignUp && password !== confirmPassword) {
      error = 'Las contraseñas no coinciden';
      return;
    }
    if (password.length < 6) {
      error = 'La contraseña debe tener al menos 6 caracteres';
      return;
    }

    loading = true;
    error = '';

    const result = isSignUp
      ? await authMethods.signUpWithEmail(email, password)
      : await authMethods.signInWithEmail(email, password);

    if (!result.success) {
      error = result.error ?? 'Ocurrió un error. Intenta nuevamente';
    }
    loading = false;
  }

  async function handleGoogleAuth() {
    loading = true;
    error = '';
    const result = await authMethods.signInWithGoogle();
    if (!result.success) {
      error = result.error ?? 'Ocurrió un error. Intenta nuevamente';
    }
    loading = false;
  }
</script>

<div class="login-container">
  <div class="login-card">
    <div class="logo">
      <div class="logo-icon">💰</div>
      <h1>Expenses</h1>
      <p>Controla tus gastos de manera inteligente</p>
    </div>

    <div class="auth-form">
      <h2>{isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}</h2>
      
      {#if error}
        <div class="error-message" role="alert" aria-live="assertive">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          {error}
        </div>
      {/if}

      <form onsubmit={handleEmailAuth}>
        <!-- Campo Email -->
        <div class="input-group">
          <div class="input-wrapper" class:error={emailTouched && !emailValid}>
            <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            <input
              type="email"
              name="email"
              autocomplete="email"
              inputmode="email"
              enterkeyhint="next"
              autocapitalize="off"
              autocorrect="off"
              spellcheck="false"
              aria-label="Correo electrónico"
              aria-invalid={emailTouched && !emailValid}
              aria-describedby={emailTouched && !emailValid && email ? 'email-error' : undefined}
              placeholder="Correo electrónico"
              bind:value={email}
              oninput={handleEmailInput}
              disabled={loading}
              class:error={emailTouched && !emailValid}
            />
            {#if emailTouched && emailValid && email}
              <svg class="validation-icon success" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="20,6 9,17 4,12"/>
              </svg>
            {/if}
          </div>
          {#if emailTouched && !emailValid && email}
            <div id="email-error" class="field-error">Ingresa un correo electrónico válido</div>
          {/if}
        </div>

        <!-- Campo Contraseña -->
        <div class="input-group">
          <div class="input-wrapper" class:error={passwordTouched && !passwordValid}>
            <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <circle cx="12" cy="16" r="1"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              autocomplete={isSignUp ? 'new-password' : 'current-password'}
              enterkeyhint={isSignUp ? 'next' : 'done'}
              aria-label="Contraseña"
              aria-invalid={passwordTouched && !passwordValid}
              aria-describedby={passwordTouched && !passwordValid && password ? 'password-error' : undefined}
              placeholder="Contraseña"
              bind:value={password}
              oninput={handlePasswordInput}
              disabled={loading}
              class:error={passwordTouched && !passwordValid}
            />
            {#if password}
              <button
                type="button"
                class="toggle-password"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={showPassword}
                onclick={() => (showPassword = !showPassword)}
                disabled={loading}
              >
                {#if showPassword}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                {:else}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                {/if}
              </button>
            {/if}
          </div>
          {#if passwordTouched && !passwordValid && password}
            <div id="password-error" class="field-error">La contraseña debe tener al menos 6 caracteres</div>
          {/if}
        </div>

        <!-- Campo Confirmar Contraseña (solo en registro) -->
        {#if isSignUp}
          <div class="input-group">
            <div class="input-wrapper">
              <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <circle cx="12" cy="16" r="1"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirm-password"
                autocomplete="new-password"
                enterkeyhint="done"
                aria-label="Confirmar contraseña"
                placeholder="Confirmar contraseña"
                bind:value={confirmPassword}
                disabled={loading}
              />
              {#if confirmPassword}
                <button
                  type="button"
                  class="toggle-password"
                  aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={showConfirmPassword}
                  onclick={() => (showConfirmPassword = !showConfirmPassword)}
                  disabled={loading}
                >
                  {#if showConfirmPassword}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  {:else}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  {/if}
                </button>
              {/if}
            </div>
            {#if confirmPassword && password !== confirmPassword}
              <div class="field-error">Las contraseñas no coinciden</div>
            {/if}
          </div>
        {/if}

        <button type="submit" class="btn-primary" disabled={loading}>
          {#if loading}
            <svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="2" x2="12" y2="6"/>
              <line x1="12" y1="18" x2="12" y2="22"/>
              <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
              <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
              <line x1="2" y1="12" x2="6" y2="12"/>
              <line x1="18" y1="12" x2="22" y2="12"/>
              <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/>
              <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
            </svg>
            Cargando...
          {:else}
            {isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}
          {/if}
        </button>
      </form>

      <div class="divider">
        <span>o</span>
      </div>

      <button type="button" class="btn-google" onclick={handleGoogleAuth} disabled={loading}>
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continuar con Google
      </button>

      <div class="toggle-mode">
        <p>
          {isSignUp ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}
          <button type="button" onclick={toggleMode} disabled={loading}>
            {isSignUp ? 'Inicia sesión' : 'Regístrate'}
          </button>
        </p>
      </div>
    </div>
  </div>
</div>

<style>
  /* Variables CSS para temas */
  :root {
    --bg-gradient: radial-gradient(ellipse at center, rgba(0, 122, 255, 0.1) 0%, transparent 50%), #ffffff;
    --card-bg: #ffffff;
    --card-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    --text-primary: #1f2937;
    --text-secondary: #6b7280;
    --border-color: #e5e7eb;
    --border-focus: #007aff;
    --border-error: #ef4444;
    --input-bg: #ffffff;
    --input-disabled: #f9fafb;
    --error-bg: #fef2f2;
    --error-border: #fecaca;
    --error-text: #dc2626;
    --success-gradient: linear-gradient(135deg, #007aff 0%, #0051d9 100%);
    --success-color: #10b981;
    --divider-bg: #e5e7eb;
    --google-btn-bg: #ffffff;
    --google-btn-border: #e5e7eb;
    --google-btn-hover: #f9fafb;
    --toggle-color: #007aff;
  }

  /* Dark mode variables */
  @media (prefers-color-scheme: dark) {
    :root {
      --bg-gradient: radial-gradient(ellipse at center, rgba(0, 122, 255, 0.15) 0%, transparent 50%), #000000;
      --card-bg: #1f2937;
      --card-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      --text-primary: #f9fafb;
      --text-secondary: #9ca3af;
      --border-color: #374151;
      --border-focus: #409cff;
      --border-error: #f87171;
      --input-bg: #374151;
      --input-disabled: #4b5563;
      --error-bg: #991b1b;
      --error-border: #dc2626;
      --error-text: #fca5a5;
      --success-gradient: linear-gradient(135deg, #409cff 0%, #007aff 100%);
      --success-color: #34d399;
      --divider-bg: #374151;
      --google-btn-bg: #374151;
      --google-btn-border: #4b5563;
      --google-btn-hover: #4b5563;
      --toggle-color: #409cff;
    }
  }

  /* Pintar y fijar el body SOLO cuando el login está visible */
  :global(body.login-lock) {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100dvh;
    overflow: hidden;
    overscroll-behavior: none;
    touch-action: none;
    background: var(--bg-gradient);
    transition: background 0.3s ease;
  }

  .login-container {
    position: fixed;
    inset: 0;
    height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    padding: max(var(--safe-area-inset-top), 1rem) max(var(--safe-area-inset-right), 1rem) max(var(--safe-area-inset-bottom), 1rem) max(var(--safe-area-inset-left), 1rem);
    overscroll-behavior: none;
  }

  .login-card {
    background: var(--card-bg);
    border-radius: 24px;
    padding: 2rem;
    width: 100%;
    max-width: 420px;
    box-shadow: var(--card-shadow);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.3s ease;
  }

  .logo {
    text-align: center;
    margin-bottom: 2rem;
  }

  .logo-icon {
    font-size: 3rem;
    margin-bottom: 0.5rem;
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
  }

  .logo h1 {
    margin: 0;
    font-size: 2.25rem;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
    font-weight: 700;
    letter-spacing: -0.025em;
  }

  .logo p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.95rem;
    font-weight: 500;
  }

  .auth-form h2 {
    text-align: center;
    margin-bottom: 1.5rem;
    color: var(--text-primary);
    font-size: 1.5rem;
    font-weight: 600;
  }

  .input-group {
    margin-bottom: 1rem;
  }

  .input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .input-wrapper.error input {
    border-color: var(--border-error);
  }

  .input-wrapper.error .input-icon {
    color: var(--border-error);
  }

  .input-icon {
    position: absolute;
    left: 1rem;
    color: var(--text-secondary);
    z-index: 1;
    transition: color 0.2s ease;
  }

  .input-wrapper:focus-within .input-icon {
    color: var(--border-focus);
  }

  .validation-icon {
    position: absolute;
    right: 1rem;
    z-index: 1;
    pointer-events: none;
  }

  .validation-icon.success {
    color: var(--success-color);
  }

  .toggle-password {
    position: absolute;
    right: 1rem;
    z-index: 1;
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 4px;
    transition: color 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .toggle-password:hover:not(:disabled) {
    color: var(--border-focus);
  }

  .toggle-password:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  input {
    width: 100%;
    padding: 0.875rem 3rem 0.875rem 3rem;
    border: 2px solid var(--border-color);
    border-radius: 12px;
    font-size: 1rem;
    transition: all 0.2s ease;
    box-sizing: border-box;
    background: var(--input-bg);
    color: var(--text-primary);
  }

  input.error {
    border-color: var(--border-error);
  }

  input::placeholder {
    color: var(--text-secondary);
  }

  input:focus {
    outline: none;
    border-color: var(--border-focus);
    box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
  }

  input.error:focus {
    border-color: var(--border-error);
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
  }

  input:disabled {
    background-color: var(--input-disabled);
    cursor: not-allowed;
    opacity: 0.7;
  }

  .field-error {
    color: var(--error-text);
    font-size: 0.8rem;
    margin-top: 0.25rem;
    margin-left: 0.5rem;
  }

  .btn-primary {
    width: 100%;
    padding: 0.875rem 1.5rem;
    background: var(--success-gradient);
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-bottom: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    position: relative;
    overflow: hidden;
  }

  .btn-primary::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%);
    transform: translateX(-100%);
    transition: transform 0.6s ease;
  }

  .btn-primary:hover:not(:disabled)::before {
    transform: translateX(100%);
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(0, 122, 255, 0.3);
  }

  .btn-primary:active:not(:disabled) {
    transform: translateY(0);
  }

  .btn-primary:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .spinner {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .divider {
    text-align: center;
    margin: 1.5rem 0;
    position: relative;
  }

  .divider::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background: var(--divider-bg);
  }

  .divider span {
    background: var(--card-bg);
    padding: 0 1rem;
    color: var(--text-secondary);
    font-weight: 500;
  }

  .btn-google {
    width: 100%;
    padding: 0.875rem 1.5rem;
    background: var(--google-btn-bg);
    border: 2px solid var(--google-btn-border);
    border-radius: 12px;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
    color: var(--text-primary);
    font-weight: 600;
    position: relative;
    overflow: hidden;
  }

  .btn-google::before {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--google-btn-hover);
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .btn-google:hover:not(:disabled)::before {
    opacity: 1;
  }

  .btn-google:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  }

  .btn-google:focus-visible {
    outline: 3px solid var(--border-focus);
    outline-offset: 2px;
  }

  .btn-google:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }

  .toggle-mode {
    text-align: center;
  }

  .toggle-mode p {
    color: var(--text-secondary);
    margin: 0;
    font-weight: 500;
  }

  .toggle-mode button {
    background: none;
    border: none;
    color: var(--toggle-color);
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    margin-left: 0.25rem;
    transition: all 0.2s ease;
    border-radius: 4px;
    padding: 0.25rem 0.5rem;
  }

  .toggle-mode button:hover:not(:disabled) {
    background: rgba(0, 122, 255, 0.1);
    text-decoration: underline;
  }

  .toggle-mode button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .error-message {
    background: var(--error-bg);
    border: 1px solid var(--error-border);
    color: var(--error-text);
    padding: 0.75rem 1rem;
    border-radius: 12px;
    margin-bottom: 1rem;
    font-size: 0.9rem;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  @media (max-width: 480px) {
    .login-card {
      padding: 1.5rem;
      margin: 1rem;
      border-radius: 20px;
    }

    .logo h1 {
      font-size: 2rem;
    }

    .auth-form h2 {
      font-size: 1.375rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
</style>