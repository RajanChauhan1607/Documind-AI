# DocuMind AI

DocuMind AI is a full-stack, AI-powered document assistant that lets you upload, analyze, and intelligently interrogate your PDF files. It features both a **Document-Specific** chat and a **Global Knowledge Base** semantic search, powered by Retrieval-Augmented Generation (RAG).

![DocuMind AI](https://img.shields.io/badge/Status-Active-success)
![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-blue)
![Django](https://img.shields.io/badge/Backend-Django%20REST-darkgreen)
![LangChain](https://img.shields.io/badge/AI-LangChain-orange)

## 🌟 Features

- **Document Ingestion**: Upload PDFs, automatically extract text, and chunk it for semantic processing.
- **Single-Document Chat**: Ask contextual questions about a specific document and get accurate, cited answers.
- **Global Search**: Switch to the Global Knowledge Base to ask questions that scan across *all* your uploaded documents simultaneously.
- **Lightning Fast Inference**: Integrated with Groq's LLaMA 3.1 API for sub-second responses.
- **Local Embedded Storage**: Uses FAISS vector databases and HuggingFace (`all-MiniLM-L6-v2`) embeddings to keep context retrieval lightning fast and free from external vector API limits.
- **Persistent Memory**: Beautiful UI built with Tailwind CSS that persists chat history using the backend database.

---

## 🛠️ Tech Stack

### Frontend
- **React (Vite ⚡)**: Lightning-fast development environment and optimized builds.
- **Tailwind CSS**: Modern utility-first styling.
- **Lucide React**: Clean and minimal iconography.
- **Axios**: API interactions.

### Backend & AI
- **Django Rest Framework (DRF)**: Robust backend API architecture.
- **LangChain**: AI orchestration and Conversational Memory injection.
- **Groq API**: Extremely fast LLM inference (using LLaMA 3.1).
- **FAISS**: Local vector database for similarity search.
- **HuggingFace Embeddings**: Open-source, fast, and local embedding models.
- **PyPDF2**: Local text extraction without third-party APIs.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Python (3.10+)
- A [Groq API Key](https://console.groq.com/)

### 1. Clone the repository
```bash
git clone https://github.com/RajanChauhan1607/Documind-AI.git
cd Documind-AI
```

### 2. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Environment variables
# Create a .env file in the backend directory
echo "GROQ_API_KEY=your_actual_groq_api_key_here" > .env

# Run migrations and start server
python manage.py makemigrations
python manage.py migrate
python manage.py runserver
```
*The backend will run on `http://localhost:8000`*

### 3. Frontend Setup
```bash
# Open a new terminal
cd frontend

# Install dependencies
npm install

# Environment variables
# Create a .env in the frontend directory
echo "VITE_API_BASE_URL=http://localhost:8000/api" > .env

# Start dev server
npm run dev
```
*The frontend will run on `http://localhost:5173`*

---

## 💡 Usage

1. Open the frontend in your browser.
2. Click the **Upload Document** dashed container on the left sidebar to upload a PDF. 
3. *Wait for the indexing to complete* (a local FAISS index will be created in the backend).
4. Start chatting in the input terminal!
5. To search across everything, select the **Global Search** button above your document list.

---

## 📝 License
This project is open-source and available under the [MIT License](LICENSE). 
