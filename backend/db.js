// Employee storage: MySQL when DB_HOST is set (see .env), otherwise in-memory.
const SEED = [
  { name: 'John Doe', position: 'Software Engineer', status: 'Active', salary: 45000 },
  { name: 'Jane Smith', position: 'HR Manager', status: 'Active', salary: 52000 },
  { name: 'Somchai Jaidee', position: 'Intern', status: 'On Leave', salary: 15000 },
  { name: 'Alice Wong', position: 'Junior Developer', status: 'Active', salary: 22000 },
  { name: 'Bob Brown', position: 'CTO', status: 'Active', salary: 90000 },
  { name: 'Nida Srisuk', position: 'Engineering Manager', status: 'Active', salary: 80000 },
  { name: 'Mark Lee', position: 'QA Engineer', status: 'On Leave', salary: 40000 },
];

const toggled = (status) => (status === 'Active' ? 'On Leave' : 'Active');

// ---------- In-memory ----------
function createMemoryStore() {
  const employees = SEED.map((e, i) => ({ id: String(i + 1), ...e }));
  let nextId = employees.length + 1;

  return {
    kind: 'memory',
    async init() {},
    async list() {
      return employees;
    },
    async create({ name, position, salary }) {
      const employee = { id: String(nextId++), name, position, status: 'Active', salary };
      employees.push(employee);
      return employee;
    },
    async toggleStatus(id) {
      const employee = employees.find((e) => e.id === id);
      if (!employee) return null;
      employee.status = toggled(employee.status);
      return employee;
    },
    async remove(id) {
      const index = employees.findIndex((e) => e.id === id);
      if (index === -1) return null;
      return employees.splice(index, 1)[0];
    },
  };
}

// ---------- MySQL ----------
// Exam rule: table and every column are prefixed with the student's name (Jeejo Jurn -> JeeJur_)
const P = 'JeeJur_';
const T = `${P}employees`;
const COLS = ['id', 'name', 'position', 'status', 'salary'];

function createMysqlStore() {
  const mysql = require('mysql2/promise');
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 5,
    connectTimeout: 10000,
  });

  const fromRow = (r) => ({
    id: String(r[`${P}id`]),
    name: r[`${P}name`],
    position: r[`${P}position`],
    status: r[`${P}status`],
    salary: Number(r[`${P}salary`]),
  });

  async function findById(id) {
    const [rows] = await pool.query(`SELECT * FROM ${T} WHERE ${P}id = ?`, [id]);
    return rows.length ? fromRow(rows[0]) : null;
  }

  return {
    kind: 'mysql',
    async init() {
      // Rename the table created earlier without the prefix (keeps existing rows)
      const [[{ oldT }]] = await pool.query(
        `SELECT COUNT(*) AS oldT FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name = 'employees'`
      );
      const [[{ newT }]] = await pool.query(
        `SELECT COUNT(*) AS newT FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name = ?`,
        [T]
      );
      if (oldT && !newT) await pool.query(`RENAME TABLE employees TO ${T}`);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS ${T} (
          ${P}id INT AUTO_INCREMENT PRIMARY KEY,
          ${P}name VARCHAR(100) NOT NULL,
          ${P}position VARCHAR(100) NOT NULL,
          ${P}status ENUM('Active', 'On Leave') NOT NULL DEFAULT 'Active',
          ${P}salary DECIMAL(12, 2) NOT NULL
        ) CHARACTER SET utf8mb4`);
      // Upgrade a table created earlier without the prefix (keeps existing rows)
      const [existing] = await pool.query(`SHOW COLUMNS FROM ${T}`);
      const names = existing.map((c) => c.Field);
      const renames = COLS.filter((c) => names.includes(c) && !names.includes(P + c)).map(
        (c) => `RENAME COLUMN ${c} TO ${P}${c}`
      );
      if (renames.length) await pool.query(`ALTER TABLE ${T} ${renames.join(', ')}`);

      const [[{ n }]] = await pool.query(`SELECT COUNT(*) AS n FROM ${T}`);
      if (n === 0) {
        await pool.query(
          `INSERT INTO ${T} (${P}name, ${P}position, ${P}status, ${P}salary) VALUES ?`,
          [SEED.map((e) => [e.name, e.position, e.status, e.salary])]
        );
      }
    },
    async list() {
      const [rows] = await pool.query(`SELECT * FROM ${T} ORDER BY ${P}id`);
      return rows.map(fromRow);
    },
    async create({ name, position, salary }) {
      const [result] = await pool.query(
        `INSERT INTO ${T} (${P}name, ${P}position, ${P}status, ${P}salary) VALUES (?, ?, ?, ?)`,
        [name, position, 'Active', salary]
      );
      return findById(result.insertId);
    },
    async toggleStatus(id) {
      const employee = await findById(id);
      if (!employee) return null;
      await pool.query(`UPDATE ${T} SET ${P}status = ? WHERE ${P}id = ?`, [toggled(employee.status), id]);
      return findById(id);
    },
    async remove(id) {
      const employee = await findById(id);
      if (!employee) return null;
      await pool.query(`DELETE FROM ${T} WHERE ${P}id = ?`, [id]);
      return employee;
    },
  };
}

module.exports = process.env.DB_HOST ? createMysqlStore() : createMemoryStore();
