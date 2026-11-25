"""
Task 46: serve a local open-source LLM.

Sends one MILP output to Qwen3-4B-Instruct-2507 running in Ollama on this
laptop, asks for a short report that must follow report_schema.json (through
Ollama's native `format` field), and records the model, version, settings and
latency of every call.

What the model sees is decided by the Task 45 agreement
(AI/milp_output_agreement): the gate mode is applied first, and only
fields marked "present" for that mode are passed on, grouped per source,
plant, zone and flow so each figure keeps its ID.

The model's text is NOT verified here. Every key figure carries a fact_path so
Task 48 can check it against the facts.

Usage (from AI/local_llm):
    python serve_local_llm.py ../milp_output_agreement/fixtures/feasible.json
    python serve_local_llm.py ../milp_output_agreement/fixtures/*.json --runs 3

Standard library only.
"""

from __future__ import annotations

import argparse
import copy
import json
import platform
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
AGREEMENT_DIR = HERE.parent / "milp_output_agreement"
sys.path.insert(0, str(AGREEMENT_DIR))

from presentation_gate import gate_mode, is_presentable, load_rules  # noqa: E402

SCHEMA_PATH = HERE / "report_schema.json"
PROMPT_VERSION = "aquablend-local-report-v0.1"

DEFAULT_SETTINGS: dict[str, Any] = {
    "base_url": "http://localhost:11434",
    "model": "qwen3:4b-instruct-2507-q4_K_M",
    "options": {
        "temperature": 0.0,
        "top_p": 1.0,
        "seed": 0,
        "num_ctx": 8192,
        "num_predict": 512,
    },
    "keep_alive": "5m",
    "timeout_seconds": 180,
}

SYSTEM_PROMPT = """You write short reports about one run of the AquaBlend water-blending optimisation model.

You are given FACTS as JSON. Rules:
1. Use only the FACTS. Copy every number exactly as written. Do not calculate, round, add up or convert anything.
2. "mode" decides what you may say:
   - VALID: describe the result using the facts.
   - NO_SOLUTION: say the model found no valid solution for this scenario. Do not report any cost, flow, delivery, shortfall or quality figure. You may mention total demand and the scenario ID.
   - INVALID_OUTPUT: say the result failed its internal consistency checks and should not be used. Do not report figures.
3. Costs have no currency. Never write "$", "AUD" or any currency word.
4. Quality values describe the blended water entering the plant, before treatment. Never call them treated or delivered water quality.
5. Never say a source was chosen because it is cheapest, and never give any other reason for a choice unless a binding_constraints_summary sentence states it.
6. Never mention chemical dosing, treatment-chemical or contaminant-removal costs.
7. blend_ratio_percent is already a percentage. Write it with a % sign.
8. In key_figures, fact_path must say where the value is, for example summary.costs.total_cost or sources[source_id=225103].withdrawal_ml_per_day. Use at most six key figures; use none in NO_SOLUTION or INVALID_OUTPUT mode unless it is total demand.
9. caveats: list only limits that apply to these facts, in plain words. It may be empty.
Answer with JSON only."""


# --------------------------------------------------------------------------
# Facts: Task 45 rules applied, structure and IDs kept
# --------------------------------------------------------------------------

_SKIP = object()


def _filter(value: Any, path: str, record: dict | None, mode: str, rules: dict) -> Any:
    if isinstance(value, dict):
        kept = {}
        for key, item in value.items():
            child = _filter(item, f"{path}.{key}" if path else key, value, mode, rules)
            if child is not _SKIP:
                kept[key] = child
        return kept if kept else _SKIP
    if isinstance(value, list):
        if value and isinstance(value[0], (dict, list)):
            items = [_filter(item, path + "[]", record, mode, rules) for item in value]
            items = [item for item in items if item is not _SKIP]
            return items if items else _SKIP
        return value if is_presentable(path + "[]", value, mode, record, rules) else _SKIP
    return value if is_presentable(path, value, mode, record, rules) else _SKIP


