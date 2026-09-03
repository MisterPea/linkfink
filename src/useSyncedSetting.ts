import { useEffect, useState } from 'react';
import type { Settings } from './types';

export function useSyncedSetting<K extends keyof Settings>(
  key: K,
  defaultValue: Settings[K]
): [Settings[K], ( value: Settings[K] ) => void] {
  const [value, setValue] = useState( defaultValue );

  useEffect( () => {
    chrome.storage.sync.get( { [key]: defaultValue } as Partial<Settings> ).then( ( settings ) => {
      setValue( ( settings as Settings )[key] );
    } );
    const listener = ( changes: { [name: string]: chrome.storage.StorageChange } ) => {
      const change = changes[key as string];
      if ( change ) {
        setValue( change.newValue as Settings[K] );
      }
    };
    chrome.storage.onChanged.addListener( listener );
    return () => chrome.storage.onChanged.removeListener( listener );
  }, [key] );

  const set = ( next: Settings[K] ) => {
    chrome.storage.sync.set( { [key]: next } as Partial<Settings> );
  };

  return [value, set];
}
