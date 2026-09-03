import React from 'react';
import {createRoot} from 'react-dom/client';
import LinkList from './components/LinkList';
import {setBlockedDomains} from './blockedDomains';
import type {SessionData, Settings} from './types';

const target = document.getElementById('LinkList')!;
const root = createRoot(target);

chrome.runtime.onMessage.addListener((message) => {
  if ((message as {type?: string})?.type === 'open-settings') {
    window.dispatchEvent(new CustomEvent('linkfink:open-settings'));
  }
});

(async function() {
  const queryParams = new URLSearchParams(window.location.search);
  const tabIdParam = queryParams.get('tab_id') ?? '';
  const session = await chrome.storage.session.get('tabData') as SessionData;
  const data = session?.tabData?.[tabIdParam];
  if (!data) {
    root.render(<LinkList expired={true} />);
    return;
  }

  document.title = 'Extracted Links for ' + data.source;

  function render(blockedDomains: string[]) {
    root.render(
      <LinkList
        expired={false}
        blockedDomains={blockedDomains}
        setBlockedDomains={setBlockedDomains}
        links={data.links}
        source={data.source} />
    );
  }

  const {blockedDomains} = await chrome.storage.sync.get(['blockedDomains']) as Settings;
  render(blockedDomains ?? []);

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.blockedDomains) {
      render(changes.blockedDomains.newValue as string[]);
    }
  });
})();