def build_facts(output: dict[str, Any], rules: dict[str, Any] | None = None) -> dict[str, Any]:
    """Return what the model may see for this MILP output, plus its gate mode."""
    rules = rules or load_rules()
    mode = gate_mode(output)
    facts = _filter(output, "", None, mode, rules)
    facts = {} if facts is _SKIP else facts

    # The only display transform in the agreement: blend_ratio is shown as a
    # percentage. Done here so the model never has to calculate.
    for source in facts.get("sources", []):
        if "blend_ratio" in source:
            source["blend_ratio_percent"] = source.pop("blend_ratio") * 100

    # Round once, here, so the model can copy figures exactly instead of
    # rounding them itself (e.g. utilisation 29.411764705882355 -> 29.41).
    return _round_floats({"mode": mode, **facts})


def _round_floats(value: Any, places: int = 2) -> Any:
    if isinstance(value, float):
        return round(value, places)
    if isinstance(value, dict):
        return {key: _round_floats(item, places) for key, item in value.items()}
    if isinstance(value, list):
        return [_round_floats(item, places) for item in value]
    return value


# --------------------------------------------------------------------------
# Ollama calls
# --------------------------------------------------------------------------


class OllamaError(RuntimeError):
    pass


def _request(base_url: str, path: str, payload: dict | None, timeout: float) -> dict:
    url = base_url.rstrip("/") + path
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method="GET" if payload is None else "POST",
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", "replace")[:300]
        raise OllamaError(f"{path} returned HTTP {exc.code}: {body}") from exc
    except (urllib.error.URLError, TimeoutError, ConnectionError) as exc:
        raise OllamaError(
            f"Could not reach Ollama at {base_url} ({exc}). "
            "Is the Ollama app running? Try `ollama list` in Terminal."
        ) from exc


def describe_model(settings: dict) -> dict:
    """Model name, digest, size, quantisation and Ollama version, for the record."""
    base, model, timeout = settings["base_url"], settings["model"], 30
    version = _request(base, "/api/version", None, timeout).get("version")
    tags = _request(base, "/api/tags", None, timeout).get("models", [])
    tag = next((m for m in tags if m.get("name") == model or m.get("model") == model), None)
    if tag is None:
        names = ", ".join(m.get("name", "?") for m in tags) or "none"
        raise OllamaError(f"Model '{model}' is not pulled. Pulled models: {names}. Run: ollama pull {model}")
    show = _request(base, "/api/show", {"model": model}, timeout)
    details = show.get("details", {})
    return {
        "ollama_version": version,
        "model": model,
        "digest": tag.get("digest"),
        "size_bytes": tag.get("size"),
        "modified_at": tag.get("modified_at"),
        "family": details.get("family"),
        "parameter_size": details.get("parameter_size"),
        "quantization_level": details.get("quantization_level"),
        "format": details.get("format"),
        "license_first_line": (show.get("license") or "").strip().splitlines()[:1],
    }


def build_request(facts: dict, schema: dict, settings: dict) -> dict:
    return {
        "model": settings["model"],
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    "FACTS:\n" + json.dumps(facts, indent=1)
                    # Ollama's docs advise repeating the schema in the prompt
                    # as well as passing it in `format`.
                    + "\n\nAnswer with JSON that matches this schema:\n"
                    + json.dumps(schema)
                ),
            },
        ],
        "format": schema,
        "stream": False,
        "options": dict(settings["options"]),
        "keep_alive": settings["keep_alive"],
    }


def _ms(nanoseconds: Any) -> float | None:
    return None if nanoseconds is None else round(nanoseconds / 1e6, 1)


def timings_from(response: dict, wall_seconds: float) -> dict:
    eval_count = response.get("eval_count")
    eval_ns = response.get("eval_duration")
    prompt_count = response.get("prompt_eval_count")
    prompt_ns = response.get("prompt_eval_duration")
    return {
        "wall_clock_ms": round(wall_seconds * 1000, 1),
        "total_ms": _ms(response.get("total_duration")),
        "load_ms": _ms(response.get("load_duration")),
        "prompt_tokens": prompt_count,
        "prompt_eval_ms": _ms(prompt_ns),
        "output_tokens": eval_count,
        "generation_ms": _ms(eval_ns),
        "output_tokens_per_second": (
            round(eval_count / (eval_ns / 1e9), 1) if eval_count and eval_ns else None
        ),
        "done_reason": response.get("done_reason"),
    }


# --------------------------------------------------------------------------
# Schema check (only the keywords report_schema.json uses)
# --------------------------------------------------------------------------

_TYPES = {"object": dict, "array": list, "string": str, "number": (int, float)}


