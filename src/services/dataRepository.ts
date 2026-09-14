import { CatalogItem, ProfileCatalog } from '../types';

export const REMOTE_DATA_BASE_URL = 'https://raw.githubusercontent.com/getto-dev/check-data/main/';
export const REMOTE_PROFILE_IDS = new Set(['plumbing', 'electrical', 'finishing', 'construction']);

type RemoteManifest = {
  schemaVersion: number;
  id: string;
  name: string;
  version: string;
  locale: string;
  currency: string;
  files: { catalog: string; categories?: string; synonyms?: string; config?: string };
  itemCount?: number;
};

type RemoteCategory = { id: string; name: string };
type RemoteDataset = {
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
};
type RemoteCategoryFile = { schemaVersion: number; categories: RemoteCategory[] };
type RemoteSynonymsFile = { schemaVersion: number; groups: string[][] };

const PROFILE_ID_RE = /^[a-z0-9_-]{1,64}$/i;
const MAX_ITEMS = 100_000;
const MAX_NAME = 300;
const MAX_DESCRIPTION = 1000;
const MAX_UNIT = 50;
const MAX_CATEGORY = 200;

export const remoteDataUrl = (path: string) => `${REMOTE_DATA_BASE_URL}${path.replace(/^\//, '')}`;

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`HTTP ${response.status} при загрузке ${url}`);
  return response.json() as Promise<T>;
}

function validateManifest(value: unknown, expectedProfileId: string): RemoteManifest {
  if (!value || typeof value !== 'object') throw new Error('Удалённый manifest имеет неверный формат');
  const manifest = value as Partial<RemoteManifest>;
  if (!Number.isInteger(manifest.schemaVersion) || manifest.schemaVersion < 1) throw new Error('Удалённый manifest имеет неверную версию схемы');
  if (typeof manifest.id !== 'string' || !PROFILE_ID_RE.test(manifest.id) || manifest.id !== expectedProfileId) throw new Error('Удалённый manifest имеет неверный id');
  if (typeof manifest.name !== 'string' || !manifest.name.trim()) throw new Error('Удалённый manifest имеет неверное название');
  if (typeof manifest.version !== 'string' || !manifest.version.trim()) throw new Error('Удалённый manifest имеет неверную версию');
  if (!manifest.files || typeof manifest.files.catalog !== 'string') throw new Error('Удалённый manifest не содержит catalog');
  return manifest as RemoteManifest;
}

function validateCategories(value: unknown): RemoteCategory[] {
  if (!value || typeof value !== 'object') throw new Error('Удалённые категории имеют неверный формат');
  const file = value as Partial<RemoteCategoryFile>;
  if (!Array.isArray(file.categories)) throw new Error('Удалённые категории не содержат массив');
  const seen = new Set<string>();
  return file.categories.map((entry, index) => {
    const category = entry as Partial<RemoteCategory>;
    const id = typeof category.id === 'string' ? category.id.trim() : '';
    const name = typeof category.name === 'string' ? category.name.trim() : '';
    if (!id || !name || name.length > MAX_CATEGORY || seen.has(id)) throw new Error(`Удалённая категория #${index + 1} некорректна`);
    seen.add(id);
    return { id, name };
  });
}

function validateDataset(value: unknown): RemoteDataset {
  if (!value || typeof value !== 'object') throw new Error('Удалённый каталог имеет неверный формат');
  const dataset = value as Partial<RemoteDataset>;
  if (!Number.isInteger(dataset.schemaVersion) || dataset.schemaVersion < 1) throw new Error('Удалённый каталог имеет неверную версию схемы');
  if (!Array.isArray(dataset.items) || dataset.items.length > MAX_ITEMS) throw new Error('Удалённый каталог имеет неверный массив items');
  const seenIds = new Set<string>();
  const items = dataset.items.map((entry, index) => {
    const item = entry as Partial<RemoteDataset['items'][number]>;
    const id = typeof item.id === 'string' ? item.id.trim() : '';
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    const unit = typeof item.unit === 'string' ? item.unit.trim() : '';
    const categoryId = typeof item.categoryId === 'string' ? item.categoryId.trim() : '';
    if (!id || id.length > 128 || seenIds.has(id)) throw new Error(`Удалённая позиция #${index + 1} имеет неверный id`);
    if (!name || name.length > MAX_NAME) throw new Error(`Удалённая позиция ${id} имеет неверное название`);
    if (!unit || unit.length > MAX_UNIT) throw new Error(`Удалённая позиция ${id} имеет неверную единицу`);
    if (!categoryId) throw new Error(`Удалённая позиция ${id} не имеет categoryId`);
    if (!Number.isInteger(item.priceKopecks) || item.priceKopecks < 0) throw new Error(`Удалённая позиция ${id} имеет неверную цену`);
    if (item.description !== undefined && (typeof item.description !== 'string' || item.description.length > MAX_DESCRIPTION)) throw new Error(`Удалённая позиция ${id} имеет неверное описание`);
    if (item.type !== undefined && item.type !== 'service' && item.type !== 'material') throw new Error(`Удалённая позиция ${id} имеет неверный type`);
    seenIds.add(id);
    return { id, name, unit, categoryId, priceKopecks: item.priceKopecks, description: typeof item.description === 'string' ? item.description : undefined, type: item.type };
  });
  return { schemaVersion: dataset.schemaVersion as number, items };
}

function parseSynonyms(value: unknown): string[][] | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const file = value as Partial<RemoteSynonymsFile>;
  if (!Array.isArray(file.groups)) return undefined;
  return file.groups.filter(Array.isArray).map((group) => group.filter((entry): entry is string => typeof entry === 'string')).filter((group) => group.length > 0);
}

export async function fetchRemoteProfileCatalog(profileId: string, uiMeta: { description: string; icon: string }): Promise<ProfileCatalog> {
  if (!REMOTE_PROFILE_IDS.has(profileId)) throw new Error(`Профиль ${profileId} не обслуживается remote data-layer`);
  const manifest = validateManifest(await fetchJson<unknown>(remoteDataUrl(`${profileId}/manifest.json`)), profileId);
  const dataset = validateDataset(await fetchJson<unknown>(remoteDataUrl(`${profileId}/${manifest.files.catalog}`)));
  const categories = manifest.files.categories
    ? validateCategories(await fetchJson<unknown>(remoteDataUrl(`${profileId}/${manifest.files.categories}`)))
    : [];
  const synonyms = manifest.files.synonyms
    ? parseSynonyms(await fetchJson<unknown>(remoteDataUrl(`${profileId}/${manifest.files.synonyms}`)))
    : undefined;

  if (manifest.itemCount !== undefined && manifest.itemCount !== dataset.items.length) {
    throw new Error(`Удалённый каталог ${profileId}: ожидалось ${manifest.itemCount}, получено ${dataset.items.length}`);
  }

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
    id: profileId,
    name: manifest.name,
    description: uiMeta.description,
    icon: uiMeta.icon,
    categories: categories.map((category) => category.name),
    items,
    synonyms,
  };
}
