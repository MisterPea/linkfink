import React, {useState} from 'react';
import './Options.scss';

interface OptionsProps {
  blockedDomains: string[];
  setBlockedDomains: (domains: string[]) => void;
}

export default function Options(props: OptionsProps) {
  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-sm-6">
          <h2>Blocked Domains</h2>

          <BlockedDomainsEditor
            blockedDomains={props.blockedDomains}
            setBlockedDomains={props.setBlockedDomains}
            />

        </div>
      </div>
    </div>
  );
}

function BlockedDomainsEditor(props: OptionsProps) {
  const [saved, setSaved] = useState(false);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaved(false);
    const formData = new FormData(event.currentTarget);
    const blockedDomains = String(formData.get('blockedDomains') ?? '');
    props.setBlockedDomains(blockedDomains.split('\n'));
    setSaved(true);
  };

  const blockedDomainsText = props.blockedDomains.join('\n');

  return (
    <form onSubmit={onSubmit}>
      <p>
        Links from blocked domains will be hidden by default
        <br /> Enter one domain per line
        <br /> Lines starting with <strong>#</strong> will be ignored
        <br /> <code>example.com</code> will also block <code>www.example.com</code>
      </p>
      <div className="form-group">
        <textarea
          className="form-control"
          name="blockedDomains"
          rows={15}
          defaultValue={blockedDomainsText}
          />
      </div>
      <div className="d-flex align-items-center">
        <div className="flex-grow-1">
          {
            saved ? (
              <div className="text-success">
                Saved
              </div>
            ): null
          }
        </div>
        <div className="flex-grow-0">
          <button type="submit" className="btn btn-primary">
            Save
          </button>
        </div>
      </div>
    </form>
  );
}
