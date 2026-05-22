// Refracción física para el efecto Liquid Glass (iOS 26).
//
// Algoritmos portados de https://github.com/lollipopkit/liquid-glass
// (paquete @lollipopkit/liquid-glass, archivos lib/displacementMap.ts y
// lib/specular.ts). Referencia matemática: https://kube.io/blog/liquid-glass-css-svg
//
// La pipeline:
//   1. `displacementProfile`  : curva 1D de desviación de rayos a través
//                                del bisel, usando la ley de Snell.
//   2. `generateDisplacementMap`: proyecta esa curva a un mapa 2D RGBA
//                                (R = -Δx, G = -Δy en torno a #008080)
//                                para un rounded rect del tamaño dado.
//   3. `generateSpecularMap`   : mapa de highlight a lo largo del bisel,
//                                modulado por un ángulo de luz.
//
// El mapa de desplazamiento alimenta `<feDisplacementMap>`. El de specular
// se compone después como capa de luz. Sin DOM aquí — solo cálculo puro.

export type SurfaceFn = (x: number) => number;

export const SURFACE_CONVEX_SQUIRCLE: SurfaceFn = (x) =>
    Math.pow(1 - Math.pow(1 - x, 4), 1 / 4);

export const SURFACE_CONVEX_CIRCLE: SurfaceFn = (x) =>
    Math.sqrt(1 - (1 - x) ** 2);

/**
 * Curva 1D de desviación del rayo a lo largo del bisel.
 * @param glassThickness  espesor del "cuerpo" plano del vidrio (en px)
 * @param bezelWidth      ancho del bisel curvado (en px)
 * @param refractiveIndex índice de refracción (1.5 ≈ vidrio óptico)
 * @param surfaceFn       perfil del bisel (convex squircle = iOS 26)
 * @param samples         resolución del perfil (128 por defecto)
 */
export function calculateDisplacementProfile(
    glassThickness: number,
    bezelWidth: number,
    refractiveIndex: number,
    surfaceFn: SurfaceFn = SURFACE_CONVEX_SQUIRCLE,
    samples = 128
): number[] {
    const eta = 1 / refractiveIndex;
    const dx = 0.0001;
    const profile = new Array<number>(samples);

    for (let i = 0; i < samples; i++) {
        const x = i / samples;
        const y = surfaceFn(x);
        const y2 = surfaceFn(x + dx);

        const derivative = (y2 - y) / dx;
        const magnitude = Math.sqrt(derivative * derivative + 1);
        const normalX = -derivative / magnitude;
        const normalY = -1 / magnitude;
        const dot = normalY;
        const k = 1 - eta * eta * (1 - dot * dot);

        if (k >= 0) {
            const kSqrt = Math.sqrt(k);
            const refractedX = -(eta * dot + kSqrt) * normalX;
            const refractedY = eta - (eta * dot + kSqrt) * normalY;
            const remainingHeight = y * bezelWidth + glassThickness;
            profile[i] = refractedX * (remainingHeight / refractedY);
        } else {
            profile[i] = 0;
        }
    }

    return profile;
}

export function maxAbs(values: number[]): number {
    let max = 0;
    for (const v of values) {
        const a = Math.abs(v);
        if (a > max) max = a;
    }
    return max;
}

export interface DisplacementMap {
    data: ImageData;
    maxDisplacement: number;
}

/**
 * Mapa 2D de desplazamiento para un rounded rect.
 * Pixel format: R = 128 - Δx_scaled, G = 128 - Δy_scaled, B = 0, A = 255.
 * Fuera del anillo del bisel queda neutral (sin desplazamiento).
 */
