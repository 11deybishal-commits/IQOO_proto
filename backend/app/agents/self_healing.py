"""
Autonomous Self-Healing Agent (Feature #1)
==========================================
Analyzes incidents and proposes remediation actions.
Actions require human approval before execution (co-pilot model).
Tool stubs simulate kubectl / AWS / Vercel commands.
"""
import traceback
from langchain_core.messages import HumanMessage, SystemMessage
from app.core.llm import get_llm


# ─── Simulated Action Toolbox ─────────────────────────────────────────────────

SIMULATED_ACTIONS = {
    "restart_pod": {
        "description": "Gracefully restarts the affected Kubernetes pod",
        "command": "kubectl rollout restart deployment/{service} -n production",
        "risk": "low",
        "duration_seconds": 45,
    },
    "scale_service": {
        "description": "Horizontally scales the service to handle increased load",
        "command": "kubectl scale deployment/{service} --replicas={replicas} -n production",
        "risk": "low",
        "duration_seconds": 30,
    },
    "rollback_deployment": {
        "description": "Rolls back the service to the previous stable version",
        "command": "kubectl rollout undo deployment/{service} -n production",
        "risk": "medium",
        "duration_seconds": 120,
    },
    "flush_cache": {
        "description": "Flushes the Redis cache to resolve stale-data issues",
        "command": "redis-cli -h {host} FLUSHDB",
        "risk": "medium",
        "duration_seconds": 5,
    },
    "drain_node": {
        "description": "Cordons and drains the affected Kubernetes node",
        "command": "kubectl cordon {node} && kubectl drain {node} --ignore-daemonsets --delete-emptydir-data",
        "risk": "high",
        "duration_seconds": 300,
    },
    "increase_db_connections": {
        "description": "Increases the database connection pool limit",
        "command": "aws rds modify-db-instance --db-instance-identifier {db} --max-connections 500",
        "risk": "low",
        "duration_seconds": 15,
    },
    "enable_circuit_breaker": {
        "description": "Enables the circuit breaker for the failing downstream service",
        "command": "curl -X POST https://gateway/admin/circuit-breaker/{service}/open",
        "risk": "medium",
        "duration_seconds": 2,
    },
}


def generate_healing_proposals(
    incident_id: str,
    title: str,
    description: str,
    ai_analysis: str,
    severity: str,
    affected_services: list[str] | None = None,
) -> dict:
    """
    Use LLM to analyze the incident and propose the top 2-3 healing actions.
    Returns structured JSON with proposals.
    """
    llm = get_llm()

    available_actions = "\n".join(
        [f"- {k}: {v['description']} (risk: {v['risk']})" for k, v in SIMULATED_ACTIONS.items()]
    )

    affected_str = ", ".join(affected_services) if affected_services else "Unknown"

    system_prompt = SystemMessage(
        content=(
            "You are an autonomous SRE remediation engine. "
            "Given an incident, select the 2-3 most appropriate healing actions from the available toolbox. "
            "Respond ONLY with a JSON array of objects. Each object must have: "
            '"action_key" (string from toolbox), "rationale" (why this action), '
            '"priority" (1=highest), "estimated_resolution_time_minutes" (integer). '
            "Output ONLY valid JSON, no markdown, no explanation."
        )
    )

    user_prompt = HumanMessage(
        content=(
            f"Incident ID: {incident_id}\n"
            f"Title: {title}\n"
            f"Severity: {severity}\n"
            f"Affected Services: {affected_str}\n"
            f"Description: {description or 'N/A'}\n"
            f"AI Root Cause Analysis:\n{ai_analysis or 'Not yet analyzed'}\n\n"
            f"Available Healing Actions:\n{available_actions}\n\n"
            "Select the best 2-3 actions and return as JSON array."
        )
    )

    try:
        response = llm.invoke([system_prompt, user_prompt])
        content = response.content.strip()
        # Strip markdown code fences if present
        if content.startswith("```"):
            lines = content.split("\n")
            content = "\n".join(lines[1:-1]) if len(lines) > 2 else content
        import json
        proposals_raw = json.loads(content)
    except Exception as e:
        print(f"[SelfHeal] LLM JSON parse error: {e}")
        traceback.print_exc()
        # Fallback: suggest restart_pod
        proposals_raw = [
            {
                "action_key": "restart_pod",
                "rationale": "Default remediation: restart affected service pods to clear transient failures.",
                "priority": 1,
                "estimated_resolution_time_minutes": 5,
            }
        ]

    # Enrich proposals with toolbox metadata
    proposals = []
    for p in proposals_raw[:3]:
        key = p.get("action_key", "")
        tool = SIMULATED_ACTIONS.get(key, {})
        proposals.append({
            "action_key": key,
            "description": tool.get("description", key),
            "command_preview": tool.get("command", "N/A").replace("{service}", title.split()[0].lower()),
            "risk": tool.get("risk", "unknown"),
            "duration_seconds": tool.get("duration_seconds", 60),
            "rationale": p.get("rationale", ""),
            "priority": p.get("priority", 1),
            "estimated_resolution_time_minutes": p.get("estimated_resolution_time_minutes", 5),
        })

    return {"incident_id": incident_id, "proposals": proposals}


def execute_healing_action(action_key: str, incident_title: str) -> dict:
    """
    Simulates executing a healing action.
    In production this would call real kubectl/AWS/Vercel APIs.
    Returns execution log and result.
    """
    tool = SIMULATED_ACTIONS.get(action_key)
    if not tool:
        return {"success": False, "log": f"Unknown action: {action_key}", "action_key": action_key}

    service_name = incident_title.split()[0].lower() if incident_title else "app"
    command = tool["command"].replace("{service}", service_name).replace("{replicas}", "3").replace("{host}", "redis.internal").replace("{node}", "node-01").replace("{db}", "prod-db")

    # Simulate execution log
    log_lines = [
        f"[SentinelOps AutoHeal] Executing: {action_key}",
        f"[CMD] $ {command}",
        f"[INFO] Connecting to cluster endpoint...",
        f"[INFO] Authentication: OK",
        f"[INFO] Executing action... (simulated {tool['duration_seconds']}s operation)",
        f"[SUCCESS] Action completed successfully.",
        f"[INFO] Affected service: {service_name}",
        f"[INFO] Risk level: {tool['risk']}",
        f"[DONE] Self-healing action '{action_key}' completed. Monitor for recovery.",
    ]

    return {
        "success": True,
        "action_key": action_key,
        "command_executed": command,
        "log": "\n".join(log_lines),
        "duration_seconds": tool["duration_seconds"],
    }
