import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, off } from 'firebase/database';
import { writable } from 'svelte/store';

// Firebase configuration
const firebaseConfig = {
	databaseURL: "https://gastos-d660a-default-rtdb.europe-west1.firebasedatabase.app"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Types
export interface Gasto {
	id: string;
	categoria: string;
	fecha: string;
	monto: number;
	nota: string;
}

// Store for expenses
export const gastos = writable<Gasto[]>([]);
export const loading = writable(true);
export const error = writable<string | null>(null);

// Function to fetch expenses from Firebase
export function subscribeToGastos() {
	const gastosRef = ref(database, 'gastos_registrados');
	
	onValue(gastosRef, (snapshot) => {
		try {
			loading.set(false);
			error.set(null);
			
			const data = snapshot.val();
			if (data) {
				const gastosArray: Gasto[] = Object.entries(data).map(([id, gasto]: [string, any]) => ({
					id,
					categoria: gasto.categoria,
					fecha: gasto.fecha,
					monto: gasto.monto,
					nota: gasto.nota
				}));
				
				// Sort by date (most recent first)
				gastosArray.sort((a, b) => {
					const dateA = parseSpanishDate(a.fecha);
					const dateB = parseSpanishDate(b.fecha);
					return dateB.getTime() - dateA.getTime();
				});
				
				gastos.set(gastosArray);
			} else {
				gastos.set([]);
			}
		} catch (err) {
			console.error('Error fetching gastos:', err);
			error.set('Error al cargar los gastos');
			loading.set(false);
		}
	}, (err) => {
		console.error('Firebase error:', err);
		error.set('Error de conexión con Firebase');
		loading.set(false);
	});
}

// Function to unsubscribe
export function unsubscribeFromGastos() {
	const gastosRef = ref(database, 'gastos_registrados');
	off(gastosRef);
}

// Helper function to parse Spanish date format
function parseSpanishDate(fecha: string): Date {
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

// Helper function to format currency
export function formatCurrency(amount: number): string {
	const absAmount = Math.abs(amount);
	const prefix = amount < 0 ? '-' : '';
	return `${prefix}$${absAmount.toFixed(2)}`;
}

// Helper function to get category icon
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

// Helper function to get category name without emoji
export function getCategoryName(categoria: string): string {
	return categoria.replace(/^[^\s]+\s/, '').trim();
}

// Helper function to format date for display
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
