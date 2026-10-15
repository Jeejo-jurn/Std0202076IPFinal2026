import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Backend runs on port 3000 of the same machine that runs Metro.
// On a phone (Expo Go) we reuse the Metro host IP; on web/emulator fall back to localhost.
function resolveBaseUrl() {
  const hostUri = Constants.expoConfig?.hostUri; // e.g. "192.168.1.10:8081"
  if (Platform.OS !== 'web' && hostUri) {
    return `http://${hostUri.split(':')[0]}:3000/api`;
  }
  if (Platform.OS === 'android') return 'http://10.0.2.2:3000/api';
  return 'http://localhost:3000/api';
}

export const BASE_URL = resolveBaseUrl();

let authToken = null;
export const setToken = (token) => {
  authToken = token;
};

async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error(`Cannot reach the server at ${BASE_URL}. Make sure the backend is running.`);
  } finally {
    clearTimeout(timer);
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    // empty / non-JSON body
  }
  if (!res.ok) {
    throw new Error(data?.message || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  login: (username, password) =>
    request('/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  getEmployees: () => request('/employees'),
  addEmployee: (employee) =>
    request('/employees', { method: 'POST', body: JSON.stringify(employee) }),
  toggleStatus: (id) => request(`/employees/${id}/status`, { method: 'PUT' }),
  deleteEmployee: (id) => request(`/employees/${id}`, { method: 'DELETE' }),
  getSalaryClusters: () => request('/employees/salary-clusters'),
};
