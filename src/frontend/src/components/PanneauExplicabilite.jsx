import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { theme } from '../theme/theme.js';
import { FEATURE_LABELS_FR } from '../data/domaine.js';

/**
 * PanneauExplicabilite — horizontal SHAP bar chart + narrative sentence.
 * Props:
 *   shap    array of { feature: string, valeur: number }
 *   maladie { label: string, color: string }
 */
export function PanneauExplicabilite({ shap, maladie }) {
  if (!shap || shap.length === 0) return null;

  // Sort by absolute value, take top 6
  const sorted = [...shap]
    .sort((a, b) => Math.abs(b.valeur) - Math.abs(a.valeur))
    .slice(0, 6);

  const chartData = sorted.map(s => ({
    name:   FEATURE_LABELS_FR[s.feature] || s.feature,
    valeur: parseFloat(s.valeur.toFixed(3)),
  }));

  // Auto-narrative
  const positifs = sorted.filter(s => s.valeur > 0).slice(0, 3);
  const negatifs = sorted.filter(s => s.valeur < 0).slice(0, 2);
  const topPositifs = positifs.map(s => FEATURE_LABELS_FR[s.feature] || s.feature).join(', ');
  const topNegatifs = negatifs.map(s => FEATURE_LABELS_FR[s.feature] || s.feature).join(', ');

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const v = payload[0].value;
    return (
      <div style={styles.tooltip}>
        <strong style={{ color: theme.text.primary }}>{payload[0].payload.name}</strong>
        <div style={{ color: v >= 0 ? theme.shap.positive : theme.shap.negative, marginTop: '4px' }}>
          {v >= 0 ? '▲ Augmente' : '▼ Réduit'} le risque : {Math.abs(v).toFixed(3)}
        </div>
      </div>
    );
  };

  const CustomLabel = ({ x, y, width, value, index }) => {
    const entry = chartData[index];
    const isPos = value >= 0;
    const lx    = isPos ? x + width + 4 : x + width - 4;
    const anchor= isPos ? 'start' : 'end';
    return (
      <text
        x={lx}
        y={y + 10}
        fill={isPos ? theme.shap.positive : theme.shap.negative}
        fontSize={11}
        textAnchor={anchor}
      >
        {value > 0 ? '+' : ''}{value}
      </text>
    );
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <i className="bx bx-bar-chart-alt-2" style={styles.headerIcon} />
        <span style={styles.headerLabel}>Facteurs contributifs principaux (SHAP)</span>
      </div>

      {/* Narrative */}
      <div style={styles.narrative}>
        <i className="bx bx-info-circle" style={{ color: theme.accent.light, fontSize: '15px', flexShrink: 0 }} />
        <span>
          Ce risque de <strong style={{ color: maladie.color }}>{maladie.label}</strong> est principalement
          {positifs.length > 0 && <> dû à : <strong style={{ color: theme.shap.positive }}>{topPositifs}</strong></>}
          {negatifs.length > 0 && <> — atténué par : <strong style={{ color: theme.shap.negative }}>{topNegatifs}</strong></>}.
        </span>
      </div>

      {/* Legend */}
      <div style={styles.legendRow}>
        <span style={{ ...styles.legendDot, background: theme.shap.positive }} />
        <span style={styles.legendLabel}>Augmente le risque</span>
        <span style={{ ...styles.legendDot, background: theme.shap.negative, marginLeft: '12px' }} />
        <span style={styles.legendLabel}>Réduit le risque</span>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={chartData.length * 36 + 24}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 64, left: 8, bottom: 4 }}
          barCategoryGap="22%"
        >
          <XAxis
            type="number"
            tick={{ fill: theme.text.muted, fontSize: 11 }}
            axisLine={{ stroke: theme.border.default }}
            tickLine={false}
            domain={['auto', 'auto']}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={148}
            tick={{ fill: theme.text.secondary, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: theme.bg.overlay }} />
          <ReferenceLine x={0} stroke={theme.border.strong} strokeWidth={1} />
          <Bar dataKey="valeur" radius={[0, 4, 4, 0]} label={<CustomLabel />}>
            {chartData.map((entry) => (
              <Cell
                key={entry.name}
                fill={entry.valeur >= 0 ? theme.shap.positive : theme.shap.negative}
                fillOpacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const styles = {
  wrapper: {
    borderTop:  `1px solid ${theme.border.subtle}`,
    padding:    '16px',
    background: theme.bg.elevated,
  },
  header: {
    display:    'flex',
    alignItems: 'center',
    gap:        '8px',
    marginBottom:'10px',
  },
  headerIcon: {
    color:    theme.accent.light,
    fontSize: '17px',
  },
  headerLabel: {
    fontSize:   '13px',
    fontWeight: '600',
    color:      theme.text.secondary,
    textTransform:'uppercase',
    letterSpacing:'0.04em',
  },
  narrative: {
    display:      'flex',
    gap:          '8px',
    alignItems:   'flex-start',
    background:   theme.bg.base,
    borderRadius: '8px',
    padding:      '10px 12px',
    marginBottom: '10px',
    fontSize:     '13px',
    color:        theme.text.secondary,
    lineHeight:   '1.5',
    border:       `1px solid ${theme.border.subtle}`,
  },
  legendRow: {
    display:      'flex',
    alignItems:   'center',
    gap:          '6px',
    marginBottom: '6px',
  },
  legendDot: {
    width:        '10px',
    height:       '10px',
    borderRadius: '50%',
    display:      'inline-block',
  },
  legendLabel: {
    fontSize: '12px',
    color:    theme.text.muted,
  },
  tooltip: {
    background:   theme.bg.elevated,
    border:       `1px solid ${theme.border.strong}`,
    borderRadius: '8px',
    padding:      '10px 14px',
    fontSize:     '13px',
  },
};
