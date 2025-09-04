import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, Timestamp, type FirestoreError } from 'firebase/firestore';
import { db } from '$lib/firebase';
import { authStore } from '$lib/stores/auth';
import { get } from 'svelte/store';
import { writable } from 'svelte/store';

// Define el tipo para una categoría
export interface Categoria {
    id: string;
    name: string;
    icon: string;
    isFavorite: boolean;
    createdAt: Timestamp;
}

// Svelte stores para categorías
export const categorias = writable<Categoria[]>([]);
export const loading = writable<boolean>(true);
export const error = writable<string | null>(null);


// Servicio para la gestión de categorías
class CategoriaService {

    private unsubscribeFromDb: (() => void) | null = null;
    // Referencia a la colección de categorías del usuario
    private getUserCategoriesRef() {
        const user = get(authStore).user;
        if (!user) {
            throw new Error('Usuario no autenticado');
        }
        return collection(db, 'users', user.uid, 'categories');
    }

    // Suscribirse a la colección en tiempo real
    subscribeToCategorias(): void {
        const user = get(authStore).user;
        if (!user) {
            error.set('Usuario no autenticado');
            loading.set(false);
            return;
        }

        try {
            loading.set(true);
            error.set(null);

            this.unsubscribeFromDb = onSnapshot(this.getUserCategoriesRef(), (snapshot) => {
                const newCategorias = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Categoria[];
                categorias.set(newCategorias);
                loading.set(false);
            }, (err: FirestoreError) => {
                console.error('Firebase read error:', err);
                error.set('Failed to load categories. Please try again later.');
                loading.set(false);
            });
        } catch (err) {
            console.error('Error subscribing to categories:', err);
            error.set('Error al conectar con la base de datos');
            loading.set(false);
        }
    }

    // Desuscribirse de la colección
    unsubscribeFromCategorias(): void {
        if (this.unsubscribeFromDb) {
            this.unsubscribeFromDb();
            this.unsubscribeFromDb = null;
        }
    }

    // Crear nueva categoría
    async addCategoria(nombre: string, icon: string, isFavorite: boolean = true): Promise<Categoria> {
        try {
            const docRef = await addDoc(this.getUserCategoriesRef(), {
                name: nombre,
                icon,
                isFavorite,
                createdAt: Timestamp.now()
            });
            return { id: docRef.id, name: nombre, icon, isFavorite, createdAt: Timestamp.now() };
        } catch (e) {
            console.error('Error adding category:', e);
            throw new Error('Could not add category.');
        }
    }

    // Actualizar categoría
    async updateCategoria(id: string, updates: Partial<{ name: string; icon: string; isFavorite: boolean }>): Promise<void> {
        try {
            const ref = doc(this.getUserCategoriesRef(), id);
            await updateDoc(ref, updates);
        } catch (e) {
            console.error('Error updating category:', e);
            throw new Error('Could not update category.');
        }
    }

    // Eliminar categoría
    async deleteCategoria(id: string): Promise<void> {
        try {
            const ref = doc(this.getUserCategoriesRef(), id);
            await deleteDoc(ref);
        } catch (e) {
            console.error('Error deleting category:', e);
            throw new Error('Could not delete category.');
        }
    }

    loadAndSubscribeToCategorias(): Promise<void> {
        return new Promise((resolve, reject) => {
            const user = get(authStore).user;
            if (!user) {
                const authError = 'Usuario no autenticado';
                error.set(authError);
                loading.set(false);
                return reject(new Error(authError));
            }

            // Evitar crear una nueva suscripción si ya existe una.
            if (this.unsubscribeFromDb) {
                return resolve();
            }

            try {
                loading.set(true);
                error.set(null);
                let isInitialLoad = true;

                this.unsubscribeFromDb = onSnapshot(this.getUserCategoriesRef(), (snapshot) => {
                    const newCategorias = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    })) as Categoria[];
                    
                    categorias.set(newCategorias);
                    loading.set(false);

                    if (isInitialLoad) {
                        isInitialLoad = false;
                        resolve(); // Resuelve la promesa en la carga inicial.
                    }
                }, (err: FirestoreError) => {
                    console.error('Firebase read error:', err);
                    const readError = 'Failed to load categories.';
                    error.set(readError);
                    loading.set(false);
                    reject(new Error(readError));
                });
            } catch (err) {
                console.error('Error subscribing to categories:', err);
                const connectError = 'Error al conectar con la base de datos';
                error.set(connectError);
                loading.set(false);
                reject(new Error(connectError));
            }
        });
    }
}

// Exportar la instancia del servicio
export const categoriaService = new CategoriaService();

// Exportar funciones de suscripción para su uso en el componente Svelte
export const subscribeToCategorias = () => categoriaService.subscribeToCategorias();
export const unsubscribeFromCategorias = () => categoriaService.unsubscribeFromCategorias();