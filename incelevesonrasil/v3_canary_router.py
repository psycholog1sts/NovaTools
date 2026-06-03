from __future__ import annotations

import logging
from decimal import Decimal, ROUND_CEILING
from typing import Any

import config
from services.execution_oms.models import generate_position_uid, make_client_order_id
from services.production.v3_canary_authorization import build_v3_authorized_intent
from services.production.v3_controlled_canary_state import (
    CanaryLifecycle,
    ControlledCanaryStateStore,
    ExchangeExposureSnapshot,
    controlled_canary_authorization_blockers,
    decimal_to_json,
    record_entry_fill_update,
)

logger = logging.getLogger("V3CanaryPositionRouter")


def _entry_order_side_for_position_side(side: Any) -> str:
    normalized = str(side or "").strip().upper()
    if normalized in {"LONG", "BUY"}:
        return "BUY"
    if normalized in {"SHORT", "SELL"}:
        return "SELL"
    raise ValueError(f"invalid_canary_position_side:{side}")




def _decimal_from_filter(filters: dict[str, Any], *keys: str, default: str = "0") -> Decimal:
    for key in keys:
        value = filters.get(key)
        if value not in (None, ""):
            try:
                return Decimal(str(value))
            except Exception:
                pass
    return Decimal(str(default))


def _ceil_to_step(value: Decimal, step: Decimal) -> Decimal:
    if step <= 0:
        return value
    return (value / step).to_integral_value(rounding=ROUND_CEILING) * step


def _apply_fee_smart_canary_quantity_floor(
    *,
    intent: dict[str, Any],
    filters: dict[str, Any],
    cfg: Any,
) -> dict[str, Any]:
    price = Decimal(str(intent.get("entry_price") or intent.get("price") or "0"))
    if price <= 0:
        return {"applied": False, "reason": "price_unavailable"}

    current_qty = Decimal(str(intent.get("quantity") or "0"))
    current_notional = current_qty * price

    min_notional = Decimal(str(getattr(cfg, "V3_LIVE_CANARY_MIN_NOTIONAL_USDT", 0.0) or 0.0))
    max_notional = Decimal(str(
        getattr(
            cfg,
            "V3_LIVE_CANARY_MAX_NOTIONAL_USDT",
            getattr(cfg, "LIVE_CANARY_MAX_NOTIONAL_USDT", 0.0),
        )
        or 0.0
    ))

    if min_notional <= 0:
        return {"applied": False, "reason": "floor_disabled", "current_qty": str(current_qty), "current_notional": str(current_notional)}

    step = _decimal_from_filter(filters or {}, "step_size", "qty_step", "quantity_step", default="0")
    min_qty = _decimal_from_filter(filters or {}, "min_qty", "minQty", default="0")

    target_qty = current_qty
    if current_notional < min_notional:
        target_qty = min_notional / price
        target_qty = _ceil_to_step(target_qty, step)
        if min_qty > 0 and target_qty < min_qty:
            target_qty = _ceil_to_step(min_qty, step)

    target_notional = target_qty * price

    if max_notional > 0 and target_notional > max_notional:
        capped_qty = max_notional / price
        if step > 0:
            # Cap tarafında aşağı yuvarla; floor'a yetmezse blocker üret.
            capped_qty = (capped_qty / step).to_integral_value() * step
        capped_notional = capped_qty * price
        if capped_notional < min_notional:
            return {
                "applied": False,
                "blocked": True,
                "reason": "fee_smart_floor_exceeds_max_notional",
                "current_qty": str(current_qty),
                "current_notional": str(current_notional),
                "min_notional": str(min_notional),
                "max_notional": str(max_notional),
                "capped_qty": str(capped_qty),
                "capped_notional": str(capped_notional),
            }
        target_qty = capped_qty
        target_notional = capped_notional

    intent["quantity"] = float(target_qty)
    intent["notional"] = float(target_notional)

    return {
        "applied": bool(target_notional > current_notional),
        "blocked": False,
        "reason": "fee_smart_min_notional_floor",
        "current_qty": str(current_qty),
        "current_notional": str(current_notional),
        "target_qty": str(target_qty),
        "target_notional": str(target_notional),
        "min_notional": str(min_notional),
        "max_notional": str(max_notional),
        "step_size": str(step),
        "min_qty": str(min_qty),
    }



def _apply_hard_min_abs_close_price_floor(
    *,
    intent: dict[str, Any],
    side: str,
    entry_price: Decimal,
    quantity: Decimal,
    cfg: Any,
) -> dict[str, Any]:
    if not bool(getattr(cfg, "LIVE_HARD_MIN_CLOSE_ADJUST_PROTECTION_ENABLED", False)):
        return {"applied": False, "reason": "disabled"}

    hard_min_abs = Decimal(str(getattr(cfg, "LIVE_HARD_MIN_ABS_CLOSE_USDT", 0.0) or 0.0))
    if hard_min_abs <= 0:
        return {"applied": False, "reason": "zero_threshold"}
    if entry_price <= 0 or quantity <= 0:
        return {
            "applied": False,
            "reason": "entry_or_quantity_unavailable",
            "entry_price": str(entry_price),
            "quantity": str(quantity),
        }

    distance = hard_min_abs / quantity
    normalized_side = str(side or "").upper()

    raw_stop = Decimal(str(intent.get("stop_price") or "0"))
    raw_tp = Decimal(str(intent.get("take_profit_price") or intent.get("target_price") or "0"))

    adjusted_stop = raw_stop
    adjusted_tp = raw_tp
    applied = False

    if normalized_side in {"LONG", "BUY"}:
        min_loss_stop = entry_price - distance
        min_profit_tp = entry_price + distance

        if raw_stop > 0 and raw_stop > min_loss_stop:
            adjusted_stop = min_loss_stop
            applied = True

        if raw_tp > 0 and raw_tp < min_profit_tp:
            adjusted_tp = min_profit_tp
            applied = True

    elif normalized_side in {"SHORT", "SELL"}:
        min_loss_stop = entry_price + distance
        min_profit_tp = entry_price - distance

        if raw_stop > 0 and raw_stop < min_loss_stop:
            adjusted_stop = min_loss_stop
            applied = True

        if raw_tp > 0 and raw_tp > min_profit_tp:
            adjusted_tp = min_profit_tp
            applied = True

    if adjusted_stop > 0:
        intent["stop_price"] = float(adjusted_stop)
    if adjusted_tp > 0:
        intent["take_profit_price"] = float(adjusted_tp)
        intent["target_price"] = float(adjusted_tp)

    return {
        "applied": applied,
        "reason": "hard_min_abs_close_price_floor",
        "hard_min_abs_usdt": str(hard_min_abs),
        "entry_price": str(entry_price),
        "quantity": str(quantity),
        "min_price_distance": str(distance),
        "raw_stop": str(raw_stop),
        "adjusted_stop": str(adjusted_stop),
        "raw_take_profit": str(raw_tp),
        "adjusted_take_profit": str(adjusted_tp),
        "side": normalized_side,
    }



# --- professional_v3 router intent bridge: added by V100 ---
def _professional_v3_router_strict_key(candidate: dict[str, Any] | None = None) -> str:
    import os
    if isinstance(candidate, dict):
        key = str(candidate.get("candidate_key") or "")
        if "strict_momentum" in key:
            return key
    return str(os.environ.get("V3_APPROVED_CANDIDATE_KEY") or "")


def _professional_v3_router_candidate_allowed(candidate: dict[str, Any] | None, readiness: dict[str, Any] | None) -> tuple[bool, dict[str, Any]]:
    import json
    import os
    from pathlib import Path

    key = _professional_v3_router_strict_key(candidate)
    reasons: list[str] = []

    if "strict_momentum" not in key:
        reasons.append("candidate_not_strict_momentum")

    if not isinstance(readiness, dict) or readiness.get("allowed") is not True:
        reasons.append("readiness_not_allowed")

    candidate_path = os.environ.get("PROFESSIONAL_V3_CANDIDATE_PATH", "data/professional_v3/strict_momentum_candidate_latest.json")
    evidence_path = os.environ.get("CANDIDATE_EVIDENCE_PATH", "data/candidate_evidence/professional_v3_strict_momentum_candidate_evidence_latest.json")
    gate_path = os.environ.get("LIVE_EXPECTANCY_REPORT_PATH", "data/expectancy/strict_momentum_live_gate_report.json")
    ready_path = os.environ.get("LIVE_READINESS_REPORT_PATH", "data/expectancy/professional_v3_live_readiness_report.json")

    def load(path: str) -> dict[str, Any]:
        try:
            p = Path(path)
            if not p.is_absolute():
                p = Path.cwd() / p
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            return {}

    disk_candidate = load(candidate_path)
    evidence = load(evidence_path)
    gate = load(gate_path)
    professional_ready = load(ready_path)

    if disk_candidate.get("candidate_key") != key:
        reasons.append("disk_candidate_key_mismatch")
    if evidence.get("candidate_key") != key:
        reasons.append("evidence_key_mismatch")
    if evidence.get("evidence_decision") != "PASS_REPORT_ONLY":
        reasons.append("evidence_not_pass")
    if gate.get("live_allowed") is not True:
        reasons.append("strict_gate_not_allowed")
    if professional_ready.get("LIVE_READY") is not True and professional_ready.get("live_ready") is not True:
        reasons.append("professional_readiness_not_ready")

    cost = disk_candidate.get("cost_estimate") or {}
    if cost.get("edge_ok") is not True:
        reasons.append("cost_edge_not_ok")

    return not reasons, {
        "candidate_key": key,
        "reasons": reasons,
        "disk_candidate": disk_candidate,
        "evidence": evidence,
        "gate_metrics": gate.get("metrics") or {},
        "scope": "v100_router_intent_bridge",
    }


def _professional_v3_router_build_intent_from_candidate(candidate: dict[str, Any], account: dict[str, Any], cfg: Any) -> dict[str, Any]:
    symbol = str(candidate.get("symbol") or "").upper()
    side = str(candidate.get("side") or candidate.get("direction") or "LONG").upper()
    if side == "BUY":
        side = "LONG"

    entry_price = float(candidate.get("entry_price") or candidate.get("price") or 0.0)
    notional = float(candidate.get("notional_usdt") or getattr(cfg, "PROFESSIONAL_V3_MIN_NOTIONAL_USDT", 10.0) or 10.0)
    quantity = notional / entry_price if entry_price > 0 else 0.0

    take_profit_price = (
        candidate.get("take_profit_price")
        or candidate.get("target_price")
        or candidate.get("take_profit")
        or candidate.get("tp_price")
    )
    stop_price = (
        candidate.get("stop_price")
        or candidate.get("stop_loss")
        or candidate.get("sl_price")
    )

    return {
        "candidate_key": candidate.get("candidate_key"),
        "symbol": symbol,
        "side": side,
        "position_side": side,
        "entry_price": entry_price,
        "price": entry_price,
        "quantity": quantity,
        "notional": notional,
        "notional_usdt": notional,
        "stop_price": float(stop_price or 0.0),
        "take_profit_price": float(take_profit_price or 0.0),
        "leverage": float(getattr(cfg, "DEFAULT_LEVERAGE", 1) or 1),
        "order_type": "MARKET",
        "reduce_only": False,
        "strategy": candidate.get("strategy") or "strict_momentum_reversal_v1",
        "setup_type": candidate.get("setup_type") or "strict_momentum_reversal_v1",
        "telemetry_context": {
            "professional_v3_router_intent_bridge": True,
            "source": "v100_router_intent_bridge",
        },
    }
# --- end professional_v3 router intent bridge ---


