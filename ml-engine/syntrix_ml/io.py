"""Tabular file loaders for uploaded datasets."""

from __future__ import annotations

from io import BytesIO
from pathlib import Path

import pandas as pd

SUPPORTED_FORMATS = frozenset({"csv", "parquet", "xlsx", "xls"})


def detect_format(filename: str, explicit: str | None = None) -> str:
    if explicit:
        fmt = explicit.lower().lstrip(".")
        if fmt not in SUPPORTED_FORMATS:
            raise ValueError(f"Unsupported format: {fmt}")
        return fmt
    suffix = Path(filename).suffix.lower().lstrip(".")
    if suffix == "pq":
        suffix = "parquet"
    if suffix not in SUPPORTED_FORMATS:
        raise ValueError(f"Unsupported file extension: .{suffix or '?'}")
    return suffix


def load_tabular(
    data: bytes | str | Path,
    *,
    filename: str | None = None,
    format: str | None = None,
    nrows: int | None = None,
) -> pd.DataFrame:
    """Load CSV / Parquet / Excel into a DataFrame."""
    fmt = detect_format(filename or (str(data) if isinstance(data, (str, Path)) else "data.csv"), format)
    if isinstance(data, (str, Path)):
        path = Path(data)
        if fmt == "csv":
            return pd.read_csv(path, nrows=nrows)
        if fmt == "parquet":
            df = pd.read_parquet(path)
            return df.head(nrows) if nrows is not None else df
        return pd.read_excel(path, nrows=nrows)

    buffer = BytesIO(data)
    if fmt == "csv":
        return pd.read_csv(buffer, nrows=nrows)
    if fmt == "parquet":
        df = pd.read_parquet(buffer)
        return df.head(nrows) if nrows is not None else df
    return pd.read_excel(buffer, nrows=nrows)
