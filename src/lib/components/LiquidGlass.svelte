<script lang="ts">
    import { onDestroy } from 'svelte';
    import type { Snippet } from 'svelte';
    import { createLiquidGlassAssets, type LiquidGlassAssets } from '$lib/liquid-glass/runtime';

    /**
     * Liquid Glass (iOS 26) — refracción real vía SVG `<feDisplacementMap>`.
     *
     * Arquitectura DOM:
     *
     *   <host position:relative; z-index:0>          (stacking context, NO backdrop root)
     *     <svg>defs/filter</svg>                     (invisible, dim 0)
     *     <span.liquid-glass-bg z-index:-1>          (backdrop-filter aplica aquí)
     *     {children}                                 (encima, z-index auto > -1)
     *   </host>
     *
     * Reglas críticas:
     *   - El host NO usa `transform`, `isolation`, `filter`, `will-change` ni
     *     `contain: paint`. Cualquiera de esas lo convertiría en *backdrop
     *     root* y el filtro de `.liquid-glass-bg` solo "vería" el interior
     *     del host (cristal vacío). `z-index: 0` crea stacking context SIN
     *     crear backdrop root — esa es la combinación que funciona.
     *   - `.liquid-glass-bg` es un hermano absoluto del contenido (patrón
     *     idéntico al de @lollipopkit/liquid-glass-svelte). z-index:-1 lo
     *     pone debajo de los hijos sin requerir z-index explícito en ellos.
     */

    interface Props {
        radius?: number | string;
        bezelWidth?: number;
        glassThickness?: number;
        refractiveIndex?: number;
        specularAngle?: number;
        scaleRatio?: number;
        blur?: number;
        specularOpacity?: number;
        specularSaturation?: number;
        tint?: string;
        fallbackFilter?: string;
        as?: 'div' | 'section' | 'aside' | 'nav' | 'header' | 'footer';
        class?: string;
        width?: number;
        height?: number;
        children?: Snippet;
    }

    let {
        radius = 24,
        bezelWidth = 22,
        glassThickness = 70,
        refractiveIndex = 1.5,
        specularAngle = Math.PI / 3,
        scaleRatio = 0.7,
        blur = 0.4,
        specularOpacity = 0.4,
        specularSaturation = 4,
        tint = 'rgba(255, 255, 255, 0.10)',
        fallbackFilter = 'blur(20px) saturate(180%)',
        as = 'div',
        class: className = '',
        width: widthProp,
        height: heightProp,
        children
    }: Props = $props();

    const filterId = `lg-${Math.random().toString(36).slice(2, 10)}`;

    let host = $state<HTMLElement | null>(null);
    let measuredWidth = $state(0);
    let measuredHeight = $state(0);
    let assets = $state<LiquidGlassAssets | null>(null);
    let regenTimer: ReturnType<typeof setTimeout> | null = null;

    const effectiveWidth = $derived(widthProp ?? measuredWidth);
    const effectiveHeight = $derived(heightProp ?? measuredHeight);
    const radiusCss = $derived(typeof radius === 'number' ? `${radius}px` : radius);

    const radiusPx = $derived.by(() => {
        if (typeof radius === 'number') return radius;
        if (radius.includes('9999') || radius.includes('50%')) {
            return effectiveHeight > 0 ? effectiveHeight / 2 : 9999;
        }
        const n = parseFloat(radius);
        return Number.isFinite(n) ? n : 24;
    });

    const filterScale = $derived(assets ? assets.maxDisplacement * scaleRatio : 0);

    // Mide el host. Si el consumer da width/height fijos, los usa directo.
    $effect(() => {
        if (!host || typeof ResizeObserver === 'undefined') return;
        if (widthProp !== undefined && heightProp !== undefined) {
            measuredWidth = widthProp;
            measuredHeight = heightProp;
            return;
        }
        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const w = Math.round(entry.contentRect.width);
                const h = Math.round(entry.contentRect.height);
                if (w !== measuredWidth) measuredWidth = w;
                if (h !== measuredHeight) measuredHeight = h;
            }
        });
        ro.observe(host);
        return () => ro.disconnect();
    });

    // Genera assets cuando cambian dimensiones/params, debounced 80ms.
    $effect(() => {
        const w = effectiveWidth;
        const h = effectiveHeight;
        if (w <= 0 || h <= 0) return;

        if (regenTimer) clearTimeout(regenTimer);
        regenTimer = setTimeout(() => {
            regenTimer = null;
            const r = Math.min(radiusPx, w / 2, h / 2);
            createLiquidGlassAssets({
                width: w,
                height: h,
                radius: r,
                bezelWidth: Math.min(bezelWidth, r),
                glassThickness,
                refractiveIndex,
                specularAngle
            })
                .then((next) => {
                    assets = next;
                })
                .catch((err) => {
                    console.warn('LiquidGlass: error generando assets', err);
                });
        }, 80);

        return () => {
            if (regenTimer) {
                clearTimeout(regenTimer);
                regenTimer = null;
            }
        };
    });

    onDestroy(() => {
        if (regenTimer) clearTimeout(regenTimer);
        assets?.dispose();
    });
