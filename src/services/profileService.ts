import { ProfileCatalog, ProfileMeta, CatalogItem } from '../types';
import { storage } from './storage';

// Local metadata remains the UI fallback. Catalog payloads for profiles that
// already exist in the shared data repository are loaded remotely first.
const FALLBACK_PROFILES_META: ProfileMeta[] = [
  {
    id: 'plumbing',
    name: 'Сантехника',
    description: 'Монтаж водопровода, канализации, отопления, санфаянса и оборудования',
    icon: 'Wrench',
    color: 'sky',
    catalogPath: '/data/profiles/plumbing/catalog.json',
    categories: ['Разводка труб и водопровод', 'Канализация и водоотведение', 'Отопление и теплый пол', 'Установка сантехники', 'Фильтрация и учет воды', 'Демонтажные работы'],
  },
  {
    id: 'electrical',
    name: 'Электрика',
    description: 'Электромонтажные работы, разводка кабелей, сборка щитов, освещение и розетки',
    icon: 'Zap',
    color: 'amber',
    catalogPath: '/data/profiles/electrical/catalog.json',
    categories: ['Черновой электромонтаж', 'Сборка и монтаж электрощита', 'Чистовой монтаж (розетки/выключатели)', 'Освещение и подсветка', 'Кабельная продукция и материалы', 'Слаботочные сети и безопасность'],
  },
  {
    id: 'finishing',
    name: 'Отделочные работы',
    description: 'Штукатурка, шпаклевка, малярные работы, укладка плитки, напольные покрытия',
    icon: 'Paintbrush',
    color: 'emerald',
    catalogPath: '/data/profiles/finishing/catalog.json',
    categories: ['Подготовительные и демонтажные работы', 'Штукатурные и малярные работы', 'Плиточные работы (кафель/керамогранит)', 'Полы и напольные покрытия', 'Гипсокартонные конструкции', 'Расходные и строительные смеси'],
  },
  {
    id: 'construction',
    name: 'Строительство',
    description: 'Фундаменты, кладка стен, кровля, фасадные работы и общестроительные материалы',
    icon: 'Hammer',
    color: 'orange',
    catalogPath: '/data/profiles/construction/catalog.json',
    categories: ['Земляные работы и фундамент', 'Возведение стен и перегородок', 'Кровельные работы', 'Фасадные работы и утепление', 'Бетон и арматура', 'Пиломатериалы и крепеж'],
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

const REMOTE_DATA_BASE_URL = 'https://raw.githubusercontent.com/getto-dev/check-data/main/';
const REMOTE_PROFILE_IDS = new Set(['plumbing', 'electrical']);

interface RemoteManifest {
  schemaVersion: number;
  id: string;
  name: string;
  version: string;
  locale: string;
  currency: string;
  files: { catalog: string; categories?: string; synonyms?: string; config?: string };
  itemCount?: number;
}

interface RemoteCategory {
  id: string;
  name: string;
}

interface RemoteDataset {
  schemaVersion: number;
  items: Array<{
    id: string;
    name: string;
    description?: string;
    unit: string;
    priceKopecks: number;
    categoryId: string;
    type?: 'service' | 'material';
  }>;
}

interface RemoteCategoryFile {
  schemaVersion: number;
  categories: RemoteCategory[];
}

interface RemoteSynonymsFile {
  schemaVersion: number;
  groups: string[][];
}

function getFallbackProfileMeta(profileId: string): ProfileMeta | undefined {
  return FALLBACK_PROFILES_META.find((profile) => profile.id === profileId);
}

function validateRemoteManifest(value: unknown): RemoteManifest {
  if (!value || typeof value !== 'object') throw new Error('Удалённый manifest имеет неверный формат');
  const data = value as Partial<RemoteManifest>;
  if (!Number.isInteger(data.schemaVersion) || data.schemaVersion < 1) throw new Error('Удалённый manifest имеет неверную версию схемы');
  if (typeof data.id !== 'string' || !PROFILE_ID_RE.test(data.id)) throw new Error('Удалённый manifest имеет неверный id');
  if (typeof data.name !== 'string' || !data.name.trim()) throw new Error('Удалённый manifest имеет неверное название');
  if (typeof data.version !== 'string' || !data.version.trim()) throw new Error('Удалённый manifest имеет неверную версию');
  if (!data.files || typeof data.files.catalog !== 'string') throw new Error('Удалённый manifest не содержит catalog');
  return data as RemoteManifest;
}

function validateRemoteCategories(value: unknown): RemoteCategory[] {
  if (!value || typeof value !== 'object') throw new Error('Удалённые категории имеют неверный формат');
  const file = value as Partial<RemoteCategoryFile>;
  if (!Array.isArray(file.categories)) throw new Error('Удалённые категории не содержат массива categories');
  const seen = new Set<string>();
  return file.categories.map((raw, index) => {
    const category = raw as Partial<RemoteCategory>;
    const id = typeof category.id === 'string' ? category.id.trim() : '';
    const name = typeof category.name === 'string' ? category.name.trim() : '';
    if (!id || !name || name.length > MAX_CATEGORY_LENGTH || seen.has(id)) {
      throw new Error(`Удалённая категория #${index + 1} некорректна`);
    }
    seen.add(id);
    return { id, name };
  });
}

function validateRemoteDataset(value: unknown): RemoteDataset {
  if (!value || typeof value !== 'object') throw new Error('Удалённый каталог имеет неверный формат');
  const dataset = value as Partial<RemoteDataset>;
  if (!Number.isInteger(dataset.schemaVersion) || dataset.schemaVersion < 1) throw new Error('Удалённый каталог имеет неверную версию схемы');
  if (!Array.isArray(dataset.items) || dataset.items.length > MAX_CATALOG_ITEMS) throw new Error('Удалённый каталог имеет неверный массив items');
  const seen = new Set<string>();
  const items = dataset.items.map((raw, index) => {
    const item = raw as Partial<RemoteDataset['items'][number]>;
    const id = typeof item.id === 'string' ? item.id.trim() : '';
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    const unit = typeof item.unit === 'string' ? item.unit.trim() : '';
    const categoryId = typeof item.categoryId === 'string' ? item.categoryId.trim() : '';
    if (!id || id.length > 128 || seen.has(id)) throw new Error(`Удалённая позиция #${index + 1} имеет неверный id`);
    if (!name || name.length > MAX_ITEM_NAME_LENGTH) throw new Error(`Удалённая позиция ${id} имеет неверное название`);
    if (!unit || unit.length > MAX_ITEM_UNIT_LENGTH) throw new Error(`Удалённая позиция ${id} имеет неверную единицу`);
    if (!categoryId) throw new Error(`Удалённая позиция ${id} не имеет categoryId`);
    if (!Number.isInteger(item.priceKopecks) || item.priceKopecks < 0) throw new Error(`Удалённая позиция ${id} имеет неверную цену`);
    if (item.description !== undefined && (typeof item.description !== 'string' || item.description.length > MAX_ITEM_DESCRIPTION_LENGTH)) throw new Error(`Удалённая позиция ${id} имеет неверное описание`);
    if (item.type !== undefined && item.type !== 'service' && item.type !== 'material') throw new Error(`Удалённая позиция ${id} имеет неверный type`);
    seen.add(id);
    return {
      id, name, unit, categoryId,
      priceKopecks: item.priceKopecks,
      description: typeof item.description === 'string' ? item.description : undefined,
      type: item.type,
    };
  });
  return { schemaVersion: dataset.schemaVersion as number, items };
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`HTTP ${response.status} при загрузке ${url}`);
  return response.json() as Promise<T>;
}

function transformRemoteCatalog(
  profileId: string,
  manifest: RemoteManifest,
  dataset: RemoteDataset,
  categories: RemoteCategory[],
  synonyms?: string[][],
): ProfileCatalog {
  const fallback = getFallbackProfileMeta(profileId);
  if (!fallback) throw new Error(`Нет UI-метаданных профиля ${profileId}`);

  const categoryMap = new Map(categories.map((category) => [category.id, category.name]));
  const items: CatalogItem[] = dataset.items.map((item) => ({
    id: item.id,
    name: item.name,
    category: categoryMap.get(item.categoryId) || item.categoryId,
    unit: item.unit,
    price: item.priceKopecks / 100,
    type: item.type === 'material' ? 'material' : 'work',
    description: item.description,
  }));

  return {
    id: manifest.id,
    name: manifest.name,
    description: fallback.description,
    icon: fallback.icon,
    categories: categories.map((category) => category.name),
    items,
    synonyms,
  };
}

async function fetchRemoteProfileCatalog(profileId: string): Promise<ProfileCatalog> {
  const manifestUrl = `${REMOTE_DATA_BASE_URL}${profileId}/manifest.json`;
  const rawManifest = await fetchJson<unknown>(manifestUrl);
  const manifest = validateRemoteManifest(rawManifest);
  if (manifest.id !== profileId) throw new Error(`Удалённый manifest ${manifest.id} не совпадает с профилем ${profileId}`);

  const catalog = validateRemoteDataset(await fetchJson<unknown>(`${REMOTE_DATA_BASE_URL}${profileId}/${manifest.files.catalog}`));
  const categories = manifest.files.categories
    ? validateRemoteCategories(await fetchJson<unknown>(`${REMOTE_DATA_BASE_URL}${profileId}/${manifest.files.categories}`))
    : [];
  const synonyms = manifest.files.synonyms
    ? ((raw: unknown) => {
        const file = raw as Partial<RemoteSynonymsFile>;
        return Array.isArray(file.groups) ? file.groups.filter(Array.isArray).map((group) => group.filter((x): x is string => typeof x === 'string')) : undefined;
      })(await fetchJson<unknown>(`${REMOTE_DATA_BASE_URL}${profileId}/${manifest.files.synonyms}`))
    : undefined;

  if (manifest.itemCount !== undefined && manifest.itemCount !== catalog.items.length) {
    throw new Error(`Удалённый каталог ${profileId}: ожидалось ${manifest.itemCount} позиций, получено ${catalog.items.length}`);
  }

  return transformRemoteCatalog(profileId, manifest, catalog, categories, synonyms);
}

/** Validates profile metadata. */
export function validateProfileMeta(data: unknown): ProfileMeta[] {
  if (!Array.isArray(data)) throw new Error('Некорректный формат списка профилей: ожидается массив');
  const seenIds = new Set<string>();
  return data.map((item, index) => {
    if (!item || typeof item !== 'object') throw new Error(`Профиль #${index + 1} имеет неверный формат`);
    const p = item as Partial<ProfileMeta>;
    const id = typeof p.id === 'string' ? p.id.trim() : '';
    const name = typeof p.name === 'string' ? p.name.trim() : '';
    if (!id || !PROFILE_ID_RE.test(id)) throw new Error(`Профиль #${index + 1} имеет неверный id`);
    if (seenIds.has(id)) throw new Error(`Дублирующийся id профиля: ${id}`);
    seenIds.add(id);
    if (!name || name.length > MAX_PROFILE_NAME_LENGTH) throw new Error(`Профиль ${id} имеет неверное название`);
    if (!Array.isArray(p.categories)) throw new Error(`Профиль ${id} не имеет списка категорий`);
    const categories = p.categories.filter((category): category is string => typeof category === 'string').map((category) => category.trim()).filter(Boolean);
    if (categories.length !== p.categories.length || categories.some((category) => category.length > MAX_CATEGORY_LENGTH)) throw new Error(`Профиль ${id} содержит некорректную категорию`);
    return {
      id, name,
      description: typeof p.description === 'string' ? p.description.slice(0, MAX_DESCRIPTION_LENGTH) : '',
      icon: typeof p.icon === 'string' && p.icon.length <= 50 ? p.icon : 'Wrench',
      color: typeof p.color === 'string' && p.color.length <= 50 ? p.color : 'blue',
      catalogPath: typeof p.catalogPath === 'string' && p.catalogPath.length <= 500 ? p.catalogPath : `/data/profiles/${id}/catalog.json`,
      categories,
    };
  });
}

/** Validates local catalog data for profiles that have not moved to remote data yet. */
export function validateProfileCatalog(data: unknown): ProfileCatalog {
  if (!data || typeof data !== 'object') throw new Error('Каталог должен быть объектом');
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
    if (!raw || typeof raw !== 'object') throw new Error(`Позиция каталога #${idx + 1} некорректна`);
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
    if (item.description !== undefined && (typeof item.description !== 'string' || item.description.length > MAX_ITEM_DESCRIPTION_LENGTH)) throw new Error(`Позиция ${itemId} имеет слишком длинное описание`);
    if (item.code !== undefined && (typeof item.code !== 'string' || item.code.length > MAX_ITEM_CODE_LENGTH)) throw new Error(`Позиция ${itemId} имеет неверный код`);
    validItems.push({ id: itemId, name: itemName, category, unit, price, type: item.type === 'material' ? 'material' : 'work', description: typeof item.description === 'string' ? item.description : undefined, code: typeof item.code === 'string' ? item.code : undefined });
  }
  return {
    id, name,
    description: typeof cat.description === 'string' ? cat.description.slice(0, MAX_DESCRIPTION_LENGTH) : '',
    icon: typeof cat.icon === 'string' && cat.icon.length <= 50 ? cat.icon : 'Wrench',
    categories: Array.isArray(cat.categories) ? cat.categories.filter((x): x is string => typeof x === 'string').map((x) => x.trim()).filter(Boolean).filter((x) => x.length <= MAX_CATEGORY_LENGTH) : [],
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
      try { return validateProfileMeta(cached); } catch (cacheError) { console.warn('Cached profiles are invalid, using fallback profiles', cacheError); }
    }
    return FALLBACK_PROFILES_META;
  }
}

export async function fetchProfileCatalog(profileId: string): Promise<ProfileCatalog> {
  const safeProfileId = profileId.trim();
  if (!PROFILE_ID_RE.test(safeProfileId)) throw new Error('Некорректный идентификатор профиля.');

  const cached = await storage.getCachedProfile(safeProfileId);

  try {
    const catalog = REMOTE_PROFILE_IDS.has(safeProfileId)
      ? await fetchRemoteProfileCatalog(safeProfileId)
      : await (async () => {
          const res = await fetch(`${cleanBase}data/profiles/${safeProfileId}/catalog.json`);
          if (!res.ok) throw new Error(`HTTP error ${res.status}`);
          return validateProfileCatalog(await res.json());
        })();
    await storage.saveCachedProfile(catalog);
    return catalog;
  } catch (err) {
    console.warn(`Fetch catalog for ${safeProfileId} failed, using cached`, err);
    if (cached) {
      try { return validateProfileCatalog(cached); } catch (cacheError) { console.warn(`Cached catalog for ${safeProfileId} is invalid`, cacheError); }
    }
    throw new Error(`Каталог «${safeProfileId}» не найден ни в сети, ни в кеше.`);
  }
}