def schema_errors(value: Any, schema: dict, path: str = "$") -> list[str]:
    expected = schema.get("type")
    if expected and not isinstance(value, _TYPES[expected]) or (
        expected == "number" and isinstance(value, bool)
    ):
        return [f"{path}: expected {expected}, got {type(value).__name__}"]
    errors: list[str] = []
    if expected == "object":
        props = schema.get("properties", {})
        for key in schema.get("required", []):
            if key not in value:
                errors.append(f"{path}: missing '{key}'")
        if schema.get("additionalProperties") is False:
            errors += [f"{path}: unexpected '{k}'" for k in value if k not in props]
        for key, sub in props.items():
            if key in value:
                errors += schema_errors(value[key], sub, f"{path}.{key}")
    elif expected == "array" and "items" in schema:
        for i, item in enumerate(value):
            errors += schema_errors(item, schema["items"], f"{path}[{i}]")
    return errors


# --------------------------------------------------------------------------
# One measured call, and a run record
# --------------------------------------------------------------------------


def generate_report(facts: dict, settings: dict, schema: dict | None = None) -> dict:
    schema = schema or json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    payload = build_request(facts, schema, settings)
    started = time.perf_counter()
    response = _request(settings["base_url"], "/api/chat", payload, settings["timeout_seconds"])
    wall = time.perf_counter() - started

    content = (response.get("message") or {}).get("content", "")
    result = {"timings": timings_from(response, wall), "raw_content": content}
    try:
        report = json.loads(content)
    except json.JSONDecodeError as exc:
        result.update(report=None, schema_valid=False, schema_errors=[f"not JSON: {exc}"])
        return result
    errors = schema_errors(report, schema)
    result.update(report=report, schema_valid=not errors, schema_errors=errors)
    return result


def machine_info() -> dict:
    info = {
        "os": platform.platform(),
        "machine": platform.machine(),
        "python": platform.python_version(),
    }
    if platform.system() == "Darwin":
        for key, name in (("cpu", "machdep.cpu.brand_string"), ("memory_bytes", "hw.memsize")):
            try:
                out = subprocess.run(["sysctl", "-n", name], capture_output=True, text=True, timeout=5)
                info[key] = out.stdout.strip() or None
            except (OSError, subprocess.SubprocessError):
                info[key] = None
    return info


def run(output_paths: list[str], runs: int, settings: dict, out_dir: Path) -> Path:
    model_info = describe_model(settings)
    record: dict[str, Any] = {
        "task": "AquaBlend T3 Task 46",
        "created_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "prompt_version": PROMPT_VERSION,
        "settings": settings,
        "model_info": model_info,
        "machine": machine_info(),
        "cases": [],
    }
    for path in output_paths:
        output = json.loads(Path(path).read_text(encoding="utf-8"))
        facts = build_facts(output)
        case = {"input": Path(path).name, "mode": facts["mode"], "facts": facts, "calls": []}
        for i in range(runs):
            call = generate_report(facts, settings)
            call["call"] = i + 1
            case["calls"].append(call)
            t = call["timings"]
            print(
                f"{case['input']} call {i + 1}: {t['wall_clock_ms'] / 1000:.2f}s total, "
                f"load {t['load_ms']} ms, {t['output_tokens']} tokens at "
                f"{t['output_tokens_per_second']} tok/s, schema_valid={call['schema_valid']}"
            )
        record["cases"].append(case)

    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    out_path = out_dir / f"run_{stamp}.json"
    out_path.write_text(json.dumps(record, indent=2), encoding="utf-8")
    return out_path


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("outputs", nargs="+", help="MILP output JSON file(s)")
    parser.add_argument("--runs", type=int, default=3, help="calls per file (first is usually a cold load)")
    parser.add_argument("--model", default=DEFAULT_SETTINGS["model"])
    parser.add_argument("--base-url", default=DEFAULT_SETTINGS["base_url"])
    parser.add_argument("--out-dir", default=str(HERE / "runs"))
    args = parser.parse_args(argv)

    settings = copy.deepcopy(DEFAULT_SETTINGS)
    settings.update(model=args.model, base_url=args.base_url)
    try:
        path = run(args.outputs, args.runs, settings, Path(args.out_dir))
    except OllamaError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    print(f"Saved run record: {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
