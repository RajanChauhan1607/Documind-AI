from django.urls import path
from .views import DocumentListCreateView, DocumentDetailView, MessageListView, ChatView, GlobalMessageListView, GlobalChatView

urlpatterns = [
    path('documents/', DocumentListCreateView.as_view(), name='document-list'),
    path('documents/<int:pk>/', DocumentDetailView.as_view(), name='document-detail'),
    path('documents/<int:pk>/messages/', MessageListView.as_view(), name='message-list'),
    path('documents/<int:pk>/chat/', ChatView.as_view(), name='document-chat'),
    path('chat/global/messages/', GlobalMessageListView.as_view(), name='global-message-list'),
    path('chat/global/', GlobalChatView.as_view(), name='global-chat'),
]
