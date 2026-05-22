<script lang="ts">
    import { onMount } from 'svelte';
    import { fly } from 'svelte/transition';
    import { formatCurrency } from '$lib/services/gastosService';
    import { categorias, categoriaService, loadingCategorias } from '$lib/services/categoriaService';
    import type { Categoria, CreateGastoData } from '$lib/types';

    interface Props {
        onclose?: () => void;
        onsave?: (data: CreateGastoData) => void | Promise<void>;
    }

    let { onclose, onsave }: Props = $props();

    const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY as string;

    function getLocalDateTimeValue(d = new Date()) {
        const tz = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - tz).toISOString().slice(0, 16);
    }

    let description = $state('');
    // El input es type="text" + inputmode="decimal" para preservar el teclado
    // numérico de iOS sin disparar el escalado de incrementadores nativos.
    // El binding nativo retornaría siempre string, así que mantenemos el texto
    // crudo y derivamos el número normalizando coma → punto (locales latam).
    let amountText = $state('');
    let fecha = $state(getLocalDateTimeValue());

    const amount = $derived.by<number | null>(() => {
        const raw = amountText.replace(',', '.').trim();
        if (!raw) return null;
        const n = Number(raw);
        return Number.isFinite(n) && n > 0 ? n : null;
    });

    // selectedCategoryId se DERIVA del nombre + el store: nada de $effect.
    // selectCategory y addNewCategory actualizan el nombre; el ID llega solo
    // cuando el store contiene esa categoría.
    let selectedCategoryName = $state('Otros');
    let selectedCategoryIcon = $state('📦');
    const selectedCategoryId = $derived(
        $categorias?.find((c) => c.name === selectedCategoryName)?.id ?? null
    );

    let formError = $state<string | null>(null);
    let isSaving = $state(false);
    let showSuccess = $state(false);
    let isLoadingCategory = $state(false);
    let showCategoryDropdown = $state(false);
    let aiHasSuggested = $state(false);

    let dialogElement = $state<HTMLDialogElement | null>(null);
    let amountInput = $state<HTMLInputElement | null>(null);

    onMount(() => {
        dialogElement?.showModal();
        // Foco síncrono dentro del gesto de apertura: iOS abre el teclado solo
        // si el focus ocurre dentro del mismo tick que el showModal.
        amountInput?.focus({ preventScroll: true });

        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
            if (debounceTimer) clearTimeout(debounceTimer);
        };
    });

    function close() {
        showCategoryDropdown = false;
        if (dialogElement?.open) dialogElement.close();
        onclose?.();
    }

    async function suggestCategory() {
        if (!description.trim() || !GROQ_API_KEY) return;
        isLoadingCategory = true;
        formError = null;

        try {
            const userCategories = $categorias || [];
            const categoriesList = userCategories
                .map((c) => `${c.name} (${c.icon})`)
                .join(', ');

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${GROQ_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
                    messages: [
                        {
                            role: 'system',
                            content: `Eres un asistente experto en clasificar gastos personales.
                            Las categorías disponibles del usuario son: ${categoriesList}.

                            Instrucciones:
                            1. Analiza el gasto y verifica si corresponde EXACTAMENTE o guarda relación directa con alguna categoría de la lista del usuario.
                            - Si coincide o tiene relación clara, usa esa categoría y su icono.
                            2. Si no coincide con ninguna, crea UNA nueva categoría simple y clara, con un icono (emoji) que la represente.
                            3. El campo "icono" debe ser siempre un EMOJI estándar (ejemplo: 🍽️, 🚗, 🏥, 🎬, 🏠, 📦).
                            - No uses texto, palabras, símbolos ASCII ni imágenes.
                            4. Nunca combines dos categorías en una.
                            5. La salida debe ser estrictamente un JSON válido.

                            Formato de salida obligatorio:
                            {"categoria": "<nombre_categoria>", "icono": "<emoji>"}`
                        },
                        {
                            role: 'user',
                            content: `Clasifica el siguiente gasto: "${description}"`
                        }
                    ],
                    temperature: 0.2
                })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;

            if (content) {
                const jsonStr = extractJSON(content);
                if (jsonStr) {
                    aiHasSuggested = true;
                    const parsed = JSON.parse(jsonStr);
                    const suggestedCategoryName = parsed.categoria;
                    const suggestedIcon = parsed.icono;

                    const foundCategory = userCategories.find(
                        (cat) => cat.name.toLowerCase() === suggestedCategoryName.toLowerCase()
                    );

                    if (foundCategory) {
                        selectCategory(foundCategory);
                    } else {
                        selectedCategoryName = suggestedCategoryName || 'Otros';
                        selectedCategoryIcon = suggestedIcon || '❓';
                        // selectedCategoryId quedará null automáticamente por
                        // el $derived al no haber match en el store.
                    }
                }
            }
        } catch (err) {
            console.error('Error clasificando gasto:', err);
            formError = 'No se pudo sugerir una categoría.';
        } finally {
            isLoadingCategory = false;
        }
    }

    function extractJSON(text: string): string | null {
        const fenced = text.match(/```(?:json)?([\s\S]*?)```/i);
        if (fenced) return fenced[1].trim();
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) return text.slice(start, end + 1).trim();
        return null;
    }

    function validateForm(): boolean {
        formError = null;
        if (!description.trim()) {
            formError = 'Ingresa una descripción del gasto.';
            return false;
        }
        if (amount === null) {
            formError = 'Ingresa un monto válido.';
            return false;
        }
        if (amount > 999999) {
            formError = 'El monto es demasiado alto.';
            return false;
        }
        if (!fecha || isNaN(new Date(fecha).getTime())) {
            formError = 'Selecciona una fecha y hora válidas.';
            return false;
        }
        if (!selectedCategoryId) {
            formError = 'Selecciona o agrega una categoría.';
            return false;
        }
        return true;
    }

    async function handleSubmit(e: SubmitEvent) {
        e.preventDefault();
        if (!validateForm()) return;

        formError = null;
        isSaving = true;
        showCategoryDropdown = false;

        try {
            // Espera la persistencia antes de mostrar éxito — antes era
            // fire-and-forget y mostraba "guardado" aunque la red fallara.
            await onsave?.({
                monto: amount as number,
                categoriaId: selectedCategoryId as string,
                fecha: new Date(fecha),
                nota: description.trim() || undefined
            });
            showSuccess = true;
            setTimeout(close, 700);
        } catch (err) {
            console.error('Error al guardar gasto:', err);
            formError = 'No se pudo guardar el gasto. Inténtalo de nuevo.';
            isSaving = false;
        }
    }

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    function handleDescriptionChange() {
        if (debounceTimer) clearTimeout(debounceTimer);
        if (!description.trim()) return;
        debounceTimer = setTimeout(() => {
            if (GROQ_API_KEY && navigator.onLine) suggestCategory();
        }, 800);
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            if (showCategoryDropdown) showCategoryDropdown = false;
            else close();
        }
    }

    async function addNewCategory(nombre: string, iconEmoji: string) {
        try {
            await categoriaService.addCategoria({
                name: nombre,
                icon: iconEmoji,
                isFavorite: true
            });
            // El ID se resolverá automáticamente vía $derived cuando el
            // store reactivo se actualice con la nueva categoría.
            selectedCategoryName = nombre;
            selectedCategoryIcon = iconEmoji;
        } catch (e) {
            console.error('Error al agregar categoría:', e);
            formError = 'No se pudo agregar la categoría';
        }
    }

    function selectCategory(cat: Categoria) {
        selectedCategoryName = cat.name;
        selectedCategoryIcon = cat.icon;
        showCategoryDropdown = false;
    }

    function handleClickOutside(event: MouseEvent) {
        const target = event.target as Element;
        if (!target.closest('.category-select-wrapper')) {
            showCategoryDropdown = false;
        }
    }

    function handleBackdropClick(e: MouseEvent) {
        if (e.target === dialogElement) close();
    }
