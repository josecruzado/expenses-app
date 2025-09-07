import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider,
  onAuthStateChanged,
  type User 
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { writable } from 'svelte/store';
import type { Gasto } from './types';

// Firebase configuration - usando variables de entorno
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Validar que todas las variables estén configuradas
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN', 
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_MEASUREMENT_ID'
];

const missingVars = requiredEnvVars.filter(varName => !import.meta.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Faltan las siguientes variables de entorno:', missingVars);
  throw new Error(`Variables de entorno faltantes: ${missingVars.join(', ')}`);
}

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Configure Google Provider
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Mapa de errores (reutiliza tu lista)
const FIREBASE_ERROR_MESSAGES: { [key: string]: string } = {
  // Errores de autenticación con email/contraseña
  'auth/user-not-found': 'No existe una cuenta con este correo electrónico',
  'auth/wrong-password': 'La contraseña es incorrecta',
  'auth/invalid-credential': 'El correo o la contraseña son incorrectos',
  'auth/invalid-email': 'El formato del correo electrónico no es válido',
  'auth/user-disabled': 'Esta cuenta ha sido deshabilitada',
  'auth/email-already-in-use': 'Ya existe una cuenta con este correo electrónico',
  'auth/operation-not-allowed': 'Método de autenticación no habilitado',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
  'auth/too-many-requests': 'Demasiados intentos fallidos. Intenta nuevamente en unos minutos',
  'auth/quota-exceeded': 'Se ha excedido la cuota de solicitudes',
  'auth/popup-closed-by-user': 'Has cerrado la ventana antes de completar el proceso',
  'auth/cancelled-popup-request': 'Solo se puede abrir una ventana de login a la vez',
  'auth/popup-blocked': 'Tu navegador ha bloqueado la ventana emergente',
  'auth/unauthorized-domain': 'Este dominio no está autorizado para usar Firebase Auth',
  'auth/invalid-api-key': 'Clave de API inválida',
  'auth/app-not-authorized': 'Aplicación no autorizada para usar Firebase Auth',
  'auth/network-request-failed': 'Error de conexión a internet. Verifica tu conexión',
  'auth/internal-error': 'Error interno del servidor. Intenta nuevamente',
  'auth/custom-token-mismatch': 'Token personalizado inválido',
  'auth/invalid-custom-token': 'El formato del token personalizado es incorrecto',
  'auth/token-expired': 'La sesión ha expirado. Inicia sesión nuevamente',
  'auth/missing-android-pkg-name': 'Falta configuración de Android',
  'auth/missing-ios-bundle-id': 'Falta configuración de iOS',
  'auth/invalid-continue-uri': 'URL de continuación inválida',
  'auth/unauthorized-continue-uri': 'URL de continuación no autorizada',
  'auth/requires-recent-login': 'Por seguridad, vuelve a iniciar sesión',
  'auth/credential-already-in-use': 'Esta cuenta ya está vinculada a otro usuario',
  'auth/account-exists-with-different-credential': 'Ya existe una cuenta con este correo usando otro método de login',

  // HTTP comunes (por si llega status)
  '400': 'Solicitud inválida. Intenta nuevamente',
  '401': 'No autorizado. Verifica tus credenciales',
  '403': 'Acceso denegado',
  '404': 'Recurso no encontrado',
  '409': 'Conflicto de datos',
  '429': 'Demasiadas solicitudes. Intenta más tarde',
  '500': 'Error del servidor. Intenta nuevamente',
  '502': 'Puerta de enlace inválida',
  '503': 'Servicio no disponible. Intenta más tarde',
  '504': 'Tiempo de espera agotado'
};

// Exporta esta función para reutilizarla
export function translateFirebaseError(error: unknown): string {
  const e = error as any;
  const code = typeof e?.code === 'string' ? e.code : undefined;
  const message = typeof e?.message === 'string' ? e.message.toLowerCase() : '';

  // 1) Coincidencia directa por code
  if (code && FIREBASE_ERROR_MESSAGES[code]) return FIREBASE_ERROR_MESSAGES[code];

  // 2) Si code es numérico o viene en status
  if (typeof e?.code === 'number' && FIREBASE_ERROR_MESSAGES[String(e.code)]) {
    return FIREBASE_ERROR_MESSAGES[String(e.code)];
  }
  if (typeof e?.status === 'number' && FIREBASE_ERROR_MESSAGES[String(e.status)]) {
    return FIREBASE_ERROR_MESSAGES[String(e.status)];
  }

  // 3) Buscar cualquier clave 'auth/...' dentro de error.message
  if (message) {
    // Intentar extraer exacto con regex
    const m = message.match(/auth\/[a-z0-9-]+/i);
    if (m && FIREBASE_ERROR_MESSAGES[m[0].toLowerCase()]) {
      return FIREBASE_ERROR_MESSAGES[m[0].toLowerCase()];
    }
    // O incluir si el mensaje contiene alguna clave definida
    for (const key of Object.keys(FIREBASE_ERROR_MESSAGES)) {
      if (message.includes(key)) return FIREBASE_ERROR_MESSAGES[key];
    }
  }

  return 'Ocurrió un error. Intenta nuevamente';
}

// Stores (manteniendo los existentes)
export const gastos = writable<Gasto[]>([]);
export const loading = writable(true);
export const error = writable<string | null>(null);