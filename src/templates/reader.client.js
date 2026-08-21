(function () {
  const SETTINGS_KEY = 'cfnovreader-reading-settings';
  const DEFAULT_SETTINGS = { fontSize: 22, lineHeight: 2, contentWidth: 760 };

  function initReaderControls() {
    const root = document.documentElement;
    const settingsPanel = document.getElementById('reader-settings');
    const settingsToggle = document.getElementById('reader-settings-toggle');
    const content = document.querySelector('.reader-content');
    const storyId = document.body.dataset.storyId;
    const pageNo = Number(document.body.dataset.pageNo);

    if (!settingsPanel || !settingsToggle) return;

    const toolsToggle = document.getElementById('tools-toggle');
    const toolsItems = document.getElementById('page-tools-items');
    const themeToggle = document.getElementById('theme-toggle');
    const themePopup = document.getElementById('theme-popup');
    const navToggle = document.getElementById('reader-nav-toggle');
    const navPopup = document.getElementById('bottom-popup');

    const fields = {
      fontSize: document.getElementById('reader-font-size'),
      lineHeight: document.getElementById('reader-line-height'),
      contentWidth: document.getElementById('reader-content-width'),
    };
    const outputs = {
      fontSize: document.getElementById('reader-font-size-value'),
      lineHeight: document.getElementById('reader-line-height-value'),
      contentWidth: document.getElementById('reader-content-width-value'),
    };

    function normalizeSettings(value) {
      const settings = { ...DEFAULT_SETTINGS };
      if (!value || typeof value !== 'object') return settings;
      if (Number.isFinite(value.fontSize))
        settings.fontSize = Math.min(30, Math.max(16, value.fontSize));
      if (Number.isFinite(value.lineHeight))
        settings.lineHeight = Math.min(2.4, Math.max(1.4, value.lineHeight));
      if (Number.isFinite(value.contentWidth))
        settings.contentWidth = Math.min(960, Math.max(560, value.contentWidth));
      return settings;
    }

    function readSettings() {
      try {
        return normalizeSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null'));
      } catch (_) {
        return { ...DEFAULT_SETTINGS };
      }
    }

    function saveSettings(settings) {
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      } catch (_) {}
    }

    function updateSettingUI(settings) {
      fields.fontSize.value = String(settings.fontSize);
      fields.lineHeight.value = String(settings.lineHeight);
      fields.contentWidth.value = String(settings.contentWidth);
      outputs.fontSize.textContent = `${settings.fontSize}px`;
      outputs.lineHeight.textContent = settings.lineHeight.toFixed(1);
      outputs.contentWidth.textContent = `${settings.contentWidth}px`;
    }

    function applySettings(settings, persist = true) {
      const normalized = normalizeSettings(settings);
      root.style.setProperty('--reader-font-size', `${normalized.fontSize}px`);
      root.style.setProperty('--reader-line-height', String(normalized.lineHeight));
      root.style.setProperty('--reader-content-width', `${normalized.contentWidth}px`);
      updateSettingUI(normalized);
      if (persist) saveSettings(normalized);
    }

    function setSettingsVisible(visible, restoreFocus = false) {
      settingsPanel.hidden = !visible;
      settingsToggle.setAttribute('aria-expanded', String(visible));
      if (restoreFocus) settingsToggle.focus();
    }

    function collapseAllPanels() {
      if (themePopup) themePopup.hidden = true;
      if (themeToggle) themeToggle.setAttribute('aria-expanded', 'false');
      if (navPopup) navPopup.hidden = true;
      if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
      setSettingsVisible(false);
      window.dispatchEvent(new Event('cfnovreader:panels-collapsed'));
    }

    function setToolsExpanded(expanded) {
      if (!toolsToggle || !toolsItems) return;
      toolsItems.hidden = !expanded;
      toolsToggle.setAttribute('aria-expanded', String(expanded));
      if (!expanded) collapseAllPanels();
    }

    if (toolsToggle) {
      toolsToggle.addEventListener('click', function (event) {
        event.stopPropagation();
        setToolsExpanded(toolsItems.hidden);
      });
    }

    settingsToggle.addEventListener('click', function () {
      setSettingsVisible(settingsPanel.hidden);
    });

    Object.keys(fields).forEach(function (key) {
      fields[key].addEventListener('input', function () {
        applySettings({
          fontSize: Number(fields.fontSize.value),
          lineHeight: Number(fields.lineHeight.value),
          contentWidth: Number(fields.contentWidth.value),
        });
      });
    });

    document.getElementById('reader-settings-reset').addEventListener('click', function () {
      applySettings(DEFAULT_SETTINGS);
    });

    document.addEventListener('click', function (event) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      // 点击工具区以外时收起工具栏和所有面板
      if (
        toolsToggle &&
        !toolsItems.hidden &&
        target !== toolsToggle &&
        !toolsItems.contains(target)
      ) {
        setToolsExpanded(false);
        return;
      }
      if (
        !toolsItems &&
        !settingsPanel.hidden &&
        target !== settingsToggle &&
        !settingsPanel.contains(target)
      ) {
        setSettingsVisible(false);
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      if (!settingsPanel.hidden) setSettingsVisible(false);
      if (toolsToggle && !toolsItems.hidden) setToolsExpanded(false);
    });

    applySettings(readSettings(), false);
    setupKeyboardNavigation();
    setupSwipeNavigation(content);
    setupReadingProgress(storyId, pageNo);
  }

  function setupKeyboardNavigation() {
    document.addEventListener('keydown', function (event) {
      if (
        event.defaultPrevented ||
        (event.target instanceof Element &&
          event.target.closest('input, textarea, select, button, a'))
      ) {
        return;
      }
      let selector = '';
      if (event.key === 'ArrowRight') selector = '.reader-nav--next .reader-nav__chapter';
      if (event.key === 'ArrowLeft') selector = '.reader-nav--previous .reader-nav__chapter';
      if (!selector) return;
      const link = document.querySelector(selector);
      if (link instanceof HTMLAnchorElement) window.location.href = link.href;
    });
  }

  function setupSwipeNavigation(content) {
    if (!content) return;
    let start = null;
    content.addEventListener(
      'touchstart',
      function (event) {
        if (event.touches.length !== 1) {
          start = null;
          return;
        }
        const touch = event.touches[0];
        start = { x: touch.clientX, y: touch.clientY };
      },
      { passive: true },
    );
    content.addEventListener(
      'touchend',
      function (event) {
        if (!start || event.changedTouches.length !== 1) return;
        const touch = event.changedTouches[0];
        const dx = touch.clientX - start.x;
        const dy = touch.clientY - start.y;
        start = null;
        if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
        const selector =
          dx < 0
            ? '.reader-nav--next .reader-nav__chapter'
            : '.reader-nav--previous .reader-nav__chapter';
        const link = document.querySelector(selector);
        if (link instanceof HTMLAnchorElement) window.location.href = link.href;
      },
      { passive: true },
    );
  }

  function setupReadingProgress(storyId, pageNo) {
    if (!storyId || !Number.isInteger(pageNo) || pageNo < 1) return;
    const progressKey = `cfnovreader-progress:${storyId}`;
    const scrollKey = `${progressKey}:${pageNo}`;

    try {
      const savedScroll = Number(localStorage.getItem(scrollKey));
      if (Number.isFinite(savedScroll) && savedScroll > 0) {
        window.setTimeout(function () {
          window.scrollTo(0, savedScroll);
        }, 0);
      }
      localStorage.setItem(progressKey, JSON.stringify({ pageNo, updatedAt: Date.now() }));
    } catch (_) {}

    let saveTimer = 0;
    function saveScroll() {
      try {
        localStorage.setItem(scrollKey, String(Math.round(window.scrollY)));
      } catch (_) {}
    }

    window.addEventListener(
      'scroll',
      function () {
        window.clearTimeout(saveTimer);
        saveTimer = window.setTimeout(saveScroll, 150);
      },
      { passive: true },
    );
    window.addEventListener('pagehide', saveScroll);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReaderControls);
  } else {
    initReaderControls();
  }
})();
