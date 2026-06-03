# ============================================================
#  METEHAN BINANCE TRADING BOT - ANA GİRİŞ NOKTASI
#  7/24 aktif, Futures + Spot, akıllı trading botu
#  Current production runtime
#
#  MODÜLLER:
#  ─────────────────────────────────────────
#  - Hyper-Cortex: Sentiment zekası, Black Swan tespiti
#  - Kelly Engine: Dinamik pozisyon boyutlandırma
#  - Climax Detector: Parabolik trailing + klimaks çıkış
#  - Autopoiesis: Öz-öğrenme parametre mutasyonu
#
#  Orchestrator: Tüm modülleri birleştiren ana döngü
# ============================================================

BOT_VERSION = "8.5.0"
RUNTIME_RESTART_SLEEP_SECONDS = 15

import asyncio
import json
import logging
import time
import sys
import traceback
from datetime import datetime, timezone
from pathlib import Path

import config
from state_manager import StateManager
from exchange_client import ExchangeClient
from hyper_cortex import HyperCortex
from kelly_engine import KellyEngine
from climax_detector import ClimaxDetector
from autopoiesis import Autopoiesis
from risk_manager import RiskManager
from position_manager import PositionManager
from strategy_engine import StrategyEngine
from telegram_bot import TelegramBot
from sentience_bridge import SentienceBridge
from self_learning import SelfLearningEngine
# Yeni profesyonel ticaret sistemleri
from capital_profile import ProfileManager
from cost_engine import CostEngine
from symbol_profile import SymbolProfileEngine
from symbol_memory import SymbolMemory
from services.symbol_memory.service import SymbolMemoryService
from services.symbol_memory.state import SymbolMemoryStateStore
from research.service import ResearchValidationService
from model_registry import ModelRegistry
from research_queue import ResearchQueue
from shadow_mode import ShadowModeOrchestrator
from persona_model import TraderPersona
from infra.config_audit import audit_production_config
from infra.feature_flags import build_feature_flag_snapshot
from infra.health import build_health_summary
from infra.logging_setup import configure_logging
from infra import runtime_telemetry as rt
from infra.metrics import MetricsRegistry
from infra.metrics_exporter import export_metrics_snapshot, export_governance_snapshot
from infra.runtime_governance import (
    IncidentLifecycleManager,
    build_runtime_governance_snapshot,
)
from infra.runtime_status import (
    RuntimeDependencyStatus,
    reconcile_status,
    staleness_from_ts,
    STALE_EVENT_SOURCE_SECONDS,
    STALE_MARKET_DATA_SECONDS,
    STALE_SYMBOL_MEMORY_SECONDS,
)
from infra.runtime_guardian import RuntimeGuardian
from infra.trade_authority import evaluate_entry_authority
from infra.startup_validation import validate_startup
from infra.autonomous_ops import AutonomousIncidentEngine, QuarantineRegistry, default_rollout_registry
from account_snapshot import AccountSnapshotService
from services.expectancy.gate import LiveExpectancyGate
from services.expectancy.paper import PaperTradingEngine
from services.expectancy.runtime import PaperFuturesRuntime, PaperRuntimeConfig
from services.production.final_engine_service import run_final_engine_service_cycle, write_engine_not_started_status
from services.production.v3_canary_router import V3CanaryPositionRouter
from services.expectancy.risk_state import RISK_STATE_POSITIVE, evaluate_risk_expectancy


def _is_paper_futures_runtime_enabled() -> bool:
    """Fail-closed paper futures runtime gate; only literal True enables runtime startup."""
    return getattr(config, "PAPER_FUTURES_RUNTIME_ENABLED", False) is True


# Logging
configure_logging(
    level=getattr(config, "LOG_LEVEL", "INFO"),
    structured=bool(getattr(config, "ENABLE_STRUCTURED_LOGGING", True)),
)
logger = logging.getLogger("Main")


def _build_startup_validation_result():
    return validate_startup(config)


def _enforce_bootstrap_guards(startup_validation_result) -> None:
    # --- Kritik environment variable kontrolü ---
    missing = [
        k for k in ("BINANCE_API_KEY", "BINANCE_API_SECRET", "TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID")
        if not getattr(config, k, "")
    ]
    if missing:
        logger.error(f"KRITIK: Eksik environment variable: {missing}")
        logger.error("Bot başlatılamaz. .env dosyasını veya AWS SSM'i kontrol edin.")
        raise SystemExit(1)

    if getattr(config, "ENABLE_STARTUP_VALIDATION", True):
        if not startup_validation_result.passed and startup_validation_result.fail_fast:
            logger.error(f"Startup validation failed: {startup_validation_result.errors}")
            raise SystemExit(1)
        if startup_validation_result.warnings:
            logger.warning(f"Startup validation warnings: {startup_validation_result.warnings}")


