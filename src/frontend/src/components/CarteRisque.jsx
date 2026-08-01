import { theme } from '../theme/theme.js';
import { PanneauExplicabilite } from './PanneauExplicabilite.jsx';

// Correspondance niveau API (français) → clé palette (anglais)
const NIVEAU_TO_KEY = {
  'Urgent': 'urgent',
  'Élevé':  'high',
  'Moyen':  'medium',
  'Faible': 'low',
};

// Derive risk level key from probability (fallback si l'API ne retourne pas de niveau)
function niveauDeprobabilite(prob) {
  if (prob >= 0.75) return 'urgent';
  if (prob >= 0.50) return 'high';
  if (prob >= 0.25) return 'medium';
  return 'low';
}

// Conservé pour la compatibilité avec PanneauOrientation (mode mock)
export function getNiveauRisque(prob) {
  return niveauDeprobabilite(prob);
}

// One-line clinical summary (French) based on level
const RESUMES = {
  low:    (label) => `Risque ${label} faible — surveillance de routine recommandée.`,
  medium: (label) => `Risque ${label} modéré — consultation médicale conseillée.`,
  high:   (label) => `Risque ${label} élevé — bilan approfondi requis rapidement.`,
  urgent: (label) => `RISQUE ${label.toUpperCase()} URGENT — orientation spécialiste immédiate.`,
};

/**
 * CarteRisque — single disease risk card.
 * Props:
 *   maladie     { id, label, icon, color }
 *   probabilite number (0–1)
 *   niveau      string — niveau retourné par l'API ("Faible"|"Moyen"|"Élevé"|"Urgent")
 *   resume      string — résumé textuel retourné par l'API (optionnel)
 *   shap        array of { feature, valeur }
 *   expanded    bool
 *   onToggle    () => void
 */
export default function CarteRisque({ maladie, probabilite, niveau: niveauApi, resume: resumeApi, shap, expanded, onToggle }) {
  // Utiliser le niveau de l'API si disponible, sinon calculer localement
  const niveauKey = niveauApi
    ? (NIVEAU_TO_KEY[niveauApi] ?? niveauDeprobabilite(probabilite))
    : niveauDeprobabilite(probabilite);
  const palette  = theme.risk[niveauKey];
  const pct      = Math.round(probabilite * 100);
  // Préférer le résumé de l'API (issu de SHAP), sinon le texte générique local
  const resume   = resumeApi || RESUMES[niveauKey](maladie.label);

  const isUrgent = niveauKey === 'urgent';

  return (
    <div style={{ ...styles.card, borderColor: palette.border, background: isUrgent ? palette.bg : theme.bg.surface }}
         role="article" aria-label={`Risque ${maladie.label} : ${pct}%`}>
      {/* ── Urgent banner ── */}
      {isUrgent && (
        <div style={styles.urgentBanner}>
          <i className="bx bx-error-circle" style={{ fontSize: '16px' }} />
          <span>Orientation Urgente Requise</span>
        </div>
      )}

      {/* ── Card header ── */}
      <div style={styles.header}>
        <div style={styles.iconWrap}>
          <i className={`bx ${maladie.icon}`} style={{ color: maladie.color, fontSize: '24px' }} />
        </div>
        <div style={styles.headerText}>
          <h3 style={styles.title}>{maladie.label}</h3>
          <p style={styles.resume}>{resume}</p>
        </div>
        <button
          onClick={onToggle}
          style={styles.toggleBtn}
          title={expanded ? 'Réduire' : 'Voir les détails'}
          aria-expanded={expanded}
        >
          <i className={`bx ${expanded ? 'bx-chevron-up' : 'bx-chevron-down'}`} style={{ fontSize: '20px' }} />
        </button>
      </div>

      {/* ── Risk gauge row ── */}
      <div style={styles.gaugeRow}>
        <div style={styles.gauge}>
          <div style={{
            ...styles.gaugeBar,
            width:      `${pct}%`,
            background: palette.badge,
          }} />
        </div>
        <span style={{ ...styles.pct, color: palette.text }}>{pct}%</span>
        <span style={{ ...styles.badge, background: palette.badge }}>
          {palette.label}
        </span>
      </div>

      {/* ── Expandable SHAP panel ── */}
      {expanded && shap && (
        <PanneauExplicabilite shap={shap} maladie={maladie} />
      )}
    </div>
  );
}

const styles = {
  card: {
    borderRadius: '12px',
    border:       '1px solid',
    overflow:     'hidden',
    transition:   'border-color 0.2s ease',
  },
  urgentBanner: {
    display:        'flex',
    alignItems:     'center',
    gap:            '8px',
    background:     theme.risk.urgent.badge,
    color:          '#fff',
    fontSize:       '13px',
    fontWeight:     '600',
    padding:        '8px 16px',
    letterSpacing:  '0.02em',
  },
  header: {
    display:    'flex',
    alignItems: 'flex-start',
    gap:        '14px',
    padding:    '16px 16px 0',
  },
  iconWrap: {
    background:   theme.bg.elevated,
    borderRadius: '10px',
    width:        '44px',
    height:       '44px',
    display:      'flex',
    alignItems:   'center',
    justifyContent:'center',
    flexShrink:   0,
  },
  headerText: {
    flex: 1,
  },
  title: {
    margin:     '0 0 4px',
    fontSize:   '16px',
    fontWeight: '600',
    color:      theme.text.primary,
  },
  resume: {
    margin:   0,
    fontSize: '13px',
    color:    theme.text.secondary,
    lineHeight:'1.4',
  },
  toggleBtn: {
    background:   'none',
    border:       'none',
    cursor:       'pointer',
    color:        theme.text.secondary,
    padding:      '4px',
    borderRadius: '6px',
    display:      'flex',
    alignItems:   'center',
    flexShrink:   0,
    transition:   'color 0.15s, background 0.15s',
  },
  gaugeRow: {
    display:    'flex',
    alignItems: 'center',
    gap:        '10px',
    padding:    '12px 16px 16px',
  },
  gauge: {
    flex:         1,
    height:       '8px',
    background:   theme.bg.elevated,
    borderRadius: '4px',
    overflow:     'hidden',
  },
  gaugeBar: {
    height:       '100%',
    borderRadius: '4px',
    transition:   'width 0.6s ease',
  },
  pct: {
    fontSize:   '18px',
    fontWeight: '700',
    minWidth:   '46px',
    textAlign:  'right',
  },
  badge: {
    fontSize:     '12px',
    fontWeight:   '600',
    color:        '#fff',
    borderRadius: '6px',
    padding:      '3px 9px',
    whiteSpace:   'nowrap',
  },
};
