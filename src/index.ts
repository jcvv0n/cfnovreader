import { ByteBuffer } from 'flatbuffers';
import { StoryContentArray } from './story-content';

const storysTemplate = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Story Overview</title>
  <style>
    p{text-indent:10px;}
    a{font-family:SimHei;font-size:20px;letter-spacing:1px;text-decoration:none;}
    #theme-toggle {
      position: fixed;
      top: 10px;
      right: 10px;
      cursor: pointer;
      z-index: 1000;
      font-size: 20px;
    }
    #theme-menu {
      position: fixed;
      top: 40px;
      right: 10px;
      background: #fff;
      border: 1px solid #ccc;
      padding: 5px;
      display: none;
      z-index: 1000;
    }
    .theme-option {
      width: 30px;
      height: 30px;
      display: inline-block;
      margin: 2px;
      position: relative;
      cursor: pointer;
      border: 1px solid #ccc;
    }
    .theme-option::after {
      content: attr(data-check);
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 20px;
      color: red;
    }
  </style>
</head>
<body>
<div align="center">
<h2>Story Overview</h2>
</div>
<div align="left">
{{STORY_OVERVIEW}}
</div>
<a id="theme-toggle" href="javascript:void(0)">🎨</a>
<div id="theme-menu">
  <a class="theme-option" data-theme="default" style="background: #e5e5e5;" data-check=""></a>
  <a class="theme-option" data-theme="dark" style="background: #1e1e1e;" data-check=""></a>
  <a class="theme-option" data-theme="green" style="background: #e5f5e5;" data-check=""></a>
  <a class="theme-option" data-theme="yellow" style="background: #fffde7;" data-check=""></a>
  <a class="theme-option" data-theme="green2" style="background: #d4edc9;" data-check=""></a>
</div>
<script>
  document.addEventListener('DOMContentLoaded', function () {
    const urlParams = new URLSearchParams(window.location.search);
    const currentTheme = urlParams.get('theme') || 'default';
    const themeOptions = document.querySelectorAll('.theme-option');

    themeOptions.forEach(option => {
      const theme = option.getAttribute('data-theme');
      if (theme === currentTheme) {
        option.setAttribute('data-check', '✔');
      }
      option.setAttribute('href', '?theme=' + theme);
    });

    document.getElementById('theme-toggle').addEventListener('click', function () {
      const menu = document.getElementById('theme-menu');
      menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    });
  });
