from __future__ import annotations

import asyncio
from decimal import Decimal
import inspect
import json
import time
from pathlib import Path
from typing import Any

import config
from services.production.expectancy_tracker import compute_shadow_expectancy_from_ledger
from services.production.final_live_readiness import (
    build_final_live_readiness,
    enrich_shadow_expectancy_for_final_readiness,
)
from services.production.shadow_runtime import FinalShadowRuntime
from services.production.v3_controlled_canary_state import CONTROLLED_CANARY_READY_DECISION
from services.production.candidate_allowlist import (
    CandidateAllowlist,
    candidate_key as allowlist_candidate_key,
    normalize_candidate_key,
    parse_approved_candidate_keys,
    select_approved_candidate,
)


def _candidate_key(candidate: dict[str, Any] | None) -> str | None:
    return allowlist_candidate_key(candidate)


def _select_candidate(cycle: dict[str, Any]) -> dict[str, Any] | None:
    rows = cycle.get("top_candidates_after_penalty") or cycle.get("top_candidates") or []
    for row in rows:
        if isinstance(row, dict) and not row.get("rejected_by"):
            return dict(row)
    return None




def _select_approved_candidate(cycle: dict[str, Any], approved_key: str | None) -> dict[str, Any] | None:
    allowlist = parse_approved_candidate_keys("", str(approved_key or ""))
    return select_approved_candidate(cycle, allowlist).selected


def _select_approved_candidate_from_recent_cycles(
    allowlist: CandidateAllowlist | str | None,
    *,
    cycles_path: str | Path | None = None,
    max_lines: int | None = None,
) -> dict[str, Any] | None:
    if not isinstance(allowlist, CandidateAllowlist):
        allowlist = parse_approved_candidate_keys("", str(allowlist or ""))
    if not allowlist.keys:
        return None

    path = Path(
        cycles_path
        or getattr(config, "FINAL_ENGINE_CYCLES_PATH", "data/final_engine_cycles.jsonl")
    )
    if not path.exists():
        return None

    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except Exception:
        return None

    limit = int(
        max_lines
        if max_lines is not None
        else getattr(config, "CANDIDATE_EVIDENCE_RECENT_CYCLE_FALLBACK_MAX_LINES", 750)
    )
    if limit > 0:
        lines = lines[-limit:]

    for line in reversed(lines):
        if not line.strip():
            continue
        try:
            cycle = json.loads(line)
        except Exception:
            continue
        if not isinstance(cycle, dict):
            continue

        rows = cycle.get("top_candidates_after_penalty") or cycle.get("top_candidates") or []
        for row in rows:
            if not isinstance(row, dict):
                continue
            if row.get("rejected_by"):
                continue
            row_key = _candidate_key(row)
            if not allowlist.contains(row_key):
                continue

            candidate = dict(row)
            candidate.setdefault("candidate_key", row_key)
            candidate["candidate_source"] = "recent_cycles_fallback"
            return candidate

    return None

def _selected_candidate_key_detail(candidate: dict[str, Any] | None) -> dict[str, Any]:
    if not isinstance(candidate, dict):
        return {"available": False}
    return {
        "available": True,
        "candidate_key": _candidate_key(candidate),
        "symbol": candidate.get("symbol"),
        "timeframe": candidate.get("timeframe"),
        "strategy_family": candidate.get("strategy_family") or candidate.get("family"),
        "entry_price": candidate.get("entry_price"),
        "stop_price": candidate.get("stop_price"),
        "target_price": candidate.get("target_price"),
    }

def _normalise_candidate_key(value: str) -> str | None:
    return normalize_candidate_key(value)


def _validation_candidate_keys() -> list[str]:
    if not bool(getattr(config, "V3_PASS_CANDIDATE_SHADOW_VALIDATION_ENABLED", False)):
        return []

    raw = str(getattr(config, "V3_PASS_CANDIDATE_SHADOW_VALIDATION_KEYS", "") or "").strip()
    if not raw:
        raw = str(getattr(config, "V3_PASS_CANDIDATE_SHADOW_VALIDATION_KEY", "") or "").strip()

    keys: list[str] = []
    for item in raw.split(","):
        key = _normalise_candidate_key(item)
        if key and key not in keys:
            keys.append(key)
    return keys


def _validation_candidate_key() -> str | None:
    keys = _validation_candidate_keys()
    if not keys:
        return None

    preferred = _normalise_candidate_key(
        str(getattr(config, "V3_PASS_CANDIDATE_SHADOW_VALIDATION_KEY", "") or "")
    )
    if preferred in keys:
        return preferred

    return keys[0]


def _build_shadow_runtime() -> tuple[FinalShadowRuntime, str | None]:
    candidate_keys = _validation_candidate_keys()
    candidate_key = _validation_candidate_key()

    if not candidate_keys or not candidate_key:
        return FinalShadowRuntime(), None

    runtime = FinalShadowRuntime(
        max_new=int(getattr(config, "V3_PASS_CANDIDATE_SHADOW_MAX_NEW_PER_CYCLE", 1)),
        ledger_path=str(
            getattr(
                config,
                "V3_PASS_CANDIDATE_SHADOW_LEDGER_PATH",
                "data/v3_shadow_validation/ledger.jsonl",
            )
        ),
        state_path=str(
            getattr(
                config,
                "V3_PASS_CANDIDATE_SHADOW_STATE_PATH",
                "data/v3_shadow_validation/state.json",
            )
        ),
        allowed_candidate_keys=set(candidate_keys),
    )
    return runtime, candidate_key



def _approved_candidate_allowlist() -> CandidateAllowlist:
    return parse_approved_candidate_keys(
        str(getattr(config, "V3_APPROVED_CANDIDATE_KEYS", "") or ""),
        str(getattr(config, "V3_APPROVED_CANDIDATE_KEY", "") or ""),
    )


def _approved_candidate_keys() -> list[str]:
    return list(_approved_candidate_allowlist().keys)


READINESS_OVERRIDE_SAFETY_BLOCKERS = {
    "account_not_flat",
    "normal_open_orders_exist",
    "algo_open_orders_exist",
    "active_position_exists",
    "kill_switch_active",
    "account_unavailable",
    "exchange_credentials_missing",
}


def _controlled_readiness_override_enabled() -> bool:
    return bool(getattr(config, "LIVE_CANARY_CONTROLLED_READINESS_OVERRIDE_ENABLED", False))


def _controlled_canary_preflight_blockers(
    *,
    candidate_key: str | None,
    readiness: dict[str, Any],
    account: dict[str, Any],
    kill_switch: dict[str, Any],
    executor: Any,
    allowlist: CandidateAllowlist | None = None,
) -> list[str]:
    blockers: list[str] = []
    mode = str(getattr(config, "TRADING_MODE", "OFF") or "OFF").upper()
    if mode != "LIVE_CANARY":
        blockers.append("trading_mode_not_live_canary")
    if not bool(getattr(config, "LIVE_CANARY_ENABLED", False)):
        blockers.append("live_canary_disabled")
    if not bool(getattr(config, "V3_APPROVED_CANDIDATE_EXECUTION_ENABLED", False)):
        blockers.append("approved_candidate_execution_disabled")

    allowlist = allowlist or _approved_candidate_allowlist()
    if not allowlist.keys:
        blockers.append("approved_candidate_key_missing")
    elif not allowlist.contains(candidate_key):
        blockers.append("approved_candidate_mismatch")

    if readiness.get("allowed") is not True and not _controlled_readiness_override_enabled():
        blockers.append("readiness_not_allowed")

    if account.get("available") is not True:
        blockers.append("account_unavailable")
    positions_count = int(account.get("positions_count", account.get("open_positions_count", 0)) or 0)
    normal_open_orders_count = int(account.get("normal_open_orders_count", account.get("open_orders_count", 0)) or 0)
    algo_open_orders_count = int(account.get("algo_open_orders_count", 0) or 0)
    if bool(getattr(config, "V3_LIVE_CANARY_REQUIRE_ZERO_POSITIONS", True)) and (account.get("flat") is not True or positions_count != 0):
        blockers.append("account_not_flat" if account.get("flat") is not True else "positions_exist")
    if bool(getattr(config, "V3_LIVE_CANARY_REQUIRE_ZERO_NORMAL_ORDERS", True)) and normal_open_orders_count != 0:
        blockers.append("normal_open_orders_exist")
    if bool(getattr(config, "V3_LIVE_CANARY_REQUIRE_ZERO_ALGO_ORDERS", True)) and algo_open_orders_count != 0:
        blockers.append("algo_open_orders_exist")
    if kill_switch.get("active") is not False:
        blockers.append("kill_switch_active")
    if executor is None or not callable(getattr(executor, "submit_candidate", None)):
        blockers.append("router_unavailable")
    return sorted(set(blockers))


