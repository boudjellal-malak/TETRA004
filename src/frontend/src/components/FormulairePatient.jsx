import { useState } from 'react';
import { theme, inputBase } from '../theme/theme.js';

// ── Field definitions ─────────────────────────────────────────────────────

const CHAMPS_REQUIS = [
  {
    section: 'Données Démographiques',
    icon:    'bx-user',
    champs: [
      { id: 'age',     label: 'Âge',        type: 'number', unit: 'ans',  min: 0, max: 120, placeholder: 'ex: 45' },
      { id: 'sexe',    label: 'Sexe',        type: 'select',
        options: [{ val: '', label: 'Sélectionner…' }, { val: '1', label: 'Masculin' }, { val: '0', label: 'Féminin' }] },
    ],
  },
  {
    section: 'Signes Vitaux',
    icon:    'bx-heart-circle',
    champs: [
      { id: 'tension_systolique', label: 'Tension systolique', type: 'number', unit: 'mmHg', min: 60,  max: 250, placeholder: 'ex: 120' },
      { id: 'tension_diastolique',label: 'Tension diastolique',type: 'number', unit: 'mmHg', min: 40,  max: 140, placeholder: 'ex: 80'  },
      { id: 'imc',                label: 'IMC',                type: 'number', unit: 'kg/m²',min: 10,  max: 70,  placeholder: 'ex: 24.5' },
      { id: 'glucose',            label: 'Glycémie',           type: 'number', unit: 'mg/dL',min: 40,  max: 500, placeholder: 'ex: 95'  },
    ],
  },
  {
    section: 'Antécédents Médicaux',
    icon:    'bx-clipboard',
    champs: [
      { id: 'hypertension',       label: 'Hypertension artérielle', type: 'checkbox' },
      { id: 'diabete',            label: 'Diabète connu',           type: 'checkbox' },
      { id: 'tabagisme',          label: 'Tabagisme actif',         type: 'checkbox' },
      { id: 'atcv_cardiovasculaire',label: 'Antécédents cardiovasculaires', type: 'checkbox' },
    ],
  },
];

const CHAMPS_AVANCES = [
  {
    section: 'Résultats de Laboratoire (Optionnel)',
    icon:    'bx-test-tube',
    champs: [
      { id: 'cholesterol',     label: 'Cholestérol total',        type: 'number', unit: 'mg/dL', placeholder: 'ex: 195' },
      { id: 'frequence_card',  label: 'Fréquence cardiaque',      type: 'number', unit: 'bpm',   placeholder: 'ex: 72'  },
      { id: 'creatinine',      label: 'Créatinine sérique',       type: 'number', unit: 'mg/dL', placeholder: 'ex: 1.1' },
      { id: 'hemoglobine',     label: 'Hémoglobine',              type: 'number', unit: 'g/dL',  placeholder: 'ex: 13.5'},
      { id: 'urée',            label: 'Urée sanguine',            type: 'number', unit: 'mg/dL', placeholder: 'ex: 36'  },
      { id: 'sodium',          label: 'Sodium (Na⁺)',             type: 'number', unit: 'mEq/L', placeholder: 'ex: 138' },
      { id: 'potassium',       label: 'Potassium (K⁺)',           type: 'number', unit: 'mEq/L', placeholder: 'ex: 4.1' },
      { id: 'insuline',        label: 'Insulinémie',              type: 'number', unit: 'µIU/mL',placeholder: 'ex: 85'  },
    ],
  },
];

/**
 * FormulairePatient — patient admission form.
 * Props:
 *   onSoumettre  (formData: object) => void
 *   chargement   bool
 */
