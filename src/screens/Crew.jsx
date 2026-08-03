import React from 'react';
import CrewManager from '../components/CrewManager.jsx';

export default function Crew({ library, updateLibrary }) {
  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <h1>Crew</h1>
          <div className="screen-sub">
            Operators, assistants and Laser Safety Officers. The wizard's Personnel step picks
            from this list, and their details print in the personnel table and briefing record
          </div>
        </div>
      </div>
      <section className="card">
        <CrewManager library={library} updateLibrary={updateLibrary} />
      </section>
    </div>
  );
}