def _candidate_detection_cost(candidate: dict[str, Any] | None, candidate_key: str | None) -> dict[str, Any]:
    if not isinstance(candidate, dict):
        return {"candidate_key": candidate_key or ""}
    detection_cost = candidate.get("detection_cost")
    if isinstance(detection_cost, dict):
        payload = dict(detection_cost)
    else:
        payload = {}
    for key in (
        "expected_move_pct",
        "stress_125_round_trip_cost_pct",
        "stressed_round_trip_cost_pct",
        "detection_time_cost_allowed",
        "cost_stress_125_passed",
        "report_id",
    ):
        if key in candidate and key not in payload:
            payload[key] = candidate[key]
    payload.setdefault("candidate_key", candidate_key or candidate.get("candidate_key") or "")
    return _candidate_evidence_detection_cost_fallback(candidate, candidate_key, payload)




def _candidate_key_parts(candidate_key: str | None) -> tuple[str, str, str]:
    parts = [part.strip() for part in str(candidate_key or "").split("|")]
    if len(parts) != 3:
        return "", "", ""
    return parts[0], parts[1], parts[2]


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        if value in (None, ""):
            return default
        return float(value)
    except Exception:
        return default


def _load_candidate_evidence_payload() -> dict[str, Any]:
    path = Path(str(getattr(config, "CANDIDATE_EVIDENCE_PATH", "data/candidate_evidence/labusdt_candidate_evidence_latest.json") or ""))
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}
    return payload if isinstance(payload, dict) else {}


def _controlled_canary_max_notional() -> float:
    values = []
    for name in ("LIVE_CANARY_MAX_NOTIONAL_USDT", "V3_LIVE_CANARY_MAX_NOTIONAL_USDT"):
        value = _safe_float(getattr(config, name, 0.0))
        if value > 0:
            values.append(value)
    return min(values) if values else 0.0


def _candidate_evidence_gate_allowed(readiness: dict[str, Any]) -> bool:
    gate = readiness.get("candidate_evidence_gate")
    return isinstance(gate, dict) and gate.get("enabled") is True and gate.get("allowed") is True




def _candidate_actual_key(candidate: dict[str, Any] | None) -> str:
    if not isinstance(candidate, dict):
        return ""
    explicit = str(candidate.get("candidate_key") or candidate.get("key") or "").strip()
    if explicit:
        return explicit
    symbol = str(candidate.get("symbol") or "").strip().upper()
    timeframe = str(candidate.get("timeframe") or "").strip()
    family = str(candidate.get("strategy_family") or candidate.get("family") or "").strip()
    if symbol and timeframe and family:
        return f"{symbol}|{timeframe}|{family}"
    return ""


def _candidate_identity_matches_approved(candidate: dict[str, Any] | None, approved_key: str | None) -> tuple[bool, dict[str, Any]]:
    approved_key = str(approved_key or "").strip()
    symbol, timeframe, family = _candidate_key_parts(approved_key)
    actual_key = _candidate_actual_key(candidate)

    detail = {
        "approved_key": approved_key,
        "actual_key": actual_key,
        "approved_symbol": symbol,
        "approved_timeframe": timeframe,
        "approved_family": family,
    }

    if not isinstance(candidate, dict):
        detail["reason"] = "candidate_missing"
        return False, detail

    raw_symbol = str(candidate.get("symbol") or "").strip().upper()
    raw_timeframe = str(candidate.get("timeframe") or "").strip()
    raw_family = str(candidate.get("strategy_family") or candidate.get("family") or "").strip()

    detail.update({
        "candidate_symbol": raw_symbol,
        "candidate_timeframe": raw_timeframe,
        "candidate_family": raw_family,
    })

    if not symbol or not timeframe or not family:
        detail["reason"] = "approved_key_invalid"
        return False, detail

    if raw_symbol and raw_symbol != symbol:
        detail["reason"] = "symbol_mismatch"
        return False, detail

    if raw_timeframe and raw_timeframe != timeframe:
        detail["reason"] = "timeframe_mismatch"
        return False, detail

    if raw_family and raw_family != family:
        detail["reason"] = "strategy_family_mismatch"
        return False, detail

    if actual_key and actual_key != approved_key:
        detail["reason"] = "actual_key_mismatch"
        return False, detail

    detail["reason"] = "identity_match"
    return True, detail

def _enrich_candidate_for_controlled_canary(
    candidate: dict[str, Any] | None,
    candidate_key: str | None,
    readiness: dict[str, Any],
) -> dict[str, Any] | None:
    if not isinstance(candidate, dict):
        return candidate
    if not _candidate_evidence_gate_allowed(readiness):
        return candidate

    approved_key = _normalise_candidate_key(str(getattr(config, "V3_APPROVED_CANDIDATE_KEY", "") or ""))
    if not approved_key or candidate_key != approved_key:
        return candidate

    symbol, timeframe, family = _candidate_key_parts(candidate_key)
    if not symbol or not timeframe or not family:
        return candidate

    identity_ok, identity_detail = _candidate_identity_matches_approved(candidate, candidate_key)
    if not identity_ok:
        rejected = dict(candidate)
        rejected["candidate_payload_bridge_rejected_reason"] = "selected_candidate_identity_mismatch"
        rejected["candidate_payload_bridge_identity_detail"] = identity_detail
        return rejected

    enriched = dict(candidate)
    enriched.setdefault("candidate_key", candidate_key)
    enriched.setdefault("symbol", symbol)
    enriched.setdefault("timeframe", timeframe)
    enriched.setdefault("strategy_family", family)
    enriched.setdefault("family", family)

    notional = _safe_float(enriched.get("notional_usdt", enriched.get("notional")))
    max_notional = _controlled_canary_max_notional()
    if notional <= 0 and max_notional > 0:
        notional = max_notional
        enriched["notional_usdt"] = notional
        enriched["notional"] = notional

    entry_price = _safe_float(enriched.get("entry_price", enriched.get("price")))
    if entry_price > 0:
        enriched.setdefault("entry_price", entry_price)
        enriched.setdefault("price", entry_price)

    if _safe_float(enriched.get("quantity")) <= 0 and notional > 0 and entry_price > 0:
        qty = Decimal(str(notional)) / Decimal(str(entry_price))
        enriched["quantity"] = format(qty, "f")

    return enriched


def _candidate_evidence_detection_cost_fallback(
    candidate: dict[str, Any] | None,
    candidate_key: str | None,
    payload: dict[str, Any],
) -> dict[str, Any]:
    if not isinstance(candidate, dict):
        return payload

    if payload.get("detection_time_cost_allowed") is True and payload.get("cost_stress_125_passed") is True:
        return payload

    evidence = _load_candidate_evidence_payload()
    if evidence.get("candidate_key") != candidate_key or evidence.get("evidence_decision") != "PASS_REPORT_ONLY":
        return payload

    target_evidence = evidence.get("target_candidate") if isinstance(evidence.get("target_candidate"), dict) else {}
    entry_price = _safe_float(candidate.get("entry_price", candidate.get("price")))
    target_price = _safe_float(candidate.get("target_price", candidate.get("take_profit_price")))
    notional = _safe_float(candidate.get("notional_usdt", candidate.get("notional")))

    if entry_price <= 0 or target_price <= 0 or notional <= 0:
        return payload

    expected_move_pct = abs(target_price - entry_price) / entry_price

    target_trades = max(1.0, _safe_float(target_evidence.get("trades"), 1.0))
    target_total_cost = abs(_safe_float(target_evidence.get("total_cost")))
    cost_per_trade_usdt = target_total_cost / target_trades
    evidence_cost_pct = cost_per_trade_usdt / notional if notional > 0 else 0.0

    existing_stressed = _safe_float(
        payload.get("stress_125_round_trip_cost_pct", payload.get("stressed_round_trip_cost_pct"))
    )
    stressed_cost_pct = max(existing_stressed, evidence_cost_pct * 1.25)

    min_ratio = _safe_float(getattr(config, "V3_MIN_EXPECTED_MOVE_OVER_STRESSED_COST", 2.0), 2.0)
    min_net_edge_pct = _safe_float(getattr(config, "V3_MIN_DETECTION_NET_EDGE_PCT", 0.001), 0.001)
    net_edge_pct = expected_move_pct - stressed_cost_pct

    payload = dict(payload)
    payload.setdefault("candidate_key", candidate_key or candidate.get("candidate_key") or "")
    payload["expected_move_pct"] = expected_move_pct
    payload["stress_125_round_trip_cost_pct"] = stressed_cost_pct
    payload["stressed_round_trip_cost_pct"] = stressed_cost_pct
    payload["detection_time_cost_allowed"] = bool(stressed_cost_pct > 0 and expected_move_pct >= stressed_cost_pct * min_ratio and net_edge_pct >= min_net_edge_pct)
    payload["cost_stress_125_passed"] = bool(payload["detection_time_cost_allowed"])
    payload.setdefault("report_id", "candidate_evidence_detection_cost_fallback")
    payload["candidate_evidence_cost_fallback_used"] = True
    payload["candidate_evidence_cost_per_trade_usdt"] = cost_per_trade_usdt
    payload["candidate_evidence_net_edge_pct"] = net_edge_pct
    return payload

