import { theme } from '../theme/theme.js';

/**
 * IndicateurConnexion — top-right status widget.
 * Shows bx-wifi (online), bx-wifi-off (offline), or bx-refresh (syncing).
 * Props: enLigne, syncing, derniereSynchro, onSync
 */
export default function IndicateurConnexion({ enLigne, syncing, derniereSynchro, onSync }) {
  const color  = syncing ? theme.status.syncing : enLigne ? theme.status.online : theme.status.offline;
  const icon   = syncing ? 'bx-refresh bx-spin' : enLigne ? 'bx-wifi' : 'bx-wifi-off';
  const label  = syncing ? 'Synchronisation…' : enLigne ? 'En ligne' : 'Hors ligne';

  const formatTime = (d) => {
    if (!d) return '—';
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={styles.wrapper}>
      <i className={`bx ${icon}`} style={{ color, fontSize: '18px' }} />
      <span style={{ ...styles.label, color }}>{label}</span>
      {derniereSynchro && enLigne && !syncing && (
        <span style={styles.synced}>Synchro: {formatTime(derniereSynchro)}</span>
      )}
      {enLigne && !syncing && (
        <button onClick={onSync} style={styles.syncBtn} title="Synchroniser maintenant">
          <i className="bx bx-refresh" style={{ fontSize: '15px' }} />
        </button>
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    display:     'flex',
    alignItems:  'center',
    gap:         '6px',
    background:  theme.bg.elevated,
    border:      `1px solid ${theme.border.default}`,
    borderRadius:'20px',
    padding:     '5px 12px',
    cursor:      'default',
  },
  label: {
    fontSize:   '13px',
    fontWeight: '500',
    whiteSpace: 'nowrap',
  },
  synced: {
    fontSize: '11px',
    color:    theme.text.muted,
  },
  syncBtn: {
    background:  'none',
    border:      'none',
    cursor:      'pointer',
    color:       theme.text.secondary,
    padding:     '0 2px',
    display:     'flex',
    alignItems:  'center',
    borderRadius:'4px',
    transition:  'color 0.15s',
  },
};
