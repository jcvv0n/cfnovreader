// cfnovreader Admin UI client script.
// 通过事件委托绑定按钮，不再依赖 inline onclick="..."（也就不会再踩 template-literal 转义坑）。

(function () {
  const $ = (id) => document.getElementById(id);
  const getToken = () => sessionStorage.getItem('admin_token') || '';
  const getNs = () => $('ns-input').value.trim();
  const busyActions = new Set();
  const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

  async function api(path, body, onProgress) {
    if (onProgress) {
      return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/_cfnov_admin' + path);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('X-Admin-Token', getToken());
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
        });
        xhr.onload = () => {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch (_) {
            resolve({ ok: false, error: '服务器返回了无效响应' });
          }
        };
        xhr.onerror = () => resolve({ ok: false, error: '网络请求失败' });
        xhr.send(JSON.stringify(body));
      });
    }
    try {
      const r = await fetch('/_cfnov_admin' + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': getToken() },
        body: JSON.stringify(body),
      });
      return await r.json();
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  function showMsg(id, text, ok) {
    const el = $(id);
    el.textContent = text;
    el.className = 'msg ' + (ok ? 'ok' : 'err');
  }

  async function withBusy(action, task, button) {
    if (busyActions.has(action)) return;
    busyActions.add(action);
    const el = button || document.querySelector('[data-action="' + action + '"]');
    const originalText = el ? el.textContent : '';
    if (el) {
      el.disabled = true;
      el.textContent = '处理中...';
    }
    try {
      return await task();
    } finally {
      busyActions.delete(action);
      if (el) {
        el.disabled = false;
        el.textContent = originalText;
      }
    }
  }

  function saveToken() {
    const t = $('token-input').value.trim();
    if (!t) return showMsg('auth-msg', '请输入 Token', false);
    sessionStorage.setItem('admin_token', t);
    showMsg('auth-msg', 'Token 已保存到 sessionStorage', true);
  }

  function clearToken() {
    sessionStorage.removeItem('admin_token');
    $('token-input').value = '';
    showMsg('auth-msg', 'Token 已清除', true);
  }

  function switchTab(name) {
    const names = ['stories', 'add', 'upload'];
    document.querySelectorAll('.tab').forEach((t, i) => {
      const active = names[i] === name;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', String(active));
      t.tabIndex = active ? 0 : -1;
    });
    document.querySelectorAll('.section').forEach((s) => {
      const active = s.id === 'tab-' + name;
      s.classList.toggle('active', active);
      s.hidden = !active;
    });
  }

  async function loadStories() {
    const ns = getNs();
    if (!ns) return showMsg('ns-msg', '请输入命名空间', false);
    return withBusy('load-stories', async () => {
      const res = await api('/api/stories', { namespace: ns });
      if (!res.ok) return showMsg('ns-msg', res.error || '加载失败', false);
      showMsg('ns-msg', '加载成功，共 ' + res.stories.length + ' 部小说', true);
      renderStories(res.stories, ns);
    });
  }

  function renderStories(stories, ns) {
    const ul = $('story-list');
    if (!stories || !stories.length) {
      ul.innerHTML = '<li style="color:#aaa;padding:8px 0">暂无小说，请到"添加小说"Tab 添加</li>';
      return;
    }
    ul.innerHTML = '';
    stories.forEach((s) => {
      const li = document.createElement('li');
      li.innerHTML =
        '<span>' +
        escapeHtml(s.storyName) +
        ' <span class="story-meta">ID: ' +
        escapeHtml(s.storyId) +
        '</span>' +
        ' <a href="/r/' +
        encodeURIComponent(ns) +
        '/stos/1" target="_blank" rel="noopener" class="tag-link">书单</a>' +
        ' <a href="/r/' +
        encodeURIComponent(ns) +
        '/cat/' +
        encodeURIComponent(s.storyId) +
        '" target="_blank" rel="noopener" class="tag-link">目录</a>' +
        '</span>' +
        '<button class="btn-danger" data-action="delete-story" data-id="' +
        escapeHtml(s.storyId) +
        '">删除</button>';
      ul.appendChild(li);
    });
  }

  async function addStory() {
    const ns = getNs();
    const name = $('add-name').value.trim();
    const id = $('add-id').value.trim();
    if (!ns) return showMsg('add-msg', '请先输入命名空间并加载', false);
    if (!name || !id) return showMsg('add-msg', '请填写小说名称和 ID', false);
    return withBusy('add-story', async () => {
      const res = await api('/api/story/create', { namespace: ns, storyId: id, storyName: name });
      showMsg('add-msg', res.ok ? '添加成功' : res.error || '添加失败', res.ok);
      if (res.ok) await loadStories();
    });
  }

  async function deleteStory(storyId, button) {
    const ns = getNs();
    if (!confirm('确认删除该小说？这会从当前书目移除，并删除对应的 R2 章节分块和 KV meta。'))
      return;
    return withBusy(
      'delete-story',
      async () => {
        const res = await api('/api/story/delete', { namespace: ns, storyId });
        if (res.ok) {
          showMsg('story-msg', '删除成功', true);
          await loadStories();
        } else {
          showMsg('story-msg', res.error || '删除失败', false);
        }
      },
      button,
    );
  }

  function loadFile() {
    const f = $('upload-file').files[0];
    if (!f) return;
    if (f.size > MAX_UPLOAD_BYTES) {
      $('upload-file').value = '';
      return showMsg('upload-msg', '文件不能超过 5 MB', false);
    }
    const r = new FileReader();
    r.onload = (e) => {
      $('upload-json').value = e.target.result;
      updateUploadPreview();
    };
    r.readAsText(f);
  }

  function parseChapterPayload(json) {
    let parsed;
    try {
      parsed = JSON.parse(json);
    } catch (e) {
      return { error: 'JSON 格式错误: ' + e.message };
    }
    const chapters = Array.isArray(parsed) ? parsed : parsed && parsed.items;
    if (!Array.isArray(chapters) || !chapters.length) return { error: '章节列表为空或格式错误' };
    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      if (!chapter || typeof chapter !== 'object') return { error: `第 ${i + 1} 章格式错误` };
      if (typeof chapter.title !== 'string') return { error: `第 ${i + 1} 章缺少 title` };
      if (!Array.isArray(chapter.content) || chapter.content.some((p) => typeof p !== 'string')) {
        return { error: `第 ${i + 1} 章 content 必须是字符串数组` };
      }
    }
    return { chapters };
  }

  function updateUploadPreview() {
    const preview = $('upload-preview');
    const json = $('upload-json').value.trim();
    if (!json) {
      preview.textContent = '';
      preview.className = 'upload-preview';
      return null;
    }
    if (new Blob([json]).size > MAX_UPLOAD_BYTES) {
      preview.textContent = 'JSON 内容超过 5 MB';
      preview.className = 'upload-preview err';
      return null;
    }
    const result = parseChapterPayload(json);
    if (result.error) {
      preview.textContent = result.error;
      preview.className = 'upload-preview err';
      return result;
    }
    const totalParagraphs = result.chapters.reduce(
      (sum, chapter) => sum + chapter.content.length,
      0,
    );
    const firstTitle = result.chapters[0].title || '未命名';
    preview.textContent = `已解析 ${result.chapters.length} 章、${totalParagraphs} 个段落。首章：${firstTitle}`;
    preview.className = 'upload-preview ok';
    return result;
  }

  function resetUploadForm() {
    $('upload-json').value = '';
    $('upload-file').value = '';
    $('upload-preview').textContent = '';
    $('upload-preview').className = 'upload-preview';
  }

  async function uploadChapters() {
    const id = $('upload-id').value.trim();
    const json = $('upload-json').value.trim();
    if (!id) return showMsg('upload-msg', '请填写小说 ID', false);
    if (!json) return showMsg('upload-msg', '请填写或上传章节 JSON', false);
    const parsed = updateUploadPreview();
    if (!parsed || parsed.error)
      return showMsg('upload-msg', parsed?.error || '章节内容无效', false);
    const chapters = parsed.chapters;
    if (!confirm('上传会覆盖该小说现有章节内容，确认继续吗？')) return;
    return withBusy('upload-chapters', async () => {
      const progress = $('upload-progress');
      const progressLabel = $('upload-progress-label');
      progress.hidden = false;
      progress.value = 0;
      progressLabel.textContent = '准备上传...';
      showMsg('upload-msg', '上传中，共 ' + chapters.length + ' 章...', true);
      const res = await api('/api/story/upload', { storyId: id, chapters }, (percent) => {
        progress.value = percent;
        progressLabel.textContent = `上传中 ${percent}%`;
      });
      showMsg(
        'upload-msg',
        res.ok ? '上传成功，共 ' + chapters.length + ' 章' : res.error || '上传失败',
        res.ok,
      );
      if (res.ok) {
        progress.value = 100;
        progressLabel.textContent = '上传完成';
        resetUploadForm();
      } else {
        progressLabel.textContent = '上传失败';
      }
    });
  }

  function escapeHtml(s) {
    return String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[c],
    );
  }

  // 事件绑定（替代 inline onclick）
  window.addEventListener('DOMContentLoaded', () => {
    const t = getToken();
    if (t) $('token-input').value = t;

    document.querySelector('.tab-bar').addEventListener('click', (e) => {
      const tab = e.target.closest('.tab');
      if (tab && tab.dataset.tab) switchTab(tab.dataset.tab);
    });

    document.querySelector('.tab-bar').addEventListener('keydown', (e) => {
      const tabs = Array.from(document.querySelectorAll('.tab'));
      const current = tabs.indexOf(document.activeElement);
      if (current < 0 || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      let next = current;
      if (e.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length;
      if (e.key === 'ArrowRight') next = (current + 1) % tabs.length;
      if (e.key === 'Home') next = 0;
      if (e.key === 'End') next = tabs.length - 1;
      tabs[next].focus();
      switchTab(tabs[next].dataset.tab);
    });

    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-action]');
      if (!el) return;
      const a = el.dataset.action;
      if (a === 'save-token') saveToken();
      else if (a === 'clear-token') clearToken();
      else if (a === 'load-stories') loadStories();
      else if (a === 'add-story') addStory();
      else if (a === 'upload-chapters') uploadChapters();
      else if (a === 'delete-story') deleteStory(el.dataset.id, el);
    });

    const fileInput = $('upload-file');
    if (fileInput) fileInput.addEventListener('change', loadFile);
    $('upload-json').addEventListener('input', updateUploadPreview);

    [
      ['token-input', saveToken],
      ['ns-input', loadStories],
      ['add-id', addStory],
      ['add-name', addStory],
      ['upload-id', uploadChapters],
    ].forEach(([id, handler]) => {
      $(id).addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handler();
        }
      });
    });
  });
})();