class TradingBot:
    def __init__(self):
        self.running = False
        self._intentional_shutdown = False
        self.metrics = MetricsRegistry()
        self.startup_validation = _build_startup_validation_result()
        self.feature_flags = build_feature_flag_snapshot(config)
        self.production_config_report = audit_production_config(config)
        self.latest_health_summary = None
        self.runtime_guardian = RuntimeGuardian()
        self._last_guardian_alert_at = 0.0
        self._last_guardian_alert_fingerprint = ""
        self._incident_alert_sent_at: dict[str, float] = {}
        self.incident_manager = IncidentLifecycleManager()
        self.autonomous_engine = AutonomousIncidentEngine()
        self.quarantine_registry = QuarantineRegistry()
        self.rollout_registry = default_rollout_registry()

        # Core modules
        self.state = StateManager()
        self.exchange = ExchangeClient()
        self.account_snapshot = AccountSnapshotService(self.exchange, self.state)

        # Adaptive intelligence modules
        self.cortex = HyperCortex(self.exchange)
        self.kelly = KellyEngine(self.state)
        self.climax = ClimaxDetector()
        self.autopoiesis = Autopoiesis(self.state)

        # Adaptive intelligence modules
        self.sentience = SentienceBridge(self.exchange)
        self.self_learning = SelfLearningEngine(self.state)

        # Production trading systems
        # Başlangıç bakiyesi 0 → _init_balance() sonrası refresh() çağrılacak
        self.profile_mgr   = ProfileManager(current_equity=100.0)
        self.cost_engine   = CostEngine()
        self.sym_profile   = SymbolProfileEngine()
        self.symbol_mem    = SymbolMemory()
        self.symbol_memory_service = None
        self.research_validation_service = None
        if getattr(config, "USE_SYMBOL_MEMORY", False):
            try:
                self.symbol_memory_service = SymbolMemoryService(
                    state_store=SymbolMemoryStateStore(f"{config.DATA_DIR}/symbol_memory_state.json")
                )
            except Exception as _sm_init_err:
                logger.error(f"SymbolMemoryService init hatasi: {_sm_init_err}")
                self.symbol_memory_service = None

        if getattr(config, "USE_RESEARCH_VALIDATION", False):
            try:
                self.research_validation_service = ResearchValidationService()
            except Exception as _rv_err:
                logger.error(f"ResearchValidationService init hatasi: {_rv_err}")
                self.research_validation_service = None

        self.persona = TraderPersona(
            risk_tolerance=getattr(config, "PERSONA_RISK_TOLERANCE", 0.5),
            desired_trade_frequency=getattr(config, "PERSONA_DESIRED_TRADE_FREQUENCY", 0.5),
            max_drawdown_tolerance=getattr(config, "PERSONA_MAX_DRAWDOWN_TOLERANCE", 0.1),
            overnight_tolerance=getattr(config, "PERSONA_OVERNIGHT_TOLERANCE", 0.5),
            smoothness_preference=getattr(config, "PERSONA_SMOOTHNESS_PREFERENCE", 0.5),
            reduce_only=getattr(config, "PERSONA_REDUCE_ONLY", True),
        )

        # Risk + Position + Strategy production integration
        self.risk = RiskManager(
            self.state,
            kelly_engine=self.kelly,
            profile_manager=self.profile_mgr,
            symbol_memory=self.symbol_mem,
        )
        self.pm = PositionManager(
            self.exchange, self.risk, self.state,
            climax_detector=self.climax,
            symbol_memory=self.symbol_mem,
            profile_manager=self.profile_mgr,
            cost_engine=self.cost_engine,     # net edge gate
        )
        self.pm.persona = self.persona
        if self.symbol_memory_service is not None:
            self.pm._symbol_memory_service = self.symbol_memory_service

        self.strategy = StrategyEngine(
            self.exchange, self.risk, self.state,
            hyper_cortex=self.cortex,
            climax_detector=self.climax,
            sentience_bridge=self.sentience,
            self_learning=self.self_learning,
            profile_manager=self.profile_mgr,
            symbol_profile_engine=self.sym_profile,
            cost_engine=self.cost_engine,
        )
        self.strategy.persona = self.persona
        self.telegram = TelegramBot(
            self.pm, self.strategy, self.risk, self.exchange, self.state, self.account_snapshot
        )
        self._configure_paper_futures_runtime()

        self._watchdog_last = time.time()
        self._telegram_started = False
        self._runtime_tasks: list[asyncio.Task] = []
        self._shutdown_lock = asyncio.Lock()
        self._stale_since_at: str | None = None
        now_iso = datetime.now(timezone.utc).isoformat()
        self.state.set("bot_started_at", now_iso)
        self.state.set("last_heartbeat_at", now_iso)
        self.state.set("last_scan_completed_at", now_iso)
        self.state.set("last_decision_log_at", now_iso)
        self.state.set("last_sync_success_at", now_iso)
        self.state.set("trade_authority", self.state.get("trade_authority", "normal") or "normal")

        # V10 safe-initialized learning/research components (non-blocking)
        self.model_registry = ModelRegistry()
        self.research_queue = ResearchQueue()
        self.shadow_mode = ShadowModeOrchestrator()
        self.persona = TraderPersona(
            risk_tolerance=getattr(config, "PERSONA_RISK_TOLERANCE", 0.5),
            desired_trade_frequency=getattr(config, "PERSONA_DESIRED_TRADE_FREQUENCY", 0.5),
            max_drawdown_tolerance=getattr(config, "PERSONA_MAX_DRAWDOWN_TOLERANCE", 0.1),
            overnight_tolerance=getattr(config, "PERSONA_OVERNIGHT_TOLERANCE", 0.5),
            smoothness_preference=getattr(config, "PERSONA_SMOOTHNESS_PREFERENCE", 0.5),
        )

    def _build_runtime_health_summary(self):
        last_market = self.state.get("last_market_data_ts")
        last_events = self.state.get("last_event_news_ts")
        last_symbol_memory = self.state.get("last_symbol_memory_update_ts")
        last_reconcile = self.state.get("last_reconcile_ts")
        deps = (
            staleness_from_ts("market_data", last_market, STALE_MARKET_DATA_SECONDS),
            staleness_from_ts("event_sources", last_events, STALE_EVENT_SOURCE_SECONDS),
            staleness_from_ts("symbol_memory", last_symbol_memory, STALE_SYMBOL_MEMORY_SECONDS),
            reconcile_status(last_reconcile),
            RuntimeDependencyStatus(
                component="reporting_queue",
                ready=True,
                degraded=False,
                details=f"use_v2={getattr(config, 'USE_TELEGRAM_REPORTING_V2', False)}",
            ),
        )
        self.latest_health_summary = build_health_summary(
            runtime_dependencies=deps,
            startup_validation_passed=self.startup_validation.passed,
            feature_flags=self.feature_flags.flags,
        )
        self.state.set("runtime_health_summary", {
            "overall_healthy": self.latest_health_summary.overall_healthy,
            "degraded_components": list(self.latest_health_summary.degraded_components),
        })
        self.metrics.gauge("active_feature_flags", float(len(self.feature_flags.active_flags)))
        self.metrics.gauge("degraded_component_count", float(len(self.latest_health_summary.degraded_components)))
        self.metrics.gauge("runtime_health_overall", 1.0 if self.latest_health_summary.overall_healthy else 0.0)
        return self.latest_health_summary

    def _record_runtime_probe(self, key: str, value=None) -> None:
        if value is None:
            value = datetime.now(timezone.utc).isoformat()
        self.state.set(key, value)

    def _record_loop_success(self, loop_name: str) -> None:
        self._record_runtime_probe("last_heartbeat_at")
        self._record_runtime_probe(f"last_{loop_name}_success_at")
        self.metrics.incr(f"{loop_name}_success_count", 1.0)

    def _seconds_since(self, iso_ts: str | None) -> float | None:
        if not iso_ts:
            return None
        try:
            when = datetime.fromisoformat(iso_ts.replace("Z", "+00:00"))
        except ValueError:
            return None
        if when.tzinfo is None:
            when = when.replace(tzinfo=timezone.utc)
        return max(0.0, (datetime.now(timezone.utc) - when).total_seconds())

    def _record_loop_error(self, loop_name: str, err: Exception) -> None:
        self.metrics.incr(f"{loop_name}_error_count", 1.0)
        msg = str(err).lower()
        api_burst = int(self.state.get("api_error_burst_count", 0) or 0) + 1
        self.state.set("api_error_burst_count", api_burst)
        if "429" in msg or "rate limit" in msg or "too many requests" in msg:
            rl = int(self.state.get("rate_limit_burst_count", 0) or 0) + 1
            self.state.set("rate_limit_burst_count", rl)
            self.metrics.incr("rate_limit_burst_count", 1.0)

    def _log_runtime_blocked(self, *, stage: str, reason: str, **fields) -> None:
        rt.log_runtime_telemetry(
            logger,
            rt.BLOCKED_REASON,
            stage=stage,
            blocked_reason=str(reason or "unknown"),
            **fields,
        )
        rt.log_runtime_telemetry(
            logger,
            rt.FINAL_ENTRY_DECISION,
            stage=stage,
            decision="blocked",
            blocked_reason=str(reason or "unknown"),
            **fields,
        )

    def _log_account_flat_state(self, snapshot: dict, *, stage: str) -> None:
        try:
            state_positions_count = len(self.state.get_positions())
        except Exception:
            state_positions_count = 0
        positions_count = int(snapshot.get("positions_count", snapshot.get("open_positions_count", state_positions_count)) or 0)
        open_orders_count = int(snapshot.get("open_orders_count", 0) or 0)
        rt.log_runtime_telemetry(
            logger,
            rt.ACCOUNT_FLAT_STATE,
            stage=stage,
            account_flat=positions_count == 0 and open_orders_count == 0,
            positions_count=positions_count,
            open_orders_count=open_orders_count,
            snapshot_authority=snapshot.get("authority"),
            snapshot_source_status=snapshot.get("source_status"),
            snapshot_stale=bool(snapshot.get("stale", True)),
        )

    def _should_emit_incident_alert(self, incident: dict) -> bool:
        now_ts = time.time()
        cooldown = max(30, int(getattr(config, "RUNTIME_GUARDIAN_ALERT_COOLDOWN_SECONDS", 300)))
        key = "|".join(
            (
                str(incident.get("incident_id", "")),
                str(incident.get("status", "")),
                str(incident.get("severity", "")),
                str(incident.get("recommended_action", "")),
            )
        )
        last = float(self._incident_alert_sent_at.get(key, 0.0))
        if now_ts - last < cooldown:
            return False
        self._incident_alert_sent_at[key] = now_ts
        if len(self._incident_alert_sent_at) > 2048:
            floor = now_ts - (cooldown * 2)
            self._incident_alert_sent_at = {k: v for k, v in self._incident_alert_sent_at.items() if v >= floor}
        return True

    async def _run_runtime_guardian(self) -> None:
        if getattr(config, "NO_PAUSE_MODE", False):
            logger.warning("NO_PAUSE_MODE configured, but guardian safety bypass is disabled.")
            self.state.set("posture_transition_reason", "no_pause_mode_ignored_for_safety")
        if not bool(getattr(config, "ENABLE_RUNTIME_GUARDIAN", True)):
            return
        snapshot = {
            "last_heartbeat_at": self.state.get("last_heartbeat_at"),
            "last_scan_completed_at": self.state.get("last_scan_completed_at"),
            "last_sync_success_at": self.state.get("last_sync_success_at"),
            "last_decision_log_at": self.state.get("last_decision_log_at"),
            "last_user_stream_event_at": self.state.get("last_user_stream_event_at"),
            "last_listen_key_refresh_at": self.state.get("last_listen_key_refresh_at"),
            "last_reconcile_success_at": self.state.get("last_reconcile_success_at") or self.state.get("last_reconcile_ts"),
            "last_execution_success_at": self.state.get("last_execution_success_at"),
            "bot_started_at": self.state.get("bot_started_at"),
            "api_error_burst_count": self.state.get("api_error_burst_count", 0),
            "rate_limit_burst_count": self.state.get("rate_limit_burst_count", 0),
            "positions": self.state.get_positions(),
            "open_positions_count": len(self.state.get_positions()),
            "pending_orders_count": int(self.state.get("pending_orders_count", 0) or 0),
            "user_stream_connected": bool(self.state.get("user_stream_connected", True)),
            "trade_authority": self.state.get("trade_authority", "normal"),
            "kill_switch_active": bool(self.state.get("kill_switch_active", False)),
            "equity": self.state.get("equity", self.state.get("balance_total", 0.0)),
            "wallet_balance": self.state.get("wallet_balance", 0.0),
            "available_balance": self.state.get("available_balance", 0.0),
            "realized_pnl_day": self.state.get("realized_pnl_day", 0.0),
            "unrealized_pnl_now": self.state.get("unrealized_pnl_now", 0.0),
            "fees_day": self.state.get("fees_day", 0.0),
            "funding_day": self.state.get("funding_day", 0.0),
            "net_pnl_day": self.state.get("net_pnl_day", 0.0),
            "reconciliation_drift_count": self.state.get("reconciliation_drift_count", 0),
            "accounting_incident_count": self.state.get("accounting_incident_count", 0),
            "account_snapshot_source_status": (self.state.get("canonical_account_snapshot", {}) or {}).get("source_status", "unknown"),
            "account_snapshot_age_seconds": (self.state.get("canonical_account_snapshot", {}) or {}).get("age_seconds"),
            "account_snapshot_stale": bool((self.state.get("canonical_account_snapshot", {}) or {}).get("stale", True)),
        }
        posture_before = str(self.state.get("guardian_posture", "healthy") or "healthy")
        authority_before = str(self.state.get("trade_authority", "normal") or "normal")
        decision = self.runtime_guardian.evaluate(snapshot)
        for key, value in decision.updates.items():
            self.state.set(key, value)
        authority_after = str(self.state.get("trade_authority", "normal") or "normal")
        self._record_guardian_transition(
            posture_before=posture_before,
            posture_after=decision.posture,
            authority_before=authority_before,
            authority_after=authority_after,
            signals=[{"key": s.key, "reason": s.reason} for s in decision.signals],
        )
        self.risk.global_stop_active = bool(self.state.get("kill_switch_active", False))
        self.metrics.gauge("guardian_posture_level", float({"healthy": 0, "warn": 1, "reduce_only": 2, "pause": 3, "emergency_stop": 4}.get(decision.posture, 0)))
        for metric_name, metric_value in decision.metrics.items():
            self.metrics.gauge(metric_name, metric_value)
        governance_snapshot = build_runtime_governance_snapshot(
            {**snapshot, **decision.updates},
            guardian_posture=decision.posture,
            guardian_signals=[{"key": s.key, "severity": s.severity, "reason": s.reason} for s in decision.signals],
        )
        self.state.set("runtime_governance_snapshot", governance_snapshot)
        self.metrics.observe_observability_snapshot(governance_snapshot=governance_snapshot)
        self.state.set("last_governance_snapshot_at", datetime.now(timezone.utc).isoformat())
        self.state.set("rollout_registry", {k: vars(v) for k, v in self.rollout_registry.items()})
        self.state.set("quarantine_registry", self.quarantine_registry.snapshot())
        export_governance_snapshot(governance_snapshot)
        health_endpoint = governance_snapshot.get("health_endpoint", {})
        for field_name, metric_name in (
            ("open_positions_count", "health_open_positions_count"),
            ("pending_orders_count", "health_pending_orders_count"),
            ("api_error_burst", "health_api_error_burst"),
            ("rate_limit_burst", "health_rate_limit_burst"),
            ("reconcile_lag_seconds", "health_reconcile_lag_seconds"),
            ("last_successful_execution_age_seconds", "health_last_execution_age_seconds"),
            ("equity", "health_equity"),
            ("wallet_balance", "health_wallet_balance"),
            ("available_balance", "health_available_balance"),
            ("realized_pnl_day", "health_realized_pnl_day"),
            ("unrealized_pnl_now", "health_unrealized_pnl_now"),
            ("fees_day", "health_fees_day"),
            ("funding_day", "health_funding_day"),
            ("net_pnl_day", "health_net_pnl_day"),
            ("reconciliation_drift_count", "health_reconciliation_drift_count"),
            ("accounting_incident_count", "health_accounting_incident_count"),
        ):
            value = health_endpoint.get(field_name)
            if value is not None:
                self.metrics.gauge(metric_name, float(value))
        self.metrics.gauge(
            "health_overall_healthy",
            1.0 if bool(health_endpoint.get("overall_healthy", False)) else 0.0,
        )

        if decision.posture == "healthy":
            self.state.set("api_error_burst_count", 0)
            self.state.set("rate_limit_burst_count", 0)
        incident_events = self.incident_manager.process(
            posture_before=posture_before,
            posture_after=decision.posture,
            trigger_reason="guardian_signals",
            source_module="runtime_guardian",
            fallback_used=False,
            recommended_action="review_runtime_health_and_positions",
            snapshot=governance_snapshot,
            source_status="runtime_guardian",
            recovery_reason="guardian_evaluation",
            execution_reason="posture_transition",
            risk_reason=str(self.state.get("trade_authority", "normal")),
            portfolio_reason="governance_snapshot_update",
            event_reason="guardian_signals",
            model_reason="not_evaluated",
            security_reason="runtime_guardian_policy",
        )
        if bool(getattr(config, "ENABLE_RUNTIME_INCIDENT_TELEGRAM_ALERTS", False)):
            for incident in incident_events:
                if not self._should_emit_incident_alert(incident):
                    continue
                status = str(incident.get("status", "open"))
                sev = str(incident.get("severity", "low")).upper()
                signal_keys = ", ".join(sorted({str(s.key) for s in decision.signals})) if decision.signals else "none"
                msg = (
                    f"🛡️ *RUNTIME INCIDENT*\n"
                    f"Status: `{status}` | Severity: `{sev}`\n"
                    f"Incident: `{incident.get('incident_id', '-')}`\n"
                    f"Posture: `{incident.get('posture_before', '-')}` → `{incident.get('posture_after', '-')}`\n"
                    f"Reason: `{incident.get('trigger_reason', '-')}`\n"
                    f"Signals: `{signal_keys}`\n"
                    f"Dedup: `{incident.get('dedup_key', '-')}`\n"
                    f"Action: `{incident.get('recommended_action', '-')}`"
                )
                try:
                    await self.telegram.send_message(msg)
                except Exception as alert_err:
                    logger.error("Incident alert send failed: %s", alert_err)

        if decision.posture == "emergency_stop" and bool(getattr(config, "RUNTIME_ENABLE_EMERGENCY_CLOSE_ON_GUARDIAN", False)):
            try:
                results = await self.pm.close_all_positions("runtime_guardian_emergency_stop")
                self.metrics.incr("guardian_emergency_close_attempts", 1.0)
                closed = sum(1 for _, trade, _ in results if trade)
                self.metrics.gauge("guardian_last_emergency_closed_positions", float(closed))
            except Exception as emergency_err:
                logger.error("Guardian emergency close failed: %s", emergency_err)

        auto_rule = self.rollout_registry.get("runtime_autonomous_incident_engine")
        if not auto_rule or not auto_rule.enabled:
            return
        if auto_rule.canary_percent < 100:
            bucket = int(self.state.get("canary_bucket", 0) or 0)
            if bucket >= max(1, auto_rule.canary_percent):
                self.state.set("autonomous_canary_skipped", True)
                return
        incident_class = self.autonomous_engine.classify(
            guardian_posture=decision.posture,
            guardian_signals=[{"key": s.key, "severity": s.severity, "reason": s.reason} for s in decision.signals],
            snapshot=health_endpoint if isinstance(health_endpoint, dict) else {},
        )
        auto_response = self.autonomous_engine.decide(incident_class)
        auto_updates = self.autonomous_engine.apply_response_to_state(snapshot, auto_response)
        if auto_rule.dry_run_only:
            auto_updates = {**auto_updates, "autonomous_dry_run_only": True}
        for key, value in auto_updates.items():
            self.state.set(key, value)
        self.metrics.gauge("autonomous_retry_exhausted", 1.0 if auto_response.retry_exhausted else 0.0)
        if auto_response.retry_exhausted:
            self.metrics.incr("autonomous_retry_exhausted_count", 1.0)
        if auto_response.action == "quarantine_model":
            self.quarantine_registry.quarantine_model("meta_label", auto_response.reason)
        if auto_response.action == "quarantine_symbol":
            self.quarantine_registry.quarantine_symbol("GLOBAL", auto_response.reason)
        if auto_rule.rollback_on_guardian_posture and decision.posture in {"pause", "emergency_stop"}:
            self.rollout_registry["runtime_autonomous_incident_engine"] = auto_rule.__class__(**{
                **vars(auto_rule),
                "enabled": False,
            })
            self.state.set("autonomous_rollout_rollback_reason", f"guardian_posture_{decision.posture}")
        if auto_rule.rollback_on_reconcile_drift and int(health_endpoint.get("reconciliation_drift_count", 0) or 0) > 0:
            self.state.set("autonomous_rollout_rollback_reason", "reconcile_drift")
        if auto_rule.rollback_on_accounting_unknown and int(health_endpoint.get("accounting_incident_count", 0) or 0) > 0:
            self.state.set("autonomous_rollout_rollback_reason", "accounting_unknown")

    async def _safe_task(self, name, coro_func, restart_delay=5):
        """Her gorevi guvenli calistir"""
        fail_count = 0
        while self.running:
            try:
                await coro_func()
                break
            except asyncio.CancelledError:
                break
            except Exception as e:
                fail_count += 1
                logger.error(f"[{name}] HATA #{fail_count}: {type(e).__name__}: {e}")
                if fail_count <= 3:
                    logger.error(f"[{name}] TRACEBACK:\n{traceback.format_exc()}")
                try:
                    if fail_count <= 5:
                        await self.telegram.notify_error(
                            f"[{name}] #{fail_count}: {type(e).__name__}: {e}"
                        )
                except:
                    pass
                wait = min(restart_delay * min(fail_count, 10), 120)
                await asyncio.sleep(wait)

    def _final_engine_runtime_required(self) -> bool:
        return all((
            bool(getattr(config, "FINAL_PRODUCTION_ENGINE_ENABLED", False)),
            bool(getattr(config, "V3_EVALUATION_RUNTIME_ENABLED", False)),
            bool(getattr(config, "LIVE_CANARY_ENABLED", False)),
            bool(getattr(config, "V3_APPROVED_CANDIDATE_EXECUTION_ENABLED", False)),
            str(getattr(config, "TRADING_MODE", "")).upper() == "LIVE_CANARY",
        ))

    def _final_engine_not_started_reasons(self) -> list[str]:
        reasons = []
        if not bool(getattr(config, "FINAL_PRODUCTION_ENGINE_ENABLED", False)):
            reasons.append("final_production_engine_disabled")
        if not bool(getattr(config, "V3_EVALUATION_RUNTIME_ENABLED", False)):
            reasons.append("v3_evaluation_runtime_disabled")
        if str(getattr(config, "TRADING_MODE", "")).upper() != "LIVE_CANARY":
            reasons.append("trading_mode_not_live_canary")
        if not bool(getattr(config, "LIVE_CANARY_ENABLED", False)):
            reasons.append("live_canary_disabled")
        if not bool(getattr(config, "V3_APPROVED_CANDIDATE_EXECUTION_ENABLED", False)):
            reasons.append("approved_candidate_execution_disabled")
        return reasons

    async def start(self):
        """Botu baslat"""
        logger.info("=" * 60)
        logger.info(f"  ╔══════════════════════════════════════╗")
        logger.info(f"  ║  METEHAN BOT v{BOT_VERSION} - CURRENT PRODUCTION    ║")
        logger.info(f"  ╚══════════════════════════════════════╝")
        logger.info("  Kaldıraç: otomatik, skora göre 5x / 15x / 25x hedef; canlı üst sınır config ile belirlenir")
        logger.info(f"  WHITELIST: {len(config.WHITELIST)} coin")
        logger.info(f"  ━━━━━━ BRAIN MODULES ━━━━━━")
        logger.info(f"  Hyper-Cortex: {'AKTIF' if config.HYPER_CORTEX_ENABLED else 'PASIF'}")
        logger.info(f"  Adaptif Pozisyonlama: {'AKTIF' if config.KELLY_ENABLED else 'PASIF'} (default: {config.KELLY_FRACTIONAL_DEFAULT}×)")
        logger.info(f"  Climax Detector: {'AKTIF' if config.CLIMAX_DETECTION_ENABLED else 'PASIF'}")
        logger.info(f"  Parabolic Trailing: {'AKTIF' if config.PARABOLIC_TRAILING_ENABLED else 'PASIF'}")
        logger.info(f"  Autopoiesis: {'AKTIF' if config.AUTOPOIESIS_ENABLED else 'PASIF'}")
        logger.info(f"  Sabit kâr alma: {'AKTIF' if config.USE_FIXED_TP else 'PASIF (Climax/Parabolic yönetir)'}")
        logger.info(f"  ━━━━━━ ADAPTIVE INTELLIGENCE ━━━━━━")
        logger.info(f"  Sentience Bridge: {'AKTIF' if config.SENTIENCE_ENABLED else 'PASIF'}")
        logger.info(f"  Fear & Greed: {'AKTIF' if config.FEAR_GREED_ENABLED else 'PASIF'}")
        logger.info(f"  RSS Sentiment: {'AKTIF' if config.RSS_SENTIMENT_ENABLED else 'PASIF'}")
        logger.info(f"  HV24 Guard: {'AKTIF' if config.HV24_ENABLED else 'PASIF'}")
        logger.info(f"  Öğrenme Döngüsü: {'AKTIF' if config.SELF_LEARNING_ENABLED else 'PASIF'} ({config.SELF_LEARNING_INTERVAL_HOURS}h)")
        logger.info(f"  ━━━━━━ RISK PARAMS ━━━━━━")
        logger.info(f"  Zarar Kes: %{config.SWING_SL_PERCENT} | İz Süren Koruma: %{config.TRAILING_STOP_ACTIVATION} akt")
        logger.info(f"  Adaptif Boyut Üst Sınırı: %{config.KELLY_MAX_POSITION_PCT} per trade | Güven: {config.KELLY_CONFIDENCE_THRESHOLD}%")
        logger.info(f"  Black Swan Auto-Liquidate: {'ON' if config.BLACK_SWAN_AUTO_LIQUIDATE else 'OFF'}")
        logger.info(f"  Cortex Override: {'ON' if config.CORTEX_OVERRIDE_ENABLED else 'OFF'}")
        logger.info(f"  Dynamic Risk: %{config.MAX_RISK_PER_TRADE} → Tier1/2")
        logger.info(f"  Hard Filters: ADX>{config.MIN_ADX_FOR_ENTRY} | HTF EMA200: {'ON' if config.HTF_EMA200_FILTER else 'OFF'}")
        logger.info(f"  7/24 Aktif | Current production safeguards")
        logger.info("=" * 60)
        rt.log_runtime_telemetry(
            logger,
            rt.RUNTIME_MODE,
            runtime_mode="live_futures",
            bot_version=BOT_VERSION,
            paper_runtime_enabled=_is_paper_futures_runtime_enabled(),
            paper_runtime_disabled=not _is_paper_futures_runtime_enabled(),
            futures_loop_configured=True,
            live_expectancy_gate_enabled=bool(getattr(config, "LIVE_EXPECTANCY_GATE_ENABLED", True)),
        )

        await self._init_exchange()
        await self._init_balance()
        await self._init_sync()
        await self._init_telegram()

        self.running = True
        self.state.set("bot_start_time", time.time())
        logger.info("Tum donguler baslatiyor...")

        try:
            task_specs = [
                ("POZISYON", self._position_monitor_loop, 5),
                ("RAPOR", self._report_loop, 30),
                ("WATCHDOG", self._watchdog_loop, 10),
                ("ZAMAN", self._time_sync_loop, 30),
                ("KEEPALIVE", self._keepalive_loop, 5),
                ("ACCOUNT_SNAPSHOT", self._account_snapshot_refresh_loop, 5),
                ("AUTOPOIESIS", self._autopoiesis_loop, 60),
                ("SELF_LEARNING", self._self_learning_loop, 60),
            ]

            legacy_entry_armed = bool(
                getattr(config, "V3_LEGACY_AUTO_ENTRY_ENABLED", False)
                and str(getattr(config, "TRADING_MODE", "OFF")).upper() == "LIVE_CANARY"
                and getattr(config, "LIVE_CANARY_ENABLED", False)
            )
            if legacy_entry_armed:
                task_specs.insert(0, ("FUTURES", self._main_loop, 10))
                task_specs.insert(2, ("SPOT", self._spot_trading_loop, 15))
                logger.critical(
                    "V3_RUNTIME_ENTRY_LOCK legacy_entry_loops_enabled=True mode=%s",
                    getattr(config, "TRADING_MODE", "UNKNOWN"),
                )
            else:
                logger.warning(
                    "V3_RUNTIME_ENTRY_LOCK active=True mode=%s legacy_futures_loop_disabled=True spot_loop_disabled=True",
                    getattr(config, "TRADING_MODE", "UNKNOWN"),
                )
            if bool(getattr(config, "V3_EVALUATION_RUNTIME_ENABLED", True)) or self._final_engine_runtime_required():
                task_specs.append(("V3_EVALUATION", self._v3_evaluation_loop, 30))
                live_order_submission = "enabled_if_all_gates_allow" if self._v3_live_canary_mode_armed() else "disabled"
                logger.warning(
                    "V3_EVALUATION_RUNTIME active=True mode=%s live_order_submission=%s",
                    getattr(config, "TRADING_MODE", "UNKNOWN"),
                    live_order_submission,
                )
            else:
                reasons = self._final_engine_not_started_reasons()
                write_engine_not_started_status(reasons or ["v3_evaluation_runtime_not_configured"])
                logger.warning("FINAL_ENGINE_NOT_STARTED reasons=%s", reasons)
            if _is_paper_futures_runtime_enabled() and self.paper_runtime is not None:
                task_specs.append(("PAPER_FUTURES", self._paper_futures_loop, 5))
            self._runtime_tasks = [
                asyncio.create_task(self._safe_task(name, fn, delay), name=f"runtime_{name}")
                for name, fn, delay in task_specs
            ]
            results = await asyncio.gather(*self._runtime_tasks, return_exceptions=True)
            task_names = [name for name, _, _ in task_specs]
            for name, result in zip(task_names, results):
                if isinstance(result, Exception):
                    logger.error(f"[{name}] gather sonucu: HATA: {result}")
                else:
                    logger.info(f"[{name}] gather sonucu: Normal cikis")
        except Exception as e:
            logger.error(f"asyncio.gather COKTU: {type(e).__name__}: {e}")
            logger.error(traceback.format_exc())
        finally:
            self._runtime_tasks = []

    async def _cancel_runtime_tasks(self, timeout_seconds: float = 8.0):
        tasks = [t for t in self._runtime_tasks if not t.done()]
        if not tasks:
            return
        for task in tasks:
            task.cancel()
        done, pending = await asyncio.wait(tasks, timeout=timeout_seconds)
        for task in done:
            try:
                task.result()
            except asyncio.CancelledError:
                pass
            except Exception as err:
                logger.warning("Runtime task cancelled with exception: %s", err)
        if pending:
            logger.warning("Shutdown timeout with %s pending task(s)", len(pending))
            for task in pending:
                logger.warning("Pending runtime task during shutdown: %s", task.get_name())
            done2, pending2 = await asyncio.wait(pending, timeout=2.0)
            for task in done2:
                try:
                    task.result()
                except asyncio.CancelledError:
                    pass
                except Exception as err:
                    logger.warning("Runtime task terminated with exception: %s", err)
            if pending2:
                logger.error("Forced shutdown still has %s pending runtime task(s)", len(pending2))

    def _compute_manual_buy_readiness(self, *, snapshot: dict, exchange_session_health: bool) -> tuple[bool, str]:
        if not bool(snapshot.get("is_verified_current", False)):
            if bool(snapshot.get("stale", True)):
                return False, "stale_snapshot_hard"
            return False, "snapshot_not_verified"
        if bool(snapshot.get("stale", True)):
            return False, "stale_snapshot_hard"
        if not exchange_session_health:
            return False, "exchange_unreachable"
        entry_authority = evaluate_entry_authority(
            self.state,
            kill_switch_active=bool(self.risk.global_stop_active),
        )
        if not entry_authority.allowed:
            return False, str(entry_authority.reason or "guardian_block")
        return True, "none"

    def _record_guardian_transition(self, *, posture_before: str, posture_after: str, authority_before: str, authority_after: str, signals: list[dict]) -> None:
        now_iso = datetime.now(timezone.utc).isoformat()
        transition_reason_code = str(signals[0].get("key")) if signals else "healthy_clear"
        transition_source_signal = str(signals[0].get("reason")) if signals else "no_active_guardian_signal"
        if posture_before != posture_after:
            self.state.set("guardian_posture_changed_at", now_iso)
        if authority_before != authority_after:
            self.state.set("trade_authority_changed_at", now_iso)
        self.state.set(
            "last_guardian_transition",
            {
                "previous_posture": posture_before,
                "new_posture": posture_after,
                "previous_trade_authority": authority_before,
                "new_trade_authority": authority_after,
                "transition_reason_code": transition_reason_code,
                "source_signal": transition_source_signal,
                "timestamp": now_iso,
            },
        )
        self.state.set("posture_transition_reason", transition_reason_code)
        self.state.set("current_runtime_state_source", "runtime_guardian")
        self.state.set("current_runtime_state_at", now_iso)

    async def _keepalive_loop(self):
        """Bot'u hayatta tutan dongu"""
        logger.info("Keepalive dongusu basladi")
        while self.running:
            await asyncio.sleep(60)
            pos_count = len(self.state.get_positions())
            spot_count = len(self.state.get_spot_positions())
            cooldown = "SOGUMA" if self.strategy.is_in_cooldown() else "AKTIF"
            eq_mode = self.risk._current_equity_mode
            exp = self.risk._cached_expectancy
            ror = self.risk._cached_ror
            account_snapshot = self.account_snapshot.cached_snapshot()
            source_status = account_snapshot.get("source_status", "unknown")
            age_seconds = account_snapshot.get("age_seconds")
            stale = bool(account_snapshot.get("stale", True))
            authority = account_snapshot.get("authority", "unknown")
            reason_code = account_snapshot.get("reason_code", "unknown")
            freshness_seconds = account_snapshot.get("freshness_seconds")
            last_exchange_sync_at = account_snapshot.get("last_exchange_sync_at") or "n/a"
            last_successful_refresh_at = self.state.get("last_successful_refresh_at") or "n/a"
            posture = str(self.state.get("guardian_posture", "unknown") or "unknown")
            stale_action = str(getattr(config, "ACCOUNT_STALE_ELEVATED_ACTION", "reduce_only"))
            exchange_session_health = self.exchange.is_session_healthy()
            manual_buy_ready, manual_buy_block_reason = self._compute_manual_buy_readiness(
                snapshot=account_snapshot,
                exchange_session_health=exchange_session_health,
            )
            self.state.set("manual_buy_ready", manual_buy_ready)
            self.state.set("manual_buy_block_reason", manual_buy_block_reason)
            self.state.set("last_manual_block_reason", manual_buy_block_reason if not manual_buy_ready else "none")
            if stale:
                if self._stale_since_at is None:
                    self._stale_since_at = datetime.now(timezone.utc).isoformat()
                stale_for_seconds = self._seconds_since(self._stale_since_at)
                if stale_for_seconds is not None and stale_for_seconds > 180:
                    logger.warning(
                        "account_snapshot_stale_elevated stale_for=%.0fs authority=%s reason=%s action=%s posture=%s",
                        stale_for_seconds,
                        authority,
                        reason_code,
                        stale_action,
                        posture,
                    )
                elif stale_for_seconds is not None and stale_for_seconds > 60:
                    logger.warning(
                        "account_snapshot_stale_warning stale_for=%.0fs authority=%s reason=%s posture=%s",
                        stale_for_seconds,
                        authority,
                        reason_code,
                        posture,
                    )
            else:
                self._stale_since_at = None

            # Cortex status
            cortex_info = ""
            if config.HYPER_CORTEX_ENABLED:
                cs = self.cortex.get_latest_signal()
                cortex_info = f" Cortex:S={cs.sentiment_score:.0f}/C={cs.confidence:.0f}%"

            # Autopoiesis status
            auto_info = ""
            if config.AUTOPOIESIS_ENABLED:
                auto_status = self.autopoiesis.get_status()
                auto_info = f" Gen:{auto_status['generation']}"

            # Sentience status
            sentience_info = ""
            if config.SENTIENCE_ENABLED:
                ss = self.sentience.get_status()
                sentience_info = (
                    f" GRM:{ss['global_risk_mult']:.2f}"
                    f" F&G:{ss['fear_greed_value']}"
                    f" RSS:{ss['rss_score']:.1f}"
                )
                if ss['hv24_paused']:
                    sentience_info += " HV24:PAUSE"

            logger.info(
                f"{'⚠️ STALE/DEGRADED' if stale else '✅ VERIFIED'} | ♥ Heartbeat | F:{pos_count} S:{spot_count} | {cooldown} | "
                f"Mode:{eq_mode} Exp:{exp:.2f}R RoR:{ror:.0%}"
                f" | account={source_status} authority={authority} reason={reason_code}"
                f" stale={stale} freshness={freshness_seconds if freshness_seconds is not None else 'n/a'}s"
                f" age={age_seconds if age_seconds is not None else 'n/a'}s"
                f" received={account_snapshot.get('received_at') or 'n/a'}"
                f" last_exchange_sync_at={last_exchange_sync_at}"
                f" last_successful_refresh_at={last_successful_refresh_at} posture={posture}"
                f" manual_buy_ready={manual_buy_ready}"
                f" manual_buy_block_reason={manual_buy_block_reason}"
                f" exchange_session_health={exchange_session_health}"
                f"{cortex_info}{auto_info}{sentience_info}"
            )
            self._record_loop_success("keepalive_loop")

    async def _account_snapshot_refresh_loop(self):
        """Trading loop'ları dursa da account authority güncel kalsın."""
        interval = max(5, int(getattr(config, "ACCOUNT_SNAPSHOT_REFRESH_INTERVAL_SECONDS", 15)))
        logger.info("Account snapshot refresh loop basladi (interval=%ss)", interval)
        while self.running:
            try:
                refreshed = await self.account_snapshot.refresh(reason="background_refresh")
                if refreshed.get("is_verified_current") and refreshed.get("authority") not in {"verified_exchange", "reconciled_exchange"}:
                    raise RuntimeError("successful_api_call_but_stale_authority_remains")
                logger.info(
                    "account_snapshot_refresh_cycle authority=%s source_status=%s reason=%s stale=%s received=%s last_exchange_sync_at=%s",
                    refreshed.get("authority"),
                    refreshed.get("source_status"),
                    refreshed.get("reason_code"),
                    refreshed.get("stale"),
                    refreshed.get("received_at"),
                    refreshed.get("last_exchange_sync_at"),
                )
                self._record_loop_success("account_snapshot_refresh_loop")
            except Exception as e:
                logger.warning("Background account snapshot refresh failed: %s", e)
            await asyncio.sleep(interval)

    # ======= INIT =======

    async def _init_exchange(self):
        for attempt in range(5):
            try:
                success = await self.exchange.initialize()
                if success:
                    logger.info("Binance baglantisi BASARILI")
                    return
                logger.warning(f"Binance denemesi {attempt+1}/5 basarisiz")
            except Exception as e:
                logger.error(f"Exchange init hata {attempt+1}: {e}")
            await asyncio.sleep(10)
        logger.error("Exchange baglantisi kurulamadi")

    async def _init_balance(self):
        try:
            snapshot = await self.account_snapshot.refresh(reason="startup_init")
            if snapshot.get("is_verified_current"):
                balance_total = float(snapshot.get("current_verified_equity", 0.0) or 0.0)
                if self.state.get("start_balance", 0) == 0:
                    self.state.set("start_balance", balance_total)
                if self.state.get("peak_balance", 0) == 0:
                    self.state.set("peak_balance", balance_total)
                self.risk.daily_start_balance = balance_total
                self.state.check_weekly_reset(balance_total)
                eq_mode, _ = self.risk.get_equity_mode(balance_total)

                # Bakiye belli olunca profil belirle
                self.profile_mgr.refresh(balance_total)
                peak = self.state.get("peak_balance", balance_total)
                dd_pct = ((peak - balance_total) / peak * 100) if peak > 0 else 0
                self.profile_mgr.update_equity_mode_from_drawdown(dd_pct)

                logger.info(
                    f"Equity mode: {eq_mode} | "
                    f"Profil: {self.profile_mgr.name.upper()} "
                    f"Tier:{self.profile_mgr.tier} "
                    f"Risk:{self.profile_mgr.risk_pct():.2f}%"
                )
                logger.info(f"Futures equity verified: {balance_total:.2f} USDT (kaldirac: {config.DEFAULT_LEVERAGE}x)")
            else:
                logger.warning(
                    "Startup account snapshot stale/unverified: status=%s age=%s",
                    snapshot.get("source_status"),
                    snapshot.get("age_seconds"),
                )
        except Exception as e:
            logger.error(f"Bakiye hatasi: {e}")
        try:
            spot = await self.exchange.get_spot_balance()
            logger.info(f"Spot USDT: {spot['free']:.2f} USDT")
        except Exception as e:
            logger.error(f"Spot bakiye hatasi: {e}")

    async def _init_sync(self):
        try:
            await self.pm.sync_with_exchange()
            await self.account_snapshot.refresh(reason="post_sync_init")
            self._record_runtime_probe("last_sync_success_at")
            state_pos = self.state.get_positions()
            if state_pos:
                logger.info(f"POZISYONLAR: {list(state_pos.keys())}")
            else:
                logger.info("Acik pozisyon yok")
        except Exception as e:
            logger.error(f"Senkronizasyon hatasi: {e}")

    async def _init_telegram(self):
        try:
            await self.telegram.initialize()
            self._telegram_started = True
            logger.info("Telegram BASARILI")
        except Exception as e:
            logger.error(f"Telegram baslama hatasi: {e}")
            self._telegram_started = False

    # ======= ANA DONGULER =======


    def _configure_paper_futures_runtime(self) -> None:
        if not hasattr(self, "_paper_runtime_disabled_logged"):
            self._paper_runtime_disabled_logged = False
        self.paper_engine = None
        self.paper_runtime = None
        if _is_paper_futures_runtime_enabled():
            self.paper_engine = PaperTradingEngine(
                taker_fee_rate=getattr(config, "PAPER_TAKER_FEE_RATE", 0.0004),
                slippage_rate=getattr(config, "PAPER_SLIPPAGE_RATE", 0.0006),
                spread_rate=getattr(config, "PAPER_SPREAD_RATE", 0.0002),
                journal_path=getattr(config, "PAPER_TRADING_JOURNAL_PATH", "data/expectancy/paper_trades.jsonl"),
                positions_path=getattr(config, "PAPER_FUTURES_POSITIONS_PATH", "data/expectancy/paper_positions.json"),
                persist_entries=getattr(config, "PAPER_FUTURES_PERSIST_ENTRIES", True),
                persist_positions=getattr(config, "PAPER_FUTURES_PERSIST_OPEN_POSITIONS", True),
            )
            self.paper_runtime = PaperFuturesRuntime(
                strategy=self.strategy,
                engine=self.paper_engine,
                price_provider=self._paper_price_provider,
                gate=LiveExpectancyGate(
                    getattr(config, "LIVE_EXPECTANCY_REPORT_PATH", "data/expectancy/latest_gate_report.json"),
                    min_net_pnl=getattr(config, "LIVE_EXPECTANCY_MIN_NET_PNL", 0),
                    min_profit_factor=getattr(config, "LIVE_EXPECTANCY_MIN_PROFIT_FACTOR", 1.2),
                    min_trades=getattr(config, "LIVE_EXPECTANCY_MIN_TRADES", 100),
                    max_report_age_hours=getattr(config, "LIVE_EXPECTANCY_MAX_REPORT_AGE_HOURS", 30),
                    max_drawdown=getattr(config, "LIVE_EXPECTANCY_MAX_DRAWDOWN", None),
                    enforce=getattr(config, "LIVE_EXPECTANCY_GATE_ENABLED", True),
                ),
                summary_sender=self.telegram.send_message,
                config=PaperRuntimeConfig(
                    scan_interval_seconds=getattr(config, "PAPER_FUTURES_SCAN_INTERVAL_SECONDS", 20),
                    summary_interval_seconds=getattr(config, "PAPER_FUTURES_SUMMARY_INTERVAL_SECONDS", 3600),
                    max_opportunities=getattr(config, "PAPER_FUTURES_MAX_OPPORTUNITIES", 10),
                    default_quantity=getattr(config, "PAPER_FUTURES_DEFAULT_QUANTITY", 0.01),
                    min_net_profit_usdt=getattr(config, "PAPER_FUTURES_MIN_NET_PROFIT_USDT", 0.01),
                    min_net_r=getattr(config, "PAPER_FUTURES_MIN_NET_R", 0.0),
                    stop_loss_pct=getattr(config, "PAPER_FUTURES_STOP_LOSS_PCT", 0.004),
                    take_profit_pct=getattr(config, "PAPER_FUTURES_TAKE_PROFIT_PCT", 0.006),
                    max_holding_seconds=getattr(config, "PAPER_FUTURES_MAX_HOLDING_SECONDS", 900),
                    cost_margin=getattr(config, "ENTRY_QUALITY_EXPECTED_MOVE_COST_MULT", getattr(config, "PAPER_FUTURES_COST_MARGIN", 3.0)),
                    mae_early_exit_enabled=getattr(config, "MAE_EARLY_EXIT_ENABLED", True),
                    mae_early_exit_threshold_r=getattr(config, "MAE_EARLY_EXIT_THRESHOLD_R", 0.85),
                    funding_rate_per_8h=getattr(config, "PAPER_FUTURES_FUNDING_RATE_PER_8H", 0.0001),
                    negative_symbols=tuple(getattr(config, "NEGATIVE_EXPECTANCY_SYMBOL_DENYLIST", ())),
                    min_entry_rr=getattr(config, "ENTRY_QUALITY_MIN_RR", 1.5),
                    min_net_move_pct=getattr(config, "ENTRY_QUALITY_MIN_NET_MOVE_PCT", 0.002),
                    require_price=getattr(config, "PAPER_FUTURES_REQUIRE_PRICE", True),
                    shadow_fallback_enabled=getattr(config, "PAPER_FUTURES_SHADOW_FALLBACK_ENABLED", False),
                    shadow_candidate_symbols=tuple(getattr(config, "PAPER_FUTURES_SHADOW_CANDIDATE_SYMBOLS", getattr(config, "WHITELIST", ()))),
                    status_path=getattr(config, "PAPER_FUTURES_STATUS_PATH", "data/expectancy/paper_runtime_status.json"),
                ),
                state=self.state,
            )
        else:
            self._log_paper_futures_runtime_disabled_once()

    async def _paper_price_provider(self, symbol: str):
        """WS/cache-first price provider for paper futures; REST is only fallback."""
        try:
            price = await self.exchange.get_ticker_price(symbol, futures=True)
            return {"price": price, "source": "rest_fallback", "staleness_ms": None}
        except Exception as exc:
            logger.warning("Paper price provider failed for %s: %s", symbol, exc)
            return {"price": None, "source": "unavailable", "reason": f"{type(exc).__name__}:{exc}"}

    def _log_paper_futures_runtime_disabled_once(self) -> None:
        if getattr(self, "_paper_runtime_disabled_logged", False):
            return
        self._paper_runtime_disabled_logged = True
        env_value = str(getattr(config, "PAPER_FUTURES_RUNTIME_ENABLED", False)).lower()
        logger.info("paper_futures_runtime_disabled env PAPER_FUTURES_RUNTIME_ENABLED=%s", env_value)
        rt.log_runtime_telemetry(
            logger,
            rt.PAPER_RUNTIME_DISABLED,
            env_flag="PAPER_FUTURES_RUNTIME_ENABLED",
            env_value=env_value,
            paper_runtime_disabled=True,
            live_order_submission="unchanged",
        )

    def _v3_live_canary_mode_armed(self) -> bool:
        return (
            str(getattr(config, "TRADING_MODE", "OFF") or "OFF").upper() == "LIVE_CANARY"
            and bool(getattr(config, "LIVE_CANARY_ENABLED", False))
            and bool(getattr(config, "V3_APPROVED_CANDIDATE_EXECUTION_ENABLED", False))
        )

    async def _build_v3_live_canary_account_state(self) -> dict:
        """Fetch exchange-authoritative canary exposure state; fail closed on any unavailable leg."""
        account = {
            "available": False,
            "flat": False,
            "positions_count": 0,
            "open_positions_count": 0,
            "open_orders_count": 0,
            "normal_open_orders_count": 0,
            "algo_open_orders_count": 0,
            "reason": "not_loaded",
        }
        try:
            snapshot = await self.account_snapshot.refresh(reason="v3_live_canary_preflight")
            verified = bool(snapshot.get("is_verified_current")) and not bool(snapshot.get("stale", True))
            if not verified:
                account.update(
                    {
                        "reason": "account_snapshot_unverified",
                        "snapshot_authority": snapshot.get("authority"),
                        "snapshot_source_status": snapshot.get("source_status"),
                        "snapshot_stale": bool(snapshot.get("stale", True)),
                    }
                )
                return account

            positions = await self.exchange.get_futures_positions()
            if positions is None:
                account.update({"reason": "positions_unavailable", "available": False})
                return account

            normal_open_orders = await self.exchange._safe_request("futures_get_open_orders", weight=1)
            if normal_open_orders is None:
                account.update({"reason": "normal_open_orders_unavailable", "available": False})
                return account

            algo_open_orders = await self.exchange.get_open_algo_orders()
            if algo_open_orders is None:
                account.update({"reason": "algo_open_orders_unavailable", "available": False})
                return account

            positions_count = len(positions or [])
            normal_open_orders_count = len(normal_open_orders or [])
            algo_open_orders_count = len(algo_open_orders or [])
            account.update(
                {
                    "available": True,
                    "flat": positions_count == 0 and normal_open_orders_count == 0 and algo_open_orders_count == 0,
                    "positions_count": positions_count,
                    "open_positions_count": positions_count,
                    "open_orders_count": normal_open_orders_count,
                    "normal_open_orders_count": normal_open_orders_count,
                    "algo_open_orders_count": algo_open_orders_count,
                    "snapshot_at": snapshot.get("received_at") or snapshot.get("snapshot_time"),
                    "snapshot_authority": snapshot.get("authority"),
                    "snapshot_source_status": snapshot.get("source_status"),
                    "reason": "exchange_verified",
                }
            )
            return account
        except Exception as exc:
            logger.warning("V3_EVALUATION account preflight unavailable: %s: %s", type(exc).__name__, exc)
            account.update({"reason": f"account_preflight_exception:{type(exc).__name__}"})
            return account

    def _build_v3_kill_switch_state(self) -> dict:
        active = bool(self.risk.global_stop_active or self.state.get("kill_switch_active", False))
        reasons = []
        if bool(self.risk.global_stop_active):
            reasons.append("risk_global_stop_active")
        if bool(self.state.get("kill_switch_active", False)):
            reasons.append("runtime_guardian_kill_switch_active")
        return {"active": active, "reasons": reasons, "allow_reduce_only_exit": True}

    def _evaluate_v3_live_gate_status(self) -> bool:
        decision = LiveExpectancyGate(
            getattr(config, "LIVE_EXPECTANCY_REPORT_PATH", "data/expectancy/latest_gate_report.json"),
            min_net_pnl=getattr(config, "LIVE_EXPECTANCY_MIN_NET_PNL", 0),
            min_profit_factor=getattr(config, "LIVE_EXPECTANCY_MIN_PROFIT_FACTOR", 1.2),
            min_trades=getattr(config, "LIVE_EXPECTANCY_MIN_TRADES", 100),
            max_report_age_hours=getattr(config, "LIVE_EXPECTANCY_MAX_REPORT_AGE_HOURS", 30),
            max_drawdown=getattr(config, "LIVE_EXPECTANCY_MAX_DRAWDOWN", None),
            enforce=getattr(config, "LIVE_EXPECTANCY_GATE_ENABLED", True),
        ).evaluate()
        self.state.set("v3_evaluation_last_live_gate", {"allowed": decision.allowed, "reasons": list(decision.reasons), "report_path": decision.report_path})
        return bool(decision.allowed)

    def _evaluate_v3_risk_expectancy_status(self) -> bool:
        """Evaluate risk expectancy from the bounded report first; fail closed on stale/missing data."""
        report_path = Path(getattr(config, "RISK_EXPECTANCY_REPORT_PATH", "data/expectancy/risk_expectancy_report.json"))
        if not report_path.is_absolute():
            report_path = Path.cwd() / report_path

        max_age_hours = float(
            getattr(
                config,
                "RISK_EXPECTANCY_MAX_REPORT_AGE_HOURS",
                getattr(config, "LIVE_EXPECTANCY_MAX_REPORT_AGE_HOURS", 72),
            )
            or 72
        )

        try:
            data = json.loads(report_path.read_text(encoding="utf-8"))
            generated_at = data.get("generated_at")
            age_hours = None

            if generated_at:
                parsed = datetime.fromisoformat(str(generated_at).replace("Z", "+00:00"))
                if parsed.tzinfo is None:
                    parsed = parsed.replace(tzinfo=timezone.utc)
                age_hours = (datetime.now(timezone.utc) - parsed).total_seconds() / 3600.0

            risk = data.get("risk") if isinstance(data.get("risk"), dict) else {}
            permission = data.get("live_permission") if isinstance(data.get("live_permission"), dict) else {}

            state = str(risk.get("state") or permission.get("risk_state") or "unknown")
            risk_pause_active = bool(risk.get("risk_pause_active", permission.get("risk_pause_active", True)))
            trade_count = int(risk.get("trade_count", 0) or 0)
            blockers = list(permission.get("blockers") or [])
            report_stale = age_hours is None or age_hours > max_age_hours

            if report_stale:
                blockers.append("risk_expectancy_report_stale")

            allowed = (
                bool(permission.get("allowed"))
                and state == RISK_STATE_POSITIVE
                and not risk_pause_active
                and not report_stale
            )

            self.state.set(
                "v3_evaluation_last_risk_expectancy",
                {
                    "state": state,
                    "risk_pause_active": risk_pause_active,
                    "trade_count": trade_count,
                    "source": "risk_expectancy_report",
                    "report_path": str(report_path),
                    "report_age_hours": age_hours,
                    "report_stale": report_stale,
                    "permission_allowed": bool(permission.get("allowed")),
                    "permission_blockers": blockers,
                    "recommendation": data.get("recommendation"),
                },
            )
            return bool(allowed)

        except Exception as exc:
            logger.warning(
                "V3_EVALUATION risk expectancy report unavailable, falling back to state: %s: %s",
                type(exc).__name__,
                exc,
            )
            report = evaluate_risk_expectancy(self.state)
            self.state.set(
                "v3_evaluation_last_risk_expectancy",
                {
                    "state": report.state,
                    "risk_pause_active": report.risk_pause_active,
                    "trade_count": report.trade_count,
                    "source": "state_fallback",
                    "fallback_reason": f"{type(exc).__name__}:{exc}",
                },
            )
            return bool(report.state == RISK_STATE_POSITIVE and not report.risk_pause_active and not report.uses_stale_data)



    async def _professional_v3_refresh_candidate_before_evaluation(self) -> None:
        """Refresh strict momentum candidate immediately before V3 evaluation.

        This does not submit orders. It only keeps the approved candidate/evidence fresh
        so the controlled canary router does not reject with
        candidate_unavailable_no_fresh_approved_candidate.
        """
        try:
            import asyncio as _asyncio
            import json as _json
            import os as _os
            import sys as _sys

            enabled = str(
                _os.environ.get(
                    "PROFESSIONAL_V3_ACTIVE_EDGE_ENABLED",
                    str(getattr(config, "PROFESSIONAL_V3_ACTIVE_EDGE_ENABLED", False)),
                )
            ).strip().lower() in {"1", "true", "yes", "on"}

            if not enabled:
                return

            cmd = [
                _sys.executable,
                "scripts/professional_v3_emit_public_strict_momentum_candidate.py",
                "--notional",
                str(_os.environ.get("PROFESSIONAL_V3_MIN_NOTIONAL_USDT", "10")),
                "--timeframe",
                "1h",
                "--max-workers",
                str(_os.environ.get("PROFESSIONAL_V3_EMITTER_WORKERS", "16")),
                "--write",
            ]

            env = dict(_os.environ)
            env["PYTHONPATH"] = "."

            proc = await _asyncio.create_subprocess_exec(
                *cmd,
                cwd=str(getattr(self, "project_root", None) or "."),
                env=env,
                stdout=_asyncio.subprocess.PIPE,
                stderr=_asyncio.subprocess.PIPE,
            )

            try:
                stdout, stderr = await _asyncio.wait_for(proc.communicate(), timeout=45)
            except _asyncio.TimeoutError:
                try:
                    proc.kill()
                except Exception:
                    pass
                logger.warning("professional_v3_candidate_refresh timeout_before_v3_evaluation")
                return

            out = stdout.decode("utf-8", "replace").strip()
            err = stderr.decode("utf-8", "replace").strip()

            if proc.returncode != 0:
                logger.warning(
                    "professional_v3_candidate_refresh failed rc=%s stderr=%s stdout_tail=%s",
                    proc.returncode,
                    err[-300:],
                    out[-500:],
                )
                return

            payload = None
            for start in [idx for idx, ch in enumerate(out) if ch == "{"]:
                try:
                    payload = _json.loads(out[start:])
                    break
                except Exception:
                    continue

            if not isinstance(payload, dict) or payload.get("ok") is not True:
                logger.warning("professional_v3_candidate_refresh invalid_payload stdout_tail=%s", out[-800:])
                return

            selected_key = payload.get("strict_approved_candidate_key") or payload.get("candidate_key")
            strict_keys = payload.get("strict_approved_candidate_keys") or ""

            if selected_key:
                _os.environ["V3_APPROVED_CANDIDATE_KEY"] = str(selected_key)
            if strict_keys:
                _os.environ["V3_APPROVED_CANDIDATE_KEYS"] = str(strict_keys)

            logger.warning(
                "professional_v3_candidate_refresh ok candidate_key=%s scanned=%s elapsed=%s",
                selected_key,
                payload.get("scanned_symbols"),
                payload.get("elapsed_seconds"),
            )

        except Exception as exc:
            logger.exception("professional_v3_candidate_refresh exception: %s: %s", type(exc).__name__, exc)


    async def _v3_evaluation_loop(self):
        """Run Final Engine shadow/readiness telemetry and controlled live canary routing."""
        mode = getattr(config, "TRADING_MODE", "UNKNOWN")
        if self._v3_live_canary_mode_armed():
            logger.info(
                ">>> V3 evaluation dongusu AKTIF mode=%s live_order_submission=enabled_if_all_gates_allow",
                mode,
            )
        else:
            logger.info(
                ">>> V3 evaluation dongusu AKTIF mode=%s live_order_submission=disabled",
                mode,
            )
        interval = int(getattr(config, "V3_EVALUATION_INTERVAL_SECONDS", 300))
        while self.running:
            try:
                canary_armed = self._v3_live_canary_mode_armed()
                account = await self._build_v3_live_canary_account_state() if canary_armed else {"available": False, "flat": False, "open_orders_count": 0}
                kill_switch = self._build_v3_kill_switch_state() if canary_armed else {"active": True, "reasons": ["monitor_only_runtime_no_live_authority"]}
                live_gate_status = await asyncio.to_thread(self._evaluate_v3_live_gate_status) if canary_armed else False
                risk_expectancy_status = await asyncio.to_thread(self._evaluate_v3_risk_expectancy_status) if canary_armed else False
                executor = V3CanaryPositionRouter(self.pm) if canary_armed else None
                if executor is not None:
                    executor.real_executor = self.exchange  # REMEDIATION: bind TradingBot ExchangeClient to V3 router
                    try:
                        logger.warning("V123 V3 router real_executor bound to self.exchange")
                    except Exception:
                        pass

                status = await asyncio.to_thread(
                    run_final_engine_service_cycle,
                    live_gate_status=live_gate_status,
                    risk_expectancy_status=risk_expectancy_status,
                    account=account,
                    kill_switch=kill_switch,
                    executor=executor,
                    no_open=False,
                    live_gate_reasons=(self.state.get("v3_evaluation_last_live_gate", {}) or {}).get("reasons", []),
                    risk_expectancy_state=(self.state.get("v3_evaluation_last_risk_expectancy", {}) or {}).get("state"),
                    risk_expectancy_pause_active=(self.state.get("v3_evaluation_last_risk_expectancy", {}) or {}).get("risk_pause_active"),
                )
                cycle = status.get("cycle", {})
                readiness = status.get("readiness", {})
                execution = status.get("execution", {})
                self.state.set("v3_evaluation_last_candidate_key", status.get("candidate_key"))
                self.state.set("v3_evaluation_last_readiness", readiness)
                self.state.set("v3_evaluation_last_execution", execution)

                live_order_submission = "disabled"
                if canary_armed:
                    live_order_submission = "enabled_if_all_gates_allow" if execution.get("route") == "controlled_canary_router_submit" else "blocked"
                logger.info(
                    "V3_EVALUATION candidate_key=%s live_order_submission=%s reason=%s readiness_allowed=%s blockers=%s shadow_opened=%s live_orders_sent=%s submitted=%s canary_lifecycle=%s",
                    status.get("candidate_key"),
                    live_order_submission,
                    execution.get("blockers", []),
                    readiness.get("allowed"),
                    readiness.get("blockers", []),
                    cycle.get("opened_count", 0),
                    cycle.get("live_orders_sent", 0),
                    execution.get("submitted"),
                    execution.get("canary_lifecycle"),
                )
            except Exception as exc:
                logger.error("V3_EVALUATION error: %s: %s", type(exc).__name__, exc)
                logger.error("V3_EVALUATION traceback:\n%s", traceback.format_exc())
                self._record_loop_error("v3_evaluation_loop", exc)
                try:
                    write_engine_not_started_status(["engine_cycle_exception"], last_exception=f"{type(exc).__name__}: {exc}")
                except Exception:
                    logger.exception("V3_EVALUATION failed to write exception status")
            await asyncio.sleep(interval)

    async def _paper_futures_loop(self):
        """Live-market futures paper loop; never submits live orders."""
        if not _is_paper_futures_runtime_enabled() or self.paper_runtime is None:
            self._log_paper_futures_runtime_disabled_once()
            return
        logger.info(">>> Paper futures dongusu AKTIF paper_runtime_mode=paper_only live_order_submission=disabled (live gate remains independent/fail-closed)")
        await self.paper_runtime.run_forever(lambda: bool(self.running))

    async def _main_loop(self):
        """Futures trading dongusu"""
        logger.info(">>> Futures dongusu AKTIF (current production architecture)")
        rt.log_runtime_telemetry(
            logger,
            rt.FUTURES_LOOP_ACTIVE,
            futures_loop_active=True,
            runtime_mode="live_futures",
            paper_runtime_enabled=_is_paper_futures_runtime_enabled(),
            live_order_submission="enabled_if_all_gates_allow",
        )
        while self.running:
            try:
                self._record_runtime_probe("last_strategy_cycle_at")
                if self.state.get("paused", False) or not bool(self.state.get("scanning_active", True)):
                    self.state.set("scan_source_status", "scan_paused_by_guardian")
                    self.state.set("scan_reason_code", "guardian_pause")
                    self._log_runtime_blocked(stage="pre_scan", reason="guardian_pause")
                    await asyncio.sleep(5)
                    continue

                if self.strategy.is_in_cooldown():
                    self.state.set("scan_source_status", "scan_cooldown")
                    self.state.set("scan_reason_code", "cooldown")
                    self._log_runtime_blocked(stage="pre_scan", reason="cooldown")
                    await asyncio.sleep(10)
                    continue

                self.state.check_daily_reset()
                snapshot = await self.account_snapshot.refresh(reason="main_loop")
                self._log_account_flat_state(snapshot, stage="main_loop")
                verified = bool(snapshot.get("is_verified_current"))
                snapshot_age = float(snapshot.get("age_seconds", snapshot.get("freshness_seconds", 0.0)) or 0.0)
                if not verified:
                    allow_degraded = bool(getattr(config, "AUTO_TRADE_ALLOW_DEGRADED_SNAPSHOT_ENTRIES", True))
                    max_age = max(0, int(getattr(config, "AUTO_TRADE_DEGRADED_SNAPSHOT_MAX_AGE_SECONDS", 45)))
                    if not allow_degraded or snapshot_age > max_age:
                        logger.warning(
                            "Main loop skipped due to unverified account snapshot: status=%s age=%s",
                            snapshot.get("source_status"),
                            snapshot.get("age_seconds"),
                        )
                        self.state.set("scan_source_status", "scan_blocked_snapshot_unverified")
                        self.state.set("scan_reason_code", str(snapshot.get("reason_code", "snapshot_not_verified")))
                        self._log_runtime_blocked(
                            stage="pre_scan",
                            reason=str(snapshot.get("reason_code", "snapshot_not_verified")),
                            snapshot_source_status=snapshot.get("source_status"),
                            snapshot_age_seconds=snapshot.get("age_seconds"),
                        )
                        await asyncio.sleep(5)
                        continue
                    logger.warning(
                        "Main loop degraded snapshot fallback active: status=%s authority=%s reason=%s age=%.1fs",
                        snapshot.get("source_status"),
                        snapshot.get("authority"),
                        snapshot.get("reason_code"),
                        snapshot_age,
                    )
                current_equity = float(
                    snapshot.get("current_verified_equity")
                    or snapshot.get("last_verified_equity")
                    or snapshot.get("equity")
                    or 0.0
                )
                available = float(
                    snapshot.get("current_verified_available_balance")
                    or snapshot.get("available_balance")
                    or 0.0
                )
                current_unrealized = float(
                    snapshot.get("current_verified_unrealized_pnl")
                    or snapshot.get("unrealized_pnl")
                    or 0.0
                )
                self.state.check_weekly_reset(current_equity)
                self.risk.get_equity_mode(current_equity)
                self.state.record_equity_snapshot(current_equity)

                # Profil ve drawdown modu her döngüde güncelle
                peak = self.state.get("peak_balance", current_equity)
                dd_pct = ((peak - current_equity) / peak * 100) if peak > 0 else 0.0
                self.profile_mgr.refresh(current_equity)
                self.profile_mgr.update_equity_mode_from_drawdown(dd_pct)

                # Production hard safety: drawdown / hard-lock must stop autonomous entries.
                hard_block_pct = min(
                    float(getattr(config, "RISK_TOTAL_DRAWDOWN_KILL_SWITCH_PCT", 12.0) or 12.0),
                    float(getattr(config, "PORTFOLIO_DRAWDOWN_HARD_BLOCK_PCT", 10.0) or 10.0),
                )
                equity_mode = str(getattr(self.risk, "_current_equity_mode", "") or "")
                if dd_pct >= hard_block_pct or equity_mode == "hard_lock":
                    reason = (
                        f"drawdown_hard_lock dd={dd_pct:.2f}% "
                        f"limit={hard_block_pct:.2f}% equity_mode={equity_mode or 'unknown'}"
                    )
                    logger.error("AUTO_ENTRY_HARD_BLOCK %s", reason)
                    self.state.set("paused", True)
                    self.state.set("scanning_active", False)
                    self.state.set("trade_authority", "pause")
                    self.state.set("kill_switch_active", True)
                    self.state.set("manual_buy_ready", False)
                    self.state.set("manual_buy_block_reason", "drawdown_hard_lock")
                    self.state.set("last_execution_reject_reason", reason)
                    self.state.set("scan_source_status", "scan_paused_by_drawdown_hard_lock")
                    self.state.set("scan_reason_code", "drawdown_hard_lock")
                    self._log_runtime_blocked(
                        stage="pre_scan",
                        reason="drawdown_hard_lock",
                        drawdown_pct=dd_pct,
                        hard_block_pct=hard_block_pct,
                        equity_mode=equity_mode or "unknown",
                    )
                    try:
                        await self.telegram.notify_risk_warning(
                            f"Drawdown hard lock: %{dd_pct:.2f} / %{hard_block_pct:.2f}"
                        )
                    except Exception as notify_error:
                        logger.warning("Risk warning notify failed: %s", notify_error)
                    await asyncio.sleep(60)
                    continue

                # ══════════════════════════════════════════════
                # BLACK SWAN AUTO-LIQUIDATION
                # ══════════════════════════════════════════════
                if config.HYPER_CORTEX_ENABLED and config.BLACK_SWAN_AUTO_LIQUIDATE:
                    cortex_signal = self.cortex.get_latest_signal()
                    if cortex_signal.black_swan or cortex_signal.override == "LIQUIDATE":
                        positions = self.state.get_positions()
                        if positions:
                            logger.error(
                                f"⚠️ BLACK SWAN LIQUIDATION: "
                                f"{len(positions)} pozisyon kapatiliyor!"
                            )
                            results = await self.pm.close_all_positions("BLACK SWAN LIQUIDATION")
                            for symbol, trade, msg in results:
                                if trade:
                                    await self.telegram.notify_trade_close(trade)
                                    self.strategy.record_trade_result(trade.get("pnl", 0))
                            try:
                                await self.telegram.send_message(
                                    f"⚠️ *BLACK SWAN ALGILANDI*\n"
                                    f"{'━'*24}\n"
                                    f"Sentiment: {cortex_signal.sentiment_score:.0f}\n"
                                    f"F&G: {cortex_signal.fear_greed_index}\n"
                                    f"OI: {cortex_signal.oi_change_pct:.1f}%\n"
                                    f"Tüm pozisyonlar kapatıldı!\n"
                                    f"{'━'*24}"
                                )
                            except:
                                pass
                            await asyncio.sleep(300)  # 5dk bekle
                            continue

                open_positions = self.state.get_positions()
                open_count = len(open_positions)
                entry_authority = evaluate_entry_authority(
                    self.state.state,
                    kill_switch_active=bool(self.risk.global_stop_active),
                )
                allow_new_entries = entry_authority.allowed

                # Pozisyon degistirme
                if (not bool(getattr(config, "DISABLE_MAX_POSITION_LIMIT", True))) and (not bool(getattr(config, "DISABLE_MAX_POSITION_LIMIT", True))) and open_count >= config.MAX_FUTURES_POSITIONS and allow_new_entries:
                    try:
                        weakest, better = await self.strategy.find_replacement_opportunity(open_positions)
                        if weakest and better:
                            trade, _ = await self.pm.close_position(weakest, f"Daha iyi: {better['symbol']}")
                            if trade:
                                await self.telegram.notify_trade_close(trade)
                                self.strategy.record_trade_result(trade.get("pnl", 0))
                                await asyncio.sleep(1)
                                pos_data, _ = await self.pm.open_position(better)
                                if pos_data:
                                    await self.telegram.notify_trade_open(pos_data)
                    except Exception as e:
                        logger.error(f"Pozisyon degistirme hatasi: {e}")

                # Yeni pozisyon
                # Futures slot limiti auto path için de soft observability olmalı.
                # Gerçek hard kapılar: balance/margin/minNotional/exchange/risk/policy.
                if allow_new_entries:
                    try:
                        if (not bool(getattr(config, "DISABLE_MAX_POSITION_LIMIT", True))) and (not bool(getattr(config, "DISABLE_MAX_POSITION_LIMIT", True))) and open_count >= config.MAX_FUTURES_POSITIONS:
                            logger.info(
                                "AUTO_SLOT_SOFT_LIMIT open_count=%s max_futures_positions=%s",
                                open_count,
                                config.MAX_FUTURES_POSITIONS,
                            )
                            self.state.set("auto_slot_status", "over_soft_limit")
                            self.state.set("auto_slot_warning", True)
                        else:
                            self.state.set("auto_slot_status", "within_limit")
                            self.state.set("auto_slot_warning", False)

                        opportunity_budget = max(
                            1,
                            int(
                                getattr(
                                    config,
                                    "AUTO_TRADE_MAX_OPPORTUNITIES",
                                    config.MAX_FUTURES_POSITIONS,
                                )
                                or config.MAX_FUTURES_POSITIONS
                            ),
                        )
                        opportunities = await self.strategy.get_best_opportunities(opportunity_budget)
                        self.state.set("last_candidate_evaluated_at", datetime.now(timezone.utc).isoformat())
                        rt.log_runtime_telemetry(
                            logger,
                            rt.CANDIDATE_COUNT,
                            stage="main_loop_candidates",
                            candidate_count=len(opportunities),
                            opportunity_budget=opportunity_budget,
                            open_positions_count=open_count,
                            allow_new_entries=allow_new_entries,
                        )
                        if not opportunities:
                            rt.log_runtime_telemetry(
                                logger,
                                rt.FINAL_ENTRY_DECISION,
                                stage="main_loop_candidates",
                                decision="blocked",
                                blocked_reason="no_candidates",
                                candidate_count=0,
                            )

                        # Cortex bilgilerini sinyallere ekle
                        if config.HYPER_CORTEX_ENABLED:
                            cortex_signal = self.cortex.get_latest_signal()
                            for signal in opportunities:
                                signal["cortex_confidence"] = cortex_signal.confidence
                                signal["sentiment_aligned"] = (
                                    (signal["direction"] == "long" and cortex_signal.sentiment_score > 0) or
                                    (signal["direction"] == "short" and cortex_signal.sentiment_score < 0)
                                )

                        # Inject Sentience Bridge Global Risk Multiplier
                        if config.SENTIENCE_ENABLED:
                            grm = self.sentience.global_risk_multiplier
                            for signal in opportunities:
                                signal["global_risk_multiplier"] = grm

                        for signal in opportunities:
                            rt.log_runtime_telemetry(
                                logger,
                                rt.SELECTED_CANDIDATE,
                                stage="main_loop_candidate_selected",
                                symbol=signal.get("symbol"),
                                direction=signal.get("direction"),
                                score=signal.get("score"),
                                setup_type=signal.get("setup_type") or signal.get("setup_name"),
                                strategy_id=signal.get("strategy_id") or signal.get("setup_name") or signal.get("setup_type"),
                            )
                            can_open, reason = self.risk.can_open_position(
                                available, open_count,
                                current_unrealized,
                                signal.get("mode", "swing")
                            )
                            if not can_open:
                                reason_text = str(reason or "")
                                reason_l = reason_text.lower()
                                max_position_soft = (
                                    (not bool(getattr(config, "DISABLE_MAX_POSITION_LIMIT", True))) and open_count >= config.MAX_FUTURES_POSITIONS
                                    and any(tok in reason_l for tok in ("max", "position", "pozisyon", "slot"))
                                )
                                if max_position_soft:
                                    logger.info(
                                        "AUTO_SLOT_SOFT_LIMIT risk_gate_soft_bypass symbol=%s open_count=%s max_futures_positions=%s reason=%s",
                                        signal.get("symbol"),
                                        open_count,
                                        config.MAX_FUTURES_POSITIONS,
                                        reason_text,
                                    )
                                    self.state.set("auto_slot_status", "over_soft_limit")
                                    self.state.set("auto_slot_warning", True)
                                else:
                                    logger.info(f"Acilamadi: {reason_text}")
                                    self.state.set("last_execution_reject_reason", reason_text)
                                    self._log_runtime_blocked(
                                        stage="risk_can_open_position",
                                        reason=reason_text,
                                        symbol=signal.get("symbol"),
                                        open_positions_count=open_count,
                                    )
                                    break
                            rt.log_runtime_telemetry(
                                logger,
                                rt.FINAL_ENTRY_DECISION,
                                stage="risk_can_open_position",
                                decision="allowed",
                                symbol=signal.get("symbol"),
                                direction=signal.get("direction"),
                            )
                            pos_data, msg = await self.pm.open_position(signal)
                            if pos_data:
                                rt.log_runtime_telemetry(
                                    logger,
                                    rt.FINAL_ENTRY_DECISION,
                                    stage="position_manager_open_position",
                                    decision="opened",
                                    symbol=signal.get("symbol"),
                                    direction=signal.get("direction"),
                                )
                                try:
                                    # AUTO_POSITION_STATE_NORMALIZED_AFTER_OPEN
                                    _symbol = str((pos_data or {}).get("symbol") or signal.get("symbol") or "")
                                    _qty = abs(float((pos_data or {}).get("quantity") or (pos_data or {}).get("qty") or 0.0))
                                    _entry = float(
                                        (pos_data or {}).get("entry_price")
                                        or (pos_data or {}).get("entry")
                                        or (pos_data or {}).get("price")
                                        or signal.get("entry_price")
                                        or signal.get("price")
                                        or 0.0
                                    )
                                    _current = float((pos_data or {}).get("current_price") or _entry or 0.0)
                                    if _symbol and _qty > 0.0 and _entry > 0.0:
                                        pos_data["symbol"] = _symbol
                                        pos_data["quantity"] = _qty
                                        pos_data["entry_price"] = _entry
                                        pos_data["current_price"] = _current
                                        pos_data["notional"] = _qty * _entry
                                        pos_data["position_value"] = _qty * _current

                                        _positions = self.state.get("positions", {}) or {}
                                        _state_pos = _positions.get(_symbol, {}) or {}
                                        _state_pos.update(pos_data)
                                        _state_pos["quantity"] = _qty
                                        _state_pos["entry_price"] = _entry
                                        _state_pos["current_price"] = _current
                                        _state_pos["notional"] = _qty * _entry
                                        _state_pos["position_value"] = _qty * _current
                                        _positions[_symbol] = _state_pos
                                        self.state.set("positions", _positions)
                                except Exception as state_norm_error:
                                    logger.warning("AUTO_POSITION_STATE_NORMALIZED_AFTER_OPEN failed: %s", state_norm_error)
                                self.state.set(
                                    "order_placed_count",
                                    int(self.state.get("order_placed_count", 0) or 0) + 1,
                                )
                                await self.telegram.notify_trade_open(pos_data)
                                open_count += 1
                                await asyncio.sleep(1)
                            else:
                                self.state.set("last_execution_reject_reason", str(msg))
                                self.state.set(
                                    f"execution_reject_{str(msg)}_count",
                                    int(self.state.get(f"execution_reject_{str(msg)}_count", 0) or 0) + 1,
                                )
                                logger.info("execution_reject symbol=%s reason_code=%s", signal.get("symbol"), msg)
                                self._log_runtime_blocked(
                                    stage="position_manager_open_position",
                                    reason=str(msg),
                                    symbol=signal.get("symbol"),
                                    direction=signal.get("direction"),
                                )
                    except Exception as e:
                        logger.error(f"Yeni pozisyon hatasi: {e}")
                        self._log_runtime_blocked(
                            stage="main_loop_new_position_exception",
                            reason=f"{type(e).__name__}:{e}",
                        )
                else:
                    self._log_runtime_blocked(
                        stage="entry_authority",
                        reason=str(getattr(entry_authority, "reason", "entry_authority_blocked")),
                        trade_authority=self.state.get("trade_authority", "unknown"),
                    )

                self._record_runtime_probe("last_scan_completed_at")
                self.state.set("scan_source_status", "scan_completed")
                self.state.set("scan_reason_code", "scan_active")
                self._record_loop_success("main_loop")
                self._watchdog_last = time.time()
                await asyncio.sleep(config.SCAN_INTERVAL)

            except Exception as e:
                logger.error(f"FUTURES DONGU: {type(e).__name__}: {e}")
                self._record_loop_error("main_loop", e)
                await asyncio.sleep(10)

    async def _position_monitor_loop(self):
        """Pozisyon izleme"""
        logger.info(">>> Pozisyon izleme AKTIF")
        last_resync = time.time()

        while self.running:
            try:
                positions = self.state.get_positions()

                if not positions:
                    if time.time() - last_resync > 60:
                        try:
                            await self.pm.sync_with_exchange()
                            await self.account_snapshot.refresh(reason="post_sync_position_loop")
                            self._record_runtime_probe("last_sync_success_at")
                            last_resync = time.time()
                            positions = self.state.get_positions()
                            if positions:
                                logger.info(f"SYNC: {list(positions.keys())}")
                        except Exception as e:
                            logger.error(f"Resync hatasi: {e}")
                    if not positions:
                        await asyncio.sleep(config.POSITION_CHECK_INTERVAL)
                        continue

                try:
                    await self.pm.update_positions()
                except Exception as e:
                    logger.error(f"Update hatasi: {e}")

                for symbol in list(positions.keys()):
                    try:
                        pos = positions.get(symbol)
                        if not pos:
                            continue
                        should_close, reason, _ = await self.strategy.should_close_position(symbol, pos)
                        if should_close:
                            trade, _ = await self.pm.close_position(symbol, reason)
                            if trade:
                                await self.telegram.notify_trade_close(trade)
                                self.strategy.record_trade_result(trade.get("pnl", 0))
                            await asyncio.sleep(0.5)
                    except Exception as e:
                        logger.error(f"Pozisyon kontrol {symbol}: {e}")

                try:
                    snapshot = await self.account_snapshot.refresh(reason="position_loop_drawdown")
                    if not snapshot.get("is_verified_current"):
                        logger.warning(
                            "Drawdown skipped (stale account snapshot): status=%s age=%s",
                            snapshot.get("source_status"),
                            snapshot.get("age_seconds"),
                        )
                        continue
                    dd = self.state.update_drawdown(float(snapshot.get("current_verified_equity", 0.0) or 0.0))
                    if dd > config.MAX_DAILY_DRAWDOWN * 0.7:
                        await self.telegram.notify_risk_warning(f"Drawdown: %{dd:.1f}")
                except Exception as e:
                    logger.error(f"Drawdown hatasi: {e}")

                self._watchdog_last = time.time()
                self._record_loop_success("position_loop")
                await asyncio.sleep(config.POSITION_CHECK_INTERVAL)

            except Exception as e:
                logger.error(f"POZISYON DONGU: {type(e).__name__}: {e}")
                self._record_loop_error("position_loop", e)
                await asyncio.sleep(5)

    async def _spot_trading_loop(self):
        """Spot trading"""
        if not config.SPOT_ENABLED:
            logger.info("Spot devre disi - dongu beklemede")
            while self.running:
                await asyncio.sleep(60)
            return

        logger.info(">>> Spot trading AKTIF")
        await asyncio.sleep(60)

        while self.running:
            try:
                if self.state.get("paused", False) or not bool(self.state.get("scanning_active", True)):
                    await asyncio.sleep(10)
                    continue

                try:
                    to_close = await self.pm.update_spot_positions()
                    for symbol, reason in to_close:
                        trade, _ = await self.pm.close_spot_position(symbol, reason)
                        if trade:
                            await self.telegram.notify_spot_trade(trade, is_buy=False)
                        await asyncio.sleep(1)
                except Exception as e:
                    logger.error(f"Spot guncelleme: {e}")

                try:
                    spot_balance = await self.exchange.get_spot_balance()
                    available = spot_balance["free"]
                    spot_positions = self.state.get_spot_positions()

                    allow_spot_entries = evaluate_entry_authority(
                        self.state.state,
                        kill_switch_active=bool(self.risk.global_stop_active),
                    ).allowed
                    if allow_spot_entries and available >= config.SPOT_MIN_AMOUNT and \
                       len(spot_positions) < config.MAX_SPOT_POSITIONS and \
                       self.strategy.signal_cache:

                        for sym, sig in sorted(
                            self.strategy.signal_cache.items(),
                            key=lambda x: x[1]["score"], reverse=True
                        ):
                            if sig["direction"] != "long" or sig["score"] < 60:
                                break
                            if sym in spot_positions or sym in self.state.get_positions():
                                continue

                            slots = config.MAX_SPOT_POSITIONS - len(spot_positions)
                            if slots <= 0:
                                break
                            amount = min(available / slots, available * 0.4)
                            amount = max(amount, config.SPOT_MIN_AMOUNT)
                            if amount > available:
                                break

                            pos_data, _ = await self.pm.open_spot_position(sig, amount)
                            if pos_data:
                                await self.telegram.notify_spot_trade(pos_data, is_buy=True)
                                available -= amount
                            await asyncio.sleep(2)
                            break
                except Exception as e:
                    logger.error(f"Spot alim: {e}")

                self._watchdog_last = time.time()
                self._record_loop_success("spot_loop")
                await asyncio.sleep(config.SPOT_SCAN_INTERVAL)

            except Exception as e:
                logger.error(f"SPOT DONGU: {type(e).__name__}: {e}")
                self._record_loop_error("spot_loop", e)
                await asyncio.sleep(30)

    async def _report_loop(self):
        """Rapor"""
        logger.info(">>> Rapor dongusu AKTIF")
        while self.running:
            try:
                if getattr(config, "ENABLE_RUNTIME_HEALTH_SUMMARY", True):
                    self._build_runtime_health_summary()
                export_metrics_snapshot(self.metrics.snapshot())
                self.state.set("last_metrics_export_at", datetime.now(timezone.utc).isoformat())
                await self.telegram.send_periodic_report()
                self._record_loop_success("report_loop")
            except Exception as e:
                logger.error(f"Rapor: {e}")
                self._record_loop_error("report_loop", e)
            await asyncio.sleep(60)

    async def _watchdog_loop(self):
        """Watchdog"""
        logger.info(">>> Watchdog AKTIF")
        while self.running:
            try:
                await self._run_runtime_guardian()
                elapsed = time.time() - self._watchdog_last
                if elapsed > 300:
                    logger.warning(f"Watchdog: {elapsed:.0f}sn hareketsizlik!")
                    try:
                        await self.exchange.close()
                    except:
                        pass
                    try:
                        await self.exchange.initialize()
                        await self.pm.sync_with_exchange()
                    except Exception as e:
                        logger.error(f"Watchdog reconnect: {e}")
                    self._watchdog_last = time.time()
                self._record_loop_success("watchdog_loop")
                export_metrics_snapshot(self.metrics.snapshot())
                self.state.set("last_metrics_export_at", datetime.now(timezone.utc).isoformat())
            except Exception as e:
                logger.error(f"Watchdog: {e}")
                self._record_loop_error("watchdog_loop", e)
            await asyncio.sleep(30)

    async def _time_sync_loop(self):
        """Zaman senkron"""
        while self.running:
            try:
                await asyncio.sleep(300)
                await self.exchange.sync_time()
            except Exception as e:
                logger.error(f"Zaman: {e}")
                await asyncio.sleep(60)

    async def _autopoiesis_loop(self):
        """Autopoiesis - self-learning feedback loop"""
        if not config.AUTOPOIESIS_ENABLED:
            logger.info("Autopoiesis devre disi - dongu beklemede")
            while self.running:
                await asyncio.sleep(60)
            return

        logger.info(">>> Autopoiesis AKTIF (self-learning)")
        await asyncio.sleep(120)  # Bot stabilize olana kadar bekle

        while self.running:
            try:
                if self.autopoiesis.should_learn():
                    logger.info("═══ AUTOPOIESIS ÖĞRENME BAŞLIYOR ═══")
                    session = self.autopoiesis.learn()

                    if session and session.deployed:
                        try:
                            auto_status = self.autopoiesis.get_status()
                            await self.telegram.send_message(
                                f"🧬 *AUTOPOIESIS DEPLOY*\n"
                                f"{'━'*24}\n"
                                f"Gen: {auto_status['generation']}\n"
                                f"WR: {session.current_win_rate:.1f}% → {session.mutated_win_rate:.1f}%\n"
                                f"Δ: +{session.improvement_pct:.1f}%\n"
                                f"Params: ADX={auto_status['current_params']['adx']:.0f} "
                                f"SL={auto_status['current_params']['sl']:.1f}%\n"
                                f"{'━'*24}"
                            )
                        except:
                            pass

                await asyncio.sleep(config.LEARNING_INTERVAL_HOURS * 3600)

            except Exception as e:
                logger.error(f"Autopoiesis hatası: {e}")
                await asyncio.sleep(300)

    async def _self_learning_loop(self):
        """Learning engine - recursive parameter optimization."""
        if not config.SELF_LEARNING_ENABLED:
            logger.info("Ogrenme dongusu devre disi - dongu beklemede")
            while self.running:
                await asyncio.sleep(60)
            return

        logger.info(
            f">>> Ogrenme dongusu AKTIF "
            f"(her {config.SELF_LEARNING_INTERVAL_HOURS}sa, "
            f"min {config.SELF_LEARNING_MIN_TRADES} trade)"
        )
        await asyncio.sleep(180)  # Bot stabilize olana kadar bekle

        while self.running:
            try:
                if self.self_learning.should_learn():
                    logger.info("═══ OGRENME DONGUSU BASLIYOR ═══")
                    self.self_learning.learn()

                    status = self.self_learning.get_status()
                    try:
                        logger.info(
                            "Ogrenme dongusu tamamlandi; teknik Telegram bildirimi susturuldu. "
                            "Öğrenme motoru çalışmaya devam ediyor."
                        )
                    except Exception:
                        pass

                await asyncio.sleep(config.SELF_LEARNING_INTERVAL_HOURS * 3600)

            except Exception as e:
                logger.error(f"Ogrenme dongusu hatasi: {e}")
                await asyncio.sleep(300)

    async def cleanup(self):
        """Kaynaklari temizle"""
        logger.info("Kaynaklar temizleniyor...")
        self.running = False
        await self._cancel_runtime_tasks()
        self.state.save()
        try:
            if self._telegram_started:
                await self.telegram.shutdown()
                self._telegram_started = False
        except:
            pass
        try:
            await self.exchange.close()
        except:
            pass

    async def shutdown(self):
        """Guvenli kapat"""
        async with self._shutdown_lock:
            if self._intentional_shutdown:
                return
            self._intentional_shutdown = True
            self.running = False
            logger.info("Bot kasitli olarak kapatiliyor...")
            try:
                logger.info("Telegram güncelleme/yükleme ara mesajı susturuldu; sadece başarılı başlangıç mesajı gönderilecek.")
            except Exception:
                pass
            await self.cleanup()