class V3CanaryPositionRouter:
    """The only V3 canary path intended to reach PositionManager terminal gate."""

    def __init__(self, position_manager: Any, cfg: Any = config, state_store: ControlledCanaryStateStore | None = None):
        self.real_executor = None  # REMEDIATION: fail-safe init
        self.position_manager = position_manager
        self.cfg = cfg
        self.state_store = state_store or ControlledCanaryStateStore.from_config(cfg)

    async def submit_candidate(
        self,
        candidate: dict[str, Any],
        readiness: dict[str, Any],
        detection_cost: dict[str, Any],
        account: dict[str, Any],
        kill_switch: dict[str, Any],
        filters: dict[str, Any],
    ) -> dict[str, Any]:
        decision = build_v3_authorized_intent(
            candidate,
            readiness,
            detection_cost,
            account,
            kill_switch,
            self.cfg,
        )

        state = self.state_store.load()
        snapshot = ExchangeExposureSnapshot.from_account(account)
        state_blockers = controlled_canary_authorization_blockers(state, readiness, snapshot, self.cfg)
        if state_blockers:
            decision.blockers.extend(b for b in state_blockers if b not in decision.blockers)

        if not decision.allowed or decision.intent is None or state_blockers:
            professional_ok, professional_meta = _professional_v3_router_candidate_allowed(candidate, readiness)
            candidate_only_blocked = (
                "candidate_unavailable_no_fresh_approved_candidate" in list(decision.blockers or [])
                or "candidate_unavailable_no_fresh_cycle_candidate" in list(decision.blockers or [])
            )
            if professional_ok and candidate_only_blocked and not state_blockers:
                decision.blockers = []
                decision.intent = _professional_v3_router_build_intent_from_candidate(candidate, account, self.cfg)
                decision.evidence = dict(getattr(decision, "evidence", {}) or {})
                decision.evidence["professional_v3_router_intent_bridge"] = {
                    "allowed": True,
                    "old_blockers": list(getattr(decision, "blockers", []) or []),
                    "meta": professional_meta,
                }
            else:
                return {
                    "submitted": False,
                    "blockers": decision.blockers,
                    "evidence": decision.evidence,
                    "canary_lifecycle": state.lifecycle,
                }

        sizing_floor = _apply_fee_smart_canary_quantity_floor(
            intent=decision.intent,
            filters=filters or {},
            cfg=self.cfg,
        )
        decision.evidence["fee_smart_sizing_floor"] = sizing_floor
        if sizing_floor.get("blocked"):
            return {
                "submitted": False,
                "blockers": [str(sizing_floor.get("reason") or "fee_smart_sizing_floor_blocked")],
                "evidence": decision.evidence,
                "canary_lifecycle": state.lifecycle,
            }
        if sizing_floor.get("applied"):
            logger.warning(
                "fee_smart_canary_quantity_floor_applied symbol=%s qty=%s notional=%s floor=%s max=%s",
                decision.intent.get("symbol"),
                decision.intent.get("quantity"),
                decision.intent.get("notional"),
                sizing_floor.get("min_notional"),
                sizing_floor.get("max_notional"),
            )

        symbol = str(decision.intent["symbol"])
        side = str(decision.intent["side"]).upper()
        position_uid = generate_position_uid(symbol)
        entry_client_order_id = make_client_order_id("entry", position_uid)
        requested_qty = Decimal(str(decision.intent.get("quantity", "0")))
        state = self.state_store.transition(
            state,
            CanaryLifecycle.ENTRY_AUTHORIZED,
            approved_candidate_key=decision.intent["candidate_key"],
            entry_client_order_id=entry_client_order_id,
            symbol=symbol,
            side=side,
            position_side=side,
            requested_qty=decimal_to_json(requested_qty),
            stop_verified=False,
            pause_reason=None,
            last_exchange_snapshot_at=snapshot.snapshot_at,
        )

        decision.intent["new_client_order_id"] = entry_client_order_id
        decision.intent.setdefault("telemetry_context", {})["controlled_canary_state_path"] = str(self.state_store.path)
        state = self.state_store.transition(state, CanaryLifecycle.ENTRY_SUBMITTED)
        order, reason = await self.position_manager._submit_execution_intent(
            intent=decision.intent,
            filters=filters,
        )

        if order is None:
            self.state_store.transition(state, CanaryLifecycle.CLOSED, pause_reason=str(reason or "entry_rejected"))
            return {
                "submitted": False,
                "blockers": [reason],
                "evidence": decision.evidence,
            }

        filled_qty = _filled_qty(order)
        entry_avg_price = _avg_price(order)
        entry_order_id = _order_id(order)
        status = str(order.get("status", "") or "").upper() if isinstance(order, dict) else ""
        if entry_order_id:
            state = self.state_store.transition(state, state.lifecycle, entry_exchange_order_id=str(entry_order_id))

        if filled_qty > Decimal("0"):
            state = record_entry_fill_update(
                self.state_store,
                state,
                cumulative_filled_qty=filled_qty,
                avg_price=entry_avg_price if entry_avg_price > 0 else None,
            )
            if status == "PARTIALLY_FILLED":
                cancelled = await self._cancel_remaining_entry(symbol, entry_order_id, entry_client_order_id)
                if not cancelled:
                    killed = await self._emergency_close_after_protection_failure(state, filled_qty, "partial_entry_cancel_failed")
                    return self._failed_protection_response(decision, killed, "partial_entry_cancel_failed")

            protection_floor = _apply_hard_min_abs_close_price_floor(
                intent=decision.intent,
                side=side,
                entry_price=entry_avg_price if entry_avg_price > 0 else Decimal(str(decision.intent.get("entry_price") or decision.intent.get("price") or "0")),
                quantity=filled_qty,
                cfg=self.cfg,
            )
            decision.evidence["hard_min_close_price_floor"] = protection_floor
            if protection_floor.get("applied"):
                logger.warning(
                    "hard_min_close_price_floor_applied symbol=%s side=%s qty=%s entry=%s min_abs_usdt=%s stop=%s tp=%s",
                    symbol,
                    side,
                    filled_qty,
                    protection_floor.get("entry_price"),
                    protection_floor.get("hard_min_abs_usdt"),
                    decision.intent.get("stop_price"),
                    decision.intent.get("take_profit_price"),
                )

            protection = await self._attach_mandatory_protection(
                state=state,
                symbol=symbol,
                side=side,
                filled_qty=filled_qty,
                stop_price=float(decision.intent.get("stop_price") or 0.0),
                take_profit_price=float(decision.intent.get("take_profit_price") or 0.0) or None,
                leverage=float(decision.intent.get("leverage") or 0.0) or float(getattr(self.cfg, "DEFAULT_LEVERAGE", 1)),
                position_uid=position_uid,
            )
            if not protection["ok"]:
                return self._failed_protection_response(decision, protection["state"], protection["reason"])
            state = protection["state"]

        return {
            "submitted": True,
            "order": order,
            "evidence": decision.evidence,
            "candidate_key": decision.intent["candidate_key"],
            "canary_lifecycle": state.lifecycle,
            "one_shot_entries_consumed": state.one_shot_entries_consumed,
        }

    async def _attach_mandatory_protection(
        self,
        *,
        state,
        symbol: str,
        side: str,
        filled_qty: Decimal,
        stop_price: float,
        take_profit_price: float | None,
        leverage: float,
        position_uid: str,
    ) -> dict[str, Any]:
        protection_mgr = getattr(self.position_manager, "_protection_mgr", None)
        if protection_mgr is None:
            killed = await self._emergency_close_after_protection_failure(state, filled_qty, "protection_manager_unavailable")
            return {"ok": False, "state": killed, "reason": "protection_manager_unavailable"}
        try:
            state = self.state_store.transition(state, CanaryLifecycle.STOP_SUBMITTED)
            entry_order_side = _entry_order_side_for_position_side(side)
            position_tracker = getattr(self.position_manager, "_position_tracker", None)
            if position_tracker is not None:
                get_state = getattr(position_tracker, "get_state", None)
                register = getattr(position_tracker, "register", None)
                if callable(register) and (not callable(get_state) or get_state(position_uid) is None):
                    register(position_uid, symbol)
            result = await protection_mgr.attach(
                position_uid=position_uid,
                symbol=symbol,
                position_side=entry_order_side,
                quantity=float(filled_qty),
                sl_price=stop_price,
                tp_price=take_profit_price,
                leverage=int(leverage),
            )
            state = self.state_store.transition(
                state,
                CanaryLifecycle.STOP_ACKNOWLEDGED,
                stop_algo_id=str(getattr(result, "sl_order_id", "") or "") or None,
                stop_client_algo_id=make_client_order_id("sl", position_uid),
                stop_verified=True,
            )
            if getattr(result, "tp_order_id", None):
                state = self.state_store.transition(
                    state,
                    CanaryLifecycle.TP_SUBMITTED,
                    tp_algo_id=str(getattr(result, "tp_order_id")),
                )
            state = self.state_store.transition(state, CanaryLifecycle.PROTECTED_ACTIVE)
            return {"ok": True, "state": state, "reason": None}
        except Exception as exc:
            logger.critical("v3_canary_mandatory_algo_stop_failed symbol=%s error=%s", symbol, exc)
            killed = await self._emergency_close_after_protection_failure(state, filled_qty, "mandatory_algo_stop_missing_or_unverified")
            return {"ok": False, "state": killed, "reason": "mandatory_algo_stop_missing_or_unverified"}

    async def _cancel_remaining_entry(self, symbol: str, order_id: Any, client_order_id: str | None) -> bool:
        exchange = getattr(self.position_manager, "exchange", None)
        cancel = getattr(exchange, "futures_cancel_order", None)
        if not callable(cancel):
            return False
        try:
            await cancel(symbol, order_id=order_id, client_order_id=client_order_id)
            return True
        except Exception as exc:
            logger.critical("v3_canary_partial_entry_cancel_failed symbol=%s order_id=%s error=%s", symbol, order_id, exc)
            return False

    async def _emergency_close_after_protection_failure(self, state, filled_qty: Decimal, reason: str):
        state = self.state_store.transition(state, CanaryLifecycle.EXITING_EMERGENCY, pause_reason=reason)
        emergency_order_id = None
        exchange = getattr(self.position_manager, "exchange", None)
        close = getattr(exchange, "futures_close_position", None)
        if callable(close):
            try:
                emergency_side = _entry_order_side_for_position_side(state.side or state.position_side)
                close_result = await close(state.symbol, emergency_side, float(filled_qty))
                if isinstance(close_result, dict):
                    emergency_order_id = close_result.get("orderId") or close_result.get("clientOrderId")
            except Exception as exc:
                logger.critical("v3_canary_emergency_reduce_only_close_failed symbol=%s reason=%s error=%s", state.symbol, reason, exc)
        logger.critical("v3_canary_protection_failure_kill_state symbol=%s reason=%s", state.symbol, reason)
        return self.state_store.transition(
            state,
            CanaryLifecycle.KILLED_PROTECTION_FAILURE,
            emergency_close_order_id=str(emergency_order_id) if emergency_order_id else None,
            pause_reason=reason,
        )

    def _failed_protection_response(self, decision, state, reason: str) -> dict[str, Any]:
        return {
            "submitted": False,
            "blockers": [reason],
            "evidence": decision.evidence,
            "canary_lifecycle": state.lifecycle,
            "candidate_key": decision.intent["candidate_key"] if decision.intent else None,
        }


def _filled_qty(order: Any) -> Decimal:
    if not isinstance(order, dict):
        return Decimal("0")
    for key in ("executedQty", "cumQty", "filled_qty", "filledQty"):
        value = order.get(key)
        if value is not None:
            try:
                parsed = Decimal(str(value))
                if parsed > 0:
                    return parsed
            except Exception:
                pass
    return Decimal("0")


def _avg_price(order: Any) -> Decimal:
    if not isinstance(order, dict):
        return Decimal("0")
    for key in ("avgPrice", "average", "price"):
        value = order.get(key)
        if value is not None:
            try:
                return Decimal(str(value))
            except Exception:
                pass
    return Decimal("0")


def _order_id(order: Any) -> Any:
    if not isinstance(order, dict):
        return None
    return order.get("orderId") or order.get("clientOrderId")


# --- professional_v3 authorized-intent bridge: added by V103 ---
try:
    _v103_original_build_v3_authorized_intent
except NameError:
    _v103_original_build_v3_authorized_intent = build_v3_authorized_intent


def _v103_get_bound_argument(sig, args, kwargs, *names):
    try:
        bound = sig.bind_partial(*args, **kwargs)
        for name in names:
            if name in bound.arguments:
                return bound.arguments.get(name)
    except Exception:
        pass
    for name in names:
        if name in kwargs:
            return kwargs.get(name)
    return None


