import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, setToken } from '../api';
import { confirmAlert, showAlert } from '../alert';
import { Button, Field, StatusPill } from '../components/ui';
import SalarySpectrum, { tierIndexFor } from '../components/SalarySpectrum';
import { colors, fonts, formatMoney, radius, tierColor } from '../theme';

const initials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

export default function DashboardScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const wide = width >= 960;

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [salary, setSalary] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [clusters, setClusters] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [busyId, setBusyId] = useState(null); // employee currently being toggled/deleted

  const fetchEmployees = useCallback(async () => {
    try {
      const data = await api.getEmployees();
      setEmployees(data);
    } catch (err) {
      showAlert('Error', err.message);
    }
  }, []);

  useEffect(() => {
    fetchEmployees().finally(() => setLoading(false));
  }, [fetchEmployees]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEmployees();
    setRefreshing(false);
  };

  const handleLogout = () => {
    setToken(null);
    navigation.replace('Login');
  };

  const handleAdd = async () => {
    // Client-side validation
    if (!name.trim() || !position.trim() || !salary.trim()) {
      showAlert('Validation Error', 'Please fill in name, position and salary.');
      return;
    }
    const salaryNum = Number(salary.replace(/[,\s]/g, '')); // accept "20,000"
    if (!Number.isFinite(salaryNum) || salaryNum < 0) {
      showAlert('Validation Error', 'Salary must be a valid non-negative number.');
      return;
    }

    setSubmitting(true);
    try {
      await api.addEmployee({ name: name.trim(), position: position.trim(), salary: salaryNum });
      setName('');
      setPosition('');
      setSalary('');
      setClusters(null); // data changed, old analysis is stale
      await fetchEmployees();
    } catch (err) {
      showAlert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id) => {
    setBusyId(id);
    try {
      await api.toggleStatus(id);
      await fetchEmployees();
    } catch (err) {
      showAlert('Error', err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = (employee) => {
    confirmAlert('Delete Employee', `Are you sure you want to delete ${employee.name}?`, async () => {
      setBusyId(employee.id);
      try {
        await api.deleteEmployee(employee.id);
        setClusters(null);
        await fetchEmployees();
      } catch (err) {
        showAlert('Error', err.message);
      } finally {
        setBusyId(null);
      }
    });
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setClusters(null);
    try {
      // Keep the loader visible briefly so it doesn't just flash on a fast local network
      const [data] = await Promise.all([
        api.getSalaryClusters(),
        new Promise((resolve) => setTimeout(resolve, 600)),
      ]);
      setClusters(data.clusters || []);
    } catch (err) {
      showAlert('Error', err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color={colors.forest} />
      </View>
    );
  }

  const onLeave = employees.filter((e) => e.status !== 'Active').length;

  const teamPanel = (
    <View style={styles.panel}>
      <View style={styles.panelHead}>
        <Text style={styles.panelTitle}>Team</Text>
        <Text style={styles.panelMeta}>
          {employees.length} {employees.length === 1 ? 'person' : 'people'}, {onLeave} on leave
        </Text>
      </View>

      {employees.length === 0 && (
        <Text style={styles.empty}>No employees yet. Add the first one with the form.</Text>
      )}

      {employees.map((item, i) => {
        const busy = busyId === item.id;
        const tier = clusters ? tierIndexFor(item.salary, clusters) : -1;
        return (
          <View key={item.id} style={[styles.row, i > 0 && styles.rowDivider]}>
            <View style={[styles.avatar, tier !== -1 && { backgroundColor: tierColor(tier) }]}>
              <Text style={[styles.avatarText, tier !== -1 && { color: '#fff' }]}>{initials(item.name)}</Text>
            </View>

            <View style={styles.rowMain}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.position} numberOfLines={1}>{item.position}</Text>
            </View>

            <View style={styles.rowMeta}>
              <Text style={styles.salary}>{formatMoney(item.salary)}</Text>
              <StatusPill status={item.status} />
            </View>

            <View style={[styles.rowActions, !wide && styles.rowActionsStacked]}>
              {busy ? (
                <ActivityIndicator color={colors.forest} style={{ width: 196 }} />
              ) : (
                <>
                  <Button title="Toggle Status" variant="secondary" size="sm" onPress={() => handleToggle(item.id)} />
                  <Button title="Delete" variant="danger" size="sm" onPress={() => handleDelete(item)} style={{ marginLeft: 8 }} />
                </>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );

  const addPanel = (
    <View style={styles.panel}>
      <Text style={[styles.panelTitle, { marginBottom: 14 }]}>Add employee</Text>
      <Field label="Name" placeholder="Name" value={name} onChangeText={setName} />
      <Field label="Position" placeholder="Position" value={position} onChangeText={setPosition} />
      <Field label="Salary" placeholder="Salary" keyboardType="numeric" value={salary} onChangeText={setSalary} />
      <Button title="Add Employee" onPress={handleAdd} loading={submitting} />
    </View>
  );

  const analyticsPanel = (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Salary structure</Text>
      <Text style={styles.panelHint}>
        Each dot is one employee. K-means groups the salaries into three pay tiers.
      </Text>

      <SalarySpectrum employees={employees} clusters={clusters} />

      <Button
        title="Analyze Salary Structure"
        onPress={handleAnalyze}
        disabled={analyzing}
        style={{ marginTop: 18 }}
      />

      {analyzing && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.forest} />
          <Text style={styles.loadingText}>Analyzing salaries...</Text>
        </View>
      )}

      {!analyzing && clusters && clusters.length === 0 && (
        <Text style={styles.empty}>No salary data to analyze.</Text>
      )}

      {!analyzing && clusters && clusters.length > 0 && (
        <View style={styles.tiers}>
          {clusters.map((c, i) => (
            <View key={c.group} style={[styles.tier, i > 0 && styles.tierDivider]}>
              <View style={styles.tierHead}>
                <View style={[styles.tierSwatch, { backgroundColor: tierColor(i) }]} />
                <Text style={styles.tierName}>{c.group}</Text>
              </View>
              <Text style={styles.tierAvg}>{formatMoney(c.centroid)}</Text>
              <Text style={styles.tierSub}>average salary</Text>
              <Text style={styles.tierSub}>
                {c.count} {c.count === 1 ? 'employee' : 'employees'}
              </Text>
              {c.min !== undefined && (
                <Text style={styles.tierRange}>
                  {formatMoney(c.min)} to {formatMoney(c.max)}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: insets.top + 14 }]}>
        <View style={styles.topInner}>
          <Text style={styles.brand}>HR Manager</Text>
          <Button title="Sign out" variant="secondary" size="sm" onPress={handleLogout} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inner}>
          {wide ? (
            <View style={styles.columns}>
              <View style={styles.colMain}>{teamPanel}</View>
              <View style={styles.colSide}>
                {addPanel}
                {analyticsPanel}
              </View>
            </View>
          ) : (
            <>
              {addPanel}
              {analyticsPanel}
              {teamPanel}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mist },
  center: { justifyContent: 'center', alignItems: 'center' },

  topBar: {
    backgroundColor: colors.paper,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  topInner: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: { fontFamily: fonts.display, fontSize: 22, color: colors.forest, letterSpacing: -0.5 },

  content: { padding: 16 },
  inner: { width: '100%', maxWidth: 1200, alignSelf: 'center' },
  columns: { flexDirection: 'row', alignItems: 'flex-start' },
  colMain: { flex: 1.5, marginRight: 20 },
  colSide: { flex: 1, minWidth: 360 },

  panel: {
    backgroundColor: colors.paper,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 20,
    marginBottom: 20,
  },
  panelHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: 8 },
  panelTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.ink, letterSpacing: -0.4 },
  panelMeta: { fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted },
  panelHint: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.inkMuted, marginTop: 4, marginBottom: 18 },

  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', paddingVertical: 14 },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.line },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.forest },
  rowMain: { flex: 1, minWidth: 120, marginRight: 12 },
  name: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.ink },
  position: { fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, marginTop: 2 },
  rowMeta: { alignItems: 'flex-end', marginRight: 16, minWidth: 90 },
  salary: {
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
    marginBottom: 4,
  },
  rowActions: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  rowActionsStacked: { width: '100%', paddingLeft: 52, marginTop: 10 },

  loadingBox: { alignItems: 'center', paddingVertical: 24 },
  loadingText: { fontFamily: fonts.body, marginTop: 10, color: colors.inkMuted },

  tiers: { flexDirection: 'row', marginTop: 18, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 16 },
  tier: { flex: 1, paddingRight: 8 },
  tierDivider: { borderLeftWidth: 1, borderLeftColor: colors.line, paddingLeft: 12 },
  tierHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  tierSwatch: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  tierName: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.ink },
  tierAvg: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.ink,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  tierSub: { fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted, marginTop: 2 },
  tierRange: { fontFamily: fonts.body, fontSize: 12, color: colors.inkFaint, marginTop: 6, fontVariant: ['tabular-nums'] },

  empty: { fontFamily: fonts.body, textAlign: 'center', color: colors.inkMuted, marginVertical: 16 },
});
