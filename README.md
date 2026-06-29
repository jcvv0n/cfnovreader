# cfnovreader

> **Languages:** English · [简体中文](./README.zh-CN.md)

A lightweight novel reader running on **Cloudflare Workers**. HTML is rendered at the edge; content is stored in Cloudflare **KV** + **R2**. No server, no SSR framework — just a Worker that assembles pages from templates.

- **Edge-rendered**: every request is served by a Worker close to the user.
- **Chunked storage**: chapters are grouped into small gzipped shard objects in R2.
- **Per-namespace bookshelves**: multiple libraries isolated by URL namespace.
- **Built-in admin**: a single-file management UI behind a token.

---

## How it works

Chapters are grouped into fixed-size R2 shard objects. The reader fetches **only the shard containing the requested chapter**, never the whole book. A chapter's number is just its array index — `1..count`, continuous — so flipping to the next/previous chapter is pure arithmetic (`N+1` / `N-1`). There is no per-chapter ID, no sparse numbering, no "jump to chapter X".

A small metadata record (chapter count + titles + storage layout) lives in KV. Catalog pages use it for titles; reader pages use it to locate the chapter's shard and detect the last chapter.

### Storage layout

```
KV   story_overview:{namespace}   →  [{storyId, storyName}, ...]    bookshelf
KV   story_meta:{storyId}          →  {count, titles:[...], storage:{...}}  metadata
R2   story:{storyId}:shard:{N}    →  up to 100 chapters, gzipped JSON {chapters:[...]}
```

| Page              | Reads                                      | Notes                                                  |
| ----------------- | ------------------------------------------ | ------------------------------------------------------ |
| Overview (`stos`) | KV `story_overview`                        | lists every book in the namespace                      |
| Catalog (`cat`)   | KV `story_meta` only                       | paginates titles in memory (10/page); never touches R2 |
| Reader (`cont`)   | KV `story_meta` + R2 `story:{id}:shard:{N}` | one shard; `count` detects the last chapter            |

- **Next/previous chapter**: `N+1` / `N-1`; hides "next" when `N === count`.
- **Delete a book**: read `story_meta` → delete its shard objects in batches → delete `meta`.
- **Update one chapter**: rewrite the shard containing that chapter, not the whole book.

### Compression

Chapters are gzipped with the Web-standard `CompressionStream` (Workers-native, no `nodejs_compat` flag required). Decompression uses `DecompressionStream`.

---

## Routes

### Public

| Path                             | Description                                  |
| -------------------------------- | -------------------------------------------- |
| `GET /r/{ns}/stos/1`             | Book overview for namespace `{ns}`           |
| `GET /r/{ns}/cat/{storyId}?p=N`  | Chapter catalog, page `N` (10 chapters/page) |
| `GET /r/{ns}/cont/{storyId}?p=N` | Read chapter `N`                             |

Append `&theme=<name>` to any public page to switch theme.

### Admin

| Path                             | Method | Description                            |
| -------------------------------- | ------ | -------------------------------------- |
| `/_cfnov_admin`                  | GET    | Admin UI (single page)                 |
| `/_cfnov_admin/api/stories`      | POST   | List books in a namespace              |
| `/_cfnov_admin/api/story/create` | POST   | Add a book to a namespace's shelf      |
| `/_cfnov_admin/api/story/delete` | POST   | Remove a book (+ its R2 chunks & meta) |
| `/_cfnov_admin/api/story/upload` | POST   | Upload chapters → chunked R2 + meta    |

Admin API calls require an `X-Admin-Token` header matching `ADMIN_TOKEN`.
Use `npx wrangler secret put ADMIN_TOKEN` for remote deployments. For local development, put a disposable value in `.dev.vars`:

```dotenv
ADMIN_TOKEN=dev-token
```

---

## Project structure

```
src/
├─ index.ts              entry: route table + error boundary
├─ router.ts             route matching (named captures → params)
├─ render.ts             {{KEY}} placeholder rendering
├─ themes.ts             THEMES config + CSS/option generation
├─ http.ts               HttpError, jsonOk/jsonError, parsePageNo, requireStr
├─ types.ts              Env bindings
├─ text-modules.d.ts     ambient decls for .html/.css/.client.js imports
├─ storage/              data-access layer
│  ├─ models.ts          StoryOverview / Chapter / StoryMeta
│  ├─ kv.ts              story_overview + story_meta CRUD
│  └─ r2.ts              per-chapter get/put/delete, gzip helpers
├─ templates/            stories.html / catalog.html / reader.html
└─ handlers/
   ├─ stories.ts / catalog.ts / reader.ts / pagination.ts
   └─ admin/
      ├─ index.ts         admin routing (UI + /api/*)
      ├─ auth.ts          token check
      ├─ api.ts           story CRUD + upload
      └─ assets/          admin.html / admin.css / admin.client.js
```

HTML/CSS/client-JS files are imported as text via Wrangler's `[[rules]] type = "Text"`.

---

## Themes

Five built-in themes, selected via `?theme=`:

| `theme`   | Background | Use            |
| --------- | ---------- | -------------- |
| `default` | `#e5e5e5`  | light          |
| `dark`    | `#1e1e1e`  | dark           |
| `green`   | `#e5f5e5`  | eye-care green |
| `yellow`  | `#fffde7`  | sepia          |
| `green2`  | `#d4edc9`  | alt green      |

Themes are defined in a single `THEMES` table in `src/themes.ts`; adding a theme is one entry, and the UI color swatches update automatically. Double-click the page to toggle the theme picker.

---

## Development

```bash
npm install
npm run seed        # write local seed data (chunked format) to local KV/R2
npm run dev         # wrangler dev → http://localhost:8787
```

- Seed data: `test/localdata.json` (3 chapters of a sample book).
- Local admin token is `dev-token` (see `wrangler.toml`).

### Tooling

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint src
npm run format      # prettier --write
npm test            # vitest run
```

---

## Configuration

`wrangler.toml` ships with placeholders you must replace with your own resource IDs:

```toml
kv_namespaces = [ { binding = "NOV_KV", id = "KV_ID" } ]        # replace KV_ID
r2_buckets   = [ { binding = "NOV_BUCKET", bucket_name = "r2-id" } ]  # replace r2-id
```

For the admin token, **do not** keep the real value in `wrangler.toml`. Set it as a secret for remote deployments:

```bash
npx wrangler secret put ADMIN_TOKEN
```

For local development, create `.dev.vars` with a disposable token:

```dotenv
ADMIN_TOKEN=dev-token
```

---

## Caching

| Route          | `Cache-Control`         |
| -------------- | ----------------------- |
| `stos` / `cat` | `public, max-age=60`    |
| `cont`         | `public, max-age=86400` |

Chapter text rarely changes, so the reader caches aggressively. After uploading/replacing content via admin, purge the cached URL (Cloudflare Cache API or a cache-rule purge) if you need changes to appear immediately.

---

## Migrating from the legacy monolithic format

Previous versions stored an entire book as a single FlatBuffers object `story_content:{storyId}`. The current code does **not** read that format (such books return `Invalid Page`).

To migrate a book:

1. Open the admin UI (`/_cfnov_admin`), enter the namespace, load the shelf.
2. For each book, re-upload its chapter JSON via the **Upload chapters** tab — this writes the new chunked format + `story_meta` automatically.
3. After verifying the reader works, delete the legacy object:

   ```bash
   npx wrangler r2 object delete "r2-id/story_content:{storyId}" --remote
   ```

---

## License

MIT