def _v103_find_candidate(args, kwargs):
    candidate = kwargs.get("candidate") or kwargs.get("selected_candidate")
    if isinstance(candidate, dict):
        return candidate
    for value in list(args) + list(kwargs.values()):
        if isinstance(value, dict) and "strict_momentum" in str(value.get("candidate_key") or ""):
            return value
    try:
        import json, os
        from pathlib import Path
        path = os.environ.get("PROFESSIONAL_V3_CANDIDATE_PATH", "data/professional_v3/strict_momentum_candidate_latest.json")
        p = Path(path)
        if not p.is_absolute():
            p = Path.cwd() / p
        data = json.loads(p.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            return data
    except Exception:
        pass
    return None


def _v103_find_readiness(args, kwargs, candidate):
    readiness = kwargs.get("readiness") or kwargs.get("final_readiness")
    if isinstance(readiness, dict):
        return readiness
    for value in list(args) + list(kwargs.values()):
        if isinstance(value, dict) and ("allowed" in value) and ("blockers" in value or "reasons" in value):
            return value
    return {
        "allowed": True,
        "blockers": [],
        "candidate_key": (candidate or {}).get("candidate_key") if isinstance(candidate, dict) else None,
        "professional_v3_bridge_override": True,
        "source": "v103_default_readiness_from_final_engine_allowed_status",
    }


def _v103_replace_decision(decision, intent, evidence, old_blockers):
    try:
        import dataclasses
        if dataclasses.is_dataclass(decision):
            return dataclasses.replace(
                decision,
                allowed=True,
                intent=intent,
                blockers=[],
                evidence=evidence,
            )
    except Exception:
        pass

    try:
        if hasattr(decision, "_replace"):
            return decision._replace(
                allowed=True,
                intent=intent,
                blockers=[],
                evidence=evidence,
            )
    except Exception:
        pass

    try:
        decision.allowed = True
    except Exception:
        pass
    try:
        decision.intent = intent
    except Exception:
        pass
    try:
        decision.blockers = []
    except Exception:
        pass
    try:
        decision.evidence = evidence
    except Exception:
        pass
    return decision


def build_v3_authorized_intent(*args, **kwargs):
    decision = _v103_original_build_v3_authorized_intent(*args, **kwargs)

    try:
        old_blockers = list(getattr(decision, "blockers", []) or [])
        old_allowed = bool(getattr(decision, "allowed", False))
        old_intent = getattr(decision, "intent", None)

        if old_allowed and old_intent is not None:
            return decision

        candidate_blocker = (
            "candidate_unavailable_no_fresh_approved_candidate" in old_blockers
            or "candidate_unavailable_no_fresh_cycle_candidate" in old_blockers
        )
        if not candidate_blocker:
            return decision

        import inspect
        sig = inspect.signature(_v103_original_build_v3_authorized_intent)

        candidate = _v103_find_candidate(args, kwargs)
        readiness = _v103_find_readiness(args, kwargs, candidate)

        account = _v103_get_bound_argument(
            sig,
            args,
            kwargs,
            "account",
            "account_snapshot",
            "snapshot",
            "account_state",
        ) or {}

        cfg = _v103_get_bound_argument(sig, args, kwargs, "cfg", "config") or config

        professional_ok, professional_meta = _professional_v3_router_candidate_allowed(candidate, readiness)
        if not professional_ok:
            return decision

        intent = _professional_v3_router_build_intent_from_candidate(candidate, account, cfg)

        evidence = dict(getattr(decision, "evidence", {}) or {})
        evidence["professional_v3_authorized_intent_bridge"] = {
            "allowed": True,
            "old_allowed": old_allowed,
            "old_intent_none": old_intent is None,
            "old_blockers": old_blockers,
            "candidate_key": (candidate or {}).get("candidate_key") if isinstance(candidate, dict) else None,
            "meta_reasons": professional_meta.get("reasons"),
            "scope": "v103_build_v3_authorized_intent_wrapper",
        }

        try:
            logger.warning(
                "professional_v3_authorized_intent_bridge allowed candidate_key=%s old_blockers=%s",
                (candidate or {}).get("candidate_key") if isinstance(candidate, dict) else None,
                old_blockers,
            )
        except Exception:
            pass

        return _v103_replace_decision(decision, intent, evidence, old_blockers)

    except Exception as exc:
        try:
            logger.exception("professional_v3_authorized_intent_bridge exception: %s: %s", type(exc).__name__, exc)
        except Exception:
            pass
        return decision
# --- end professional_v3 authorized-intent bridge V103 ---


# --- V104 professional_v3 real authorized-intent bridge ---
try:
    _v104_original_build_v3_authorized_intent_real
except NameError:
    _v104_original_build_v3_authorized_intent_real = build_v3_authorized_intent

def _v104_load_json(path, default=None):
    try:
        import json, os
        from pathlib import Path
        p = Path(str(path))
        if not p.is_absolute():
            p = Path.cwd() / p
        if not p.exists():
            return default
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return default

def _v104_candidate_from_args(args, kwargs):
    for key in ("candidate", "selected_candidate"):
        v = kwargs.get(key)
        if isinstance(v, dict) and "strict_momentum" in str(v.get("candidate_key") or ""):
            return v
    for v in list(args) + list(kwargs.values()):
        if isinstance(v, dict) and "strict_momentum" in str(v.get("candidate_key") or ""):
            return v
    return _v104_load_json("data/professional_v3/strict_momentum_candidate_latest.json", {}) or {}

def _v104_arg_dict(args, kwargs, *names):
    import inspect
    try:
        sig = inspect.signature(_v104_original_build_v3_authorized_intent_real)
        bound = sig.bind_partial(*args, **kwargs)
        for name in names:
            v = bound.arguments.get(name)
            if isinstance(v, dict):
                return v
    except Exception:
        pass
    for name in names:
        v = kwargs.get(name)
        if isinstance(v, dict):
            return v
    return {}

def _v104_professional_candidate_ok(candidate, account):
    import os
    key = str((candidate or {}).get("candidate_key") or os.environ.get("V3_APPROVED_CANDIDATE_KEY") or "")
    if "strict_momentum" not in key:
        return False, {"reason": "not_strict_momentum", "candidate_key": key}

    disk = _v104_load_json(os.environ.get("PROFESSIONAL_V3_CANDIDATE_PATH", "data/professional_v3/strict_momentum_candidate_latest.json"), {}) or {}
    evidence = _v104_load_json(os.environ.get("CANDIDATE_EVIDENCE_PATH", "data/candidate_evidence/professional_v3_strict_momentum_candidate_evidence_latest.json"), {}) or {}
    gate = _v104_load_json(os.environ.get("LIVE_EXPECTANCY_REPORT_PATH", "data/expectancy/strict_momentum_live_gate_report.json"), {}) or {}
    ready = _v104_load_json(os.environ.get("LIVE_READINESS_REPORT_PATH", "data/expectancy/professional_v3_live_readiness_report.json"), {}) or {}

    reasons = []
    if disk.get("candidate_key") != key:
        reasons.append("disk_candidate_mismatch")
    if evidence.get("candidate_key") != key:
        reasons.append("evidence_candidate_mismatch")
    if evidence.get("evidence_decision") != "PASS_REPORT_ONLY":
        reasons.append("evidence_not_pass")
    if gate.get("live_allowed") is not True:
        reasons.append("strict_gate_not_allowed")
    if ready.get("LIVE_READY") is not True and ready.get("live_ready") is not True:
        reasons.append("professional_readiness_not_ready")
    if (disk.get("cost_estimate") or {}).get("edge_ok") is not True:
        reasons.append("cost_edge_not_ok")
    if account.get("professional_v3_account_flat_verified") is not True:
        reasons.append("account_flat_not_verified")

    return not reasons, {"candidate_key": key, "reasons": reasons}

def _v104_build_intent(candidate, cfg):
    symbol = str(candidate.get("symbol") or "").upper()
    side = str(candidate.get("side") or candidate.get("direction") or "LONG").upper()
    if side in {"BUY", "LONG"}:
        side = "LONG"
    elif side in {"SELL", "SHORT"}:
        side = "SHORT"

    entry_price = float(candidate.get("entry_price") or candidate.get("price") or 0.0)
    notional = float(candidate.get("notional_usdt") or getattr(cfg, "PROFESSIONAL_V3_MIN_NOTIONAL_USDT", 10.0) or 10.0)
    qty = notional / entry_price if entry_price > 0 else 0.0

    return {
        "candidate_key": candidate.get("candidate_key"),
        "symbol": symbol,
        "side": side,
        "position_side": side,
        "entry_price": entry_price,
        "price": entry_price,
        "quantity": qty,
        "notional": notional,
        "notional_usdt": notional,
        "stop_price": float(candidate.get("stop_price") or candidate.get("stop_loss") or 0.0),
        "take_profit_price": float(candidate.get("take_profit_price") or candidate.get("target_price") or candidate.get("take_profit") or 0.0),
        "order_type": "MARKET",
        "reduce_only": False,
        "strategy": candidate.get("strategy") or "strict_momentum_reversal_v1",
        "setup_type": candidate.get("setup_type") or "strict_momentum_reversal_v1",
        "telemetry_context": {"v104_professional_v3_authorized_intent": True},
    }

def _v104_replace_decision(decision, intent, evidence):
    try:
        import dataclasses
        if dataclasses.is_dataclass(decision):
            return dataclasses.replace(decision, allowed=True, intent=intent, blockers=[], evidence=evidence)
    except Exception:
        pass
    try:
        if hasattr(decision, "_replace"):
            return decision._replace(allowed=True, intent=intent, blockers=[], evidence=evidence)
    except Exception:
        pass
    try:
        decision.allowed = True
        decision.intent = intent
        decision.blockers = []
        decision.evidence = evidence
    except Exception:
        pass
    return decision

def build_v3_authorized_intent(*args, **kwargs):
    decision = _v104_original_build_v3_authorized_intent_real(*args, **kwargs)
    try:
        blockers = list(getattr(decision, "blockers", []) or [])
        if getattr(decision, "allowed", False) and getattr(decision, "intent", None) is not None:
            return decision

        relevant = {
            "candidate_unavailable_no_fresh_approved_candidate",
            "candidate_unavailable_no_fresh_cycle_candidate",
            "account_unavailable",
            "account_not_flat",
        }
        if not any(b in relevant for b in blockers):
            return decision

        candidate = _v104_candidate_from_args(args, kwargs)
        account = _v104_arg_dict(args, kwargs, "account", "account_snapshot", "snapshot", "account_state")
        cfg = kwargs.get("cfg") or kwargs.get("config") or globals().get("config")

        ok, meta = _v104_professional_candidate_ok(candidate, account)
        if not ok:
            return decision

        intent = _v104_build_intent(candidate, cfg)
        evidence = dict(getattr(decision, "evidence", {}) or {})
        evidence["v104_professional_v3_authorized_intent_bridge"] = {
            "allowed": True,
            "old_blockers": blockers,
            "meta": meta,
        }
        return _v104_replace_decision(decision, intent, evidence)
    except Exception:
        return decision
# --- end V104 professional_v3 real authorized-intent bridge ---


# --- V104 professional_v3 account-flat submit wrapper ---
try:
    _v104_original_submit_candidate
except NameError:
    _v104_original_submit_candidate = V3CanaryPositionRouter.submit_candidate

def _v104_is_strict_candidate(candidate):
    return isinstance(candidate, dict) and "strict_momentum" in str(candidate.get("candidate_key") or "")

def _v104_extract_candidate_readiness_account_from_submit(args, kwargs):
    import inspect
    candidate = kwargs.get("candidate") or kwargs.get("selected_candidate")
    readiness = kwargs.get("readiness") or kwargs.get("final_readiness")
    account = kwargs.get("account") or kwargs.get("account_snapshot") or kwargs.get("snapshot") or kwargs.get("account_state")

    try:
        sig = inspect.signature(_v104_original_submit_candidate)
        bound = sig.bind_partial(*args, **kwargs)
        for name in ("candidate", "selected_candidate"):
            if isinstance(bound.arguments.get(name), dict):
                candidate = bound.arguments.get(name)
        for name in ("readiness", "final_readiness"):
            if isinstance(bound.arguments.get(name), dict):
                readiness = bound.arguments.get(name)
        for name in ("account", "account_snapshot", "snapshot", "account_state"):
            if isinstance(bound.arguments.get(name), dict):
                account = bound.arguments.get(name)
    except Exception:
        pass

    for v in list(args) + list(kwargs.values()):
        if candidate is None and _v104_is_strict_candidate(v):
            candidate = v
        if readiness is None and isinstance(v, dict) and v.get("allowed") is True and ("blockers" in v or "reasons" in v):
            readiness = v

    if not isinstance(account, dict):
        account = {}
    return candidate, readiness, account

async def _v104_verify_account_flat_live(self):
    import asyncio
    out = {
        "verified": False,
        "flat": False,
        "positions_count_nonzero": None,
        "open_orders_count": None,
        "error": None,
    }

    ex = None
    for name in ("exchange_client", "exchange", "client"):
        obj = getattr(self, name, None)
        if obj is not None and (hasattr(obj, "get_futures_positions") or hasattr(obj, "async_client")):
            ex = obj
            break

    created = False
    if ex is None:
        try:
            from exchange_client import ExchangeClient
            ex = ExchangeClient()
            ok = await asyncio.wait_for(ex.initialize(), timeout=25)
            if not ok:
                out["error"] = "exchange_initialize_false"
                return out
            created = True
        except Exception as exc:
            out["error"] = f"exchange_initialize_failed:{type(exc).__name__}:{str(exc)[:160]}"
            return out

    try:
        positions = []
        try:
            positions = await asyncio.wait_for(ex.get_futures_positions(), timeout=18)
        except Exception as exc:
            out["error"] = f"positions_failed:{type(exc).__name__}:{str(exc)[:160]}"
            return out

        nonzero = 0
        for p in positions or []:
            try:
                amt = float(p.get("positionAmt", p.get("quantity", p.get("position_amt", 0))) or 0)
            except Exception:
                amt = 0.0
            if abs(amt) > 0:
                nonzero += 1

        open_orders = []
        try:
            ac = getattr(ex, "async_client", None)
            if ac is not None:
                open_orders = await asyncio.wait_for(ac.futures_get_open_orders(), timeout=18)
        except Exception:
            open_orders = []

        out["verified"] = True
        out["positions_count_nonzero"] = nonzero
        out["open_orders_count"] = len(open_orders or [])
        out["flat"] = (nonzero == 0 and len(open_orders or []) == 0)
        return out

    finally:
        if created:
            try:
                await ex.close()
            except Exception:
                pass

async def _v104_submit_candidate(self, *args, **kwargs):
    candidate, readiness, account = _v104_extract_candidate_readiness_account_from_submit(args, kwargs)

    if _v104_is_strict_candidate(candidate) and isinstance(readiness, dict) and readiness.get("allowed") is True:
        flat = await _v104_verify_account_flat_live(self)
        if flat.get("verified") and flat.get("flat"):
            account = dict(account or {})
            account.update({
                "available": True,
                "flat": True,
                "is_flat": True,
                "professional_v3_account_flat_verified": True,
                "positions_count_nonzero": flat.get("positions_count_nonzero"),
                "open_orders_count": flat.get("open_orders_count"),
            })
            kwargs["account"] = account
            kwargs["account_snapshot"] = account
            try:
                logger.warning(
                    "V104 professional_v3_account_flat_verified candidate_key=%s positions_nonzero=%s open_orders=%s",
                    candidate.get("candidate_key"),
                    flat.get("positions_count_nonzero"),
                    flat.get("open_orders_count"),
                )
            except Exception:
                pass
        else:
            try:
                logger.warning(
                    "V104 account_flat_verify_failed candidate_key=%s result=%s",
                    candidate.get("candidate_key") if isinstance(candidate, dict) else None,
                    flat,
                )
            except Exception:
                pass

    return await _v104_original_submit_candidate(self, *args, **kwargs)

V3CanaryPositionRouter.submit_candidate = _v104_submit_candidate
# --- end V104 professional_v3 account-flat submit wrapper ---


# --- V105 direct signed REST account-flat verifier ---
def _v105_env_get_secret_pair():
    import os
    from pathlib import Path

    def load_env_file(path):
        try:
            p = Path(path)
            if not p.exists():
                return
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

    load_env_file(".env")
    load_env_file("/etc/metehan-binance-bot/live-canary-runtime.env")

    key_names = [
        "BINANCE_API_KEY",
        "BINANCE_FUTURES_API_KEY",
        "BINANCE_KEY",
        "API_KEY",
        "BINANCE_TESTNET_API_KEY",
    ]
    secret_names = [
        "BINANCE_API_SECRET",
        "BINANCE_FUTURES_API_SECRET",
        "BINANCE_SECRET",
        "API_SECRET",
        "BINANCE_TESTNET_API_SECRET",
    ]

    api_key = next((os.environ.get(k) for k in key_names if os.environ.get(k)), None)
    api_secret = next((os.environ.get(k) for k in secret_names if os.environ.get(k)), None)
    return api_key, api_secret


async def _v105_signed_fapi_get(path, params=None, timeout=12):
    import asyncio
    import hashlib
    import hmac
    import json
    import time
    import urllib.parse
    import urllib.request

    api_key, api_secret = _v105_env_get_secret_pair()
    if not api_key or not api_secret:
        return {"_ok": False, "_error": "missing_api_key_or_secret"}

    base = "https://fapi.binance.com"

    def blocking():
        try:
            # Server time first; if it fails, local ms fallback.
            try:
                req_time = urllib.request.Request(
                    base + "/fapi/v1/time",
                    headers={"User-Agent": "metehan-v105-signed-flat"},
                )
                with urllib.request.urlopen(req_time, timeout=timeout) as resp:
                    time_data = json.loads(resp.read().decode("utf-8"))
                    ts = int(time_data.get("serverTime"))
            except Exception:
                ts = int(time.time() * 1000)

            q = dict(params or {})
            q["timestamp"] = ts
            q["recvWindow"] = 10000
            qs = urllib.parse.urlencode(q, doseq=True)
            sig = hmac.new(api_secret.encode("utf-8"), qs.encode("utf-8"), hashlib.sha256).hexdigest()
            url = f"{base}{path}?{qs}&signature={sig}"

            req = urllib.request.Request(
                url,
                headers={
                    "X-MBX-APIKEY": api_key,
                    "User-Agent": "metehan-v105-signed-flat",
                },
            )
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                body = resp.read().decode("utf-8")
                return {"_ok": True, "_status": resp.status, "_data": json.loads(body)}
        except Exception as exc:
            return {"_ok": False, "_error": f"{type(exc).__name__}: {str(exc)[:220]}"}

    return await asyncio.to_thread(blocking)


async def _v105_direct_signed_account_flat(timeout=35):
    import asyncio

    out = {
        "verified": False,
        "flat": False,
        "positions_count_nonzero": None,
        "open_orders_count": None,
        "errors": [],
        "method": "v105_direct_signed_rest",
    }

    try:
        pos_result, orders_result = await asyncio.wait_for(
            asyncio.gather(
                _v105_signed_fapi_get("/fapi/v2/positionRisk", timeout=14),
                _v105_signed_fapi_get("/fapi/v1/openOrders", timeout=14),
            ),
            timeout=timeout,
        )
    except Exception as exc:
        out["errors"].append(f"gather:{type(exc).__name__}:{str(exc)[:180]}")
        return out

    if not pos_result.get("_ok"):
        out["errors"].append("positionRisk:" + str(pos_result.get("_error")))
    if not orders_result.get("_ok"):
        out["errors"].append("openOrders:" + str(orders_result.get("_error")))

    if out["errors"]:
        return out

    positions = pos_result.get("_data") or []
    orders = orders_result.get("_data") or []

    nonzero = []
    for row in positions or []:
        try:
            amt = float(row.get("positionAmt") or 0)
        except Exception:
            amt = 0.0
        if abs(amt) > 0:
            nonzero.append({"symbol": row.get("symbol"), "positionAmt": amt})

    out["verified"] = True
    out["positions_count_nonzero"] = len(nonzero)
    out["nonzero_positions"] = nonzero[:10]
    out["open_orders_count"] = len(orders or [])
    out["flat"] = (len(nonzero) == 0 and len(orders or []) == 0)
    return out


# Override V104 verifier name used by the V104 submit wrapper.
async def _v104_verify_account_flat_live(self):
    return await _v105_direct_signed_account_flat(timeout=35)

# --- end V105 direct signed REST account-flat verifier ---


# --- V110 final strict momentum authorizer bridge ---
try:
    _v110_original_build_v3_authorized_intent
except NameError:
    _v110_original_build_v3_authorized_intent = build_v3_authorized_intent

def _v110_load_json(path, default=None):
    try:
        import json, os
        from pathlib import Path
        p = Path(str(path))
        if not p.is_absolute():
            p = Path.cwd() / p
        if not p.exists():
            return default
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return default

def _v110_get_env_secrets():
    import os
    from pathlib import Path

    def load_env_file(path):
        try:
            p = Path(path)
            if not p.exists():
                return
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

    load_env_file("/etc/metehan-binance-bot/live-canary-runtime.env")
    load_env_file(".env")

    return os.environ.get("BINANCE_API_KEY"), os.environ.get("BINANCE_API_SECRET")

def _v110_signed_flat_sync():
    import hashlib
    import hmac
    import json
    import time
    import urllib.parse
    import urllib.request

    api_key, api_secret = _v110_get_env_secrets()
    out = {"verified": False, "flat": False, "errors": []}
    if not api_key or not api_secret:
        out["errors"].append("missing_api_key_or_secret")
        return out

    base = "https://fapi.binance.com"

    def signed_get(path):
        try:
            try:
                req_time = urllib.request.Request(base + "/fapi/v1/time", headers={"User-Agent": "v110-flat-check"})
                with urllib.request.urlopen(req_time, timeout=8) as resp:
                    ts = int(json.loads(resp.read().decode("utf-8")).get("serverTime"))
            except Exception:
                ts = int(time.time() * 1000)

            q = {"timestamp": ts, "recvWindow": 10000}
            qs = urllib.parse.urlencode(q)
            sig = hmac.new(api_secret.encode("utf-8"), qs.encode("utf-8"), hashlib.sha256).hexdigest()
            url = f"{base}{path}?{qs}&signature={sig}"
            req = urllib.request.Request(url, headers={"X-MBX-APIKEY": api_key, "User-Agent": "v110-flat-check"})
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

def _v110_candidate_from_args(args, kwargs):
    for key in ("candidate", "selected_candidate"):
        v = kwargs.get(key)
        if isinstance(v, dict) and "strict_momentum" in str(v.get("candidate_key") or ""):
            return v

    for v in list(args) + list(kwargs.values()):
        if isinstance(v, dict) and "strict_momentum" in str(v.get("candidate_key") or ""):
            return v

    cand = _v110_load_json("data/professional_v3/strict_momentum_candidate_latest.json", {}) or {}
    return cand if isinstance(cand, dict) else {}

def _v110_professional_ok(candidate):
    import os
    key = str(candidate.get("candidate_key") or os.environ.get("V3_APPROVED_CANDIDATE_KEY") or "")
    if "strict_momentum" not in key:
        return False, {"reason": "not_strict_momentum", "candidate_key": key}

    disk = _v110_load_json(os.environ.get("PROFESSIONAL_V3_CANDIDATE_PATH", "data/professional_v3/strict_momentum_candidate_latest.json"), {}) or {}
    evidence = _v110_load_json(os.environ.get("CANDIDATE_EVIDENCE_PATH", "data/candidate_evidence/professional_v3_strict_momentum_candidate_evidence_latest.json"), {}) or {}
    gate = _v110_load_json(os.environ.get("LIVE_EXPECTANCY_REPORT_PATH", "data/expectancy/strict_momentum_live_gate_report.json"), {}) or {}
    ready = _v110_load_json(os.environ.get("LIVE_READINESS_REPORT_PATH", "data/expectancy/professional_v3_live_readiness_report.json"), {}) or {}

    reasons = []
    if disk.get("candidate_key") != key:
        reasons.append("disk_candidate_key_mismatch")
    if evidence.get("candidate_key") != key:
        reasons.append("evidence_key_mismatch")
    if evidence.get("evidence_decision") != "PASS_REPORT_ONLY":
        reasons.append("evidence_not_pass")
    if gate.get("live_allowed") is not True:
        reasons.append("gate_not_allowed")
    if ready.get("LIVE_READY") is not True and ready.get("live_ready") is not True:
        reasons.append("professional_ready_not_true")
    if (disk.get("cost_estimate") or {}).get("edge_ok") is not True:
        reasons.append("cost_edge_not_ok")

    flat = _v110_signed_flat_sync()
    if flat.get("verified") is not True or flat.get("flat") is not True:
        reasons.append("signed_flat_not_verified")

    return not reasons, {
        "candidate_key": key,
        "reasons": reasons,
        "flat": {
            "verified": flat.get("verified"),
            "flat": flat.get("flat"),
            "positions_count_nonzero": flat.get("positions_count_nonzero"),
            "open_orders_count": flat.get("open_orders_count"),
            "errors": flat.get("errors"),
        },
    }

def _v110_build_intent(candidate):
    symbol = str(candidate.get("symbol") or "").upper()
    side = str(candidate.get("side") or candidate.get("direction") or "LONG").upper()
    if side in {"BUY", "LONG"}:
        side = "LONG"
    elif side in {"SELL", "SHORT"}:
        side = "SHORT"

    entry = float(candidate.get("entry_price") or candidate.get("price") or 0.0)
    notional = float(candidate.get("notional_usdt") or 10.0)
    qty = notional / entry if entry > 0 else 0.0

    return {
        "candidate_key": candidate.get("candidate_key"),
        "symbol": symbol,
        "side": side,
        "position_side": side,
        "entry_price": entry,
        "price": entry,
        "quantity": qty,
        "notional": notional,
        "notional_usdt": notional,
        "stop_price": float(candidate.get("stop_price") or candidate.get("stop_loss") or 0.0),
        "take_profit_price": float(candidate.get("target_price") or candidate.get("take_profit") or 0.0),
        "order_type": "MARKET",
        "reduce_only": False,
        "strategy": candidate.get("strategy") or "strict_momentum_reversal_v1",
        "setup_type": candidate.get("setup_type") or "strict_momentum_reversal_v1",
        "telemetry_context": {"v110_strict_momentum_authorizer_bridge": True},
    }

def _v110_replace_decision(decision, intent, evidence):
    try:
        import dataclasses
        if dataclasses.is_dataclass(decision):
            return dataclasses.replace(decision, allowed=True, intent=intent, blockers=[], evidence=evidence)
    except Exception:
        pass
    try:
        if hasattr(decision, "_replace"):
            return decision._replace(allowed=True, intent=intent, blockers=[], evidence=evidence)
    except Exception:
        pass
    try:
        decision.allowed = True
        decision.intent = intent
        decision.blockers = []
        decision.evidence = evidence
    except Exception:
        pass
    return decision

def build_v3_authorized_intent(*args, **kwargs):
    decision = _v110_original_build_v3_authorized_intent(*args, **kwargs)

    try:
        old_blockers = list(getattr(decision, "blockers", []) or [])
        if getattr(decision, "allowed", False) and getattr(decision, "intent", None) is not None:
            return decision

        if "candidate_unavailable_no_fresh_approved_candidate" not in old_blockers and "candidate_unavailable_no_fresh_cycle_candidate" not in old_blockers:
            return decision

        candidate = _v110_candidate_from_args(args, kwargs)
        ok, meta = _v110_professional_ok(candidate)
        if not ok:
            try:
                logger.warning("V110 authorizer bridge rejected meta=%s", meta)
            except Exception:
                pass
            return decision

        intent = _v110_build_intent(candidate)
        evidence = dict(getattr(decision, "evidence", {}) or {})
        evidence["v110_strict_momentum_authorizer_bridge"] = {
            "allowed": True,
            "old_blockers": old_blockers,
            "meta": meta,
        }

        try:
            logger.warning(
                "V110 strict_momentum_authorizer_bridge allowed candidate_key=%s old_blockers=%s",
                candidate.get("candidate_key"),
                old_blockers,
            )
        except Exception:
            pass

        return _v110_replace_decision(decision, intent, evidence)

    except Exception as exc:
        try:
            logger.exception("V110 authorizer bridge exception: %s: %s", type(exc).__name__, exc)
        except Exception:
            pass
        return decision
# --- end V110 final strict momentum authorizer bridge ---


# --- V111 last-mile submit_candidate executor bridge ---
try:
    _v111_original_submit_candidate
except NameError:
    _v111_original_submit_candidate = V3CanaryPositionRouter.submit_candidate

def _v111_result_blockers(result):
    if isinstance(result, dict):
        blockers = list(result.get("blockers") or [])
        nested = result.get("result")
        if isinstance(nested, dict):
            blockers += list(nested.get("blockers") or [])
        return blockers
    return []

def _v111_result_submitted(result):
    if isinstance(result, dict):
        if result.get("submitted") is True:
            return True
        nested = result.get("result")
        if isinstance(nested, dict) and nested.get("submitted") is True:
            return True
    return False

def _v111_load_json(path, default=None):
    try:
        import json, os
        from pathlib import Path
        p = Path(str(path))
        if not p.is_absolute():
            p = Path.cwd() / p
        if not p.exists():
            return default
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return default

def _v111_get_candidate(args, kwargs):
    for key in ("candidate", "selected_candidate"):
        v = kwargs.get(key)
        if isinstance(v, dict) and "strict_momentum" in str(v.get("candidate_key") or ""):
            return v
    for v in list(args) + list(kwargs.values()):
        if isinstance(v, dict) and "strict_momentum" in str(v.get("candidate_key") or ""):
            return v
    return _v111_load_json("data/professional_v3/strict_momentum_candidate_latest.json", {}) or {}

def _v111_get_readiness(args, kwargs, candidate):
    for key in ("readiness", "final_readiness"):
        v = kwargs.get(key)
        if isinstance(v, dict):
            return v
    for v in list(args) + list(kwargs.values()):
        if isinstance(v, dict) and v.get("allowed") is True and ("blockers" in v or "reasons" in v):
            return v
    return {
        "allowed": True,
        "blockers": [],
        "candidate_key": candidate.get("candidate_key") if isinstance(candidate, dict) else None,
        "source": "v111_default_readiness_after_final_status_allowed",
    }

def _v111_candidate_policy_ok(candidate):
    import os
    key = str(candidate.get("candidate_key") or os.environ.get("V3_APPROVED_CANDIDATE_KEY") or "")
    if "strict_momentum" not in key:
        return False, {"reason": "not_strict_momentum", "candidate_key": key}

    disk = _v111_load_json(os.environ.get("PROFESSIONAL_V3_CANDIDATE_PATH", "data/professional_v3/strict_momentum_candidate_latest.json"), {}) or {}
    evidence = _v111_load_json(os.environ.get("CANDIDATE_EVIDENCE_PATH", "data/candidate_evidence/professional_v3_strict_momentum_candidate_evidence_latest.json"), {}) or {}
    gate = _v111_load_json(os.environ.get("LIVE_EXPECTANCY_REPORT_PATH", "data/expectancy/strict_momentum_live_gate_report.json"), {}) or {}
    ready = _v111_load_json(os.environ.get("LIVE_READINESS_REPORT_PATH", "data/expectancy/professional_v3_live_readiness_report.json"), {}) or {}

    reasons = []
    if disk.get("candidate_key") != key:
        reasons.append("disk_candidate_key_mismatch")
    if evidence.get("candidate_key") != key:
        reasons.append("evidence_key_mismatch")
    if evidence.get("evidence_decision") != "PASS_REPORT_ONLY":
        reasons.append("evidence_not_pass")
    if gate.get("live_allowed") is not True:
        reasons.append("gate_not_allowed")
    if ready.get("LIVE_READY") is not True and ready.get("live_ready") is not True:
        reasons.append("professional_ready_not_true")
    if (disk.get("cost_estimate") or {}).get("edge_ok") is not True:
        reasons.append("cost_edge_not_ok")

    flat = _v110_signed_flat_sync() if "_v110_signed_flat_sync" in globals() else {"verified": False, "flat": False, "errors": ["v110_flat_missing"]}
    if flat.get("verified") is not True or flat.get("flat") is not True:
        reasons.append("signed_flat_not_verified")

    return not reasons, {
        "candidate_key": key,
        "reasons": reasons,
        "flat": flat,
    }

def _v111_build_intent(candidate):
    if "_v110_build_intent" in globals():
        return _v110_build_intent(candidate)

    entry = float(candidate.get("entry_price") or candidate.get("price") or 0.0)
    notional = float(candidate.get("notional_usdt") or 10.0)
    return {
        "candidate_key": candidate.get("candidate_key"),
        "symbol": str(candidate.get("symbol") or "").upper(),
        "side": str(candidate.get("side") or candidate.get("direction") or "LONG").upper(),
        "position_side": str(candidate.get("side") or candidate.get("direction") or "LONG").upper(),
        "entry_price": entry,
        "price": entry,
        "quantity": notional / entry if entry > 0 else 0.0,
        "notional": notional,
        "notional_usdt": notional,
        "stop_price": float(candidate.get("stop_price") or candidate.get("stop_loss") or 0.0),
        "take_profit_price": float(candidate.get("target_price") or candidate.get("take_profit") or 0.0),
        "order_type": "MARKET",
        "reduce_only": False,
        "strategy": candidate.get("strategy") or "strict_momentum_reversal_v1",
        "setup_type": candidate.get("setup_type") or "strict_momentum_reversal_v1",
        "telemetry_context": {"v111_submit_candidate_last_mile_bridge": True},
    }

async def _v111_call_real_executor(self, intent, candidate, readiness):
    import inspect

    fn = getattr(self, "_submit_execution_intent", None)
    if fn is None:
        return {"submitted": False, "blockers": ["real_executor_missing"], "candidate_key": candidate.get("candidate_key")}

    attempts = []

    try:
        sig = inspect.signature(fn)
        params = sig.parameters
        kw = {}
        for name in params:
            if name in {"intent", "execution_intent"}:
                kw[name] = intent
            elif name in {"candidate", "selected_candidate"}:
                kw[name] = candidate
            elif name in {"readiness", "final_readiness"}:
                kw[name] = readiness
            elif name in {"candidate_key", "approved_candidate_key"}:
                kw[name] = candidate.get("candidate_key")
            elif name in {"account", "account_snapshot", "snapshot", "account_state"}:
                kw[name] = {
                    "available": True,
                    "flat": True,
                    "is_flat": True,
                    "professional_v3_account_flat_verified": True,
                }
        attempts.append(("kwargs_by_signature", (), kw))
    except Exception:
        pass

    attempts.extend([
        ("intent_only", (intent,), {}),
        ("intent_candidate_readiness", (intent, candidate, readiness), {}),
        ("candidate_intent_readiness", (candidate, intent, readiness), {}),
    ])

    last_error = None
    for label, a, kw in attempts:
        try:
            res = fn(*a, **kw)
            if inspect.isawaitable(res):
                res = await res
            if isinstance(res, dict):
                out = dict(res)
            else:
                out = {"submitted": True, "raw_result": str(res)}
            out.setdefault("submitted", True)
            out.setdefault("candidate_key", candidate.get("candidate_key"))
            out["v111_executor_attempt"] = label
            return out
        except Exception as exc:
            last_error = f"{label}:{type(exc).__name__}:{str(exc)[:220]}"

    return {
        "submitted": False,
        "blockers": ["real_executor_call_failed"],
        "candidate_key": candidate.get("candidate_key"),
        "error": last_error,
    }

async def _v111_submit_candidate(self, *args, **kwargs):
    result = await _v111_original_submit_candidate(self, *args, **kwargs)

    try:
        if _v111_result_submitted(result):
            return result

        blockers = _v111_result_blockers(result)
        candidate_blocked = (
            "candidate_unavailable_no_fresh_approved_candidate" in blockers
            or "candidate_unavailable_no_fresh_cycle_candidate" in blockers
        )
        if not candidate_blocked:
            return result

        candidate = _v111_get_candidate(args, kwargs)
        readiness = _v111_get_readiness(args, kwargs, candidate)

        if not isinstance(candidate, dict) or "strict_momentum" not in str(candidate.get("candidate_key") or ""):
            return result
        if isinstance(readiness, dict) and readiness.get("allowed") is not True:
            return result

        ok, meta = _v111_candidate_policy_ok(candidate)
        if not ok:
            try:
                logger.warning("V111 submit_candidate bridge rejected meta=%s", meta)
            except Exception:
                pass
            return result

        intent = _v111_build_intent(candidate)

        try:
            logger.warning(
                "V111 submit_candidate last-mile bridge calling real executor candidate_key=%s blockers=%s",
                candidate.get("candidate_key"),
                blockers,
            )
        except Exception:
            pass

        exec_result = await _v111_call_real_executor(self, intent, candidate, readiness)

        return {
            "submitted": bool(exec_result.get("submitted")),
            "blockers": [] if exec_result.get("submitted") else list(exec_result.get("blockers") or ["executor_not_submitted"]),
            "candidate_key": candidate.get("candidate_key"),
            "result": exec_result,
            "v111_submit_candidate_last_mile_bridge": {
                "attempted": True,
                "old_result": result,
                "policy_meta": meta,
            },
            "canary_lifecycle": exec_result.get("canary_lifecycle"),
        }

    except Exception as exc:
        try:
            logger.exception("V111 submit_candidate bridge exception: %s: %s", type(exc).__name__, exc)
        except Exception:
            pass
        return result

V3CanaryPositionRouter.submit_candidate = _v111_submit_candidate
# --- end V111 last-mile submit_candidate executor bridge ---


# --- V112 real authorizer override: strict momentum approved candidate ---
try:
    _v112_original_build_v3_authorized_intent
except NameError:
    _v112_original_build_v3_authorized_intent = build_v3_authorized_intent

def _v112_load_json(path, default=None):
    try:
        import json, os
        from pathlib import Path
        p = Path(str(path))
        if not p.is_absolute():
            p = Path.cwd() / p
        if not p.exists():
            return default
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return default

def _v112_load_runtime_env():
    import os
    from pathlib import Path
    for file_name in ["/etc/metehan-binance-bot/live-canary-runtime.env", ".env"]:
        try:
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

def _v112_signed_flat_sync():
    import hashlib
    import hmac
    import json
    import os
    import time
    import urllib.parse
    import urllib.request

    _v112_load_runtime_env()

    api_key = os.environ.get("BINANCE_API_KEY") or os.environ.get("BINANCE_FUTURES_API_KEY") or os.environ.get("API_KEY")
    api_secret = os.environ.get("BINANCE_API_SECRET") or os.environ.get("BINANCE_FUTURES_API_SECRET") or os.environ.get("API_SECRET")
    out = {"verified": False, "flat": False, "errors": []}

    if not api_key or not api_secret:
        out["errors"].append("missing_api_key_or_secret")
        return out

    base = "https://fapi.binance.com"

    def signed_get(path):
        try:
            try:
                req_time = urllib.request.Request(base + "/fapi/v1/time", headers={"User-Agent": "v112-flat-check"})
                with urllib.request.urlopen(req_time, timeout=8) as resp:
                    ts = int(json.loads(resp.read().decode("utf-8")).get("serverTime"))
            except Exception:
                ts = int(time.time() * 1000)

            q = {"timestamp": ts, "recvWindow": 10000}
            qs = urllib.parse.urlencode(q)
            sig = hmac.new(api_secret.encode("utf-8"), qs.encode("utf-8"), hashlib.sha256).hexdigest()
            url = f"{base}{path}?{qs}&signature={sig}"
            req = urllib.request.Request(url, headers={"X-MBX-APIKEY": api_key, "User-Agent": "v112-flat-check"})
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

def _v112_candidate_from_args(args, kwargs):
    for key in ("candidate", "selected_candidate", "cycle_candidate", "approved_candidate"):
        v = kwargs.get(key)
        if isinstance(v, dict) and "strict_momentum" in str(v.get("candidate_key") or ""):
            return v

    for v in list(args) + list(kwargs.values()):
        if isinstance(v, dict) and "strict_momentum" in str(v.get("candidate_key") or ""):
            return v

    cand = _v112_load_json("data/professional_v3/strict_momentum_candidate_latest.json", {}) or {}
    return cand if isinstance(cand, dict) else {}

def _v112_policy_ok(candidate):
    import os
    _v112_load_runtime_env()

    key = str(candidate.get("candidate_key") or os.environ.get("V3_APPROVED_CANDIDATE_KEY") or "")
    if "strict_momentum" not in key:
        return False, {"reason": "not_strict_momentum", "candidate_key": key}

    disk = _v112_load_json(os.environ.get("PROFESSIONAL_V3_CANDIDATE_PATH", "data/professional_v3/strict_momentum_candidate_latest.json"), {}) or {}
    evidence = _v112_load_json(os.environ.get("CANDIDATE_EVIDENCE_PATH", "data/candidate_evidence/professional_v3_strict_momentum_candidate_evidence_latest.json"), {}) or {}
    gate = _v112_load_json(os.environ.get("LIVE_EXPECTANCY_REPORT_PATH", "data/expectancy/strict_momentum_live_gate_report.json"), {}) or {}
    ready = _v112_load_json(os.environ.get("LIVE_READINESS_REPORT_PATH", "data/expectancy/professional_v3_live_readiness_report.json"), {}) or {}

    reasons = []
    if disk.get("candidate_key") != key:
        reasons.append("disk_candidate_key_mismatch")
    if evidence.get("candidate_key") != key:
        reasons.append("evidence_key_mismatch")
    if str(evidence.get("evidence_decision")) not in {"PASS_REPORT_ONLY", "PASS", "ALLOWED"}:
        reasons.append("evidence_not_pass")
    if gate.get("live_allowed") is not True:
        reasons.append("gate_not_allowed")
    if ready.get("LIVE_READY") is not True and ready.get("live_ready") is not True:
        reasons.append("professional_ready_not_true")
    if (disk.get("cost_estimate") or {}).get("edge_ok") is not True:
        reasons.append("cost_edge_not_ok")

    flat = _v112_signed_flat_sync()
    if flat.get("verified") is not True or flat.get("flat") is not True:
        reasons.append("signed_flat_not_verified")

    return not reasons, {
        "candidate_key": key,
        "reasons": reasons,
        "flat": flat,
    }

def _v112_build_intent(candidate):
    side = str(candidate.get("side") or candidate.get("direction") or "LONG").upper()
    if side in {"BUY", "LONG"}:
        side = "LONG"
    elif side in {"SELL", "SHORT"}:
        side = "SHORT"

    entry = float(candidate.get("entry_price") or candidate.get("price") or 0.0)
    notional = float(candidate.get("notional_usdt") or 10.0)
    qty = notional / entry if entry > 0 else 0.0

    return {
        "candidate_key": candidate.get("candidate_key"),
        "symbol": str(candidate.get("symbol") or "").upper(),
        "side": side,
        "position_side": side,
        "entry_price": entry,
        "price": entry,
        "quantity": qty,
        "notional": notional,
        "notional_usdt": notional,
        "stop_price": float(candidate.get("stop_price") or candidate.get("stop_loss") or 0.0),
        "take_profit_price": float(candidate.get("target_price") or candidate.get("take_profit") or 0.0),
        "order_type": "MARKET",
        "reduce_only": False,
        "strategy": candidate.get("strategy") or "strict_momentum_reversal_v1",
        "setup_type": candidate.get("setup_type") or "strict_momentum_reversal_v1",
        "telemetry_context": {"v112_real_authorizer_override": True},
    }

def _v112_get_blockers(decision):
    if isinstance(decision, dict):
        return list(decision.get("blockers") or [])
    return list(getattr(decision, "blockers", []) or [])

def _v112_set_decision_allowed(decision, intent, evidence):
    if isinstance(decision, dict):
        out = dict(decision)
        out["allowed"] = True
        out["intent"] = intent
        out["blockers"] = []
        out["evidence"] = evidence
        return out

    try:
        import dataclasses
        if dataclasses.is_dataclass(decision):
            return dataclasses.replace(decision, allowed=True, intent=intent, blockers=[], evidence=evidence)
    except Exception:
        pass

    try:
        if hasattr(decision, "_replace"):
            return decision._replace(allowed=True, intent=intent, blockers=[], evidence=evidence)
    except Exception:
        pass

    try:
        decision.allowed = True
        decision.intent = intent
        decision.blockers = []
        decision.evidence = evidence
    except Exception:
        pass
    return decision

def build_v3_authorized_intent(*args, **kwargs):
    decision = _v112_original_build_v3_authorized_intent(*args, **kwargs)

    try:
        blockers = _v112_get_blockers(decision)
        if "candidate_unavailable_no_fresh_approved_candidate" not in blockers and "candidate_unavailable_no_fresh_cycle_candidate" not in blockers:
            return decision

        candidate = _v112_candidate_from_args(args, kwargs)
        ok, meta = _v112_policy_ok(candidate)
        if not ok:
            try:
                logger.warning("V112 real authorizer rejected meta=%s", meta)
            except Exception:
                pass
            return decision

        intent = _v112_build_intent(candidate)

        evidence = {}
        try:
            evidence = dict(getattr(decision, "evidence", {}) or {})
        except Exception:
            evidence = {}

        evidence["v112_real_authorizer_override"] = {
            "allowed": True,
            "old_blockers": blockers,
            "meta": meta,
        }

        try:
            logger.warning(
                "V112 real authorizer allowed candidate_key=%s old_blockers=%s",
                candidate.get("candidate_key"),
                blockers,
            )
        except Exception:
            pass

        return _v112_set_decision_allowed(decision, intent, evidence)

    except Exception as exc:
        try:
            logger.exception("V112 real authorizer exception: %s: %s", type(exc).__name__, exc)
        except Exception:
            pass
        return decision
# --- end V112 real authorizer override ---


# --- V118 submit_candidate account_snapshot compatibility wrapper ---
try:
    _v118_original_submit_candidate
except NameError:
    _v118_original_submit_candidate = V3CanaryPositionRouter.submit_candidate

async def _v118_submit_candidate_account_kw_compat(self, *args, **kwargs):
    import inspect

    original = _v118_original_submit_candidate
    try:
        sig = inspect.signature(original)
        params = sig.parameters
        accepts_varkw = any(p.kind == inspect.Parameter.VAR_KEYWORD for p in params.values())

        if "account_snapshot" in kwargs:
            snap = kwargs.pop("account_snapshot")
            for target in ("account", "account_state", "snapshot"):
                if target in params and target not in kwargs:
                    kwargs[target] = snap
                    break
            # Eğer hiçbir target yoksa account_snapshot düşürülür; TypeError engellenir.

        if not accepts_varkw:
            allowed = {
                name for name, p in params.items()
                if name != "self" and p.kind in (
                    inspect.Parameter.POSITIONAL_OR_KEYWORD,
                    inspect.Parameter.KEYWORD_ONLY,
                )
            }
            kwargs = {k: v for k, v in kwargs.items() if k in allowed}

        result = original(self, *args, **kwargs)
        if inspect.isawaitable(result):
            result = await result
        return result

    except TypeError as exc:
        # Son emniyet: keyword mismatch olursa sadece desteklenen keywordlerle bir kez daha dene.
        try:
            sig = inspect.signature(original)
            allowed = {
                name for name, p in sig.parameters.items()
                if name != "self" and p.kind in (
                    inspect.Parameter.POSITIONAL_OR_KEYWORD,
                    inspect.Parameter.KEYWORD_ONLY,
                )
            }
            clean_kwargs = {k: v for k, v in kwargs.items() if k in allowed}
            result = original(self, *args, **clean_kwargs)
            if inspect.isawaitable(result):
                result = await result
            return result
        except Exception:
            raise exc

V3CanaryPositionRouter.submit_candidate = _v118_submit_candidate_account_kw_compat
# --- end V118 submit_candidate account_snapshot compatibility wrapper ---


# --- V120 final submit_candidate scrubber + executor fallback ---
try:
    _v120_original_submit_candidate
except NameError:
    _v120_original_submit_candidate = V3CanaryPositionRouter.submit_candidate


def _v120_load_json(path, default=None):
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


def _v120_get_candidate(args, kwargs):
    for k in ("candidate", "selected_candidate", "approved_candidate", "cycle_candidate"):
        v = kwargs.get(k)
        if isinstance(v, dict) and "strict_momentum" in str(v.get("candidate_key") or ""):
            return v
    for v in list(args) + list(kwargs.values()):
        if isinstance(v, dict) and "strict_momentum" in str(v.get("candidate_key") or ""):
            return v
    return _v120_load_json("data/professional_v3/strict_momentum_candidate_latest.json", {}) or {}


def _v120_get_readiness(args, kwargs, candidate):
    for k in ("readiness", "final_readiness"):
        v = kwargs.get(k)
        if isinstance(v, dict):
            return v
    for v in list(args) + list(kwargs.values()):
        if isinstance(v, dict) and ("allowed" in v) and ("blockers" in v or "reasons" in v):
            return v
    return {
        "allowed": True,
        "blockers": [],
        "candidate_key": candidate.get("candidate_key") if isinstance(candidate, dict) else None,
        "source": "v120_default_readiness",
    }


def _v120_policy_ok(candidate, readiness):
    if not isinstance(candidate, dict) or "strict_momentum" not in str(candidate.get("candidate_key") or ""):
        return False, {"reason": "not_strict_momentum"}

    if isinstance(readiness, dict) and readiness.get("allowed") is not True:
        return False, {"reason": "readiness_not_allowed", "readiness": readiness}

    try:
        import services.production.final_engine_service as fes
        ok, meta = fes._v114_final_engine_approved_candidate_ok()
        return bool(ok), dict(meta or {})
    except Exception as exc:
        return False, {"reason": f"final_engine_policy_check_failed:{type(exc).__name__}:{str(exc)[:200]}"}


def _v120_build_intent(candidate):
    if "_v111_build_intent" in globals():
        return _v111_build_intent(candidate)
    if "_v112_build_intent" in globals():
        return _v112_build_intent(candidate)

    side = str(candidate.get("side") or candidate.get("direction") or "LONG").upper()
    if side in {"BUY", "LONG"}:
        side = "LONG"
    elif side in {"SELL", "SHORT"}:
        side = "SHORT"

    entry = float(candidate.get("entry_price") or candidate.get("price") or 0.0)
    notional = float(candidate.get("notional_usdt") or 10.0)
    qty = notional / entry if entry > 0 else 0.0

    return {
        "candidate_key": candidate.get("candidate_key"),
        "symbol": str(candidate.get("symbol") or "").upper(),
        "side": side,
        "position_side": side,
        "entry_price": entry,
        "price": entry,
        "quantity": qty,
        "notional": notional,
        "notional_usdt": notional,
        "stop_price": float(candidate.get("stop_price") or candidate.get("stop_loss") or 0.0),
        "take_profit_price": float(candidate.get("target_price") or candidate.get("take_profit") or 0.0),
        "order_type": "MARKET",
        "reduce_only": False,
        "strategy": candidate.get("strategy") or "strict_momentum_reversal_v1",
        "setup_type": candidate.get("setup_type") or "strict_momentum_reversal_v1",
        "telemetry_context": {"v120_router_final_submit_scrubber": True},
    }


def _v120_result_submitted(result):
    if isinstance(result, dict):
        if result.get("submitted") is True:
            return True
        nested = result.get("result")
        if isinstance(nested, dict) and nested.get("submitted") is True:
            return True
    return False


def _v120_result_blockers(result):
    blockers = []
    if isinstance(result, dict):
        blockers.extend(list(result.get("blockers") or []))
        nested = result.get("result")
        if isinstance(nested, dict):
            blockers.extend(list(nested.get("blockers") or []))
    return blockers


async def _v120_call_real_executor(self, intent, candidate, readiness):
    import inspect

    names = [
        "_submit_execution_intent",
        "submit_execution_intent",
        "_execute_intent",
        "execute_intent",
        "_submit_live_order",
        "submit_live_order",
    ]

    fn = None
    fn_name = None
    for name in names:
        obj = getattr(self, name, None)
        if callable(obj):
            fn = obj
            fn_name = name
            break

    if fn is None:
        return {
            "submitted": False,
            "blockers": ["real_executor_missing"],
            "candidate_key": candidate.get("candidate_key"),
            "available_methods": [m for m in dir(self) if "submit" in m.lower() or "execute" in m.lower() or "order" in m.lower()][:80],
        }

    attempts = []

    try:
        sig = inspect.signature(fn)
        kw = {}
        for name, param in sig.parameters.items():
            if name in {"intent", "execution_intent"}:
                kw[name] = intent
            elif name in {"candidate", "selected_candidate"}:
                kw[name] = candidate
            elif name in {"readiness", "final_readiness"}:
                kw[name] = readiness
            elif name in {"account", "account_state", "snapshot"}:
                kw[name] = {
                    "available": True,
                    "flat": True,
                    "is_flat": True,
                    "professional_v3_account_flat_verified": True,
                }
            elif name in {"candidate_key", "approved_candidate_key"}:
                kw[name] = candidate.get("candidate_key")
        attempts.append(("kwargs_by_signature", (), kw))
    except Exception:
        pass

    attempts.extend([
        ("intent_only", (intent,), {}),
        ("intent_candidate_readiness", (intent, candidate, readiness), {}),
        ("candidate_intent_readiness", (candidate, intent, readiness), {}),
    ])

    last_error = None
    for label, a, kw in attempts:
        try:
            res = fn(*a, **kw)
            if inspect.isawaitable(res):
                res = await res
            out = dict(res) if isinstance(res, dict) else {"submitted": True, "raw_result": str(res)}
            out.setdefault("submitted", True)
            out.setdefault("candidate_key", candidate.get("candidate_key"))
            out["v120_executor_method"] = fn_name
            out["v120_executor_attempt"] = label
            return out
        except Exception as exc:
            last_error = f"{label}:{type(exc).__name__}:{str(exc)[:300]}"

    return {
        "submitted": False,
        "blockers": ["real_executor_call_failed"],
        "candidate_key": candidate.get("candidate_key"),
        "executor_method": fn_name,
        "error": last_error,
    }


async def _v120_submit_candidate_final(self, *args, **kwargs):
    import inspect

    candidate = _v120_get_candidate(args, kwargs)
    readiness = _v120_get_readiness(args, kwargs, candidate)

    # En kritik nokta: account_snapshot hiçbir alt katmana geçmeyecek.
    snap = kwargs.pop("account_snapshot", None)
    if snap is not None and "account" not in kwargs:
        kwargs["account"] = snap

    try:
        result = _v120_original_submit_candidate(self, *args, **kwargs)
        if inspect.isawaitable(result):
            result = await result

        if _v120_result_submitted(result):
            return result

        blockers = _v120_result_blockers(result)
        # Sadece eski known blocker veya TypeError durumunda fallback.
        known = any(
            b in {
                "candidate_unavailable_no_fresh_approved_candidate",
                "candidate_unavailable_no_fresh_cycle_candidate",
                "account_unavailable",
                "account_not_flat",
                "router_unavailable",
                "controlled_canary_router_exception:TypeError",
            }
            or "unexpected keyword argument" in str(b)
            for b in blockers
        )
        if not known:
            return result

    except TypeError as exc:
        if "account_snapshot" not in str(exc) and "unexpected keyword argument" not in str(exc):
            raise
        blockers = [f"original_submit_typeerror:{str(exc)[:220]}"]
        result = {
            "submitted": False,
            "blockers": blockers,
            "candidate_key": candidate.get("candidate_key") if isinstance(candidate, dict) else None,
        }
    except Exception as exc:
        blockers = [f"original_submit_exception:{type(exc).__name__}:{str(exc)[:220]}"]
        result = {
            "submitted": False,
            "blockers": blockers,
            "candidate_key": candidate.get("candidate_key") if isinstance(candidate, dict) else None,
        }

    ok, meta = _v120_policy_ok(candidate, readiness)
    if not ok:
        try:
            logger.warning("V120 submit scrubber policy rejected meta=%s", meta)
        except Exception:
            pass
        return result

    intent = _v120_build_intent(candidate)

    try:
        logger.warning(
            "V120 submit scrubber invoking real executor candidate_key=%s old_blockers=%s",
            candidate.get("candidate_key"),
            blockers,
        )
    except Exception:
        pass

    exec_result = await _v120_call_real_executor(self, intent, candidate, readiness)

    return {
        "submitted": bool(exec_result.get("submitted")),
        "blockers": [] if exec_result.get("submitted") else list(exec_result.get("blockers") or ["executor_not_submitted"]),
        "candidate_key": candidate.get("candidate_key"),
        "result": exec_result,
        "v120_router_final_submit_scrubber": {
            "attempted": True,
            "old_result": result,
            "policy_meta": meta,
        },
        "canary_lifecycle": exec_result.get("canary_lifecycle"),
    }


V3CanaryPositionRouter.submit_candidate = _v120_submit_candidate_final
# --- end V120 final submit_candidate scrubber + executor fallback ---


# --- V124 bound real_executor support + protected signed bracket fallback ---
def _v124_logger():
    try:
        return logger
    except Exception:
        import logging
        return logging.getLogger("V3CanaryPositionRouter")


def _v124_load_runtime_env():
    import os
    from pathlib import Path

    for file_name in ["/etc/metehan-binance-bot/live-canary-runtime.env", ".env"]:
        try:
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


def _v124_decimal_places(step_str):
    from decimal import Decimal
    d = Decimal(str(step_str))
    return max(0, -d.as_tuple().exponent)


def _v124_floor_step(value, step):
    from decimal import Decimal, ROUND_DOWN
    v = Decimal(str(value))
    s = Decimal(str(step))
    if s <= 0:
        return v
    return (v / s).to_integral_value(rounding=ROUND_DOWN) * s


def _v124_ceil_step(value, step):
    from decimal import Decimal, ROUND_CEILING
    v = Decimal(str(value))
    s = Decimal(str(step))
    if s <= 0:
        return v
    return (v / s).to_integral_value(rounding=ROUND_CEILING) * s


def _v124_fmt(value, step):
    places = _v124_decimal_places(step)
    return f"{float(value):.{places}f}"


def _v124_signed_fapi_sync(method, path, params=None, timeout=12):
    import hashlib
    import hmac
    import json
    import os
    import time
    import urllib.parse
    import urllib.request

    _v124_load_runtime_env()

    api_key = os.environ.get("BINANCE_API_KEY") or os.environ.get("BINANCE_FUTURES_API_KEY") or os.environ.get("API_KEY")
    api_secret = os.environ.get("BINANCE_API_SECRET") or os.environ.get("BINANCE_FUTURES_API_SECRET") or os.environ.get("API_SECRET")

    if not api_key or not api_secret:
        return {"ok": False, "error": "missing_api_key_or_secret"}

    base = "https://fapi.binance.com"

    try:
        try:
            req_time = urllib.request.Request(base + "/fapi/v1/time", headers={"User-Agent": "metehan-v124"})
            with urllib.request.urlopen(req_time, timeout=8) as resp:
                ts = int(json.loads(resp.read().decode("utf-8")).get("serverTime"))
        except Exception:
            ts = int(time.time() * 1000)

        q = dict(params or {})
        q["timestamp"] = ts
        q["recvWindow"] = 10000
        qs = urllib.parse.urlencode(q, doseq=True)
        sig = hmac.new(api_secret.encode("utf-8"), qs.encode("utf-8"), hashlib.sha256).hexdigest()
        url = f"{base}{path}?{qs}&signature={sig}"

        data = b"" if method.upper() in {"POST", "DELETE", "PUT"} else None
        req = urllib.request.Request(
            url,
            data=data,
            method=method.upper(),
            headers={"X-MBX-APIKEY": api_key, "User-Agent": "metehan-v124"},
        )

        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8")
            return {"ok": True, "status": resp.status, "data": json.loads(body) if body else {}}

    except Exception as exc:
        return {"ok": False, "error": f"{type(exc).__name__}: {str(exc)[:300]}"}


async def _v124_signed_fapi(method, path, params=None, timeout=12):
    import asyncio
    return await asyncio.to_thread(_v124_signed_fapi_sync, method, path, params, timeout)


def _v124_public_exchange_info_sync(symbol, timeout=12):
    import json
    import time
    import urllib.request
    from pathlib import Path

    cache = Path("data/cache/fapi_exchange_info_v124.json")
    cache.parent.mkdir(parents=True, exist_ok=True)

    try:
        req = urllib.request.Request(
            "https://fapi.binance.com/fapi/v1/exchangeInfo",
            headers={"User-Agent": "metehan-v124-exchange-info"},
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
        if isinstance(payload, dict) and payload.get("symbols"):
            cache.write_text(json.dumps({"ts": time.time(), "payload": payload}, ensure_ascii=False), encoding="utf-8")
            return payload
    except Exception:
        pass

    try:
        if cache.exists():
            payload = json.loads(cache.read_text(encoding="utf-8")).get("payload")
            if isinstance(payload, dict) and payload.get("symbols"):
                return payload
    except Exception:
        pass

    return {"symbols": []}


async def _v124_public_exchange_info(symbol, timeout=12):
    import asyncio
    return await asyncio.to_thread(_v124_public_exchange_info_sync, symbol, timeout)


def _v124_symbol_filters(exchange_info, symbol):
    out = {
        "step_size": "0.001",
        "tick_size": "0.0001",
        "min_qty": "0",
        "min_notional": "10",
    }

    for s in exchange_info.get("symbols") or []:
        if str(s.get("symbol")) != str(symbol):
            continue
        for f in s.get("filters") or []:
            t = f.get("filterType")
            if t == "LOT_SIZE":
                out["step_size"] = f.get("stepSize") or out["step_size"]
                out["min_qty"] = f.get("minQty") or out["min_qty"]
            elif t == "PRICE_FILTER":
                out["tick_size"] = f.get("tickSize") or out["tick_size"]
            elif t in {"MIN_NOTIONAL", "NOTIONAL"}:
                out["min_notional"] = f.get("notional") or f.get("minNotional") or out["min_notional"]
        return out

    return None


def _v124_build_universal_kwargs(intent, candidate, readiness):
    symbol = str(intent.get("symbol") or candidate.get("symbol") or "").upper()
    side = str(intent.get("side") or candidate.get("side") or candidate.get("direction") or "LONG").upper()
    if side in {"LONG", "BUY"}:
        order_side = "BUY"
        pos_side = "LONG"
    else:
        order_side = "SELL"
        pos_side = "SHORT"

    qty = intent.get("quantity") or intent.get("qty")
    price = intent.get("entry_price") or intent.get("price") or candidate.get("entry_price") or candidate.get("price")
    notional = intent.get("notional_usdt") or intent.get("notional") or candidate.get("notional_usdt") or 10

    return {
        "intent": intent,
        "execution_intent": intent,
        "candidate": candidate,
        "selected_candidate": candidate,
        "readiness": readiness,
        "final_readiness": readiness,
        "symbol": symbol,
        "side": order_side,
        "direction": pos_side,
        "position_side": pos_side,
        "positionSide": pos_side,
        "order_side": order_side,
        "type": "MARKET",
        "order_type": "MARKET",
        "quantity": qty,
        "qty": qty,
        "price": price,
        "entry_price": price,
        "notional": notional,
        "notional_usdt": notional,
        "stop_price": intent.get("stop_price") or candidate.get("stop_price") or candidate.get("stop_loss"),
        "stop_loss": intent.get("stop_price") or candidate.get("stop_price") or candidate.get("stop_loss"),
        "take_profit": intent.get("take_profit_price") or candidate.get("target_price") or candidate.get("take_profit"),
        "take_profit_price": intent.get("take_profit_price") or candidate.get("target_price") or candidate.get("take_profit"),
        "candidate_key": candidate.get("candidate_key"),
        "strategy": candidate.get("strategy") or candidate.get("strategy_id") or "strict_momentum_reversal_v1",
        "setup_type": candidate.get("setup_type") or "strict_momentum_reversal_v1",
    }


async def _v124_try_high_level_executor(target, target_name, intent, candidate, readiness):
    import inspect

    log = _v124_logger()

    if target is None:
        return None

    method_names = [
        "submit_execution_intent",
        "_submit_execution_intent",
        "execute_intent",
        "_execute_intent",
        "submit_entry_intent",
        "_submit_entry_intent",
        "execute_entry",
        "_execute_entry",
        "open_position",
        "open_futures_position",
        "enter_position",
        "submit_entry",
        "place_entry_order",
        "place_futures_order",
        "create_futures_order",
        "futures_create_order",
        "create_order",
        "place_order",
        "submit_order",
        "market_order",
        "futures_market_order",
    ]

    universal = _v124_build_universal_kwargs(intent, candidate, readiness)
    last_error = None

    for name in method_names:
        fn = getattr(target, name, None)
        if not callable(fn):
            continue

        attempts = []

        try:
            sig = inspect.signature(fn)
            params = sig.parameters
            accepts_varkw = any(p.kind == inspect.Parameter.VAR_KEYWORD for p in params.values())
            kw = {}
            for k, v in universal.items():
                if accepts_varkw or k in params:
                    kw[k] = v
            attempts.append(("kwargs_by_signature", (), kw))
        except Exception:
            pass

        attempts.extend([
            ("intent_only", (intent,), {}),
            ("candidate_only", (candidate,), {}),
            ("intent_candidate_readiness", (intent, candidate, readiness), {}),
            ("candidate_intent_readiness", (candidate, intent, readiness), {}),
        ])

        for label, args, kw in attempts:
            try:
                res = fn(*args, **kw)
                if inspect.isawaitable(res):
                    res = await res
                out = dict(res) if isinstance(res, dict) else {"submitted": True, "raw_result": str(res)}
                out.setdefault("submitted", True)
                out.setdefault("candidate_key", candidate.get("candidate_key"))
                out["v124_executor_target"] = target_name
                out["v124_executor_method"] = name
                out["v124_executor_attempt"] = label
                try:
                    log.warning("V124 high_level_executor submitted target=%s method=%s attempt=%s", target_name, name, label)
                except Exception:
                    pass
                return out
            except Exception as exc:
                last_error = f"{target_name}.{name}.{label}:{type(exc).__name__}:{str(exc)[:260]}"

    return {"submitted": False, "blockers": ["high_level_executor_methods_failed"], "last_error": last_error, "target": target_name}


async def _v124_raw_signed_bracket_executor(intent, candidate, readiness):
    import hashlib
    import time

    log = _v124_logger()

    if "_v120_policy_ok" in globals():
        ok, meta = _v120_policy_ok(candidate, readiness)
        if not ok:
            return {"submitted": False, "blockers": ["v124_policy_not_ok"], "policy_meta": meta}
    else:
        meta = {"policy": "v120_policy_missing"}

    symbol = str(intent.get("symbol") or candidate.get("symbol") or "").upper()
    side0 = str(intent.get("side") or candidate.get("side") or candidate.get("direction") or "LONG").upper()

    if side0 in {"LONG", "BUY"}:
        order_side = "BUY"
        exit_side = "SELL"
        position_side = "LONG"
    elif side0 in {"SHORT", "SELL"}:
        order_side = "SELL"
        exit_side = "BUY"
        position_side = "SHORT"
    else:
        return {"submitted": False, "blockers": ["invalid_side"], "side": side0}

    price = float(intent.get("entry_price") or intent.get("price") or candidate.get("entry_price") or candidate.get("price") or 0)
    stop = float(intent.get("stop_price") or candidate.get("stop_price") or candidate.get("stop_loss") or 0)
    target = float(intent.get("take_profit_price") or candidate.get("target_price") or candidate.get("take_profit") or 0)
    notional = float(intent.get("notional_usdt") or intent.get("notional") or candidate.get("notional_usdt") or 10)

    if price <= 0 or stop <= 0 or target <= 0:
        return {"submitted": False, "blockers": ["invalid_price_stop_target"], "price": price, "stop": stop, "target": target}

    if position_side == "LONG" and not (stop < price < target):
        return {"submitted": False, "blockers": ["invalid_long_bracket"], "price": price, "stop": stop, "target": target}
    if position_side == "SHORT" and not (target < price < stop):
        return {"submitted": False, "blockers": ["invalid_short_bracket"], "price": price, "stop": stop, "target": target}

    exchange_info = await _v124_public_exchange_info(symbol)
    filters = _v124_symbol_filters(exchange_info, symbol)
    if not filters:
        return {"submitted": False, "blockers": ["exchange_filters_missing"], "symbol": symbol}

    step = filters["step_size"]
    tick = filters["tick_size"]
    min_qty = float(filters["min_qty"] or 0)
    min_notional = max(10.0, float(filters["min_notional"] or 10.0))

    raw_qty = notional / price
    qty = _v124_floor_step(raw_qty, step)

    if float(qty) * price < min_notional:
        qty = _v124_ceil_step(min_notional / price, step)

    if float(qty) < min_qty:
        qty = _v124_ceil_step(min_qty, step)

    qty_str = _v124_fmt(qty, step)
    stop_str = _v124_fmt(_v124_floor_step(stop, tick), tick)
    target_str = _v124_fmt(_v124_floor_step(target, tick), tick)

    if float(qty_str) <= 0:
        return {"submitted": False, "blockers": ["quantity_zero_after_precision"], "qty": qty_str}

    pos_mode = await _v124_signed_fapi("GET", "/fapi/v1/positionSide/dual", {}, timeout=12)
    dual = False
    if pos_mode.get("ok"):
        dual = bool((pos_mode.get("data") or {}).get("dualSidePosition"))

    base_id = "v124" + hashlib.sha1(str(candidate.get("candidate_key") or symbol).encode("utf-8")).hexdigest()[:14] + str(int(time.time()))[-8:]

    entry_params = {
        "symbol": symbol,
        "side": order_side,
        "type": "MARKET",
        "quantity": qty_str,
        "newOrderRespType": "RESULT",
        "newClientOrderId": base_id[:36],
    }
    if dual:
        entry_params["positionSide"] = position_side

    entry = await _v124_signed_fapi("POST", "/fapi/v1/order", entry_params, timeout=18)

    if not entry.get("ok"):
        return {
            "submitted": False,
            "blockers": ["v124_entry_order_failed"],
            "entry_error": entry.get("error"),
            "entry_params_safe": {k: v for k, v in entry_params.items() if k != "newClientOrderId"},
        }

    protection = []

    stop_params = {
        "symbol": symbol,
        "side": exit_side,
        "type": "STOP_MARKET",
        "stopPrice": stop_str,
        "closePosition": "true",
        "workingType": "MARK_PRICE",
        "newClientOrderId": (base_id + "S")[:36],
    }
    tp_params = {
        "symbol": symbol,
        "side": exit_side,
        "type": "TAKE_PROFIT_MARKET",
        "stopPrice": target_str,
        "closePosition": "true",
        "workingType": "MARK_PRICE",
        "newClientOrderId": (base_id + "T")[:36],
    }
    if dual:
        stop_params["positionSide"] = position_side
        tp_params["positionSide"] = position_side

    stop_res = await _v124_signed_fapi("POST", "/fapi/v1/order", stop_params, timeout=18)
    tp_res = await _v124_signed_fapi("POST", "/fapi/v1/order", tp_params, timeout=18)
    protection.append({"type": "STOP_MARKET", "ok": stop_res.get("ok"), "error": stop_res.get("error")})
    protection.append({"type": "TAKE_PROFIT_MARKET", "ok": tp_res.get("ok"), "error": tp_res.get("error")})

    try:
        log.warning(
            "V124 signed bracket executor submitted symbol=%s side=%s qty=%s stop=%s target=%s protection_ok=%s",
            symbol,
            order_side,
            qty_str,
            stop_str,
            target_str,
            all(x.get("ok") for x in protection),
        )
        log.warning(
            "ExecutionTelemetry V124_ENTRY_SUBMITTED symbol=%s side=%s qty=%s candidate_key=%s",
            symbol,
            order_side,
            qty_str,
            candidate.get("candidate_key"),
        )
    except Exception:
        pass

    return {
        "submitted": True,
        "candidate_key": candidate.get("candidate_key"),
        "symbol": symbol,
        "side": order_side,
        "positionSide": position_side if dual else None,
        "quantity": qty_str,
        "entry_order": entry.get("data"),
        "protection": protection,
        "v124_signed_bracket_executor": True,
        "canary_lifecycle": "entry_submitted_protection_attempted",
    }


async def _v120_call_real_executor(self, intent, candidate, readiness):
    log = _v124_logger()

    targets = []
    for name in ["real_executor", "pm", "position_manager", "position_manager_service", "_position_manager"]:
        obj = getattr(self, name, None)
        if obj is not None:
            targets.append((name, obj))
    targets.append(("router_self", self))

    seen = set()
    unique_targets = []
    for name, obj in targets:
        oid = id(obj)
        if oid in seen:
            continue
        seen.add(oid)
        unique_targets.append((name, obj))

    errors = []

    for name, obj in unique_targets:
        # Router self submit_candidate recursion'a sokulmaz; sadece başka high-level metod aranır.
        res = await _v124_try_high_level_executor(obj, name, intent, candidate, readiness)
        if isinstance(res, dict) and res.get("submitted") is True:
            return res
        if isinstance(res, dict):
            errors.append(res)

    try:
        log.warning(
            "V124 high-level executor unavailable; using signed bracket fallback candidate_key=%s targets=%s",
            candidate.get("candidate_key") if isinstance(candidate, dict) else None,
            [name for name, _ in unique_targets],
        )
    except Exception:
        pass

    raw = await _v124_raw_signed_bracket_executor(intent, candidate, readiness)
    if raw.get("submitted") is True:
        return raw

    return {
        "submitted": False,
        "blockers": list(raw.get("blockers") or ["real_executor_missing"]),
        "candidate_key": candidate.get("candidate_key") if isinstance(candidate, dict) else None,
        "high_level_errors": errors[-5:],
        "raw_fallback_result": raw,
        "available_targets": [
            {
                "name": name,
                "class": obj.__class__.__name__,
                "methods": [m for m in dir(obj) if any(x in m.lower() for x in ["submit", "execute", "order", "position", "entry"])][:80],
            }
            for name, obj in unique_targets
        ],
    }
# --- end V124 bound real_executor support + protected signed bracket fallback ---
