export interface Link {
  hash: string;
  host: string;
  hostname: string;
  href: string;
  origin: string;
  pathname: string;
  search: string;
  text: string;
}

export interface TabData {
  source: string;
  links: Link[];
}

export interface SessionData {
  tabData: Record<string, TabData>;
  [key: string]: unknown;
}

export interface Settings {
  blockedDomains: string[];
  [key: string]: unknown;
}

export interface LinksFoundMessage {
  type: 'links-found';
  links: Link[];
}
