"""
Predictive Incident Forecasting Engine (Feature #2)
====================================================
Analyzes historical incident patterns from the DB and uses LLM
to identify services at risk of future incidents.
Returns risk scores + pre-incident alerts.
"""
import traceback
from datetime import datetime, timezone, timedelta
from collections import defaultdict
from langchain_core.messages import HumanMessage, SystemMessage
from app.core.llm import get_llm


# Service SLA definitions (used for forecasting context)
SERVICE_SLAS = {
    "API Gateway": {"sla_uptime": 99.99, "mttr_target_minutes": 5},
    "Auth Service": {"sla_uptime": 99.99, "mttr_target_minutes": 10},
    "Incident Service": {"sla_uptime": 99.9, "mttr_target_minutes": 15},
    "AI Analysis Service": {"sla_uptime": 99.5, "mttr_target_minutes": 30},
    "SQLite DB": {"sla_uptime": 99.99, "mttr_target_minutes": 5},
    "Notification Service": {"sla_uptime": 99.5, "mttr_target_minutes": 20},
    "Knowledge Service": {"sla_uptime": 99.0, "mttr_target_minutes": 30},
    "FAISS Index": {"sla_uptime": 99.0, "mttr_target_minutes": 30},
    "Groq Cloud API": {"sla_uptime": 99.9, "mttr_target_minutes": 10},
    "HuggingFace Hub": {"sla_uptime": 99.5, "mttr_target_minutes": 20},
}


def analyze_incident_patterns(incidents: list) -> dict:
    """
    Analyzes raw incident list to extract time-series patterns.
    Returns aggregated stats per service/project.
    """
    now = datetime.now(timezone.utc)
    last_7_days = now - timedelta(days=7)
    last_24_hours = now - timedelta(hours=24)

    # Frequency counters
    incidents_7d: dict[str, int] = defaultdict(int)
    incidents_24h: dict[str, int] = defaultdict(int)
    severity_dist: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    unresolved_durations: dict[str, list[float]] = defaultdict(list)

    for inc in incidents:
        created = inc.created_at
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)

        # Extract service key
        project_key = inc.project or "General"

        if created >= last_7_days:
            incidents_7d[project_key] += 1
        if created >= last_24_hours:
            incidents_24h[project_key] += 1

        severity_dist[project_key][inc.severity] += 1

        # Track unresolved duration
        if inc.status not in ("resolved", "closed"):
            duration_hours = (now - created).total_seconds() / 3600
            unresolved_durations[project_key].append(duration_hours)

    # Build pattern summary
    patterns = {}
    all_projects = set(list(incidents_7d.keys()) + list(incidents_24h.keys()))

    for project in all_projects:
        avg_unresolved = (
            sum(unresolved_durations[project]) / len(unresolved_durations[project])
            if unresolved_durations[project] else 0
        )
        sev = severity_dist[project]
        critical_ratio = sev.get("critical", 0) / max(sum(sev.values()), 1)

        patterns[project] = {
            "incidents_last_24h": incidents_24h[project],
            "incidents_last_7d": incidents_7d[project],
            "avg_unresolved_hours": round(avg_unresolved, 1),
            "critical_ratio": round(critical_ratio, 2),
            "severity_breakdown": dict(sev),
        }

    return patterns


def generate_forecast(incidents: list) -> dict:
    """
    Main entry point: analyzes patterns and uses LLM to generate
    risk forecasts and pre-incident alerts.
    """
    if not incidents:
        return _empty_forecast()

    patterns = analyze_incident_patterns(incidents)
    llm = get_llm()

    # Build a concise summary for LLM
    summary_lines = []
    for project, stats in patterns.items():
        summary_lines.append(
            f"Project '{project}': {stats['incidents_last_24h']} incidents in 24h, "
            f"{stats['incidents_last_7d']} in 7d, "
            f"critical ratio: {stats['critical_ratio']:.0%}, "
            f"avg open duration: {stats['avg_unresolved_hours']}h"
        )

    summary_text = "\n".join(summary_lines) if summary_lines else "No recent incident data available."

    system_prompt = SystemMessage(
        content=(
            "You are a predictive SRE intelligence engine. "
            "Analyze incident telemetry patterns and identify services/projects at elevated risk. "
            "Respond with a JSON object with two keys: "
            '"risk_scores": array of {service: string, risk_level: "low"|"medium"|"high"|"critical", '
            'risk_score: 0-100, reason: string, predicted_window: string}, '
            '"pre_incident_alerts": array of {title: string, description: string, severity: "warning"|"critical", service: string}. '
            "Output ONLY valid JSON, no markdown."
        )
    )

    user_prompt = HumanMessage(
        content=(
            f"Historical incident pattern analysis (last 7 days):\n{summary_text}\n\n"
            f"Total incidents analyzed: {len(incidents)}\n"
            f"Current time: {datetime.now(timezone.utc).isoformat()}\n\n"
            "Identify the top 3-5 services at risk and any pre-incident signals."
        )
    )

    try:
        response = llm.invoke([system_prompt, user_prompt])
        content = response.content.strip()
        if content.startswith("```"):
            lines = content.split("\n")
            content = "\n".join(lines[1:-1]) if len(lines) > 2 else content
        import json
        forecast_data = json.loads(content)
    except Exception as e:
        print(f"[Forecast] LLM parse error: {e}")
        traceback.print_exc()
        forecast_data = _fallback_forecast(patterns)

    # Add computed statistics
    now = datetime.now(timezone.utc)
    last_24h = now - timedelta(hours=24)
    incidents_24h = sum(1 for i in incidents if (
        (i.created_at.replace(tzinfo=timezone.utc) if i.created_at.tzinfo is None else i.created_at) >= last_24h
    ))

    return {
        "generated_at": now.isoformat(),
        "total_incidents_analyzed": len(incidents),
        "incidents_last_24h": incidents_24h,
        "pattern_summary": patterns,
        "risk_scores": forecast_data.get("risk_scores", []),
        "pre_incident_alerts": forecast_data.get("pre_incident_alerts", []),
    }


def _empty_forecast() -> dict:
    """Returns a healthy forecast when no incidents exist."""
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_incidents_analyzed": 0,
        "incidents_last_24h": 0,
        "pattern_summary": {},
        "risk_scores": [
            {"service": svc, "risk_level": "low", "risk_score": 5,
             "reason": "No historical incidents detected.", "predicted_window": "72h+"}
            for svc in list(SERVICE_SLAS.keys())[:5]
        ],
        "pre_incident_alerts": [],
    }


def _fallback_forecast(patterns: dict) -> dict:
    """Fallback when LLM fails — rule-based risk scoring."""
    risk_scores = []
    alerts = []

    for project, stats in patterns.items():
        score = min(
            int(stats["incidents_last_24h"] * 20 +
                stats["critical_ratio"] * 40 +
                min(stats["avg_unresolved_hours"] * 2, 20)),
            100
        )
        level = "critical" if score >= 75 else "high" if score >= 50 else "medium" if score >= 25 else "low"
        risk_scores.append({
            "service": project,
            "risk_level": level,
            "risk_score": score,
            "reason": f"{stats['incidents_last_24h']} incidents in 24h, {stats['critical_ratio']:.0%} critical",
            "predicted_window": "24h" if score >= 50 else "48h",
        })

        if score >= 50:
            alerts.append({
                "title": f"Pre-Incident Signal: {project}",
                "description": f"Elevated incident frequency detected. Risk score: {score}/100",
                "severity": "critical" if score >= 75 else "warning",
                "service": project,
            })

    return {"risk_scores": risk_scores, "pre_incident_alerts": alerts}