export default function FormulairePatient({ onSoumettre, chargement }) {
  const [values, setValues]       = useState({});
  const [showAvance, setShowAvance] = useState(false);
  const [erreurs, setErreurs]     = useState({});
  const [touched, setTouched]     = useState({});

  const set = (id, val) => setValues(v => ({ ...v, [id]: val }));
  const touch = (id)    => setTouched(t => ({ ...t, [id]: true }));

  const valider = () => {
    const e = {};
    if (!values.age   || values.age < 0  || values.age > 120)  e.age  = 'Âge invalide (0–120 ans)';
    if (!values.sexe)                                           e.sexe = 'Veuillez sélectionner le sexe';
    if (!values.imc   || values.imc < 10 || values.imc > 70)   e.imc  = 'IMC invalide (10–70)';
    if (!values.glucose || values.glucose < 40 || values.glucose > 500) e.glucose = 'Glycémie invalide (40–500 mg/dL)';
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const e2 = valider();
    if (Object.keys(e2).length > 0) {
      setErreurs(e2);
      setTouched(Object.fromEntries(Object.keys(e2).map(k => [k, true])));
      return;
    }
    setErreurs({});
    onSoumettre(values);
  };

  const renderChamp = (champ) => {
    const hasError = touched[champ.id] && erreurs[champ.id];
    const filled   = values[champ.id] !== undefined && values[champ.id] !== '';

    if (champ.type === 'checkbox') {
      return (
        <label key={champ.id} style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={!!values[champ.id]}
            onChange={e => set(champ.id, e.target.checked ? '1' : '0')}
            style={styles.checkbox}
          />
          <i className="bx bx-check-square" style={{ color: values[champ.id] ? theme.accent.light : theme.text.muted, fontSize: '17px' }} />
          <span style={styles.checkboxText}>{champ.label}</span>
        </label>
      );
    }

    if (champ.type === 'select') {
      return (
        <div key={champ.id} style={styles.fieldWrap}>
          <label style={styles.fieldLabel}>
            {champ.label}
            <span style={styles.reqMark} title="Champ requis"> *</span>
          </label>
          <select
            value={values[champ.id] || ''}
            onChange={e => { set(champ.id, e.target.value); touch(champ.id); }}
            style={{
              ...inputBase,
              borderColor: hasError ? theme.risk.urgent.badge : filled ? theme.accent.primary : theme.border.default,
            }}
          >
            {champ.options.map(o => (
              <option key={o.val} value={o.val}>{o.label}</option>
            ))}
          </select>
          {hasError && <span style={styles.errMsg}><i className="bx bx-error-circle" /> {erreurs[champ.id]}</span>}
        </div>
      );
    }

    return (
      <div key={champ.id} style={styles.fieldWrap}>
        <label style={styles.fieldLabel}>
          {champ.label}
          {champ.unit && <span style={styles.unit}> ({champ.unit})</span>}
          {CHAMPS_REQUIS.some(s => s.champs.some(c => c.id === champ.id)) && (
            <span style={styles.reqMark} title="Champ requis"> *</span>
          )}
        </label>
        <div style={styles.inputRow}>
          <input
            type="number"
            value={values[champ.id] || ''}
            placeholder={champ.placeholder}
            min={champ.min}
            max={champ.max}
            step="any"
            onChange={e => { set(champ.id, e.target.value); touch(champ.id); }}
            onBlur={() => touch(champ.id)}
            style={{
              ...inputBase,
              borderColor: hasError    ? theme.risk.urgent.badge  :
                           filled      ? theme.accent.primary      :
                           theme.border.default,
            }}
          />
          {/* filled/empty status indicator */}
          {filled ? (
            <i className="bx bx-check-circle" style={{ ...styles.fieldStatus, color: theme.risk.low.text }} />
          ) : (
            <i className="bx bx-minus-circle" style={{ ...styles.fieldStatus, color: theme.text.muted }} />
          )}
        </div>
        {hasError && <span style={styles.errMsg}><i className="bx bx-error-circle" /> {erreurs[champ.id]}</span>}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form} noValidate>
      {/* Header */}
      <div style={styles.formHeader}>
        <i className="bx bx-user-plus" style={{ color: theme.accent.light, fontSize: '22px' }} />
        <div>
          <h2 style={styles.formTitle}>Formulaire d'Admission Patient</h2>
          <p style={styles.formSubtitle}>
            Les champs marqués <span style={{ color: theme.risk.urgent.text }}>*</span> sont requis pour le calcul de risque de base.
          </p>
        </div>
      </div>

      {/* Required sections */}
      <div style={styles.reqBanner}>
        <i className="bx bx-lock-alt" style={{ fontSize: '14px' }} />
        Champs Minimum Requis
      </div>

      {CHAMPS_REQUIS.map(section => (
        <div key={section.section} style={styles.section}>
          <div style={styles.sectionHeader}>
            <i className={`bx ${section.icon}`} style={styles.sectionIcon} />
            <h3 style={styles.sectionTitle}>{section.section}</h3>
          </div>
          <div style={{
            ...styles.grid,
            gridTemplateColumns: section.champs[0]?.type === 'checkbox' ? '1fr 1fr' : 'repeat(auto-fill, minmax(200px, 1fr))',
          }}>
            {section.champs.map(renderChamp)}
          </div>
        </div>
      ))}

      {/* Optional / advanced */}
      <button
        type="button"
        onClick={() => setShowAvance(!showAvance)}
        style={styles.toggleAvance}
      >
        <i className={`bx ${showAvance ? 'bx-chevron-up' : 'bx-chevron-down'}`} style={{ fontSize: '18px' }} />
        {showAvance ? 'Masquer les' : 'Afficher les'} analyses avancées (optionnel)
        <span style={styles.optionalBadge}>Améliore la précision</span>
      </button>

      {showAvance && CHAMPS_AVANCES.map(section => (
        <div key={section.section} style={{ ...styles.section, borderColor: theme.border.subtle }}>
          <div style={styles.sectionHeader}>
            <i className={`bx ${section.icon}`} style={{ ...styles.sectionIcon, color: theme.text.muted }} />
            <h3 style={{ ...styles.sectionTitle, color: theme.text.secondary }}>{section.section}</h3>
            <span style={styles.optionalTag}>
              <i className="bx bx-info-circle" style={{ fontSize: '13px' }} />
              Non renseigné = NaN géré par le modèle XGBoost
            </span>
          </div>
          <div style={styles.grid}>
            {section.champs.map(renderChamp)}
          </div>
        </div>
      ))}

      {/* Submit */}
      <button
        type="submit"
        disabled={chargement}
        style={{
          ...styles.submitBtn,
          opacity: chargement ? 0.7 : 1,
          cursor:  chargement ? 'not-allowed' : 'pointer',
        }}
      >
        {chargement ? (
          <>
            <i className="bx bx-loader-alt bx-spin" style={{ fontSize: '18px' }} />
            Calcul en cours…
          </>
        ) : (
          <>
            <i className="bx bx-brain" style={{ fontSize: '18px' }} />
            Calculer le Risque
          </>
        )}
      </button>
    </form>
  );
}

