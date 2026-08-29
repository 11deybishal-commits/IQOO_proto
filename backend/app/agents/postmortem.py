from langchain_core.messages import HumanMessage, SystemMessage
from app.core.llm import get_llm


def generate_postmortem(
    incident_id: str,
    title: str,
    description: str,
    ai_analysis: str,
    severity: str,
    project: str,
    created_at: str,
    resolved_at: str,
    additional_notes: str = "",
) -> str:
    """
    Generates a blameless post-mortem document for a resolved incident.
    Single LLM invocation — minimal token usage.
    """
    llm = get_llm()

    system_prompt = SystemMessage(
        content=(
            "You are an expert Site Reliability Engineer who writes blameless post-mortem documents. "
            "Your goal is to help teams learn from incidents without assigning blame. "
            "Output clean, well-structured Markdown. Be concise but thorough."
        )
    )

    user_prompt = HumanMessage(
        content=(
            f"Write a blameless post-mortem for the following resolved incident.\n\n"
            f"**Incident ID**: {incident_id}\n"
            f"**Title**: {title}\n"
            f"**Severity**: {severity}\n"
            f"**Project**: {project or 'N/A'}\n"
            f"**Created At**: {created_at}\n"
            f"**Resolved At**: {resolved_at}\n\n"
            f"**Description**:\n{description or 'No description provided.'}\n\n"
            f"**AI Root Cause Analysis**:\n{ai_analysis or 'Analysis not available.'}\n\n"
            f"**Additional Notes**:\n{additional_notes or 'None.'}\n\n"
            "Generate a post-mortem with these sections:\n"
            "## Incident Summary\n"
            "## Timeline of Events\n"
            "## Root Cause\n"
            "## Impact Assessment\n"
            "## What Went Well\n"
            "## What Could Be Improved\n"
            "## Action Items (with owners and due dates)\n"
            "## Lessons Learned\n"
        )
    )

    response = llm.invoke([system_prompt, user_prompt])
    return response.content