async def main():
    """Ana fonksiyon - Faz 3: runtime ownership app orchestrator'da."""
    print(f"===== METEHAN BOT v{BOT_VERSION} - CURRENT PRODUCTION =====", flush=True)
    from app.bootstrap import build_runtime_orchestrator

    orchestrator = build_runtime_orchestrator()
    await orchestrator.run_forever()


async def send_restart_notification(restart_count: int) -> None:
    try:
        from telegram import Bot

        temp_telegram = Bot(token=config.TELEGRAM_BOT_TOKEN)
        await temp_telegram.send_message(
            chat_id=config.TELEGRAM_CHAT_ID,
            text=(
                f"🔄 *BOT YENIDEN BASLIYOR* (#{restart_count})\n"
                f"{'━'*24}\n"
                f"⚙️ {RUNTIME_RESTART_SLEEP_SECONDS}sn sonra tekrar aktif\n"
                f"{'━'*24}"
            ),
            parse_mode="Markdown",
        )
        await temp_telegram.close()
    except Exception:
        pass


# --- ACCOUNT AUTHORITY FIX: signed REST flat snapshot fallback ---
async def _account_authority_signed_rest_flat_snapshot() -> dict:
    import asyncio
    import hashlib
    import hmac
    import json
    import os
    import time
    import urllib.parse
    import urllib.request
    from pathlib import Path

    def load_env_file(path: str) -> None:
        try:
            fp = Path(path)
            if not fp.exists():
                return
            for line in fp.read_text(encoding="utf-8", errors="replace").splitlines():
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

    def signed_get_sync(endpoint: str) -> dict:
        load_env_file("/etc/metehan-binance-bot/live-canary-runtime.env")
        load_env_file(".env")

        api_key = os.environ.get("BINANCE_API_KEY") or os.environ.get("BINANCE_FUTURES_API_KEY") or os.environ.get("API_KEY")
        api_secret = os.environ.get("BINANCE_API_SECRET") or os.environ.get("BINANCE_FUTURES_API_SECRET") or os.environ.get("API_SECRET")

        if not api_key or not api_secret:
            return {"ok": False, "error": "missing_api_key_or_secret"}

        base = "https://fapi.binance.com"

        try:
            try:
                req_time = urllib.request.Request(base + "/fapi/v1/time", headers={"User-Agent": "metehan-account-authority"})
                with urllib.request.urlopen(req_time, timeout=8) as resp:
                    ts = int(json.loads(resp.read().decode("utf-8")).get("serverTime"))
            except Exception:
                ts = int(time.time() * 1000)

            qs = urllib.parse.urlencode({"timestamp": ts, "recvWindow": 10000})
            sig = hmac.new(api_secret.encode("utf-8"), qs.encode("utf-8"), hashlib.sha256).hexdigest()
            url = f"{base}{endpoint}?{qs}&signature={sig}"

            req = urllib.request.Request(
                url,
                headers={
                    "X-MBX-APIKEY": api_key,
                    "User-Agent": "metehan-account-authority",
                },
            )

            with urllib.request.urlopen(req, timeout=14) as resp:
                return {"ok": True, "status": resp.status, "data": json.loads(resp.read().decode("utf-8"))}
        except Exception as exc:
            return {"ok": False, "error": f"{type(exc).__name__}: {str(exc)[:240]}"}

    pos = await asyncio.to_thread(signed_get_sync, "/fapi/v2/positionRisk")
    orders = await asyncio.to_thread(signed_get_sync, "/fapi/v1/openOrders")

    nonzero = []
    if pos.get("ok"):
        for row in pos.get("data") or []:
            try:
                amt = float(row.get("positionAmt") or 0)
            except Exception:
                amt = 0.0
            if abs(amt) > 0:
                nonzero.append({
                    "symbol": row.get("symbol"),
                    "positionAmt": row.get("positionAmt"),
                    "entryPrice": row.get("entryPrice"),
                    "unRealizedProfit": row.get("unRealizedProfit"),
                })

    open_orders = orders.get("data") if orders.get("ok") else []

    verified = pos.get("ok") is True and orders.get("ok") is True
    flat = verified and len(nonzero) == 0 and len(open_orders or []) == 0

    return {
        "available": bool(verified),
        "verified": bool(verified),
        "flat": bool(flat),
        "is_flat": bool(flat),
        "source": "signed_rest_account_authority_fallback",
        "source_status": "verified_flat" if flat else ("verified_not_flat" if verified else "unavailable"),
        "positions_count": len(nonzero),
        "nonzero_positions_count": len(nonzero),
        "open_orders_count": len(open_orders or []),
        "nonzero_positions": nonzero[:20],
        "errors": {
            "positionRisk": pos.get("error"),
            "openOrders": orders.get("error"),
        },
        "orders_sent": False,
        "orders_cancelled": False,
        "positions_closed": False,
    }


