import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db, gastos, loading, error, type Gasto } from '$lib/firebase';
import { authStore } from '$lib/stores/auth';
import { get } from 'svelte/store';

// Mantener tus funciones helper existentes
export function parseSpanishDate(fecha: string): Date {
	const monthMap: { [key: string]: number } = {
		'ene': 0, 'feb': 1, 'mar': 2, 'abr': 3,
		'may': 4, 'jun': 5, 'jul': 6, 'ago': 7,
		'sep': 8, 'oct': 9, 'nov': 10, 'dic': 11
	};
	
	const datePattern = /(\d{1,2})\s+([a-z]{3})\s+(\d{4}),?\s+(\d{1,2}):(\d{2})\s+(a\.m\.|p\.m\.)/i;
	const match = fecha.match(datePattern);
	
	if (match) {
		const [, day, monthSpanish, year, hour, minute, period] = match;
		const monthIndex = monthMap[monthSpanish.toLowerCase()];
		
		if (monthIndex !== undefined) {
			const isPM = period.toLowerCase().includes('p');
			let hour24 = parseInt(hour);
			
			if (isPM && hour24 !== 12) {
				hour24 += 12;
			} else if (!isPM && hour24 === 12) {
				hour24 = 0;
			}
			
			return new Date(parseInt(year), monthIndex, parseInt(day), hour24, parseInt(minute));
		}
	}
	
	return new Date(0); // Return epoch if parsing fails
}

export function formatCurrency(amount: number): string {
	const absAmount = Math.abs(amount);
	const prefix = amount < 0 ? '-' : '';
	return `${prefix}$${absAmount.toFixed(2)}`;
}

export function getCategoryIcon(categoria: string): string {
	if (categoria.includes('🏥')) return '🏥';
	if (categoria.includes('🍽️')) return '🍽️';
	if (categoria.includes('🚗')) return '🚗';
	if (categoria.includes('🏡')) return '🏡';
	if (categoria.includes('🛒')) return '🛒';
	if (categoria.includes('⛽')) return '⛽';
	if (categoria.includes('☕')) return '☕';
	if (categoria.includes('🎯')) return '🎯';
	if (categoria.includes('💊')) return '💊';
	if (categoria.includes('🎮')) return '🎮';
	return '💰'; // Default icon
}

export function getCategoryName(categoria: string): string {
	return categoria.replace(/^[^\s]+\s/, '').trim();
}

export function formatDate(fecha: string): string {
	try {
		// Spanish month mapping
		const monthMap: { [key: string]: string } = {
			'ene': 'Jan', 'feb': 'Feb', 'mar': 'Mar', 'abr': 'Apr',
			'may': 'May', 'jun': 'Jun', 'jul': 'Jul', 'ago': 'Aug',
			'sep': 'Sep', 'oct': 'Oct', 'nov': 'Nov', 'dic': 'Dec'
		};
		
		// Parse Spanish date format: "17 jul 2025, 9:55 a.m."
		const datePattern = /(\d{1,2})\s+([a-z]{3})\s+(\d{4}),?\s+(\d{1,2}):(\d{2})\s+(a\.m\.|p\.m\.)/i;
		const match = fecha.match(datePattern);
		
		if (match) {
			const [, day, monthSpanish, year, hour, minute, period] = match;
			const monthEnglish = monthMap[monthSpanish.toLowerCase()];
			
			if (monthEnglish) {
				// Create English date string
				const isPM = period.toLowerCase().includes('p');
				let hour24 = parseInt(hour);
				
				if (isPM && hour24 !== 12) {
					hour24 += 12;
				} else if (!isPM && hour24 === 12) {
					hour24 = 0;
				}
				
				const dateString = `${monthEnglish} ${day}, ${year} ${hour24.toString().padStart(2, '0')}:${minute}:00`;
				const date = new Date(dateString);
				
				if (!isNaN(date.getTime())) {
					const now = new Date();
					const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
					const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
					const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
					
					if (compareDate.getTime() === today.getTime()) {
						return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
					} else if (compareDate.getTime() === yesterday.getTime()) {
						return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
					} else {
						return date.toLocaleDateString([], { 
							month: 'short', 
							day: 'numeric',
							hour: '2-digit',
							minute: '2-digit'
						});
					}
				}
			}
		}
		
		// If parsing fails, return original
		return fecha;
	} catch (error) {
		console.error('Date parsing error:', error);
		return fecha; // Return original if parsing fails
	}
}

