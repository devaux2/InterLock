import { useEffect, useRef, useState } from 'react';
import api from '../api.js';

/**
 * Debounced-autosave draft of the settings object, shared by the Company,
 * Insurance and Settings screens. Each screen edits its own keys; App state is
 * refreshed after every save so screens stay in sync.
 */
export function useSettingsDraft(settings, updateSettings) {
  const [draft, setDraft] = useState(settings);
  const [saveState, setSaveState] = useState('saved'); // saved | saving | error

  const draftRef = useRef(draft);
  const dirtyRef = useRef(false);
  const timerRef = useRef(null);
  const firstRef = useRef(true);

  const doSave = async () => {
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    try {
      await api.saveSettings(draftRef.current);
      updateSettings(draftRef.current);
      if (!dirtyRef.current) setSaveState('saved');
    } catch {
      dirtyRef.current = true;
      setSaveState('error');
    }
  };

  useEffect(() => {
    draftRef.current = draft;
    if (firstRef.current) { firstRef.current = false; return undefined; }
    dirtyRef.current = true;
    setSaveState('saving');
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(doSave, 800);
    return () => clearTimeout(timerRef.current);
  }, [draft]);

  // Flush any pending save when the screen unmounts.
  useEffect(() => () => { clearTimeout(timerRef.current); doSave(); }, []);

  return { draft, setDraft, saveState };
}

export function SaveIndicatorText(saveState) {
  return saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Save failed' : 'Saved ✓';
}