try:
    _account_authority_original_build_state = TradingBot._build_v3_live_canary_account_state

    async def _account_authority_build_v3_live_canary_account_state(self):
        try:
            original = await _account_authority_original_build_state(self)
        except Exception as exc:
            original = {
                "available": False,
                "flat": False,
                "open_orders_count": None,
                "positions_count": None,
                "source": "original_exception",
                "error": f"{type(exc).__name__}: {str(exc)[:240]}",
            }

        try:
            if isinstance(original, dict) and original.get("available") is True and original.get("flat") is True:
                return original
        except Exception:
            pass

        signed = await _account_authority_signed_rest_flat_snapshot()

        try:
            if signed.get("available") is True and signed.get("flat") is True:
                logger.warning(
                    "ACCOUNT_AUTHORITY_FIX signed REST verified flat account used; original_source=%s original_available=%s original_flat=%s",
                    original.get("source") if isinstance(original, dict) else None,
                    original.get("available") if isinstance(original, dict) else None,
                    original.get("flat") if isinstance(original, dict) else None,
                )
                return signed
        except Exception:
            pass

        merged = dict(original) if isinstance(original, dict) else {"available": False, "flat": False}
        merged["signed_rest_authority"] = signed
        return merged

    TradingBot._build_v3_live_canary_account_state = _account_authority_build_v3_live_canary_account_state
