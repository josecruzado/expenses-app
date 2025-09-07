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

class GastosService {
    private unsubscribeFromDb: (() => void) | null = null;

    private getUserGastosRef() {
        const user = get(authStore).user;
        if (!user) throw new Error('Usuario no autenticado');
        return collection(db, 'users', user.uid, 'expenses');
    }

    subscribeToGastos() {
        if (this.unsubscribeFromDb) return;

        try {
            loadingGastos.set(true);
            errorGastos.set(null);

            const q = query(this.getUserGastosRef(), orderBy('fecha', 'desc'));
            
            this.unsubscribeFromDb = onSnapshot(q, (snapshot) => {
                // 3. Obtener las categorías actuales del store de categoriaService
                const allCategorias = get(allCategoriasStore);
                const defaultCategoria = { id: 'deleted', name: 'Eliminada', icon: '🗑️', isFavorite: false };

                const gastosArray: GastoWithCategory[] = snapshot.docs.map(doc => {
                    const data = doc.data();
                    const categoria = allCategorias.find(c => c.id === data.categoriaId) || defaultCategoria;

                    // CAMBIO: Comprobar si `data.fecha` es un Timestamp antes de llamar a .toDate()
                    // Esto maneja tanto los datos del servidor (Timestamp) como los datos locales (Date).
                    const fechaValue = data.fecha;
                    const fechaAsDate = fechaValue && typeof fechaValue.toDate === 'function' 
                        ? fechaValue.toDate() 
                        : fechaValue;

                    return {
                        id: doc.id,
                        monto: data.monto,
                        nota: data.nota,
                        fecha: fechaAsDate, // Usar el valor ya convertido o el original si ya era Date
                        categoriaId: data.categoriaId,
                        categoria: categoria
                    };
                });
                
                gastos.set(gastosArray);
                loadingGastos.set(false);
            }, (err) => {
                console.error('Firestore error:', err);
                errorGastos.set('Error de conexión con Firestore');
                loadingGastos.set(false);
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
            gastos.set([]); // Limpiar el store
        }
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