// Servicio principal para Firestore
class GastosService {
	private unsubscribe: (() => void) | null = null;

	private getUserGastosRef() {
		const user = get(authStore).user;
		if (!user) {
			throw new Error('Usuario no autenticado');
		}
		return collection(db, 'users', user.uid, 'expenses');
	}

	// Función para suscribirse a gastos (reemplaza subscribeToGastos)
	subscribeToGastos() {
		const user = get(authStore).user;
		if (!user) {
			error.set('Usuario no autenticado');
			loading.set(false);
			return;
		}

		try {
			loading.set(true);
			error.set(null);

			const gastosRef = this.getUserGastosRef();
			
			this.unsubscribe = onSnapshot(gastosRef, (snapshot) => {
				try {
					loading.set(false);
					error.set(null);
					
					const gastosArray: Gasto[] = [];
					
					snapshot.forEach((doc) => {
						const data = doc.data();
						gastosArray.push({
							id: doc.id,
							categoria: data.categoria || '',
							fecha: this.convertirTimestampAFecha(data.fecha), // Convertir timestamp a string
							monto: data.monto || 0,
							nota: data.nota || '',
							uid: user.uid
						});
					});
					
					// Sort by date (most recent first) usando tu lógica existente
					gastosArray.sort((a, b) => {
						const dateA = parseSpanishDate(a.fecha);
						const dateB = parseSpanishDate(b.fecha);
						return dateB.getTime() - dateA.getTime();
					});
					
					gastos.set(gastosArray);
				} catch (err) {
					console.error('Error processing gastos:', err);
					error.set('Error al procesar los gastos');
					loading.set(false);
				}
			}, (err) => {
				console.error('Firestore error:', err);
				error.set('Error de conexión con Firestore');
				loading.set(false);
			});

		} catch (err) {
			console.error('Error subscribing to gastos:', err);
			error.set('Error al conectar con la base de datos');
			loading.set(false);
		}
	}

	// Función para desuscribirse
	unsubscribeFromGastos() {
		if (this.unsubscribe) {
			this.unsubscribe();
			this.unsubscribe = null;
		}
	}

	// Agregar nuevo gasto
	async addGasto(gasto: Omit<Gasto, 'id' | 'uid'>): Promise<{ success: true; id: string } | { success: false; error: string }> {
		try {
			const user = get(authStore).user;
			if (!user) {
				throw new Error('Usuario no autenticado');
			}

			const gastosRef = this.getUserGastosRef();
			
			// Convertir fecha string a timestamp para cumplir con las reglas
			const fechaTimestamp = this.convertirTimestampAFecha(gasto.fecha);
			
			const gastoData = {
				monto: gasto.monto,
				fecha: fechaTimestamp,
				nota: gasto.nota,
				categoria: gasto.categoria,
				// No incluimos uid ni createdAt/updatedAt ya que no están en las reglas
			};

			const docRef = await addDoc(gastosRef, gastoData);
			return { success: true, id: docRef.id };
		} catch (e) {
			const error = e as Error;
			console.error('Error al agregar gasto:', error);
            return { success: false, error: error.message || 'Ocurrió un error desconocido.' };
		}
	}

