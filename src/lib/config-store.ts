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

// Referência direta para as configurações DA EMPRESA
const getCompanySettingsRef = (companyId: string) => {
  return doc(db, "companies", companyId, "settings", "general");
};

export const ConfigService = {
  // Carregar configurações (Obrigatório ter CompanyID)
  async loadConfig(companyId: string): Promise<AppConfig> {
    try {
      if (!companyId) return DEFAULT_CONFIG;

      const docRef = getCompanySettingsRef(companyId);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        return { ...DEFAULT_CONFIG, ...snap.data() } as AppConfig;
      } else {
        // Se a empresa ainda não tem config, cria a padrão
        await setDoc(docRef, DEFAULT_CONFIG);
        return DEFAULT_CONFIG;
      }
    } catch (error) {
      console.error("Erro ao carregar configurações da empresa:", error);
      return DEFAULT_CONFIG;
    }
  },

  // Adicionar item à empresa
  async addItem(companyId: string, field: keyof AppConfig, value: string) {
    if (!companyId) return;
    const docRef = getCompanySettingsRef(companyId);
    await updateDoc(docRef, {
      [field]: arrayUnion(value)
    });
  },

  // Remover item da empresa
  async removeItem(companyId: string, field: keyof AppConfig, value: string) {
    if (!companyId) return;
    const docRef = getCompanySettingsRef(companyId);
    await updateDoc(docRef, {
      [field]: arrayRemove(value)
    });
  }
};