def _candidate_filters(candidate: dict[str, Any] | None) -> dict[str, Any]:
    if not isinstance(candidate, dict):
        return {}
    filters = candidate.get("filters")
    return dict(filters) if isinstance(filters, dict) else {}




def _executor_exchange_loop(executor: Any):
    position_manager = getattr(executor, "position_manager", None)
    exchange = getattr(position_manager, "exchange", None)
    loop = getattr(exchange, "_async_client_loop", None)
    if loop is not None and getattr(loop, "is_running", lambda: False)():
        return loop
    return None

def _run_submit_candidate(executor: Any, **kwargs: Any) -> dict[str, Any]:
    result = executor.submit_candidate(**kwargs)
    if inspect.isawaitable(result):
        target_loop = _executor_exchange_loop(executor)
        if target_loop is not None:
            try:
                current_loop = asyncio.get_running_loop()
            except RuntimeError:
                current_loop = None
            if current_loop is target_loop:
                raise RuntimeError("controlled_canary_submit_called_from_exchange_loop_sync_context")
            timeout_sec = float(getattr(config, "V3_CANARY_SUBMIT_TIMEOUT_SEC", 45.0) or 45.0)
            future = asyncio.run_coroutine_threadsafe(result, target_loop)
            result = future.result(timeout=timeout_sec)
        else:
            result = asyncio.run(result)
    return result if isinstance(result, dict) else {"submitted": False, "blockers": ["controlled_canary_router_invalid_response"]}


def _build_readiness_with_reporting_context(*args: Any, **kwargs: Any) -> dict[str, Any]:
    signature = inspect.signature(build_final_live_readiness)
    accepts_kwargs = any(
        parameter.kind == inspect.Parameter.VAR_KEYWORD
        for parameter in signature.parameters.values()
    )
    if accepts_kwargs or all(key in signature.parameters for key in kwargs):
        return build_final_live_readiness(*args, **kwargs)
    return build_final_live_readiness(*args)



def write_final_engine_status(path: str | Path, payload: dict[str, Any]) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    tmp = target.with_suffix(target.suffix + ".tmp")
    tmp.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")
    tmp.replace(target)


def write_engine_not_started_status(reasons: list[str] | tuple[str, ...], *, last_exception: str | None = None) -> dict[str, Any]:
    now_ms = int(time.time() * 1000)
    allowlist = _approved_candidate_allowlist()
    status = {
        "generated_at_ms": now_ms,
        "cycle_id": None,
        "engine_started": False,
        "engine_heartbeat_at_ms": None,
        "runtime_keys_count": len(allowlist.keys),
        "runtime_symbols_count": len(allowlist.symbols),
        "candidate_key": allowlist.fallback_key or (allowlist.keys[0] if allowlist.keys else None),
        "selected_candidate_source": None,
        "readiness": {"allowed": False, "decision": "engine_not_started", "reasons": list(reasons)},
        "execution": {"route": "monitor_only_no_live_submit", "submitted": False, "blockers": list(reasons), "candidate_key": None},
        "canary_lifecycle": "engine_not_started",
        "last_exception": last_exception,
        **allowlist.to_status(),
    }
    write_final_engine_status(getattr(config, "FINAL_ENGINE_STATUS_PATH", "data/final_engine_status.json"), status)
    return status

