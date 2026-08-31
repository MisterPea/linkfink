import React from 'react';
import { useEffect, useRef, useState } from 'react';
import cx from 'classnames';
import debounce from 'lodash.debounce';
import LinkListEmpty from './LinkListEmpty';
import LinkListExpired from './LinkListExpired';
import './LinkList.scss';
import { getDomain, getHostname } from 'tldts';
import type { Link } from '../types';

type LinkListProps =
  | { expired: true; }
  | { expired: false; source: string; links: Link[]; blockedDomains: Set<string>; };

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
    delete ( clone.dataset.reactid );
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
      if ( blockedDomains.has( hostname.substr( dot + 1 ) ) ) {
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

  if ( props.expired ) {
    return ( <LinkListExpired /> );
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

  const blocked = mapBlocked( links, props.blockedDomains );
  const duplicates = mapDuplicates( links );
  const filterLowerCase = filter.trim().toLowerCase();
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
    memo.push(
      <li key={index} className={itemClassName}>
        <a href={link.href} target="_blank">{link.href}</a>
      </li>
    );
    return memo;
  }, [] );

  return (
    <div className="container-fluid">
      <header>
        <h1>Page Source:</h1>
        <h1 className="LinkPageHeader">{props.source}</h1>
      </header>
      <div className="clearfix">
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
              <button className="btn btn-default" disabled={items.length === 0} onClick={() => linkListRef.current && copyLinks( linkListRef.current )}>
                {`Copy ${items.length} Links`}
              </button>
              <button className="btn btn-default" disabled={items.length === 0} onClick={() => linkListRef.current && copyLinks( linkListRef.current )}>
                {`Open In New Tabs`}
              </button>
            </div>
          </div>
        </div>
      </div>
      <ul ref={linkListRef} className="LinkList">
        {items.length === 0 && nextFilter && <li className="missing-list-element">Adjust Filter to View Links</li>}
        {items.length === 0 && !nextFilter && <li className="missing-list-element">There Are No Links to Show</li>}
        {items}
      </ul>
    </div>
  );
}
