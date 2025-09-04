import { db } from './firebase';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

const DEFAULT_CATEGORIES = [
  { id: 'comida', name: 'Comida' },
  { id: 'transporte', name: 'Transporte' },
  { id: 'salud', name: 'Salud' },
  { id: 'ocio', name: 'Ocio' },
  { id: 'otros', name: 'Otros' }
];

export async function ensureDefaultCategories(uid: string) {
  const colRef = collection(db, 'users', uid, 'categories');
  const snap = await getDocs(colRef);
  if (!snap.empty) return;

  // Crea con el ID proporcionado (mejor que addDoc) si quieres IDs fijos
  await Promise.all(DEFAULT_CATEGORIES.map(async c => {
    const docRef = collection(db, 'users', uid, 'categories');
    await addDoc(docRef, { name: c.name, isFavorite: c.id !== 'otros', createdAt: serverTimestamp() });
  }));
}