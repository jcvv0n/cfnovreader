# cfnovreader

> **语言：** [English](./README.md) · 简体中文

一个运行在 **Cloudflare Workers** 上的轻量小说阅读器。HTML 在边缘节点渲染,内容存于 Cloudflare **KV** + **R2**。没有服务器、没有 SSR 框架——只有一个用模板拼装页面的 Worker。

- **边缘渲染**:每个请求都由离用户最近的 Worker 处理。
- **分块存储**:每章是一个独立的小体积 gzipped JSON 对象,按需读取。
- **按 namespace 隔离书单**:通过 URL 中的 namespace 区分多个书库。
- **内置管理后台**:一个单文件管理界面,token 鉴权。

---

## 工作原理

每章是一个独立的 R2 object。阅读器**只拉取需要的那一章**(几 KB),绝不拉整本。章节号就是数组下标——`1..count` 连续整数——所以翻上一章/下一章是纯算术(`N+1` / `N-1`)。没有章节级 ID、没有稀疏编号、没有"跳到第 X 章"。

一份小元数据(章节数 + 标题列表)存在 KV 里,**只被目录页读取**。最高频路径——读正文——既不读元数据也不碰其它章节。

### 存储结构

```
KV   story_overview:{namespace}   →  [{storyId, storyName}, ...]    书单
KV   story_meta:{storyId}          →  {count, titles:[...]}          目录页专用元数据
R2   story:{storyId}:{N}          →  单章 gzipped JSON {title, content}   (N = 1..count)
```

| 页面              | 读取                                  | 说明                         |
| ----------------- | ------------------------------------- | ---------------------------- |
| 书单一览 (`stos`) | KV `story_overview`                   | 列出该 namespace 下所有书    |
| 目录 (`cat`)      | 仅 KV `story_meta`                    | 内存分页(每页 10 章);不碰 R2 |
| 正文 (`cont`)     | R2 `story:{id}:{N}` + KV `meta.count` | 单章;`count` 仅用于判断末章  |

- **上一章/下一章**:`N-1` / `N+1`;当 `N === count` 时隐藏"下一章"。
- **删除整本**:读 `meta.count` → 并发删 `story:{id}:1..count` → 删 meta。
- **更新单章**:覆盖 `story:{id}:{N}` 即可,无需重写整本。

### 压缩

章节用 Web 标准 `CompressionStream` 压缩(Workers 原生,无需 `nodejs_compat` flag)。解压用 `DecompressionStream`。

---

## 路由

### 公开页面

| 路径                             | 说明                           |
| -------------------------------- | ------------------------------ |
| `GET /r/{ns}/stos/1`             | namespace `{ns}` 的书单一览    |
| `GET /r/{ns}/cat/{storyId}?p=N`  | 章节目录,第 `N` 页(每页 10 章) |
| `GET /r/{ns}/cont/{storyId}?p=N` | 阅读第 `N` 章                  |

任意公开页面追加 `&theme=<名>` 切换主题。

### 管理后台

| 路径                             | 方法 | 说明                            |
| -------------------------------- | ---- | ------------------------------- |
| `/_cfnov_admin`                  | GET  | 管理后台界面(单页)              |
| `/_cfnov_admin/api/stories`      | POST | 列出某 namespace 的小说         |
| `/_cfnov_admin/api/story/create` | POST | 往书单添加一本小说              |
| `/_cfnov_admin/api/story/delete` | POST | 删除一本小说(含 R2 分块 + meta) |
| `/_cfnov_admin/api/story/upload` | POST | 上传章节 → 分块写 R2 + meta     |

管理后台 API 调用需带 `X-Admin-Token` 头,值等于 `ADMIN_TOKEN`。

---

## 项目结构

```
src/
├─ index.ts              入口:路由表 + 错误兜底
├─ router.ts             路由匹配(具名捕获组 → 参数)
├─ render.ts             {{KEY}} 占位符渲染
├─ themes.ts             THEMES 配置 + CSS/色块生成
├─ http.ts               HttpError、jsonOk/jsonError、parsePageNo、requireStr
├─ types.ts              Env 绑定
├─ text-modules.d.ts     .html/.css/.client.js 文本导入的 ambient 声明
├─ storage/              数据访问层
│  ├─ models.ts          StoryOverview / Chapter / StoryMeta
│  ├─ kv.ts              story_overview + story_meta 增删改查
│  └─ r2.ts              单章 get/put/delete、gzip 工具
├─ templates/            stories.html / catalog.html / reader.html
└─ handlers/
   ├─ stories.ts / catalog.ts / reader.ts / pagination.ts
   └─ admin/
      ├─ index.ts         admin 路由(UI + /api/*)
      ├─ auth.ts          token 校验
      ├─ api.ts           小说增删 + 上传
      └─ assets/          admin.html / admin.css / admin.client.js
```

HTML/CSS/客户端 JS 通过 Wrangler 的 `[[rules]] type = "Text"` 以文本形式导入。

---

## 主题

内置 5 套主题,通过 `?theme=` 选择:

| `theme`   | 背景      | 用途   |
| --------- | --------- | ------ |
| `default` | `#e5e5e5` | 浅色   |
| `dark`    | `#1e1e1e` | 深色   |
| `green`   | `#e5f5e5` | 护眼绿 |
| `yellow`  | `#fffde7` | 米黄   |
| `green2`  | `#d4edc9` | 备选绿 |

主题集中在 `src/themes.ts` 的 `THEMES` 表里;新增主题只需加一条,UI 色块会自动更新。双击页面可切换主题选择弹层。

---

## 开发

```bash
npm install
npm run seed        # 写本地种子数据(分块格式)到本地 KV/R2
npm run dev         # wrangler dev → http://localhost:8787
```

- 种子数据:`test/localdata.json`(一本示例书的 3 章)。
- 本地管理 token 为 `dev-token`(见 `wrangler.toml`)。

### 工具链

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint src
npm run format      # prettier --write
npm test            # vitest run
```

---

## 配置

`wrangler.toml` 里有占位符,需替换为你的真实资源 ID:

```toml
kv_namespaces = [ { binding = "NOV_KV", id = "KV_ID" } ]        # 替换 KV_ID
r2_buckets   = [ { binding = "NOV_BUCKET", bucket_name = "r2-id" } ]  # 替换 r2-id
```

管理 token:生产环境**不要**把真实值留在 `wrangler.toml`,改为 secret:

```bash
npx wrangler secret put ADMIN_TOKEN
```

---

## 缓存

| 路由           | `Cache-Control`         |
| -------------- | ----------------------- |
| `stos` / `cat` | `public, max-age=60`    |
| `cont`         | `public, max-age=86400` |

正文极少变动,因此阅读器缓存较久。通过管理后台上传/替换内容后,若需立即生效,需清除对应 URL 的缓存(Cloudflare Cache API 或缓存规则 purge)。

---

## 从旧整存格式迁移

旧版本把整本小说存为单个 FlatBuffers object `story_content:{storyId}`。当前代码**不读取**该格式(这类书会返回 `Invalid Page`)。

迁移一本书:

1. 打开管理后台(`/_cfnov_admin`),输入 namespace,加载书单。
2. 对每本书,用原章节 JSON 在「上传章节」标签页重新上传一次——自动写入新分块格式 + `story_meta`。
3. 确认阅读正常后,删除旧整存 object:

   ```bash
   npx wrangler r2 object delete "r2-id/story_content:{storyId}" --remote
   ```

---

## 许可证

MIT
