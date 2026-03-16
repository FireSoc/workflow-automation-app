# Agile — Onboarding Ops Co-pilot

![Agile logo](frontend/public/agile-logo.png)

An AI-assisted onboarding ops co-pilot that helps teams run and automate customer onboarding workflows: playbook-driven projects, risk and next-best actions, and a single place to see what needs attention.

**Audience:** CS, onboarding, and implementation teams who turn won deals into structured onboarding projects and want to avoid stalls and missed go-lives.

| Layer   | Stack |
|--------|--------|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS, TanStack Query, React Router |
| Backend  | FastAPI, SQLAlchemy 2, Pydantic v2, SQLite |

---

## Running locally

Run **backend first**, then the **frontend**. Use the directories below; do not run from repo root.

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

- API: **http://127.0.0.1:8000**  
- Docs: **http://127.0.0.1:8000/docs**  
- SQLite DB is created on first start.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

- App: **http://localhost:5173**

`package.json` is in `frontend/`; running `npm run dev` from the repo root will fail.

### 3. Seed data (optional)

With both running, use **Seed Database** on the dashboard, or:

```bash
curl -X POST http://127.0.0.1:8000/seed
```

---

See `PRODUCT_FOCUS.md` for product direction and `frontend/README.md` and `backend/README.md` for detailed setup and structure.
