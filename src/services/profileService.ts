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

const PROFILE_ID_RE = /^[a-z0-9_-]{1,64}$/i;
const MAX_PROFILE_NAME_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_CATEGORY_LENGTH = 200;
const MAX_CATALOG_ITEMS = 100_000;
const MAX_ITEM_NAME_LENGTH = 300;
const MAX_ITEM_DESCRIPTION_LENGTH = 1000;
const MAX_ITEM_UNIT_LENGTH = 50;
const MAX_ITEM_CODE_LENGTH = 100;

/**
 * Validates profile metadata
 */
export function validateProfileMeta(data: unknown): ProfileMeta[] {
  if (!Array.isArray(data)) {
    throw new Error('Некорректный формат списка профилей: ожидается массив');
  }

  const seenIds = new Set<string>();

  return data.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Профиль #${index + 1} имеет неверный формат`);
    }

    const p = item as Partial<ProfileMeta>;
    const id = typeof p.id === 'string' ? p.id.trim() : '';
    const name = typeof p.name === 'string' ? p.name.trim() : '';

    if (!id || !PROFILE_ID_RE.test(id)) {
      throw new Error(`Профиль #${index + 1} имеет неверный id`);
    }
    if (seenIds.has(id)) {
      throw new Error(`Дублирующийся id профиля: ${id}`);
    }
    seenIds.add(id);

    if (!name || name.length > MAX_PROFILE_NAME_LENGTH) {
      throw new Error(`Профиль ${id} имеет неверное название`);
    }
    if (!Array.isArray(p.categories)) {
      throw new Error(`Профиль ${id} не имеет списка категорий`);
    }

    const categories = p.categories
      .filter((category): category is string => typeof category === 'string')
      .map((category) => category.trim())
      .filter(Boolean)
      .filter((category) => category.length <= MAX_CATEGORY_LENGTH);

    if (categories.length !== p.categories.length) {
      throw new Error(`Профиль ${id} содержит некорректную категорию`);
    }

    return {
      id,
      name,
      description: typeof p.description === 'string' ? p.description.slice(0, MAX_DESCRIPTION_LENGTH) : '',
      icon: typeof p.icon === 'string' && p.icon.length <= 50 ? p.icon : 'Wrench',
      color: typeof p.color === 'string' && p.color.length <= 50 ? p.color : 'blue',
      catalogPath: typeof p.catalogPath === 'string' && p.catalogPath.length <= 500
        ? p.catalogPath
        : `/data/profiles/${id}/catalog.json`,
      categories,
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
  const id = typeof cat.id === 'string' ? cat.id.trim() : '';
  const name = typeof cat.name === 'string' ? cat.name.trim() : '';

  if (!id || !PROFILE_ID_RE.test(id)) throw new Error('Каталог содержит неверный id');
  if (!name || name.length > MAX_PROFILE_NAME_LENGTH) throw new Error('Каталог содержит неверное название');
  if (!Array.isArray(cat.items)) throw new Error('Каталог не содержит массива items');
  if (cat.items.length > MAX_CATALOG_ITEMS) throw new Error(`Каталог слишком большой. Максимум: ${MAX_CATALOG_ITEMS}.`);

  const validItems: CatalogItem[] = [];
  const seenIds = new Set<string>();

  for (let idx = 0; idx < cat.items.length; idx += 1) {
    const raw = cat.items[idx];
    if (!raw || typeof raw !== 'object') {
      throw new Error(`Позиция каталога #${idx + 1} некорректна`);
    }

    const item = raw as Partial<CatalogItem>;
    const itemId = typeof item.id === 'string' ? item.id.trim() : '';
    const itemName = typeof item.name === 'string' ? item.name.trim() : '';
    const category = typeof item.category === 'string' ? item.category.trim() : '';
    const unit = typeof item.unit === 'string' ? item.unit.trim() : '';
    const price = Number(item.price);

    if (!itemId || itemId.length > 128) throw new Error(`Позиция #${idx + 1} имеет неверный id`);
    if (seenIds.has(itemId)) throw new Error(`Дублирующийся id позиции: ${itemId}`);
    seenIds.add(itemId);
    if (!itemName || itemName.length > MAX_ITEM_NAME_LENGTH) throw new Error(`Позиция ${itemId} имеет неверное название`);
    if (!category || category.length > MAX_CATEGORY_LENGTH) throw new Error(`Позиция ${itemId} имеет неверную категорию`);
    if (!unit || unit.length > MAX_ITEM_UNIT_LENGTH) throw new Error(`Позиция ${itemId} имеет неверную единицу измерения`);
    if (!Number.isFinite(price) || price < 0) throw new Error(`Позиция ${itemId} имеет неверную цену`);
    if (item.description !== undefined && (typeof item.description !== 'string' || item.description.length > MAX_ITEM_DESCRIPTION_LENGTH)) {
      throw new Error(`Позиция ${itemId} имеет слишком длинное описание`);
    }
    if (item.code !== undefined && (typeof item.code !== 'string' || item.code.length > MAX_ITEM_CODE_LENGTH)) {
      throw new Error(`Позиция ${itemId} имеет неверный код`);
    }

    const itemType: 'material' | 'work' = item.type === 'material' ? 'material' : 'work';

    validItems.push({
      id: itemId,
      name: itemName,
      category,
      unit,
      price,
      type: itemType,
      description: typeof item.description === 'string' ? item.description : undefined,
      code: typeof item.code === 'string' ? item.code : undefined,
    });
  }

  return {
    id,
    name,
    description: typeof cat.description === 'string' ? cat.description.slice(0, MAX_DESCRIPTION_LENGTH) : '',
    icon: typeof cat.icon === 'string' && cat.icon.length <= 50 ? cat.icon : 'Wrench',
    categories: Array.isArray(cat.categories)
      ? cat.categories
          .filter((category): category is string => typeof category === 'string')
          .map((category) => category.trim())
          .filter(Boolean)
          .filter((category) => category.length <= MAX_CATEGORY_LENGTH)
      : [],
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
      try {
        return validateProfileMeta(cached);
      } catch (cacheError) {
        console.warn('Cached profiles are invalid, using fallback profiles', cacheError);
      }
    }
    return FALLBACK_PROFILES_META;
  }
}

export async function fetchProfileCatalog(profileId: string): Promise<ProfileCatalog> {
  const safeProfileId = profileId.trim();
  if (!PROFILE_ID_RE.test(safeProfileId)) {
    throw new Error('Некорректный идентификатор профиля.');
  }

  // First, check local offline cache
  const cached = await storage.getCachedProfile(safeProfileId);

  try {
    const res = await fetch(`${cleanBase}data/profiles/${safeProfileId}/catalog.json`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    const validated = validateProfileCatalog(json);
    await storage.saveCachedProfile(validated);
    return validated;
  } catch (err) {
    console.warn(`Fetch catalog for ${safeProfileId} failed, using cached`, err);
    if (cached) {
      try {
        return validateProfileCatalog(cached);
      } catch (cacheError) {
        console.warn(`Cached catalog for ${safeProfileId} is invalid`, cacheError);
      }
    }
    throw new Error(`Каталог «${safeProfileId}» не найден ни в сети, ни в кеше.`);
  }
}
