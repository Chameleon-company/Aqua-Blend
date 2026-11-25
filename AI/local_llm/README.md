# Task 46: serve a local open-source LLM

**Backlog task:** 46, serve a local open-source LLM (AI stream, T3 2026)
**Depends on:** Task 45, the MILP output agreement (`AI/milp_output_agreement`), for what the model is allowed to see

This folder runs Qwen3-4B-Instruct-2507 (Apache 2.0) locally in Ollama, gives it one MILP output, and asks for a short report that must follow a JSON schema. Every call records the model, its version and settings, and how long it took.

## How this differs from the T2 runner

Last trimester's runner (`AI/explanations/model_runner.py` in the T2 fork, `Yxxsef/Aqua-Blend-Analysis-Ai`) sends an already written template report to the model and asks it to reword it, through Ollama's OpenAI-compatible `/v1/chat/completions` endpoint.

This task does what the backlog note asks: the model writes the report itself, from the MILP output, without a hard-coded template. It uses Ollama's own `/api/chat` endpoint, because the `format` field there takes a JSON schema and constrains the model's output to it.

## What the model sees

`build_facts()` applies the Task 45 agreement before anything reaches the model:

1. The gate mode is decided first (`VALID`, `NO_SOLUTION` or `INVALID_OUTPUT`).
2. Only fields marked `present` for that mode are kept. Evidence-only, technical and internal fields are dropped.
3. Each source, plant, zone, flow and quality record keeps its ID next to its figures, so the model cannot attach a number to the wrong source.
4. `blend_ratio` is turned into `blend_ratio_percent`, and floats are rounded to 2 decimals, so the model never has to calculate or round.

For the infeasible fixture this leaves only the scenario ID, the solver status, total demand and the IDs. The zero-filled costs and flows never reach the model.

The system prompt in `serve_local_llm.py` repeats the agreement's "never say" rules (no currency, no "because it is cheapest", inflow quality is before treatment, and so on).

## What the model must return

`report_schema.json`:

| Field | Meaning |
|---|---|
| `headline` | One sentence on the result |
| `summary` | Two to four sentences for a water operator |
| `key_figures[]` | Up to six figures, each with `label`, `value`, `unit` and `fact_path` (where the value is in the facts) |
| `caveats[]` | Limits that apply to this result |

`fact_path` is there for Task 48, which will check every number against the facts. This task only checks that the output is valid JSON that matches the schema.

## Settings

| Setting | Value | Why |
|---|---|---|
| model | `qwen3:4b-instruct-2507-q4_K_M` | Same Ollama build as the T2 live runs, about 2.5 GB |
| temperature | 0.0 | Repeatable output |
| top_p | 1.0 | |
| seed | 0 | Repeatable output |
| num_ctx | 8192 | The feasible facts plus prompt fit comfortably; set explicitly because Ollama's default depends on the version |
| num_predict | 512 | A short answer; caps run time |
| keep_alive | 5m | Keeps the model loaded between calls so warm latency can be measured |
| timeout | 180 s | T2 found 30 s too short for a cold load |

## Running it on a Mac

1. Install Ollama from https://ollama.com/download and open the Ollama app.
2. Check it works and pull the model (about 2.5 GB):

   ```
   ollama --version
   ollama pull qwen3:4b-instruct-2507-q4_K_M
   ollama list
   ```

3. Run the script on both fixtures, three calls each:

   ```
   cd AI/local_llm
   python serve_local_llm.py ../milp_output_agreement/fixtures/feasible.json ../milp_output_agreement/fixtures/infeasible.json --runs 3
   ```

   Each call prints one line like this (the numbers here are made up):

   ```
   feasible.json call 1: 9.84s total, load 3120.4 ms, 168 tokens at 41.2 tok/s, schema_valid=True
   ```

   The first call is usually slower because it loads the model into memory (`load`). Calls 2 and 3 show warm latency.

4. The full record is saved to `runs/run_<date>-<time>.json`. Commit that file: it is the evidence for this task.

Close other heavy apps while it runs, so the timings reflect the model and not the rest of the laptop.

## What the run record contains

- `model_info`: Ollama version, model name, digest, size, family, parameter size, quantisation
- `settings`: every option sent to Ollama
- `machine`: OS, chip, memory and Python version
- per call: the facts sent, the raw model output, the parsed report, `schema_valid` with any errors, and timings: wall clock, Ollama's total, load, prompt and generation time, token counts and output tokens per second

Task 47 (LLM performance report) will use these records.

## Tests

```
cd AI
python -m pytest local_llm -q
```

15 tests run against a fake Ollama server that returns the same response shapes as the real one, so no model is needed. They cover the facts (IDs kept, evidence fields and pH model limits left out, nothing but demand in `NO_SOLUTION` mode), the request (native `format` field with the schema, `stream: false`, temperature 0, seed 0), timings, bad model output (not JSON, extra keys, missing keys, wrong types), a missing model, and Ollama not running. The tests pass on Python 3.9 and 3.13.

## Results

To be filled in from the first run on a laptop.

| Item | Value |
|---|---|
| Machine | |
| Ollama version | |
| Model digest | |
| Feasible: cold call (s) | |
| Feasible: warm calls (s) | |
| Infeasible: warm calls (s) | |
| Output tokens per second | |
| Schema-valid outputs | |