</script>
</body>
</html>
`;

const catalogTemplate = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Catalog</title>
  <style>
    p{text-indent:10px;}
    a{font-family:SimHei;font-size:20px;letter-spacing:1px;text-decoration:none;}
    .pagination {
      margin: 10px 0;
      text-align: center;
    }
    .pagination a, .pagination input, .pagination button {
      margin: 0 5px;
      padding: 5px 10px;
      font-size: 18px;
      border: 1px solid #ccc;
      border-radius: 4px;
      height: 30px;
      vertical-align: middle;
    }
    .pagination input {
      width: 40px;
      text-align: center;
    }
    .pagination .disabled {
      color: #999;
      pointer-events: none;
    }
    #theme-toggle {
      position: fixed;
      top: 10px;
      right: 10px;
      cursor: pointer;
      z-index: 1000;
      font-size: 20px;
    }
    #theme-menu {
      position: fixed;
      top: 40px;
      right: 10px;
      background: #fff;
      border: 1px solid #ccc;
      padding: 5px;
      display: none;
      z-index: 1000;
    }
    .theme-option {
      width: 30px;
      height: 30px;
      display: inline-block;
      margin: 2px;
      position: relative;
      cursor: pointer;
      border: 1px solid #ccc;
    }
    .theme-option::after {
      content: attr(data-check);
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 20px;
      color: red;
    }
  </style>
</head>
<body>
<a id="theme-toggle" href="javascript:void(0)">🎨</a>
<div id="theme-menu">
  <a class="theme-option" data-theme="default" style="background: #e5e5e5;" data-check=""></a>
  <a class="theme-option" data-theme="dark" style="background: #1e1e1e;" data-check=""></a>
  <a class="theme-option" data-theme="green" style="background: #e5f5e5;" data-check=""></a>
  <a class="theme-option" data-theme="yellow" style="background: #fffde7;" data-check=""></a>
  <a class="theme-option" data-theme="green2" style="background: #d4edc9;" data-check=""></a>
</div>
<div align="center">
{{OVERVIEW_PAGE}}
</div>
<div align="left">
<h2>{{STORY_NAME}}</h2>
{{STORY_CATALOG}}
</div>
<div class="pagination">
  <a href="/r/{{NAMESPACE}}/cat/{{STORY_ID}}?p=1&theme={{THEME}}" title="First page" class="{{FIRST_DISABLED}}">«</a>
  <a href="/r/{{NAMESPACE}}/cat/{{STORY_ID}}?p={{PREV_PAGE}}&theme={{THEME}}" title="Prev page" class="{{PREV_DISABLED}}">‹</a>
  <input
    type="text"
    id="pageInput"
    value="{{CURRENT_PAGE}}"
    min="1"
    max="{{TOTAL_PAGES}}"
    inputmode="numeric"
    pattern="[0-9]*"
    oninput="this.value = this.value.replace(/[^0-9]/g, '')"
    style="width: 40px; background-color: {{INPUT_BG_COLOR}}; color: {{INPUT_TEXT_COLOR}};"
  />
  <a href="javascript:goToPage()">Go</a>
  <a href="/r/{{NAMESPACE}}/cat/{{STORY_ID}}?p={{NEXT_PAGE}}&theme={{THEME}}" title="Next page" class="{{NEXT_DISABLED}}">›</a>
  <a href="/r/{{NAMESPACE}}/cat/{{STORY_ID}}?p={{TOTAL_PAGES}}&theme={{THEME}}" title="Last page" class="{{LAST_DISABLED}}">»</a>
</div>
<script>
  document.addEventListener('DOMContentLoaded', function () {
    const urlParams = new URLSearchParams(window.location.search);
    const currentTheme = urlParams.get('theme') || 'default';
    const themeOptions = document.querySelectorAll('.theme-option');

    themeOptions.forEach(option => {
      const theme = option.getAttribute('data-theme');
      if (theme === currentTheme) {
        option.setAttribute('data-check', '✔');
      }
      option.setAttribute('href', '?p={{CURRENT_PAGE}}&theme=' + theme);
    });

    document.getElementById('theme-toggle').addEventListener('click', function () {
      const menu = document.getElementById('theme-menu');
      menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    });
  });

  function goToPage() {
    const input = document.getElementById('pageInput');
    const page = parseInt(input.value);
    const max = parseInt(input.max);
    const safePage = Math.max(1, Math.min(page, max));
    const url = new URL(window.location.href);
    url.searchParams.set('p', safePage);
    window.location.href = url.toString();
  }

  document.getElementById('pageInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      goToPage();
    }
  });
</script>
</body>
</html>
`;

const readerTemplate = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{STORY_TITLE}}</title>
  <style>
    p{font-family:SimHei;font-size:22px;line-height:2.0;letter-spacing:2px;text-indent:48px;}
    a{font-family:SimHei;font-size:24px;text-decoration:none;}
    #theme-toggle {
      position: fixed;
      top: 10px;
      right: 10px;
      cursor: pointer;
      z-index: 1000;
      font-size: 20px;
    }
    #theme-menu {
      position: fixed;
      top: 40px;
      right: 10px;
      background: #fff;
      border: 1px solid #ccc;
      padding: 5px;
      display: none;
      z-index: 1000;
    }
    .theme-option {
      width: 30px;
      height: 30px;
      display: inline-block;
      margin: 2px;
      position: relative;
      cursor: pointer;
      border: 1px solid #ccc;
    }
    .theme-option::after {
      content: attr(data-check);
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 20px;
      color: red;
    }
  </style>
