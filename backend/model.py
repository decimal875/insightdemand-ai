import pandas as pd
import numpy as np
from prophet import Prophet


# ---------------------------------------------------------------------------
# HELPER: parse the date column tolerantly
# ---------------------------------------------------------------------------
def _parse_dates(series: pd.Series) -> pd.Series:
    for fmt in ("%d-%m-%Y %H:%M", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d"):
        try:
            return pd.to_datetime(series, format=fmt)
        except (ValueError, TypeError):
            pass
    return pd.to_datetime(series, infer_datetime_format=True)


# ---------------------------------------------------------------------------
# MAIN FORECAST FUNCTION
# ---------------------------------------------------------------------------
def generate_forecast(data_path: str = "data.csv", forecast_days: int = 30, category: str = None) -> pd.DataFrame:
    """
    Loads the FMCG dataset, engineers rich features from ALL available columns,
    trains a Prophet model with regressors, and returns a merged DataFrame with:
        ds, Predicted_Demand, Stock, Risk,
        Avg_Revenue, Avg_Margin_Pct, Dominant_Category,
        Dominant_Channel, Avg_Lead_Time, Avg_Customer_Age,
        Loyalty_Rate, High_Risk_Reorder_Flag
    """

    # ------------------------------------------------------------------
    # 1. LOAD
    # ------------------------------------------------------------------
    df = pd.read_csv(data_path)

    # ---------------------------------------------------
    # CATEGORY FILTER
    # ---------------------------------------------------
    if category and category != "All":
        df = df[df["Category"] == category]

    # Safety check
    if df.empty:
        raise ValueError(f"No data available for category: {category}")

    # ------------------------------------------------------------------
    # 2. DATE PARSING  →  date-only column
    # ------------------------------------------------------------------
    df["Invoice_Date"] = _parse_dates(df["Invoice_Date"])
    df["date"] = df["Invoice_Date"].dt.date
    df["date"] = pd.to_datetime(df["date"])

    # ------------------------------------------------------------------
    # 3. DAILY AGGREGATIONS  (all numeric + categorical columns)
    # ------------------------------------------------------------------

    # Core time-series target
    daily_units = (
        df.groupby("date")["Units"]
        .sum()
        .reset_index()
        .rename(columns={"date": "ds", "Units": "y"})
    )

    # Revenue & margin regressors
    daily_revenue = df.groupby("date").agg(
        Avg_Revenue=("Revenue", "mean"),
        Avg_Cost=("Cost", "mean"),
        Avg_Margin_Pct=("Margin_%", "mean"),
        Total_Revenue=("Revenue", "sum"),
    ).reset_index().rename(columns={"date": "ds"})

    # Price signals
    daily_price = df.groupby("date").agg(
        Avg_Selling_Price=("Selling_Price", "mean"),
        Avg_Cost_Price=("Cost_Price", "mean"),
    ).reset_index().rename(columns={"date": "ds"})

    # Inventory signals
    daily_inventory = df.groupby("date").agg(
        Stock_On_Hand=("Stock_On_Hand", "min"),
        Avg_Reorder_Level=("Reorder_Level", "mean"),
        Avg_Lead_Time=("Lead_Time_Days", "mean"),
    ).reset_index().rename(columns={"date": "ds"})

    # Customer signals
    daily_customer = df.groupby("date").agg(
        Avg_Customer_Age=("Customer_Age", "mean"),
        Loyalty_Rate=("Loyalty_Flag", "mean"),   # fraction of loyal customers
    ).reset_index().rename(columns={"date": "ds"})

    # Categorical dominant values (mode per day)
    daily_cat = (
        df.groupby("date")[["Category", "Channel"]]
        .agg(lambda x: x.mode().iloc[0] if len(x) > 0 else np.nan)
        .reset_index()
        .rename(columns={"date": "ds", "Category": "Dominant_Category", "Channel": "Dominant_Channel"})
    )

    # Binary flags
    df["high_risk_reorder"] = (df["Stock_On_Hand"] < df["Reorder_Level"]).astype(int)
    daily_flags = df.groupby("date").agg(
        High_Risk_Reorder_Flag=("high_risk_reorder", "mean"),  # fraction of SKUs below reorder
    ).reset_index().rename(columns={"date": "ds"})

    # ------------------------------------------------------------------
    # 4. MERGE ALL DAILY SIGNALS
    # ------------------------------------------------------------------
    merged = daily_units.copy()
    for frame in [daily_revenue, daily_price, daily_inventory, daily_customer, daily_cat, daily_flags]:
        merged = merged.merge(frame, on="ds", how="left")

    merged = merged.sort_values("ds").reset_index(drop=True)

    # Fill any NaNs in regressor columns with forward-fill then median
    regressor_cols = [
        "Avg_Revenue", "Avg_Cost", "Avg_Margin_Pct", "Total_Revenue",
        "Avg_Selling_Price", "Avg_Cost_Price",
        "Stock_On_Hand", "Avg_Reorder_Level", "Avg_Lead_Time",
        "Avg_Customer_Age", "Loyalty_Rate", "High_Risk_Reorder_Flag",
    ]
    for col in regressor_cols:
        merged[col] = merged[col].fillna(method="ffill").fillna(merged[col].median())

    # ------------------------------------------------------------------
    # 5. PROPHET MODEL WITH REGRESSORS
    # ------------------------------------------------------------------
    model = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=True,
        daily_seasonality=False,
        seasonality_mode="multiplicative",
        changepoint_prior_scale=0.1,
    )

    # Add numerical regressors
    for col in regressor_cols:
        model.add_regressor(col)

    model.fit(merged[["ds", "y"] + regressor_cols])

    # ------------------------------------------------------------------
    # 6. FUTURE DATAFRAME  — carry last known regressor values forward
    # ------------------------------------------------------------------
    future = model.make_future_dataframe(periods=forecast_days)

    last_known = merged.iloc[-1]
    for col in regressor_cols:
        future[col] = future["ds"].map(
            merged.set_index("ds")[col]
        ).fillna(last_known[col])

    # ------------------------------------------------------------------
    # 7. PREDICT
    # ------------------------------------------------------------------
    forecast = model.predict(future)
    forecast_df = forecast[["ds", "yhat"]].copy()
    forecast_df.rename(columns={"yhat": "Predicted_Demand"}, inplace=True)
    forecast_df["Predicted_Demand"] = forecast_df["Predicted_Demand"].clip(lower=0).round(2)

    # ------------------------------------------------------------------
    # 8. MERGE BACK INVENTORY + ENRICHMENT COLUMNS
    # ------------------------------------------------------------------
    enrichment = merged[["ds", "Stock_On_Hand", "Avg_Revenue", "Avg_Margin_Pct",
                          "Dominant_Category", "Dominant_Channel",
                          "Avg_Lead_Time", "Avg_Customer_Age",
                          "Loyalty_Rate", "High_Risk_Reorder_Flag"]].copy()

    enrichment.rename(columns={"Stock_On_Hand": "Stock"}, inplace=True)

    final_df = forecast_df.merge(enrichment, on="ds", how="left")

    # Forward-fill stock and enrichment into future dates
    for col in ["Stock", "Avg_Revenue", "Avg_Margin_Pct", "Avg_Lead_Time",
                "Avg_Customer_Age", "Loyalty_Rate", "High_Risk_Reorder_Flag"]:
        final_df[col] = final_df[col].fillna(method="ffill")

    final_df["Dominant_Category"] = final_df["Dominant_Category"].fillna("N/A")
    final_df["Dominant_Channel"] = final_df["Dominant_Channel"].fillna("N/A")

    # ------------------------------------------------------------------
    # 9. RISK CLASSIFICATION
    # ------------------------------------------------------------------
    final_df["Risk"] = final_df.apply(
        lambda x: "High" if x["Predicted_Demand"] > x["Stock"] else "Low",
        axis=1,
    )

    # ------------------------------------------------------------------
    # 10. ROUND & CLEAN
    # ------------------------------------------------------------------
    final_df["Stock"] = final_df["Stock"].round(2)
    final_df["Avg_Revenue"] = final_df["Avg_Revenue"].round(2)
    final_df["Avg_Margin_Pct"] = final_df["Avg_Margin_Pct"].round(4)
    final_df["Avg_Lead_Time"] = final_df["Avg_Lead_Time"].round(1)
    final_df["Avg_Customer_Age"] = final_df["Avg_Customer_Age"].round(1)
    final_df["Loyalty_Rate"] = final_df["Loyalty_Rate"].round(4)
    final_df["High_Risk_Reorder_Flag"] = final_df["High_Risk_Reorder_Flag"].round(4)

    return final_df