const styles = {
  form: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '0',
  },
  formHeader: {
    display:      'flex',
    gap:          '14px',
    alignItems:   'flex-start',
    background:   theme.bg.surface,
    borderRadius: '12px 12px 0 0',
    padding:      '20px 20px 16px',
    borderBottom: `1px solid ${theme.border.default}`,
  },
  formTitle: {
    margin:     '0 0 4px',
    fontSize:   '18px',
    fontWeight: '700',
    color:      theme.text.primary,
  },
  formSubtitle: {
    margin:   0,
    fontSize: '13px',
    color:    theme.text.secondary,
  },
  reqBanner: {
    display:    'flex',
    alignItems: 'center',
    gap:        '7px',
    background: theme.accent.subtle,
    color:      theme.accent.light,
    fontSize:   '12px',
    fontWeight: '600',
    padding:    '8px 20px',
    letterSpacing:'0.04em',
    textTransform:'uppercase',
  },
  section: {
    background:   theme.bg.surface,
    border:       `1px solid ${theme.border.default}`,
    borderTop:    'none',
    padding:      '16px 20px',
  },
  sectionHeader: {
    display:      'flex',
    alignItems:   'center',
    gap:          '8px',
    marginBottom: '14px',
    flexWrap:     'wrap',
  },
  sectionIcon: {
    color:    theme.accent.light,
    fontSize: '17px',
  },
  sectionTitle: {
    margin:     0,
    fontSize:   '14px',
    fontWeight: '600',
    color:      theme.text.primary,
    flex:       1,
  },
  optionalTag: {
    display:    'flex',
    alignItems: 'center',
    gap:        '4px',
    fontSize:   '11px',
    color:      theme.text.muted,
    background: theme.bg.elevated,
    borderRadius:'5px',
    padding:    '2px 8px',
    border:     `1px solid ${theme.border.subtle}`,
  },
  grid: {
    display:             'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap:                 '14px',
  },
  fieldWrap: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '5px',
  },
  fieldLabel: {
    fontSize:   '13px',
    fontWeight: '500',
    color:      theme.text.secondary,
  },
  unit: {
    color:      theme.text.muted,
    fontWeight: '400',
  },
  reqMark: {
    color:      theme.risk.urgent.text,
    fontWeight: '700',
  },
  inputRow: {
    position:  'relative',
    display:   'flex',
    alignItems:'center',
  },
  fieldStatus: {
    position:    'absolute',
    right:       '10px',
    fontSize:    '16px',
    pointerEvents:'none',
  },
  errMsg: {
    fontSize:  '12px',
    color:     theme.risk.urgent.text,
    display:   'flex',
    alignItems:'center',
    gap:       '4px',
  },
  checkboxLabel: {
    display:    'flex',
    alignItems: 'center',
    gap:        '8px',
    cursor:     'pointer',
    padding:    '10px 12px',
    borderRadius:'8px',
    background: theme.bg.elevated,
    border:     `1px solid ${theme.border.subtle}`,
    transition: 'border-color 0.15s',
    fontSize:   '13px',
  },
  checkbox: {
    display: 'none',
  },
  checkboxText: {
    color:  theme.text.secondary,
    flex:   1,
  },
  toggleAvance: {
    display:      'flex',
    alignItems:   'center',
    gap:          '8px',
    background:   theme.bg.elevated,
    border:       `1px solid ${theme.border.default}`,
    borderTop:    'none',
    color:        theme.text.secondary,
    fontSize:     '13px',
    fontWeight:   '500',
    padding:      '12px 20px',
    cursor:       'pointer',
    width:        '100%',
    textAlign:    'left',
    transition:   'background 0.15s',
  },
  optionalBadge: {
    marginLeft:   'auto',
    background:   theme.accent.subtle,
    color:        theme.accent.light,
    fontSize:     '11px',
    fontWeight:   '600',
    borderRadius: '5px',
    padding:      '2px 8px',
  },
  submitBtn: {
    display:      'flex',
    alignItems:   'center',
    justifyContent:'center',
    gap:          '10px',
    background:   theme.accent.primary,
    border:       'none',
    borderRadius: '0 0 12px 12px',
    color:        '#fff',
    fontSize:     '15px',
    fontWeight:   '600',
    padding:      '16px',
    transition:   'opacity 0.2s',
    width:        '100%',
    letterSpacing:'0.02em',
  },
};
