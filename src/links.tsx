import React from 'react';
import {createRoot} from 'react-dom/client';
import LinkList from './components/LinkList';
import type {SessionData, Settings} from './types';

const target = document.getElementById('LinkList')!;
const root = createRoot(target);

function blockedDomainsSet(blockedDomains: string[]): Set<string> {
  const set = new Set<string>();
  for (let domain of blockedDomains) {
    domain = domain.trim().toLowerCase();
    if (!domain || domain[0] == '#') {
      continue;
    }
    set.add(domain);
  }
  return set;
}

(async function() {
  const queryParams = new URLSearchParams(window.location.search);
  const tabIdParam = queryParams.get('tab_id') ?? '';
  const session = await chrome.storage.session.get('tabData') as SessionData;
  const data = session?.tabData?.[tabIdParam];
  if (!data) {
    root.render(<LinkList expired={true} />);
    return;
  }
  const {blockedDomains} = await chrome.storage.sync.get(['blockedDomains']) as Settings;
  document.title = 'Extracted Links for ' + data.source;
  root.render(
    <LinkList
      expired={false}
      blockedDomains={blockedDomainsSet(blockedDomains)}
      links={data.links}
      source={data.source} />
  );
})();
