<script lang="ts">
    import { createEventDispatcher, onMount } from 'svelte';
    import { cubicOut } from 'svelte/easing';
    import { scale, fly } from 'svelte/transition';

    const dispatch = createEventDispatcher();

    let amount: number | null = null;
    let category = 'comida';
    let dateTime = new Date().toISOString().slice(0, 16);
    let notes = '';
    let formError: string | null = null;
    let isSaving = false;
    let showSuccess = false;
    

    const categories = [
        { id: 'comida', name: 'Comida', icon: '🍽️', color: '#FF6B6B' },
        { id: 'transporte', name: 'Transporte', icon: '🚗', color: '#4ECDC4' },
        { id: 'salud', name: 'Salud', icon: '🏥', color: '#45B7D1' },
        { id: 'entretenimiento', name: 'Entretenimiento', icon: '🎬', color: '#96CEB4' },
        { id: 'hogar', name: 'Hogar', icon: '🏠', color: '#FFEAA7' },
        { id: 'otros', name: 'Otros', icon: '📦', color: '#DDA0DD' }
    ];

    // Quick amount buttons - diferentes para móvil/desktop
    let quickAmounts = [10, 25, 50, 100, 200];
    let isMobile = false;

    let dialogElement: HTMLDialogElement;
    let amountInput: HTMLInputElement;
    let currentStep = 1;
    let maxSteps = 4;

    // Variables para gesture
    let startY: number | null = null;
    let currentY = 0;
    let isDragging = false;
    let dragProgress = 0;

    // Animation states
    let isVisible = false;
    let categoryAnimating = false;
    let amountPulse = false;

    onMount(() => {
        // Detectar si es móvil
        isMobile = window.innerWidth <= 768;
        
        // Ajustar quick amounts según el dispositivo
        if (isMobile) {
            quickAmounts = [5, 10, 25, 50, 100];
        } else {
            quickAmounts = [10, 25, 50, 100, 200, 500];
        }

        dialogElement.showModal();
        setTimeout(() => {
            isVisible = true;
            if (amountInput) {
                amountInput.focus();
            }
        }, 100);

        // Listener para cambios de orientación/resize
        const handleResize = () => {
            isMobile = window.innerWidth <= 768;
        };
        window.addEventListener('resize', handleResize);
        
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    });

    function handleClose() {
        isVisible = false;
        setTimeout(() => {
            dialogElement.close();
            dispatch('close');
        }, 200);
    }

    // Quick amount selection with improved feedback
    function selectQuickAmount(value: number) {
        amount = value;
        amountPulse = true;
        
        // Clear any existing error
        if (formError) {
            formError = null;
        }
        
        setTimeout(() => amountPulse = false, 300);
        
        // Haptic feedback simulation
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
        
        // Auto advance after selection on mobile
        if (isMobile) {
            setTimeout(() => {
                if (currentStep === 1 && amount === value) {
                    currentStep++;
                }
            }, 800);
        }
    }

    // Category selection with animation
    function selectCategory(categoryId: string) {
        if (category !== categoryId) {
            categoryAnimating = true;
            setTimeout(() => {
                category = categoryId;
                categoryAnimating = false;
                // Auto advance on mobile after category selection
                if (isMobile) {
                    setTimeout(() => {
                        if (currentStep === 2) nextStep();
                    }, 600);
                }
            }, 150);
        }
    }

    // Step navigation with better validation
    function nextStep() {
        if (currentStep < maxSteps) {
            const isValid = validateCurrentStep();
            if (isValid) {
                currentStep++;
            }
            // Don't block if validation fails - let the error message show
        }
    }

    function prevStep() {
        if (currentStep > 1) {
            currentStep--;
        }
    }

    function goToStep(step: number) {
        if (step <= currentStep || validateStepsUp(step)) {
            currentStep = step;
        }
    }

    function validateStepsUp(targetStep: number): boolean {
        for (let i = 1; i < targetStep; i++) {
            const originalStep = currentStep;
            currentStep = i;
            if (!validateCurrentStep()) {
                currentStep = originalStep;
                return false;
            }
        }
        return true;
    }

    async function handleSubmit() {
        if (!validateCurrentStep()) return;

        formError = null;
        isSaving = true;

        // Simulate saving animation
        await new Promise(resolve => setTimeout(resolve, 1200));

        showSuccess = true;
        
        setTimeout(() => {
            dispatch('save', {
                monto: amount,
                categoria: category,
                fecha: new Date(dateTime),
                nota: notes
            });
        }, 1000);
        setTimeout(() => {
            handleClose();
        }, 1400);
    }

    function validateCurrentStep(): boolean {
        formError = null; // Reset error first
        
        switch (currentStep) {
            case 1:
                // Allow both null and 0 for initial state, but require valid positive number to continue
                if (amount === null || amount === undefined) {
                    formError = 'Ingresa un monto.';
                    return false;
                }
                if (amount <= 0) {
                    formError = 'El monto debe ser mayor a 0.';
                    return false;
                }
                if (amount > 999999) {
                    formError = 'El monto es demasiado alto.';
                    return false;
                }
                break;
            case 2:
                if (!category) {
                    formError = 'Selecciona una categoría.';
                    return false;
                }
                break;
            case 3:
                if (!dateTime) {
                    formError = 'Selecciona fecha y hora.';
                    return false;
                }
                const selectedDate = new Date(dateTime);
                const now = new Date();
                if (selectedDate > now) {
                    formError = 'La fecha no puede ser futura.';
                    return false;
                }
                break;
        }
        return true;
    }

    // Enhanced gesture handling for mobile
    function handleTouchStart(e: TouchEvent) {
        if (!isMobile) return;
        startY = e.touches[0].clientY;
        isDragging = true;
        //e.preventDefault();
    }

    function handleTouchMove(e: TouchEvent) {
        if (!isDragging || startY === null || !isMobile) return;
        
        currentY = e.touches[0].clientY - startY;
        dragProgress = Math.min(Math.max(currentY / 200, 0), 1);
        
        if (currentY > 0) {
            dialogElement.style.transform = `translateY(${currentY * 0.5}px) scale(${1 - dragProgress * 0.03})`;
            dialogElement.style.opacity = `${1 - dragProgress * 0.2}`;
            dialogElement.style.transition = 'none';
        }
    }

    function handleTouchEnd() {
        if (!isDragging || !isMobile) return;
        isDragging = false;
        
        if (currentY > 120) {
            handleClose();
        } else {
            dialogElement.style.transform = '';
            dialogElement.style.opacity = '';
            dialogElement.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
        }
        startY = null;
        currentY = 0;
        dragProgress = 0;
    }

    // Keyboard navigation
    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            handleClose();
        } else if (e.key === 'Enter' && e.metaKey) {
            handleSubmit();
        } else if (e.key === 'ArrowRight' && currentStep < maxSteps) {
            nextStep();
        } else if (e.key === 'ArrowLeft' && currentStep > 1) {
            prevStep();
        }
    }

    // Get selected category details
    $: selectedCategory = categories.find(cat => cat.id === category);
    $: progressPercentage = (currentStep / maxSteps) * 100;

    // Quick date helpers
    function setToday() {
        dateTime = new Date().toISOString().slice(0, 16);
    }

    function setYesterday() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        dateTime = yesterday.toISOString().slice(0, 16);
    }

    function setThisWeek() {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        dateTime = weekAgo.toISOString().slice(0, 16);
    }

    // Method to show save error (called from parent)
    export function showSaveError(errorMsg: string) {
        isSaving = false;
        formError = errorMsg;
        showSuccess = false;
    }

    // Format amount for display
    function formatAmount(value: number): string {
        return new Intl.NumberFormat('es-ES', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }
</script>

<svelte:window on:keydown={handleKeydown} />

<dialog
    bind:this={dialogElement}
    on:close={handleClose}
    on:click|self={handleClose}
    class="enhanced-modal"
    class:visible={isVisible}
    class:mobile={isMobile}
>
    <!-- Success Toast (simple) -->
    {#if showSuccess}
        <div class="success-toast" transition:fly={{ y: 12, duration: 200, easing: cubicOut }}>
            <svg class="success-check" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" opacity="0.15"/>
                <path d="M6.5 12.5l3 3 8-8" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span class="st-title">Guardado</span>
            <span class="st-amount">${formatAmount(amount || 0)}</span>
            <button class="st-btn" type="button" on:click={handleClose}>Listo</button>
        </div>
    {/if}

    <div class="modal-content" class:success={showSuccess} class:mobile={isMobile}>
        <!-- Drag Indicator (only on mobile) -->
        {#if isMobile}
            <div
                class="drag-indicator"
                style="opacity: {1 - dragProgress}"
                on:touchstart|passive={handleTouchStart}
                on:touchmove|passive={handleTouchMove}
                on:touchend={handleTouchEnd}
            ></div>
        {/if}
        
        <!-- Progress Bar -->
        <div class="progress-container">
            <div class="progress-track">
                <div class="progress-bar" style="width: {progressPercentage}%"></div>
            </div>
            <div class="step-indicators">
                {#each Array(maxSteps) as _, i}
                    <button 
                        class="step-dot" 
                        class:active={i + 1 <= currentStep}
                        class:current={i + 1 === currentStep}
                        class:clickable={i + 1 <= currentStep}
                        on:click={() => goToStep(i + 1)}
                        disabled={isSaving || i + 1 > currentStep}
                        title="Paso {i + 1}"
                    >
                        {#if i + 1 < currentStep}
                            ✓
                        {:else}
                            {i + 1}
                        {/if}
                    </button>
                {/each}
            </div>
        </div>

        <!-- Header with dynamic title -->
        <div class="header">
            <h2 class="modal-title">
                {#if currentStep === 1}
                    💰 ¿Cuánto gastaste?
                {:else if currentStep === 2}
                    📂 ¿En qué categoría?
                {:else if currentStep === 3}
                    📅 ¿Cuándo fue?
                {:else}
                    📝 Detalles finales
                {/if}
            </h2>
            {#if currentStep > 1 && !isMobile}
                <button class="back-btn" on:click={prevStep} disabled={isSaving}>
                    ← Atrás
                </button>
            {/if}
        </div>

        <form on:submit|preventDefault={handleSubmit} class="expense-form">
            <!-- Step 1: Amount -->
            {#if currentStep === 1}
                <div class="step-content" transition:fly={{ x: -100, duration: 300, easing: cubicOut }}>
                    <div class="amount-section">
                        <div class="currency-input" class:pulse={amountPulse}>
                            <span class="currency-symbol">$</span>
                            <input
                                type="number"
                                bind:value={amount}
                                placeholder="0.00"
                                step="0.01"
                                min="0.01"
                                max="999999"
                                inputmode="decimal"
                                bind:this={amountInput}
                                class="amount-input"
                                autocomplete="off"
                                on:input={() => {
                                    // Clear error when user starts typing
                                    if (formError) {
                                        formError = null;
                                    }
                                }}
                            />
                        </div>
                        
                        <div class="quick-amounts">
                            <p class="quick-label">Montos rápidos:</p>
                            <div class="quick-buttons" class:mobile={isMobile}>
                                {#each quickAmounts as quickAmount, index}
                                    <button
                                        type="button"
                                        class="quick-btn"
                                        class:selected={amount === quickAmount}
                                        on:click={() => selectQuickAmount(quickAmount)}
                                        style="--delay: {index * 100}ms"
                                    >
                                        ${quickAmount}
                                    </button>
                                {/each}
                            </div>
                        </div>

                        {#if !isMobile}
                            <div class="amount-tips">
                                <p class="tip">💡 Usa las teclas ← → para navegar entre pasos</p>
                            </div>
                        {/if}
                    </div>
                </div>
            {/if}

            <!-- Step 2: Category -->
            {#if currentStep === 2}
                <div class="step-content" transition:fly={{ x: -100, duration: 300, easing: cubicOut }}>
                    <div class="category-grid" class:mobile={isMobile}>
                        {#each categories as cat, index}
                            <button
                                type="button"
                                class="category-card"
                                class:selected={category === cat.id}
                                class:animating={categoryAnimating}
                                style="--category-color: {cat.color}; --delay: {index * 80}ms"
                                on:click={() => selectCategory(cat.id)}
                                transition:scale={{ delay: index * 80, duration: 250 }}
                            >
                                <div class="category-icon">{cat.icon}</div>
                                <span class="category-name">{cat.name}</span>
                                
                            </button>
                        {/each}
                    </div>
                </div>
            {/if}

            <!-- Step 3: Date/Time -->
            {#if currentStep === 3}
                <div class="step-content" transition:fly={{ x: -100, duration: 300, easing: cubicOut }}>
                    <div class="datetime-section">
                        <label for="date" class="datetime-label">Fecha y Hora</label>
                        <input 
                            type="datetime-local" 
                            id="date" 
                            bind:value={dateTime} 
                            required 
                            class="datetime-input"
                        />
                        
                        <div class="quick-dates" class:mobile={isMobile}>
                            <button type="button" class="quick-date-btn" on:click={setToday}>
                                🕐 Ahora
                            </button>
                            <button type="button" class="quick-date-btn" on:click={setYesterday}>
                                📅 Ayer
                            </button>
                            {#if !isMobile}
                                <button type="button" class="quick-date-btn" on:click={setThisWeek}>
                                    📆 Hace 1 semana
                                </button>
                            {/if}
                        </div>

                        <div class="date-preview">
                            <span class="preview-label">Vista previa:</span>
                            <span class="preview-value">
                                {new Date(dateTime).toLocaleDateString('es-ES', { 
                                    weekday: 'long', 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </span>
                        </div>
                    </div>
                </div>
            {/if}

            <!-- Step 4: Notes -->
            {#if currentStep === 4}
                <div class="step-content" transition:fly={{ x: -100, duration: 300, easing: cubicOut }}>
                    <div class="notes-section">
                        <label for="notes" class="notes-label">Notas (opcional)</label>
                        <textarea 
                            id="notes" 
                            bind:value={notes} 
                            placeholder="Añade detalles sobre este gasto..."
                            class="notes-textarea"
                            maxlength="500"
                        ></textarea>
                        
                        <div class="char-counter">
                            {notes.length}/500 caracteres
                        </div>

                        <!-- Enhanced Summary -->
                        <div class="summary-card">
                            <h3>📋 Resumen del Gasto</h3>
                            <div class="summary-grid">
                                <div class="summary-item">
                                    <span class="summary-icon">💰</span>
                                    <div class="summary-content">
                                        <span class="summary-label">Monto</span>
                                        <span class="summary-value highlight">${formatAmount(amount || 0)}</span>
                                    </div>
                                </div>
                                <div class="summary-item">
                                    <span class="summary-icon">{selectedCategory?.icon}</span>
                                    <div class="summary-content">
                                        <span class="summary-label">Categoría</span>
                                        <span class="summary-value">{selectedCategory?.name}</span>
                                    </div>
                                </div>
                                <div class="summary-item">
                                    <span class="summary-icon">📅</span>
                                    <div class="summary-content">
                                        <span class="summary-label">Fecha</span>
                                        <span class="summary-value">
                                            {new Date(dateTime).toLocaleDateString('es-ES')}
                                        </span>
                                    </div>
                                </div>
                                {#if notes.trim()}
                                    <div class="summary-item full-width">
                                        <span class="summary-icon">📝</span>
                                        <div class="summary-content">
                                            <span class="summary-label">Notas</span>
                                            <span class="summary-value">{notes.trim()}</span>
                                        </div>
                                    </div>
                                {/if}
                            </div>
                        </div>
                    </div>
                </div>
            {/if}

            <!-- Error Message -->
            {#if formError}
                <div class="error-message" transition:fly={{ y: 20, duration: 200 }}>
                    <span class="error-icon">⚠️</span>
                    {formError}
                </div>
            {/if}

            <!-- Action Buttons -->
            <div class="action-buttons" class:mobile={isMobile}>
                {#if currentStep < maxSteps}
                    <button 
                        type="button" 
                        class="secondary-btn" 
                        on:click={handleClose} 
                        disabled={isSaving}
                    >
                        Cancelar
                    </button>
                    <button 
                        type="button" 
                        class="primary-btn" 
                        on:click={nextStep}
                        disabled={isSaving}
                    >
                        {isMobile ? 'Siguiente' : 'Siguiente →'}
                    </button>
                {:else}
                    {#if isMobile}
                        <button 
                            type="button" 
                            class="back-btn-mobile" 
                            on:click={prevStep} 
                            disabled={isSaving}
                        >
                            ← Atrás
                        </button>
                    {/if}
                    <button 
                        type="submit" 
                        class="primary-btn save-btn" 
                        disabled={isSaving}
                        class:loading={isSaving}
                        class:mobile={isMobile}
                    >
                        {#if isSaving}
                            <span class="spinner"></span> Guardando...
                        {:else}
                            💾 Guardar Gasto
                        {/if}
                    </button>
                    {#if !isMobile}
                        <button 
                            type="button" 
                            class="secondary-btn" 
                            on:click={prevStep} 
                            disabled={isSaving}
                        >
                            ← Atrás
                        </button>
                    {/if}
                {/if}
            </div>
        </form>
    </div>
</dialog>

<style>
    :root {
        --primary-color: #007aff;
        --primary-dark: #0051d5;
        --secondary-bg: #f2f2f7;
        --border-color: #ddd;
        --text-primary: #111;
        --text-secondary: #666;
        --error-color: #d93025;
        --success-color: #34c759;
        --warning-color: #ff9500;
        --surface-color: #fff;
        --shadow-light: rgba(0, 0, 0, 0.05);
        --shadow-medium: rgba(0, 0, 0, 0.1);
        --shadow-heavy: rgba(0, 0, 0, 0.2);
    }

    @media (prefers-color-scheme: dark) {
        :root {
            --primary-color: #0a84ff;
            --primary-dark: #005bb5;
            --secondary-bg: #1c1c1e;
            --border-color: #38383a;
            --text-primary: #f5f5f7;
            --text-secondary: #a1a1aa;
            --error-color: #ff453a;
            --success-color: #30d158;
            --surface-color: #2c2c2e;
            --shadow-light: rgba(255, 255, 255, 0.05);
            --shadow-medium: rgba(255, 255, 255, 0.1);
            --shadow-heavy: rgba(0, 0, 0, 0.4);
        }
    }

    .enhanced-modal {
        background: transparent;
        padding: 0;
        border: none;
        width: 100vw;
        height: 100vh;
        max-width: none;
        max-height: none;
        margin: 0;
        top: 0;
        left: 0;
        position: fixed;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        overflow: hidden;
        opacity: 0;
        transform: translateY(100%);
        transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .enhanced-modal.visible {
        opacity: 1;
        transform: translateY(0);
    }

    .enhanced-modal::backdrop {
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(5px);
        opacity: 0;
        transition: all 0.4s ease;
    }

    .enhanced-modal.visible::backdrop {
        opacity: 1;
    }

    .modal-content {
        background: var(--surface-color);
        width: 100%;
        height: 100vh;
        padding: 2rem 1.5rem;
        border-radius: 25px 25px 0 0;
        position: relative;
        overflow-y: auto;
        transition: all 0.3s ease;
        display: flex;
        flex-direction: column;
        box-shadow: 0 -10px 40px var(--shadow-medium);
        margin: 0;
    }

    .modal-content.mobile {
        height: 90vh;
        padding: 1.5rem 1rem;
    }

        /* Suaviza el contenido mientras aparece el toast (sin blur pesado) */
    .modal-content.success {
        opacity: 0.5;
        filter: none;
        pointer-events: none;
    }

    /* Toast compacto */
    .success-toast {
        position: absolute;
        left: 50%;
        bottom: 16px;
        transform: translateX(-50%);
        z-index: 1100;
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        border-radius: 12px;
        background: var(--surface-color);
        color: var(--text-primary);
        border: 1px solid var(--border-color);
        box-shadow: 0 8px 24px var(--shadow-medium);
    }

    .success-check {
        width: 20px;
        height: 20px;
        color: var(--success-color);
        flex: 0 0 auto;
    }

    .st-title {
        font-weight: 800;
        font-size: 0.95rem;
    }

    .st-amount {
        font-weight: 800;
        color: var(--success-color);
        font-size: 0.95rem;
    }

    .st-btn {
        margin-left: 6px;
        padding: 6px 10px;
        border-radius: 10px;
        border: 1px solid var(--border-color);
        background: transparent;
        color: var(--text-primary);
        font-weight: 700;
        cursor: pointer;
    }

    .st-btn:hover {
        background: rgba(0,0,0,0.04);
    }

    @keyframes successBounce {
        0%, 20%, 60%, 100% { transform: translateY(0) scale(1); }
        40% { transform: translateY(-30px) scale(1.1); }
        80% { transform: translateY(-15px) scale(1.05); }
    }

    .drag-indicator {
        width: 40px;
        height: 5px;
        background: var(--border-color);
        border-radius: 3px;
        margin: 0 auto 1.5rem;
        transition: opacity 0.2s ease;
    }

    .progress-container {
        margin-bottom: 2rem;
        position: relative;
    }

    .progress-track {
        height: 6px;
        background: var(--border-color);
        border-radius: 3px;
        overflow: hidden;
    }

    .progress-bar {
        height: 100%;
        background: linear-gradient(90deg, var(--primary-color), var(--primary-dark));
        border-radius: 3px;
        transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
    }

    .progress-bar::after {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
        animation: shimmer 2s infinite;
    }

    @keyframes shimmer {
        0% { left: -100%; }
        100% { left: 100%; }
    }

    .step-indicators {
        display: flex;
        justify-content: space-between;
        margin-top: 1rem;
        gap: 0.5rem;
    }

    .step-dot {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        border: 2px solid var(--border-color);
        background: var(--surface-color);
        color: var(--text-secondary);
        font-weight: 700;
        font-size: 0.9rem;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        align-items: center;
        justify-content: center;
        flex: 1;
        max-width: 44px;
    }

    .step-dot.active {
        background: var(--primary-color);
        color: white;
        border-color: var(--primary-color);
        box-shadow: 0 2px 8px rgba(0, 122, 255, 0.3);
    }

    .step-dot.current {
        transform: scale(1.15);
        box-shadow: 0 6px 16px rgba(0, 122, 255, 0.4);
    }

    .step-dot.clickable:hover {
        transform: scale(1.05);
    }

    .step-dot:disabled {
        cursor: not-allowed;
        opacity: 0.6;
    }

    .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 2rem;
        flex-shrink: 0;
    }

    .modal-title {
        font-size: 1.5rem;
        font-weight: 800;
        color: var(--text-primary);
        margin: 0;
        flex: 1;
    }

    .back-btn {
        background: none;
        border: none;
        color: var(--primary-color);
        font-size: 1rem;
        cursor: pointer;
        padding: 0.75rem;
        border-radius: 12px;
        transition: all 0.2s ease;
        font-weight: 600;
    }

    .back-btn:hover:not(:disabled) {
        background: rgba(0, 122, 255, 0.1);
        transform: translateX(-2px);
    }

    .expense-form {
        display: flex;
        flex-direction: column;
        flex: 1;
    }

    .step-content {
        margin-bottom: 2rem;
        min-height: 300px;
        flex: 1;
    }

    /* Amount Step Styles */
    .amount-section {
        text-align: center;
        display: flex;
        flex-direction: column;
        gap: 2rem;
    }

    .currency-input {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        transition: transform 0.2s ease;
    }

    .currency-input.pulse {
        animation: pulse 0.4s ease;
    }

    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.08); }
        100% { transform: scale(1); }
    }

    .currency-symbol {
        font-size: 3.5rem;
        color: var(--primary-color);
        font-weight: 900;
        text-shadow: 0 2px 4px var(--shadow-light);
    }

    .amount-input {
        font-size: 3.5rem;
        border: none;
        background: transparent;
        color: var(--text-primary);
        text-align: left;
        width: auto;
        max-width: 350px;
        font-weight: 900;
        outline: none;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    }

    .amount-input::-webkit-outer-spin-button,
    .amount-input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }

    .amount-input[type=number] {
        -moz-appearance: textfield;
    }

    .quick-label {
        color: var(--text-secondary);
        margin-bottom: 1rem;
        font-weight: 600;
        font-size: 1.1rem;
    }

    .quick-buttons {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
        gap: 1rem;
        justify-content: center;
        max-width: 500px;
        margin: 0 auto;
    }

    .quick-buttons.mobile {
        grid-template-columns: repeat(3, 1fr);
        gap: 0.75rem;
    }

    .quick-btn {
        padding: 1rem 1.5rem;
        border: 2px solid var(--border-color);
        background: var(--surface-color);
        color: var(--text-primary);
        border-radius: 20px;
        font-weight: 700;
        font-size: 1rem;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
        animation: slideUp 0.4s ease forwards;
        animation-delay: var(--delay);
        opacity: 0;
        transform: translateY(20px);
        box-shadow: 0 2px 8px var(--shadow-light);
    }

    @keyframes slideUp {
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .quick-btn::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
        transition: left 0.5s ease;
    }

    .quick-btn:hover::before {
        left: 100%;
    }

    .quick-btn:hover, .quick-btn.selected {
        border-color: var(--primary-color);
        background: var(--primary-color);
        color: white;
        transform: translateY(-4px);
        box-shadow: 0 8px 24px rgba(0, 122, 255, 0.4);
    }

    .amount-tips {
        margin-top: 2rem;
        opacity: 0.7;
    }

    .tip {
        font-size: 0.9rem;
        color: var(--text-secondary);
        font-style: italic;
    }

    /* Category Step Styles */
    .category-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1.25rem;
    }

    .category-grid.mobile {
        grid-template-columns: 1fr;
        gap: 1rem;
    }

    .category-card {
        padding: 2rem 1.5rem;
        border: 2px solid var(--border-color);
        background: var(--surface-color);
        border-radius: 24px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
        animation: categorySlide 0.5s ease forwards;
        animation-delay: var(--delay);
        opacity: 0;
        transform: translateY(30px);
        box-shadow: 0 4px 16px var(--shadow-light);
        overflow: hidden;
    }

    @keyframes categorySlide {
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .category-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, var(--category-color), transparent);
        opacity: 0;
        transition: opacity 0.3s ease;
    }

    .category-card:hover::before {
        opacity: 0.1;
    }

    .category-card:hover {
        transform: translateY(-8px) scale(1.02);
        box-shadow: 0 12px 32px var(--shadow-medium);
    }

    .category-card.selected {
        border-color: var(--category-color);
        background: var(--category-color);
        color: white;
        transform: scale(1.05);
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
    }

    .category-card.selected::before {
        opacity: 0.2;
    }

    .category-icon {
        font-size: 2.5rem;
        transition: all 0.3s ease;
        filter: drop-shadow(0 2px 4px var(--shadow-light));
    }

    .category-card.selected .category-icon {
        transform: scale(1.2) rotate(5deg);
        filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
    }

    .category-name {
        font-weight: 700;
        font-size: 1rem;
        text-align: center;
    }

    /* DateTime Step Styles */
    .datetime-section {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .datetime-label {
        font-size: 1.2rem;
        font-weight: 700;
        color: var(--text-primary);
    }

    .datetime-input {
        padding: 1.25rem 1.5rem;
        border: 2px solid var(--border-color);
        border-radius: 20px;
        font-size: 1.1rem;
        background: var(--surface-color);
        color: var(--text-primary);
        transition: all 0.3s ease;
        font-weight: 600;
        box-shadow: 0 2px 8px var(--shadow-light);
    }

    .datetime-input:focus {
        border-color: var(--primary-color);
        outline: none;
        box-shadow: 0 0 0 4px rgba(0, 122, 255, 0.1);
        transform: translateY(-2px);
    }

    .quick-dates {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 1rem;
    }

    .quick-dates.mobile {
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
    }

    .quick-date-btn {
        padding: 1rem 1.25rem;
        border: 2px solid var(--border-color);
        background: var(--surface-color);
        color: var(--text-primary);
        border-radius: 16px;
        font-weight: 600;
        font-size: 0.95rem;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px var(--shadow-light);
    }

    .quick-date-btn:hover {
        border-color: var(--primary-color);
        background: var(--primary-color);
        color: white;
        transform: translateY(-2px);
        box-shadow: 0 4px 16px rgba(0, 122, 255, 0.3);
    }

    .date-preview {
        background: var(--secondary-bg);
        padding: 1.25rem;
        border-radius: 16px;
        border: 1px solid var(--border-color);
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .preview-label {
        font-size: 0.9rem;
        color: var(--text-secondary);
        font-weight: 600;
    }

    .preview-value {
        font-size: 1rem;
        color: var(--text-primary);
        font-weight: 700;
        text-transform: capitalize;
    }

    /* Notes Step Styles */
    .notes-section {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .notes-label {
        font-size: 1.2rem;
        font-weight: 700;
        color: var(--text-primary);
    }

    .notes-textarea {
        padding: 1.25rem;
        border: 2px solid var(--border-color);
        border-radius: 20px;
        font-size: 1rem;
        background: var(--surface-color);
        color: var(--text-primary);
        min-height: 120px;
        resize: vertical;
        transition: all 0.3s ease;
        font-family: inherit;
        line-height: 1.5;
        box-shadow: 0 2px 8px var(--shadow-light);
    }

    .notes-textarea:focus {
        border-color: var(--primary-color);
        outline: none;
        box-shadow: 0 0 0 4px rgba(0, 122, 255, 0.1);
    }

    .char-counter {
        text-align: right;
        font-size: 0.85rem;
        color: var(--text-secondary);
        font-weight: 500;
    }

    .summary-card {
        background: var(--secondary-bg);
        padding: 2rem;
        border-radius: 24px;
        border: 2px solid var(--border-color);
        box-shadow: 0 4px 16px var(--shadow-light);
    }

    .summary-card h3 {
        margin: 0 0 1.5rem 0;
        color: var(--text-primary);
        font-size: 1.3rem;
        font-weight: 800;
    }

    .summary-grid {
        display: grid;
        gap: 1.25rem;
    }

    .summary-item {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        background: var(--surface-color);
        border-radius: 16px;
        border: 1px solid var(--border-color);
        transition: transform 0.2s ease;
    }

    .summary-item:hover {
        transform: translateY(-2px);
    }

    .summary-item.full-width {
        grid-column: 1 / -1;
        align-items: flex-start;
    }

    .summary-icon {
        font-size: 1.5rem;
        flex-shrink: 0;
    }

    .summary-content {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        flex: 1;
    }

    .summary-label {
        color: var(--text-secondary);
        font-weight: 600;
        font-size: 0.9rem;
    }

    .summary-value {
        color: var(--text-primary);
        font-weight: 700;
        font-size: 1rem;
    }

    .summary-value.highlight {
        color: var(--primary-color);
        font-size: 1.25rem;
    }

    /* Error message */
    .error-message {
        background: linear-gradient(135deg, rgba(255, 59, 48, 0.1), rgba(255, 59, 48, 0.05));
        color: var(--error-color);
        padding: 1.25rem 1.5rem;
        border-radius: 16px;
        text-align: center;
        font-weight: 600;
        border: 2px solid rgba(255, 59, 48, 0.2);
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        box-shadow: 0 4px 16px rgba(255, 59, 48, 0.1);
    }

    .error-icon {
        font-size: 1.2rem;
    }

    /* Action buttons */
    .action-buttons {
        display: flex;
        gap: 1rem;
        margin-top: auto;
        padding-top: 2rem;
        flex-shrink: 0;
    }

    .action-buttons.mobile {
        flex-direction: column-reverse;
        gap: 0.75rem;
    }

    .primary-btn, .secondary-btn, .back-btn-mobile {
        flex: 1;
        padding: 1.25rem 2rem;
        border: none;
        border-radius: 20px;
        font-weight: 700;
        font-size: 1rem;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        min-height: 56px;
        position: relative;
        overflow: hidden;
    }

    .primary-btn {
        background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
        color: white;
        box-shadow: 0 6px 20px rgba(0, 122, 255, 0.4);
    }

    .primary-btn::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
        transition: left 0.5s ease;
    }

    .primary-btn:hover:not(:disabled)::before {
        left: 100%;
    }

    .primary-btn:hover:not(:disabled) {
        transform: translateY(-3px);
        box-shadow: 0 8px 28px rgba(0, 122, 255, 0.5);
    }

    .primary-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
        box-shadow: 0 2px 8px rgba(0, 122, 255, 0.2);
    }

    .secondary-btn, .back-btn-mobile {
        background: var(--surface-color);
        color: var(--text-primary);
        border: 2px solid var(--border-color);
        box-shadow: 0 2px 8px var(--shadow-light);
    }

    .secondary-btn:hover:not(:disabled), .back-btn-mobile:hover:not(:disabled) {
        border-color: var(--primary-color);
        color: var(--primary-color);
        transform: translateY(-2px);
        box-shadow: 0 4px 16px var(--shadow-medium);
    }

    .save-btn.loading {
        position: relative;
        pointer-events: none;
    }

    .save-btn.mobile {
        order: -1;
    }

    .back-btn-mobile {
        max-width: 120px;
        align-self: flex-start;
        margin-bottom: 1rem;
    }

    .spinner {
        width: 20px;
        height: 20px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top: 2px solid white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    /* Responsive Design */
    @media (max-width: 480px) {
        .modal-content {
            padding: 1.25rem 1rem;
            border-radius: 20px 20px 0 0;
            height: 95vh;
        }

        .currency-symbol,
        .amount-input {
            font-size: 2.8rem;
        }

        .category-icon {
            font-size: 2rem;
        }

        .category-card {
            padding: 1.5rem 1rem;
        }

        .step-dot {
            width: 40px;
            height: 40px;
            font-size: 0.85rem;
        }

        .modal-title {
            font-size: 1.3rem;
        }

        .summary-grid {
            grid-template-columns: 1fr;
        }
    }

    @media (min-width: 769px) {
        .enhanced-modal {
            align-items: center;
            justify-content: center;
        }

        .modal-content {
            width: 90%;
            max-width: 600px;
            height: auto;
            max-height: 90vh;
            border-radius: 32px;
            box-shadow: 0 24px 48px var(--shadow-heavy);
            padding: 3rem 2.5rem;
        }

        .category-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 1.5rem;
        }

        .quick-buttons {
            max-width: 600px;
        }

        .summary-grid {
            grid-template-columns: repeat(2, 1fr);
        }

        .step-content {
            min-height: 400px;
        }
    }

    @media (min-width: 1024px) {
        .modal-content {
            max-width: 700px;
            padding: 3.5rem 3rem;
            max-height: 85vh;
        }

        .category-grid {
            gap: 2rem;
        }

        .category-card {
            padding: 2.5rem 2rem;
        }
    }

    /* Dark mode enhancements */
    @media (prefers-color-scheme: dark) {
        .success-toast { box-shadow: 0 8px 24px rgba(0,0,0,0.5); }
        .st-btn:hover { background: rgba(255,255,255,0.06); }

        .modal-content {
            background: var(--surface-color);
            border: 1px solid var(--border-color);
        }

        .summary-card {
            background: var(--secondary-bg);
            border-color: var(--border-color);
        }

        .category-card:hover {
            box-shadow: 0 12px 32px rgba(255, 255, 255, 0.1);
        }

        .enhanced-modal::backdrop {
            background: rgba(0, 0, 0, 0.85);
        }

        .primary-btn {
            box-shadow: 0 6px 20px rgba(10, 132, 255, 0.3);
        }

        .primary-btn:hover:not(:disabled) {
            box-shadow: 0 8px 28px rgba(10, 132, 255, 0.4);
        }
    }

    /* Focus states for accessibility */
    .step-dot:focus,
    .quick-btn:focus,
    .category-card:focus,
    .primary-btn:focus,
    .secondary-btn:focus,
    .back-btn-mobile:focus,
    .quick-date-btn:focus {
        outline: 3px solid var(--primary-color);
        outline-offset: 2px;
    }

    /* Touch improvements */
    @media (hover: none) and (pointer: coarse) {
        .step-dot,
        .quick-btn,
        .category-card,
        .primary-btn,
        .secondary-btn,
        .back-btn-mobile,
        .quick-date-btn {
            min-height: 48px;
        }

        .category-card {
            padding: 2rem 1.5rem;
        }

        .quick-btn:active,
        .category-card:active,
        .primary-btn:active,
        .secondary-btn:active {
            transform: scale(0.98);
        }
    }

    /* High contrast mode support */
    @media (prefers-contrast: high) {
        .primary-btn {
            border: 3px solid white;
        }
        
        .category-card.selected {
            border-width: 4px;
        }
        
        .progress-bar {
            height: 8px;
        }

        .step-dot {
            border-width: 3px;
        }
    }

    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
        .enhanced-modal,
        .category-card,
        .step-dot,
        .primary-btn,
        .secondary-btn,
        .quick-btn,
        .summary-item {
            transition: none;
        }
        
        .progress-bar::after,
        .quick-btn::before,
        .primary-btn::before {
            animation: none;
        }
        
        .spinner {
            animation: none;
            border-top-color: transparent;
        }

        .currency-input.pulse {
            animation: none;
        }

        .quick-btn,
        .category-card {
            opacity: 1;
            transform: translateY(0);
            animation: none;
        }
    }

    /* Print styles */
    @media print {
        .enhanced-modal {
            position: static;
            background: white;
        }

        .modal-content {
            box-shadow: none;
            border: 1px solid #000;
        }

        .action-buttons {
            display: none;
        }
    }
</style>