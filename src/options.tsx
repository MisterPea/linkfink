import React from 'react';
import {createRoot} from 'react-dom/client';
import Options from './components/Options';
import type {Settings} from './types';

function setBlockedDomains(domains: string[]) {
  const next: string[] = [];
  for (let domain of domains) {
    domain = domain.trim();
    if (!domain) {
      continue;
    }
    next.push(domain);
  }
  chrome.storage.sync.set({blockedDomains: next});
}

const root = createRoot(document.getElementById('Options')!);

function render(storage: Settings) {
  root.render(
    <Options
      blockedDomains={storage.blockedDomains}
      setBlockedDomains={setBlockedDomains} />
  );
}

let stored: Settings = {blockedDomains: []};

chrome.storage.onChanged.addListener((changes) => {
  for (const key in changes) {
    stored[key] = changes[key].newValue;
  }
  render(stored);
});

chrome.storage.sync.get(null, items => {
  stored = items as Settings;
  if (stored.blockedDomains == null) {
    stored.blockedDomains = [];
  }
  render(stored);
});