</script>

<svelte:element
    this={as}
    bind:this={host}
    class="liquid-glass-host {className}"
    style:--lg-radius={radiusCss}
    style:--lg-tint={tint}
    style:--lg-fallback={fallbackFilter}
    style:--lg-filter-url={`url(#${filterId})`}
>
    <!-- Filtro SVG inline. Tamaño cero para no afectar layout. -->
    <svg
        class="liquid-glass-svg"
        aria-hidden="true"
        focusable="false"
        xmlns="http://www.w3.org/2000/svg"
        color-interpolation-filters="sRGB"
    >
        <defs>
            <filter id={filterId} x="0%" y="0%" width="100%" height="100%">
                {#if assets}
                    <feGaussianBlur in="SourceGraphic" stdDeviation={blur} result="blurred_source" />
                    <feImage
                        href={assets.displacementUrl}
                        x="0"
                        y="0"
                        width={effectiveWidth}
                        height={effectiveHeight}
                        result="displacement_map"
                        preserveAspectRatio="none"
                    />
                    <feDisplacementMap
                        in="blurred_source"
                        in2="displacement_map"
                        scale={filterScale}
                        xChannelSelector="R"
                        yChannelSelector="G"
                        result="displaced"
                    />
                    <feColorMatrix
                        in="displaced"
                        type="saturate"
                        values={String(specularSaturation)}
                        result="displaced_saturated"
                    />
                    <feImage
                        href={assets.specularUrl}
                        x="0"
                        y="0"
                        width={effectiveWidth}
                        height={effectiveHeight}
                        result="specular_layer"
                        preserveAspectRatio="none"
                    />
                    <feComposite
                        in="displaced_saturated"
                        in2="specular_layer"
                        operator="in"
                        result="specular_saturated"
                    />
                    <feComponentTransfer in="specular_layer" result="specular_faded">
                        <feFuncA type="linear" slope={specularOpacity} />
                    </feComponentTransfer>
                    <feBlend
                        in="specular_saturated"
                        in2="displaced"
                        mode="normal"
                        result="withSaturation"
                    />
                    <feBlend in="specular_faded" in2="withSaturation" mode="normal" />
                {/if}
            </filter>
        </defs>
    </svg>

    <!-- Capa del material: hermana del contenido, NO pseudo.
         z-index:-1 dentro del stacking context del host la pone debajo de
         los hijos automáticamente. backdrop-filter sobre este span lee el
         backdrop ROOT real (html), no el host. -->
    <span class="liquid-glass-bg" class:lg-ready={!!assets} aria-hidden="true"></span>

    {@render children?.()}
</svelte:element>

<style>
    /* Host: solo `position: relative; z-index: 0` para crear stacking
       context. NO transform/isolation/filter/will-change → no backdrop
       root → el filtro de .liquid-glass-bg ve el documento completo. */
    .liquid-glass-host {
        position: relative;
        z-index: 0;
        border-radius: var(--lg-radius);
    }

    .liquid-glass-svg {
        position: absolute;
        top: 0;
        left: 0;
        width: 0;
        height: 0;
        overflow: hidden;
        pointer-events: none;
    }

    /* Material: absoluto cubriendo el host, z-index:-1 lo manda debajo de
       todos los children del consumer sin requerir z-index en ellos.
       backdrop-filter aplicado aquí — la pieza clave. */
    .liquid-glass-bg {
        position: absolute;
        inset: 0;
        z-index: -1;
        border-radius: inherit;
        pointer-events: none;
        background: var(--lg-tint);
        backdrop-filter: var(--lg-fallback);
        -webkit-backdrop-filter: var(--lg-fallback);
        box-shadow: 
            inset 0 0 0 1px rgba(255, 255, 255, 0.15),
            0 14px 40px rgba(0, 0, 0, 0.12),
            0 4px 12px rgba(0, 0, 0, 0.06);
    }

    /* Cuando los assets están listos, swap al filtro de refracción real.
       Si el motor no soporta url() en backdrop-filter, la declaración se
       descarta como inválida y se mantiene el fallback de la regla base. */
    .liquid-glass-bg.lg-ready {
        backdrop-filter: var(--lg-fallback);
        backdrop-filter: var(--lg-filter-url);
        -webkit-backdrop-filter: var(--lg-fallback);
        -webkit-backdrop-filter: var(--lg-filter-url);
    }

    @media (prefers-color-scheme: dark) {
        .liquid-glass-bg {
            box-shadow: 
                inset 0 0 0 1px rgba(255, 255, 255, 0.08),
                inset 0 1px 0 0 rgba(255, 255, 255, 0.12),
                0 14px 40px rgba(0, 0, 0, 0.35),
                0 4px 12px rgba(0, 0, 0, 0.2);
        }
    }
</style>
