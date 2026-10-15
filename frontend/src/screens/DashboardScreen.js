import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { api, setToken } from '../api';
import { confirmAlert, showAlert } from '../alert';

const formatMoney = (n) =>
  Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });

export default function DashboardScreen({ navigation }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [salary, setSalary] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [clusters, setClusters] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

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
    const salaryNum = Number(salary);
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
    try {
      await api.toggleStatus(id);
      await fetchEmployees();
    } catch (err) {
      showAlert('Error', err.message);
    }
  };

  const handleDelete = (employee) => {
    confirmAlert('Delete Employee', `Are you sure you want to delete ${employee.name}?`, async () => {
      try {
        await api.deleteEmployee(employee.id);
        setClusters(null);
        await fetchEmployees();
      } catch (err) {
        showAlert('Error', err.message);
      }
    });
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setClusters(null);
    try {
      const data = await api.getSalaryClusters();
      setClusters(data.clusters || []);
    } catch (err) {
      showAlert('Error', err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const renderEmployee = ({ item }) => {
    const active = item.status === 'Active';
    return (
      <View style={styles.employeeCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.employeeName}>{item.name}</Text>
          <Text style={styles.employeeMeta}>{item.position}</Text>
          <Text style={styles.employeeMeta}>Salary: {formatMoney(item.salary)}</Text>
          <View style={[styles.badge, active ? styles.badgeActive : styles.badgeLeave]}>
            <Text style={styles.badgeText}>{item.status}</Text>
          </View>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.smallBtn, styles.toggleBtn]} onPress={() => handleToggle(item.id)}>
            <Text style={styles.smallBtnText}>Toggle Status</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.smallBtn, styles.deleteBtn]} onPress={() => handleDelete(item)}>
            <Text style={styles.smallBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const header = (
    <View>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Employees ({employees.length})</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logout}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Add Employee form */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Add Employee</Text>
        <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Position" value={position} onChangeText={setPosition} />
        <TextInput
          style={styles.input}
          placeholder="Salary"
          keyboardType="numeric"
          value={salary}
          onChangeText={setSalary}
        />
        <TouchableOpacity style={styles.primaryBtn} onPress={handleAdd} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Add Employee</Text>}
        </TouchableOpacity>
      </View>

      {/* Salary analytics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Salary Analytics (K-Means, k=3)</Text>
        <TouchableOpacity
          style={[styles.primaryBtn, styles.analyzeBtn]}
          onPress={handleAnalyze}
          disabled={analyzing}
        >
          <Text style={styles.primaryBtnText}>Analyze Salary Structure</Text>
        </TouchableOpacity>

        {analyzing && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#7c3aed" />
            <Text style={styles.loadingText}>Analyzing salaries...</Text>
          </View>
        )}

        {!analyzing && clusters && clusters.length === 0 && (
          <Text style={styles.empty}>No salary data to analyze.</Text>
        )}

        {!analyzing && clusters && clusters.length > 0 && (
          <View style={styles.clusterRow}>
            {clusters.map((c) => (
              <View key={c.group} style={styles.clusterCard}>
                <Text style={styles.clusterTier}>{c.group}</Text>
                <Text style={styles.clusterLabel}>Employees</Text>
                <Text style={styles.clusterValue}>{c.count}</Text>
                <Text style={styles.clusterLabel}>Avg. Salary</Text>
                <Text style={styles.clusterValue}>{formatMoney(c.centroid)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <Text style={styles.sectionTitle}>Employee List</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      data={employees}
      keyExtractor={(item) => item.id}
      renderItem={renderEmployee}
      ListHeaderComponent={header}
      ListEmptyComponent={<Text style={styles.empty}>No employees found.</Text>}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      keyboardShouldPersistTaps="handled"
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  heading: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  logout: { color: '#dc2626', fontWeight: '600' },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 15 },
  primaryBtn: { backgroundColor: '#2563eb', padding: 12, borderRadius: 8, alignItems: 'center' },
  analyzeBtn: { backgroundColor: '#7c3aed' },
  primaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  loadingBox: { alignItems: 'center', paddingVertical: 20 },
  loadingText: { marginTop: 8, color: '#64748b' },
  clusterRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 12 },
  clusterCard: {
    width: '31%',
    minWidth: 95,
    backgroundColor: '#f5f3ff',
    borderColor: '#ddd6fe',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    alignItems: 'center',
  },
  clusterTier: { fontSize: 16, fontWeight: '700', color: '#5b21b6', marginBottom: 6 },
  clusterLabel: { fontSize: 12, color: '#64748b' },
  clusterValue: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  employeeCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
  },
  employeeName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  employeeMeta: { fontSize: 14, color: '#475569', marginTop: 2 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, marginTop: 6 },
  badgeActive: { backgroundColor: '#16a34a' },
  badgeLeave: { backgroundColor: '#f59e0b' },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  actions: { justifyContent: 'center', marginLeft: 8 },
  smallBtn: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 6, marginVertical: 4, alignItems: 'center' },
  toggleBtn: { backgroundColor: '#0ea5e9' },
  deleteBtn: { backgroundColor: '#dc2626' },
  smallBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  empty: { textAlign: 'center', color: '#64748b', marginVertical: 16 },
});
