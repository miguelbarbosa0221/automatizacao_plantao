import { db } from "@/firebase/config";
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";

export interface AppConfig {
  categories: string[];
  units: string[];
  items: string[];
}

const DEFAULT_CONFIG: AppConfig = {
  categories: ["Hardware", "Software", "Rede", "Impressora", "Outros"],
  units: ["UTI", "Emergência", "Recepção", "Centro Cirúrgico", "Administrativo"],
  items: ["Computador", "Monitor", "Teclado", "Mouse", "Impressora", "Estabilizador"]
};

// Helper para descobrir qual caminho usar (Empresa ou Usuário Pessoal)
const getDocRef = (userId: string, companyId?: string | null) => {
  if (companyId) {
    // Se tem empresa, salva na coleção 'companies' -> documento 'config'
    return doc(db, "companies", companyId, "settings", "general");
  }
  // Se é pessoal, salva no 'users' -> documento 'config'
  return doc(db, "users", userId, "settings", "general");
};

export const ConfigService = {
  // Carregar configurações
  async loadConfig(userId: string, companyId?: string | null): Promise<AppConfig> {
    try {
      const docRef = getDocRef(userId, companyId);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        return { ...DEFAULT_CONFIG, ...snap.data() } as AppConfig;
      } else {
        // Se não existir, cria com o padrão
        await setDoc(docRef, DEFAULT_CONFIG);
        return DEFAULT_CONFIG;
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
      return DEFAULT_CONFIG;
    }
  },

  // Adicionar item (categoria, unidade ou item)
  async addItem(userId: string, field: keyof AppConfig, value: string, companyId?: string | null) {
    const docRef = getDocRef(userId, companyId);
    await updateDoc(docRef, {
      [field]: arrayUnion(value)
    });
  },

  // Remover item
  async removeItem(userId: string, field: keyof AppConfig, value: string, companyId?: string | null) {
    const docRef = getDocRef(userId, companyId);
    await updateDoc(docRef, {
      [field]: arrayRemove(value)
    });
  }
};