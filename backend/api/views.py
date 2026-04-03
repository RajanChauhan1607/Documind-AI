import os
from django.conf import settings
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Document, Message
from .serializers import DocumentSerializer, MessageSerializer

import PyPDF2
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

from dotenv import load_dotenv
load_dotenv()


class DocumentListCreateView(generics.ListCreateAPIView):
    queryset = Document.objects.all().order_by('-uploaded_at')
    serializer_class = DocumentSerializer
    parser_classes = (MultiPartParser, FormParser)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        document = serializer.save()
        
        file_path = document.file.path
        text = ""
        try:
            with open(file_path, 'rb') as f:
                reader = PyPDF2.PdfReader(f)
                for page in reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
        except Exception as e:
            return Response({"error": f"Error reading PDF: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
            
        if not text.strip():
            return Response({"error": "No text could be extracted from this PDF."}, status=status.HTTP_400_BAD_REQUEST)

        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len
        )
        chunks = text_splitter.split_text(text)

        try:
            embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
            vectorstore = FAISS.from_texts(chunks, embedding=embeddings)
            faiss_dir = os.path.join(settings.BASE_DIR, 'faiss_indexes')
            os.makedirs(faiss_dir, exist_ok=True)
            index_path = os.path.join(faiss_dir, f"doc_{document.id}")
            vectorstore.save_local(index_path)
            document.faiss_index_path = index_path
            document.save()
        except Exception as e:
            return Response({"error": f"Error generating embeddings or saving FAISS: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class DocumentDetailView(generics.RetrieveDestroyAPIView):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer


class MessageListView(generics.ListAPIView):
    serializer_class = MessageSerializer
    def get_queryset(self):
        doc_id = self.kwargs['pk']
        return Message.objects.filter(document_id=doc_id).order_by('timestamp')


class GlobalMessageListView(generics.ListAPIView):
    serializer_class = MessageSerializer
    def get_queryset(self):
        return Message.objects.filter(document__isnull=True).order_by('timestamp')


class ChatView(APIView):
    def post(self, request, pk):
        try:
            document = Document.objects.get(pk=pk)
        except Document.DoesNotExist:
            return Response({"error": "Document not found"}, status=status.HTTP_404_NOT_FOUND)

        user_content = request.data.get('message')
        if not user_content:
            return Response({"error": "Message is required"}, status=status.HTTP_400_BAD_REQUEST)

        Message.objects.create(document=document, role='user', content=user_content)
        ai_response_content = ""

        try:
            if document.faiss_index_path and os.path.exists(document.faiss_index_path):
                embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
                vectorstore = FAISS.load_local(
                    document.faiss_index_path,
                    embeddings,
                    allow_dangerous_deserialization=True
                )

                docs = vectorstore.similarity_search(user_content, k=6)
                context = "\n\n".join([doc.page_content for doc in docs])

                # Get chat memory (last 6 messages) excluding the one just created
                history_msgs = Message.objects.filter(document=document).exclude(id=Message.objects.filter(document=document).last().id).order_by('-timestamp')[:6]
                chat_history = []
                for msg in reversed(history_msgs):
                    if msg.role == 'user':
                        chat_history.append(HumanMessage(content=msg.content))
                    else:
                        chat_history.append(AIMessage(content=msg.content))

                sys_prompt = f"""You are a helpful AI document analyzer. Use the provided context to answer the user's questions. You may make logical inferences to identify names, roles, or concepts based on the format of the text (e.g., identifying the top name as a candidate or author). If you truly cannot find the answer, state that.
Context:
{context}
"""
                chat_history.insert(0, SystemMessage(content=sys_prompt))
                chat_history.append(HumanMessage(content=user_content))

                llm = ChatGroq(
                    model_name="llama-3.1-8b-instant",
                    temperature=0,
                    api_key=os.getenv("GROQ_API_KEY")
                )

                response = llm.invoke(chat_history)
                ai_response_content = response.content

            else:
                ai_response_content = "Document not processed yet."

        except Exception as e:
            print("❌ Groq Error:", e)
            if 'context' in locals():
                ai_response_content = f"⚠️ AI model unavailable (API issue)\n\n📄 Retrieved answer from document:\n{context}"
                db_response_content = "⚠️ AI generation failed."
            else:
                ai_response_content = "Error generating response."
                db_response_content = ai_response_content

        assistant_msg = Message.objects.create(
            document=document,
            role='assistant',
            content=db_response_content if 'db_response_content' in locals() else ai_response_content
        )

        return Response(MessageSerializer(assistant_msg).data, status=status.HTTP_200_OK)


class GlobalChatView(APIView):
    def post(self, request):
        user_content = request.data.get('message')
        if not user_content:
            return Response({"error": "Message is required"}, status=status.HTTP_400_BAD_REQUEST)

        Message.objects.create(document=None, role='user', content=user_content)
        ai_response_content = ""
        context = ""

        try:
            documents = Document.objects.all()
            embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
            all_docs = []
            
            for document in documents:
                if document.faiss_index_path and os.path.exists(document.faiss_index_path):
                    try:
                        vectorstore = FAISS.load_local(document.faiss_index_path, embeddings, allow_dangerous_deserialization=True)
                        docs = vectorstore.similarity_search(user_content, k=3)  # top 3 per doc
                        for d in docs:
                            all_docs.append(f"[Source: {document.title}]\n{d.page_content}")
                    except Exception as e:
                        print(f"Error loading FAISS for {document.title}: {e}")
            
            if all_docs:
                context = "\n\n---\n\n".join(all_docs[:8]) # limit to 8 to avoid Groq Token Limits

            # Get global chat memory (last 6 messages)
            history_msgs = Message.objects.filter(document__isnull=True).exclude(id=Message.objects.filter(document__isnull=True).last().id).order_by('-timestamp')[:6]
            chat_history = []
            for msg in reversed(history_msgs):
                if msg.role == 'user':
                    chat_history.append(HumanMessage(content=msg.content))
                else:
                    chat_history.append(AIMessage(content=msg.content))

            sys_prompt = f"""You are a helpful AI document analyzer with access to a global knowledge base.
Use the provided context to answer the user's questions. You are encouraged to make logical structural inferences from the text (e.g., inferring that a name at the top of a document is the author or candidate). Always include citations to the [Source: ...] directly in your text when extracting facts. If the necessary information isn't in the context, say "I don't definitively know based on the provided documents."

Global Context:
{context}
"""
            chat_history.insert(0, SystemMessage(content=sys_prompt))
            chat_history.append(HumanMessage(content=user_content))

            llm = ChatGroq(
                model_name="llama-3.1-8b-instant",
                temperature=0,
                api_key=os.getenv("GROQ_API_KEY")
            )

            response = llm.invoke(chat_history)
            ai_response_content = response.content

        except Exception as e:
            print("❌ Groq Error (Global):", e)
            if 'context' in locals() and context:
                ai_response_content = f"⚠️ AI model unavailable.\n\nRetrieved answer from documents:\n{context}"
                db_response_content = "⚠️ AI generation failed."
            else:
                ai_response_content = "Error generating response and no context found."
                db_response_content = ai_response_content

        assistant_msg = Message.objects.create(
            document=None,
            role='assistant',
            content=db_response_content if 'db_response_content' in locals() else ai_response_content
        )

        return Response(MessageSerializer(assistant_msg).data, status=status.HTTP_200_OK)