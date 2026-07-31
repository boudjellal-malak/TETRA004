import { theme } from '../theme/theme.js';
import { getNiveauRisque } from './CarteRisque.jsx';

const ACTIONS = {
  urgent: {
    icon:     'bx-ambulance',
    couleur:  theme.risk.urgent.text,
    bg:       theme.risk.urgent.bg,
    border:   theme.risk.urgent.border,
    titre:    'Orientation Urgente Requise',
    texte:    'Référer immédiatement vers un spécialiste (cardiologue / néphrologue / neurologue) ou aux urgences.',
    cta:      'Orienter vers un spécialiste',
    ctaIcon:  'bx-right-arrow-circle',
    delai:    null,
  },
  high: {
    icon:     'bx-clinic',
    couleur:  theme.risk.high.text,
    bg:       theme.risk.high.bg,
    border:   theme.risk.high.border,
    titre:    'Consultation Spécialisée Recommandée',
    texte:    'Programmer une consultation avec un spécialiste dans un délai rapproché. Compléter les analyses manquantes.',
    cta:      'Planifier un suivi sous 7 jours',
    ctaIcon:  'bx-calendar-check',
    delai:    '7 jours',
  },
  medium: {
    icon:     'bx-calendar-plus',
    couleur:  theme.risk.medium.text,
    bg:       theme.risk.medium.bg,
    border:   theme.risk.medium.border,
    titre:    'Suivi Médical Planifié',
    texte:    'Un suivi médical à court terme est recommandé. Sensibiliser le patient aux facteurs de risque modifiables.',
    cta:      'Planifier un suivi dans 30 jours',
    ctaIcon:  'bx-calendar',
    delai:    '30 jours',
  },
  low: {
    icon:     'bx-check-shield',
    couleur:  theme.risk.low.text,
    bg:       theme.risk.low.bg,
    border:   theme.risk.low.border,
    titre:    'Surveillance de Routine Suffisante',
    texte:    'Aucune action urgente requise. Encourager un mode de vie sain et un bilan annuel de routine.',
    cta:      'Planifier un bilan annuel',
    ctaIcon:  'bx-shield-check',
    delai:    '1 an',
  },
};

/**
 * PanneauOrientation — action recommendations based on overall max risk level.
 * Props:
 *   predictions  object { diabetes, heart, stroke, ckd } each with { probabilite }
 *   maladies     MALADIES array from domaine.js
 */
export default function PanneauOrientation({ predictions, maladies }) {
  if (!predictions) return null;

  // Determine overall max risk level
  const niveaux = maladies.map(m => ({
    label:  m.label,
    niveau: getNiveauRisque(predictions[m.id]?.probabilite ?? 0),
    prob:   predictions[m.id]?.probabilite ?? 0,
    color:  m.color,
  }));

  const order = { urgent: 3, high: 2, medium: 1, low: 0 };
  const top   = niveaux.sort((a, b) => order[b.niveau] - order[a.niveau])[0];
  const action= ACTIONS[top.niveau];

  const urgents = niveaux.filter(n => n.niveau === 'urgent' || n.niveau === 'high');

  return (
    <div style={{ ...styles.wrapper, borderColor: action.border, background: action.bg }}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ ...styles.iconWrap, background: theme.bg.elevated }}>
          <i className={`bx ${action.icon}`} style={{ color: action.couleur, fontSize: '26px' }} />
        </div>
        <div>
          <h3 style={{ ...styles.titre, color: action.couleur }}>{action.titre}</h3>
          <p style={styles.texte}>{action.texte}</p>
        </div>
      </div>

      {/* Affected diseases (urgent/high only) */}
      {urgents.length > 0 && (
        <div style={styles.affectedRow}>
          <span style={styles.affectedLabel}>Pathologies concernées :</span>
          {urgents.map(n => (
            <span key={n.label} style={{ ...styles.diseasePill, borderColor: n.color, color: n.color }}>
              {n.label}
            </span>
          ))}
        </div>
      )}

      {/* CTA button */}
      <button style={{ ...styles.ctaBtn, background: action.couleur, color: theme.text.inverse }}>
        <i className={`bx ${action.ctaIcon}`} style={{ fontSize: '17px' }} />
        <span>{action.cta}</span>
      </button>

      {/* Additional actions */}
      <div style={styles.secondaryActions}>
        <button style={styles.secondaryBtn}>
          <i className="bx bx-printer" style={{ fontSize: '15px' }} />
          Imprimer le rapport
        </button>
        <button style={styles.secondaryBtn}>
          <i className="bx bx-share-alt" style={{ fontSize: '15px' }} />
          Partager avec le spécialiste
        </button>
        <button style={styles.secondaryBtn}>
          <i className="bx bx-history" style={{ fontSize: '15px' }} />
          Enregistrer dans le dossier
        </button>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    borderRadius: '12px',
    border:       '1px solid',
    padding:      '20px',
    transition:   'border-color 0.3s',
  },
  header: {
    display:   'flex',
    gap:       '16px',
    alignItems:'flex-start',
    marginBottom:'14px',
  },
  iconWrap: {
    width:        '52px',
    height:       '52px',
    borderRadius: '12px',
    display:      'flex',
    alignItems:   'center',
    justifyContent:'center',
    flexShrink:   0,
  },
  titre: {
    margin:     '0 0 5px',
    fontSize:   '16px',
    fontWeight: '700',
  },
  texte: {
    margin:     0,
    fontSize:   '13px',
    color:      theme.text.secondary,
    lineHeight: '1.5',
  },
  affectedRow: {
    display:      'flex',
    flexWrap:     'wrap',
    alignItems:   'center',
    gap:          '8px',
    marginBottom: '16px',
  },
  affectedLabel: {
    fontSize: '13px',
    color:    theme.text.muted,
  },
  diseasePill: {
    fontSize:     '12px',
    fontWeight:   '600',
    border:       '1px solid',
    borderRadius: '6px',
    padding:      '2px 9px',
    background:   theme.bg.elevated,
  },
  ctaBtn: {
    display:      'flex',
    alignItems:   'center',
    gap:          '8px',
    border:       'none',
    borderRadius: '8px',
    padding:      '11px 18px',
    fontSize:     '14px',
    fontWeight:   '600',
    cursor:       'pointer',
    width:        '100%',
    justifyContent:'center',
    marginBottom: '12px',
    transition:   'opacity 0.15s',
  },
  secondaryActions: {
    display:  'flex',
    flexWrap: 'wrap',
    gap:      '8px',
  },
  secondaryBtn: {
    display:      'flex',
    alignItems:   'center',
    gap:          '6px',
    background:   theme.bg.elevated,
    border:       `1px solid ${theme.border.default}`,
    borderRadius: '7px',
    padding:      '7px 12px',
    fontSize:     '12px',
    color:        theme.text.secondary,
    cursor:       'pointer',
    transition:   'border-color 0.15s, color 0.15s',
  },
};
