import { ProfileCatalog, ProfileMeta, CatalogItem } from '../types';
import { storage } from './storage';

// Default fallback profiles in case network is completely unavailable on very first load
const FALLBACK_PROFILES_META: ProfileMeta[] = [
  {
    id: 'plumbing',
    name: 'Сантехника',
    description: 'Монтаж водопровода, канализации, отопления, санфаянса и оборудования',
    icon: 'Wrench',
    color: 'sky',
    catalogPath: '/data/profiles/plumbing/catalog.json',
    categories: [
      'Разводка труб и водопровод',
      'Канализация и водоотведение',
      'Отопление и теплый пол',
      'Установка сантехники',
      'Фильтрация и учет воды',
      'Демонтажные работы',
    ],
  },
  {
    id: 'electrical',
    name: 'Электрика',
    description: 'Электромонтажные работы, разводка кабелей, сборка щитов, освещение и розетки',
    icon: 'Zap',
    color: 'amber',
    catalogPath: '/data/profiles/electrical/catalog.json',
    categories: [
      'Черновой электромонтаж',
      'Сборка и монтаж электрощита',
      'Чистовой монтаж (розетки/выключатели)',
      'Освещение и подсветка',
      'Кабельная продукция и материалы',
      'Слаботочные сети и безопасность',
    ],
  },
  {
    id: 'finishing',
    name: 'Отделочные работы',
    description: 'Штукатурка, шпаклевка, малярные работы, укладка плитки, напольные покрытия',
    icon: 'Paintbrush',
    color: 'emerald',
    catalogPath: '/data/profiles/finishing/catalog.json',
    categories: [
      'Подготовительные и демонтажные работы',
      'Штукатурные и малярные работы',
      'Плиточные работы (кафель/керамогранит)',
      'Полы и напольные покрытия',
      'Гипсокартонные конструкции',
      'Расходные и строительные смеси',
    ],
  },
  {
    id: 'construction',
    name: 'Строительство',
    description: 'Фундаменты, кладка стен, кровля, фасадные работы и общестроительные материалы',
    icon: 'Hammer',
    color: 'orange',
    catalogPath: '/data/profiles/construction/catalog.json',
    categories: [
      'Земляные работы и фундамент',
      'Возведение стен и перегородок',
      'Кровельные работы',
      'Фасадные работы и утепление',
      'Бетон и арматура',
      'Пиломатериалы и крепеж',
    ],
  },
];

/**
 * Validates profile metadata
 */
export function validateProfileMeta(data: unknown): ProfileMeta[] {
  if (!Array.isArray(data)) {
    throw new Error('Некорректный формат списка профилей: ожидается массив');
  }

  return data.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Профиль #${index + 1} имеет неверный формат`);
    }
    const p = item as Partial<ProfileMeta>;
    if (!p.id || typeof p.id !== 'string') throw new Error(`Профиль #${index + 1} не имеет id`);
    if (!p.name || typeof p.name !== 'string') throw new Error(`Профиль ${p.id} не имеет имени`);
    if (!Array.isArray(p.categories)) throw new Error(`Профиль ${p.id} не имеет списка категорий`);

    return {
      id: p.id,
      name: p.name,
      description: p.description || '',
      icon: p.icon || 'Wrench',
      color: p.color || 'blue',
      catalogPath: p.catalogPath || `/data/profiles/${p.id}/catalog.json`,
      categories: p.categories,
    };
  });
}

/**
 * Validates catalog data structure
 */
export function validateProfileCatalog(data: unknown): ProfileCatalog {
  if (!data || typeof data !== 'object') {
    throw new Error('Каталог должен быть объектом');
  }

  const cat = data as Partial<ProfileCatalog>;
  if (!cat.id || typeof cat.id !== 'string') throw new Error('Каталог не содержит id');
  if (!cat.name || typeof cat.name !== 'string') throw new Error('Каталог не содержит названия');
  if (!Array.isArray(cat.items)) throw new Error('Каталог не содержит массива items');

  const validItems: CatalogItem[] = cat.items.map((item, idx) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Позиция каталога #${idx + 1} некорректна`);
    }
    const itemType: 'material' | 'work' = item.type === 'material' ? 'material' : 'work';
    return {
      id: String(item.id || `item-${idx}`),
      name: String(item.name || 'Без названия'),
      category: String(item.category || 'Общее'),
      unit: String(item.unit || 'шт'),
      price: Number(item.price) || 0,
      type: itemType,
      description: item.description ? String(item.description) : undefined,
      code: item.code ? String(item.code) : undefined,
    };
  });

  return {
    id: cat.id,
    name: cat.name,
    description: cat.description || '',
    icon: cat.icon || 'Wrench',
    categories: Array.isArray(cat.categories) ? cat.categories : [],
    items: validItems,
  };
}

const baseUrl = import.meta.env.BASE_URL || '/';
const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

export async function fetchProfilesList(): Promise<ProfileMeta[]> {
  try {
    const res = await fetch(`${cleanBase}data/profiles.json`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    const validated = validateProfileMeta(json);
    storage.saveCachedProfilesMeta(validated);
    return validated;
  } catch (err) {
    console.warn('Network fetch for profiles failed, checking offline cache', err);
    const cached = storage.getCachedProfilesMeta();
    if (cached && cached.length > 0) {
      return cached;
    }
    return FALLBACK_PROFILES_META;
  }
}

export async function fetchProfileCatalog(profileId: string): Promise<ProfileCatalog> {
  // First, check local offline cache
  const cached = await storage.getCachedProfile(profileId);

  try {
    const res = await fetch(`${cleanBase}data/profiles/${profileId}/catalog.json`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    const validated = validateProfileCatalog(json);
    // Cache for offline usage
    await storage.saveCachedProfile(validated);
    return validated;
  } catch (err) {
    console.warn(`Fetch catalog for ${profileId} failed, using cached`, err);
    if (cached) {
      return cached;
    }
    throw new Error(`Каталог «${profileId}» не найден ни в сети, ни в кеше.`);
  }
}
