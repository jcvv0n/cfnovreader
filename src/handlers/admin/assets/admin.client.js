// cfnovreader Admin UI client script.
// 通过事件委托绑定按钮，不再依赖 inline onclick="..."（也就不会再踩 template-literal 转义坑）。

(function () {
  const $ = (id) => document.getElementById(id);
  const getToken = () => sessionStorage.getItem('admin_token') || '';
  const getNs = () => $('ns-input').value.trim();

  async function api(path, body) {
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

  function saveToken() {
    const t = $('token-input').value.trim();
    if (!t) return showMsg('auth-msg', '请输入 Token', false);
    sessionStorage.setItem('admin_token', t);
    showMsg('auth-msg', 'Token 已保存到 sessionStorage', true);
  }

  function switchTab(name) {
    const names = ['stories', 'add', 'upload'];
    document.querySelectorAll('.tab').forEach((t, i) => {
      t.classList.toggle('active', names[i] === name);
    });
    document.querySelectorAll('.section').forEach((s) => s.classList.remove('active'));
    $('tab-' + name).classList.add('active');
  }

  async function loadStories() {
    const ns = getNs();
    if (!ns) return showMsg('ns-msg', '请输入命名空间', false);
    const res = await api('/api/stories', { namespace: ns });
    if (!res.ok) return showMsg('ns-msg', res.error || '加载失败', false);
    showMsg('ns-msg', '加载成功，共 ' + res.stories.length + ' 部小说', true);
    renderStories(res.stories, ns);
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
        '/stos/1" target="_blank" class="tag-link">书单</a>' +
        ' <a href="/r/' +
        encodeURIComponent(ns) +
        '/cat/' +
        encodeURIComponent(s.storyId) +
        '" target="_blank" class="tag-link">目录</a>' +
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
    const res = await api('/api/story/create', { namespace: ns, storyId: id, storyName: name });
    showMsg('add-msg', res.ok ? '添加成功' : res.error || '添加失败', res.ok);
    if (res.ok) loadStories();
  }

  async function deleteStory(storyId) {
    const ns = getNs();
    if (!confirm('确认从书目中删除该小说？（R2 内容不会删除）')) return;
    const res = await api('/api/story/delete', { namespace: ns, storyId });
    if (res.ok) loadStories();
    else alert(res.error || '删除失败');
  }

  function loadFile() {
    const f = $('upload-file').files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (e) => {
      $('upload-json').value = e.target.result;
    };
    r.readAsText(f);
  }

  async function uploadChapters() {
    const id = $('upload-id').value.trim();
    const json = $('upload-json').value.trim();
    if (!id) return showMsg('upload-msg', '请填写小说 ID', false);
    if (!json) return showMsg('upload-msg', '请填写或上传章节 JSON', false);
    let chapters;
    try {
      const parsed = JSON.parse(json);
      chapters = Array.isArray(parsed) ? parsed : parsed.items || [];
    } catch (e) {
      return showMsg('upload-msg', 'JSON 格式错误: ' + e.message, false);
    }
    if (!chapters.length) return showMsg('upload-msg', '章节列表为空', false);
    showMsg('upload-msg', '上传中，共 ' + chapters.length + ' 章...', true);
    const res = await api('/api/story/upload', { storyId: id, chapters });
    showMsg(
      'upload-msg',
      res.ok ? '上传成功，共 ' + chapters.length + ' 章' : res.error || '上传失败',
      res.ok,
    );
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

    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-action]');
      if (!el) return;
      const a = el.dataset.action;
      if (a === 'save-token') saveToken();
      else if (a === 'load-stories') loadStories();
      else if (a === 'add-story') addStory();
      else if (a === 'upload-chapters') uploadChapters();
      else if (a === 'delete-story') deleteStory(el.dataset.id);
    });

    const fileInput = $('upload-file');
    if (fileInput) fileInput.addEventListener('change', loadFile);
  });
})();
