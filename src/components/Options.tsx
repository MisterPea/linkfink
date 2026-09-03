import React, { useRef, useState } from 'react';
import type { Settings } from '../types';
import './Options.scss';

interface OptionsProps {
  blockedDomains: string[];
  setBlockedDomains: ( domains: string[] ) => void;
  openLinksInTabs: boolean;
  setOpenLinksInTabs: ( value: boolean ) => void;
  colorMode: Settings['colorMode'];
  setColorMode: ( value: Settings['colorMode'] ) => void;
}

export default function Options( props: OptionsProps ) {

  const { openLinksInTabs, setOpenLinksInTabs, colorMode, setColorMode } = props;

  return (
    <div className="options-modal">
      <h1>Settings</h1>

      <div className="row">
        <h2>Open Links</h2>
        <p>Open Links In New:</p>
        <div className="open-links-button-wrap">
          <button
            className={`tab-window-select ${openLinksInTabs ? 'selected' : 'not-selected'}`}
            onClick={() => setOpenLinksInTabs( true )}
          >Tabs</button>
          <button
            className={`tab-window-select ${!openLinksInTabs ? 'selected' : 'not-selected'}`}
            onClick={() => setOpenLinksInTabs( false )}
          >Windows</button>
        </div>
      </div>
      <div className="row">
        <h2>Color Mode</h2>
        <div className="open-links-button-wrap">
          <button
            className={`color-mode-select ${colorMode === 'light' ? 'selected' : 'not-selected'}`}
            onClick={() => setColorMode( 'light' )}
          >Light</button>
          <button
            className={`color-mode-select ${colorMode === 'dark' ? 'selected' : 'not-selected'}`}
            onClick={() => setColorMode( 'dark' )}
          >Dark</button>
          <button
            className={`color-mode-select ${colorMode === 'auto' ? 'selected' : 'not-selected'}`}
            onClick={() => setColorMode( 'auto' )}
          >Auto</button>
        </div>
      </div>
      <div className="row">
        <h2>Blocked Domains</h2>

        <BlockedDomainsEditor
          blockedDomains={props.blockedDomains}
          setBlockedDomains={props.setBlockedDomains}
        />
      </div>
    </div>
  );
}

interface BlockedDomainsEditorProps {
  blockedDomains: string[];
  setBlockedDomains: ( domains: string[] ) => void;
}

function BlockedDomainsEditor( props: BlockedDomainsEditorProps ) {
  const blockedDomainsText = props.blockedDomains.join( '\n' );
  const textAreaRef = useRef<HTMLTextAreaElement>( null );
  const [saved, setSaved] = useState( false );
  const [saveKey, setSaveKey] = useState( 0 );
  const [textAreaValue, setTextAreaValue] = useState( blockedDomainsText );

  const onSubmit = ( event: React.FormEvent<HTMLFormElement> ) => {
    event.preventDefault();
    props.setBlockedDomains( textAreaValue.split( '\n' ) );
    setSaved( true );
    setSaveKey( ( k ) => k + 1 );
  };

  const handleTextChange = () => {
    if ( textAreaRef.current ) {
      const value = textAreaRef.current.value;
      setTextAreaValue( value );
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <ul className="blocked-domains-ul">
        <li>Links from blocked domains will be hidden by default</li>
        <li>Enter one domain per line</li>
        <li>Lines starting with <strong>#</strong> will be ignored</li>
        <li><code>example.com</code> will also block <code>www.example.com</code></li>
      </ul>
      <div className="form-group">
        <textarea
          className="form-control"
          name="blockedDomains"
          rows={15}
          ref={textAreaRef}
          onChange={handleTextChange}
          value={textAreaValue}
          placeholder="policies.example.com
terms.another-example.com
          "
        />
      </div>
      <div className="d-flex align-items-center">
        <div className="flex-grow-1">
          {
            saved ? (
              <div
                key={saveKey}
                className="text-success"
                onAnimationEnd={() => setSaved( false )}
              >
                Blocklist Saved
              </div>
            ) : null
          }
        </div>
        <div className="flex-grow-0">
          <button
            type="submit"
            disabled={blockedDomainsText === textAreaValue}
          >
            Save
          </button>
        </div>
      </div>
    </form>
  );
}
