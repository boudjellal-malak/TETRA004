import { theme } from '../theme/theme.js';
import { TESTS_RECOMMANDES } from '../data/domaine.js';

const IMPORTANCE_STYLE = {
  Haute:   { color: theme.risk.urgent.text,  bg: theme.risk.urgent.bg  },
  Moyenne: { color: theme.risk.medium.text,  bg: theme.risk.medium.bg  },
  Faible:  { color: theme.risk.low.text,     bg: theme.risk.low.bg     },
};

/**
 * PanneauRecommandations — missing lab tests panel.
 * Props:
 *   maladiesActives  string[]     — ids of diseases with medium/high/urgent risk
 *   champsRemplis    string[]     — feature ids already provided by the clinician
 *   analysesApi      object       — { [diseaseId]: [ { nom, justification } ] } retournées par l'API
 */
export default function PanneauRecommandations({ maladiesActives, champsRemplis, analysesApi }) {
  // 1. Analyses dynamiques retournées par l'API (priorité haute)
  const apiTests = [];
  const seenApi = new Set();
  if (analysesApi) {
    Object.entries(analysesApi).forEach(([id, liste]) => {
      (liste ?? []).forEach(a => {
        const key = `api-${a.nom}`;
        if (!seenApi.has(key)) {
          seenApi.add(key);
          apiTests.push({
            id:         key,
            label:      a.nom,
            importance: 'Haute',
            icon:       'bx-test-tube',
            justification: a.justification,
            source:     'api',
          });
        }
      });
    });
  }

  // 2. Analyses statiques (TESTS_RECOMMANDES) pour compléter
  const staticTests = [];
  const seen = new Set([...seenApi]);

  (maladiesActives || []).forEach(id => {
    (TESTS_RECOMMANDES[id] || []).forEach(test => {
      if (!seen.has(test.id) && !champsRemplis?.includes(test.id)) {
        seen.add(test.id);
        staticTests.push({ ...test, maladie: id, source: 'static' });
      }
    });
  });

  // Fusionner : API d'abord, statiques ensuite
  const testsAfficher = [...apiTests, ...staticTests];

  // Sort: Haute first
  const order = { Haute: 0, Moyenne: 1, Faible: 2 };
  testsAfficher.sort((a, b) => (order[a.importance] ?? 9) - (order[b.importance] ?? 9));

  if (testsAfficher.length === 0) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.sectionHeader}>
          <i className="bx bx-test-tube" style={styles.sectionIcon} />
          <span style={styles.sectionTitle}>Analyses Recommandées</span>
        </div>
        <div style={styles.emptyState}>
          <i className="bx bx-check-circle" style={{ fontSize: '28px', color: theme.risk.low.text, marginBottom: '8px' }} />
          <p style={{ margin: 0, color: theme.text.secondary }}>Toutes les analyses essentielles ont été fournies.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.sectionHeader}>
        <i className="bx bx-test-tube" style={styles.sectionIcon} />
        <span style={styles.sectionTitle}>Analyses Manquantes</span>
        <span style={styles.countBadge}>{testsAfficher.length}</span>
      </div>
      <p style={styles.subtitle}>
        Tests non fournis, classés par importance clinique. Leur saisie améliorera la précision des prédictions.
      </p>

      <div style={styles.list}>
        {testsAfficher.map(test => {
          const imp = IMPORTANCE_STYLE[test.importance] || IMPORTANCE_STYLE['Faible'];
          return (
            <div key={test.id} style={styles.item}>
              <div style={{ ...styles.itemIconWrap, background: imp.bg }}>
                <i className={`bx ${test.icon}`} style={{ color: imp.color, fontSize: '18px' }} />
              </div>
              <div style={styles.itemContent}>
                <span style={styles.itemLabel}>{test.label}</span>
                <span style={{ ...styles.importanceBadge, color: imp.color, background: imp.bg }}>
                  Importance {test.importance}
                </span>
              </div>
              <i className="bx bx-chevron-right" style={styles.chevron} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    background:   theme.bg.surface,
    borderRadius: '12px',
    border:       `1px solid ${theme.border.default}`,
    overflow:     'hidden',
  },
  sectionHeader: {
    display:        'flex',
    alignItems:     'center',
    gap:            '8px',
    padding:        '14px 16px',
    borderBottom:   `1px solid ${theme.border.subtle}`,
    background:     theme.bg.elevated,
  },
  sectionIcon: {
    color:    theme.accent.light,
    fontSize: '18px',
  },
  sectionTitle: {
    flex:       1,
    fontSize:   '14px',
    fontWeight: '600',
    color:      theme.text.primary,
  },
  countBadge: {
    background:   theme.accent.subtle,
    color:        theme.accent.light,
    borderRadius: '12px',
    padding:      '2px 9px',
    fontSize:     '12px',
    fontWeight:   '700',
  },
  subtitle: {
    margin:   '12px 16px 0',
    fontSize: '13px',
    color:    theme.text.muted,
    lineHeight:'1.5',
  },
  list: {
    padding: '10px 0 8px',
  },
  item: {
    display:    'flex',
    alignItems: 'center',
    gap:        '12px',
    padding:    '10px 16px',
    transition: 'background 0.15s',
    cursor:     'default',
  },
  itemIconWrap: {
    width:        '36px',
    height:       '36px',
    borderRadius: '8px',
    display:      'flex',
    alignItems:   'center',
    justifyContent:'center',
    flexShrink:   0,
  },
  itemContent: {
    flex:      1,
    display:   'flex',
    flexDirection:'column',
    gap:       '3px',
  },
  itemLabel: {
    fontSize: '13px',
    color:    theme.text.primary,
  },
  importanceBadge: {
    fontSize:     '11px',
    fontWeight:   '600',
    borderRadius: '5px',
    padding:      '1px 7px',
    alignSelf:    'flex-start',
  },
  chevron: {
    color:    theme.text.muted,
    fontSize: '16px',
  },
  emptyState: {
    display:       'flex',
    flexDirection: 'column',
    alignItems:    'center',
    padding:       '32px 16px',
    textAlign:     'center',
  },
};
