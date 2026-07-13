from langchain_core.tools import tool
from app.core.vectorstore import vector_store_manager

@tool
def search_similar_incidents(query: str, limit: int = 3) -> str:
    """
    Search FAISS for past incidents or runbooks that are semantically similar to the current incident query.
    Used for retrieving historical resolutions.
    """
    store = vector_store_manager.get_store()
    results = store.similarity_search(query=query, k=limit)
    if not results:
        return "No similar historical incidents found."
    
    formatted_results = "\n\n".join([f"Document: {res.page_content}\nMetadata: {res.metadata}" for res in results])
    return formatted_results