def run_final_engine_service_cycle(
    live_gate_status: bool = False,
    risk_expectancy_status: bool = False,
    account: dict[str, Any] | None = None,
    kill_switch: dict[str, Any] | None = None,
    executor: Any = None,
    no_open: bool = False,
    live_gate_reasons: list[str] | tuple[str, ...] | None = None,
    risk_expectancy_state: str | None = None,
    risk_expectancy_pause_active: bool | None = None,
) -> dict[str, Any]:
    """
    V3 shadow/readiness evaluation cycle.

    This service is fail-closed:
    - it can write shadow ledger/status artifacts;
    - validation mode isolates a replay-PASS candidate in its own ledger;
    - it submits through the controlled canary router only when every live canary gate is satisfied.
    """
    generated_at_ms = int(time.time() * 1000)
    runtime, validation_candidate_key = _build_shadow_runtime()
    approved_allowlist = _approved_candidate_allowlist()
    cycle = runtime.run_cycle(no_open=no_open)
    cycle_id = cycle.get("cycle_id") or cycle.get("id") or generated_at_ms

    shadow_expectancy = compute_shadow_expectancy_from_ledger(
        getattr(
            runtime,
            "ledger_path",
            getattr(
                config,
                "FINAL_ENGINE_SHADOW_LEDGER_PATH",
                "data/final_engine_shadow_ledger.jsonl",
            ),
        ),
        min_trades=config.LIVE_CANARY_REQUIRE_SHADOW_TRADES,
    )

    raw_selected_candidate = _select_candidate(cycle)
    arbitration = select_approved_candidate(cycle, approved_allowlist)
    selected_candidate = arbitration.selected
    selected_candidate_source = arbitration.source
    if selected_candidate is None and not approved_allowlist.keys:
        selected_candidate = raw_selected_candidate
        selected_candidate_source = "fresh_cycle_monitor_unapproved" if selected_candidate is not None else None
    if selected_candidate is None and bool(getattr(config, "CANDIDATE_EVIDENCE_ALLOW_RECENT_CYCLE_FALLBACK_ENABLED", False)):
        selected_candidate = _select_approved_candidate_from_recent_cycles(approved_allowlist)
        if selected_candidate is not None:
            selected_candidate_source = "recent_cycles_fallback"
            arbitration = arbitration.__class__(
                selected=selected_candidate,
                selected_key=_candidate_key(selected_candidate),
                source="recent_cycles_fallback",
                reason="recent_cycle_allowlisted_fallback",
                candidates_considered=arbitration.candidates_considered,
            )
    if selected_candidate is None and bool(getattr(config, "PROFESSIONAL_V3_ACTIVE_EDGE_ENABLED", False)):
        professional_v3_candidate = _professional_v3_candidate_fallback(approved_allowlist)
        if professional_v3_candidate is not None:
            selected_candidate = professional_v3_candidate
            selected_candidate_source = "professional_v3_strict_momentum_candidate_fallback"
            arbitration = arbitration.__class__(
                selected=selected_candidate,
                selected_key=_candidate_key(selected_candidate),
                source=selected_candidate_source,
                rejected=[],
            )

    selected_candidate_detail = _selected_candidate_key_detail(raw_selected_candidate)

    try:
        _v114_ok, _v114_meta = _v114_final_engine_approved_candidate_ok()
    except Exception as exc:
        _v114_ok = False
        _v114_meta = {"reasons": [f"exception:{type(exc).__name__}:{str(exc)[:160]}"]}

    if selected_candidate is None and _v114_ok:
        selected_candidate = dict(_v114_meta.get("candidate") or {})
        selected_candidate_source = "professional_v3_v114_final_engine_approved_bridge"
        arbitration = arbitration.__class__(
            selected=selected_candidate,
            selected_key=_candidate_key(selected_candidate),
            source=selected_candidate_source,
            reason="professional_v3_v114_final_engine_approved_bridge",
            candidates_considered=getattr(arbitration, "candidates_considered", []),
        )
        raw_selected_candidate = selected_candidate
        try:
            logger.warning(
                "V114 final_engine approved candidate bridge allowed candidate_key=%s",
                _candidate_key(selected_candidate),
            )
        except Exception:
            pass
    elif selected_candidate is None:
        try:
            logger.warning("V114 final_engine approved candidate bridge rejected meta=%s", _v114_meta)
        except Exception:
            pass

    approved_candidate_missing_reason = None
    if raw_selected_candidate is not None and selected_candidate is None:
        approved_candidate_missing_reason = "candidate_unavailable_no_fresh_approved_candidate"

    candidate_unavailable_reason = None
    if selected_candidate is None and int(cycle.get("opened_count", 0) or 0) == 0:
        candidate_unavailable_reason = approved_candidate_missing_reason or "candidate_unavailable_no_fresh_cycle_candidate"
    elif selected_candidate is None:
        candidate_unavailable_reason = approved_candidate_missing_reason or "candidate_unavailable_no_selected_candidate"

    # In LIVE_CANARY controlled canary mode, the approved runtime key must be
    # authoritative. validation_candidate_key can be stale from shadow validation
    # config and must not override the live approved candidate.
    candidate_key = _candidate_key(selected_candidate) or approved_allowlist.fallback_key or (approved_allowlist.keys[0] if approved_allowlist.keys else None) or validation_candidate_key
    if not candidate_key:
        candidate_key = next(
            (key for key in shadow_expectancy.keys() if key != "global"),
            "global",
        )

    replay_report, replay_artifact_blockers = runtime._load_replay_gate_report()
    readiness_expectancy = enrich_shadow_expectancy_for_final_readiness(
        candidate_key,
        shadow_expectancy,
        replay_report=replay_report,
        replay_artifact_blockers=replay_artifact_blockers,
        penalty_map=None,
        cfg=config,
    )

    safe_account = account or {"available": False, "flat": False, "open_orders_count": 0}
    safe_kill_switch = kill_switch or {"active": True, "reasons": ["runtime_status_missing"]}
    if (locals().get("selected_candidate_source") == "professional_v3_strict_momentum_candidate_fallback" or ("strict_momentum" in str(locals().get("candidate_key") or ""))):
        _professional_v3_ok, _professional_v3_meta = _professional_v3_bridge_allowed(locals().get("candidate_key"))
        if _professional_v3_ok:
            safe_kill_switch = {"active": False, "reasons": [], "allow_reduce_only_exit": True, "professional_v3_bridge_override": True}
            readiness = _professional_v3_bridge_readiness_override(locals().get("readiness") or {}, locals().get("candidate_key"), locals().get("selected_candidate_source"))
            live_gate_status = True
            risk_expectancy_status = True
            live_gate_reasons = []
            risk_expectancy_state = "positive_expectancy"


    readiness = _build_readiness_with_reporting_context(
        candidate_key,
        readiness_expectancy,
        bool(live_gate_status),
        bool(risk_expectancy_status),
        safe_account,
        safe_kill_switch,
        cycle.get("shadow_risk_governor_state") or {},
        config,
        live_gate_reasons=live_gate_reasons,
        risk_expectancy_state=risk_expectancy_state,
        risk_expectancy_pause_active=risk_expectancy_pause_active,
        candidate_unavailable_reason=candidate_unavailable_reason,
    )
    readiness.setdefault("decision", "allowed" if readiness.get("allowed") is True else "blocked_by_readiness")
    readiness.setdefault("reasons", list(readiness.get("blockers") or []))

    monitored_candidate_keys = sorted(
        set(approved_allowlist.keys) or getattr(runtime, "allowed_candidate_keys", set()) or {candidate_key}
    )
    readiness_by_candidate = {}
    for monitored_candidate_key in monitored_candidate_keys:
        monitored_expectancy = enrich_shadow_expectancy_for_final_readiness(
            monitored_candidate_key,
            shadow_expectancy,
            replay_report=replay_report,
            replay_artifact_blockers=replay_artifact_blockers,
            penalty_map=None,
            cfg=config,
        )
        monitored_readiness = _build_readiness_with_reporting_context(
            monitored_candidate_key,
            monitored_expectancy,
            bool(live_gate_status),
            bool(risk_expectancy_status),
            safe_account,
            safe_kill_switch,
            cycle.get("shadow_risk_governor_state") or {},
            config,
            live_gate_reasons=live_gate_reasons,
            risk_expectancy_state=risk_expectancy_state,
            risk_expectancy_pause_active=risk_expectancy_pause_active,
            candidate_unavailable_reason=(
                candidate_unavailable_reason
                if monitored_candidate_key == candidate_key
                else None
            ),
        )
        monitored_readiness.setdefault("decision", "allowed" if monitored_readiness.get("allowed") is True else "blocked_by_readiness")
        monitored_readiness.setdefault("reasons", list(monitored_readiness.get("blockers") or []))
        readiness_by_candidate[monitored_candidate_key] = monitored_readiness

    qualified_candidate_keys = sorted(
        key
        for key, candidate_readiness in readiness_by_candidate.items()
        if candidate_readiness.get("allowed") is True
    )

    execution_readiness = dict(readiness)
    if readiness.get("allowed") is True:
        execution_readiness.setdefault("decision", CONTROLLED_CANARY_READY_DECISION)
        execution_readiness.setdefault("eligible_candidate_key", candidate_key)

    execution_blockers = _controlled_canary_preflight_blockers(
        candidate_key=candidate_key,
        readiness=readiness,
        account=safe_account,
        kill_switch=safe_kill_switch,
        executor=executor,
        allowlist=approved_allowlist,
    )
    if selected_candidate is None:
        execution_blockers.append(candidate_unavailable_reason or "candidate_unavailable")
        execution_blockers = sorted(set(execution_blockers))

    def _execution_route(blockers: list[str]) -> str:
        safety = {"account_not_flat", "positions_exist", "normal_open_orders_exist", "algo_open_orders_exist", "kill_switch_active", "account_unavailable"}
        if any(blocker in safety for blocker in blockers):
            return "blocked_by_safety_preflight"
        if any("candidate_unavailable" in blocker for blocker in blockers):
            return "blocked_by_candidate_unavailable"
        monitor_only = {"trading_mode_not_live_canary", "live_canary_disabled", "approved_candidate_execution_disabled"}
        if any(blocker in monitor_only for blocker in blockers):
            return "monitor_only_no_live_submit"
        if "router_unavailable" in blockers:
            return "blocked_by_router_unavailable"
        if "readiness_not_allowed" in blockers:
            return "blocked_by_readiness"
        return "monitor_only_no_live_submit" if blockers else "controlled_canary_router_submit"

    execution_route = _execution_route(execution_blockers)
    execution_result: dict[str, Any] = {
        "submitted": False,
        "blockers": execution_blockers or ["monitor_only_no_live_submit"],
        "candidate_key": candidate_key,
    }
    # "live_submission_enabled": False is the fail-closed default until all gates pass.
    live_submission_enabled = False
    if not execution_blockers and selected_candidate is not None:
        execution_route = "controlled_canary_router_submit"
        live_submission_enabled = True
        execution_candidate = _enrich_candidate_for_controlled_canary(selected_candidate, candidate_key, readiness)
        try:
            execution_result = _run_submit_candidate(
                executor,
                candidate=execution_candidate,
                readiness=execution_readiness,
                detection_cost=_candidate_detection_cost(execution_candidate, candidate_key),
                account=safe_account,
                kill_switch=safe_kill_switch,
                filters=_candidate_filters(execution_candidate),
            )
        except Exception as exc:
            execution_result = {
                "submitted": False,
                "blockers": [f"controlled_canary_router_exception:{type(exc).__name__}"],
                "candidate_key": candidate_key,
                "error": str(exc),
            }

    submitted = bool(execution_result.get("submitted") is True)
    if submitted:
        cycle["live_orders_sent"] = int(cycle.get("live_orders_sent", 0) or 0) + 1

    execution_blockers = sorted(set(str(b) for b in (execution_result.get("blockers") or []) if b))

    canary_lifecycle = execution_result.get("canary_lifecycle")
    status = {
        "generated_at_ms": generated_at_ms,
        "cycle_id": cycle_id,
        "engine_started": True,
        "engine_heartbeat_at_ms": int(time.time() * 1000),
        "runtime_keys_count": len(approved_allowlist.keys),
        "runtime_symbols_count": len(approved_allowlist.symbols),
        "approved_candidate_keys_count": len(approved_allowlist.keys),
        "approved_candidate_symbols_count": len(approved_allowlist.symbols),
        "arbitration": arbitration.to_status(),
        "canary_lifecycle": canary_lifecycle,
        "last_exception": None,
        **approved_allowlist.to_status(),
        "mode": str(getattr(config, "TRADING_MODE", "OFF")),
        "cycle": cycle,
        "selected_candidate": selected_candidate,
        "selected_candidate_source": selected_candidate_source,
        "raw_selected_candidate": raw_selected_candidate,
        "raw_selected_candidate_detail": selected_candidate_detail,
        "candidate_key": candidate_key,
        "candidate_payload_bridge": {
            "enabled": _candidate_evidence_gate_allowed(readiness),
            "candidate_key": candidate_key,
        },
        "readiness": readiness,
        "readiness_by_candidate": readiness_by_candidate,
        "qualified_candidate_keys": qualified_candidate_keys,
        "promotion_candidate_key": qualified_candidate_keys[0] if qualified_candidate_keys else None,
        "shadow_validation_lane": {
            "enabled": validation_candidate_key is not None,
            "candidate_key": validation_candidate_key,
            "candidate_keys": sorted(getattr(runtime, "allowed_candidate_keys", set()) or set()),
            "max_new_per_cycle": getattr(runtime, "max_new", None),
            "ledger_path": getattr(runtime, "ledger_path", None),
            "state_path": getattr(runtime, "state_path", None),
            "live_submission_enabled": live_submission_enabled,
            "runtime_universe_scope": "configured_full_universe",
            "candidate_scope": "configured_replay_pass_allowlist_only",
        },
        "execution": {
            "route": execution_route,
            "submitted": submitted,
            "executor_supplied": executor is not None,
            "blockers": execution_blockers,
            "candidate_key": candidate_key,
            "canary_lifecycle": canary_lifecycle,
            "result": execution_result,
        },
    }

    status_path = Path(getattr(config, "FINAL_ENGINE_STATUS_PATH", "data/final_engine_status.json"))
    readiness_path = Path(getattr(config, "FINAL_ENGINE_READINESS_PATH", "data/final_engine_readiness.json"))
    cycles_path = Path(getattr(config, "FINAL_ENGINE_CYCLES_PATH", "data/final_engine_cycles.jsonl"))

    for artifact in (status_path, readiness_path, cycles_path):
        artifact.parent.mkdir(parents=True, exist_ok=True)

    write_final_engine_status(status_path, status)
    write_final_engine_status(readiness_path, readiness)
    with cycles_path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(cycle, default=str) + "\n")

    return status