except Exception:
    pass
# --- end ACCOUNT AUTHORITY FIX ---


# --- V125 AUTONOMOUS STARTUP ACCOUNT V3 WATCHDOG REPAIR ---
def _v125_load_runtime_env() -> None:
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


def _v125_signed_get_curl_sync(endpoint: str, max_time: int = 8) -> dict:
    import hashlib
    import hmac
    import json
    import os
    import subprocess
    import time
    import urllib.parse

    _v125_load_runtime_env()

    api_key = os.environ.get("BINANCE_API_KEY") or os.environ.get("BINANCE_FUTURES_API_KEY") or os.environ.get("API_KEY")
    api_secret = os.environ.get("BINANCE_API_SECRET") or os.environ.get("BINANCE_FUTURES_API_SECRET") or os.environ.get("API_SECRET")

    if not api_key or not api_secret:
        return {"ok": False, "error": "missing_api_key_or_secret"}

    base = "https://fapi.binance.com"

    try:
        ts = int(time.time() * 1000)
        try:
            t = subprocess.run(
                ["curl", "-sS", "--connect-timeout", "3", "--max-time", "6", base + "/fapi/v1/time"],
                text=True,
                capture_output=True,
                timeout=8,
            )
            if t.returncode == 0 and t.stdout.strip():
                ts = int(json.loads(t.stdout).get("serverTime") or ts)
        except Exception:
            pass

        qs = urllib.parse.urlencode({"timestamp": ts, "recvWindow": 10000})
        sig = hmac.new(api_secret.encode("utf-8"), qs.encode("utf-8"), hashlib.sha256).hexdigest()
        url = f"{base}{endpoint}?{qs}&signature={sig}"

        r = subprocess.run(
            [
                "curl",
                "-sS",
                "--connect-timeout", "4",
                "--max-time", str(max_time),
                "-H", f"X-MBX-APIKEY: {api_key}",
                "-H", "User-Agent: metehan-v125-account-authority",
                url,
            ],
            text=True,
            capture_output=True,
            timeout=max_time + 3,
        )

        if r.returncode != 0:
            return {"ok": False, "error": f"curl_rc_{r.returncode}:{(r.stderr or r.stdout)[:240]}"}

        body = (r.stdout or "").strip()
        if not body:
            return {"ok": False, "error": "empty_response"}

        data = json.loads(body)
        if isinstance(data, dict) and data.get("code") is not None and int(data.get("code")) < 0:
            return {"ok": False, "error": f"binance_code_{data.get('code')}:{str(data.get('msg'))[:220]}", "data": data}

        return {"ok": True, "data": data}

    except Exception as exc:
        return {"ok": False, "error": f"{type(exc).__name__}: {str(exc)[:240]}"}


