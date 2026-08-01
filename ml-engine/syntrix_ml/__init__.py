"""Syntrix ML engine — deterministic data/ML pipelines."""

from syntrix_ml.eda import build_eda_insights
from syntrix_ml.explain import explain_model
from syntrix_ml.io import load_tabular
from syntrix_ml.pipeline import predict_with_artifact, train_experiment
from syntrix_ml.profile import profile_dataframe
from syntrix_ml.reporting import build_markdown_report, markdown_to_pdf
from syntrix_ml.validate import ValidationResult, validate_dataframe

__version__ = "0.3.0"

__all__ = [
    "ValidationResult",
    "build_eda_insights",
    "build_markdown_report",
    "explain_model",
    "load_tabular",
    "markdown_to_pdf",
    "predict_with_artifact",
    "profile_dataframe",
    "train_experiment",
    "validate_dataframe",
    "__version__",
]
