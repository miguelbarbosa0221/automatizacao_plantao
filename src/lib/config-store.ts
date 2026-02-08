
/**
 * Store para gerenciar as configurações globais do sistema.
 * Implementa lógica de 'soft delete' (desativação) e restauração.
 */

export interface CategorySub {
  name: string;
  items: string[];
}

export interface Category {
  id: string;
  name: string;
  subcategories: CategorySub[];
  active: boolean;
}

export interface Unit {
  id: string;
  name: string;
  sectors: string[];
  active: boolean;
}

let categories: Category[] = [
  { 
    id: '1', 
    name: 'Computador / Periféricos', 
    subcategories: [
      { name: 'Computador', items: ['Não liga', 'Lentidão', 'Barulho estranho'] },
      { name: 'Monitor', items: ['Tela piscando', 'Não liga', 'Cores alteradas'] }
    ], 
    active: true 
  },
];

let units: Unit[] = [
  { id: 'u1', name: 'Hospital Central', sectors: ['Recepção', 'UTI', 'Emergência', 'Administrativo'], active: true },
];

export function getCategories(includeInactive = false) {
  return includeInactive ? [...categories] : categories.filter(c => c.active);
}

export function getUnits(includeInactive = false) {
  return includeInactive ? [...units] : units.filter(u => u.active);
}