async def _v125_signed_rest_flat_snapshot() -> dict:
    import asyncio

    pos, orders = await asyncio.gather(
        asyncio.to_thread(_v125_signed_get_curl_sync, "/fapi/v2/positionRisk", 9),
        asyncio.to_thread(_v125_signed_get_curl_sync, "/fapi/v1/openOrders", 9),
        return_exceptions=False,
    )

    nonzero = []
    if pos.get("ok"):
        for row in pos.get("data") or []:
            try:
                amt = float(row.get("positionAmt") or 0)
            except Exception:
                amt = 0.0
            if abs(amt) > 0:
                nonzero.append({
                    "symbol": row.get("symbol"),
                    "positionAmt": row.get("positionAmt"),
                    "entryPrice": row.get("entryPrice"),
                    "unRealizedProfit": row.get("unRealizedProfit"),
                })

    open_orders = orders.get("data") if orders.get("ok") else []
    verified = pos.get("ok") is True and orders.get("ok") is True
    flat = verified and len(nonzero) == 0 and len(open_orders or []) == 0

    return {
        "available": bool(verified),
        "verified": bool(verified),
        "flat": bool(flat),
        "is_flat": bool(flat),
        "source": "v125_signed_rest_curl_account_authority",
        "source_status": "verified_flat" if flat else ("verified_not_flat" if verified else "unavailable"),
        "positions_count": len(nonzero),
        "nonzero_positions_count": len(nonzero),
        "open_orders_count": len(open_orders or []),
        "nonzero_positions": nonzero[:20],
        "errors": {
            "positionRisk": pos.get("error"),
            "openOrders": orders.get("error"),
        },
        "orders_sent": False,
        "orders_cancelled": False,
        "positions_closed": False,
    }


