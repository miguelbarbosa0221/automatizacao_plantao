/**
 * Store para gerenciar as configurações globais do sistema.
 * Implementa lógica de 'soft delete' (desativação) e restauração.
 */

export interface Category {
  id: string;
  name: string;
  subcategories: string[];
  active: boolean;
}

export interface Unit {
  id: string;
  name: string;
  sectors: string[];
  active: boolean;
}

let categories: Category[] = [
  { id: '1', name: 'Computador / Periféricos', subcategories: ['Computador', 'Monitor', 'Mouse', 'Teclado', 'Leitor'], active: true },
  { id: '2', name: 'Sistemas Clínicos', subcategories: ['PEP', 'PACS', 'LIS'], active: true },
  { id: '3', name: 'Sistemas Administrativos', subcategories: ['ApoioMV', 'SAMUWEB', 'Sistema SOLUS (Autorizador/CRM)'], active: true },
  { id: '4', name: 'Software Geral', subcategories: ['Office', 'Windows', 'Navegador', 'Adobe', 'WinRar'], active: true },
  { id: '5', name: 'Rede e Conectividade', subcategories: ['Wi-Fi', 'Ponto de Rede', 'Internet Lenta', 'VPN'], active: true },
  { id: '6', name: 'Acessos e Contas', subcategories: ['Reset de senha', 'Novo usuário AD', 'Bloqueio', 'Permissões'], active: true },
  { id: '7', name: 'Comunicação e Colaboração', subcategories: ['E-mail', 'Outlook', 'Ramais', 'Celulares', 'Teams/Zoom'], active: true },
  { id: '8', name: 'Impressão', subcategories: ['Impressoras', 'Scanners', 'Toners'], active: true },
  { id: '9', name: 'Segurança da Informação', subcategories: ['Vírus', 'Spam/Phishing', 'Bloqueio de sites', 'LGPD'], active: true },
];

let units: Unit[] = [
  { id: 'u1', name: 'Hospital Central', sectors: ['Recepção', 'UTI', 'Emergência', 'Administrativo'], active: true },
  { id: 'u2', name: 'Unidade Norte', sectors: ['Triagem', 'Laboratório', 'Farmácia'], active: true },
];

export function getCategories(includeInactive = false) {
  return includeInactive ? [...categories] : categories.filter(c => c.active);
}

export function getUnits(includeInactive = false) {
  return includeInactive ? [...units] : units.filter(u => u.active);
}

export function addCategory(name: string, subcategories: string[]) {
  const newCategory: Category = {
    id: Math.random().toString(36).substr(2, 9),
    name,
    subcategories,
    active: true
  };
  categories = [...categories, newCategory];
  return getCategories(true);
}

export function toggleCategoryStatus(id: string, active: boolean) {
  categories = categories.map(c => c.id === id ? { ...c, active } : c);
  return getCategories(true);
}

export function deleteCategoryPermanently(id: string) {
  categories = categories.filter(c => c.id !== id);
  return getCategories(true);
}

export function addUnit(name: string, sectors: string[]) {
  const newUnit: Unit = {
    id: Math.random().toString(36).substr(2, 9),
    name,
    sectors,
    active: true
  };
  units = [...units, newUnit];
  return getUnits(true);
}

export function toggleUnitStatus(id: string, active: boolean) {
  units = units.map(u => u.id === id ? { ...u, active } : u);
  return getUnits(true);
}

export function deleteUnitPermanently(id: string) {
  units = units.filter(u => u.id !== id);
  return getUnits(true);
}
