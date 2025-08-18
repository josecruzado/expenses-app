<script lang="ts">
    import { createEventDispatcher, onMount } from 'svelte';
    import { fly } from 'svelte/transition';

    const dispatch = createEventDispatcher();

    let description = '';
    let amount: number | null = null;
    let category = 'otros';
    let icon = '📦';
    let formError: string | null = null;
    let isSaving = false;
    let showSuccess = false;
    let isLoadingCategory = false;

    // Configuración de API
    const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY as string;

    const categories = [
        { id: 'comida', name: 'Comida', icon: '🍽️' },
        { id: 'transporte', name: 'Transporte', icon: '🚗' },
        { id: 'salud', name: 'Salud', icon: '🏥' },
        { id: 'entretenimiento', name: 'Entretenimiento', icon: '🎬' },
        { id: 'hogar', name: 'Hogar', icon: '🏠' },
        { id: 'otros', name: 'Otros', icon: '📦' }
    ];

    let dialogElement: HTMLDialogElement | null = null;
    let descriptionInput: HTMLInputElement;

    function getLocalDateTimeValue(d = new Date()) {
        const tz = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - tz).toISOString().slice(0, 16); // yyyy-MM-ddTHH:mm
    }
    let fecha: string = getLocalDateTimeValue();

    onMount(() => {
        dialogElement?.showModal();
        
        // Enfocar el input después de un pequeño delay para asegurar que el modal esté visible
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
                            content: `Eres un asistente que clasifica gastos personales. Responde estrictamente en JSON con la forma {"categoria": string, "icono": string}. 
                            Las categorías disponibles son: comida, transporte, salud, entretenimiento, hogar, otros.
                            Elige un emoji adecuado como icono. Sin texto extra.`,
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
                    const suggestedCategory = parsed.categoria || "otros";
                    const suggestedIcon = parsed.icono || "❓";
                    
                    const foundCategory = categories.find(cat => cat.id === suggestedCategory);
                    if (foundCategory) {
                        category = suggestedCategory;
                        icon = suggestedIcon;
                    } else {
                        category = "otros";
                        icon = suggestedIcon || "❓";
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

        await new Promise(resolve => setTimeout(resolve, 800));

        showSuccess = true;
        
        setTimeout(() => {
            dispatch('save', {
                monto: amount,
                categoria: icon+category,
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
        if (e.key === 'Escape') handleClose();
        if (e.key === 'Enter' && e.metaKey) handleSubmit();
    }

    $: selectedCategory = categories.find(cat => cat.id === category);
</script>

<svelte:window on:keydown={handleKeydown} />

<dialog bind:this={dialogElement} on:close={handleClose} on:click|self={handleClose} class="modal">
    <!-- Success State -->
    {#if showSuccess}
        <div class="success-overlay" transition:fly={{ y: 20, duration: 300 }}>
            <div class="success-icon">✅</div>
            <h3>¡Gasto guardado!</h3>
            <p>${amount?.toFixed(2)}</p>
        </div>
    {:else}
        <div class="modal-content">
            <header class="modal-header">
                <h2>💰 Nuevo Gasto</h2>
                <button type="button" class="close-btn" on:click={handleClose}>✕</button>
            </header>

            <form on:submit|preventDefault={handleSubmit} class="form">
                <!-- Descripción con IA -->
                <div class="field">
                    <label for="description">¿Qué compraste?</label>
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

                <!-- Monto simplificado -->
                <div class="field">
                    <label for="amount">¿Cuánto gastaste?</label>
                    <div class="amount-input">
                        <span class="currency">S/</span>
                        <input
                            type="number"
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

                <!-- Monto simplificado -->
                <div class="field">
                    <div class="date-input">
                        <span class="date-prefix"></span>
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
                            <span>Categoría sugerida</span>
                        </div>
                        <div class="suggested-category">
                            <span class="category-icon">{icon}</span>
                            <span class="category-name">{selectedCategory?.name || category}</span>
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
    }
</style>