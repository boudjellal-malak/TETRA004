import { useState } from 'react';
import { theme } from '../theme/theme.js';
import { MALADIES } from '../data/domaine.js';
import { useConnexion, usePrediction } from '../hooks/useConnexion.js';
import { getNiveauRisque } from './CarteRisque.jsx';

import FormulairePatient       from './FormulairePatient.jsx';
import CarteRisque             from './CarteRisque.jsx';
import { PanneauExplicabilite } from './PanneauExplicabilite.jsx';
import PanneauRecommandations  from './PanneauRecommandations.jsx';
import PanneauOrientation      from './PanneauOrientation.jsx';
import IndicateurConnexion     from './IndicateurConnexion.jsx';

// Language toggle — French / Arabic
const LANGUES = [
  { code: 'fr', label: 'FR', dir: 'ltr'  },
  { code: 'ar', label: 'AR', dir: 'rtl'  },
];

const TABS = [
  { id: 'formulaire',      label: 'Admission',        icon: 'bx-user-plus'     },
  { id: 'risques',         label: 'Tableau de Bord',  icon: 'bx-tachometer'    },
  { id: 'recommandations', label: 'Analyses',         icon: 'bx-test-tube'     },
  { id: 'orientation',     label: 'Orientation',      icon: 'bx-clinic'        },
];

