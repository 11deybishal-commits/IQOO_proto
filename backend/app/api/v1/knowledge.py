import io
import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.core.vectorstore import vector_store_manager
from app.models.user import User
from app.api.deps import get_current_active_user

router = APIRouter()


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """
    Upload a document (text, markdown, log) to the FAISS knowledge base.
    Chunks text and embeds it — no LLM tokens used.
    """
    allowed_types = {
        "text/plain", "text/markdown", "application/pdf",
        "text/x-log", "text/csv"
    }

    content_bytes = await file.read()
    if len(content_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(content_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 10MB)")

    # Decode text content
    try:
        text = content_bytes.decode("utf-8", errors="ignore")
    except Exception:
        raise HTTPException(status_code=400, detail="Could not decode file as text")

    if not text.strip():
        raise HTTPException(status_code=400, detail="File has no readable text content")

    # Chunk and embed
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    chunks = splitter.split_text(text)

    if not chunks:
        raise HTTPException(status_code=400, detail="Could not extract text chunks")

    metadata_list = [
        {"source": file.filename, "uploader": str(current_user.id), "chunk": i}
        for i in range(len(chunks))
    ]

    store = vector_store_manager.get_store()
    store.add_texts(texts=chunks, metadatas=metadata_list)
    store.save_local(vector_store_manager.index_path)

    return {
        "status": "success",
        "filename": file.filename,
        "chunks_indexed": len(chunks),
        "message": f"Successfully indexed {len(chunks)} chunks into the knowledge base.",
    }


@router.get("/search")
async def search_knowledge(
    q: str,
    limit: int = 5,
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """Semantic search over the knowledge base. Zero LLM tokens."""
    if not q.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    store = vector_store_manager.get_store()
    results = store.similarity_search(query=q, k=limit)

    return {
        "query": q,
        "results": [
            {
                "content": doc.page_content,
                "source": doc.metadata.get("source", "unknown"),
                "chunk": doc.metadata.get("chunk", 0),
            }
            for doc in results
        ],
    }
