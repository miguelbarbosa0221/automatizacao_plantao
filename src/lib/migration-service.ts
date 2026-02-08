
'use client';

import { 
  Firestore, 
  collection, 
  getDocs, 
  doc, 
  setDoc,
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
    // Se o usuário não tiver permissão de leitura aqui, o Firestore lançará o erro "Missing or insufficient permissions"
    const catSnapshot = await getDocs(legacyCatsRef);
    
    for (const catDoc of catSnapshot.docs) {
      const data = catDoc.data();
      const globalRef = doc(db, "categories", catDoc.id);
      // Tenta gravar na coleção global (requer ser Admin nas Security Rules)
      await setDoc(globalRef, { ...data, id: catDoc.id }, { merge: true });
      results.categoriesMigrated++;
    }

    // 2. Migrar Unidades
    const legacyUnitsRef = collection(db, "users", userId, "units");
    const unitSnapshot = await getDocs(legacyUnitsRef);

    for (const unitDoc of unitSnapshot.docs) {
      const data = unitDoc.data();
      const globalRef = doc(db, "units", unitDoc.id);
      // Tenta gravar na coleção global (requer ser Admin nas Security Rules)
      await setDoc(globalRef, { ...data, id: unitDoc.id }, { merge: true });
      results.unitsMigrated++;
    }

    return results;
  } catch (error: any) {
    // Log interno útil para depuração do desenvolvedor
    console.error("Erro técnico na migração:", error);
    
    // Tratamento de mensagens amigáveis baseadas no erro do Firebase
    if (error.code === 'permission-denied') {
      throw new Error("Acesso negado. Certifique-se de que seu perfil foi alterado para 'admin' no console do Firestore.");
    }
    
    throw new Error(error.message || "Falha ao migrar dados.");
  }
}