export default function Dashboard() {
  const [langue, setLangue]         = useState('fr');
  const [ongletActif, setOnglet]    = useState('formulaire');
  const [expandedCards, setExpanded]= useState(new Set());
  const { enLigne, syncing, derniereSynchro, synchroniser } = useConnexion();
  const { predictions, chargement, predire, reinitialiser } = usePrediction();

  const toggleCard = (id) =>
    setExpanded(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });

  const handleSoumettre = async (donnees) => {
    await predire(donnees);
    setOnglet('risques');
  };

  const handleNouvelleAdmission = () => {
    reinitialiser();
    setOnglet('formulaire');
    setExpanded(new Set());
  };

  // Diseases with non-low risk (for recommendations)
  const maladiesActives = predictions
    ? MALADIES
        .filter(m => getNiveauRisque(predictions[m.id]?.probabilite ?? 0) !== 'low')
        .map(m => m.id)
    : [];

  const hasUrgent = predictions
    ? MALADIES.some(m => getNiveauRisque(predictions[m.id]?.probabilite ?? 0) === 'urgent')
    : false;

  const dir = LANGUES.find(l => l.code === langue)?.dir ?? 'ltr';

  return (
    <div style={{ ...styles.shell, direction: dir }}>

      {/* ── Top navigation bar ── */}
      <header style={styles.navbar}>
        <div style={styles.navBrand}>
          <div style={styles.brandIcon}>
            <i className="bx bx-plus-medical" style={{ color: theme.accent.light, fontSize: '20px' }} />
          </div>
          <div>
            <div style={styles.brandTitle}>Assistant IA</div>
            <div style={styles.brandSubtitle}>Prédiction des Risques & Orientation</div>
          </div>
        </div>

        <nav style={styles.navTabs} role="tablist">
          {TABS.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={ongletActif === tab.id}
              onClick={() => setOnglet(tab.id)}
              style={{
                ...styles.navTab,
                ...(ongletActif === tab.id ? styles.navTabActive : {}),
              }}
            >
              <i className={`bx ${tab.icon}`} style={{ fontSize: '16px' }} />
              <span style={styles.navTabLabel}>{tab.label}</span>
              {tab.id === 'risques' && hasUrgent && predictions && (
                <span style={styles.alertDot} title="Risque urgent détecté" />
              )}
            </button>
          ))}
        </nav>

        <div style={styles.navRight}>
          {/* Language toggle */}
          <div style={styles.langToggle}>
            {LANGUES.map(l => (
              <button
                key={l.code}
                onClick={() => setLangue(l.code)}
                style={{
                  ...styles.langBtn,
                  ...(langue === l.code ? styles.langBtnActive : {}),
                }}
              >
                {l.label}
              </button>
            ))}
          </div>
          <IndicateurConnexion
            enLigne={enLigne}
            syncing={syncing}
            derniereSynchro={derniereSynchro}
            onSync={synchroniser}
          />
        </div>
      </header>

      {/* ── Global urgent alert banner ── */}
      {hasUrgent && predictions && (
        <div style={styles.urgentGlobalBanner} role="alert">
          <i className="bx bx-error-circle bx-tada" style={{ fontSize: '20px' }} />
          <strong>ALERTE — Orientation Urgente Requise</strong>
          <span style={{ fontWeight: '400', color: '#ffc4c4' }}>
            Un ou plusieurs risques critiques ont été détectés. Veuillez consulter le panneau d'orientation immédiatement.
          </span>
          <button
            onClick={() => setOnglet('orientation')}
            style={styles.urgentCta}
          >
            Voir l'orientation <i className="bx bx-right-arrow-circle" />
          </button>
        </div>
      )}

      {/* ── Main content ── */}
      <main style={styles.main}>

        {/* ── ONGLET 1 : Formulaire d'admission ── */}
        {ongletActif === 'formulaire' && (
          <section style={styles.section}>
            <div style={styles.sectionMeta}>
              <h1 style={styles.pageTitle}>
                <i className="bx bx-user-plus" style={{ color: theme.accent.light }} />
                Formulaire d'Admission Patient
              </h1>
              <p style={styles.pageDesc}>
                Saisissez les données cliniques du patient. Les champs optionnels améliorent la précision des prédictions — ils peuvent rester vides (le modèle XGBoost gère les valeurs manquantes nativement).
              </p>
            </div>
            <FormulairePatient onSoumettre={handleSoumettre} chargement={chargement} />
          </section>
        )}

        {/* ── ONGLET 2 : Tableau de bord des risques ── */}
        {ongletActif === 'risques' && (
          <section style={styles.section}>
            <div style={styles.sectionMeta}>
              <h1 style={styles.pageTitle}>
                <i className="bx bx-tachometer" style={{ color: theme.accent.light }} />
                Tableau de Bord des Risques
              </h1>
              {predictions ? (
                <div style={styles.actionRow}>
                  <p style={{ margin: 0, fontSize: '13px', color: theme.text.muted }}>
                    <i className="bx bx-time" style={{ marginRight: '5px' }} />
                    Analyse générée le {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <button onClick={handleNouvelleAdmission} style={styles.newPatientBtn}>
                    <i className="bx bx-refresh" style={{ fontSize: '15px' }} />
                    Nouvelle admission
                  </button>
                </div>
              ) : (
                <p style={styles.pageDesc}>
                  Aucune analyse en cours. Veuillez renseigner le formulaire d'admission.
                </p>
              )}
            </div>

            {!predictions ? (
              <div style={styles.emptyDashboard}>
                <i className="bx bx-brain" style={{ fontSize: '52px', color: theme.text.muted, marginBottom: '16px' }} />
                <h3 style={{ margin: '0 0 8px', color: theme.text.secondary }}>Aucun patient analysé</h3>
                <p style={{ margin: '0 0 20px', color: theme.text.muted, fontSize: '14px' }}>
                  Renseignez le formulaire d'admission pour lancer l'analyse des risques.
                </p>
                <button onClick={() => setOnglet('formulaire')} style={styles.goFormBtn}>
                  <i className="bx bx-user-plus" style={{ fontSize: '16px' }} />
                  Accéder au formulaire
                </button>
              </div>
            ) : (
              <div style={styles.cardsGrid}>
                {MALADIES.map(maladie => (
                  <CarteRisque
                    key={maladie.id}
                    maladie={maladie}
                    probabilite={predictions[maladie.id]?.probabilite ?? 0}
                    shap={predictions[maladie.id]?.shap}
                    expanded={expandedCards.has(maladie.id)}
                    onToggle={() => toggleCard(maladie.id)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── ONGLET 3 : Analyses manquantes ── */}
        {ongletActif === 'recommandations' && (
          <section style={styles.section}>
            <div style={styles.sectionMeta}>
              <h1 style={styles.pageTitle}>
                <i className="bx bx-test-tube" style={{ color: theme.accent.light }} />
                Analyses Manquantes & Recommandées
              </h1>
              <p style={styles.pageDesc}>
                Tests de laboratoire non fournis, classés par importance clinique pour les pathologies à risque détectées.
              </p>
            </div>
            <PanneauRecommandations
              maladiesActives={maladiesActives.length > 0 ? maladiesActives : ['diabetes', 'heart', 'stroke', 'ckd']}
              champsRemplis={[]}
            />
          </section>
        )}

        {/* ── ONGLET 4 : Orientation ── */}
        {ongletActif === 'orientation' && (
          <section style={styles.section}>
            <div style={styles.sectionMeta}>
              <h1 style={styles.pageTitle}>
                <i className="bx bx-clinic" style={{ color: theme.accent.light }} />
                Orientation & Prochaines Étapes
              </h1>
              <p style={styles.pageDesc}>
                Recommandations d'orientation basées sur l'analyse globale des risques du patient.
              </p>
            </div>
            <PanneauOrientation predictions={predictions} maladies={MALADIES} />

            {/* Per-disease SHAP details below orientation */}
            {predictions && (
              <div style={{ marginTop: '24px' }}>
                <h2 style={styles.subTitle}>
                  <i className="bx bx-bar-chart-alt-2" style={{ color: theme.accent.light }} />
                  Détail des facteurs explicatifs par pathologie
                </h2>
                <div style={styles.explicabiliteStack}>
                  {MALADIES.map(m => (
                    <div key={m.id} style={styles.explicabiliteCard}>
                      <div style={styles.explicabiliteHeader}>
                        <i className={`bx ${m.icon}`} style={{ color: m.color, fontSize: '18px' }} />
                        <span style={{ fontSize: '14px', fontWeight: '600', color: theme.text.primary }}>{m.label}</span>
                        <span style={{
                          fontSize: '13px',
                          fontWeight: '700',
                          color: theme.risk[getNiveauRisque(predictions[m.id]?.probabilite ?? 0)].text,
                        }}>
                          {Math.round((predictions[m.id]?.probabilite ?? 0) * 100)}%
                        </span>
                      </div>
                      <PanneauExplicabilite
                        shap={predictions[m.id]?.shap}
                        maladie={m}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {/* ── Footer ── */}
      <footer style={styles.footer}>
        <span>
          <i className="bx bx-shield-quarter" style={{ marginRight: '5px', color: theme.accent.light }} />
          TETRA004 — Tetrathon Track A : HealthTech
        </span>
        <span style={styles.footerMuted}>
          Modèles XGBoost + SHAP · Pour usage en aide à la décision clinique uniquement
        </span>
        <span style={styles.footerMuted}>
          <i className="bx bx-code-curly" style={{ marginRight: '4px' }} />
          v1.0.0
        </span>
      </footer>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const styles = {
  shell: {
    minHeight:       '100vh',
    background:      theme.bg.base,
    color:           theme.text.primary,
    fontFamily:      '-apple-system, "Segoe UI", system-ui, sans-serif',
    fontSize:        '14px',
    lineHeight:      '1.6',
    display:         'flex',
    flexDirection:   'column',
  },
  // ── Navbar ──
  navbar: {
    display:         'flex',
    alignItems:      'center',
    gap:             '16px',
    padding:         '0 24px',
    height:          '60px',
    background:      theme.bg.surface,
    borderBottom:    `1px solid ${theme.border.default}`,
    position:        'sticky',
    top:             0,
    zIndex:          100,
    flexWrap:        'wrap',
  },
  navBrand: {
    display:    'flex',
    alignItems: 'center',
    gap:        '10px',
    flexShrink: 0,
  },
  brandIcon: {
    background:   theme.accent.subtle,
    borderRadius: '10px',
    width:        '38px',
    height:       '38px',
    display:      'flex',
    alignItems:   'center',
    justifyContent:'center',
  },
  brandTitle: {
    fontSize:   '15px',
    fontWeight: '700',
    color:      theme.text.primary,
    lineHeight: '1.2',
  },
  brandSubtitle: {
    fontSize: '11px',
    color:    theme.text.muted,
  },
  navTabs: {
    display:  'flex',
    flex:     1,
    gap:      '4px',
    justifyContent:'center',
  },
  navTab: {
    display:      'flex',
    alignItems:   'center',
    gap:          '6px',
    background:   'none',
    border:       'none',
    borderRadius: '7px',
    color:        theme.text.secondary,
    cursor:       'pointer',
    fontSize:     '13px',
    fontWeight:   '500',
    padding:      '7px 12px',
    position:     'relative',
    transition:   'background 0.15s, color 0.15s',
    whiteSpace:   'nowrap',
  },
  navTabActive: {
    background: theme.accent.subtle,
    color:      theme.accent.light,
  },
  navTabLabel: {
    // hidden on very small screens via CSS not possible inline, kept for accessibility
  },
  alertDot: {
    width:        '8px',
    height:       '8px',
    background:   theme.risk.urgent.badge,
    borderRadius: '50%',
    flexShrink:   0,
  },
  navRight: {
    display:    'flex',
    alignItems: 'center',
    gap:        '10px',
    flexShrink: 0,
  },
  langToggle: {
    display:      'flex',
    background:   theme.bg.elevated,
    borderRadius: '8px',
    border:       `1px solid ${theme.border.default}`,
    overflow:     'hidden',
  },
  langBtn: {
    background:   'none',
    border:       'none',
    color:        theme.text.secondary,
    cursor:       'pointer',
    fontSize:     '12px',
    fontWeight:   '600',
    padding:      '5px 11px',
    transition:   'background 0.15s',
  },
  langBtnActive: {
    background: theme.accent.subtle,
    color:      theme.accent.light,
  },
  // ── Alert banner ──
  urgentGlobalBanner: {
    display:      'flex',
    alignItems:   'center',
    gap:          '12px',
    flexWrap:     'wrap',
    background:   theme.risk.urgent.bg,
    borderBottom: `2px solid ${theme.risk.urgent.badge}`,
    padding:      '12px 24px',
    color:        theme.risk.urgent.text,
    fontSize:     '14px',
    fontWeight:   '600',
  },
  urgentCta: {
    display:      'flex',
    alignItems:   'center',
    gap:          '6px',
    marginLeft:   'auto',
    background:   theme.risk.urgent.badge,
    border:       'none',
    borderRadius: '6px',
    color:        '#fff',
    cursor:       'pointer',
    fontSize:     '13px',
    fontWeight:   '600',
    padding:      '6px 14px',
    whiteSpace:   'nowrap',
  },
  // ── Main area ──
  main: {
    flex:    1,
    padding: '24px',
    maxWidth:'1200px',
    width:   '100%',
    margin:  '0 auto',
  },
  section: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '20px',
  },
  sectionMeta: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '6px',
  },
  pageTitle: {
    display:    'flex',
    alignItems: 'center',
    gap:        '10px',
    margin:     0,
    fontSize:   '20px',
    fontWeight: '700',
    color:      theme.text.primary,
  },
  pageDesc: {
    margin:   0,
    fontSize: '14px',
    color:    theme.text.secondary,
    maxWidth: '680px',
  },
  actionRow: {
    display:     'flex',
    alignItems:  'center',
    justifyContent:'space-between',
    flexWrap:    'wrap',
    gap:         '8px',
  },
  newPatientBtn: {
    display:      'flex',
    alignItems:   'center',
    gap:          '6px',
    background:   theme.bg.elevated,
    border:       `1px solid ${theme.border.default}`,
    borderRadius: '7px',
    color:        theme.text.secondary,
    cursor:       'pointer',
    fontSize:     '13px',
    padding:      '6px 12px',
    transition:   'border-color 0.15s',
  },
  cardsGrid: {
    display:             'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap:                 '16px',
  },
  emptyDashboard: {
    display:       'flex',
    flexDirection: 'column',
    alignItems:    'center',
    justifyContent:'center',
    padding:       '64px 24px',
    background:    theme.bg.surface,
    borderRadius:  '12px',
    border:        `1px solid ${theme.border.default}`,
    textAlign:     'center',
  },
  goFormBtn: {
    display:      'flex',
    alignItems:   'center',
    gap:          '8px',
    background:   theme.accent.primary,
    border:       'none',
    borderRadius: '8px',
    color:        '#fff',
    cursor:       'pointer',
    fontSize:     '14px',
    fontWeight:   '600',
    padding:      '10px 20px',
  },
  subTitle: {
    display:    'flex',
    alignItems: 'center',
    gap:        '8px',
    margin:     '0 0 14px',
    fontSize:   '16px',
    fontWeight: '600',
    color:      theme.text.primary,
  },
  explicabiliteStack: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '14px',
  },
  explicabiliteCard: {
    background:   theme.bg.surface,
    borderRadius: '10px',
    border:       `1px solid ${theme.border.default}`,
    overflow:     'hidden',
  },
  explicabiliteHeader: {
    display:    'flex',
    alignItems: 'center',
    gap:        '10px',
    padding:    '12px 16px',
    borderBottom:`1px solid ${theme.border.subtle}`,
    background: theme.bg.elevated,
  },
  // ── Footer ──
  footer: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    flexWrap:       'wrap',
    gap:            '8px',
    background:     theme.bg.surface,
    borderTop:      `1px solid ${theme.border.default}`,
    padding:        '12px 24px',
    fontSize:       '12px',
    color:          theme.text.secondary,
  },
  footerMuted: {
    color:    theme.text.muted,
    display:  'flex',
    alignItems:'center',
  },
};