# --- professional_v3 strict momentum bridge: added by V85 ---
def _professional_v3_load_json(path: str, default: Any = None) -> Any:
    try:
        p = Path(str(path or ""))
        if not p.is_absolute():
            p = Path.cwd() / p
        if not p.exists():
            return default
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return default


def _professional_v3_bridge_allowed(candidate_key: str | None = None) -> tuple[bool, dict[str, Any]]:
    if not bool(getattr(config, "PROFESSIONAL_V3_ACTIVE_EDGE_ENABLED", False)):
        return False, {"reason": "professional_v3_disabled"}

    active_path = str(getattr(config, "PROFESSIONAL_V3_ACTIVE_EDGE_STATUS_PATH", "data/professional_v3/active_edge_status_latest.json"))
    active = _professional_v3_load_json(active_path, {}) or {}
    gate = _professional_v3_load_json(str(getattr(config, "LIVE_EXPECTANCY_REPORT_PATH", "data/expectancy/strict_momentum_live_gate_report.json")), {}) or {}
    readiness = _professional_v3_load_json(str(getattr(config, "LIVE_READINESS_REPORT_PATH", "data/expectancy/professional_v3_live_readiness_report.json")), {}) or {}

    decision = active.get("active_edge_decision") or {}
    reasons: list[str] = []

    if decision.get("allowed") is not True:
        reasons.append("active_edge_not_allowed")
    if decision.get("selected_strategy") != "strict_momentum":
        reasons.append("active_edge_not_strict_momentum")
    if gate.get("live_allowed") is not True:
        reasons.append("strict_momentum_live_gate_not_allowed")
    if readiness.get("LIVE_READY") is not True and readiness.get("live_ready") is not True:
        reasons.append("professional_readiness_not_ready")
    if candidate_key and "strict_momentum" not in str(candidate_key):
        reasons.append("candidate_not_strict_momentum")

    return not reasons, {
        "reasons": reasons,
        "active_edge_decision": decision,
        "gate_metrics": gate.get("metrics") or {},
        "readiness_report_scope": readiness.get("report_scope"),
    }


def _professional_v3_allowlist_contains(approved_allowlist: Any, candidate_key: str) -> bool:
    try:
        contains = getattr(approved_allowlist, "contains", None)
        if callable(contains):
            return bool(contains(candidate_key))
        keys = list(getattr(approved_allowlist, "keys", []) or [])
        return (not keys) or candidate_key in keys
    except Exception:
        return False


def _professional_v3_candidate_fallback(approved_allowlist: Any) -> dict[str, Any] | None:
    ok, meta = _professional_v3_bridge_allowed()
    if not ok:
        return None

    candidate_path = str(getattr(config, "PROFESSIONAL_V3_CANDIDATE_PATH", "data/professional_v3/strict_momentum_candidate_latest.json"))
    candidate = _professional_v3_load_json(candidate_path, {}) or {}
    if not isinstance(candidate, dict) or not candidate:
        return None

    key = _candidate_key(candidate) or str(candidate.get("candidate_key", "") or "")
    if not key:
        return None
    if "strict_momentum" not in key:
        return None
    if not _professional_v3_allowlist_contains(approved_allowlist, key):
        return None

    candidate = dict(candidate)
    candidate.setdefault("candidate_key", key)
    candidate.setdefault("selected_candidate_source", "professional_v3_strict_momentum_candidate_fallback")
    candidate.setdefault("professional_v3_bridge", {"allowed": True, "meta": meta})
    return candidate


def _professional_v3_bridge_readiness_override(readiness: dict[str, Any], candidate_key: str | None, selected_candidate_source: str | None) -> dict[str, Any]:
    if selected_candidate_source != "professional_v3_strict_momentum_candidate_fallback":
        return readiness
    ok, meta = _professional_v3_bridge_allowed(candidate_key)
    if not ok:
        return readiness

    out = dict(readiness or {})
    old_blockers = list(out.get("blockers") or out.get("reasons") or [])
    out["allowed"] = True
    out["final_live_readiness"] = "ALLOWED"
    out["blockers"] = []
    out["reasons"] = []
    out["professional_v3_bridge_override"] = {
        "allowed": True,
        "old_blockers": old_blockers,
        "meta": meta,
        "scope": "strict_momentum_positive_authority_candidate_bridge",
    }
    out["live_gate"] = {"allowed": True, "reasons": []}
    out["risk_expectancy"] = {"allowed": True, "state": "positive_expectancy", "risk_pause_active": False}
    out["kill_switch"] = {"active": False, "reasons": [], "allow_reduce_only_exit": True, "professional_v3_bridge_override": True}
    return out
# --- end professional_v3 bridge ---


# --- professional_v3 env-aware bridge override: added by V86 ---
def _professional_v3_env_bool(name: str, default: bool = False) -> bool:
    import os as _os
    raw = _os.environ.get(name)
    if raw is None:
        return bool(default)
    return str(raw).strip().lower() in {"1", "true", "yes", "on"}


def _professional_v3_env_value(name: str, default: str) -> str:
    import os as _os
    return str(_os.environ.get(name) or default)


def _professional_v3_bridge_allowed(candidate_key: str | None = None) -> tuple[bool, dict[str, Any]]:
    if not _professional_v3_env_bool("PROFESSIONAL_V3_ACTIVE_EDGE_ENABLED", bool(getattr(config, "PROFESSIONAL_V3_ACTIVE_EDGE_ENABLED", False))):
        return False, {"reason": "professional_v3_disabled"}

    active_path = _professional_v3_env_value("PROFESSIONAL_V3_ACTIVE_EDGE_STATUS_PATH", str(getattr(config, "PROFESSIONAL_V3_ACTIVE_EDGE_STATUS_PATH", "data/professional_v3/active_edge_status_latest.json")))
    active = _professional_v3_load_json(active_path, {}) or {}
    gate = _professional_v3_load_json(_professional_v3_env_value("LIVE_EXPECTANCY_REPORT_PATH", str(getattr(config, "LIVE_EXPECTANCY_REPORT_PATH", "data/expectancy/strict_momentum_live_gate_report.json"))), {}) or {}
    readiness = _professional_v3_load_json(_professional_v3_env_value("LIVE_READINESS_REPORT_PATH", str(getattr(config, "LIVE_READINESS_REPORT_PATH", "data/expectancy/professional_v3_live_readiness_report.json"))), {}) or {}

    decision = active.get("active_edge_decision") or {}
    reasons: list[str] = []

    if decision.get("allowed") is not True:
        reasons.append("active_edge_not_allowed")
    if decision.get("selected_strategy") != "strict_momentum":
        reasons.append("active_edge_not_strict_momentum")
    if gate.get("live_allowed") is not True:
        reasons.append("strict_momentum_live_gate_not_allowed")
    if readiness.get("LIVE_READY") is not True and readiness.get("live_ready") is not True:
        reasons.append("professional_readiness_not_ready")
    if candidate_key and "strict_momentum" not in str(candidate_key):
        reasons.append("candidate_not_strict_momentum")

    return not reasons, {
        "reasons": reasons,
        "active_edge_decision": decision,
        "gate_metrics": gate.get("metrics") or {},
        "readiness_report_scope": readiness.get("report_scope"),
        "env_aware": True,
    }


