
'use client';

import { 
  Firestore, 
  collection, 
  getDocs, 
  doc, 
  setDoc,
  query,
  limit
} from 'firebase/firestore';

/**
 * Serviço para migrar dados de categorias e unidades do escopo privado (dentro do UID)
 * para o escopo global (root collections).
 */
export async function migrateLegacyDataToGlobal(db: Firestore, userId: string) {
  const results = {
    categoriesMigrated: 0,
    unitsMigrated: 0,
    errors: [] as string[]
  };

  try {
    // 1. Migrar Categorias
    const legacyCatsRef = collection(db, "users", userId, "categories");
    const catSnapshot = await getDocs(legacyCatsRef);
    
    for (const catDoc of catSnapshot.docs) {
      const data = catDoc.data();
      const globalRef = doc(db, "categories", catDoc.id);
      await setDoc(globalRef, { ...data, id: catDoc.id }, { merge: true });
      results.categoriesMigrated++;
    }

    // 2. Migrar Unidades
    const legacyUnitsRef = collection(db, "users", userId, "units");
    const unitSnapshot = await getDocs(legacyUnitsRef);

    for (const unitDoc of unitSnapshot.docs) {
      const data = unitDoc.data();
      const globalRef = doc(db, "units", unitDoc.id);
      await setDoc(globalRef, { ...data, id: unitDoc.id }, { merge: true });
      results.unitsMigrated++;
    }

    return results;
  } catch (error: any) {
    console.error("Erro na migração:", error);
    throw new Error(error.message || "Falha ao migrar dados.");
  }
}
