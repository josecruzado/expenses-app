<script lang="ts">
    import { formatCurrency } from '$lib/services/gastosService';
    import { createEventDispatcher, onMount } from 'svelte';
    import { fly } from 'svelte/transition';
    import { categorias, categoriaService, type Categoria } from "$lib/services/categoriaService";
    import { Timestamp } from 'firebase/firestore';

    const dispatch = createEventDispatcher();

    let description = '';
    let amount: number | null = null;
    let category = 'Otros';
    let icon = '📦';
    let formError: string | null = null;
    let isSaving = false;
    let showSuccess = false;
    let isLoadingCategory = false;
    let showCategoryDropdown = false;

    // Configuración de API
    const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY as string;

    let dialogElement: HTMLDialogElement | null = null;
    let descriptionInput: HTMLInputElement;

    function getLocalDateTimeValue(d = new Date()) {
        const tz = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - tz).toISOString().slice(0, 16);
    }
    let fecha: string = getLocalDateTimeValue();

    // Variable reactiva para debug y validación
    $: {
        const categoriasCount = $categorias?.length || 0;
        console.log('🔍 DEBUG - Categorías disponibles:', categoriasCount);
        console.log('📋 Categorías completas:', $categorias);
        console.log('✅ Categoría actual:', category, icon);
        
        // Si no hay categorías pero el store existe, forzar recarga
        if (categoriasCount === 0 && $categorias !== undefined) {
            console.warn('⚠️ Store de categorías vacío, posible problema de contexto');
        }
    }

    // Validar que el store esté disponible
    $: isStoreReady = $categorias !== undefined && $categorias !== null;

    onMount(() => {
        dialogElement?.showModal();
        
        const timer = setTimeout(() => {
            if (descriptionInput) {
                descriptionInput.focus();
            }
        }, 200);

        return () => {
            clearTimeout(timer);
        };
    });

    function handleClose(e?: Event) {
        showCategoryDropdown = false;
        const dlg = (e?.currentTarget as HTMLDialogElement) ?? dialogElement;
        if (dlg?.open) {
            dlg.close();
        }
        dispatch('close');
    }

    // AI Category suggestion - funcionalidad principal
    async function suggestCategory() {
        if (!description.trim() || !GROQ_API_KEY) return;

        isLoadingCategory = true;
        formError = null;

        try {
            // Acceder reactivamente al store de categorías
            const userCategories = $categorias || [];
            const categoriesList = userCategories.map(c => `${c.name} (${c.icon})`).join(", ");

            console.log("User categories for AI:", categoriesList);

            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${GROQ_API_KEY}`,
                },
                body: JSON.stringify({
                    model: "meta-llama/llama-4-scout-17b-16e-instruct",
                    messages: [
                    {
                            role: "system",
                            content: `Eres un asistente experto en clasificar gastos personales.
                            Las categorías disponibles del usuario son: ${categoriesList}.

                            Instrucciones:
                            1. Analiza el gasto y verifica si corresponde EXACTAMENTE o guarda relación directa con alguna categoría de la lista del usuario.
                            - Si coincide o tiene relación clara, usa esa categoría y su icono.
                            2. Si no coincide con ninguna, crea UNA nueva categoría simple y clara, con un icono (emoji) que la represente.
                            3. El campo "icono" debe ser siempre un EMOJI estándar (ejemplo: 🍽️, 🚗, 🏥, 🎬, 🏠, 📦).
                            - No uses texto, palabras, símbolos ASCII ni imágenes.
                            4. Nunca combines dos categorías en una. Ejemplo prohibido: "Parlante Electrodomésticos".
                            5. No inventes frases largas ni explicaciones. La salida debe ser estrictamente un JSON válido.

                            Formato de salida obligatorio:
                            {"categoria": "<nombre_categoria>", "icono": "<emoji>"}`,
                        },
                        {
                            role: "user",
                            content: `Clasifica el siguiente gasto: "${description}"`,
                        },
                    ],
                    temperature: 0.2,
                }),
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;

            if (content) {
                const jsonStr = extractJSON(content);
                if (jsonStr) {
                    const parsed = JSON.parse(jsonStr);
                    const suggestedCategory = parsed.categoria;
                    const suggestedIcon = parsed.icono;

                    // Verificar si la categoría existe en las del usuario
                    const foundCategory = userCategories.find(cat => 
                        cat.name.toLowerCase() === suggestedCategory.toLowerCase()
                    );

                    if (foundCategory) {
                        category = foundCategory.name;
                        icon = foundCategory.icon;
                        console.log('Categoría encontrada:', foundCategory);
                    } else {
                        // Sugerencia alternativa (no está en la lista del usuario)
                        category = suggestedCategory || "Otros";
                        icon = suggestedIcon || "❓";
                        console.log('Nueva categoría sugerida:', category, icon);
                    }
                }
            }
        } catch (err) {
            console.error("Error clasificando gasto:", err);
            formError = "Error al sugerir categoría";
        } finally {
            isLoadingCategory = false;
        }
    }

    function extractJSON(text: string): string | null {
        const fenced = text.match(/```(?:json)?([\s\S]*?)```/i);
        if (fenced) return fenced[1].trim();
        const start = text.indexOf("{");
        const end = text.lastIndexOf("}");
        if (start !== -1 && end !== -1 && end > start) return text.slice(start, end + 1).trim();
        return null;
    }

    async function handleSubmit() {
        if (!validateForm()) return;

        formError = null;
        isSaving = true;
        showCategoryDropdown = false;

        await new Promise(resolve => setTimeout(resolve, 800));

        showSuccess = true;
        
        setTimeout(() => {
            dispatch('save', {
                monto: amount,
                categoria: icon + category,
                fecha: new Date(fecha),
                nota: description
            });
            handleClose();
        }, 1200);
    }

    function validateForm(): boolean {
        formError = null;
        
        if (!description.trim()) {
            formError = 'Ingresa una descripción del gasto.';
            return false;
        }
        
        if (!amount || amount <= 0) {
            formError = 'Ingresa un monto válido.';
            return false;
        }
        
        if (amount > 999999) {
            formError = 'El monto es demasiado alto.';
            return false;
        }

        // Validación de fecha/hora
        if (!fecha || isNaN(new Date(fecha).getTime())) {
            formError = 'Selecciona una fecha y hora válidas.';
            return false;
        }
        
        return true;
    }

    // Debounced AI suggestion
    let debounceTimer: number;
    function handleDescriptionChange() {
        if (debounceTimer) clearTimeout(debounceTimer);
        
        if (!description.trim()) return;
        
        debounceTimer = window.setTimeout(() => {
            if (GROQ_API_KEY && navigator.onLine) {
                suggestCategory();
            }
        }, 800);
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            if (showCategoryDropdown) {
                showCategoryDropdown = false;
            } else {
                handleClose();
            }
        }
        if (e.key === 'Enter' && e.metaKey) handleSubmit();
    }

    async function addNewCategory(nombre: string, iconEmoji: string) {
        try {
            const docRef = await categoriaService.addCategoria(nombre, iconEmoji, true);

            const nuevaCategoria: Categoria = {
                id: docRef.id, // usar el ID real de Firestore
                name: nombre,
                icon: iconEmoji,
                isFavorite: true,
                createdAt: Timestamp.fromDate(new Date())
            };

            categorias.update(cats => [...cats, nuevaCategoria]);

            category = nuevaCategoria.name;
            icon = nuevaCategoria.icon;
        } catch (e) {
            console.error('Error al agregar categoría:', e);
            formError = 'No se pudo agregar la categoría';
        }
    }

    function selectCategory(cat: Categoria) {
        category = cat.name;
        icon = cat.icon;
        showCategoryDropdown = false;
        console.log('Categoría seleccionada:', cat);
    }

    // Click outside para cerrar dropdown
    function handleClickOutside(event: MouseEvent) {
        const target = event.target as Element;
        if (!target.closest('.category-select-wrapper')) {
            showCategoryDropdown = false;
        }
    }

    onMount(() => {
        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    });
</script>

<svelte:window on:keydown={handleKeydown} />

<dialog bind:this={dialogElement} on:close={handleClose} on:click|self={handleClose} class="modal">
    <!-- Success State -->
    {#if showSuccess}
        <div class="success-overlay" transition:fly={{ y: 20, duration: 300 }}>
            <div class="success-icon">✅</div>
            <h3>¡Gasto guardado!</h3>
            <p>{formatCurrency(Number(amount))}</p>
        </div>
    {:else}
        <div class="modal-content">
            <header class="modal-header">
                <h2>💰 Registrar Gasto</h2>
                <button type="button" class="close-btn" on:click={handleClose}>✕</button>
            </header>

            <form on:submit|preventDefault={handleSubmit} class="form">
                <!-- Descripción con IA -->
                <div class="field">
                    <label for="description">Descripción</label>
                    <div class="input-wrapper">
                        <input
                            type="text"
                            id="description"
                            bind:value={description}
                            bind:this={descriptionInput}
                            on:input={handleDescriptionChange}
                            placeholder="Ej. Almuerzo, gasolina, medicinas..."
                            required
                        />
                        {#if isLoadingCategory}
                            <div class="ai-indicator">
                                <div class="spinner"></div>
                                <span>IA analizando...</span>
                            </div>
                        {/if}
                    </div>
                </div>

                <!-- Monto -->
                <div class="field">
                    <label for="amount">Monto</label>
                    <div class="amount-input">
                        <span class="currency">S/</span>
                        <input
                            type="number"
                            inputmode="decimal"
                            id="amount"
                            bind:value={amount}
                            placeholder="0.00"
                            step="0.01"
                            min="0.01"
                            max="999999"
                            required
                        />
                    </div>
                </div>

                <!-- Fecha -->
                <div class="field">
                    <label for="fecha">Fecha y hora</label>
                    <div class="date-input">
                        <span class="date-prefix">📅</span>
                        <input
                            type="datetime-local"
                            id="fecha"
                            bind:value={fecha}
                            required
                        />
                    </div>
                </div>

                <!-- Categoría sugerida por IA -->
                {#if category && icon}
                    <div class="ai-suggestion">
                        <div class="suggestion-header">
                            <span class="ai-badge">🤖 IA</span>
                            <span>
                                {#if $categorias?.find(c => c.name === category)}
                                    Categoría sugerida
                                {:else}
                                    Nueva categoría sugerida
                                {/if}
                            </span>
                        </div>

                        <div class="suggested-category">
                            <span class="category-icon">{icon}</span>
                            <span class="category-name">{category}</span>
                        </div>

                        {#if !$categorias?.find(c => c.name === category)}
                            <button type="button" class="btn-add-category" on:click={() => addNewCategory(category, icon)}>
                                ➕ Agregar categoría
                            </button>
                        {/if}
                    </div>

                    <!-- Combobox de categorías -->
                    <div class="field">
                        <label for="category-select">O elige otra categoría</label>
                        <div class="category-select-wrapper">
                            <button 
                                type="button" 
                                class="category-select-trigger"
                                on:click={() => showCategoryDropdown = !showCategoryDropdown}
                                aria-expanded={showCategoryDropdown}
                            >
                                <div class="selected-category">
                                    <span class="selected-icon">{icon}</span>
                                    <span class="selected-name">{category}</span>
                                </div>
                                <span class="dropdown-arrow {showCategoryDropdown ? 'open' : ''}">▼</span>
                            </button>
                            
                            {#if showCategoryDropdown && isStoreReady && $categorias.length > 0}
                                <div class="category-dropdown" transition:fly={{ y: -10, duration: 200 }}>
                                    {#each $categorias as cat (cat.id)}
                                        <button 
                                            type="button" 
                                            class="category-dropdown-item {category === cat.name ? 'selected' : ''}"
                                            on:click={() => selectCategory(cat)}
                                        >
                                            <span class="dropdown-icon">{cat.icon}</span>
                                            <span class="dropdown-name">{cat.name}</span>
                                            {#if category === cat.name}
                                                <span class="check-mark">✓</span>
                                            {/if}
                                        </button>
                                    {/each}
                                </div>
                            {/if}

                            <!-- Debug/Loading state -->
                            {#if showCategoryDropdown && (!isStoreReady || !$categorias || $categorias.length === 0)}
                                <div class="category-dropdown debug-dropdown">
                                    <div class="debug-message">
                                        {#if !isStoreReady}
                                            <span>⏳ Cargando categorías...</span>
                                        {:else}
                                            <span>📭 No hay categorías disponibles</span>
                                            <small>Categorías en store: {$categorias?.length || 0}</small>
                                            <button type="button" class="reload-categories" on:click={() => window.location.reload()}>
                                                🔄 Recargar
                                            </button>
                                        {/if}
                                    </div>
                                </div>
                            {/if}
                        </div>
                    </div>
                {/if}

                <!-- Error -->
                {#if formError}
                    <div class="error" transition:fly={{ y: 10, duration: 200 }}>
                        ⚠️ {formError}
                    </div>
                {/if}

                <!-- Botones -->
                <div class="actions">
                    <button type="button" class="btn btn-secondary" on:click={handleClose} disabled={isSaving}>
                        Cancelar
                    </button>
                    <button type="submit" class="btn btn-primary" disabled={isSaving}>
                        {#if isSaving}
                            <span class="spinner"></span> Guardando...
                        {:else}
                            💾 Guardar
                        {/if}
                    </button>
                </div>
            </form>
        </div>
    {/if}
</dialog>

<style>
    .modal {
        background: transparent;
        border: none;
        padding: 0;
        max-width: 500px;
        width: 90vw;
        max-height: 90vh;
        border-radius: 24px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        transform: translate(-0%, -0%);
        z-index: 1000;
    }

    .modal[open] {
        display: flex;
    }

    .modal::backdrop {
        background: rgba(0,0,0,0.6);
        backdrop-filter: blur(8px);
    }

    .modal-content {
        background: white;
        border-radius: 24px;
        padding: 2rem;
        width: 100%;
        max-height: 80vh;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
    }

    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
        border-bottom: 1px solid #f0f0f0;
        padding-bottom: 1rem;
    }

    .modal-header h2 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 700;
        color: #1a1a1a;
    }

    .close-btn {
        background: #f5f5f5;
        border: none;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.2rem;
        color: #666;
        transition: all 0.2s ease;
    }

    .close-btn:hover {
        background: #e5e5e5;
        color: #333;
    }

    .form {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .field {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .field label {
        font-weight: 600;
        color: #333;
        font-size: 0.95rem;
    }

    .input-wrapper {
        position: relative;
    }

    input[type="text"], input[type="number"] {
        width: 100%;
        padding: 1rem 1.25rem;
        border: 2px solid #e5e5e5;
        border-radius: 16px;
        font-size: 1rem;
        transition: all 0.2s ease;
        background: white;
        box-sizing: border-box;
    }

    input:focus {
        outline: none;
        border-color: #007aff;
        box-shadow: 0 0 0 3px rgba(0,122,255,0.1);
    }

    .amount-input {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 1rem 1.25rem;
        border: 2px solid #e5e5e5;
        border-radius: 16px;
        background: white;
        transition: all 0.2s ease;
    }

    .amount-input:focus-within {
        border-color: #007aff;
        box-shadow: 0 0 0 3px rgba(0,122,255,0.1);
    }

    .currency {
        font-size: 1.5rem;
        font-weight: 500;
        color: #007aff;
    }

    .amount-input input {
        border: none;
        padding: 0;
        font-size: 1.5rem;
        font-weight: 500;
        flex: 1;
    }

    .amount-input input:focus {
        box-shadow: none;
    }

    .ai-indicator {
        position: absolute;
        right: 1rem;
        top: 50%;
        transform: translateY(-50%);
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: #666;
        font-size: 0.85rem;
    }

    .ai-suggestion {
        background: linear-gradient(135deg, #f8faff, #e6f3ff);
        border: 2px solid #007aff;
        border-radius: 16px;
        padding: 1.25rem;
        animation: slideIn 0.3s ease;
    }

    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateY(10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .suggestion-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 1rem;
        font-size: 0.9rem;
        color: #007aff;
        font-weight: 600;
    }

    .ai-badge {
        background: #007aff;
        color: white;
        padding: 0.25rem 0.5rem;
        border-radius: 8px;
        font-size: 0.75rem;
    }

    .suggested-category {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1rem;
    }

    .category-icon {
        font-size: 2rem;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
    }

    .category-name {
        font-size: 1.1rem;
        font-weight: 700;
        color: #1a1a1a;
    }

    .btn-add-category {
        background: rgba(0,122,255,0.1);
        border: 1px solid #007aff;
        color: #007aff;
        padding: 0.75rem 1rem;
        border-radius: 12px;
        font-weight: 600;
        font-size: 0.9rem;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .btn-add-category:hover {
        background: rgba(0,122,255,0.2);
        transform: translateY(-1px);
    }

    /* Combobox Styles */
    .category-select-wrapper {
        position: relative;
    }

    .category-select-trigger {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem 1.25rem;
        border: 2px solid #e5e5e5;
        border-radius: 16px;
        background: white;
        cursor: pointer;
        transition: all 0.2s ease;
        font-family: inherit;
        font-size: 1rem;
        text-align: left;
    }

    .category-select-trigger:hover {
        border-color: #007aff;
        box-shadow: 0 0 0 3px rgba(0,122,255,0.05);
    }

    .category-select-trigger:focus {
        outline: none;
        border-color: #007aff;
        box-shadow: 0 0 0 3px rgba(0,122,255,0.1);
    }

    .selected-category {
        display: flex;
        align-items: center;
        gap: 0.875rem;
        flex: 1;
    }

    .selected-icon {
        font-size: 1.25rem;
        line-height: 1;
    }

    .selected-name {
        font-weight: 600;
        color: #1a1a1a;
    }

    .dropdown-arrow {
        font-size: 0.875rem;
        color: #666;
        transition: transform 0.2s ease;
        margin-left: 0.5rem;
    }

    .dropdown-arrow.open {
        transform: rotate(180deg);
    }

    .category-dropdown {
        position: absolute;
        top: calc(100% + 0.5rem);
        left: 0;
        right: 0;
        background: white;
        border: 1px solid #e5e5e5;
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.15);
        z-index: 1000;
        max-height: 240px;
        overflow-y: auto;
        padding: 0.5rem;
    }

    .category-dropdown-item {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 0.875rem;
        padding: 0.875rem 1rem;
        border: none;
        border-radius: 12px;
        background: transparent;
        cursor: pointer;
        transition: all 0.15s ease;
        font-family: inherit;
        font-size: 0.95rem;
        position: relative;
        text-align: left;
    }

    .category-dropdown-item:hover {
        background: #f0f4ff;
        transform: translateX(2px);
    }

    .category-dropdown-item.selected {
        background: linear-gradient(135deg, #e6f3ff, #cce7ff);
        color: #007aff;
        font-weight: 600;
    }

    .dropdown-icon {
        font-size: 1.1rem;
        line-height: 1;
        flex-shrink: 0;
    }

    .dropdown-name {
        flex: 1;
        font-weight: 600;
    }

    .check-mark {
        color: #007aff;
        font-weight: 700;
        font-size: 0.9rem;
        margin-left: auto;
    }

    /* Debug styles */
    .debug-dropdown {
        padding: 1rem;
        text-align: center;
    }

    .debug-message {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        color: #666;
        font-size: 0.9rem;
    }

    .debug-message small {
        font-size: 0.8rem;
        color: #999;
    }

    .reload-categories {
        background: #007aff;
        border: none;
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 8px;
        font-size: 0.8rem;
        cursor: pointer;
        margin-top: 0.5rem;
        transition: all 0.2s ease;
    }

    .reload-categories:hover {
        background: #0056b3;
        transform: translateY(-1px);
    }

    /* Scrollbar del dropdown */
    .category-dropdown::-webkit-scrollbar {
        width: 6px;
    }

    .category-dropdown::-webkit-scrollbar-track {
        background: transparent;
    }

    .category-dropdown::-webkit-scrollbar-thumb {
        background: #ddd;
        border-radius: 3px;
    }

    .category-dropdown::-webkit-scrollbar-thumb:hover {
        background: #bbb;
    }

    .error {
        background: #fff2f0;
        border: 1px solid #ffcdd2;
        color: #d32f2f;
        padding: 1rem;
        border-radius: 12px;
        text-align: center;
        font-weight: 500;
    }

    .actions {
        display: flex;
        gap: 1rem;
        margin-top: 1rem;
    }

    .btn {
        flex: 1;
        padding: 1rem 1.5rem;
        border: none;
        border-radius: 16px;
        font-weight: 600;
        font-size: 1rem;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        min-height: 52px;
    }

    .btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .btn-secondary {
        background: #f5f5f5;
        color: #333;
    }

    .btn-secondary:hover:not(:disabled) {
        background: #e5e5e5;
    }

    .btn-primary {
        background: linear-gradient(135deg, #007aff, #0051d5);
        color: white;
        box-shadow: 0 4px 16px rgba(0,122,255,0.3);
    }

    .btn-primary:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0,122,255,0.4);
    }

    .spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255,255,255,0.3);
        border-top: 2px solid currentColor;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    .success-overlay {
        background: white;
        border-radius: 24px;
        padding: 3rem 2rem;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        width: 100%;
        min-height: 300px;
    }

    .success-icon {
        font-size: 4rem;
        animation: bounce 0.6s ease;
    }

    @keyframes bounce {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.2); }
    }

    .success-overlay h3 {
        margin: 0;
        color: #22c55e;
        font-size: 1.5rem;
        font-weight: 700;
    }

    .success-overlay p {
        margin: 0;
        font-size: 2rem;
        font-weight: 700;
        color: #333;
    }

    .date-input {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.875rem 1.25rem;
        border: 2px solid #e5e5e5;
        border-radius: 16px;
        background: white;
        transition: all 0.2s ease;
    }

    .date-input:focus-within {
        border-color: #007aff;
        box-shadow: 0 0 0 3px rgba(0,122,255,0.1);
    }

    .date-prefix {
        font-size: 1.25rem;
        color: #007aff;
        line-height: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.5rem;
    }

    .date-input input[type="datetime-local"] {
        border: none;
        padding: 0;
        font-size: 1.05rem;
        font-weight: 600;
        color: #1a1a1a;
        background: transparent;
        flex: 1;
        min-width: 0;
    }

    .date-input input[type="datetime-local"]:focus {
        outline: none;
        box-shadow: none;
    }

    /* Responsive */
    @media (max-width: 600px) {
        .modal {
            width: 95vw;
            max-width: none;
            max-height: 95vh;
            border-radius: 20px;
        }

        .modal-content, .success-overlay {
            padding: 1.5rem;
            border-radius: 20px;
        }

        .actions {
            flex-direction: column;
        }

        .currency {
            font-size: 1.25rem;
        }

        .amount-input input {
            font-size: 1.25rem;
        }

        .date-input {
            padding: 0.75rem 1rem;
        }
        
        .date-input input[type="datetime-local"] {
            font-size: 1rem;
        }

        .category-dropdown {
            max-height: 200px;
        }

        .category-dropdown-item {
            padding: 0.75rem;
        }

        .dropdown-icon {
            font-size: 1rem;
        }

        .dropdown-name {
            font-size: 0.9rem;
        }
    }

    /* Dark mode */
    @media (prefers-color-scheme: dark) {
        .modal-content {
            background: #1a1a1a;
            color: white;
        }

        .modal-header {
            border-color: #333;
        }

        .modal-header h2 {
            color: white;
        }

        .close-btn {
            background: #333;
            color: #ccc;
        }

        .close-btn:hover {
            background: #444;
            color: white;
        }

        input[type="text"], input[type="number"], .amount-input {
            background: #2a2a2a;
            border-color: #444;
            color: white;
        }

        input:focus, .amount-input:focus-within {
            border-color: #007aff;
        }

        .btn-secondary {
            background: #333;
            color: white;
        }

        .btn-secondary:hover:not(:disabled) {
            background: #444;
        }

        .ai-suggestion {
            background: linear-gradient(135deg, #1a2332, #1a2840);
            border-color: #007aff;
        }

        .success-overlay {
            background: #1a1a1a;
            color: white;
        }

        .error {
            background: #2d1b1b;
            border-color: #5d2a2a;
            color: #ff6b6b;
        }

        .date-input {
            background: #2a2a2a;
            border-color: #444;
        }
        
        .date-input:focus-within {
            border-color: #007aff;
            box-shadow: 0 0 0 3px rgba(0,122,255,0.15);
        }
        
        .date-input input[type="datetime-local"] {
            color: #fff;
        }
        
        .category-name {
            color: #fff;
        }
        
        .field label {
            color: #fff;
        }

        .btn-add-category {
            background: rgba(0,122,255,0.2);
            border-color: #007aff;
            color: #66b3ff;
        }

        .btn-add-category:hover {
            background: rgba(0,122,255,0.3);
        }

        /* Dark mode combobox */
        .category-select-trigger {
            background: #2a2a2a;
            border-color: #444;
            color: white;
        }

        .category-select-trigger:hover {
            border-color: #007aff;
            box-shadow: 0 0 0 3px rgba(0,122,255,0.1);
        }

        .selected-name {
            color: white;
        }

        .dropdown-arrow {
            color: #ccc;
        }

        .category-dropdown {
            background: #2a2a2a;
            border-color: #444;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        }

        .category-dropdown-item {
            color: white;
        }

        .category-dropdown-item:hover {
            background: #1a2332;
        }

        .category-dropdown-item.selected {
            background: linear-gradient(135deg, #1a2d42, #1a3a52);
            color: #66b3ff;
        }

        .category-dropdown::-webkit-scrollbar-thumb {
            background: #555;
        }

        .debug-message {
            color: #ccc;
        }

        .debug-message small {
            color: #888;
        }
    }
</style>