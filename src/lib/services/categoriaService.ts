import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, Timestamp, type FirestoreError, orderBy, query, getDoc } from 'firebase/firestore';
import { db } from '$lib/firebase';
import { authStore } from '$lib/stores/auth';
import { get } from 'svelte/store';
import { writable } from 'svelte/store';
// 1. Importar la interfaz compartida
import type { Categoria } from '$lib/types';

// 2. Los stores se quedan aquí, son la fuente de verdad para las categorías.
export const categorias = writable<Categoria[]>([]);
export const loadingCategorias = writable<boolean>(true);
export const errorCategorias = writable<string | null>(null);

class CategoriaService {
    private unsubscribeFromDb: (() => void) | null = null;

    private getUserCategoriesRef() {
        const user = get(authStore).user;
        if (!user) throw new Error('Usuario no autenticado');
        return collection(db, 'users', user.uid, 'categories');
    }

    subscribeToCategorias(): void {
        if (this.unsubscribeFromDb) return; // Evitar múltiples suscripciones

        try {
            loadingCategorias.set(true);
            errorCategorias.set(null);

            const q = query(this.getUserCategoriesRef(), orderBy('createdAt', 'desc'));

            this.unsubscribeFromDb = onSnapshot(q, (snapshot) => {
                const newCategorias = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        name: data.name,
                        icon: data.icon,
                        isFavorite: data.isFavorite,
                        // 3. Convertir Timestamp de Firestore a objeto Date
                        createdAt: data.createdAt?.toDate()
                    } as Categoria;
                });
                categorias.set(newCategorias);
                loadingCategorias.set(false);
            }, (err: FirestoreError) => {
                console.error('Firebase read error:', err);
                errorCategorias.set('Failed to load categories.');
                loadingCategorias.set(false);
            });
        } catch (err) {
            console.error('Error subscribing to categories:', err);
            errorCategorias.set('Error al conectar con la base de datos');
            loadingCategorias.set(false);
        }
    }

    unsubscribeFromCategorias(): void {
        if (this.unsubscribeFromDb) {
            this.unsubscribeFromDb();
            this.unsubscribeFromDb = null;
            categorias.set([]); // Limpiar el store al desuscribir
        }
    }

    // 4. Simplificar la firma del método
    async addCategoria(data: { name: string; icon: string; isFavorite?: boolean }): Promise<string> {
        const docRef = await addDoc(this.getUserCategoriesRef(), {
            ...data,
            isFavorite: data.isFavorite ?? false,
            createdAt: Timestamp.now()
        });
        return docRef.id;
    }

    async updateCategoria(id: string, updates: Partial<Omit<Categoria, 'id' | 'createdAt'>>): Promise<void> {
        const ref = doc(this.getUserCategoriesRef(), id);
        await updateDoc(ref, updates);
    }

    async deleteCategoria(id: string): Promise<void> {
        const ref = doc(this.getUserCategoriesRef(), id);
        await deleteDoc(ref);
    }

    // NUEVO MÉTODO: Obtener una categoría específica por su ID
    async getCategoriaById(id: string): Promise<Categoria | null> {
        try {
            const ref = doc(this.getUserCategoriesRef(), id);
            const docSnap = await getDoc(ref);

            if (!docSnap.exists()) {
                console.warn(`No se encontró la categoría con ID: ${id}`);
                return null;
            }

            const data = docSnap.data();
            return {
                id: docSnap.id,
                name: data.name,
                icon: data.icon,
                isFavorite: data.isFavorite,
                createdAt: data.createdAt?.toDate()
            } as Categoria;

        } catch (err) {
            console.error(`Error al obtener la categoría con ID ${id}:`, err);
            errorCategorias.set('No se pudo obtener la categoría.');
            return null;
        }
    }
}

export const categoriaService = new CategoriaService();