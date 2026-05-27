from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from model import generate_forecast
import pandas as pd
import os

app = FastAPI(
    title="InsightDemand AI — Backend API",
    description="FMCG Demand Intelligence & Stockout Risk Prediction System",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_cache: dict = {}
DATA_PATH     = os.environ.get("DATA_PATH",     "data.csv")
FORECAST_DAYS = int(os.environ.get("FORECAST_DAYS", "30"))


# def _get_forecast() -> pd.DataFrame:
#     if "df" not in _cache:
#         _cache["df"] = generate_forecast(data_path=DATA_PATH, forecast_days=FORECAST_DAYS)
#     return _cache["df"]

def _get_forecast(category: str = None) -> pd.DataFrame:

    cache_key = f"df_{category}"

    if cache_key not in _cache:
        _cache[cache_key] = generate_forecast(
            data_path=DATA_PATH,
            forecast_days=FORECAST_DAYS,
            category=category
        )

    return _cache[cache_key]


def _get_raw() -> pd.DataFrame:
    """Load raw CSV once and cache it separately (no model training needed)."""
    if "raw" not in _cache:
        _cache["raw"] = pd.read_csv(DATA_PATH)
    return _cache["raw"]


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
def home():
    return {"message": "InsightDemand AI — Demand Intelligence API is running ✅"}


# ── Forecast ──────────────────────────────────────────────────────────────────
@app.get("/forecast", tags=["Forecast"])
def get_forecast(
    category:  str = Query("All"),
    start_date: str = Query(None),
    end_date:   str = Query(None),
    risk:       str = Query(None),
):
    try:
        df = _get_forecast(category).copy()
        df["ds"] = df["ds"].astype(str)
        if start_date: df = df[df["ds"] >= start_date]
        if end_date:   df = df[df["ds"] <= end_date]
        if risk and risk in ("High", "Low"): df = df[df["Risk"] == risk]
        return df.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Summary ───────────────────────────────────────────────────────────────────
@app.get("/summary", tags=["Summary"])
def get_summary(category: str = Query("All")):
    try:
        df = _get_forecast(category).copy()
        total_demand       = round(float(df["Predicted_Demand"].sum()), 2)
        high_risk_days     = int((df["Risk"] == "High").sum())
        low_risk_days      = int((df["Risk"] == "Low").sum())
        avg_demand_per_day = round(float(df["Predicted_Demand"].mean()), 2)
        avg_stock          = round(float(df["Stock"].mean()), 2)
        avg_margin_pct     = round(float(df["Avg_Margin_Pct"].mean()) * 100, 2)
        avg_lead_time      = round(float(df["Avg_Lead_Time"].mean()), 1)
        avg_loyalty_rate   = round(float(df["Loyalty_Rate"].mean()) * 100, 2)
        avg_customer_age   = round(float(df["Avg_Customer_Age"].mean()), 1)
        n = len(df)
        if n >= 60:
            recent_avg = df.iloc[-30:]["Predicted_Demand"].mean()
            prior_avg  = df.iloc[-60:-30]["Predicted_Demand"].mean()
            demand_trend_pct = round(((recent_avg - prior_avg) / prior_avg) * 100, 1) if prior_avg else 0.0
        else:
            demand_trend_pct = 0.0
        return {
            "total_demand": total_demand, "high_risk_days": high_risk_days,
            "low_risk_days": low_risk_days, "avg_demand_per_day": avg_demand_per_day,
            "avg_stock": avg_stock, "avg_margin_pct": avg_margin_pct,
            "avg_lead_time_days": avg_lead_time, "avg_loyalty_rate_pct": avg_loyalty_rate,
            "avg_customer_age": avg_customer_age, "demand_trend_pct": demand_trend_pct,
            "category_distribution": df["Dominant_Category"].value_counts().to_dict(),
            "channel_distribution":  df["Dominant_Channel"].value_counts().to_dict(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Demographics ──────────────────────────────────────────────────────────────
@app.get("/demographics", tags=["Demographics"])
def get_demographics():
    """
    Returns consumer demographics data computed directly from the raw dataset:
    age group breakdown, category preferences per age group, channel distribution,
    gender split, payment modes, city-wise volume, brand popularity, and
    channel x category cross-tab.
    """
    try:
        df = _get_raw().copy()

        # ── Age group buckets
        def age_bucket(age):
            if age < 25:  return "18-24"
            if age < 35:  return "25-34"
            if age < 45:  return "35-44"
            if age < 55:  return "45-54"
            return "55+"

        df["Customer_Age"] = pd.to_numeric(df["Customer_Age"], errors="coerce")
        df = df.dropna(subset=["Customer_Age"])
        df["Age_Group"] = df["Customer_Age"].apply(age_bucket)

        total = len(df)

        # Age group distribution (count + pct)
        age_dist = (
            df["Age_Group"].value_counts()
            .reindex(["18-24","25-34","35-44","45-54","55+"], fill_value=0)
        )
        age_distribution = [
            {"group": g, "count": int(age_dist[g]), "pct": round(int(age_dist[g])*100/total,1)}
            for g in age_dist.index
        ]

        # Top categories per age group (by units)
        df["Units"] = pd.to_numeric(df["Units"], errors="coerce").fillna(0)
        cat_age = (
            df.groupby(["Age_Group","Category"])["Units"].sum()
            .reset_index()
            .sort_values(["Age_Group","Units"], ascending=[True,False])
        )
        age_category_prefs = {}
        for grp in ["18-24","25-34","35-44","45-54","55+"]:
            sub = cat_age[cat_age["Age_Group"]==grp]
            age_category_prefs[grp] = [
                {"category": row["Category"], "units": int(row["Units"])}
                for _, row in sub.head(8).iterrows()
            ]

        # Channel distribution
        ch = df["Channel"].value_counts()
        channel_distribution = [
            {"channel": k, "count": int(v), "pct": round(int(v)*100/total,1)}
            for k,v in ch.items()
        ]

        # Category distribution (total units)
        cat_units = df.groupby("Category")["Units"].sum().sort_values(ascending=False)
        category_distribution = [
            {"category": k, "units": int(v), "pct": round(int(v)*100/int(cat_units.sum()),1)}
            for k,v in cat_units.items()
        ]

        # Gender distribution
        gender = df["Customer_Gender"].value_counts()
        gender_distribution = [
            {"gender": {"M":"Male","F":"Female","O":"Other"}.get(k,k),
             "count": int(v), "pct": round(int(v)*100/total,1)}
            for k,v in gender.items() if k not in ("nan",)
        ]

        # Payment mode distribution
        pm = df["Payment_Mode"].value_counts()
        payment_distribution = [
            {"mode": k, "count": int(v), "pct": round(int(v)*100/total,1)}
            for k,v in pm.items()
        ]

        # City-wise units
        city_units = df.groupby("City")["Units"].sum().sort_values(ascending=False)
        city_distribution = [
            {"city": k, "units": int(v)}
            for k,v in city_units.items()
        ]

        # Brand popularity
        brand_units = df.groupby("Brand")["Units"].sum().sort_values(ascending=False)
        brand_distribution = [
            {"brand": k, "units": int(v)}
            for k,v in brand_units.items()
        ]

        # Channel x Category cross-tab (units)
        ch_cat = (
            df.groupby(["Channel","Category"])["Units"].sum()
            .reset_index()
            .sort_values(["Channel","Units"], ascending=[True,False])
        )
        channel_category = {}
        for ch_name in df["Channel"].unique():
            sub = ch_cat[ch_cat["Channel"]==ch_name]
            channel_category[ch_name] = [
                {"category": row["Category"], "units": int(row["Units"])}
                for _, row in sub.iterrows()
            ]

        # Loyalty split
        df["Loyalty_Flag"] = pd.to_numeric(df["Loyalty_Flag"], errors="coerce").fillna(0)
        loyal_pct    = round(df["Loyalty_Flag"].mean() * 100, 1)
        nonloyal_pct = round(100 - loyal_pct, 1)

        return {
            "age_distribution":     age_distribution,
            "age_category_prefs":   age_category_prefs,
            "channel_distribution": channel_distribution,
            "category_distribution":category_distribution,
            "gender_distribution":  gender_distribution,
            "payment_distribution": payment_distribution,
            "city_distribution":    city_distribution,
            "brand_distribution":   brand_distribution,
            "channel_category":     channel_category,
            "loyalty": {"loyal_pct": loyal_pct, "nonloyal_pct": nonloyal_pct},
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Filters / Admin ───────────────────────────────────────────────────────────
# @app.get("/categories", tags=["Filters"])
# def get_categories():
#     try:
#         df = _get_forecast()
#         return {
#             "categories": sorted(df["Dominant_Category"].dropna().unique().tolist()),
#             "channels":   sorted(df["Dominant_Channel"].dropna().unique().tolist()),
#         }
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

@app.get("/categories", tags=["Filters"])
def get_categories():

    try:

        raw_df = _get_raw()

        categories = sorted(
            raw_df["Category"]
            .dropna()
            .unique()
            .tolist()
        )

        channels = sorted(
            raw_df["Channel"]
            .dropna()
            .unique()
            .tolist()
        )

        return {
            "categories": ["All"] + categories,
            "channels": ["All"] + channels,
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@app.post("/refresh", tags=["Admin"])
def refresh_cache():
    _cache.clear()
    return {"message": "Cache cleared. Model will retrain on next request."}