</head>
<body>
<a id="theme-toggle" href="javascript:void(0)">🎨</a>
<div id="theme-menu">
  <a class="theme-option" data-theme="default" style="background: #e5e5e5;" data-check=""></a>
  <a class="theme-option" data-theme="dark" style="background: #1e1e1e;" data-check=""></a>
  <a class="theme-option" data-theme="green" style="background: #e5f5e5;" data-check=""></a>
  <a class="theme-option" data-theme="yellow" style="background: #fffde7;" data-check=""></a>
  <a class="theme-option" data-theme="green2" style="background: #d4edc9;" data-check=""></a>
</div>
<div>
<h1>{{STORY_TITLE}}</h1>
</div>
<div align="text">
  {{CONTENT_TEXT}}
</div>
{{NEXT_PAGE_TAG}}
{{PRE_PAGE_TAG}}
<script>
  document.addEventListener('DOMContentLoaded', function () {
    const urlParams = new URLSearchParams(window.location.search);
    const currentTheme = urlParams.get('theme') || 'default';
    const themeOptions = document.querySelectorAll('.theme-option');

    themeOptions.forEach(option => {
      const theme = option.getAttribute('data-theme');
      if (theme === currentTheme) {
        option.setAttribute('data-check', '✔');
      }
      option.setAttribute('href', '?p={{PAGE_NO}}&theme=' + theme);
    });

    document.getElementById('theme-toggle').addEventListener('click', function () {
      const menu = document.getElementById('theme-menu');
      menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    });
  });