	// Actualizar gasto
	async updateGasto(id: string, updates: Partial<Omit<Gasto, 'id' | 'uid'>>): Promise<void> {
		try {
			const user = get(authStore).user;
			if (!user) {
				throw new Error('Usuario no autenticado');
			}

			const gastoRef = doc(db, 'users', user.uid, 'expenses', id);
			
			// Convertir fecha a timestamp si está incluida en la actualización
			const updateData: any = { ...updates };
			if (updates.fecha) {
				updateData.fecha = this.convertirFechaATimestamp(updates.fecha);
			}

			await updateDoc(gastoRef, updateData);
		} catch (error) {
			console.error('Error al actualizar gasto:', error);
			throw error;
		}
	}

	// Eliminar gasto
	async deleteGasto(id: string): Promise<void> {
		try {
			const user = get(authStore).user;
			if (!user) {
				throw new Error('Usuario no autenticado');
			}

			const gastoRef = doc(db, 'users', user.uid, 'expenses', id);
			await deleteDoc(gastoRef);
		} catch (error) {
			console.error('Error al eliminar gasto:', error);
			throw error;
		}
	}

    // Obtener gastos por categoría
	async getGastosByCategory(category: string): Promise<Gasto[]> {
		try {
			const gastosRef = this.getUserGastosRef();
			const q = query(gastosRef, where('categoria', '==', category));
			const querySnapshot = await getDocs(q);
			
			const gastosArray: Gasto[] = [];
			querySnapshot.forEach((doc) => {
				const data = doc.data();
				gastosArray.push({
					id: doc.id,
					categoria: data.categoria,
					fecha: this.convertirTimestampAFecha(data.fecha), // Convertir timestamp a string
					monto: data.monto,
					nota: data.nota,
					uid: data.uid
				});
			});

			// Sort by date
			gastosArray.sort((a, b) => {
				const dateA = parseSpanishDate(a.fecha);
				const dateB = parseSpanishDate(b.fecha);
				return dateB.getTime() - dateA.getTime();
			});

			return gastosArray;
		} catch (error) {
			console.error('Error al obtener gastos por categoría:', error);
			throw error;
		}
	}

	// Función para convertir fecha string española a Timestamp de Firestore
	private convertirFechaATimestamp(fechaString: string): Date {
		const fechaParsed = parseSpanishDate(fechaString);
		return fechaParsed;
	}

	// Función para convertir Timestamp de Firestore a string español
	private convertirTimestampAFecha(timestamp: any): string {
		try {
			// Si ya es un string, devolverlo tal como está
			if (typeof timestamp === 'string') {
				return timestamp;
			}

			// Si es un Timestamp de Firestore
			if (timestamp && typeof timestamp.toDate === 'function') {
				const date = timestamp.toDate();
				return this.formatearFechaEspañol(date);
			}

			// Si es un Date object
			if (timestamp instanceof Date) {
				return this.formatearFechaEspañol(timestamp);
			}

			// Si no se puede convertir, devolver string vacío
			console.warn('No se pudo convertir timestamp:', timestamp);
			return '';
		} catch (error) {
			console.error('Error al convertir timestamp:', error);
			return '';
		}
	}

	// Función para formatear Date a string español (formato que espera tu app)
	private formatearFechaEspañol(date: Date): string {
		const meses = [
			'ene', 'feb', 'mar', 'abr', 'may', 'jun',
			'jul', 'ago', 'sep', 'oct', 'nov', 'dic'
		];

		const dia = date.getDate();
		const mes = meses[date.getMonth()];
		const año = date.getFullYear();
		
		let horas = date.getHours();
		const minutos = date.getMinutes().toString().padStart(2, '0');
		const esPM = horas >= 12;
		
		if (horas === 0) {
			horas = 12;
		} else if (horas > 12) {
			horas -= 12;
		}
		
		const periodo = esPM ? 'p.m.' : 'a.m.';
		
		return `${dia} ${mes} ${año}, ${horas}:${minutos} ${periodo}`;
	}
}

// Exportar instancia del servicio
export const gastosService = new GastosService();

// Exportar las funciones principales para mantener compatibilidad
export const subscribeToGastos = () => gastosService.subscribeToGastos();
export const unsubscribeFromGastos = () => gastosService.unsubscribeFromGastos();