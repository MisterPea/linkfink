export function setBlockedDomains(domains: string[]): void {
  chrome.storage.sync.set({blockedDomains: normalizeBlockedDomains(domains)});
}

export function normalizeBlockedDomains(domains: string[]): string[] {
  const next: string[] = [];
  for (let domain of domains) {
    domain = domain.trim();
    if (!domain) {
      continue;
    }
    next.push(domain);
  }
  return next;
}

export function blockedDomainsSet(domains: string[]): Set<string> {
  const set = new Set<string>();
  for (let domain of domains) {
    domain = domain.trim().toLowerCase();
    if (!domain || domain[0] === '#') {
      continue;
    }
    set.add(domain);
  }
  return set;
}
