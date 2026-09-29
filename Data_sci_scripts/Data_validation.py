import pandas as pd
import numpy as np


file_path = "your_water_quality_file.csv"

df = pd.read_csv(file_path, encoding="cp1252")

print("Dataset loaded successfully")
print("Rows:", len(df))
print("Columns:", len(df.columns))



print("\nColumn Names:")
print(df.columns.tolist())


print("\nMissing Values:")
print(df.isnull().sum())



duplicates = df.duplicated().sum()

print("\nDuplicate Records:", duplicates)



raw_datetime = df["Datetime"].copy()

df["Datetime"] = pd.to_datetime(
    df["Datetime"],
    errors="coerce"
)

invalid_date_rows = df[df["Datetime"].isnull()]
invalid_dates = len(invalid_date_rows)

print("\nInvalid Date/Time Records:", invalid_dates)

if invalid_dates > 0:
    print("\nRecords with invalid Date/Time (original value shown):")
    print(
        invalid_date_rows
        .assign(**{"Original Datetime": raw_datetime[invalid_date_rows.index]})
        [["Original Datetime", "Parameter", "Value"]]
        .head(20)
    )



raw_value = df["Value"].copy()

df["Value"] = pd.to_numeric(
    df["Value"],
    errors="coerce"
)

invalid_value_rows = df[df["Value"].isnull()]
invalid_values = len(invalid_value_rows)

print("\nInvalid Numeric Values:", invalid_values)

if invalid_values > 0:
    print("\nRecords with invalid Value (original value shown):")
    print(
        invalid_value_rows
        .assign(**{"Original Value": raw_value[invalid_value_rows.index]})
        [["Datetime", "Parameter", "Original Value"]]
        .head(20)
    )



negative_values = (df["Value"] < 0).sum()

print("\nNegative Values:", negative_values)



print("\nQuality Value Counts:")
print(df["Quality"].value_counts(dropna=False))



print("\nWater Quality Parameters:")
print(df["Parameter"].value_counts())



print("\nUnits used for each parameter:")

unit_check = (
    df.groupby("Parameter")["Unit of Measurement"]
    .unique()
)

print(unit_check)


# IQR outlier check, calculated separately for each parameter.
# Each water-quality parameter has its own range and unit, so a single
# IQR across the whole Value column would give misleading results.

outlier_bounds = (
    df.groupby("Parameter")["Value"]
    .quantile([0.25, 0.75])
    .unstack()
    .rename(columns={0.25: "Q1", 0.75: "Q3"})
)

outlier_bounds["IQR"] = outlier_bounds["Q3"] - outlier_bounds["Q1"]
outlier_bounds["Lower Limit"] = outlier_bounds["Q1"] - 1.5 * outlier_bounds["IQR"]
outlier_bounds["Upper Limit"] = outlier_bounds["Q3"] + 1.5 * outlier_bounds["IQR"]

print("\nIQR Outlier Limits per Parameter:")
print(outlier_bounds)

lower_limit = df["Parameter"].map(outlier_bounds["Lower Limit"])
upper_limit = df["Parameter"].map(outlier_bounds["Upper Limit"])

outliers = df[
    (df["Value"] < lower_limit) |
    (df["Value"] > upper_limit)
]

print("\nNumber of Statistical Outliers:", len(outliers))

print("\nOutliers per Parameter:")
print(outliers["Parameter"].value_counts())

print("\nOutlier Records:")
print(outliers[
    ["Datetime", "Parameter", "Value", "Unit of Measurement"]
].head(20))



ph_data = df[
    df["Parameter"].str.contains(
        "pH",
        case=False,
        na=False
    )
]

invalid_ph = ph_data[
    (ph_data["Value"] < 0) |
    (ph_data["Value"] > 14)
]

print("\nInvalid pH Records:", len(invalid_ph))

if len(invalid_ph) > 0:
    print(invalid_ph[
        ["Datetime", "Parameter", "Value"]
    ])



validation_summary = {
    "Total Records": len(df),
    "Total Columns": len(df.columns),
    "Missing Values": int(df.isnull().sum().sum()),
    "Duplicate Records": int(duplicates),
    "Invalid Dates": int(invalid_dates),
    "Invalid Numeric Values": int(invalid_values),
    "Negative Values": int(negative_values),
    "Statistical Outliers": int(len(outliers)),
    "Invalid pH Values": int(len(invalid_ph))
}

print("\n==============================")
print("DATA VALIDATION SUMMARY")
print("==============================")

for key, value in validation_summary.items():
    print(f"{key}: {value}")



df.to_csv(
    "Validated_water_quality.csv",
    index=False
)

print("\nValidated dataset saved as:")
print("Validated_water_quality.csv")
