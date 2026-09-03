import type {Settings, SessionData, LinksFoundMessage} from './types';

const DEFAULT_SETTINGS: Settings = {
  blockedDomains: [],
  openLinksInTabs: true,
  colorMode: 'auto',
};

const DEFAULT_SESSION: SessionData = {
  tabData: {},
};

function warnLastError() {
  if (chrome.runtime.lastError) {
    console.warn(chrome.runtime.lastError); // eslint-disable-line
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(DEFAULT_SETTINGS, options => {
    chrome.storage.sync.set(options);
  });
  chrome.contextMenus.create({
    id: 'Linkfink',
    title: 'Linkfink',
    contexts: ['page'],
    documentUrlPatterns: ['http://*/*', 'https://*/*', 'file://*/*'],
  }, warnLastError);
});

const linksPageUrl = chrome.runtime.getURL('html/links.html');

chrome.action.onClicked.addListener((tab) => {
  if (tab.id == null) {
    return;
  }
  if (tab.url && tab.url.startsWith(linksPageUrl)) {
    chrome.tabs.sendMessage(tab.id, {type: 'open-settings'});
    return;
  }
  chrome.scripting.executeScript({
    target: {tabId: tab.id},
    files: ['js/contentscript.js'],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab || tab.id == null) {
    return;
  }
  chrome.scripting.executeScript({
    target: {tabId: tab.id},
    files: ['js/contentscript.js'],
  });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.session.get(DEFAULT_SESSION).then((session) => {
    const s = session as SessionData;
    delete s.tabData[tabId];
    chrome.storage.session.set(s);
  });
});

chrome.runtime.onMessage.addListener((message, sender) => {
  const msg = message as LinksFoundMessage;
  if (msg.type !== 'links-found') {
    return;
  }
  const tab = sender.tab;
  if (!tab || tab.id == null) {
    return;
  }
  chrome.storage.session.get(DEFAULT_SESSION).then((session) => {
    const s = session as SessionData;
    s.tabData[tab.id!] = {
      source: tab.url ?? '',
      links: msg.links,
    };
    return chrome.storage.session.set(s);
  }).then(() => {
    chrome.tabs.create({
      index: (tab.index ?? 0) + 1,
      openerTabId: tab.id,
      url: chrome.runtime.getURL('html/links.html') + '?tab_id=' + String(tab.id),
    });
  });
});
