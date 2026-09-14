const BASE = 'https://raw.githubusercontent.com/getto-dev/check-data/main/';
const PROFILE_IDS = ['plumbing', 'electrical'];

const fetchJson = async (path) => {
  const response = await fetch(`${BASE}${path}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${path}`);
  return response.json();
};

const fail = (message) => {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
};

try {
  const index = await fetchJson('index.json');
  if (!Array.isArray(index.profiles) || index.profiles.length === 0) {
    throw new Error('Remote data index has no profiles');
  }

  for (const id of PROFILE_IDS) {
    const entry = index.profiles.find((profile) => profile.id === id);
    if (!entry) throw new Error(`Remote data index does not contain ${id}`);

    const manifest = await fetchJson(entry.manifest);
    if (manifest.id !== id) throw new Error(`${id}: manifest id mismatch`);
    if (typeof manifest.version !== 'string' || !manifest.version) throw new Error(`${id}: invalid manifest version`);
    if (!manifest.files?.catalog || !manifest.files?.categories) throw new Error(`${id}: incomplete manifest files`);

    const catalog = await fetchJson(`${id}/${manifest.files.catalog}`);
    if (!Array.isArray(catalog.items)) throw new Error(`${id}: catalog.items must be an array`);
    if (manifest.itemCount !== undefined && catalog.items.length !== manifest.itemCount) {
      throw new Error(`${id}: itemCount mismatch (${manifest.itemCount} !== ${catalog.items.length})`);
    }

    const categories = await fetchJson(`${id}/${manifest.files.categories}`);
    if (!Array.isArray(categories.categories)) throw new Error(`${id}: categories.categories must be an array`);

    const categoryIds = new Set(categories.categories.map((category) => category.id));
    const itemIds = new Set();
    for (const [index, item] of catalog.items.entries()) {
      if (!item?.id || itemIds.has(item.id)) throw new Error(`${id}: invalid/duplicate item id at #${index + 1}`);
      if (!item.name || !item.unit) throw new Error(`${id}: incomplete item ${item.id}`);
      if (!Number.isInteger(item.priceKopecks) || item.priceKopecks < 0) throw new Error(`${id}: invalid price for ${item.id}`);
      if (!categoryIds.has(item.categoryId)) throw new Error(`${id}: unknown category ${item.categoryId} for ${item.id}`);
      if (item.type !== 'service' && item.type !== 'material') throw new Error(`${id}: invalid type for ${item.id}`);
      itemIds.add(item.id);
    }

    console.log(`✓ ${id}: ${catalog.items.length} remote items`);
  }

  console.log('✓ Remote catalog validation passed');
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
