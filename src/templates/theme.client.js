(function () {
  const THEME_DATA = window.__CFNOV_READER_THEMES__ || {};

  function hasTheme(name) {
    return Object.prototype.hasOwnProperty.call(THEME_DATA, name);
  }

  function readProgress(storyId) {
    if (!storyId) return null;
    try {
      const value = JSON.parse(localStorage.getItem(`cfnovreader-progress:${storyId}`) || 'null');
      const pageNo = Number(value && value.pageNo);
      return Number.isInteger(pageNo) && pageNo > 0 ? pageNo : null;
    } catch (_) {
      return null;
    }
  }

  function setupResumeLinks() {
    const catalogResume = document.getElementById('resume-link');
    const catalogResumeAnchor = document.getElementById('resume-link-anchor');
    const catalogStoryId = document.body.dataset.storyId;
    const catalogPage = readProgress(catalogStoryId);
    if (catalogResume && catalogResumeAnchor && catalogPage) {
      const url = new URL(catalogResumeAnchor.href, window.location.href);
      url.searchParams.set('p', String(catalogPage));
      url.searchParams.set('resume', '1');
      catalogResumeAnchor.href = url.toString();
      catalogResumeAnchor.textContent = `继续阅读（第 ${catalogPage} 章）`;
      catalogResume.hidden = false;
    }

    document.querySelectorAll('a[data-story-id]').forEach(function (link) {
      if (
        !(link instanceof HTMLAnchorElement) ||
        link.nextElementSibling?.classList.contains('resume-link')
      ) {
        return;
      }
      const pageNo = readProgress(link.dataset.storyId);
      if (!pageNo) return;
      const url = new URL(link.href, window.location.href);
      url.pathname = url.pathname.replace('/cat/', '/cont/');
      url.searchParams.set('p', String(pageNo));
      url.searchParams.set('resume', '1');
      const resume = document.createElement('a');
      resume.className = 'resume-link';
      resume.href = url.toString();
      resume.textContent = `继续（第 ${pageNo} 章）`;
      resume.setAttribute('aria-label', `继续阅读第 ${pageNo} 章`);
      link.insertAdjacentElement('afterend', resume);
    });
  }

  function initThemeControls() {
    const themePopup = document.getElementById('theme-popup');
    const themeToggle = document.getElementById('theme-toggle');
    const navigationPopup = document.getElementById('bottom-popup');
    const navigationToggle = document.getElementById('reader-nav-toggle');
    const root = document.documentElement;

    if (!themePopup || !themeToggle) return;

    let themeVisible = false;
    let navigationVisible = false;
    let followsSystem = false;

    function setThemeVisible(visible, restoreFocus = false) {
      themeVisible = visible;
      themePopup.hidden = !visible;
      themeToggle.setAttribute('aria-expanded', String(visible));
      if (visible) {
        const selected = themePopup.querySelector('[aria-current="true"]');
        if (selected instanceof HTMLElement) selected.focus();
      } else if (restoreFocus) {
        themeToggle.focus();
      }
    }

    function setNavigationVisible(visible, restoreFocus = false) {
      if (!navigationPopup || !navigationToggle) return;
      navigationVisible = visible;
      navigationPopup.hidden = !visible;
      navigationToggle.setAttribute('aria-expanded', String(visible));
      if (restoreFocus) navigationToggle.focus();
    }

    window.addEventListener('cfnovreader:panels-collapsed', function () {
      themeVisible = false;
      navigationVisible = false;
    });

    function updateThemeLinks(theme) {
      document.querySelectorAll('a[href]').forEach(function (link) {
        if (!(link instanceof HTMLAnchorElement) || link.classList.contains('theme-option')) return;
        const url = new URL(link.href, window.location.href);
        if (url.origin !== window.location.origin || !url.pathname.startsWith('/r/')) return;
        if (!url.searchParams.has('theme')) return;
        url.searchParams.set('theme', theme);
        link.href = url.toString();
      });
    }

    function applyTheme(theme, persist, updateUrl) {
      if (!hasTheme(theme)) return false;
      const palette = THEME_DATA[theme];
      const variables = {
        '--theme-bg': palette.bg,
        '--theme-text': palette.text,
        '--theme-link': palette.link,
        '--theme-surface': palette.surface,
        '--theme-border': palette.border,
        '--theme-muted': palette.muted,
        '--theme-focus': palette.focus,
        '--theme-popup-bg': palette.popupBg,
        '--theme-color-scheme': theme === 'dark' ? 'dark' : 'light',
      };
      Object.entries(variables).forEach(([name, value]) => root.style.setProperty(name, value));
      root.dataset.theme = theme;

      if (persist) {
        followsSystem = false;
        try {
          localStorage.setItem('cfnovreader-theme', theme);
        } catch (_) {}
      }
      if (updateUrl) {
        const url = new URL(window.location.href);
        url.searchParams.set('theme', theme);
        window.history.replaceState(null, '', url.toString());
      }

      document.querySelectorAll('.theme-option').forEach(function (option) {
        const selected = option.getAttribute('data-theme') === theme;
        option.setAttribute('aria-current', selected ? 'true' : 'false');
        option.setAttribute('data-check', selected ? '✓' : '');
      });
      updateThemeLinks(theme);
      return true;
    }

    themeToggle.addEventListener('click', function () {
      setNavigationVisible(false);
      setThemeVisible(!themeVisible);
    });

    if (navigationToggle && navigationPopup) {
      navigationToggle.addEventListener('click', function () {
        setThemeVisible(false);
        setNavigationVisible(!navigationVisible);
      });
    }

    document.addEventListener('click', function (event) {
      const target = event.target;
      if (!(target instanceof Node)) return;

      if (themeVisible && target !== themeToggle && !themePopup.contains(target)) {
        setThemeVisible(false);
      }
      if (
        navigationVisible &&
        navigationPopup &&
        navigationToggle &&
        target !== navigationToggle &&
        !navigationPopup.contains(target)
      ) {
        setNavigationVisible(false);
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      if (themeVisible) setThemeVisible(false, true);
      if (navigationVisible) setNavigationVisible(false, true);
    });

    const currentTheme = root.dataset.theme || 'default';
    const currentUrl = new URL(window.location.href);
    let savedTheme = '';
    try {
      const storedTheme = localStorage.getItem('cfnovreader-theme') || '';
      savedTheme = hasTheme(storedTheme) ? storedTheme : '';
      if (currentUrl.searchParams.has('theme'))
        localStorage.setItem('cfnovreader-theme', currentTheme);
    } catch (_) {}

    document.querySelectorAll('.theme-option').forEach(function (option) {
      const theme = option.getAttribute('data-theme');
      if (!theme) return;

      const optionUrl = new URL(window.location.href);
      optionUrl.searchParams.set('theme', theme);
      option.setAttribute('href', optionUrl.toString());
      option.setAttribute('aria-current', theme === currentTheme ? 'true' : 'false');
      option.setAttribute('data-check', theme === currentTheme ? '✓' : '');
      option.addEventListener('click', function (event) {
        if (applyTheme(theme, true, true)) {
          event.preventDefault();
          setThemeVisible(false);
        }
      });
    });

    const media = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    const shouldFollowSystem = !currentUrl.searchParams.has('theme') && !savedTheme && media;
    if (shouldFollowSystem) {
      followsSystem = true;
      const applySystemTheme = function () {
        if (!followsSystem) return;
        applyTheme(media.matches ? 'dark' : 'default', false, false);
      };
      applySystemTheme();
      if (media.addEventListener) media.addEventListener('change', applySystemTheme);
      else if (media.addListener) media.addListener(applySystemTheme);
    }

    // 预加载脚本已经应用了已保存主题，但这里还要同步页面内导航链接。
    if (!currentUrl.searchParams.has('theme')) updateThemeLinks(currentTheme);

    setupResumeLinks();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThemeControls);
  } else {
    initThemeControls();
  }
})();