def _v125_write_status(payload: dict) -> None:
    try:
        import json
        import time
        from pathlib import Path

        p = Path("data/final_engine_status.json")
        p.parent.mkdir(parents=True, exist_ok=True)
        payload.setdefault("generated_at_ms", int(time.time() * 1000))
        p.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    except Exception:
        pass


try:
    _v125_original_build_v3_account_state = TradingBot._build_v3_live_canary_account_state

    async def _v125_build_v3_live_canary_account_state(self):
        try:
            original = await _v125_original_build_v3_account_state(self)
        except Exception as exc:
            original = {
                "available": False,
                "flat": False,
                "source": "original_exception",
                "error": f"{type(exc).__name__}: {str(exc)[:240]}",
            }

        if isinstance(original, dict) and original.get("available") is True and original.get("flat") is True:
            return original

        signed = await _v125_signed_rest_flat_snapshot()

        if signed.get("available") is True and signed.get("flat") is True:
            try:
                logger.warning(
                    "V125_ACCOUNT_AUTHORITY signed REST verified flat account used original_source=%s original_available=%s original_flat=%s",
                    original.get("source") if isinstance(original, dict) else None,
                    original.get("available") if isinstance(original, dict) else None,
                    original.get("flat") if isinstance(original, dict) else None,
                )
            except Exception:
                pass
            return signed

        merged = dict(original) if isinstance(original, dict) else {"available": False, "flat": False}
        merged["v125_signed_rest_authority"] = signed
        return merged

    TradingBot._build_v3_live_canary_account_state = _v125_build_v3_live_canary_account_state
