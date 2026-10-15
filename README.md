# HR Manager & Salary Analytics System — IP Final 2026

Full-stack app: **Express.js** backend (`backend/`) + **React Native / Expo** frontend (`frontend/`).

## 1. Run the backend (port 3000)

```bash
cd backend
npm install
npm start
```

Login: `admin` / `password123`

| Method | Endpoint | Notes |
|---|---|---|
| POST | `/api/login` | 200 `{success, token}` or 401 |
| GET | `/api/employees` | all employees |
| POST | `/api/employees` | body `{name, position, salary}`; 400 if any field is empty |
| PUT | `/api/employees/:id/status` | toggle Active <-> On Leave |
| DELETE | `/api/employees/:id` | remove employee |
| GET | `/api/employees/salary-clusters` | 1D K-Means (k=3) salary tiers |

All `/api/employees*` routes require the header `Authorization: Bearer mock-jwt-token` (otherwise 401).

Run the automated API tests (login, 401/400/404 handling, CRUD flow, K-Means edge cases):

```bash
cd backend
npm test
```

### K-Means (1D, k=3)
Salaries are sorted and the 3 starting centroids are spread evenly across the unique values (deterministic, same input -> same output). The algorithm alternates assignment (nearest centroid) and update (mean of members) until nothing changes. Tiers are sorted from lowest to highest pay. Each tier returns `group`, `centroid`, `count`, plus `min`/`max` salary. If there are fewer than 3 distinct salaries it returns fewer tiers, and with no data it returns an empty list. It never crashes.

## 2. Run the frontend (Expo / Metro)

```bash
cd frontend
npm install
npx expo start
```

- **Expo Go on a phone:** scan the QR code. The app automatically calls the backend on the same machine's IP (port 3000). The phone and the PC must be on the same Wi-Fi.
- **Web:** press `w`. **Android emulator:** press `a`. Both use `localhost` / `10.0.2.2`.

The API base URL is resolved in `frontend/src/api.js`. Change it there if needed.
