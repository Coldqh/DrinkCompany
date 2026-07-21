import type { EquipmentDefinition } from '../domain/production';

export const equipmentCatalog: EquipmentDefinition[] = [
  {
    id: 'micro-brewhouse',
    family: 'beer',
    name: 'Micro Brewhouse 240',
    category: 'Варочный порядок',
    cost: 16_800,
    precision: 3,
    capacityLiters: 240,
    icon: 'kettle',
    summary: 'Компактная двухёмкостная система для первых коммерческих варок.',
    benefit: 'Открывает производство пива',
  },
  {
    id: 'apple-press',
    family: 'cider',
    name: 'Orchard Press 300',
    category: 'Дробилка и пресс',
    cost: 13_400,
    precision: 3,
    capacityLiters: 300,
    icon: 'press',
    summary: 'Моющая дробилка и гидравлический пресс с контролем выхода сока.',
    benefit: 'Открывает производство сидра',
  },
  {
    id: 'fermentation-bank',
    family: 'shared',
    name: 'Ferment Bank S2',
    category: 'Ферментация',
    cost: 9_600,
    precision: 4,
    capacityLiters: 360,
    icon: 'tank',
    summary: 'Два изолированных танка с базовым температурным контролем.',
    benefit: 'Обязателен для всех партий',
  },
  {
    id: 'compact-bottler',
    family: 'shared',
    name: 'Line One Compact',
    category: 'Розлив',
    cost: 7_200,
    precision: 3,
    capacityLiters: 500,
    icon: 'bottle',
    summary: 'Полуавтоматический розлив, укупорка и маркировка малых партий.',
    benefit: 'Позволяет подготовить товар к продаже',
  },
  {
    id: 'lab-kit',
    family: 'shared',
    name: 'Quality Bench',
    category: 'Контроль качества',
    cost: 4_800,
    precision: 5,
    capacityLiters: 0,
    icon: 'lab',
    summary: 'pH-метр, плотномер, микроскоп и базовый набор контроля чистоты.',
    benefit: 'Повышает точность дегустации и снижает риск',
  },
];

export function getEquipment(equipmentId: string): EquipmentDefinition {
  const equipment = equipmentCatalog.find((item) => item.id === equipmentId);
  if (!equipment) throw new Error('Неизвестное оборудование');
  return equipment;
}
