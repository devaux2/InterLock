import React from 'react';
import api from '../api.js';
import { Button, Icon } from '../components/ui.jsx';

const LINKS = [
  {
    title: 'Paradox State',
    url: 'https://www.paradoxstate.co.uk',
    desc: 'Our website: laser display design, custom projector builds and show operation.',
  },
  {
    title: 'PhotonLexicon',
    url: 'https://photonlexicon.com',
    desc: 'The laserist community forum. Projects, safety discussion and decades of collective knowledge.',
  },
  {
    title: 'PLASA',
    url: 'https://www.plasa.org',
    desc: 'Publishers of “Safety of Display Lasers”, the UK industry guidance this tool’s documents are built around.',
  },
  {
    title: 'ILDA',
    url: 'https://www.ilda.com',
    desc: 'The International Laser Display Association. Standards and resources for laserists worldwide.',
  },
  {
    title: 'HSE',
    url: 'https://www.hse.gov.uk',
    desc: 'The UK Health & Safety Executive, the regulator behind AOR 2010 and UK event safety law.',
  },
];

export default function About() {
  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <h1>About</h1>
          <div className="screen-sub">Who made this, and why it's free</div>
        </div>
      </div>

      <div className="stack-lg">
        <section className="card">
          <div className="card-title">Paradox State International Ltd</div>
          <div className="about-text">
            <p>
              Paradox State is a UK laser display company. We design, build and operate custom
              RGB laser projector systems for festivals, clubs and live events, from intimate
              rooms to festival main stages. Safety is engineered into every rig: physical
              masking, scan-fail protection, hard emergency stops and a named Laser Safety
              Officer on every show.
            </p>
          </div>
        </section>

        <section className="card">
          <div className="card-title">Free, for the industry</div>
          <div className="about-text">
            <p>
              Interlock was built by Paradox State and released free of charge as a
              contribution to the laser display industry. Good safety paperwork protects
              audiences, crews and the reputation of laser shows everywhere, and it should
              never be so laborious that it gets copied forward year after year with stale
              dates and withdrawn guidance. Every laserist deserves documentation as
              considered as their show.
            </p>
            <p>
              The documents this tool generates are structured around current UK practice:
              PLASA's <i>Safety of Display Lasers</i>, PD IEC TR 60825-3:2022, the Control of
              Artificial Optical Radiation at Work Regulations 2010 and CAA CAP 736 for
              outdoor displays.
            </p>
            <p className="about-note">
              A generated document is a starting point, not a sign-off: every RAMS must be
              reviewed and approved by a competent person for the specific event, venue,
              equipment and crew.
            </p>
          </div>
        </section>

        <section className="card">
          <div className="card-title">Links</div>
          <div className="stack" style={{ gap: 10 }}>
            {LINKS.map((l) => (
              <div key={l.url} className="link-row">
                <div className="link-main">
                  <div className="link-title">{l.title}</div>
                  <div className="link-desc">{l.desc}</div>
                </div>
                <Button
                  variant="secondary"
                  className="btn-sm"
                  onClick={() => api.openExternal(l.url).catch(() => {})}
                >
                  <Icon name="external" size={14} />
                  Visit
                </Button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
