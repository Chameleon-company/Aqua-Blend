"""
Tests for Task 46 against a fake Ollama server.

The fake server answers /api/version, /api/tags, /api/show and /api/chat with
the same response shapes real Ollama returns, so no model is needed in CI.
The real latency numbers come from running serve_local_llm.py on a laptop.
"""

from __future__ import annotations

import json
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

import pytest

import serve_local_llm as sll

FIXTURES = Path(__file__).resolve().parents[1] / "milp_output_agreement" / "fixtures"
FEASIBLE = json.loads((FIXTURES / "feasible.json").read_text(encoding="utf-8"))
INFEASIBLE = json.loads((FIXTURES / "infeasible.json").read_text(encoding="utf-8"))
SCHEMA = json.loads(sll.SCHEMA_PATH.read_text(encoding="utf-8"))
MODEL = sll.DEFAULT_SETTINGS["model"]

GOOD_REPORT = {
    "headline": "The model found an optimal blend that meets all 1200.0 ML/day of demand.",
    "summary": "All three sources are used and plant_1 runs at 71.43% of capacity.",
    "key_figures": [
        {"label": "Total cost", "value": 533000.0, "unit": "cost units", "fact_path": "summary.costs.total_cost"}
    ],
    "caveats": ["Costs have no currency in the model output."],
}


class FakeOllama:
    """Minimal stand-in for the Ollama HTTP API."""

    def __init__(self, chat_content: str):
        self.chat_content = chat_content
        self.requests: list[tuple[str, dict | None]] = []
        fake = self

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *args):
                pass

            def _send(self, body: dict, code: int = 200):
                data = json.dumps(body).encode()
                self.send_response(code)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)

            def do_GET(self):
                fake.requests.append((self.path, None))
                if self.path == "/api/version":
                    self._send({"version": "0.12.6"})
                elif self.path == "/api/tags":
                    self._send({"models": [{
                        "name": MODEL, "model": MODEL, "size": 2497293931,
                        "digest": "abc123", "modified_at": "2026-11-21T10:00:00Z",
                    }]})
                else:
                    self._send({"error": "not found"}, 404)

            def do_POST(self):
                body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
                fake.requests.append((self.path, body))
                if self.path == "/api/show":
                    self._send({"license": "Apache License\nVersion 2.0", "details": {
                        "format": "gguf", "family": "qwen3",
                        "parameter_size": "4.0B", "quantization_level": "Q4_K_M"}})
                elif self.path == "/api/chat":
                    self._send({
                        "model": body["model"], "created_at": "2026-11-21T10:00:01Z",
                        "message": {"role": "assistant", "content": fake.chat_content},
                        "done": True, "done_reason": "stop",
                        "total_duration": 4_200_000_000, "load_duration": 1_500_000_000,
                        "prompt_eval_count": 900, "prompt_eval_duration": 1_100_000_000,
                        "eval_count": 120, "eval_duration": 1_600_000_000,
                    })
                else:
                    self._send({"error": "not found"}, 404)

        self.server = HTTPServer(("127.0.0.1", 0), Handler)
        self.url = f"http://127.0.0.1:{self.server.server_port}"
        threading.Thread(target=self.server.serve_forever, daemon=True).start()

    def close(self):
        self.server.shutdown()


@pytest.fixture
def fake():
    server = FakeOllama(json.dumps(GOOD_REPORT))
    yield server
    server.close()


def _settings(url):
    settings = json.loads(json.dumps(sll.DEFAULT_SETTINGS))
    settings["base_url"] = url
    return settings


# ---- facts ----------------------------------------------------------------

def test_valid_facts_keep_ids_with_figures():
    facts = sll.build_facts(FEASIBLE)
    assert facts["mode"] == "VALID"
    assert facts["summary"]["costs"]["total_cost"] == 533000.0
    by_id = {s["source_id"]: s for s in facts["sources"]}
    assert by_id["225103"]["withdrawal_ml_per_day"] == 700.0
    assert by_id["225103"]["blend_ratio_percent"] == 58.33
    assert "blend_ratio" not in by_id["225103"]
    assert by_id["233217"]["utilisation_percent"] == 29.41


def test_valid_facts_leave_out_evidence_and_internal_fields():
    text = json.dumps(sll.build_facts(FEASIBLE))
    for field in ("unit_cost_rank", "model_value", "reconstructed_total_cost", "warnings", "schema_version"):
        assert field not in text


