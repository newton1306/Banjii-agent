export const STRICT_ACCOUNTS = [
  {
    id: 'ktb',
    name: 'KTB SME',
    bank: 'KTB SME',
    brand: 'KTB SME',
    type: 'debit',
    accentColor: '#00A7E6',
    cardImage: '/cards/ktb-sme-gen.png',
    mask: '•••• 1920',
  },
  {
    id: 'kbank',
    name: 'KBANK',
    bank: 'KBANK',
    brand: 'KBANK',
    type: 'savings',
    accentColor: '#138F2D',
    cardImage: '/cards/kbank-gen.png',
    mask: '•••• 7102',
  },
  {
    id: 'bbl',
    name: 'KMUTT Student',
    bank: 'KMUTT Student',
    brand: 'KMUTT Student',
    type: 'debit',
    accentColor: '#1E3A8A',
    cardImage: '/cards/kmutt-bbl-isolated.png',
    mask: '•••• 6451',
  },
];

export const ACCOUNT_MAP = STRICT_ACCOUNTS.reduce((acc, curr) => {
  acc[curr.id] = curr;
  return acc;
}, {});

export const CATEGORIES = [
  { id: 'food', name: 'อาหารและเครื่องดื่ม', icon: 'Utensils', color: '#F97316' },
  { id: 'transport', name: 'การเดินทาง', icon: 'Car', color: '#06B6D4' },
  { id: 'shopping', name: 'ช้อปปิ้ง', icon: 'ShoppingBag', color: '#EC4899' },
  { id: 'bills', name: 'บิลและค่าใช้จ่าย', icon: 'Zap', color: '#EAB308' },
  { id: 'entertainment', name: 'บันเทิง / กิจกรรม', icon: 'Film', color: '#8B5CF6' },
  { id: 'sport_mtzirr10', name: 'กีฬา / แบดมินตัน', icon: 'Activity', color: '#D4F933' },
  { id: 'salary', name: 'เงินเดือน / รายรับ', icon: 'Briefcase', color: '#10B981' },
  { id: 'work', name: 'รายได้จากงาน', icon: 'Laptop', color: '#3B82F6' },
  { id: 'other', name: 'อื่นๆ', icon: 'MoreHorizontal', color: '#94A3B8' },
];

export const CATEGORY_MAP = CATEGORIES.reduce((acc, curr) => {
  acc[curr.id] = curr;
  return acc;
}, {});

export const NOTE_TAGS = {
  SPLIT_SHARE: (amount) => `[split_share:${amount}]`,
  TARGET_PORTION: (amount) => `[target_portion:${amount}]`,
  TRANSFER_PAIR: (pairId) => `[transfer_pair:${pairId}]`,
  DEBT_REPAYMENT: '[debt_repayment]',
};
