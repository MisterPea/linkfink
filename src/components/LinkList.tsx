import React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import cx from 'classnames';
import debounce from 'lodash.debounce';
import LinkListExpired from './LinkListExpired';
import Footer from './Footer';
import Options from './Options';
import './LinkList.scss';
import { getDomain, getHostname } from 'tldts';
import { blockedDomainsSet } from '../blockedDomains';
import { useSyncedSetting } from '../useSyncedSetting';
import type { Link } from '../types';

type LinkListProps =
  | { expired: true; }
  | {
    expired: false;
    source: string;
    links: Link[];
    blockedDomains: string[];
    setBlockedDomains: ( domains: string[] ) => void;
  };

function copyLinks( element: HTMLElement ) {
  const selection = window.getSelection();
  if ( !selection ) {
    return;
  }
  const prevRange = selection.rangeCount ? selection.getRangeAt( 0 ).cloneRange() : null;
  const tmp = document.createElement( 'div' );
  const links = element.querySelectorAll( 'a' );
  for ( let i = 0; i < links.length; i++ ) {
    const clone = links[i].cloneNode( true ) as HTMLAnchorElement;
    tmp.appendChild( clone );
    tmp.appendChild( document.createElement( 'br' ) );
  }
  document.body.appendChild( tmp );
  const copyFrom = document.createRange();
  copyFrom.selectNodeContents( tmp );
  selection.removeAllRanges();
  selection.addRange( copyFrom );
  document.execCommand( 'copy' );
  document.body.removeChild( tmp );
  selection.removeAllRanges();
  if ( prevRange ) {
    selection.addRange( prevRange );
  }
}

function groupLinksByDomain( links: Link[] ): Link[] {
  const indexes = new Array( links.length );
  const rh = new Array( links.length );
  for ( let i = 0; i < links.length; i++ ) {
    indexes[i] = i;
    rh[i] = links[i].hostname.toLowerCase().split( '.' ).reverse().join( '.' );
  }
  indexes.sort( ( i, j ) => {
    if ( rh[i] < rh[j] ) {
      return -1;
    }
    if ( rh[i] > rh[j] ) {
      return 1;
    }
    return i - j;
  } );
  return indexes.map( i => links[i] );
}

function openAllInNewTabs( hrefs: string[], openLinksInTabs: boolean ) {
  for ( const url of hrefs ) {
    if ( openLinksInTabs ) {
      window.open( url, '_blank', 'noopener, noreferrer' );
    } else {
      chrome.windows.create( { url, focused: true } );
    }
  }
}

function mapBlocked( links: Link[], blockedDomains: Set<string> ): boolean[] {
  blockedDomains = new Set( blockedDomains );
  return links.map( link => {
    const hostname = link.hostname.toLowerCase();
    const dots = [];
    for ( let i = 0; i < hostname.length; i++ ) {
      if ( hostname[i] === '.' ) {
        dots.push( i );
      }
    }
    if ( blockedDomains.has( hostname ) ) {
      return true;
    }
    for ( const dot of dots ) {
      if ( blockedDomains.has( hostname.slice( dot + 1 ) ) ) {
        blockedDomains.add( hostname );
        return true;
      }
    }
    return false;
  } );
}

function mapDuplicates( links: Link[] ): boolean[] {
  const uniq = new Set();
  return links.map( link => {
    if ( uniq.has( link.href ) ) {
      return true;
    }
    uniq.add( link.href );
    return false;
  } );
}

function rejectSameOrigin( links: Link[], sourceUrl: string, hideSameOriginSubdomain: boolean ): Link[] {
  if ( !sourceUrl ) {
    return links;
  }
  if ( !sourceUrl.startsWith( 'http://' ) && !sourceUrl.startsWith( 'https://' ) ) {
    return links;
  }

  const sourceRoot = getHostname( sourceUrl );

  if ( !sourceRoot ) {
    return links;
  }

  const formatLink = ( link: string ) => hideSameOriginSubdomain ? getDomain( link ) : getHostname( link );
  const formatSource = ( source: string ) => hideSameOriginSubdomain ? getDomain( source ) : source;
  return links.filter( link => formatLink( link.origin ) !== formatSource( sourceRoot ) );
}