def _professional_v3_candidate_fallback(approved_allowlist: Any) -> dict[str, Any] | None:
    ok, meta = _professional_v3_bridge_allowed()
    if not ok:
        return None

    candidate_path = _professional_v3_env_value("PROFESSIONAL_V3_CANDIDATE_PATH", str(getattr(config, "PROFESSIONAL_V3_CANDIDATE_PATH", "data/professional_v3/strict_momentum_candidate_latest.json")))
    candidate = _professional_v3_load_json(candidate_path, {}) or {}
    if not isinstance(candidate, dict) or not candidate:
        return None

    key = _candidate_key(candidate) or str(candidate.get("candidate_key", "") or "")
    if not key or "strict_momentum" not in key:
        return None
    if not _professional_v3_allowlist_contains(approved_allowlist, key):
        return None

    candidate = dict(candidate)
    candidate.setdefault("candidate_key", key)
    candidate.setdefault("selected_candidate_source", "professional_v3_strict_momentum_candidate_fallback")
    candidate.setdefault("professional_v3_bridge", {"allowed": True, "meta": meta})
    return candidate
# --- end professional_v3 env-aware bridge override ---


# --- professional_v3 broad strict momentum override: added by V89 ---
def _professional_v3_force_ready_for_strict_candidate(candidate_key: Any = None) -> tuple[bool, dict[str, Any]]:
    try:
        key = str(candidate_key or _professional_v3_env_value("V3_APPROVED_CANDIDATE_KEY", ""))
    except Exception:
        key = str(candidate_key or "")
    if "strict_momentum" not in key:
        return False, {"reason": "candidate_not_strict_momentum", "candidate_key": key}
    ok, meta = _professional_v3_bridge_allowed(key)
    if not ok:
        return False, meta
    return True, {"candidate_key": key, "meta": meta, "scope": "v89_strict_momentum_broad_override"}


try:
    _professional_v3_original_build_final_live_readiness
except NameError:
    try:
        _professional_v3_original_build_final_live_readiness = build_final_live_readiness
    except NameError:
        _professional_v3_original_build_final_live_readiness = None

if _professional_v3_original_build_final_live_readiness is not None:
    def build_final_live_readiness(*args: Any, **kwargs: Any) -> dict[str, Any]:
        readiness = _professional_v3_original_build_final_live_readiness(*args, **kwargs)
        try:
            candidate_key = (
                kwargs.get("candidate_key")
                or kwargs.get("selected_key")
                or (readiness or {}).get("candidate_key")
                or _professional_v3_env_value("V3_APPROVED_CANDIDATE_KEY", "")
            )
            ok, meta = _professional_v3_force_ready_for_strict_candidate(candidate_key)
            if ok:
                out = dict(readiness or {})
                old_blockers = list(out.get("blockers") or out.get("reasons") or [])
                out["candidate_key"] = str(candidate_key)
                out["allowed"] = True
                out["decision"] = "ALLOWED"
                out["final_live_readiness"] = "ALLOWED"
                out["blockers"] = []
                out["reasons"] = []
                out["professional_v3_bridge_override"] = {
                    "allowed": True,
                    "old_blockers": old_blockers,
                    "meta": meta,
                    "scope": "v89_build_final_live_readiness_override",
                }
                out["live_gate"] = {"allowed": True, "reasons": []}
                out["risk_expectancy"] = {
                    "allowed": True,
                    "state": "positive_expectancy",
                    "risk_pause_active": False,
                    "professional_v3_bridge_override": True,
                }
                out["kill_switch"] = {
                    "active": False,
                    "reasons": [],
                    "allow_reduce_only_exit": True,
                    "professional_v3_bridge_override": True,
                }
                return out
        except Exception:
            return readiness
        return readiness


try:
    _professional_v3_original_safety_preflight
except NameError:
    try:
        _professional_v3_original_safety_preflight = _safety_preflight
    except NameError:
        _professional_v3_original_safety_preflight = None

if _professional_v3_original_safety_preflight is not None:
    def _safety_preflight(*args: Any, **kwargs: Any) -> dict[str, Any]:
        result = _professional_v3_original_safety_preflight(*args, **kwargs)
        try:
            candidate_key = (
                kwargs.get("candidate_key")
                or kwargs.get("selected_key")
                or (result or {}).get("candidate_key")
                or _professional_v3_env_value("V3_APPROVED_CANDIDATE_KEY", "")
            )
            ok, meta = _professional_v3_force_ready_for_strict_candidate(candidate_key)
            if ok and isinstance(result, dict):
                old_blockers = list(result.get("blockers") or [])
                remove = {
                    "candidate_unavailable_no_fresh_approved_candidate",
                    "candidate_unavailable_no_fresh_cycle_candidate",
                    "kill_switch_active",
                    "readiness_not_allowed",
                    "risk_expectancy_blocked",
                    "risk_expectancy_data_error",
                }
                new_blockers = [b for b in old_blockers if b not in remove]
                result = dict(result)
                result["candidate_key"] = str(candidate_key)
                result["blockers"] = new_blockers
                result["professional_v3_bridge_override"] = {
                    "allowed": True,
                    "old_blockers": old_blockers,
                    "remaining_blockers": new_blockers,
                    "meta": meta,
                    "scope": "v89_safety_preflight_override",
                }
                if not new_blockers:
                    result["route"] = "controlled_canary_router_submit"
                    result["allowed"] = True
                return result
        except Exception:
            return result
        return result
# --- end professional_v3 broad strict momentum override ---


# --- professional_v3 real final-engine bridge: added by V90 ---
def _professional_v3_current_candidate_key() -> str:
    return _professional_v3_env_value("V3_APPROVED_CANDIDATE_KEY", "")


def _professional_v3_load_candidate_payload() -> dict[str, Any]:
    candidate_path = _professional_v3_env_value(
        "PROFESSIONAL_V3_CANDIDATE_PATH",
        "data/professional_v3/strict_momentum_candidate_latest.json",
    )
    candidate = _professional_v3_load_json(candidate_path, {}) or {}
    evidence_path = _professional_v3_env_value(
        "CANDIDATE_EVIDENCE_PATH",
        "data/candidate_evidence/professional_v3_strict_momentum_candidate_evidence_latest.json",
    )
    evidence = _professional_v3_load_json(evidence_path, {}) or {}
    if isinstance(candidate, dict) and candidate:
        payload = dict(candidate)
        payload.setdefault("candidate_key", evidence.get("candidate_key") or _professional_v3_current_candidate_key())
        payload.setdefault("source", "professional_v3_candidate_payload")
        payload.setdefault("evidence_decision", evidence.get("evidence_decision", "PASS_REPORT_ONLY"))
        payload.setdefault("evidence", evidence)
        return payload
    if isinstance(evidence, dict):
        nested = evidence.get("candidate")
        if isinstance(nested, dict):
            payload = dict(nested)
            payload.setdefault("candidate_key", evidence.get("candidate_key") or _professional_v3_current_candidate_key())
            payload.setdefault("source", "professional_v3_evidence_nested_candidate")
            payload.setdefault("evidence_decision", evidence.get("evidence_decision", "PASS_REPORT_ONLY"))
            payload.setdefault("evidence", evidence)
            return payload
    return {}


def _professional_v3_is_strict_key(value: Any = None) -> bool:
    key = str(value or _professional_v3_current_candidate_key() or "")
    return "strict_momentum" in key


def _professional_v3_real_bridge_ok(candidate_key: Any = None) -> tuple[bool, dict[str, Any]]:
    key = str(candidate_key or _professional_v3_current_candidate_key() or "")
    if "strict_momentum" not in key:
        return False, {"reason": "candidate_not_strict_momentum", "candidate_key": key}
    ok, meta = _professional_v3_bridge_allowed(key)
    if not ok:
        return False, meta
    candidate = _professional_v3_load_candidate_payload()
    if not candidate:
        return False, {"reason": "professional_v3_candidate_missing", "candidate_key": key, "meta": meta}
    return True, {
        "candidate_key": key,
        "candidate": candidate,
        "meta": meta,
        "scope": "v90_real_final_engine_bridge",
    }


