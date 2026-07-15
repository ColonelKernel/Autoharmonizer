"""Tests for CSV loader."""

from pathlib import Path

import pytest

from src.csv_loader import CSVLoadError, load_transition_table


def test_load_openbook_csv():
    path = Path(__file__).resolve().parents[2] / "data" / "markov_openbook.csv"
    table = load_transition_table(path)

    assert table.stats.raw_rows > 0
    assert table.stats.source_count >= 80
    assert "G:7" in table.transitions_by_source
    g7 = table.transitions_by_source["G:7"]
    assert any(item.to == "C:maj" for item in g7)
    prob_sum = sum(item.prob for item in g7)
    assert abs(prob_sum - 1.0) < 0.02
    assert table.global_fallback_pool


def test_missing_header(tmp_path: Path):
    csv_file = tmp_path / "bad.csv"
    csv_file.write_text("a,b,c\n1,2,3\n", encoding="utf-8")

    with pytest.raises(CSVLoadError, match="missing required columns"):
        load_transition_table(csv_file)


def test_duplicate_merge(tmp_path: Path):
    csv_file = tmp_path / "dup.csv"
    csv_file.write_text(
        "chord_from,chord_to,count,probability\n"
        "G:7,C:maj,2,0.5\n"
        "G:7,C:maj,3,0.5\n"
        "G:7,D:min7,5,1.0\n",
        encoding="utf-8",
    )

    table = load_transition_table(csv_file)
    assert table.stats.duplicates_merged == 1
    g7 = {item.to: item for item in table.transitions_by_source["G:7"]}
    assert g7["C:maj"].count == 5
    assert abs(sum(item.prob for item in table.transitions_by_source["G:7"]) - 1.0) < 0.01


def test_empty_chord_rejected(tmp_path: Path):
    csv_file = tmp_path / "empty.csv"
    csv_file.write_text(
        "chord_from,chord_to,count,probability\n"
        ",C:maj,1,1.0\n",
        encoding="utf-8",
    )

    with pytest.raises(CSVLoadError, match="empty chord_from"):
        load_transition_table(csv_file)
