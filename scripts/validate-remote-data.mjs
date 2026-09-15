const BASE = 'https://raw.githubusercontent.com/getto-dev/check-data/main/';

const fetchJson = async (path) => {
  const response = await fetch(`${BASE}${path}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${path}`);
  return response.json();
};

const fail = (message) => {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
};

const assertString = (value, field) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} must be a non-empty string`);
};

try {
  const index = await fetchJson('index.json');
  if (!Number.isInteger(index.schemaVersion) || index.schemaVersion < 1) throw new Error('Remote data index has invalid schemaVersion');
  if (!Array.isArray(index.profiles) || index.profiles.length === 0) throw new Error('Remote data index has no profiles');

  const seenIds = new Set();
  for (const [indexPosition, entry] of index.profiles.entries()) {
    const id = typeof entry?.id === 'string' ? entry.id.trim() : '';
    const manifestPath = typeof entry?.manifest === 'string' ? entry.manifest.trim() : '';
    if (!/^[a-z0-9_-]{1,64}$/i.test(id) || seenIds.has(id)) throw new Error(`index: invalid/duplicate profile id at #${indexPosition + 1}`);
    if (!manifestPath || manifestPath.includes('..') || !manifestPath.endsWith('/manifest.json')) throw new Error(`index: invalid manifest path for ${id}`);
    seenIds.add(id);

    const manifest = await fetchJson(manifestPath);
    if (manifest.id !== id) throw new Error(`${id}: manifest id mismatch`);
    assertString(manifest.name, `${id}: name`);
    assertString(manifest.version, `${id}: version`);
    assertString(manifest.description, `${id}: description`);
    assertString(manifest.icon, `${id}: icon`);
    assertString(manifest.color, `${id}: color`);
    if (!manifest.files?.catalog || !manifest.files?.categories) throw new Error(`${id}: incomplete manifest files`);

    const catalog = await fetchJson(`${id}/${manifest.files.catalog}`);
    if (!Number.isInteger(catalog.schemaVersion) || catalog.schemaVersion < 1) throw new Error(`${id}: invalid catalog schemaVersion`);
    if (!Array.isArray(catalog.items)) throw new Error(`${id}: catalog.items must be an array`);
    if (manifest.itemCount !== undefined && catalog.items.length !== manifest.itemCount) throw new Error(`${id}: itemCount mismatch (${manifest.itemCount} !== ${catalog.items.length})`);

    const categories = await fetchJson(`${id}/${manifest.files.categories}`);
    if (!Array.isArray(categories.categories)) throw new Error(`${id}: categories.categories must be an array`);
    const categoryIds = new Set(categories.categories.map((category) => category.id));
    if (categoryIds.size !== categories.categories.length) throw new Error(`${id}: duplicate category id`);

    const itemIds = new Set();
    for (const [itemIndex, item] of catalog.items.entries()) {
      if (!item?.id || itemIds.has(item.id)) throw new Error(`${id}: invalid/duplicate item id at #${itemIndex + 1}`);
      if (!item.name || !item.unit) throw new Error(`${id}: incomplete item ${item.id}`);
      if (!Number.isInteger(item.priceKopecks) || item.priceKopecks < 0) throw new Error(`${id}: invalid price for ${item.id}`);
      if (!categoryIds.has(item.categoryId)) throw new Error(`${id}: unknown category ${item.categoryId} for ${item.id}`);
      if (item.type !== 'service' && item.type !== 'material') throw new Error(`${id}: invalid type for ${item.id}`);
      itemIds.add(item.id);
    }

    console.log(`✓ ${id}: ${catalog.items.length} remote items`);
  }

  console.log(`✓ Remote catalog validation passed (${index.profiles.length} profiles)`);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
