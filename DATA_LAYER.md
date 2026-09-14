# Data layer — СметаПро 2.0

Каталоги приложения разделены от UI и бизнес-логики.

## Источники

- **Remote repository:** `https://github.com/getto-dev/check-data`
- **Runtime remote base:** `https://raw.githubusercontent.com/getto-dev/check-data/main/`
- **Bundled fallback:** `public/data/`

Профили `plumbing` и `electrical` читаются через `src/services/dataRepository.ts` из общего data-repository. После проверки схемы они сохраняются в IndexedDB через `src/services/storage.ts`.

Профили `finishing` и `construction` пока остаются в bundled fallback до переноса их наборов в `check-data`.

## Формат remote profile

```text
profile/
├── manifest.json
├── catalog.json
├── categories.json
├── search-synonyms.json
└── config.json
```

`manifest.json` задаёт версию и количество позиций. `catalog.json` хранит цены в копейках и ссылается на категории по `categoryId`. Приложение преобразует эти данные в свой runtime-тип без изменения UI.

## Offline

1. Remote JSON загружается через Service Worker с `NetworkFirst`.
2. Валидированный каталог сохраняется в IndexedDB.
3. При ошибке сети используется IndexedDB.
4. Если локального cache ещё нет, приложение использует bundled `public/data/` fallback.

Такой порядок сохраняет PWA-first поведение и позволяет обновлять каталог отдельно от релиза приложения.
