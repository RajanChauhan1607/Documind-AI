import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Upload, FileText, Send, Loader2, MessageSquare, Plus, Globe } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

function App() {
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isGlobalChat, setIsGlobalChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    if (isGlobalChat) {
      fetchMessages(null, true);
    } else if (selectedDoc) {
      fetchMessages(selectedDoc.id, false);
    } else {
      setMessages([]);
    }
  }, [selectedDoc, isGlobalChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchDocuments = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/documents/`);
      setDocuments(res.data);
    } catch (error) {
      console.error("Failed to fetch documents", error);
    }
  };

  const fetchMessages = async (docId, global = false) => {
    setIsLoadingChats(true);
    try {
      const url = global ? `${API_BASE_URL}/chat/global/messages/` : `${API_BASE_URL}/documents/${docId}/messages/`;
      const res = await axios.get(url);
      setMessages(res.data);
    } catch (error) {
      console.error("Failed to fetch messages", error);
    } finally {
      setIsLoadingChats(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name);

    setIsUploading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/documents/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setDocuments([res.data, ...documents]);
      setSelectedDoc(res.data);
      setIsGlobalChat(false);
    } catch (error) {
      console.error("Failed to upload document", error);
      alert(error.response?.data?.error || "Failed to upload document.");
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || (!selectedDoc && !isGlobalChat)) return;

    const userMessage = { role: 'user', content: inputMessage, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMessage]);
    const messageToSend = inputMessage;
    setInputMessage('');
    setIsSending(true);

    try {
      const url = isGlobalChat ? `${API_BASE_URL}/chat/global/` : `${API_BASE_URL}/documents/${selectedDoc.id}/chat/`;
      const res = await axios.post(url, {
        message: messageToSend
      });
      setMessages(prev => [...prev, res.data]);
    } catch (error) {
      console.error("Failed to send message", error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error: Could not connect to AI service.', timestamp: new Date().toISOString() }]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans selection:bg-indigo-500/30">
      
      {/* Sidebar */}
      <aside className="w-80 border-r border-slate-800 bg-slate-900 flex flex-col transition-all duration-300 z-20">
        <div className="p-6">
          <div className="flex items-center gap-3 text-indigo-400 mb-8">
            <div className="bg-indigo-500/10 p-2 rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-50">DocuMind AI</h1>
          </div>
          
          <label className="group items-center justify-center flex w-full p-4 border-2 border-dashed border-slate-700/50 rounded-2xl cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all duration-300 overflow-hidden relative">
             <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} disabled={isUploading} />
             {isUploading ? (
               <div className="flex items-center gap-2 text-indigo-400">
                 <Loader2 className="w-5 h-5 animate-spin" />
                 <span className="font-medium text-sm">Processing PDF...</span>
               </div>
             ) : (
               <div className="flex flex-col items-center gap-2 text-slate-400">
                 <div className="bg-slate-800 p-3 rounded-full group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-colors">
                    <Plus className="w-5 h-5" />
                 </div>
                 <span className="text-sm font-medium">Upload Document</span>
                 <span className="text-xs text-slate-500">PDFs up to 20MB</span>
               </div>
             )}
          </label>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-4 pb-4">
          {documents.length > 0 && (
             <button
             onClick={() => {
               setSelectedDoc(null);
               setIsGlobalChat(true);
             }}
             className={`flex items-center gap-3 w-full text-left p-3 mb-6 rounded-xl transition-all duration-200 border ${isGlobalChat ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 ring-1 ring-indigo-500/20' : 'bg-slate-800/50 hover:bg-slate-800 text-slate-300 border-slate-700/50'}`}
           >
             <Globe className={`w-4 h-4 shrink-0 ${isGlobalChat ? 'text-indigo-400' : 'text-slate-500'}`} />
             <span className="truncate text-sm font-bold">Global Search</span>
           </button>
          )}

          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 pl-2">Your Documents</h2>
          <div className="flex flex-col gap-1.5">
            {documents.map(doc => (
              <button
                key={doc.id}
                onClick={() => {
                  setSelectedDoc(doc);
                  setIsGlobalChat(false);
                }}
                className={`flex items-center gap-3 w-full text-left p-3 rounded-xl transition-all duration-200 ${selectedDoc?.id === doc.id ? 'bg-indigo-500/10 text-indigo-300 ring-1 ring-indigo-500/20' : 'hover:bg-slate-800 text-slate-300'}`}
              >
                <FileText className={`w-4 h-4 shrink-0 ${selectedDoc?.id === doc.id ? 'text-indigo-400' : 'text-slate-500'}`} />
                <span className="truncate text-sm font-medium">{doc.title}</span>
              </button>
            ))}
            {documents.length === 0 && !isUploading && (
              <div className="text-center p-4 text-sm text-slate-500 border border-slate-800 border-dashed rounded-xl m-2">
                No documents uploaded yet.
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col bg-slate-950 relative overflow-hidden">
        {selectedDoc || isGlobalChat ? (
          <>
            {/* Header */}
            <header className="h-16 px-6 border-b border-slate-800/60 bg-slate-900/50 backdrop-blur-sm flex items-center shrink-0 z-10 sticky top-0">
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                    {isGlobalChat ? <Globe className="w-4 h-4 text-indigo-400" /> : <FileText className="w-4 h-4 text-indigo-400" />}
                 </div>
                 <div>
                    <h2 className="text-sm font-semibold text-slate-200 truncate max-w-xl">
                      {isGlobalChat ? "Global Knowledge Base" : selectedDoc.title}
                    </h2>
                    <p className="text-xs text-slate-500 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {isGlobalChat ? "Searching all indexed documents" : "Index Ready"}
                    </p>
                 </div>
               </div>
            </header>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin flex flex-col gap-6 relative">
              {isLoadingChats ? (
                 <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                 </div>
              ) : messages.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4 opacity-50">
                    <MessageSquare className="w-16 h-16" />
                    <p className="text-lg font-medium">
                      {isGlobalChat ? "Ask any question across all your uploaded PDFs" : "Ask any question about this document"}
                    </p>
                 </div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={msg.id || idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-slate-800 text-slate-200 rounded-bl-sm border border-slate-700/50'}`}>
                      <div className="whitespace-pre-wrap leading-relaxed text-[15px]">{msg.content}</div>
                    </div>
                  </div>
                ))
              )}
              {isSending && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-2xl p-4 bg-slate-800 text-slate-300 rounded-bl-sm border border-slate-700/50 flex gap-1.5 items-center">
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <div className="p-4 bg-slate-900/80 backdrop-blur-md border-t border-slate-800/60 z-10">
              <form onSubmit={sendMessage} className="max-w-4xl mx-auto relative flex items-center">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={isGlobalChat ? "Search across all documents..." : `Ask a question about ${selectedDoc.title}...`}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-full py-4 pl-6 pr-14 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all text-slate-100 placeholder-slate-500 shadow-inner block"
                  disabled={isSending}
                />
                <button
                  type="submit"
                  disabled={isSending || !inputMessage.trim()}
                  className="absolute right-2 p-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <Send className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
              </form>
              <p className="text-center text-[10px] text-slate-600 mt-2 font-medium">AI generated memory persists per document layer. Verify important information.</p>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center max-w-sm mx-auto">
            <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl rotate-12 mb-6 flex items-center justify-center shadow-2xl shadow-indigo-500/5 ring-1 ring-indigo-500/20">
               <FileText className="w-10 h-10 text-indigo-400 -rotate-12" />
            </div>
            <h2 className="text-2xl font-bold text-slate-200 mb-2">Welcome to DocuMind</h2>
            <p className="text-slate-500 mb-8 mt-2 text-sm leading-relaxed">Upload a PDF document to start analyzing, extracting information, and asking AI questions about the content.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
