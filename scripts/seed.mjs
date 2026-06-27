#!/usr/bin/env node
// 本地开发种子脚本：写入分块存储格式到本地 KV/R2。
//   KV  story_overview:{namespace} = [{storyId, storyName}]
//   KV  story_meta:{storyId}       = {count, titles:[...]}
//   R2  story:{storyId}:{N}        = 单章 gzipped JSON {title, content}
// 用法: npm run seed

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const namespace = 'jcvv0n';
const storyId = '103429903';
const storyName = '三体（测试数据）';

const localdata = JSON.parse(readFileSync(join(rootDir, 'test/localdata.json'), 'utf8'));
const chapters = localdata.items; // [{title, content:[]}]

const tmpDir = join(rootDir, 'tmp');
mkdirSync(tmpDir, { recursive: true });

// 1. 写每章 gzipped JSON 到 R2
let count = 0;
for (let i = 0; i < chapters.length; i++) {
  const pageNo = i + 1;
  const gz = gzipSync(Buffer.from(JSON.stringify(chapters[i]), 'utf8'));
  const file = join(tmpDir, `seed_${storyId}_${pageNo}.bin`);
  writeFileSync(file, gz);
  execSync(`npx wrangler r2 object put "r2-id/story:${storyId}:${pageNo}" --file "${file}" --local`, {
    stdio: 'inherit',
    cwd: rootDir,
  });
  count++;
}
console.log(`✅ R2 单章内容已写入 ${count} 章`);

// 2. 写 meta 到 KV
const meta = { count, titles: chapters.map((c) => c.title) };
execSync(
  `npx wrangler kv key put "story_meta:${storyId}" '${JSON.stringify(meta)}' --binding=NOV_KV --local`,
  { stdio: 'inherit', cwd: rootDir },
);
console.log('✅ KV 章节元数据已写入');

// 3. 写书单到 KV
const overview = JSON.stringify([{ storyId, storyName }]);
execSync(
  `npx wrangler kv key put "story_overview:${namespace}" '${overview}' --binding=NOV_KV --local`,
  { stdio: 'inherit', cwd: rootDir },
);
console.log('✅ KV 书目数据已写入');

console.log('');
console.log('🎉 本地种子数据初始化完成！');
console.log('   阅读页面: http://localhost:8787/r/' + namespace + '/stos/1');
console.log('   管理后台: http://localhost:8787/_cfnov_admin  (token: dev-token)');
