// Factory for a blank event record matching the seed event schema exactly.

const todayIso = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export function makeNewEvent(library, settings) {
  const now = new Date().toISOString();
  const lso = (library?.personnel || []).find((p) => (p.roles || []).includes('LSO'));

  return {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    createdFrom: null,
    createdFromName: null,
    jurisdiction: 'uk',
    docMeta: { reference: '', revision: '1', status: 'Draft' },
    details: {
      eventName: '',
      client: '',
      contacts: '',
      contactNumber: '',
      todaysDate: todayIso(),
      eventDateStart: '',
      eventDateEnd: '',
      venue: '',
      venueAddress: '',
      capacity: '',
      indoorOutdoor: 'indoor',
      eventType: '',
      loadInDate: '',
      loadInTime: '',
      rehearsal: '',
      inspection: '',
      alcoholServed: false,
      installationType: 'Temporary',
      showTimes: '',
      audienceScanning: false,
      audienceExposureDiffraction: false,
      outdoorTermination: 'n/a',
      gridRef: '',
      nearestAerodrome: '',
      localAuthority: '',
      hazeUse: '',
      adjacentEffects: '',
      eventHsContact: '',
      installOver30Days: false,
      childrenPresent: false,
    },
    personnel: {
      lsoId: lso ? lso.id : null,
      operatorIds: [],
      assistantIds: [],
      extraNotes: '',
    },
    equipment: [],
    show: {
      effectsText: '',
      unitsControlText: '',
      methodText: '',
      eStopVariant: 'hardline',
      includeEStopSpec: true,
      firstAidLocation: '',
      showStopChannel: '',
      scanningMeasurements: '',
    },
    aviation: { caaNotified: false, caaNotifRef: '', caaNotifDate: '', notamRef: '', atcContact: '' },
    siteSafetyToggles: {
      electrical: true,
      workAtHeight: false,
      manualHandling: true,
      cables: true,
      haze: false,
      fire: true,
      ppe: true,
      weather: false,
    },
    risks: (library?.riskLibrary || [])
      .filter((r) => r.default === true)
      .map((r) => ({ libId: r.id })),
    attachments: [],
    compliance: { includeCAA: true },
    exportHistory: [],
  };
}
