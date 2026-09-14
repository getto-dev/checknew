export const REMOTE_DATA_BASE_URL = 'https://raw.githubusercontent.com/getto-dev/check-data/main/';
export const REMOTE_PROFILE_IDS = new Set(['plumbing', 'electrical']);

export const remoteDataUrl = (path: string) => `${REMOTE_DATA_BASE_URL}${path.replace(/^\//, '')}`;
