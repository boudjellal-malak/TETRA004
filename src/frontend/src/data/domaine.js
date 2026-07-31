// Mock patient data + model prediction payload
// Mirrors the exact feature sets used by each trained XGBoost model

export const MALADIES = [
  {
    id: 'diabetes',
    label: 'Diabète',
    icon: 'bx-droplet',
    color: '#e3b341',
    features: [
      'Pregnancies','Glucose','BloodPressure','SkinThickness',
      'Insulin','BMI','DiabetesPedigreeFunction','Age',
    ],
  },
  {
    id: 'heart',
    label: 'Maladie Cardiaque',
    icon: 'bx-heart',
    color: '#ff7b72',
    features: [
      'male','age','education','currentSmoker','cigsPerDay',
      'BPMeds','prevalentStroke','prevalentHyp','diabetes',
      'totChol','sysBP','diaBP','BMI','heartRate','glucose',
    ],
  },
  {
    id: 'stroke',
    label: 'AVC',
    icon: 'bx-brain',
    color: '#d2a8ff',
    features: [
      'gender','age','hypertension','heart_disease','ever_married',
      'work_type','Residence_type','avg_glucose_level','bmi','smoking_status',
    ],
  },
  {
    id: 'ckd',
    label: 'Maladie Rénale Chronique',
    icon: 'bx-pulse',
    color: '#79c0ff',
    features: [
      'age','bp','sg','al','su','rbc','pc','pcc','ba','bgr',
      'bu','sc','sod','pot','hemo','pcv','wc','rc',
      'htn','dm','cad','appet','pe','ane',
    ],
  },
];

// French labels for common features (used by PanneauExplicabilite)
export const FEATURE_LABELS_FR = {
  // Diabetes
  Glucose:                  'Glycémie',
  BMI:                      'IMC',
  Age:                      'Âge',
  Insulin:                  'Insuline',
  BloodPressure:            'Tension artérielle',
  DiabetesPedigreeFunction: 'Antécédents fam. diabète',
  SkinThickness:            'Épaisseur cutanée',
  Pregnancies:              'Grossesses',
  // Heart
  sysBP:            'Tension systolique',
  diaBP:            'Tension diastolique',
  totChol:          'Cholestérol total',
  age:              'Âge',
  bmi:              'IMC',
  glucose:          'Glycémie',
  heartRate:        'Fréquence cardiaque',
  cigsPerDay:       'Cigarettes/jour',
  currentSmoker:    'Fumeur actif',
  prevalentHyp:     'Hypertension',
  diabetes:         'Diabète connu',
  male:             'Sexe masculin',
  BPMeds:           'Médicaments tension',
  prevalentStroke:  'AVC antérieur',
  education:        'Niveau éducation',
  // Stroke
  avg_glucose_level: 'Glycémie moyenne',
  hypertension:      'Hypertension',
  heart_disease:     'Maladie cardiaque',
  smoking_status:    'Statut tabagique',
  gender:            'Sexe',
  ever_married:      'Marié(e)',
  work_type:         'Type de travail',
  Residence_type:    'Type de résidence',
  // CKD
  bp:    'Tension artérielle',
  hemo:  'Hémoglobine',
  sc:    'Créatinine sérique',
  bu:    'Urée sanguine',
  sg:    'Densité urinaire',
  al:    'Albumine urinaire',
  su:    'Sucre urinaire',
  bgr:   'Glycémie au hasard',
  sod:   'Sodium',
  pot:   'Potassium',
  pcv:   'Hématocrite',
  wc:    'GB (×10³)',
  rc:    'GR (millions/µL)',
  htn:   'Hypertension',
  dm:    'Diabète',
  cad:   'Coronaropathie',
  appet: 'Appétit',
  pe:    'Œdème pédale',
  ane:   'Anémie',
  rbc:   'GR urine',
  pc:    'Cellules purulentes',
  pcc:   'Amas purulents',
  ba:    'Bactéries',
};

// Tests recommandés par maladie avec leur importance clinique
export const TESTS_RECOMMANDES = {
  diabetes: [
    { id: 'hba1c',   label: 'HbA1c (glycémie à long terme)', importance: 'Haute',  icon: 'bx-test-tube' },
    { id: 'fasting', label: 'Glycémie à jeun',                importance: 'Haute',  icon: 'bx-test-tube' },
    { id: 'insulin', label: 'Insulinémie à jeun',             importance: 'Moyenne',icon: 'bx-test-tube' },
    { id: 'lipids',  label: 'Bilan lipidique',                importance: 'Moyenne',icon: 'bx-test-tube' },
  ],
  heart: [
    { id: 'ecg',       label: 'ECG de repos',                   importance: 'Haute',  icon: 'bx-heart' },
    { id: 'troponin',  label: 'Troponine cardiaque',             importance: 'Haute',  icon: 'bx-test-tube' },
    { id: 'lipids',    label: 'Bilan lipidique complet',         importance: 'Haute',  icon: 'bx-test-tube' },
    { id: 'echo',      label: 'Échocardiographie',               importance: 'Moyenne',icon: 'bx-pulse' },
  ],
  stroke: [
    { id: 'mri',       label: 'IRM cérébrale',                  importance: 'Haute',  icon: 'bx-brain' },
    { id: 'carotid',   label: 'Doppler des carotides',           importance: 'Haute',  icon: 'bx-pulse' },
    { id: 'coag',      label: 'Bilan de coagulation',            importance: 'Haute',  icon: 'bx-test-tube' },
    { id: 'echo',      label: 'Échocardiographie',               importance: 'Moyenne',icon: 'bx-heart' },
  ],
  ckd: [
    { id: 'creatinine',label: 'Créatinine sérique + DFG estimé',importance: 'Haute',  icon: 'bx-test-tube' },
    { id: 'urine',     label: 'Analyse d\'urine complète (BU)',  importance: 'Haute',  icon: 'bx-test-tube' },
    { id: 'potassium', label: 'Ionogramme (Na⁺, K⁺)',           importance: 'Haute',  icon: 'bx-test-tube' },
    { id: 'echo',      label: 'Échographie rénale',              importance: 'Moyenne',icon: 'bx-pulse' },
  ],
};
