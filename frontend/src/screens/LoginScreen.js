import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api, setToken } from '../api';
import { showAlert } from '../alert';
import { Button, Field } from '../components/ui';
import { colors, fonts, radius } from '../theme';

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      showAlert('Login Failed', 'Enter both your username and password.');
      return;
    }
    setLoading(true);
    try {
      const data = await api.login(username.trim(), password);
      setToken(data.token);
      setPassword('');
      navigation.replace('Dashboard');
    } catch (err) {
      showAlert('Login Failed', err.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <Text style={styles.brandName}>HR Manager</Text>
          <Text style={styles.brandLine}>People, status and pay in one place.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Sign in</Text>
          <Field
            label="Username"
            placeholder="Username"
            autoCapitalize="none"
            autoCorrect={false}
            value={username}
            onChangeText={setUsername}
          />
          <Field
            label="Password"
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={handleLogin}
          />
          <Button title="Login" onPress={handleLogin} loading={loading} style={{ marginTop: 6 }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.forestDeep },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  brand: { width: '100%', maxWidth: 400, marginBottom: 28 },
  brandName: { fontFamily: fonts.display, fontSize: 44, lineHeight: 48, color: '#fff', letterSpacing: -1 },
  brandLine: { fontFamily: fonts.body, fontSize: 16, color: '#B9D6CB', marginTop: 8 },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.paper,
    borderRadius: radius.lg,
    padding: 24,
  },
  title: { fontFamily: fonts.displaySemi, fontSize: 22, color: colors.ink, marginBottom: 18 },
});
