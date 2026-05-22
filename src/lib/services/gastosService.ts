import { collection, doc, addDoc, updateDoc, deleteDoc, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '$lib/firebase';
import { authStore } from '$lib/stores/auth';
import { get } from 'svelte/store';
import { writable } from 'svelte/store';

// 1. Importar los tipos correctos y el store de categorías
import type { GastoWithCategory, CreateGastoData, UpdateGastoData } from '$lib/types';
import { categorias as allCategoriasStore } from './categoriaService';

// 2. Stores locales para gastos
export const gastos = writable<GastoWithCategory[]>([]);
export const loadingGastos = writable<boolean>(true);
export const errorGastos = writable<string | null>(null);

// --- Funciones Helper (solo las necesarias) ---
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount);
}

export function formatGastoDate(date: Date): string {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const inputDate = new Date(date);

    // Formato de hora más legible (e.g., "5:30 p. m.")
    const timeString = inputDate.toLocaleTimeString('es-PE', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });

    // Clonar fechas para comparar solo el día (sin la hora)
    const inputDateOnly = new Date(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

    if (inputDateOnly.getTime() === todayOnly.getTime()) {
        return `Hoy, ${timeString}`;
    }

    if (inputDateOnly.getTime() === yesterdayOnly.getTime()) {
        return `Ayer, ${timeString}`;
    }

    // Formato de fecha más legible para otros días (e.g., "5 sep. 2025")
    const dateString = inputDate.toLocaleDateString('es-PE', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    }).replace('.', ''); // Eliminar el punto que a veces agrega 'short' month

    return `${dateString}, ${timeString}`;
}

interface RawGasto {
    id: string;
    categoriaId: string;
    fecha: Date;
    monto: number;
    nota?: string;
}

const DEFAULT_CATEGORIA = { id: 'deleted', name: 'Eliminada', icon: '🗑️', isFavorite: false };

class GastosService {
    private unsubscribeFromDb: (() => void) | null = null;
    private unsubscribeFromCategorias: (() => void) | null = null;
    private rawGastos: RawGasto[] = [];

    private getUserGastosRef() {
        const user = get(authStore).user;
        if (!user) throw new Error('Usuario no autenticado');
        return collection(db, 'users', user.uid, 'expenses');
    }

    // Recompone gastos + categoría actual. Se llama cuando cambia el snapshot
    // de Firestore O cuando el usuario edita/agrega categorías (de lo
    // contrario gasto.categoria quedaba congelado al último snapshot).
    private rebuildGastos() {
        const allCategorias = get(allCategoriasStore);
        gastos.set(
            this.rawGastos.map((g) => ({
                ...g,
                categoria: allCategorias.find((c) => c.id === g.categoriaId) ?? DEFAULT_CATEGORIA
            }))
        );
    }

    subscribeToGastos() {
        if (this.unsubscribeFromDb) return;

        try {
            loadingGastos.set(true);
            errorGastos.set(null);

            const q = query(this.getUserGastosRef(), orderBy('fecha', 'desc'));

            this.unsubscribeFromDb = onSnapshot(
                q,
                (snapshot) => {
                    this.rawGastos = snapshot.docs.map((doc) => {
                        const data = doc.data();
                        const fechaValue = data.fecha;
                        const fechaAsDate =
                            fechaValue && typeof fechaValue.toDate === 'function'
                                ? fechaValue.toDate()
                                : fechaValue;
                        return {
                            id: doc.id,
                            monto: data.monto,
                            nota: data.nota,
                            fecha: fechaAsDate,
                            categoriaId: data.categoriaId
                        };
                    });
                    this.rebuildGastos();
                    loadingGastos.set(false);
                },
                (err) => {
                    console.error('Firestore error:', err);
                    errorGastos.set('Error de conexión con Firestore');
                    loadingGastos.set(false);
                }
            );

            // Re-render cuando las categorías cambian (edición/creación).
            this.unsubscribeFromCategorias = allCategoriasStore.subscribe(() => {
                if (this.rawGastos.length > 0) this.rebuildGastos();
            });
        } catch (err) {
            console.error('Error subscribing to gastos:', err);
            errorGastos.set('Error al conectar con la base de datos');
            loadingGastos.set(false);
        }
    }

    unsubscribeFromGastos() {
        if (this.unsubscribeFromDb) {
            this.unsubscribeFromDb();
            this.unsubscribeFromDb = null;
        }
        if (this.unsubscribeFromCategorias) {
            this.unsubscribeFromCategorias();
            this.unsubscribeFromCategorias = null;
        }
        this.rawGastos = [];
        gastos.set([]);
    }

    // 6. Usar la interfaz CreateGastoData
    async addGasto(gastoData: CreateGastoData): Promise<string> {
        // Firestore convierte el objeto Date a Timestamp automáticamente
        const docRef = await addDoc(this.getUserGastosRef(), gastoData);
        return docRef.id;
    }

    // 7. Usar la interfaz UpdateGastoData
    async updateGasto(id: string, updates: UpdateGastoData): Promise<void> {
        const gastoRef = doc(this.getUserGastosRef(), id);
        await updateDoc(gastoRef, updates);
    }

    async deleteGasto(id: string): Promise<void> {
        const gastoRef = doc(this.getUserGastosRef(), id);
        await deleteDoc(gastoRef);
    }

    // 8. Se eliminan todos los métodos de categoría de este archivo.
}

export const gastosService = new GastosService();