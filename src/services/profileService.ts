import { ProfileCatalog, ProfileMeta, CatalogItem } from '../types';
import { storage } from './storage';
import { fetchRemoteProfileCatalog, fetchRemoteProfileMetas } from './dataRepository';

const MAX_PROFILE_NAME_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_CATEGORY_LENGTH = 200;
const MAX_CATALOG_ITEMS = 100_000;
const MAX_ITEM_NAME_LENGTH = 300;
const MAX_ITEM_DESCRIPTION_LENGTH = 1000;
const MAX_ITEM_UNIT_LENGTH = 50;
const MAX_ITEM_CODE_LENGTH = 100;
const PROFILE_ID_RE = /^[a-z0-9_-]{1,64}$/i;

export function validateProfileMeta(data: unknown): ProfileMeta[] {
  if (!Array.isArray(data)) throw new Error('Некорректный список профилей: ожидается массив');
  const seenIds = new Set<string>();
  return data.map((item, index) => {
    if (!item || typeof item !== 'object') throw new Error(`Профиль #${index + 1} имеет неверный формат`);
    const profile = item as Partial<ProfileMeta>;
    const id = typeof profile.id === 'string' ? profile.id.trim() : '';
    const name = typeof profile.name === 'string' ? profile.name.trim() : '';
    const manifestUrl = typeof profile.manifestUrl === 'string' ? profile.manifestUrl.trim() : '';
    if (!id || !PROFILE_ID_RE.test(id)) throw new Error(`Профиль #${index + 1} имеет неверный id`);
    if (seenIds.has(id)) throw new Error(`Дублирующийся id профиля: ${id}`);
    seenIds.add(id);
    if (!name || name.length > MAX_PROFILE_NAME_LENGTH) throw new Error(`Профиль ${id} имеет неверное название`);
    if (!manifestUrl.startsWith('https://raw.githubusercontent.com/getto-dev/check-data/main/')) throw new Error(`Профиль ${id} имеет недоверенный manifest URL`);
    if (!Array.isArray(profile.categories)) throw new Error(`Профиль ${id} не имеет категорий`);
    const categories = profile.categories.filter((category): category is string => typeof category === 'string').map((category) => category.trim()).filter(Boolean);
    if (categories.length !== profile.categories.length || categories.some((category) => category.length > MAX_CATEGORY_LENGTH)) throw new Error(`Профиль ${id} содержит некорректную категорию`);
    return {
      id,
      name,
      description: typeof profile.description === 'string' ? profile.description.slice(0, MAX_DESCRIPTION_LENGTH) : '',
      icon: typeof profile.icon === 'string' && profile.icon.length <= 50 ? profile.icon : 'Wrench',
      color: typeof profile.color === 'string' && profile.color.length <= 50 ? profile.color : 'blue',
      manifestUrl,
      categories,
      itemCount: Number.isInteger(profile.itemCount) ? profile.itemCount : undefined,
      version: typeof profile.version === 'string' ? profile.version : undefined,
    };
  });
}

export function validateProfileCatalog(data: unknown): ProfileCatalog {
  if (!data || typeof data !== 'object') throw new Error('Каталог должен быть объектом');
  const catalog = data as Partial<ProfileCatalog>;
  const id = typeof catalog.id === 'string' ? catalog.id.trim() : '';
  const name = typeof catalog.name === 'string' ? catalog.name.trim() : '';
  if (!id || !PROFILE_ID_RE.test(id)) throw new Error('Каталог содержит неверный id');
  if (!name || name.length > MAX_PROFILE_NAME_LENGTH) throw new Error('Каталог содержит неверное название');
  if (!Array.isArray(catalog.items)) throw new Error('Каталог не содержит массива items');
  if (catalog.items.length > MAX_CATALOG_ITEMS) throw new Error(`Каталог слишком большой. Максимум: ${MAX_CATALOG_ITEMS}.`);

  const validItems: CatalogItem[] = [];
  const seenIds = new Set<string>();
  for (let idx = 0; idx < catalog.items.length; idx += 1) {
    const raw = catalog.items[idx];
    if (!raw || typeof raw !== 'object') throw new Error(`Позиция каталога #${idx + 1} некорректна`);
    const item = raw as Partial<CatalogItem>;
    const itemId = typeof item.id === 'string' ? item.id.trim() : '';
    const itemName = typeof item.name === 'string' ? item.name.trim() : '';
    const category = typeof item.category === 'string' ? item.category.trim() : '';
    const unit = typeof item.unit === 'string' ? item.unit.trim() : '';
    const price = Number(item.price);
    if (!itemId || itemId.length > 128 || seenIds.has(itemId)) throw new Error(`Позиция #${idx + 1} имеет неверный id`);
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
    id,
    name,
    description: typeof catalog.description === 'string' ? catalog.description.slice(0, MAX_DESCRIPTION_LENGTH) : '',
    icon: typeof catalog.icon === 'string' && catalog.icon.length <= 50 ? catalog.icon : 'Wrench',
    categories: Array.isArray(catalog.categories) ? catalog.categories.filter((category): category is string => typeof category === 'string').map((category) => category.trim()).filter(Boolean).filter((category) => category.length <= MAX_CATEGORY_LENGTH) : [],
    items: validItems,
  };
}

export async function fetchProfilesList(): Promise<ProfileMeta[]> {
  try {
    const profiles = validateProfileMeta(await fetchRemoteProfileMetas());
    storage.saveCachedProfilesMeta(profiles);
    return profiles;
  } catch (err) {
    console.warn('Remote profile index failed, checking offline cache', err);
    const cached = storage.getCachedProfilesMeta();
    if (cached?.length) {
      try { return validateProfileMeta(cached); } catch (cacheError) { console.warn('Cached profiles are invalid', cacheError); }
    }
    throw new Error('Каталоги недоступны: подключитесь к интернету хотя бы один раз для первоначальной загрузки.');
  }
}

export async function fetchProfileCatalog(profileId: string): Promise<ProfileCatalog> {
  const safeProfileId = profileId.trim();
  if (!PROFILE_ID_RE.test(safeProfileId)) throw new Error('Некорректный идентификатор профиля.');

  const cached = await storage.getCachedProfile(safeProfileId);
  try {
    const catalog = validateProfileCatalog(await fetchRemoteProfileCatalog(safeProfileId));
    await storage.saveCachedProfile(catalog);
    return catalog;
  } catch (err) {
    console.warn(`Remote catalog for ${safeProfileId} failed, using cached catalog`, err);
    if (cached) {
      try { return validateProfileCatalog(cached); } catch (cacheError) { console.warn(`Cached catalog for ${safeProfileId} is invalid`, cacheError); }
    }
    throw new Error(`Каталог «${safeProfileId}» не найден в сети или кеше.`);
  }
}