</script>
</body>
</html>
`;

export interface Env {
  NOV_KV: KVNamespace;
  NOV_BUCKET: R2Bucket;
}

interface StoryOverview {
  storyId: string;
  storyName: string;
}

interface StoryContent {
  pageNo: number;
  pageDesc: string;
  content: Array<string>;
}

// 主路由处理
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const match = path.match(/^\/r\/([^\/]+)\/([^\/]+)\/([^\/]+)\/?([^\/]+)?$/);

    if (!match) {
      return new Response("Not Found", { status: 404 });
    }

    const namespace = match[1];
    const pageType = match[2];
    const route = match[3];
    let contents: Array<StoryContent>;
    let html = '';
    const storys: Array<StoryOverview> = await env.NOV_KV.get(`story_overview:${namespace}`, 'json');

    if (!storys) {
      return new Response("Invalid Page", { status: 404 });
    }

    const theme = url.searchParams.get('theme') || 'default';

    switch (pageType) {
      case 'stos':
        if (route != '1') {
          return new Response("Invalid Page", { status: 404 });
        }
        html = genStoryOverview(namespace, storys, theme);
        break;
      case 'cat':
        const partNoStr = url.searchParams.get('p') || '1';
        const partNo = Number(partNoStr);
        if (isNaN(partNo) || partNo < 1) {
          return new Response("Invalid PartNo", { status: 404 });
        }
        contents = await getStoryContentFromR2(env.NOV_BUCKET, route);
        if (!contents) {
          return new Response("Invalid Page", { status: 404 });
        }
        html = genStoryCatalog(namespace, storys, contents, route, partNo, theme);
        break;
      case 'cont':
        contents = await getStoryContentFromR2(env.NOV_BUCKET, route);
        if (!contents) {
          return new Response("Invalid Page", { status: 404 });
        }
        const pageNoStr = url.searchParams.get('p') || '1';
        const pageNo = Number(pageNoStr);
        if (isNaN(pageNo)) {
          return new Response("Invalid PageNo", { status: 404 });
        }
        html = genContentPage(namespace, storys, contents, route, pageNo, theme);
        break;
      default:
        return new Response("Invalid Page", { status: 404 });
    }

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache'
      }
    });
  }
};

async function getStoryContentFromR2(bucket: R2Bucket, storyId: string): Promise<Array<StoryContent>> {
  const object = await bucket.get(`story_content:${storyId}`);
  if (!object) {
    return null;
  }
  const arrayBuffer = await object.arrayBuffer();
  const data = new ByteBuffer(new Uint8Array(arrayBuffer));
  const content = StoryContentArray.getRootAsStoryContentArray(data);
  const pages: StoryContent[] = [];
  for (let i = 0; i < content.itemsLength(); i++) {
    const page = content.items(i)!;
    const contentArr: string[] = [];
    for (let j = 0; j < page.contentLength(); j++) {
      contentArr.push(page.content(j)!);
    }
    pages.push({
      pageNo: i + 1,
      pageDesc: page.title() || '',
      content: contentArr,
    });
  }
  return pages;
}

function genStoryOverview(namespace: string, storys: Array<StoryOverview>, theme: string): string {
  const storyOverview: string = storys.map((e: StoryOverview) => {
    return `<p id="s${e.storyId}"><a href="/r/${namespace}/cat/${e.storyId}?theme=${theme}">${e.storyName}</a></p>`;
  }).join('\n');
  return storysTemplate
      .replace(/{{STORY_OVERVIEW}}/g, storyOverview)
      .replace(/<style>/, `<style>${getThemeStyle(theme)}`);
}

function genStoryCatalog(namespace: string, storys: Array<StoryOverview>, contents: Array<StoryContent>, storyId: string, currentPage: number = 1, theme: string): string {
  const story: StoryOverview = storys.find(e => e.storyId == storyId);
  const pageSize = 10;
  const totalPages = Math.ceil(contents.length / pageSize);
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const paginatedContents = contents.slice(start, end);
  const prePageNo = Math.max(1, currentPage - 1);
  const nextPageNo = Math.min(totalPages, currentPage + 1);
  const firstDisabled = currentPage === 1 ? 'disabled' : '';
  const prevDisabled = currentPage === 1 ? 'disabled' : '';
  const nextDisabled = currentPage === totalPages ? 'disabled' : '';
  const lastDisabled = currentPage === totalPages ? 'disabled' : '';
  const storyCatalog: string = paginatedContents.map((e: StoryContent) => {
    return `<p id="p${e.pageNo}"><a href="/r/${namespace}/cont/${storyId}?p=${e.pageNo}&theme=${theme}">${e.pageDesc}</a></p>`;
  }).join('\n');
  const overviewPage: string = `<p><a href="/r/${namespace}/stos/1?theme=${theme}#s${story.storyId}">Story Overview</a></p>`;
  const themeStyle = getThemeStyle(theme);
  const colors = getThemeColors(theme);
  return catalogTemplate
      .replace(/{{NAMESPACE}}/g, namespace)
      .replace(/{{STORY_ID}}/g, storyId)
      .replace(/{{STORY_NAME}}/g, story.storyName)
      .replace(/{{STORY_CATALOG}}/g, storyCatalog)
      .replace(/{{OVERVIEW_PAGE}}/g, overviewPage)
      .replace(/{{CURRENT_PAGE}}/g, currentPage.toString())
      .replace(/{{TOTAL_PAGES}}/g, totalPages.toString())
      .replace(/{{PREV_PAGE}}/g, prePageNo.toString())
      .replace(/{{NEXT_PAGE}}/g, nextPageNo.toString())
      .replace(/{{FIRST_DISABLED}}/g, firstDisabled)
      .replace(/{{PREV_DISABLED}}/g, prevDisabled)
      .replace(/{{NEXT_DISABLED}}/g, nextDisabled)
      .replace(/{{LAST_DISABLED}}/g, lastDisabled)
      .replace(/{{THEME}}/g, theme)
      .replace(/<style>/, `<style>${themeStyle}`)
      .replace(/{{INPUT_BG_COLOR}}/g, colors.bgColor)
      .replace(/{{INPUT_TEXT_COLOR}}/g, colors.textColor);
}

function genContentPage(namespace: string, storys: Array<StoryOverview>, contents: Array<StoryContent>, storyId: string, pageNo: number, theme: string): string {
  const story: StoryOverview = storys.find(e => e.storyId == storyId);
  let prePageNo: number = null, nextPageNo: number = null;
  let curContent: StoryContent = null;
  contents.some(e => {
    if (curContent != null) {
      nextPageNo = e.pageNo;
      return true;
    }
    if (e.pageNo == pageNo) {
      curContent = e;
    }
    if (curContent == null) {
      prePageNo = e.pageNo;
    }
    return false;
  });
  const pageSize = 10;
  const currentPageInCatalog = Math.floor((curContent.pageNo - 1) / pageSize) + 1;
  const storyTitle = `${story.storyName} ${curContent.pageDesc}`;
  const contentText = curContent.content.map(e => {
    return `<p>${e}</p>`;
  }).join("");
  let nextPageTag: string;
  if (nextPageNo > 0) {
    nextPageTag = `<div align="center">
