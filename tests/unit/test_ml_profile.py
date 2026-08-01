"""Unit tests for ml-engine profiling (Phase 2)."""

from __future__ import annotations

import io

import pandas as pd

from syntrix_ml.eda import build_eda_insights
from syntrix_ml.io import load_tabular
from syntrix_ml.profile import profile_dataframe
from syntrix_ml.validate import validate_dataframe


def test_validate_and_profile_csv_roundtrip() -> None:
    csv = "id,score,label\n1,10.5,a\n2,20.0,b\n3,,a\n3,20.0,b\n"
    df = load_tabular(csv.encode("utf-8"), filename="demo.csv")
    assert list(df.columns) == ["id", "score", "label"]

    validation = validate_dataframe(df)
    assert validation.ok
    assert validation.row_count == 4

    profile = profile_dataframe(df)
    assert profile["row_count"] == 4
    assert profile["column_count"] == 3
    assert "columns" in profile["profile_json"]
    assert profile["quality_json"]["duplicate_row_count"] >= 0

    eda = build_eda_insights(df, profile=profile)
    assert eda["summary"]["row_count"] == 4
    assert isinstance(eda["insights"], list)
    assert isinstance(eda["column_summaries"], list)


def test_load_rejects_unsupported_extension() -> None:
    try:
        load_tabular(b"{}", filename="notes.txt")
        raise AssertionError("expected ValueError")
    except ValueError as exc:
        assert "Unsupported" in str(exc)
