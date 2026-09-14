import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const profilesPath = path.join(root, 'public', 'data', 'profiles.json');
const PROFILE_ID_RE = /^[a-z0-9_-]{1,64}$/i;
const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const fail = (message) => {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
};

try {
  const profiles = readJson(profilesPath);
  if (!Array.isArray(profiles) || profiles.length === 0) {
    throw new Error('public/data/profiles.json must contain a non-empty array');
  }

  const profileIds = new Set();
  for (const [index, profile] of profiles.entries()) {
    if (!profile || typeof profile !== 'object') throw new Error(`profiles.json: entry #${index + 1} is not an object`);
    const id = typeof profile.id === 'string' ? profile.id.trim() : '';
    if (!PROFILE_ID_RE.test(id)) throw new Error(`profiles.json: invalid profile id at #${index + 1}`);
    if (profileIds.has(id)) throw new Error(`profiles.json: duplicate profile id ${id}`);
    profileIds.add(id);
    if (typeof profile.name !== 'string' || !profile.name.trim()) throw new Error(`profiles.json: ${id} has no name`);
    if (!Array.isArray(profile.categories)) throw new Error(`profiles.json: ${id} has no categories array`);
    if (profile.categories.some((category) => typeof category !== 'string' || !category.trim())) throw new Error(`profiles.json: ${id} contains an invalid category`);
    console.log(`✓ ${id}: metadata valid`);
  }

  console.log('✓ Profile metadata validation passed');
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
