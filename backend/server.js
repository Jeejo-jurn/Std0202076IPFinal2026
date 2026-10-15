const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const VALID_USERNAME = 'admin';
const VALID_PASSWORD = 'password123';
const TOKEN = 'mock-jwt-token';

app.use(cors());
app.use(express.json());

// ---------- In-memory data ----------
let employees = [
  { id: '1', name: 'John Doe', position: 'Software Engineer', status: 'Active', salary: 45000 },
  { id: '2', name: 'Jane Smith', position: 'HR Manager', status: 'Active', salary: 52000 },
  { id: '3', name: 'Somchai Jaidee', position: 'Intern', status: 'On Leave', salary: 15000 },
  { id: '4', name: 'Alice Wong', position: 'Junior Developer', status: 'Active', salary: 22000 },
  { id: '5', name: 'Bob Brown', position: 'CTO', status: 'Active', salary: 90000 },
  { id: '6', name: 'Nida Srisuk', position: 'Engineering Manager', status: 'Active', salary: 80000 },
  { id: '7', name: 'Mark Lee', position: 'QA Engineer', status: 'On Leave', salary: 40000 },
];
let nextId = employees.length + 1;

// ---------- Auth ----------
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === VALID_USERNAME && password === VALID_PASSWORD) {
    return res.status(200).json({ success: true, token: TOKEN });
  }
  return res.status(401).json({ success: false, message: 'Invalid username or password' });
});

// Blocks requests without "Authorization: Bearer mock-jwt-token"
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token !== TOKEN) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
}

app.use('/api/employees', requireAuth);

// ---------- K-Means (1D) ----------
function kMeans1D(values, k = 3, maxIter = 100) {
  const sorted = [...values].sort((a, b) => a - b);
  const unique = [...new Set(sorted)];
  const kk = Math.min(k, unique.length);
  if (kk === 0) return [];

  // Deterministic init: spread centroids evenly across the unique sorted values
  let centroids = Array.from({ length: kk }, (_, i) =>
    kk === 1 ? unique[0] : unique[Math.round((i * (unique.length - 1)) / (kk - 1))]
  );

  let assignments = new Array(sorted.length).fill(0);
  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;
    // Assignment step
    for (let i = 0; i < sorted.length; i++) {
      let best = 0;
      for (let c = 1; c < kk; c++) {
        if (Math.abs(sorted[i] - centroids[c]) < Math.abs(sorted[i] - centroids[best])) best = c;
      }
      if (assignments[i] !== best) {
        assignments[i] = best;
        changed = true;
      }
    }
    // Update step (keep old centroid if a cluster becomes empty)
    const newCentroids = centroids.map((old, c) => {
      const members = sorted.filter((_, i) => assignments[i] === c);
      return members.length ? members.reduce((s, v) => s + v, 0) / members.length : old;
    });
    const moved = newCentroids.some((v, c) => v !== centroids[c]);
    centroids = newCentroids;
    if (!changed && !moved && iter > 0) break;
  }

  return centroids
    .map((centroid, c) => ({
      centroid,
      count: assignments.filter((a) => a === c).length,
    }))
    .filter((cl) => cl.count > 0)
    .sort((a, b) => a.centroid - b.centroid)
    .map((cl, i) => ({
      group: `Tier ${i + 1}`,
      centroid: Math.round(cl.centroid * 100) / 100,
      count: cl.count,
    }));
}

// Must be declared before /:id routes
app.get('/api/employees/salary-clusters', (req, res) => {
  try {
    const salaries = employees
      .map((e) => Number(e.salary))
      .filter((s) => Number.isFinite(s));
    const clusters = kMeans1D(salaries, 3);
    return res.status(200).json({ success: true, clusters });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to compute clusters' });
  }
});

// ---------- CRUD ----------
app.get('/api/employees', (req, res) => {
  res.status(200).json(employees);
});

app.post('/api/employees', (req, res) => {
  const { name, position, salary } = req.body || {};
  const isEmpty = (v) => v === undefined || v === null || String(v).trim() === '';

  if (isEmpty(name) || isEmpty(position) || isEmpty(salary)) {
    return res.status(400).json({ success: false, message: 'name, position and salary are required' });
  }
  const salaryNum = Number(salary);
  if (!Number.isFinite(salaryNum) || salaryNum < 0) {
    return res.status(400).json({ success: false, message: 'salary must be a non-negative number' });
  }

  const employee = {
    id: String(nextId++),
    name: String(name).trim(),
    position: String(position).trim(),
    status: 'Active',
    salary: salaryNum,
  };
  employees.push(employee);
  return res.status(201).json(employee);
});

app.put('/api/employees/:id/status', (req, res) => {
  const employee = employees.find((e) => e.id === req.params.id);
  if (!employee) {
    return res.status(404).json({ success: false, message: 'Employee not found' });
  }
  employee.status = employee.status === 'Active' ? 'On Leave' : 'Active';
  return res.status(200).json(employee);
});

app.delete('/api/employees/:id', (req, res) => {
  const index = employees.findIndex((e) => e.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Employee not found' });
  }
  const [removed] = employees.splice(index, 1);
  return res.status(200).json({ success: true, deleted: removed });
});

// ---------- Fallbacks ----------
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Handles malformed JSON bodies etc.
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid JSON body' });
  }
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`HR backend running on http://localhost:${PORT}`);
});
