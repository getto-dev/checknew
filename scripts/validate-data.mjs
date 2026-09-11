import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataRoot = path.join(root, 'data');
const profilesPath = path.join(dataRoot, 'profiles.json');
const MAX_ITEMS = 100000;
const PROFILE_ID_RE = /^[a-z0-9_-]{1,64}$/i;

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const fail = (message) => {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
};

try {
  const profiles = readJson(profilesPath);
  if (!Array.isArray(profiles) || profiles.length === 0) {
    fail('data/profiles.json must contain a non-empty array');
  } else {
    const profileIds = new Set();

    for (const [index, profile] of profiles.entries()) {
      if (!profile || typeof profile !== 'object') {
        fail(`profiles.json: entry #${index + 1} is not an object`);
        continue;
      }

      const id = typeof profile.id === 'string' ? profile.id.trim() : '';
      const catalogPath = typeof profile.catalogPath === 'string' ? profile.catalogPath.trim() : '';

      if (!PROFILE_ID_RE.test(id)) fail(`profiles.json: invalid profile id at #${index + 1}`);
      if (profileIds.has(id)) fail(`profiles.json: duplicate profile id ${id}`);
      profileIds.add(id);
      if (!Array.isArray(profile.categories)) fail(`profiles.json: ${id} has no categories array`);

      const expectedPath = `/${'data'}/profiles/${id}/catalog.json`;
      if (catalogPath !== expectedPath) fail(`profiles.json: ${id} catalogPath must be ${expectedPath}`);

      const catalogFile = path.join(root, catalogPath.replace(/^\//, ''));
      if (!fs.existsSync(catalogFile)) {
        fail(`profiles.json: catalog file missing for ${id}: ${catalogPath}`);
        continue;
      }

      const catalog = readJson(catalogFile);
      if (!catalog || typeof catalog !== 'object') {
        fail(`${catalogPath}: root must be an object`);
        continue;
      }
      if (catalog.id !== id) fail(`${catalogPath}: id does not match profile id ${id}`);
      if (!Array.isArray(catalog.items)) {
        fail(`${catalogPath}: items must be an array`);
        continue;
      }
      if (catalog.items.length > MAX_ITEMS) fail(`${catalogPath}: too many items (${catalog.items.length})`);

      const itemIds = new Set();
      for (const [itemIndex, item] of catalog.items.entries()) {
        if (!item || typeof item !== 'object') {
          fail(`${catalogPath}: item #${itemIndex + 1} is not an object`);
          continue;
        }
        const itemId = typeof item.id === 'string' ? item.id.trim() : '';
        const name = typeof item.name === 'string' ? item.name.trim() : '';
        const category = typeof item.category === 'string' ? item.category.trim() : '';
        const unit = typeof item.unit === 'string' ? item.unit.trim() : '';
        const price = Number(item.price);

        if (!itemId) fail(`${catalogPath}: item #${itemIndex + 1} has no id`);
        if (itemIds.has(itemId)) fail(`${catalogPath}: duplicate item id ${itemId}`);
        itemIds.add(itemId);
        if (!name || name.length > 300) fail(`${catalogPath}: invalid item name ${itemId}`);
        if (!category || category.length > 200) fail(`${catalogPath}: invalid category for ${itemId}`);
        if (!unit || unit.length > 50) fail(`${catalogPath}: invalid unit for ${itemId}`);
        if (!Number.isFinite(price) || price < 0) fail(`${catalogPath}: invalid price for ${itemId}`);
        if (item.type !== 'work' && item.type !== 'material') fail(`${catalogPath}: invalid type for ${itemId}`);
      }

      console.log(`✓ ${id}: ${catalog.items.length} items`);
    }
  }
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

if (!process.exitCode) console.log('✓ Catalog data validation passed');