except Exception:
    pass


async def _v125_run_final_engine_once(bot, reason: str = "watchdog") -> dict:
    import asyncio
    import json
    import time
    from pathlib import Path

    try:
        from services.production.final_engine_service import run_final_engine_service_cycle
        from services.production.v3_canary_router import V3CanaryPositionRouter
    except Exception as exc:
        status = {
            "readiness": {"allowed": False, "blockers": ["v125_import_failed"]},
            "execution": {
                "route": "monitor_only_no_live_submit",
                "submitted": False,
                "blockers": ["v125_import_failed"],
                "exception": f"{type(exc).__name__}: {str(exc)[:240]}",
            },
            "canary_lifecycle": "v125_import_failed",
        }
        _v125_write_status(status)
        return status

    try:
        canary_armed = True
        try:
            canary_armed = bool(bot._v3_live_canary_mode_armed())
        except Exception:
            canary_armed = True

        account = await _v125_signed_rest_flat_snapshot()
        if not account.get("available") or not account.get("flat"):
            status = {
                "candidate_key": None,
                "readiness": {
                    "allowed": False,
                    "blockers": ["account_unavailable_or_not_flat"],
                },
                "execution": {
                    "route": "blocked_by_v125_account_authority",
                    "submitted": False,
                    "blockers": ["account_unavailable_or_not_flat"],
                    "account": account,
                },
                "canary_lifecycle": "blocked_by_v125_account_authority",
            }
            _v125_write_status(status)
            return status

        try:
            live_gate_status = await asyncio.to_thread(bot._evaluate_v3_live_gate_status)
        except Exception as exc:
            live_gate_status = {"allowed": False, "error": f"{type(exc).__name__}: {str(exc)[:160]}"}

        try:
            risk_expectancy_status = await asyncio.to_thread(bot._evaluate_v3_risk_expectancy_status)
        except Exception as exc:
            risk_expectancy_status = {"allowed": False, "error": f"{type(exc).__name__}: {str(exc)[:160]}"}

        try:
            kill_switch = bot._build_v3_kill_switch_state()
        except Exception:
            kill_switch = {"active": False, "reasons": []}

        executor = V3CanaryPositionRouter(getattr(bot, "pm", None))
        try:
            executor.real_executor = getattr(bot, "exchange", None)
        except Exception:
            pass

        try:
            logger.warning("V125_AUTONOMOUS_WATCHDOG running final engine reason=%s account_source=%s", reason, account.get("source"))
        except Exception:
            pass

        status = await asyncio.to_thread(
            run_final_engine_service_cycle,
            live_gate_status=live_gate_status,
            risk_expectancy_status=risk_expectancy_status,
            account=account,
            kill_switch=kill_switch,
            executor=executor,
        )

        if isinstance(status, dict):
            try:
                # final_engine kendi yazmıyorsa biz yazarız.
                _v125_write_status(status)
            except Exception:
                pass
            return status

        status = {
            "readiness": {"allowed": False, "blockers": ["v125_non_dict_status"]},
            "execution": {
                "route": "monitor_only_no_live_submit",
                "submitted": False,
                "blockers": ["v125_non_dict_status"],
                "raw_status": str(status)[:500],
            },
            "canary_lifecycle": "v125_non_dict_status",
        }
        _v125_write_status(status)
        return status

    except Exception as exc:
        status = {
            "readiness": {"allowed": False, "blockers": ["v125_engine_exception"]},
            "execution": {
                "route": "monitor_only_no_live_submit",
                "submitted": False,
                "blockers": ["v125_engine_exception"],
                "exception": f"{type(exc).__name__}: {str(exc)[:500]}",
            },
            "canary_lifecycle": "v125_engine_exception",
        }
        _v125_write_status(status)
        try:
            logger.exception("V125_AUTONOMOUS_WATCHDOG engine exception: %s", exc)
        except Exception:
            pass
        return status


async def _v125_watchdog_loop(bot):
    import asyncio
    import os

    _v125_load_runtime_env()

    interval = int(float(os.environ.get("V125_AUTONOMOUS_WATCHDOG_INTERVAL_SECONDS", "45") or 45))
    await asyncio.sleep(8)

    while True:
        await _v125_run_final_engine_once(bot, reason="periodic_watchdog")
        await asyncio.sleep(max(20, interval))


def _v125_patch_start_method():
    import asyncio
    import inspect
    import os

    if getattr(TradingBot, "_v125_start_patch_installed", False):
        return

    TradingBot._v125_start_patch_installed = True

    for method_name in ["start", "run", "main_loop"]:
        original = getattr(TradingBot, method_name, None)
        if not callable(original):
            continue

        if inspect.iscoroutinefunction(original):
            async def patched_async(self, *args, __orig=original, __method=method_name, **kwargs):
                _v125_load_runtime_env()
                if str(os.environ.get("V125_AUTONOMOUS_WATCHDOG_ENABLED", "true")).lower() in {"1", "true", "yes", "on"}:
                    if not getattr(self, "_v125_watchdog_started", False):
                        self._v125_watchdog_started = True
                        try:
                            asyncio.create_task(_v125_watchdog_loop(self))
                            logger.warning("V125_AUTONOMOUS_WATCHDOG task started via %s", __method)
                        except Exception:
                            pass
                return await __orig(self, *args, **kwargs)

            setattr(TradingBot, method_name, patched_async)
            return

_v125_patch_start_method()
# --- end V125 AUTONOMOUS STARTUP ACCOUNT V3 WATCHDOG REPAIR ---


# --- AUTONOMOUS HARD SUPERVISOR LOOP PATCH ---
def _autonomous_hard_supervisor_patch_start() -> None:
    try:
        import asyncio
        import inspect
        import os
        import subprocess
        import sys

        if getattr(TradingBot, "_autonomous_hard_supervisor_patch_installed", False):
            return

        TradingBot._autonomous_hard_supervisor_patch_installed = True

        async def supervisor_loop():
            await asyncio.sleep(10)
            while True:
                try:
                    interval = int(float(os.environ.get("AUTONOMOUS_HARD_SUPERVISOR_INTERVAL_SECONDS", "45") or 45))
                    timeout = int(float(os.environ.get("AUTONOMOUS_FINAL_ENGINE_TIMEOUT_SECONDS", "55") or 55))
                    proc = await asyncio.create_subprocess_exec(
                        sys.executable,
                        "scripts/autonomous_hard_supervisor.py",
                        "--reason",
                        "service_watchdog",
                        "--final-engine-timeout",
                        str(timeout),
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE,
                    )
                    try:
                        out, err = await asyncio.wait_for(proc.communicate(), timeout=timeout + 75)
                    except asyncio.TimeoutError:
                        try:
                            proc.kill()
                        except Exception:
                            pass
                        try:
                            logger.error("AUTONOMOUS_HARD_SUPERVISOR subprocess hard timeout")
                        except Exception:
                            pass
                    else:
                        try:
                            if out:
                                logger.warning("AUTONOMOUS_HARD_SUPERVISOR stdout=%s", out.decode("utf-8", errors="replace")[-1800:])
                            if err:
                                logger.error("AUTONOMOUS_HARD_SUPERVISOR stderr=%s", err.decode("utf-8", errors="replace")[-1800:])
                        except Exception:
                            pass
                except Exception as exc:
                    try:
                        logger.exception("AUTONOMOUS_HARD_SUPERVISOR loop exception: %s", exc)
                    except Exception:
                        pass

                await asyncio.sleep(max(20, interval))

        for method_name in ["start", "run", "main_loop"]:
            original = getattr(TradingBot, method_name, None)
            if not callable(original):
                continue

            if inspect.iscoroutinefunction(original):
                async def patched_async(self, *args, __orig=original, __method=method_name, **kwargs):
                    if str(os.environ.get("AUTONOMOUS_HARD_SUPERVISOR_ENABLED", "true")).lower() in {"1", "true", "yes", "on"}:
                        if not getattr(self, "_autonomous_hard_supervisor_started", False):
                            self._autonomous_hard_supervisor_started = True
                            try:
                                asyncio.create_task(supervisor_loop())
                                logger.warning("AUTONOMOUS_HARD_SUPERVISOR task started via %s", __method)
                            except Exception:
                                pass
                    return await __orig(self, *args, **kwargs)

                setattr(TradingBot, method_name, patched_async)
                return

    except Exception:
        pass

_autonomous_hard_supervisor_patch_start()
# --- end AUTONOMOUS HARD SUPERVISOR LOOP PATCH ---


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Program sonlandi")
    except Exception as e:
        logger.error(f"EN UST SEVIYE HATA: {e}")
        time.sleep(10)


# --- V121 nonblocking Telegram startup safety patch ---
def _v121_patch_telegram_nonblocking():
    try:
        import asyncio
        import inspect
        import os

        candidates = []
        for name, obj in list(globals().items()):
            if obj is None:
                continue
            cls = obj if isinstance(obj, type) else getattr(obj, "__class__", None)
            if cls is None:
                continue
            if "telegram" not in str(cls).lower() and "telegram" not in str(name).lower():
                continue
            candidates.append(cls)

        seen = set()
        for cls in candidates:
            if cls in seen:
                continue
            seen.add(cls)

            for method_name in ("start", "initialize", "run", "start_polling"):
                fn = getattr(cls, method_name, None)
                if not callable(fn) or getattr(fn, "_v121_nonblocking", False):
                    continue

                timeout = float(os.environ.get("TELEGRAM_STARTUP_TIMEOUT_SECONDS", "5") or 5)

                if inspect.iscoroutinefunction(fn):
                    async def async_wrapper(self, *args, __orig=fn, __method=method_name, **kwargs):
                        try:
                            return await asyncio.wait_for(__orig(self, *args, **kwargs), timeout=timeout)
                        except Exception as exc:
                            try:
                                logger.warning("V121 telegram nonblocking startup ignored method=%s error=%s:%s", __method, type(exc).__name__, str(exc)[:180])
                            except Exception:
                                pass
                            return True
                    async_wrapper._v121_nonblocking = True
                    setattr(cls, method_name, async_wrapper)
                else:
                    def sync_wrapper(self, *args, __orig=fn, __method=method_name, **kwargs):
                        try:
                            return __orig(self, *args, **kwargs)
                        except Exception as exc:
                            try:
                                logger.warning("V121 telegram nonblocking startup ignored method=%s error=%s:%s", __method, type(exc).__name__, str(exc)[:180])
                            except Exception:
                                pass
                            return True
                    sync_wrapper._v121_nonblocking = True
                    setattr(cls, method_name, sync_wrapper)
    except Exception:
        pass

try:
    _v121_patch_telegram_nonblocking()
except Exception:
    pass
# --- end V121 nonblocking Telegram startup safety patch ---
