// Central design tokens — dark medical theme
// All colours chosen for WCAG AA contrast on #0d1117 background

export const theme = {
  // ── Background layers ──────────────────────────────────────────────
  bg: {
    base:    '#0d1117',   // page background
    surface: '#161b22',   // card / panel
    elevated:'#1c2128',   // nested panel / modal
    overlay: '#21262d',   // hover / active state
  },

  // ── Border ─────────────────────────────────────────────────────────
  border: {
    subtle:  '#21262d',
    default: '#30363d',
    strong:  '#484f58',
  },

  // ── Text ───────────────────────────────────────────────────────────
  text: {
    primary:  '#e6edf3',
    secondary:'#8b949e',
    muted:    '#6e7681',
    inverse:  '#0d1117',
  },

  // ── Accent (medical blue) ──────────────────────────────────────────
  accent: {
    primary: '#1f6feb',
    light:   '#388bfd',
    subtle:  '#1f3a5f',
  },

  // ── Risk level palette ─────────────────────────────────────────────
  risk: {
    low:    { bg: '#0d2a0d', border: '#1a4a1a', badge: '#2ea043', text: '#56d364', label: 'Faible' },
    medium: { bg: '#2d2000', border: '#5a3e00', badge: '#9e6a03', text: '#e3b341', label: 'Modéré' },
    high:   { bg: '#2d1b00', border: '#5a3600', badge: '#bd561d', text: '#f0883e', label: 'Élevé' },
    urgent: { bg: '#2d0c0c', border: '#5a1a1a', badge: '#da3633', text: '#ff7b72', label: 'Urgent' },
  },

  // ── SHAP contribution colours ──────────────────────────────────────
  shap: {
    positive: '#ff7b72',   // increases risk → red
    negative: '#56d364',   // decreases risk → green
  },

  // ── Status indicator ──────────────────────────────────────────────
  status: {
    online:  '#56d364',
    offline: '#ff7b72',
    syncing: '#e3b341',
  },
};

// ── Shared CSS-in-JS helpers ───────────────────────────────────────────
export const card = {
  background:   theme.bg.surface,
  border:       `1px solid ${theme.border.default}`,
  borderRadius: '12px',
  padding:      '20px',
};

export const inputBase = {
  background:   theme.bg.elevated,
  border:       `1px solid ${theme.border.default}`,
  borderRadius: '8px',
  color:        theme.text.primary,
  padding:      '9px 12px',
  fontSize:     '14px',
  width:        '100%',
  outline:      'none',
  transition:   'border-color 0.15s ease',
};
