// Runtime browser para generar los assets de Liquid Glass:
//   - mapa de desplazamiento (PNG → blob: URL)
//   - mapa de specular (PNG → blob: URL)
//
// Diseño: cero dependencias, sin web worker (los mapas son pequeños — la
// generación en el main thread es <8ms para 400×100 en Apple Silicon).
// Las URLs son blob: para que iOS Safari las consuma como `<feImage href>`
// sin restricciones de same-origin de data URLs en SVG embebido.
//
// Cache opcional: claves por params normalizados, hasta MAX_CACHE entries.
// El consumidor debe llamar `disposeAssets()` cuando deja de usarlos para
// liberar los blob URLs (URL.revokeObjectURL).

import {
    calculateDisplacementProfile,
    generateDisplacementMap,
    generateSpecularMap,
    SURFACE_CONVEX_SQUIRCLE,
    type SurfaceFn
} from './refraction';

export interface LiquidGlassParams {
    width: number;
    height: number;
    radius: number;
    bezelWidth: number;
    glassThickness: number;
    refractiveIndex: number;
    specularAngle?: number;
    surface?: SurfaceFn;
    dpr?: number;
}

export interface LiquidGlassAssets {
    displacementUrl: string;
    specularUrl: string;
    width: number;
    height: number;
    maxDisplacement: number;
    dispose: () => void;
}

const MAX_CACHE = 8;
const cache = new Map<string, Promise<LiquidGlassAssets>>();

function cacheKey(p: LiquidGlassParams): string {
    return [
        p.width,
        p.height,
        p.radius,
        p.bezelWidth,
        p.glassThickness,
        p.refractiveIndex,
        p.specularAngle ?? Math.PI / 3,
        p.dpr ?? 1
    ].join('|');
}

async function imageDataToBlob(data: ImageData): Promise<Blob> {
    if (typeof OffscreenCanvas !== 'undefined') {
        const canvas = new OffscreenCanvas(data.width, data.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('OffscreenCanvas 2D context unavailable');
        ctx.putImageData(data, 0, 0);
        return await canvas.convertToBlob({ type: 'image/png' });
    }

    const canvas = document.createElement('canvas');
    canvas.width = data.width;
    canvas.height = data.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    ctx.putImageData(data, 0, 0);

    return await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('toBlob returned null'))),
            'image/png'
        );
    });
}

async function build(params: LiquidGlassParams): Promise<LiquidGlassAssets> {
    const dpr =
        params.dpr ?? (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
    const surface = params.surface ?? SURFACE_CONVEX_SQUIRCLE;

    const profile = calculateDisplacementProfile(
        params.glassThickness,
        params.bezelWidth,
        params.refractiveIndex,
        surface
    );

    const dispMap = generateDisplacementMap(
        params.width,
        params.height,
        params.radius,
        params.bezelWidth,
        profile,
        dpr
    );

    const specMap = generateSpecularMap(
        params.width,
        params.height,
        params.radius,
        params.bezelWidth,
        params.specularAngle ?? Math.PI / 3,
        dpr
    );

    const [dispBlob, specBlob] = await Promise.all([
        imageDataToBlob(dispMap.data),
        imageDataToBlob(specMap)
    ]);

    const displacementUrl = URL.createObjectURL(dispBlob);
    const specularUrl = URL.createObjectURL(specBlob);

    return {
        displacementUrl,
        specularUrl,
        width: dispMap.data.width,
        height: dispMap.data.height,
        maxDisplacement: dispMap.maxDisplacement,
        dispose: () => {
            URL.revokeObjectURL(displacementUrl);
            URL.revokeObjectURL(specularUrl);
        }
    };
}

/**
 * Genera (o reutiliza desde caché) los assets para un set de parámetros.
 * El consumidor NO debe llamar a `dispose()` directamente cuando la
 * entrada está cacheada — usa `releaseAssets` con la misma clave si
 * quieres invalidarla.
 */
export function createLiquidGlassAssets(
    params: LiquidGlassParams,
    options: { useCache?: boolean } = {}
): Promise<LiquidGlassAssets> {
    const useCache = options.useCache ?? true;
    if (!useCache) return build(params);

    const key = cacheKey(params);
    const cached = cache.get(key);
    if (cached) return cached;

    const promise = build(params);
    cache.set(key, promise);

    // Si pasamos del límite, liberamos las entradas más antiguas.
    if (cache.size > MAX_CACHE) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey !== undefined && oldestKey !== key) {
            const old = cache.get(oldestKey);
            cache.delete(oldestKey);
            old?.then((a) => a.dispose()).catch(() => {});
        }
    }

    return promise;
}

/** Vacía la caché y libera todos los blob URLs activos. */
export function clearLiquidGlassCache(): void {
    for (const p of cache.values()) {
        p.then((a) => a.dispose()).catch(() => {});
    }
    cache.clear();
}
