import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, formatMoney, tierColor } from '../theme';

const DOT = 16;
const ROW_GAP = 6;

// Index of the tier a salary falls into, using the min/max range returned by the API.
export function tierIndexFor(salary, clusters) {
  if (!clusters?.length) return -1;
  const exact = clusters.findIndex((c) => salary >= c.min && salary <= c.max);
  if (exact !== -1) return exact;
  // Salary added after the analysis ran: fall back to the nearest centroid.
  let best = 0;
  clusters.forEach((c, i) => {
    if (Math.abs(salary - c.centroid) < Math.abs(salary - clusters[best].centroid)) best = i;
  });
  return best;
}

// Every employee is a dot on one salary axis. After analysis, dots take their tier colour
// and each tier's centroid is marked, so the k-means grouping is visible at a glance.
export default function SalarySpectrum({ employees, clusters }) {
  const [width, setWidth] = useState(0);
  const salaries = employees.map((e) => Number(e.salary)).filter(Number.isFinite);

  if (salaries.length === 0) {
    return <Text style={styles.empty}>Add employees to see the salary spread.</Text>;
  }

  const lo = Math.min(...salaries);
  const hi = Math.max(...salaries);
  const span = hi - lo || 1;
  const x = (s) => (hi === lo ? (width - DOT) / 2 : ((s - lo) / span) * (width - DOT));

  // Stack overlapping dots into rows so nobody is hidden.
  const rowsEnd = [];
  const dots = [...employees]
    .sort((a, b) => a.salary - b.salary)
    .map((e) => {
      const left = x(e.salary);
      let row = rowsEnd.findIndex((end) => left >= end + 2);
      if (row === -1) {
        row = rowsEnd.length;
        rowsEnd.push(left + DOT);
      } else {
        rowsEnd[row] = left + DOT;
      }
      return { id: e.id, left, row, tier: tierIndexFor(e.salary, clusters) };
    });
  const trackHeight = Math.max(rowsEnd.length, 2) * (DOT + ROW_GAP) + 40;

  return (
    <View>
      <View
        style={[styles.track, { height: trackHeight }]}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        accessibilityLabel={`Salary spread of ${employees.length} employees from ${formatMoney(lo)} to ${formatMoney(hi)}`}
      >
        <View style={[styles.axis, { top: trackHeight - 22 }]} />
        {width > 0 &&
          clusters?.map((c, i) => (
            <View
              key={`band-${c.group}`}
              style={[
                styles.band,
                {
                  left: x(c.min) - 4,
                  width: x(c.max) - x(c.min) + DOT + 8,
                  height: trackHeight - 22,
                  backgroundColor: tierColor(i),
                },
              ]}
            />
          ))}
        {width > 0 &&
          clusters?.map((c, i) => (
            <View key={c.group} style={[styles.centroid, { left: x(c.centroid) + DOT / 2 - 1, height: trackHeight - 22 }]}>
              <View style={[styles.centroidLine, { backgroundColor: tierColor(i) }]} />
            </View>
          ))}
        {width > 0 &&
          dots.map((d) => (
            <View
              key={d.id}
              style={[
                styles.dot,
                {
                  left: d.left,
                  bottom: 22 + 4 + d.row * (DOT + ROW_GAP),
                  backgroundColor: d.tier === -1 ? colors.inkFaint : tierColor(d.tier),
                },
              ]}
            />
          ))}
      </View>
      <View style={styles.axisLabels}>
        <Text style={styles.axisText}>{formatMoney(lo)}</Text>
        <Text style={styles.axisText}>{formatMoney(hi)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { position: 'relative', marginTop: 4 },
  axis: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: colors.line },
  dot: {
    position: 'absolute',
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 1.5,
    borderColor: colors.paper,
  },
  band: { position: 'absolute', top: 0, borderRadius: 8, opacity: 0.12 },
  centroid: { position: 'absolute', top: 0, width: 2, alignItems: 'center' },
  centroidLine: { width: 2, flex: 1, borderRadius: 1, opacity: 0.55 },
  axisLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -14 },
  axisText: { fontFamily: fonts.body, fontSize: 12, color: colors.inkFaint, fontVariant: ['tabular-nums'] },
  empty: { fontFamily: fonts.body, color: colors.inkMuted, paddingVertical: 12 },
});