export function generateDisplacementMap(
    width: number,
    height: number,
    radius: number,
    bezelWidth: number,
    profile: number[],
    dpr = 1
): DisplacementMap {
    const w = Math.max(1, Math.round(width * dpr));
    const h = Math.max(1, Math.round(height * dpr));
    const pixels = new Uint8ClampedArray(w * h * 4);

    // Neutral fill: 0xff008080 little-endian = A:255 B:0 G:128 R:128.
    new Uint32Array(pixels.buffer).fill(0xff008080);

    const r = radius * dpr;
    const bezel = bezelWidth * dpr;
    const outerR = r + 1;
    const rSq = r * r;
    const outerRSq = outerR * outerR;
    const innerRSq = Math.max(0, (r - bezel) ** 2);

    const wBetween = w - r * 2;
    const hBetween = h - r * 2;
    const rightStart = w - r;
    const bottomStart = h - r;

    const bezelIdxScale = bezel > 0 ? profile.length / bezel : 0;
    const maxDisp = maxAbs(profile);
    const dispScale = maxDisp > 0 ? 127 / maxDisp : 0;

    for (let py = 0; py < h; py++) {
        const onTop = py < r;
        const onBottom = py >= bottomStart;
        const y = onTop ? py - r : onBottom ? py - r - hBetween : 0;
        const ySq = y * y;
        const rowStart = py * w * 4;

        for (let px = 0; px < w; px++) {
            const onLeft = px < r;
            const onRight = px >= rightStart;
            const x = onLeft ? px - r : onRight ? px - r - wBetween : 0;
            const dSq = x * x + ySq;

            if (dSq > outerRSq || dSq < innerRSq) continue;

            const d = Math.sqrt(dSq);
            const distFromSide = r - d;
            const opacity = dSq < rSq ? 1 : Math.max(0, outerR - d);
            const idx = (distFromSide * bezelIdxScale) | 0;
            const disp = profile[idx] ?? 0;
            const factor = d !== 0 ? (disp * dispScale * opacity) / d : 0;

            const i = rowStart + px * 4;
            const rVal = 128 - x * factor;
            const gVal = 128 - y * factor;
            pixels[i] = rVal < 0 ? 0 : rVal > 255 ? 255 : rVal;
            pixels[i + 1] = gVal < 0 ? 0 : gVal > 255 ? 255 : gVal;
            pixels[i + 2] = 0;
            pixels[i + 3] = 255;
        }
    }

    return { data: new ImageData(pixels, w, h), maxDisplacement: maxDisp };
}

/**
 * Mapa de specular highlight a lo largo del anillo del bisel.
 * Devuelve ImageData RGBA con un brillo modulado por:
 *   - distancia al borde (más nítido cerca del bisel exterior)
 *   - ángulo respecto al vector de luz (`specularAngle`)
 */
export function generateSpecularMap(
    width: number,
    height: number,
    radius: number,
    bezelWidth: number,
    specularAngle: number = Math.PI / 3,
    dpr = 1
): ImageData {
    const w = Math.max(1, Math.round(width * dpr));
    const h = Math.max(1, Math.round(height * dpr));
    const pixels = new Uint8ClampedArray(w * h * 4);
    // pixels comienza transparente (todo cero) → backdrop intacto fuera del bisel.

    const r = radius * dpr;
    const bezel = bezelWidth * dpr;
    const sVx = Math.cos(specularAngle);
    const sVy = Math.sin(specularAngle);

    const rSq = r * r;
    const outerR = r + dpr;
    const innerR = Math.max(r - bezel, r - dpr);
    const outerRSq = outerR * outerR;
    const innerRSq = innerR * innerR;

    const wBetween = w - r * 2;
    const hBetween = h - r * 2;
    const rightStart = w - r;
    const bottomStart = h - r;
    const invDpr = 1 / dpr;

    for (let py = 0; py < h; py++) {
        const onTop = py < r;
        const onBottom = py >= bottomStart;
        const y = onTop ? py - r : onBottom ? py - r - hBetween : 0;
        const ySq = y * y;
        const rowStart = py * w * 4;

        for (let px = 0; px < w; px++) {
            const onLeft = px < r;
            const onRight = px >= rightStart;
            const x = onLeft ? px - r : onRight ? px - r - wBetween : 0;
            const dSq = x * x + ySq;

            if (dSq > outerRSq || dSq < innerRSq) continue;

            const d = Math.sqrt(dSq);
            const distFromSide = r - d;
            const normalizedFromSide = distFromSide * invDpr;
            if (normalizedFromSide <= 0) continue;

            const opacity = dSq < rSq ? 1 : Math.max(0, 1 - (d - r) * invDpr);
            const invD = 1 / d;
            const dot = Math.abs((x * sVx - y * sVy) * invD);
            const coeffBase =
                1 - (1 - normalizedFromSide) * (1 - normalizedFromSide);
            if (coeffBase <= 0) continue;

            const coeff = dot * Math.sqrt(coeffBase);
            const color = 255 * coeff;
            const finalAlpha = color * coeff * opacity;

            const i = rowStart + px * 4;
            pixels[i] = color;
            pixels[i + 1] = color;
            pixels[i + 2] = color;
            pixels[i + 3] = finalAlpha;
        }
    }

    return new ImageData(pixels, w, h);
}
