"""
ChatOps Multi-Agent Swarm (Feature #3)
=======================================
Multi-agent architecture:
  - DBA Agent: queries incident DB and knowledge base
  - Network Agent: checks topology and blast radius
  - Supervisor Agent: synthesizes all sub-agent outputs

Supports streaming SSE responses for real-time UX.
"""
import traceback
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from app.core.llm import get_llm


# ─── Specialist Sub-Agents ───────────────────────────────────────────────────

def dba_agent_respond(query: str, incidents_summary: str, knowledge_context: str) -> str:
    """
    DBA Agent: specializes in incident data, history, and runbook knowledge.
    """
    llm = get_llm()
    system = SystemMessage(
        content=(
            "You are the DBA Agent (Database & Analytics Specialist) in the SentinelOps multi-agent swarm. "
            "You specialize in analyzing incident history, database health, query performance, and runbooks. "
            "Provide concise, actionable insights. Start your response with '[DBA Agent]'."
        )
    )
    user = HumanMessage(
        content=(
            f"User Query: {query}\n\n"
            f"Recent Incident Database Summary:\n{incidents_summary}\n\n"
            f"Knowledge Base Context:\n{knowledge_context or 'No relevant runbooks found.'}\n\n"
            "Provide your analysis."
        )
    )
    try:
        response = llm.invoke([system, user])
        return response.content
    except Exception as e:
        return f"[DBA Agent] Error: {str(e)}"


def network_agent_respond(query: str, topology_summary: str) -> str:
    """
    Network Agent: specializes in infrastructure topology and blast radius.
    """
    llm = get_llm()
    system = SystemMessage(
        content=(
            "You are the Network Agent (Infrastructure & Topology Specialist) in the SentinelOps multi-agent swarm. "
            "You specialize in VPC flow logs, service dependencies, blast radius analysis, and network health. "
            "Provide concise, actionable insights. Start your response with '[Network Agent]'."
        )
    )
    user = HumanMessage(
        content=(
            f"User Query: {query}\n\n"
            f"Current Service Topology:\n{topology_summary}\n\n"
            "Analyze network dependencies and potential cascading failures."
        )
    )
    try:
        response = llm.invoke([system, user])
        return response.content
    except Exception as e:
        return f"[Network Agent] Error: {str(e)}"


def supervisor_agent_synthesize(
    query: str,
    dba_response: str,
    network_response: str,
    chat_history: list[dict],
) -> str:
    """
    Supervisor Agent: reads all sub-agent outputs and synthesizes the final answer.
    """
    llm = get_llm()

    history_text = "\n".join([
        f"{msg['role'].upper()}: {msg['content']}" for msg in chat_history[-6:]
    ])

    system = SystemMessage(
        content=(
            "You are the Supervisor Agent in the SentinelOps multi-agent command center. "
            "Your job is to synthesize inputs from the DBA Agent and Network Agent into a clear, "
            "unified response for the SRE engineer. "
            "Be direct, actionable, and concise. Format with markdown for clarity. "
            "Do NOT repeat 'DBA Agent says...' — integrate insights naturally."
        )
    )
    user = HumanMessage(
        content=(
            f"Engineer's Question: {query}\n\n"
            f"Recent Conversation Context:\n{history_text}\n\n"
            f"DBA Agent Analysis:\n{dba_response}\n\n"
            f"Network Agent Analysis:\n{network_response}\n\n"
            "Synthesize a unified, actionable response."
        )
    )

    try:
        response = llm.invoke([system, user])
        return response.content
    except Exception as e:
        return f"[Supervisor] Error synthesizing response: {str(e)}"


def run_chatops_swarm(
    query: str,
    chat_history: list[dict],
    incidents: list,
    topology_nodes: list,
) -> dict:
    """
    Orchestrates the full multi-agent swarm for a ChatOps query.
    Returns structured response with sub-agent outputs + synthesis.
    """
    # Build context summaries
    incidents_summary = _build_incidents_summary(incidents)
    topology_summary = _build_topology_summary(topology_nodes)

    # Run sub-agents
    print(f"[ChatOps] Running DBA Agent for: {query[:60]}...")
    dba_resp = dba_agent_respond(query, incidents_summary, "")

    print(f"[ChatOps] Running Network Agent for: {query[:60]}...")
    net_resp = network_agent_respond(query, topology_summary)

    # Supervisor synthesis — truncate sub-agent outputs to prevent 413 token overflow
    MAX_SUBAGENT_CHARS = 1500
    dba_resp_truncated = dba_resp[:MAX_SUBAGENT_CHARS] + ("..." if len(dba_resp) > MAX_SUBAGENT_CHARS else "")
    net_resp_truncated = net_resp[:MAX_SUBAGENT_CHARS] + ("..." if len(net_resp) > MAX_SUBAGENT_CHARS else "")

    print(f"[ChatOps] Running Supervisor synthesis...")
    final_resp = supervisor_agent_synthesize(query, dba_resp_truncated, net_resp_truncated, chat_history)

    return {
        "query": query,
        "dba_agent_response": dba_resp,
        "network_agent_response": net_resp,
        "supervisor_response": final_resp,
        "agents_consulted": ["DBA Agent", "Network Agent", "Supervisor"],
    }


def _build_incidents_summary(incidents: list) -> str:
    if not incidents:
        return "No incidents in the system."

    # Take the 10 most recent
    recent = sorted(incidents, key=lambda i: i.created_at, reverse=True)[:10]
    lines = ["Recent Incidents:"]
    for inc in recent:
        status_emoji = "🔴" if inc.status == "open" else "🟡" if inc.status == "investigating" else "✅"
        lines.append(
            f"{status_emoji} [{inc.severity.upper()}] {inc.title} "
            f"(status: {inc.status}, project: {inc.project or 'N/A'})"
        )

    open_count = sum(1 for i in incidents if i.status in ("open", "investigating"))
    resolved_count = sum(1 for i in incidents if i.status == "resolved")
    lines.append(f"\nTotal: {len(incidents)} | Open: {open_count} | Resolved: {resolved_count}")

    return "\n".join(lines)


def _build_topology_summary(nodes: list) -> str:
    if not nodes:
        return "No topology data available."

    lines = ["Service Topology:"]
    for node in nodes:
        critical_flag = " [CRITICAL TIER]" if node.is_critical else ""
        lines.append(
            f"- {node.name} ({node.service_type}){critical_flag} "
            f"| Team: {node.team or 'N/A'} | Cost: ${node.cost_per_minute}/min"
        )
    return "\n".join(lines)
