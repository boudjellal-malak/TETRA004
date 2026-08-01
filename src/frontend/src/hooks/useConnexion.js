import { useState, useEffect, useCallback } from 'react';

/**
 * Gestion de la connexion réseau + vérification de l'état de l'API FastAPI.
 * En mode hors ligne, l'application continue avec les prédictions mock.
 */
export function useConnexion() {
  const [enLigne, setEnLigne]               = useState(navigator.onLine);
  const [derniereSynchro, setDerniereSynchro] = useState(null);
  const [syncing, setSyncing]               = useState(false);

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

  // Vérifie que le backend FastAPI répond correctement via /api/health
  const synchroniser = useCallback(async () => {
    if (!enLigne) return;
    setSyncing(true);
    try {
      const res = await fetch('/api/health', { signal: AbortSignal.timeout(4000) });
      if (res.ok) setDerniereSynchro(new Date());
    } catch {
      // Ignore — l'indicateur restera sans timestamp
    } finally {
      setSyncing(false);
    }
  }, [enLigne]);

  return { enLigne, syncing, derniereSynchro, synchroniser };
}

// ─────────────────────────────────────────────────────────────────────────────
// Correspondance : champ du formulaire → feature(s) du modèle
// Certains champs du formulaire alimentent plusieurs modèles sous des noms
// différents (ex: "imc" → BMI pour diabète/cardio, "bmi" pour AVC/IRC).
// ─────────────────────────────────────────────────────────────────────────────
function transformerFormulaire(donnees) {
  const age     = donnees.age     != null ? parseFloat(donnees.age)     : undefined;
  const sexe    = donnees.sexe    != null ? parseFloat(donnees.sexe)    : undefined;
  const imc     = donnees.imc     != null ? parseFloat(donnees.imc)     : undefined;
  const glucose = donnees.glucose != null ? parseFloat(donnees.glucose) : undefined;
  const sysBP   = donnees.tension_systolique  != null ? parseFloat(donnees.tension_systolique)  : undefined;
  const diaBP   = donnees.tension_diastolique != null ? parseFloat(donnees.tension_diastolique) : undefined;
  const htn     = donnees.hypertension === '1' ? 1 : donnees.hypertension === '0' ? 0 : undefined;
  const dm      = donnees.diabete  === '1' ? 1 : donnees.diabete  === '0' ? 0 : undefined;
  const smoker  = donnees.tabagisme === '1' ? 1 : donnees.tabagisme === '0' ? 0 : undefined;
  const chol    = donnees.cholesterol   != null ? parseFloat(donnees.cholesterol)   : undefined;
  const hr      = donnees.frequence_card != null ? parseFloat(donnees.frequence_card) : undefined;
  const creat   = donnees.creatinine    != null ? parseFloat(donnees.creatinine)    : undefined;
  const hemo    = donnees.hemoglobine   != null ? parseFloat(donnees.hemoglobine)   : undefined;
  const bu      = donnees.urée          != null ? parseFloat(donnees.urée)          : undefined;
  const sod     = donnees.sodium        != null ? parseFloat(donnees.sodium)        : undefined;
  const pot     = donnees.potassium     != null ? parseFloat(donnees.potassium)     : undefined;
  const insulin = donnees.insuline      != null ? parseFloat(donnees.insuline)      : undefined;

  // Features engineerées pour le modèle cardio (Framingham)
  const pulsePressure    = (sysBP != null && diaBP != null) ? sysBP - diaBP                      : undefined;
  const mapPressure      = (sysBP != null && diaBP != null) ? diaBP + (sysBP - diaBP) / 3        : undefined;
  const ageGlucoseInteract = (age != null && glucose != null) ? age * glucose                    : undefined;
  const smokerIntensity  = (smoker != null && donnees.cigsPerDay != null)
                           ? smoker * parseFloat(donnees.cigsPerDay)
                           : undefined;

  // Payload combiné pour /api/predict/all
  // undefined sera sérialisé en absent par JSON.stringify (XGBoost voit NaN)
  const payload = {
    // ── Commun ──
    age,
    gender:   sexe,
    bmi:      imc,
    glucose:  glucose,

    // ── Diabète ──
    Pregnancies:              donnees.grossesses != null ? parseFloat(donnees.grossesses) : undefined,
    Glucose:                  glucose,
    BloodPressure:            diaBP,
    SkinThickness:            donnees.epaisseur_cutanee != null ? parseFloat(donnees.epaisseur_cutanee) : undefined,
    Insulin:                  insulin,
    BMI:                      imc,
    DiabetesPedigreeFunction: donnees.heredite_diabete  != null ? parseFloat(donnees.heredite_diabete)  : undefined,
    Age:                      age,

    // ── Cardio (Framingham) ──
    male:             sexe,
    education:        donnees.education != null ? parseFloat(donnees.education) : undefined,
    currentSmoker:    smoker,
    cigsPerDay:       donnees.cigsPerDay != null ? parseFloat(donnees.cigsPerDay) : undefined,
    BPMeds:           donnees.atcv_cardiovasculaire === '1' ? 1 : donnees.atcv_cardiovasculaire === '0' ? 0 : undefined,
    prevalentStroke:  undefined,
    prevalentHyp:     htn,
    diabetes:         dm,
    totChol:          chol,
    sysBP,
    diaBP,
    BMI:              imc,
    heartRate:        hr,
    pulse_pressure:   pulsePressure,
    map_pressure:     mapPressure,
    age_glucose_interact: ageGlucoseInteract,
    smoker_intensity: smokerIntensity,

    // ── AVC ──
    hypertension:      htn,
    heart_disease:     donnees.atcv_cardiovasculaire === '1' ? 1 : donnees.atcv_cardiovasculaire === '0' ? 0 : undefined,
    ever_married:      undefined,
    work_type:         undefined,
    Residence_type:    undefined,
    avg_glucose_level: glucose,
    smoking_status:    smoker,

    // ── IRC ──
    bp:    sysBP ?? diaBP,
    sg:    undefined,
    al:    undefined,
    su:    undefined,
    htn:   htn,
    dm:    dm,
    cad:   undefined,
    appet: undefined,
    pe:    undefined,
    ane:   undefined,
    bgr:   glucose,
    sc:    creat,
    hemo,
    bu,
    sod,
    pot,
    donnees_completes: !!(creat || hemo || bu || sod || pot),
  };

  // Supprimer les clés undefined pour un JSON propre
  return Object.fromEntries(
    Object.entries(payload).filter(([, v]) => v !== undefined)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Transformation de la réponse API → format interne du frontend
//
// L'API retourne :
//   { resultats: [ { maladie, probabilite_risque, niveau_risque, facteurs_shap, ... } ] }
//
// Le frontend attend :
//   { diabetes: { probabilite, shap, niveau, resume, analyses },
//     heart:    { ... }, stroke: { ... }, ckd: { ... } }
// ─────────────────────────────────────────────────────────────────────────────

// Correspondance nom affiché → id interne du frontend
const MALADIE_ID_MAP = {
  'Diabète':                                          'diabetes',
  'Maladies Cardiovasculaires':                       'heart',
  'Accident Vasculaire Cérébral':                     'stroke',
  'Insuffisance Rénale Chronique':                    'ckd',
  'Insuffisance Rénale Chronique (dépistage précoce)':'ckd',
};

function transformerReponse(data) {
  const resultat = {};

  for (const r of data.resultats ?? []) {
    // Trouver l'id interne (diabetes / heart / stroke / ckd)
    let id = null;
    for (const [nom, key] of Object.entries(MALADIE_ID_MAP)) {
      if (r.maladie.includes(nom.split(' ')[0])) { id = key; break; }
    }
    if (!id) {
      // fallback : chercher par mot-clé
      if (r.maladie.includes('Diab'))    id = 'diabetes';
      else if (r.maladie.includes('Card') || r.maladie.includes('Cœur')) id = 'heart';
      else if (r.maladie.includes('Cér') || r.maladie.includes('AVC'))   id = 'stroke';
      else if (r.maladie.includes('Rén') || r.maladie.includes('IRC'))   id = 'ckd';
      else continue;
    }

    // Convertir facteurs_shap → format { feature, valeur } attendu par PanneauExplicabilite
    const shap = (r.facteurs_shap ?? []).map(f => ({
      feature: f.variable,
      valeur:  f.impact,
    }));

    resultat[id] = {
      probabilite: r.probabilite_risque,
      niveau:      r.niveau_risque,          // "Faible" | "Moyen" | "Élevé" | "Urgent"
      necessite:   r.necessite_orientation,
      seuil:       r.seuil_utilise,
      resume:      r.resume_texte,
      analyses:    r.analyses_manquantes_recommandees ?? [],
      shap,
    };
  }

  return resultat;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook principal — usePrediction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Soumet les données du formulaire patient à POST /api/predict/all.
 * Retombe sur les prédictions mock si l'API est indisponible.
 */
export function usePrediction() {
  const [predictions, setPredictions] = useState(null);
  const [chargement, setChargement]   = useState(false);
  const [erreur, setErreur]           = useState(null);
  const [sourceReelle, setSourceReelle] = useState(false);

  const predire = useCallback(async (donnees) => {
    setChargement(true);
    setErreur(null);
    try {
      const payload = transformerFormulaire(donnees);

      const res = await fetch('/api/predict/all', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
        signal:  AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail?.detail ?? `HTTP ${res.status}`);
      }

      const data = await res.json();
      const transformed = transformerReponse(data);

      // Compléter avec des zéros pour les modèles non évalués (données insuffisantes)
      setPredictions({
        diabetes: transformed.diabetes ?? { probabilite: 0, shap: [], niveau: 'Faible', analyses: [] },
        heart:    transformed.heart    ?? { probabilite: 0, shap: [], niveau: 'Faible', analyses: [] },
        stroke:   transformed.stroke   ?? { probabilite: 0, shap: [], niveau: 'Faible', analyses: [] },
        ckd:      transformed.ckd      ?? { probabilite: 0, shap: [], niveau: 'Faible', analyses: [] },
      });
      setSourceReelle(true);

    } catch (err) {
      console.warn('[usePrediction] API indisponible, basculement sur mock :', err.message);
      setErreur(null); // Ne pas afficher d'erreur — mode dégradé transparent
      setPredictions(mockPredictions(donnees));
      setSourceReelle(false);
    } finally {
      setChargement(false);
    }
  }, []);

  const reinitialiser = useCallback(() => {
    setPredictions(null);
    setErreur(null);
    setSourceReelle(false);
  }, []);

  return { predictions, chargement, erreur, predire, reinitialiser, sourceReelle };
}

// ─────────────────────────────────────────────────────────────────────────────
// Prédictions mock — utilisées quand le backend est hors ligne
// ─────────────────────────────────────────────────────────────────────────────
function mockPredictions(donnees) {
  const age     = parseFloat(donnees.age)     || 45;
  const imc     = parseFloat(donnees.imc)     || 25;
  const glucose = parseFloat(donnees.glucose) || 90;
  const bp      = parseFloat(donnees.tension_systolique) || 120;

  const diabeteScore  = Math.min(0.99, (glucose / 200 + imc / 60 + age / 180) / 2.2);
  const cardiaceScore = Math.min(0.99, (bp / 220 + age / 160 + imc / 70) / 2.5);
  const avcScore      = Math.min(0.99, (age / 200 + (donnees.hypertension === '1' ? 0.25 : 0) + bp / 260) / 1.8);
  const renauxScore   = Math.min(0.99, (age / 220 + imc / 80 + (donnees.diabete === '1' ? 0.2 : 0)) / 2.1);

  const niveauMock = (p, seuil) => {
    if (p < seuil * 0.6)  return 'Faible';
    if (p < seuil)        return 'Moyen';
    if (p < seuil * 1.5)  return 'Élevé';
    return 'Urgent';
  };

  return {
    diabetes: {
      probabilite: diabeteScore,
      niveau: niveauMock(diabeteScore, 0.5),
      analyses: [],
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
      niveau: niveauMock(cardiaceScore, 0.3),
      analyses: [],
      shap: [
        { feature: 'sysBP',         valeur:  0.38 },
        { feature: 'totChol',       valeur:  0.22 },
        { feature: 'age',           valeur:  0.19 },
        { feature: 'currentSmoker', valeur:  0.14 },
        { feature: 'BMI',           valeur: -0.08 },
        { feature: 'glucose',       valeur:  0.06 },
      ],
    },
    stroke: {
      probabilite: avcScore,
      niveau: niveauMock(avcScore, 0.15),
      analyses: [],
      shap: [
        { feature: 'age',               valeur:  0.35 },
        { feature: 'avg_glucose_level', valeur:  0.27 },
        { feature: 'hypertension',      valeur:  0.21 },
        { feature: 'bmi',               valeur: -0.11 },
        { feature: 'heart_disease',     valeur:  0.08 },
        { feature: 'smoking_status',    valeur:  0.05 },
      ],
    },
    ckd: {
      probabilite: renauxScore,
      niveau: niveauMock(renauxScore, 0.5),
      analyses: [],
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