def test_ph_model_limits_are_not_passed_but_identity_limits_are():
    facts = sll.build_facts(FEASIBLE)
    params = facts["quality"]["plant_inflow"][0]["parameters"]
    by_id = {p["parameter_id"].lower(): p for p in params}
    assert "model_max" not in by_id["ph"]
    assert "model_max" in by_id["turbidity"]


def test_no_solution_facts_have_no_figures_beyond_demand():
    facts = sll.build_facts(INFEASIBLE)
    assert facts["mode"] == "NO_SOLUTION"
    assert facts["summary"] == {"total_demand_ml_per_day": 1200.0}
    assert all(set(s) == {"source_id"} for s in facts["sources"])
    assert "flows" not in facts and "quality" not in facts


# ---- request ----------------------------------------------------------------

def test_request_uses_native_format_field_with_the_schema(fake):
    sll.generate_report(sll.build_facts(FEASIBLE), _settings(fake.url), SCHEMA)
    path, body = fake.requests[-1]
    assert path == "/api/chat"
    assert body["format"] == SCHEMA
    assert body["stream"] is False
    assert body["model"] == MODEL
    assert body["options"]["temperature"] == 0.0 and body["options"]["seed"] == 0
    assert body["messages"][0]["role"] == "system"
    assert '"total_cost": 533000.0' in body["messages"][1]["content"]


# ---- response ----------------------------------------------------------------

def test_valid_report_and_timings(fake):
    result = sll.generate_report(sll.build_facts(FEASIBLE), _settings(fake.url), SCHEMA)
    assert result["schema_valid"] is True and result["report"] == GOOD_REPORT
    t = result["timings"]
    assert t["total_ms"] == 4200.0 and t["load_ms"] == 1500.0
    assert t["prompt_tokens"] == 900 and t["output_tokens"] == 120
    assert t["output_tokens_per_second"] == 75.0
    assert t["wall_clock_ms"] > 0 and t["done_reason"] == "stop"


@pytest.mark.parametrize(
    "content, expected",
    [
        ("Sure! Here is the report", "not JSON"),
        (json.dumps({**GOOD_REPORT, "extra": 1}), "unexpected 'extra'"),
        (json.dumps({k: v for k, v in GOOD_REPORT.items() if k != "caveats"}), "missing 'caveats'"),
        (json.dumps({**GOOD_REPORT, "key_figures": [{**GOOD_REPORT["key_figures"][0], "value": "533000"}]}),
         "expected number"),
    ],
)
def test_bad_model_output_is_recorded_not_crashing(content, expected):
    server = FakeOllama(content)
    try:
        result = sll.generate_report(sll.build_facts(FEASIBLE), _settings(server.url), SCHEMA)
    finally:
        server.close()
    assert result["schema_valid"] is False
    assert any(expected in e for e in result["schema_errors"])
    assert result["raw_content"] == content


# ---- metadata and full run ----------------------------------------------------

def test_describe_model_records_version_digest_and_quantisation(fake):
    info = sll.describe_model(_settings(fake.url))
    assert info["ollama_version"] == "0.12.6"
    assert info["digest"] == "abc123"
    assert info["quantization_level"] == "Q4_K_M" and info["parameter_size"] == "4.0B"


def test_missing_model_gives_a_pull_hint(fake):
    settings = _settings(fake.url)
    settings["model"] = "qwen3:not-pulled"
    with pytest.raises(sll.OllamaError, match="ollama pull qwen3:not-pulled"):
        sll.describe_model(settings)


def test_unreachable_server_gives_a_clear_error():
    settings = _settings("http://127.0.0.1:9")
    with pytest.raises(sll.OllamaError, match="Is the Ollama app running"):
        sll.describe_model(settings)


def test_full_run_writes_a_record(fake, tmp_path):
    out = sll.run(
        [str(FIXTURES / "feasible.json"), str(FIXTURES / "infeasible.json")],
        runs=2, settings=_settings(fake.url), out_dir=tmp_path,
    )
    record = json.loads(out.read_text())
    assert record["model_info"]["model"] == MODEL
    assert record["settings"]["options"]["num_ctx"] == 8192
    assert [c["mode"] for c in record["cases"]] == ["VALID", "NO_SOLUTION"]
    assert all(len(c["calls"]) == 2 for c in record["cases"])
    assert record["prompt_version"] == sll.PROMPT_VERSION


def test_cli_returns_1_when_ollama_is_down(tmp_path, capsys):
    code = sll.main([str(FIXTURES / "feasible.json"), "--base-url", "http://127.0.0.1:9", "--out-dir", str(tmp_path)])
    assert code == 1
    assert "Is the Ollama app running" in capsys.readouterr().err