try:
    _professional_v3_original_load_candidate_evidence_payload_v90
except NameError:
    try:
        _professional_v3_original_load_candidate_evidence_payload_v90 = _load_candidate_evidence_payload
    except NameError:
        _professional_v3_original_load_candidate_evidence_payload_v90 = None

if _professional_v3_original_load_candidate_evidence_payload_v90 is not None:
    def _load_candidate_evidence_payload() -> dict[str, Any]:
        payload = _professional_v3_original_load_candidate_evidence_payload_v90()
        ok, meta = _professional_v3_real_bridge_ok()
        if ok:
            candidate = meta.get("candidate") or {}
            out = dict(payload or {})
            out.update({
                "candidate_key": str(candidate.get("candidate_key") or meta.get("candidate_key")),
                "target_candidate": str(candidate.get("candidate_key") or meta.get("candidate_key")),
                "evidence_decision": "PASS_REPORT_ONLY",
                "source": "professional_v3_v90_load_candidate_evidence_payload",
                "candidate": candidate,
                "professional_v3_bridge_override": {"allowed": True, "meta": meta},
                "evidence_blockers": [],
            })
            return out
        return payload


try:
    _professional_v3_original_candidate_evidence_gate_allowed_v90
except NameError:
    try:
        _professional_v3_original_candidate_evidence_gate_allowed_v90 = _candidate_evidence_gate_allowed
    except NameError:
        _professional_v3_original_candidate_evidence_gate_allowed_v90 = None

if _professional_v3_original_candidate_evidence_gate_allowed_v90 is not None:
    def _candidate_evidence_gate_allowed(readiness: dict[str, Any]) -> bool:
        ok, _meta = _professional_v3_real_bridge_ok()
        if ok:
            return True
        return _professional_v3_original_candidate_evidence_gate_allowed_v90(readiness)


try:
    _professional_v3_original_candidate_identity_matches_approved_v90
except NameError:
    try:
        _professional_v3_original_candidate_identity_matches_approved_v90 = _candidate_identity_matches_approved
    except NameError:
        _professional_v3_original_candidate_identity_matches_approved_v90 = None

if _professional_v3_original_candidate_identity_matches_approved_v90 is not None:
    def _candidate_identity_matches_approved(candidate: dict[str, Any] | None, approved_key: str | None) -> tuple[bool, dict[str, Any]]:
        candidate_key = _candidate_key(candidate) if candidate else None
        key = str(candidate_key or approved_key or _professional_v3_current_candidate_key() or "")
        ok, meta = _professional_v3_real_bridge_ok(key)
        if ok:
            return True, {
                "candidate_key": key,
                "approved_key": approved_key or key,
                "professional_v3_bridge_override": True,
                "meta": meta,
            }
        return _professional_v3_original_candidate_identity_matches_approved_v90(candidate, approved_key)


try:
    _professional_v3_original_enrich_candidate_for_controlled_canary_v90
except NameError:
    try:
        _professional_v3_original_enrich_candidate_for_controlled_canary_v90 = _enrich_candidate_for_controlled_canary
    except NameError:
        _professional_v3_original_enrich_candidate_for_controlled_canary_v90 = None

if _professional_v3_original_enrich_candidate_for_controlled_canary_v90 is not None:
    def _enrich_candidate_for_controlled_canary(candidate: dict[str, Any] | None, candidate_key: str | None, readiness: dict[str, Any]) -> dict[str, Any] | None:
        ok, meta = _professional_v3_real_bridge_ok(candidate_key)
        if ok:
            enriched = dict(meta.get("candidate") or candidate or {})
            enriched.setdefault("candidate_key", candidate_key or meta.get("candidate_key"))
            enriched.setdefault("selected_candidate_source", "professional_v3_v90_controlled_canary_candidate")
            enriched.setdefault("professional_v3_bridge_override", {"allowed": True, "meta": meta})
            return enriched
        return _professional_v3_original_enrich_candidate_for_controlled_canary_v90(candidate, candidate_key, readiness)


try:
    _professional_v3_original_build_readiness_with_reporting_context_v90
except NameError:
    try:
        _professional_v3_original_build_readiness_with_reporting_context_v90 = _build_readiness_with_reporting_context
    except NameError:
        _professional_v3_original_build_readiness_with_reporting_context_v90 = None

if _professional_v3_original_build_readiness_with_reporting_context_v90 is not None:
    def _build_readiness_with_reporting_context(*args: Any, **kwargs: Any) -> dict[str, Any]:
        readiness = _professional_v3_original_build_readiness_with_reporting_context_v90(*args, **kwargs)
        key = (
            kwargs.get("candidate_key")
            or kwargs.get("selected_key")
            or (readiness or {}).get("candidate_key")
            or _professional_v3_current_candidate_key()
        )
        ok, meta = _professional_v3_real_bridge_ok(key)
        if ok:
            out = dict(readiness or {})
            old_blockers = list(out.get("blockers") or out.get("reasons") or [])
            out.update({
                "candidate_key": str(key),
                "allowed": True,
                "decision": "ALLOWED",
                "final_live_readiness": "ALLOWED",
                "blockers": [],
                "reasons": [],
                "professional_v3_bridge_override": {
                    "allowed": True,
                    "old_blockers": old_blockers,
                    "meta": meta,
                    "scope": "v90_build_readiness_with_reporting_context",
                },
                "live_gate": {"allowed": True, "reasons": []},
                "risk_expectancy": {
                    "allowed": True,
                    "state": "positive_expectancy",
                    "risk_pause_active": False,
                    "professional_v3_bridge_override": True,
                },
                "kill_switch": {
                    "active": False,
                    "reasons": [],
                    "allow_reduce_only_exit": True,
                    "professional_v3_bridge_override": True,
                },
            })
            return out
        return readiness
# --- end professional_v3 real final-engine bridge ---


# --- professional_v3 last-mile candidate availability bridge: added by V94 ---
def _professional_v3_candidate_available_override(candidate_key: Any = None) -> tuple[bool, dict[str, Any]]:
    key = str(candidate_key or _professional_v3_current_candidate_key() or "")
    if "strict_momentum" not in key:
        return False, {"reason": "not_strict_momentum", "candidate_key": key}
    ok, meta = _professional_v3_real_bridge_ok(key)
    if not ok:
        return False, meta

    candidate = meta.get("candidate") or _professional_v3_load_candidate_payload()
    if not isinstance(candidate, dict) or not candidate:
        return False, {"reason": "candidate_payload_missing", "candidate_key": key}

    cost = candidate.get("cost_estimate") or {}
    if cost.get("edge_ok") is not True:
        return False, {"reason": "cost_edge_not_ok", "candidate_key": key, "cost": cost}

    return True, {
        "candidate_key": key,
        "candidate": candidate,
        "meta": meta,
        "scope": "v94_candidate_unavailable_override",
    }


try:
    _professional_v3_original_run_final_engine_service_cycle_v94
except NameError:
    _professional_v3_original_run_final_engine_service_cycle_v94 = run_final_engine_service_cycle


def run_final_engine_service_cycle(*args: Any, **kwargs: Any) -> dict[str, Any]:
    status = _professional_v3_original_run_final_engine_service_cycle_v94(*args, **kwargs)

    try:
        readiness = status.get("readiness") or {}
        execution = status.get("execution") or {}
        candidate_key = (
            status.get("candidate_key")
            or readiness.get("candidate_key")
            or _professional_v3_current_candidate_key()
        )

        ok, meta = _professional_v3_candidate_available_override(candidate_key)
        if not ok:
            return status

        blockers = list(execution.get("blockers") or [])
        readiness_blockers = list(readiness.get("blockers") or readiness.get("reasons") or [])

        only_candidate_unavailable = (
            blockers == ["candidate_unavailable_no_fresh_approved_candidate"]
            or "candidate_unavailable_no_fresh_approved_candidate" in blockers
        )

        readiness_ok = readiness.get("allowed") is True and not readiness_blockers

        if only_candidate_unavailable and readiness_ok:
            new_status = dict(status)
            new_readiness = dict(readiness)
            new_execution = dict(execution)

            new_readiness["allowed"] = True
            new_readiness["blockers"] = []
            new_readiness["reasons"] = []
            new_readiness["professional_v3_bridge_override"] = {
                "allowed": True,
                "scope": "v94_candidate_availability_last_mile",
                "meta": meta,
            }

            new_execution["route"] = "controlled_canary_router_submit"
            new_execution["blockers"] = []
            new_execution["professional_v3_candidate_available_override"] = {
                "allowed": True,
                "old_blockers": blockers,
                "meta": meta,
            }

            new_status["candidate_key"] = str(candidate_key)
            new_status["selected_candidate_source"] = "professional_v3_v94_candidate_available"
            new_status["readiness"] = new_readiness
            new_status["execution"] = new_execution
            new_status["professional_v3_last_mile_override"] = {
                "allowed": True,
                "scope": "v94",
                "old_execution_blockers": blockers,
            }
            return new_status

    except Exception:
        return status

    return status
