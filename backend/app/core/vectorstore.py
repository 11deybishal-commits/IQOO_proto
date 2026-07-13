from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
import os

class VectorStoreManager:
    def __init__(self):
        # Using a very lightweight model to save disk space and fast download
        self.embeddings = HuggingFaceEmbeddings(
            model_name="all-MiniLM-L6-v2",
            model_kwargs={'device': 'cpu'}, # Use CPU by default unless specified
            encode_kwargs={'normalize_embeddings': True}
        )
        self.index_path = "faiss_index"
        
        # Ensure collection exists
        self._ensure_collection()
        
    def _ensure_collection(self):
        if not os.path.exists(self.index_path):
            store = FAISS.from_texts(["Initialization document"], self.embeddings)
            store.save_local(self.index_path)
        
    def get_store(self) -> FAISS:
        return FAISS.load_local(self.index_path, self.embeddings, allow_dangerous_deserialization=True)

vector_store_manager = VectorStoreManager()
