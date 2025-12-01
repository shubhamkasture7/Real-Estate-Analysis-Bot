import json
import re

import pandas as pd  # 👈 IMPORTANT: this fixes the 'pd is not defined' error

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .data_loader import (
    DATAFRAME,
    AREAS,
    LOCALITY_COL,
    YEAR_COL,
    PRICE_COL,
    DEMAND_COL,
)


def ping(request):
    return JsonResponse({"message": "Backend is working ✅"})


@csrf_exempt
def handle_query(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed"}, status=405)

    if DATAFRAME is None:
        return JsonResponse(


            
            {"error": "Data not loaded. Check Excel path on server."},
            status=500,
        )

    # --------------------
    # Parse JSON body
    # --------------------
    try:
        body = json.loads(request.body.decode("utf-8"))
        user_query = (body.get("query") or "").strip()
    except Exception:
        return JsonResponse({"error": "Invalid JSON body"}, status=400)

    if not user_query:
        return JsonResponse({"error": "Query is required"}, status=400)

    q_lower = user_query.lower()

    # --------------------
    # Determine metric
    # --------------------
    # Default: price = flat weighted rate, demand = total units
    if "demand" in q_lower:
        metric_name = "demand"
        metric_col = DEMAND_COL
    else:
        # treat everything else as "price" queries by default
        metric_name = "price"
        metric_col = PRICE_COL

    if metric_col not in DATAFRAME.columns:
        return JsonResponse(
            {"error": f"Metric column '{metric_col}' not found in dataset."},
            status=500,
        )

    # --------------------
    # Extract localities (areas) from query
    # --------------------
    found_areas = []
    for area in AREAS:
        if area.lower() in q_lower:
            found_areas.append(area)

    # Remove duplicates, preserve order
    seen = set()
    unique_areas = []
    for a in found_areas:
        if a not in seen:
            seen.add(a)
            unique_areas.append(a)

    if not unique_areas:
        return JsonResponse(
            {
                "error": "No known locality found in query.",
                "hint": "Try including names like Wakad, Akurdi, Ambegaon Budruk, Aundh, etc.",
                "known_areas_sample": AREAS[:10],
            },
            status=400,
        )

    # For now: single-area analysis (first locality found)
    area = unique_areas[0]

    df = DATAFRAME.copy()

    # Filter by locality
    df_area = df[df[LOCALITY_COL].astype(str).str.strip() == area]

    if df_area.empty:
        return JsonResponse(
            {"error": f"No data found for locality '{area}'."},
            status=404,
        )

    # --------------------
    # Optional: handle "last N years"
    # e.g. "last 3 years"
    # --------------------
    years = sorted(
        y for y in df_area[YEAR_COL].dropna().unique().tolist()
    )
    if not years:
        return JsonResponse(
            {"error": f"No valid year data for locality '{area}'."},
            status=404,
        )

    max_year = max(years)

    n_years = None
    match = re.search(r"last\s+(\d+)\s+year", q_lower)
    if match:
        try:
            n_years = int(match.group(1))
        except ValueError:
            n_years = None

    if n_years:
        min_year_for_filter = max_year - n_years + 1
        df_area = df_area[df_area[YEAR_COL] >= min_year_for_filter]
        years = sorted(df_area[YEAR_COL].dropna().unique().tolist())

    if df_area.empty:
        return JsonResponse(
            {"error": f"No data found for '{area}' in the requested time range."},
            status=404,
        )

    # --------------------
    # Prepare chart data
    # --------------------
    # Convert metric column to numeric if necessary
    df_area[metric_col] = pd.to_numeric(df_area[metric_col], errors="coerce")

    grouped = (
        df_area.groupby(YEAR_COL)[metric_col]
        .mean()
        .reset_index()
        .sort_values(YEAR_COL)
    )

    chart_data = []
    for _, row in grouped.iterrows():
        year_val = int(row[YEAR_COL])
        metric_val = float(row[metric_col])
        chart_data.append({"year": year_val, "value": metric_val})

    # --------------------
    # Build summary text
    # --------------------
    first_row = grouped.iloc[0]
    last_row = grouped.iloc[-1]
    start_year = int(first_row[YEAR_COL])
    end_year = int(last_row[YEAR_COL])

    first_val = float(first_row[metric_col])
    last_val = float(last_row[metric_col])

    if first_val == 0:
        change_pct = 0.0
    else:
        change_pct = (last_val - first_val) / first_val * 100.0

    if last_val > first_val:
        trend_word = "increased"
    elif last_val < first_val:
        trend_word = "decreased"
    else:
        trend_word = "remained almost stable"

    # human_metric = (
    #     "demand (total units)"
    #     if metric_name == "demand"
    #     else "price (flat weighted average rate)"
    # )

    # summary = (
    #     f"{area} shows {trend_word} in {human_metric} from {start_year} to {end_year}. "
    #     f"The average value changed from {first_val:,.2f} to {last_val:,.2f}, "
    #     f"which is a {change_pct:.1f}% change."
    # )
    human_metric = (
        "demand (total units)"
        if metric_name == "demand"
        else "price (flat weighted average rate)"
    )

    # ----- LLM (Gemini) summary -----
    from .gemini_client import generate_summary_with_gemini

    prompt = f"""
You are a real estate analytics assistant.

Summarize the trend for the locality "{area}" in 3–4 concise sentences.
Metric: {human_metric}
Time range: {start_year} to {end_year}
Start value: {first_val:,.2f}
End value: {last_val:,.2f}
Percentage change: {change_pct:.1f}%

Focus on:
- Whether the trend is rising, falling, or flat
- Whether recent values are high or low compared to the past
- A short, user-friendly interpretation (no technical jargon)
"""
    summary = generate_summary_with_gemini(prompt)

    # --------------------
    # Table data (all filtered rows)
    # --------------------
    table_data = df_area.to_dict(orient="records")

    response = {
        "summary": summary,
        "charts": [
            {
                "type": "line",
                "metric": metric_name,
                "metric_column": metric_col,
                "area": area,
                "data": chart_data,
            }
        ],
        "table": table_data,
    }

    return JsonResponse(response, safe=False)