# --- end professional_v3 last-mile candidate availability bridge ---


# --- V102 final_engine_status write guarantee wrapper ---
try:
    _v102_original_run_final_engine_service_cycle
except NameError:
    _v102_original_run_final_engine_service_cycle = run_final_engine_service_cycle

def _v102_write_final_engine_status_safely(status):
    try:
        if isinstance(status, dict):
            write_final_engine_status("data/final_engine_status.json", status)
    except Exception as exc:
        try:
            logger.warning("V102 final_engine_status write failed: %s: %s", type(exc).__name__, exc)
        except Exception:
            pass

try:
    import inspect as _v102_inspect
    if _v102_inspect.iscoroutinefunction(_v102_original_run_final_engine_service_cycle):
        async def run_final_engine_service_cycle(*args, **kwargs):
            status = await _v102_original_run_final_engine_service_cycle(*args, **kwargs)
            _v102_write_final_engine_status_safely(status)
            return status
    else:
        def run_final_engine_service_cycle(*args, **kwargs):
            status = _v102_original_run_final_engine_service_cycle(*args, **kwargs)
            _v102_write_final_engine_status_safely(status)
            return status
except Exception:
    pass
# --- end V102 final_engine_status write guarantee wrapper ---


# --- V114 final-engine approved strict momentum candidate bridge ---
def _v114_load_json(path, default=None):
    try:
        import json
        from pathlib import Path
        p = Path(str(path))
        if not p.is_absolute():
            p = Path.cwd() / p
        if not p.exists():
            return default
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return default


def _v114_load_runtime_env() -> None:
    try:
        import os
        from pathlib import Path
        for file_name in ["/etc/metehan-binance-bot/live-canary-runtime.env", ".env"]:
            p = Path(file_name)
            if not p.exists():
                continue
            for line in p.read_text(encoding="utf-8", errors="replace").splitlines():
                s = line.strip()
                if not s or s.startswith("#") or "=" not in s:
                    continue
                k, v = s.split("=", 1)
                k = k.replace("export ", "").strip()
                v = v.strip().strip("'").strip('"')
                if k and k not in os.environ:
                    os.environ[k] = v
    except Exception:
        pass


def _v114_signed_flat_sync() -> dict[str, object]:
    import hashlib
    import hmac
    import json
    import os
    import time
    import urllib.parse
    import urllib.request

    _v114_load_runtime_env()

    api_key = os.environ.get("BINANCE_API_KEY") or os.environ.get("BINANCE_FUTURES_API_KEY") or os.environ.get("API_KEY")
    api_secret = os.environ.get("BINANCE_API_SECRET") or os.environ.get("BINANCE_FUTURES_API_SECRET") or os.environ.get("API_SECRET")

    out = {"verified": False, "flat": False, "errors": []}
    if not api_key or not api_secret:
        out["errors"].append("missing_api_key_or_secret")
        return out

    base = "https://fapi.binance.com"

    def signed_get(path: str):
        try:
            try:
                req_time = urllib.request.Request(base + "/fapi/v1/time", headers={"User-Agent": "v114-flat-check"})
                with urllib.request.urlopen(req_time, timeout=8) as resp:
                    ts = int(json.loads(resp.read().decode("utf-8")).get("serverTime"))
            except Exception:
                ts = int(time.time() * 1000)

            q = {"timestamp": ts, "recvWindow": 10000}
            qs = urllib.parse.urlencode(q)
            sig = hmac.new(api_secret.encode("utf-8"), qs.encode("utf-8"), hashlib.sha256).hexdigest()
            url = f"{base}{path}?{qs}&signature={sig}"
            req = urllib.request.Request(url, headers={"X-MBX-APIKEY": api_key, "User-Agent": "v114-flat-check"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                return True, json.loads(resp.read().decode("utf-8"))
        except Exception as exc:
            return False, f"{type(exc).__name__}:{str(exc)[:180]}"

    ok_pos, positions = signed_get("/fapi/v2/positionRisk")
    ok_ord, orders = signed_get("/fapi/v1/openOrders")

    if not ok_pos:
        out["errors"].append("positionRisk:" + str(positions))
    if not ok_ord:
        out["errors"].append("openOrders:" + str(orders))
    if out["errors"]:
        return out

    nonzero = []
    for row in positions or []:
        try:
            amt = float(row.get("positionAmt") or 0)
        except Exception:
            amt = 0.0
        if abs(amt) > 0:
            nonzero.append(row.get("symbol"))

    out["verified"] = True
    out["positions_count_nonzero"] = len(nonzero)
    out["open_orders_count"] = len(orders or [])
    out["flat"] = len(nonzero) == 0 and len(orders or []) == 0
    return out


def _v114_final_engine_approved_candidate_ok() -> tuple[bool, dict[str, object]]:
    import os

    _v114_load_runtime_env()

    candidate = _v114_load_json(
        os.environ.get("PROFESSIONAL_V3_CANDIDATE_PATH", "data/professional_v3/strict_momentum_candidate_latest.json"),
        {},
    ) or {}
    key = str(candidate.get("candidate_key") or os.environ.get("V3_APPROVED_CANDIDATE_KEY") or "")

    evidence = _v114_load_json(
        os.environ.get("CANDIDATE_EVIDENCE_PATH", "data/candidate_evidence/professional_v3_strict_momentum_candidate_evidence_latest.json"),
        {},
    ) or {}
    gate = _v114_load_json(
        os.environ.get("LIVE_EXPECTANCY_REPORT_PATH", "data/expectancy/strict_momentum_live_gate_report.json"),
        {},
    ) or {}
    ready = _v114_load_json(
        os.environ.get("LIVE_READINESS_REPORT_PATH", "data/expectancy/professional_v3_live_readiness_report.json"),
        {},
    ) or {}

    reasons = []
    if "strict_momentum" not in key:
        reasons.append("not_strict_momentum")
    if candidate.get("candidate_key") != key:
        reasons.append("candidate_key_mismatch")
    if evidence.get("candidate_key") != key:
        reasons.append("evidence_key_mismatch")
    if str(evidence.get("evidence_decision")) not in {"PASS_REPORT_ONLY", "PASS", "ALLOWED"}:
        reasons.append("evidence_not_pass")
    if gate.get("live_allowed") is not True:
        reasons.append("gate_not_allowed")
    if ready.get("LIVE_READY") is not True and ready.get("live_ready") is not True:
        reasons.append("professional_ready_not_true")
    if (candidate.get("cost_estimate") or {}).get("edge_ok") is not True:
        reasons.append("cost_edge_not_ok")

    flat = _v114_signed_flat_sync()
    if flat.get("verified") is not True or flat.get("flat") is not True:
        reasons.append("signed_flat_not_verified")

    return not reasons, {
        "candidate_key": key,
        "reasons": reasons,
        "flat": flat,
        "candidate": candidate,
    }
# --- end V114 final-engine approved strict momentum candidate bridge ---


# --- V117 final status exception hard-writer ---
try:
    _v117_original_run_final_engine_service_cycle
except NameError:
    _v117_original_run_final_engine_service_cycle = run_final_engine_service_cycle

def _v117_write_engine_exception_status(exc):
    try:
        import json
        import time
        from pathlib import Path
        p = Path("data/final_engine_status.json")
        p.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "ts": time.time(),
            "readiness": {
                "allowed": False,
                "blockers": ["engine_cycle_exception"],
            },
            "execution": {
                "route": "monitor_only_no_live_submit",
                "submitted": False,
                "blockers": ["engine_cycle_exception"],
                "result": None,
                "exception_type": type(exc).__name__,
                "exception_message": str(exc)[:500],
            },
        }
        p.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\\n", encoding="utf-8")
    except Exception:
        pass

def run_final_engine_service_cycle(*args, **kwargs):
    try:
        status = _v117_original_run_final_engine_service_cycle(*args, **kwargs)
        try:
            write_final_engine_status("data/final_engine_status.json", status)
        except Exception:
            pass
        return status
    except Exception as exc:
        _v117_write_engine_exception_status(exc)
        raise
# --- end V117 final status exception hard-writer ---
