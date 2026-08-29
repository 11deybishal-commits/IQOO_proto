import os
import ssl
import httpx
from langchain_community.vectorstores import FAISS

# Set SSL bypass for Hugging Face downloads on Windows environments
os.environ.setdefault("HF_HUB_DISABLE_SSL_VERIFICATION", "1")
os.environ.setdefault("CURL_CA_BUNDLE", "")
os.environ.setdefault("REQUESTS_CA_BUNDLE", "")

try:
    _orig_httpx_init = httpx.Client.__init__
    def _patched_httpx_init(self, *args, **kwargs):
        if "verify" not in kwargs:
            kwargs["verify"] = False
        return _orig_httpx_init(self, *args, **kwargs)
    httpx.Client.__init__ = _patched_httpx_init
except Exception:
    pass


class VectorStoreManager:
    """
    Lazy FAISS vector store manager.
    Embeddings model is loaded once on first use, not at import time.
    """

    def __init__(self):
        self._embeddings = None
        self.index_path = "faiss_index"

    def _get_embeddings(self):
        """Load embeddings model lazily on first call."""
        if self._embeddings is None:
            from langchain_huggingface import HuggingFaceEmbeddings
            self._embeddings = HuggingFaceEmbeddings(
                model_name="all-MiniLM-L6-v2",
                model_kwargs={"device": "cpu"},
                encode_kwargs={"normalize_embeddings": True},
            )
        return self._embeddings

    def get_store(self) -> FAISS:
        """Return the FAISS store, creating it if it doesn't exist yet."""
        embeddings = self._get_embeddings()
        if not os.path.exists(self.index_path):
            # Create a minimal index so subsequent add_texts calls work
            store = FAISS.from_texts(["SentinelOps knowledge base initialized."], embeddings)
            store.save_local(self.index_path)
        return FAISS.load_local(
            self.index_path, embeddings, allow_dangerous_deserialization=True
        )


vector_store_manager = VectorStoreManager()
