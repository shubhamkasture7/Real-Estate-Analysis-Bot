import os
import pandas as pd

# Column mappings (adapted to the given Excel)
LOCALITY_COL = "final location"
YEAR_COL = "year"

# Choose one column as "price" metric (you can change this later if needed)
PRICE_COL = "flat - weighted average rate"

# Choose one column as "demand" metric (you can also use 'total_sold - igr')
DEMAND_COL = "total units"

DATAFRAME = None
AREAS = []


def load_data():
    global DATAFRAME, AREAS

    base_dir = os.path.dirname(os.path.abspath(__file__))
    # Make sure the file name here matches your actual Excel file name
    file_path = os.path.join(base_dir, "data", "sample_data.xlsx")

    if not os.path.exists(file_path):
        print("⚠️ Excel file not found at:", file_path)
        DATAFRAME = None
        AREAS = []
        return

    # Read Excel
    DATAFRAME = pd.read_excel(file_path, engine="openpyxl")

    # Strip column names (remove leading/trailing spaces)
    DATAFRAME.columns = [str(col).strip() for col in DATAFRAME.columns]

    # Try to ensure year is numeric
    if YEAR_COL in DATAFRAME.columns:
        DATAFRAME[YEAR_COL] = pd.to_numeric(DATAFRAME[YEAR_COL], errors="coerce")

    # Collect unique localities
    if LOCALITY_COL in DATAFRAME.columns:
        AREAS = (
            DATAFRAME[LOCALITY_COL]
            .dropna()
            .astype(str)
            .str.strip()
            .unique()
            .tolist()
        )
        AREAS.sort()
    else:
        AREAS = []

    print("✅ Excel data loaded.")
    print("   Rows:", len(DATAFRAME))
    print("   Localities:", AREAS)
