from rest_framework import serializers
from .models import Document, Message

class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ['id', 'title', 'file', 'uploaded_at', 'faiss_index_path']
        read_only_fields = ['faiss_index_path']

class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ['id', 'document', 'role', 'content', 'timestamp']