</script>

<svelte:window onkeydown={handleKeydown} />

<dialog
    bind:this={dialogElement}
    onclose={close}
    onclick={handleBackdropClick}
    class="modal"
    aria-labelledby="add-expense-title"
>
    <!-- Success State -->
    {#if showSuccess}
        <div class="success-overlay" role="status" aria-live="polite" transition:fly={{ y: 20, duration: 300 }}>
            <div class="success-icon" aria-hidden="true">✅</div>
            <h3>¡Gasto guardado!</h3>
            <p>{formatCurrency(amount ?? 0)}</p>
        </div>
    {:else}
        <div class="modal-content">
            <header class="modal-header">
                <h2 id="add-expense-title">💰 Registrar Gasto</h2>
                <button type="button" class="close-btn" aria-label="Cerrar" onclick={close}>✕</button>
            </header>

            <form onsubmit={handleSubmit} class="form">

                <!-- Monto -->
                <div class="field">
                    <label for="amount">Monto</label>
                    <div class="amount-input">
                        <span class="currency" aria-hidden="true">S/</span>
                        <input
                            type="text"
                            inputmode="decimal"
                            enterkeyhint="next"
                            autocomplete="off"
                            pattern="[0-9]*[.,]?[0-9]+"
                            id="amount"
                            bind:value={amountText}
                            bind:this={amountInput}
                            placeholder="0.00"
                            required
                            aria-describedby="amount-hint"
                        />
                    </div>
                    <small id="amount-hint" class="field-hint">Usa punto o coma como separador decimal.</small>
                </div>

                <!-- Descripción con IA -->
                <div class="field">
                    <label for="description">Descripción</label>
                    <div class="input-wrapper">
                        <input
                            type="text"
                            id="description"
                            autocomplete="off"
                            autocapitalize="sentences"
                            enterkeyhint="next"
                            spellcheck="true"
                            bind:value={description}
                            oninput={handleDescriptionChange}
                            placeholder="Ej. almuerzo en la oficina"
                            required
                        />
                        {#if isLoadingCategory}
                            <div class="ai-indicator" aria-live="polite">
                                <div class="spinner" aria-hidden="true"></div>
                                <span>IA analizando…</span>
                            </div>
                        {/if}
                    </div>
                </div>

                <!-- Fecha -->
                <div class="field">
                    <label for="fecha">Fecha y hora</label>
                    <div class="date-input">
                        <span class="date-prefix" aria-hidden="true">📅</span>
                        <input
                            type="datetime-local"
                            id="fecha"
                            enterkeyhint="done"
                            bind:value={fecha}
                            required
                        />
                    </div>
                </div>

                <!-- Categoría sugerida por IA -->
                {#if aiHasSuggested}
                    <div class="ai-suggestion">
                        <div class="suggestion-header">
                            <span class="ai-badge" aria-hidden="true">🤖 IA</span>
                            <span>
                                {#if selectedCategoryId}
                                    Categoría sugerida
                                {:else}
                                    Nueva categoría sugerida
                                {/if}
                            </span>
                        </div>

                        <div class="suggested-category">
                            <span class="category-icon" aria-hidden="true">{selectedCategoryIcon}</span>
                            <span class="category-name">{selectedCategoryName}</span>
                        </div>

                        {#if !selectedCategoryId}
                            <button type="button" class="btn-add-category" onclick={() => addNewCategory(selectedCategoryName, selectedCategoryIcon)}>
                                + Agregar y seleccionar
                            </button>
                        {/if}
                    </div>
                {/if}

                <!-- Combobox de categorías (siempre visible) -->
                <div class="field">
                    <label for="category-trigger">{aiHasSuggested ? 'O elige otra categoría' : 'Categoría'}</label>
                    <div class="category-select-wrapper">
                        <button
                            id="category-trigger"
                            type="button"
                            class="category-select-trigger"
                            onclick={() => (showCategoryDropdown = !showCategoryDropdown)}
                            aria-haspopup="listbox"
                            aria-expanded={showCategoryDropdown}
                        >
                            <div class="selected-category">
                                <span class="selected-icon" aria-hidden="true">{selectedCategoryIcon}</span>
                                <span class="selected-name">{selectedCategoryName}</span>
                            </div>
                            <span class="dropdown-arrow {showCategoryDropdown ? 'open' : ''}" aria-hidden="true">▼</span>
                        </button>

                        {#if showCategoryDropdown}
                            <div
                                class="category-dropdown"
                                role="listbox"
                                aria-label={`${$categorias?.length ?? 0} categorías disponibles`}
                                transition:fly={{ y: -10, duration: 200 }}
                            >
                                {#if $loadingCategorias}
                                    <div class="dropdown-empty">
                                        <span>Cargando categorías…</span>
                                    </div>
                                {:else if $categorias.length > 0}
                                    {#each $categorias as cat (cat.id)}
                                        <!-- role="option" debe ir en un elemento neutral, no en <button>:
                                             el rol nativo de button colisiona con option en ARIA. -->
                                        <div
                                            role="option"
                                            tabindex="0"
                                            aria-selected={selectedCategoryId === cat.id}
                                            class="category-dropdown-item {selectedCategoryId === cat.id ? 'selected' : ''}"
                                            onclick={() => selectCategory(cat)}
                                            onkeydown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    selectCategory(cat);
                                                }
                                            }}
                                        >
                                            <span class="dropdown-icon" aria-hidden="true">{cat.icon}</span>
                                            <span class="dropdown-name">{cat.name}</span>
                                            {#if selectedCategoryId === cat.id}
                                                <span class="check-mark" aria-hidden="true">✓</span>
                                            {/if}
                                        </div>
                                    {/each}
                                {:else}
                                    <div class="dropdown-empty">
                                        <span>No hay categorías aún</span>
                                        <small>Agrega una desde la sección Categorías.</small>
                                    </div>
                                {/if}
                                <!-- Hint visual de scroll: gradiente al final.
                                     iOS Safari standalone oculta scrollbars. -->
                                <div class="dropdown-scroll-fade" aria-hidden="true"></div>
                            </div>
                        {/if}
                    </div>
                </div>

                <!-- Error -->
                {#if formError}
                    <div class="error" role="alert" aria-live="assertive" transition:fly={{ y: 10, duration: 200 }}>
                        <span aria-hidden="true">⚠️</span> {formError}
                    </div>
                {/if}

                <!-- Botones -->
                <div class="actions">
                    <button type="button" class="btn btn-secondary" onclick={close} disabled={isSaving}>
                        Cancelar
                    </button>
                    <button type="submit" class="btn btn-primary" disabled={isSaving}>
                        {#if isSaving}
                            <span class="spinner" aria-hidden="true"></span> Guardando…
                        {:else}
                            Guardar
                        {/if}
                    </button>
                </div>
            </form>
        </div>
    {/if}
</dialog>

<style>
    /* Dialog: centrado EXPLÍCITO con top/left + translate.
       El default UA del :modal usa `inset: 0; margin: auto`, que en iOS
       Safari standalone (y algunos otros motores) falla cuando el dialog
       tiene altura intrínseca + width:100% + max-width — interpreta el
       inset:0 como "estirar" y deja el contenido pegado al borde inferior.
       Fijar top:50% + translate evita el bug en todos los navegadores. */
    .modal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        margin: 0;
        background: transparent;
        border: none;
        padding: 0;
        max-width: min(500px, calc(100vw - 32px));
        width: 100%;
        max-height: calc(
            100dvh - var(--safe-area-inset-top) - var(--safe-area-inset-bottom) -
                24px
        );
        border-radius: 24px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        overflow: visible;
        z-index: var(--z-modal);
    }

    .modal::backdrop {
        background: rgba(0, 0, 0, 0.45);
        backdrop-filter: blur(24px) saturate(180%);
        -webkit-backdrop-filter: blur(24px) saturate(180%);
    }

    .modal-content {
        background: white;
        border-radius: 24px;
        padding: 2rem 2rem calc(2rem + var(--keyboard-inset-height, 0px));
        width: 100%;
        max-height: inherit; /* hereda el cap del <dialog> */
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        overscroll-behavior: contain;
        scroll-padding-bottom: calc(96px + var(--keyboard-inset-height, 0px));
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
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

    /* Apple HIG: mínimo 44pt para áreas táctiles. */
    .close-btn {
        background: #f5f5f5;
        border: none;
        min-width: 44px;
        min-height: 44px;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.2rem;
        color: #666;
        transition: all 0.2s ease;
        -webkit-tap-highlight-color: transparent;
    }

    .field-hint {
        font-size: 0.75rem;
        color: #888;
        margin-top: 0.25rem;
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

    input[type="text"],
    input[type="datetime-local"] {
        width: 100%;
        padding: 1rem 1.25rem;
        border: 2px solid #e5e5e5;
        border-radius: 16px;
        font-size: 16px; /* >= 16px evita el zoom de iOS en focus */
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

    @media (prefers-reduced-motion: reduce) {
        .ai-suggestion { animation: none; }
        .success-icon { animation: none; }
        .spinner { animation-duration: 1.8s; }
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

    /* Indicador visual de scroll para iOS Safari standalone (scrollbar
       oculta por defecto). Anclado con sticky para no requerir JS. */
    .dropdown-scroll-fade {
        position: sticky;
        bottom: -0.5rem;
        left: 0;
        right: 0;
        height: 20px;
        margin-top: -20px;
        background: linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.95));
        pointer-events: none;
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

    .dropdown-empty {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        align-items: center;
        text-align: center;
        padding: 0.75rem;
        color: #666;
        font-size: 0.9rem;
    }

    .dropdown-empty small {
        font-size: 0.8rem;
        color: #999;
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
            max-width: calc(100vw - 16px);
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

        input[type="text"],
        input[type="datetime-local"],
        .amount-input {
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

        .dropdown-scroll-fade {
            background: linear-gradient(to bottom, transparent, rgba(42, 42, 42, 0.95));
        }

        .field-hint {
            color: #aaa;
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

        .dropdown-empty {
            color: #ccc;
        }

        .dropdown-empty small {
            color: #888;
        }
    }
</style>