<a href="/r/${namespace}/cont/${storyId}?p=${nextPageNo}&theme=${theme}">Next</a>
&nbsp&nbsp&nbsp&nbsp<a href="/r/${namespace}/cat/${storyId}?p=${currentPageInCatalog}&theme=${theme}#p${curContent.pageNo}">Cat</a>
&nbsp&nbsp&nbsp&nbsp<a href="/r/${namespace}/cont/${storyId}?p=${nextPageNo}&theme=${theme}">Next</a>
</div>
</br></br>`;
  } else {
    nextPageTag = "";
  }
  let prePageTag: string;
  if (prePageNo > 0) {
    prePageTag = `<div align="center">
<a href="/r/${namespace}/cont/${storyId}?p=${prePageNo}&theme=${theme}">Prev</a>
&nbsp&nbsp&nbsp&nbsp<a href="/r/${namespace}/cat/${storyId}?p=${currentPageInCatalog}&theme=${theme}#p${curContent.pageNo}">Cat</a>
&nbsp&nbsp&nbsp&nbsp<a href="/r/${namespace}/cont/${storyId}?p=${prePageNo}&theme=${theme}">Prev</a>
</div>
</br></br>`;
  } else {
    prePageTag = "";
  }
  return readerTemplate
      .replace(/{{STORY_TITLE}}/g, storyTitle)
      .replace(/{{CONTENT_TEXT}}/g, contentText)
      .replace(/{{NEXT_PAGE_TAG}}/g, nextPageTag)
      .replace(/{{PRE_PAGE_TAG}}/g, prePageTag)
      .replace(/{{PAGE_NO}}/g, curContent.pageNo.toString())
      .replace(/<style>/, `<style>${getThemeStyle(theme)}`);
}

function getThemeColors(theme: string): { bgColor: string, textColor: string } {
  switch (theme) {
    case 'dark':
      return { bgColor: '#1e1e1e', textColor: '#ffffff' };
    case 'green':
      return { bgColor: '#e5f5e5', textColor: '#003300' };
    case 'yellow':
      return { bgColor: '#fffde7', textColor: '#333333' };
    case 'green2':
      return { bgColor: '#d4edc9', textColor: '#333333' };
    default:
      return { bgColor: '#e5e5e5', textColor: '#000000' };
  }
}

function getThemeStyle(theme: string): string {
  switch (theme) {
    case 'dark':
      return `body { background-color: #1e1e1e; color: #ffffff; font-family: SimHei; } a { color: #cccccc; }`;
    case 'green':
      return `body { background-color: #e5f5e5; color: #003300; font-family: SimHei; } a { color: #006600; }`;
    case 'yellow':
      return `body { background-color: #fffde7; color: #333333; font-family: SimHei; } a { color: #885500; }`;
    case 'green2':
      return `body { background-color: #d4edc9; color: #333333; font-family: SimHei; } a { color: #006600; }`;
    default:
      return `body { background-color: #e5e5e5; color: #000000; font-family: SimHei; } a { color: #0000cc; }`;
  }
}