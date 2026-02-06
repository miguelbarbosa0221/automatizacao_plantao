/**
 * Store para gerenciar as configurações globais do sistema.
 */

export interface Category {
  id: string;
  name: string;
  subcategories: string[];
}

export interface Unit {
  id: string;
  name: string;
  sectors: string[];
}

// Dados iniciais baseados na solicitação do usuário
const INITIAL_CATEGORIES: Category[] = [
  { id: '1', name: 'Computador / Periféricos', subcategories: ['Computador', 'Monitor', 'Mouse', 'Teclado', 'Leitor'] },
  { id: '2', name: 'Sistemas Clínicos', subcategories: ['PEP', 'PACS', 'LIS'] },
  { id: '3', name: 'Sistemas Administrativos', subcategories: ['ApoioMV', 'SAMUWEB', 'Sistema SOLUS (Autorizador/CRM)'] },
  { id: '4', name: 'Software Geral', subcategories: ['Office', 'Windows', 'Navegador', 'Adobe', 'WinRar'] },
  { id: '5', name: 'Rede e Conectividade', subcategories: ['Wi-Fi', 'Ponto de Rede', 'Internet Lenta', 'VPN'] },
  { id: '6', name: 'Acessos e Contas', subcategories: ['Reset de senha', 'Novo usuário AD', 'Bloqueio', 'Permissões'] },
  { id: '7', name: 'Comunicação e Colaboração', subcategories: ['E-mail', 'Outlook', 'Ramais', 'Celulares', 'Teams/Zoom'] },
  { id: '8', name: 'Impressão', subcategories: ['Impressoras', 'Scanners', 'Toners'] },
  { id: '9', name: 'Segurança da Informação', subcategories: ['Vírus', 'Spam/Phishing', 'Bloqueio de sites', 'LGPD'] },
];

const INITIAL_UNITS: Unit[] = [
  { id: 'u1', name: 'Hospital Central', sectors: ['Recepção', 'UTI', 'Emergência', 'Administrativo'] },
  { id: 'u2', name: 'Unidade Norte', sectors: ['Triagem', 'Laboratório', 'Farmácia'] },
];

// Mock do banco de dados (em um app real seria Firestore)
let categories: Category[] = [...INITIAL_CATEGORIES];
let units: Unit[] = [...INITIAL_UNITS];

export function getCategories() {
  return categories;
}

export function getUnits() {
  return units;
}

export function addUnit(unit: Unit) {
  units = [...units, unit];
}

export function addCategory(category: Category) {
  categories = [...categories, category];
}
