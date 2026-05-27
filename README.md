# InsightDemand AI — Setup & Run Guide

## Project Structure

```
insightdemand/
├── backend/
│   ├── model.py          ← Prophet forecasting engine (all dataset columns)
│   ├── main.py           ← FastAPI server
│   ├── requirements.txt  ← Python dependencies
│   └── data.csv          ← ⚠️  PLACE YOUR DATASET HERE (rename to data.csv)
└── frontend/
    ├── src/
    │   ├── App.jsx       ← Full React dashboard
    │   └── main.jsx      ← Entry point
    ├── index.html
    ├── package.json
    └── vite.config.js
```

---

## Prerequisites

| Tool     | Version | Check command          |
|----------|---------|------------------------|
| Python   | 3.9–3.11| `python --version`     |
| Node.js  | 18+     | `node --version`       |
| npm      | 9+      | `npm --version`        |

---

## Step 1 — Place the Dataset

Copy your CSV file into the `backend/` folder and rename it to `data.csv`:

```
backend/data.csv
```

The model expects these columns (all 21 from the Indian FMCG dataset):
`Invoice_ID, Invoice_Date, City, Store_Format, Category, Brand, Channel,
Payment_Mode, Units, Cost_Price, Selling_Price, Revenue, Cost, Margin,
Margin_%, Stock_On_Hand, Reorder_Level, Lead_Time_Days, Customer_Age,
Customer_Gender, Loyalty_Flag`

---

## Step 2 — Set Up the Python Backend

### 2a. Open a terminal and navigate to the backend folder
```bash
cd insightdemand/backend
```

### 2b. Create a virtual environment (strongly recommended)
```bash
# macOS / Linux
python -m venv venv
source venv/bin/activate

# Windows (Command Prompt)
python -m venv venv
venv\Scripts\activate

# Windows (PowerShell)
python -m venv venv
venv\Scripts\Activate.ps1
```

### 2c. Install Python dependencies
```bash
pip install -r requirements.txt
```

> ⚠️  Prophet requires a C++ compiler on some systems:
> - **Windows**: Install Visual C++ Build Tools from https://visualstudio.microsoft.com/visual-cpp-build-tools/
> - **macOS**: Run `xcode-select --install`
> - **Linux (Ubuntu/Debian)**: Run `sudo apt install build-essential`

### 2d. Start the FastAPI server
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

> 📌 The first request trains the Prophet model — this takes ~30–60 seconds.
> Subsequent requests are instant (model is cached in memory).

### Optional: Change forecast window
```bash
FORECAST_DAYS=60 uvicorn main:app --reload --port 8000
```

---

## Step 3 — Set Up the React Frontend

### 3a. Open a NEW terminal and navigate to the frontend folder
```bash
cd insightdemand/frontend
```

### 3b. Install Node dependencies
```bash
npm install
```

### 3c. Start the React dev server
```bash
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in Xms
  ➜  Local:   http://localhost:3000/
```

---

## Step 4 — Open the Dashboard

Open your browser and go to:
```
http://localhost:3000
```

- If the backend is running → dashboard shows a **"● Live API"** green badge (top-right)
- If the backend is offline → dashboard shows **"● Mock Data"** and uses built-in sample data

---

## API Reference

Once the backend is running, you can also hit the APIs directly:

| Endpoint        | Method | Description                            |
|-----------------|--------|----------------------------------------|
| `/`             | GET    | Health check                           |
| `/forecast`     | GET    | Full forecast rows (supports filters)  |
| `/summary`      | GET    | KPI metrics for the Overview dashboard |
| `/categories`   | GET    | Unique categories & channels           |
| `/refresh`      | POST   | Clear cache and re-train model         |
| `/docs`         | GET    | Interactive Swagger UI                 |

### Filter examples
```
GET /forecast?start_date=2024-05-01&end_date=2024-06-30
GET /forecast?risk=High
GET /forecast?start_date=2024-05-01&risk=High
```

### Interactive API docs
```
http://localhost:8000/docs
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `ModuleNotFoundError: prophet` | Run `pip install prophet` inside the venv |
| Prophet install fails on Windows | Install Visual C++ Build Tools (link above) |
| `CORS error` in browser | Ensure backend runs on port 8000 |
| Dashboard shows Mock Data | Backend not running — check Step 2d |
| Slow first load | Normal — Prophet is training (~30–60s) |
| `node: command not found` | Install Node.js from https://nodejs.org |

---

## Production Build (optional)

To build a static frontend for deployment:
```bash
cd frontend
npm run build
# Output is in frontend/dist/
```

Serve the dist folder with any static host (Nginx, Netlify, Vercel, etc.)
and point `API_BASE` in `App.jsx` to your deployed backend URL.
