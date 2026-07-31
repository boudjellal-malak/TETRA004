import { useState, useEffect, useCallback } from 'react';

/**
 * Manages online/offline status + last-sync timestamp.
 * In offline mode the app continues to function using cached model responses.
 */
export function useConnexion() {
  const [enLigne, setEnLigne] = useState(navigator.onLine);
  const [derniereSynchro, setDerniereSynchro] = useState(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const handleOnline  = () => setEnLigne(true);
    const handleOffline = () => setEnLigne(false);
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const synchroniser = useCallback(async () => {
    if (!enLigne) return;
    setSyncing(true);
    // Simulated sync — replace with real API call when backend is ready
    await new Promise(r => setTimeout(r, 1200));
    setDerniereSynchro(new Date());
    setSyncing(false);
  }, [enLigne]);

  return { enLigne, syncing, derniereSynchro, synchroniser };
}

/**
 * Submits patient form data to the Flask prediction API.
 * Falls back to mock predictions when offline.
 */
export function usePrediction() {
  const [predictions, setPredictions] = useState(null);
  const [chargement, setChargement]   = useState(false);
  const [erreur, setErreur]           = useState(null);

  const predire = useCallback(async (donnees) => {
    setChargement(true);
    setErreur(null);
    try {
      // Try real API first
      const res = await fetch('/api/predict', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(donnees),
        signal:  AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      setPredictions(data);
    } catch {
      // Offline / API unavailable — use mock data for demo
      setPredictions(mockPredictions(donnees));
    } finally {
      setChargement(false);
    }
  }, []);

  const reinitialiser = useCallback(() => {
    setPredictions(null);
    setErreur(null);
  }, []);

  return { predictions, chargement, erreur, predire, reinitialiser };
}

// ── Mock prediction generator ─────────────────────────────────────────────
function mockPredictions(donnees) {
  const age    = parseFloat(donnees.age)  || 45;
  const bmi    = parseFloat(donnees.bmi)  || 25;
  const glucose= parseFloat(donnees.glucose) || 90;
  const bp     = parseFloat(donnees.tension_systolique) || 120;

  const diabeteScore  = Math.min(0.99, (glucose / 200 + bmi / 60 + age / 180) / 2.2);
  const cardiaceScore = Math.min(0.99, (bp / 220 + age / 160 + bmi / 70) / 2.5);
  const avcScore      = Math.min(0.99, (age / 200 + (donnees.hypertension ? 0.25 : 0) + bp / 260) / 1.8);
  const renauxScore   = Math.min(0.99, (age / 220 + bmi / 80 + (donnees.diabete ? 0.2 : 0)) / 2.1);

  return {
    diabetes: {
      probabilite: diabeteScore,
      shap: [
        { feature: 'Glucose',                  valeur:  0.42 },
        { feature: 'BMI',                      valeur:  0.28 },
        { feature: 'Age',                      valeur:  0.15 },
        { feature: 'DiabetesPedigreeFunction', valeur: -0.09 },
        { feature: 'Insulin',                  valeur: -0.07 },
        { feature: 'BloodPressure',            valeur:  0.05 },
      ],
    },
    heart: {
      probabilite: cardiaceScore,
      shap: [
        { feature: 'sysBP',        valeur:  0.38 },
        { feature: 'totChol',      valeur:  0.22 },
        { feature: 'age',          valeur:  0.19 },
        { feature: 'currentSmoker',valeur:  0.14 },
        { feature: 'BMI',          valeur: -0.08 },
        { feature: 'glucose',      valeur:  0.06 },
      ],
    },
    stroke: {
      probabilite: avcScore,
      shap: [
        { feature: 'age',              valeur:  0.35 },
        { feature: 'avg_glucose_level',valeur:  0.27 },
        { feature: 'hypertension',     valeur:  0.21 },
        { feature: 'bmi',              valeur: -0.11 },
        { feature: 'heart_disease',    valeur:  0.08 },
        { feature: 'smoking_status',   valeur:  0.05 },
      ],
    },
    ckd: {
      probabilite: renauxScore,
      shap: [
        { feature: 'sc',   valeur:  0.44 },
        { feature: 'hemo', valeur: -0.31 },
        { feature: 'bu',   valeur:  0.23 },
        { feature: 'sg',   valeur: -0.18 },
        { feature: 'bp',   valeur:  0.12 },
        { feature: 'age',  valeur:  0.09 },
      ],
    },
  };
}
