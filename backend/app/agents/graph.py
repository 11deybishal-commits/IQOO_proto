import operator
from typing import Annotated, Sequence, TypedDict, Literal
from langchain_core.messages import BaseMessage, SystemMessage, HumanMessage
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode

from app.core.llm import get_llm
from app.agents.tools import search_similar_incidents


class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], operator.add]
    incident_id: str
    user_id: str


def build_graph():
    """
    Build the LangGraph agent pipeline.
    LLM is instantiated here (not at module level) to avoid import-time errors.
    """
    llm = get_llm()
    tools = [search_similar_incidents]
    tool_node = ToolNode(tools)

    workflow = StateGraph(AgentState)
    supervisor_llm = llm.bind_tools(tools)

    def intelligent_supervisor(state: AgentState):
        messages = state.get("messages", [])
        system_prompt = SystemMessage(
            content=(
                "You are an expert Enterprise SRE incident manager. "
                "Your objective is to diagnose the incoming incident and provide a comprehensive root cause hypothesis. "
                "Always call the search tool to find similar past incidents before drawing conclusions. "
                "If no tools are needed, provide a detailed final diagnostic report."
            )
        )
        response = supervisor_llm.invoke([system_prompt] + list(messages))
        return {"messages": [response]}

    def should_continue(state: AgentState) -> Literal["tools", "__end__"]:
        messages = state.get("messages", [])
        last_message = messages[-1]
        if not last_message.tool_calls:
            return "__end__"
        return "tools"

    workflow.add_node("supervisor", intelligent_supervisor)
    workflow.add_node("tools", tool_node)

    workflow.add_conditional_edges("supervisor", should_continue)
    workflow.add_edge("tools", "supervisor")

    workflow.set_entry_point("supervisor")

    return workflow.compile()
