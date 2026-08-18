import '../shared/chrome-shim.js';

import { DEFAULT_SETTINGS } from '../shared/constants.js';
import { ShortcutCollection, isNavigableUrl } from '../shared/shortcut-model.js';
import { loadAll, saveSettings, saveShortcutState } from '../shared/storage.js';

const $ = (selector) => document.querySelector(selector);

init().catch((error) => showUnsupported(error.message || '无法读取当前页面'));

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const loaded = await loadAll();
  applyTheme(loaded.settings);
  if (!tab?.url || !isNavigableUrl(tab.url)) {
    showUnsupported();
    return;
  }

  const collection = new ShortcutCollection(loaded.shortcuts, loaded.groups);
  const duplicate = collection.findDuplicate(tab.url);
  if (duplicate) {
    const group = collection.groups.find((entry) => entry.id === duplicate.groupId);
    $('#popup-loading').hidden = true;
    $('#popup-duplicate').hidden = false;
    $('#popup-duplicate-copy').textContent = `“${duplicate.title}”已在“${group?.title || '常用'}”分组中。`;
    $('#popup-open-newtab').onclick = () => chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
    return;
  }

  const title = String(tab.title || '').trim().slice(0, 40) || safeHost(tab.url);
  $('#popup-loading').hidden = true;
  $('#popup-form').hidden = false;
  $('#popup-page-title').textContent = title;
  $('#popup-page-host').textContent = safeHost(tab.url);
  $('#popup-letter').textContent = title.slice(0, 1).toUpperCase();
  $('#popup-title').value = title;

  const groupSelect = $('#popup-group');
  for (const group of collection.groups) {
    const option = document.createElement('option');
    option.value = group.id;
    option.textContent = group.title;
    groupSelect.append(option);
  }
  groupSelect.value = collection.hasGroup(loaded.settings.quickSaveGroupId)
    ? loaded.settings.quickSaveGroupId
    : collection.groups[0].id;

  $('#popup-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const saveButton = $('#popup-save');
    saveButton.disabled = true;
    saveButton.textContent = '正在保存…';
    const latest = await loadAll();
    const latestCollection = new ShortcutCollection(latest.shortcuts, latest.groups);
    const result = latestCollection.add({
      title: $('#popup-title').value.trim() || title,
      url: tab.url,
    }, groupSelect.value);
    if (!result.ok) {
      showMessage(result.reason === 'duplicate' ? `已保存为“${result.duplicate.title}”` : '这个页面无法保存');
      saveButton.disabled = false;
      saveButton.textContent = '保存当前页面';
      return;
    }
    await saveShortcutState(latestCollection.snapshot());
    await saveSettings({
      ...latest.settings,
      quickSaveGroupId: latestCollection.hasGroup(groupSelect.value)
        ? groupSelect.value
        : DEFAULT_SETTINGS.quickSaveGroupId,
    });
    saveButton.textContent = '已保存';
    document.body.classList.add('saved');
    setTimeout(() => window.close(), 650);
  });
}

function showUnsupported(message = '') {
  $('#popup-loading').hidden = true;
  $('#popup-unsupported').hidden = false;
  if (message) $('#popup-unsupported p').textContent = message;
}

function showMessage(text) {
  const element = $('#popup-message');
  element.textContent = text;
  element.hidden = false;
}

function applyTheme(settings) {
  const resolved = settings.theme === 'auto'
    ? matchMedia('(prefers-color-scheme: dark)').matches ? 'graphite' : 'cloud'
    : settings.theme;
  document.documentElement.dataset.theme = resolved;
  if (settings.accent) document.documentElement.style.setProperty('--accent', settings.accent);
}

function safeHost(url) {
  try { return new URL(url).hostname; } catch { return url; }
}