export default function LinkList( props: LinkListProps ) {
  const linkListRef = useRef<HTMLUListElement>( null );

  const [filter, setFilter] = useState( '' );
  const [nextFilter, setNextFilter] = useState( '' );
  const [groupByDomain, setGroupByDomain] = useState( false );
  const [hideBlockedDomains, setHideBlockedDomains] = useState( true );
  const [hideDuplicates, setHideDuplicates] = useState( true );
  const [hideSameOrigin, setHideSameOrigin] = useState( true );
  const [hideSameOriginSubdomain, setHideSameOriginSubdomain] = useState( true );
  const [hideTextFragments, setHideTextFragments] = useState( true );
  const [settingsOpen, setSettingsOpen] = useState( false );
  const [openLinksInTabs, setOpenLinksInTabs] = useSyncedSetting( 'openLinksInTabs', true );
  const [colorMode, setColorMode] = useSyncedSetting( 'colorMode', 'auto' );

  const applyFilter = debounce( () => setFilter( nextFilter ), 100, { trailing: true } );
  const filterChanged = ( event: React.ChangeEvent<HTMLInputElement> ) => setNextFilter( event.target.value );
  const toggleBlockedLinks = () => setHideBlockedDomains( ( s ) => !s );
  const toggleDedup = () => setHideDuplicates( ( s ) => !s );
  const toggleGroupByDomain = () => setGroupByDomain( ( s ) => !s );
  const toggleHideTextFragments = () => setHideTextFragments( ( s ) => !s );

  // If we toggle off hideSameOrigin we're also toggling off hideSubDomain
  const toggleHideSameOrigin = () => {
    if ( hideSameOriginSubdomain && hideSameOrigin ) {
      setHideSameOriginSubdomain( false );
    }
    setHideSameOrigin( ( s ) => !s );
  };

  // If hide we want to hide sub-domain we're also wanting to hide same domain
  const toggleHideSameOriginSubdomain = () => {
    if ( !hideSameOrigin && !hideSameOriginSubdomain ) {
      setHideSameOrigin( true );
    }
    setHideSameOriginSubdomain( ( s ) => !s );
  };

  useEffect( () => {
    const h = () => {
      const selection = window.getSelection();
      if ( selection && ( selection.type === 'None' || selection.type === 'Caret' ) && linkListRef.current ) {
        copyLinks( linkListRef.current );
      }
    };
    window.document.addEventListener( 'copy', h );
    return () => {
      window.document.removeEventListener( 'copy', h );
    };
  }, [] );

  useEffect( applyFilter, [nextFilter] );

  useEffect( () => {
    if ( colorMode === 'auto' ) {
      delete document.documentElement.dataset.theme;
    } else {
      document.documentElement.dataset.theme = colorMode;
    }
  }, [colorMode] );

  useEffect( () => {
    const h = () => setSettingsOpen( true );
    window.addEventListener( 'linkfink:open-settings', h );
    return () => {
      window.removeEventListener( 'linkfink:open-settings', h );
    };
  }, [] );

  useEffect( () => {
    if ( !settingsOpen ) {
      return;
    }
    const h = ( event: KeyboardEvent ) => {
      if ( event.key === 'Escape' ) {
        setSettingsOpen( false );
      }
    };
    window.addEventListener( 'keydown', h );
    return () => {
      window.removeEventListener( 'keydown', h );
    };
  }, [settingsOpen] );

  const blockedDomainsRaw = props.expired ? null : props.blockedDomains;
  const blockedDomainsForMatch = useMemo(
    () => blockedDomainsSet( blockedDomainsRaw ?? [] ),
    [blockedDomainsRaw]
  );

  if ( props.expired ) {
    return (
      <div className="container-fluid">
        <LinkListExpired />
        <Footer />
      </div>
    );
  }

  let links = props.links.slice( 0 );

  // Because of scope we have to pass hideSameOriginSubdomain into function
  if ( hideSameOrigin ) {
    links = rejectSameOrigin( links, props.source, hideSameOriginSubdomain );
  }
  if ( groupByDomain ) {
    links = groupLinksByDomain( links );
  }

  // We pass search substring here.
  // Break by comma; each piece is AND'd together.
  // A `>` prefix on a piece negates it (must NOT match).
  // Returns true when currentHref should be excluded.
  function testAllInputs( str: string, currentHref: string ): boolean {
    const tests = str.split( ',' ).map( t => t.trim() ).filter( t => t.length > 0 );
    for ( const test of tests ) {
      const isNegated = test[0] === '>';
      const needle = isNegated ? test.slice( 1 ).trim() : test;
      if ( !needle ) {
        continue;
      }
      const contains = currentHref.indexOf( needle ) >= 0;
      if ( isNegated && contains ) {
        return true; // banned term present
      }
      if ( !isNegated && !contains ) {
        return true; // required term missing
      }
    }
    return false;
  }

  const blocked = mapBlocked( links, blockedDomainsForMatch );
  const duplicates = mapDuplicates( links );
  const filterLowerCase = filter.trim().toLowerCase();
  const visibleHrefs: string[] = [];
  const items = links.reduce<React.ReactNode[]>( ( memo, link, index ) => {
    const lowerHref = link.href.toLowerCase();
    if ( hideDuplicates && duplicates[index] ) {
      return memo;
    }
    if ( hideBlockedDomains && blocked[index] ) {
      return memo;
    }
    if ( filterLowerCase ) {
      if ( testAllInputs( filterLowerCase, lowerHref ) ) return memo;
    }
    if ( hideTextFragments ) {
      if ( lowerHref.indexOf( '#:~:text' ) >= 0 ) {
        return memo;
      }
    }
    const itemClassName = cx( 'LinkListItem', {
      'LinkListItem--blocked': blocked[index],
      'LinkListItem--duplicate': duplicates[index],
    } );
    visibleHrefs.push( link.href );
    memo.push(
      <li key={index} className={itemClassName}>
        <a href={link.href} target="_blank"><span>{link.href}</span></a>
      </li>
    );
    return memo;
  }, [] );

  return (
    <div className="container-fluid">
      <header className="LinkListHeader">
        <div className="LinkListHeader--title">
          <h1>Page Source:</h1>
          <h1 className="LinkPageHeader">{props.source}</h1>
        </div>

      </header>
      <div className="control-group">
        <div className="control-group--user-inputs--checkboxes">
          <label className="checkbox-element">
            <input type="checkbox" checked={hideDuplicates} onChange={toggleDedup} /> Hide duplicate links
          </label>
          <label className="checkbox-element">
            <input type="checkbox" checked={hideBlockedDomains} onChange={toggleBlockedLinks} /> Hide blocked links
          </label>
          <label className="checkbox-element">
            <input type="checkbox" checked={groupByDomain} onChange={toggleGroupByDomain} /> Group by domain
          </label>
          <label className="checkbox-element">
            <input type="checkbox" checked={hideSameOrigin} onChange={toggleHideSameOrigin} /> Hide same origin
          </label>
          <label className="checkbox-element">
            <input type="checkbox" checked={hideSameOriginSubdomain} onChange={toggleHideSameOriginSubdomain} /> Hide same origin subdomain
          </label>
          <label className="checkbox-element">
            <input type="checkbox" checked={hideTextFragments} onChange={toggleHideTextFragments} /> Hide Text Fragments
          </label>
        </div>
        <div className="control-group--user-inputs--right-inputs">
          <div className="control-group--user-inputs--right-inputs--filter">
            <input type="text" className="substring-filter" placeholder="substring filter" autoFocus value={nextFilter} onChange={filterChanged} />
          </div>
          <div className="control-group--user-inputs--right-inputs--copy_open">
            <button disabled={items.length === 0} onClick={() => linkListRef.current && copyLinks( linkListRef.current )}>
              {`Copy ${items.length} Links`}
            </button>
            <button disabled={items.length === 0} onClick={() => openAllInNewTabs( visibleHrefs, openLinksInTabs )}>
              {openLinksInTabs ? 'Open In New Tabs' : 'Open In New Windows'}
            </button>
            <button
              type="button"
              className="settings"
              aria-label="Open settings"
              title="Settings"
              onClick={() => setSettingsOpen( true )}
            >
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="m387.69-100-15.23-121.85q-16.07-5.38-32.96-15.07-16.88-9.7-30.19-20.77L196.46-210l-92.3-160 97.61-73.77q-1.38-8.92-1.96-17.92-.58-9-.58-17.93 0-8.53.58-17.34t1.96-19.27L104.16-590l92.3-159.23 112.46 47.31q14.47-11.46 30.89-20.96t32.27-15.27L387.69-860h184.62l15.23 122.23q18 6.54 32.57 15.27 14.58 8.73 29.43 20.58l114-47.31L855.84-590l-99.15 74.92q2.15 9.69 2.35 18.12.19 8.42.19 16.96 0 8.15-.39 16.58-.38 8.42-2.76 19.27L854.46-370l-92.31 160-112.61-48.08q-14.85 11.85-30.31 20.96-15.46 9.12-31.69 14.89L572.31-100H387.69Zm92.77-260q49.92 0 84.96-35.04 35.04-35.04 35.04-84.96 0-49.92-35.04-84.96Q530.38-600 480.46-600q-50.54 0-85.27 35.04T360.46-480q0 49.92 34.73 84.96Q429.92-360 480.46-360Z" /></svg>
            </button>
          </div>
        </div>
      </div>
      <ul ref={linkListRef} className="LinkList">
        {items.length === 0 && nextFilter && <li className="missing-list-element">Adjust Filter to View Links</li>}
        {items.length === 0 && !nextFilter && <li className="missing-list-element">There Are No Links to Show</li>}
        {items}
      </ul>
      <Footer />
      {settingsOpen && (
        <div className="SettingsModalOverlay" onClick={() => setSettingsOpen( false )}>
          <div className="SettingsModal" onClick={( event ) => event.stopPropagation()}>
            <button
              type="button"
              className="SettingsModalClose"
              aria-label="Close settings"
              onClick={() => setSettingsOpen( false )}
            >
              ×
            </button>
            <Options
              blockedDomains={props.blockedDomains}
              setBlockedDomains={props.setBlockedDomains}
              openLinksInTabs={openLinksInTabs}
              setOpenLinksInTabs={setOpenLinksInTabs}
              colorMode={colorMode}
              setColorMode={setColorMode}
            />
          </div>
        </div>
      )}
    </div>
  );
}
