import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Bot, Check, ChevronLeft, CircleAlert, Copy, FileText, LoaderCircle, Menu, MessageSquarePlus, PanelLeftClose, Paperclip, Plus, Sparkles, UploadCloud, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import './index.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const suggestions = [
  { title: 'Summarize this document', detail: 'Get the key ideas in seconds', prompt: 'Summarize the main points of the document.' },
  { title: 'Find important details', detail: 'Extract facts and insights', prompt: 'What are the most important details in this document?' },
  { title: 'Explain a concept', detail: 'Make complex topics simple', prompt: 'Explain the main concepts in simple language.' },
  { title: 'Create a quick overview', detail: 'Understand the big picture', prompt: 'Give me a structured overview of this document.' },
];

export default function App() {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connection, setConnection] = useState('connecting');
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const fileInputRef = useRef(null);
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const uploadLock = useRef(false);
  const activeSessionRef = useRef(null);

  useEffect(() => { startSession(); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  async function startSession() {
    setConnection('connecting');
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/session`);
      if (!res.ok) throw new Error('Unable to create a session');
      const data = await res.json();
      activeSessionRef.current = data.session_id;
      setSessionId(data.session_id);
      setConnection('connected');
      return data.session_id;
    } catch (err) {
      setConnection('offline');
      setError('Cannot connect to the API. Make sure FastAPI is running on port 8000.');
      return null;
    }
  }

  async function newChat() {
    if (loading || uploading) return;
    activeSessionRef.current = null;
    setSessionId(null);
    setMessages([]);
    setFiles([]);
    setInput('');
    setSidebarOpen(false);
    await startSession();
  }

  async function uploadFile(file) {
    if (!file || uploadLock.current) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) { setError('Please select a PDF file.'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('Please choose a PDF smaller than 10 MB.'); return; }
    if (!sessionId) { setError('Connect to the backend before uploading.'); return; }
    uploadLock.current = true;
    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('session_id', sessionId);
      form.append('file', file);
      const res = await fetch(`${API_URL}/api/upload`, { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Document upload failed');
      if (activeSessionRef.current !== sessionId) return;
      setFiles(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, name: file.name, size: file.size }]);
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'notice', content: `${file.name} added to your knowledge base.` }]);
      setSidebarOpen(false);
    } catch (err) { setError(err.message || 'Upload failed.'); }
    finally { uploadLock.current = false; setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  }

  async function sendMessage(event, suggestedText) {
    event?.preventDefault();
    const text = (suggestedText ?? input).trim();
    if (!text || !sessionId || loading) return;
    const currentSession = sessionId;
    const history = messages.filter(m => m.role === 'assistant' || m.role === 'user').map(m => ({ role: m.role, content: m.content }));
    const userMessage = { id: crypto.randomUUID(), role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: currentSession, message: text, history }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Could not generate a response');
      if (activeSessionRef.current !== currentSession) return;
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: data.response }]);
    } catch (err) { setError(err.message || 'Something went wrong. Please try again.'); }
    finally { setLoading(false); inputRef.current?.focus(); }
  }

  async function copyText(id, content) {
    try { await navigator.clipboard.writeText(content); setCopiedId(id); setTimeout(() => setCopiedId(null), 1800); }
    catch { setError('Could not copy the response.'); }
  }

  return (
    <div className={`workspace ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {sidebarOpen && <button className="mobile-backdrop" aria-label="Close menu" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-top">
          <div className="brand"><div className="brand-mark"><Sparkles size={19} /></div><div><strong>DocuMind</strong><span>AI DOCUMENT ASSISTANT</span></div></div>
          <button className="icon-btn mobile-close" aria-label="Close menu" onClick={() => setSidebarOpen(false)}><X size={19}/></button>
        </div>
        <button className="new-chat" onClick={newChat} disabled={loading || uploading}><MessageSquarePlus size={18}/> New conversation <Plus size={16} className="new-plus"/></button>
        <div className="sidebar-section-head"><span>YOUR KNOWLEDGE</span><span className="count">{files.length}</span></div>
        <button className={`upload-card ${dragging ? 'dragging' : ''}`} disabled={uploading || !sessionId} onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); uploadFile(e.dataTransfer.files?.[0]); }}>
          <div className="upload-icon">{uploading ? <LoaderCircle size={21} className="spin"/> : <UploadCloud size={21}/>}</div>
          <strong>{uploading ? 'Processing PDF…' : 'Upload a PDF'}</strong><span>Click or drag a document here</span><small>PDF files · Max 10 MB</small>
        </button>
        <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" hidden onChange={e => uploadFile(e.target.files?.[0])}/>
        <div className="document-list">
          {files.length === 0 ? <div className="no-documents"><FileText size={20}/><span>No documents uploaded yet</span></div> : files.map(file => (
            <div className="document" key={file.id} title={file.name}><div className="pdf-icon"><FileText size={17}/></div><div className="document-details"><strong>{file.name}</strong><span>{(file.size / 1024 / 1024).toFixed(2)} MB · Ready</span></div><Check size={15} className="file-check"/></div>
          ))}
        </div>
        <div className="sidebar-bottom"><div className="privacy-note"><Sparkles size={16}/><span>Ask questions grounded in your documents.</span></div><div className="sidebar-credit">Built with React + FastAPI + RAG</div></div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-left"><button className="icon-btn mobile-menu" aria-label="Open menu" onClick={() => setSidebarOpen(true)}><Menu size={21}/></button><button className="icon-btn desktop-toggle" aria-label="Toggle sidebar" onClick={() => setSidebarCollapsed(v => !v)}>{sidebarCollapsed ? <Menu size={20}/> : <PanelLeftClose size={20}/>}</button><div className="topbar-title"><strong>Document chat</strong><span>AI-powered knowledge workspace</span></div></div>
          <div className={`connection-pill ${connection}`}><span className="status-dot"/>{connection === 'connected' ? 'Connected' : connection === 'connecting' ? 'Connecting' : 'Offline'}</div>
        </header>

        <div className="conversation-scroll">
          <div className="conversation-inner">
            {messages.length === 0 ? <div className="welcome">
              <div className="hero-icon"><Sparkles size={28}/></div><div className="eyebrow">YOUR AI RESEARCH COMPANION</div>
              <h1>Understand your documents.<br/><span>Find answers faster.</span></h1>
              <p>Upload a PDF, ask a question, and explore your content with an intelligent assistant that keeps the conversation focused on your documents.</p>
              <div className="suggestions">{suggestions.map(item => <button key={item.title} className="suggestion" disabled={!sessionId || loading} onClick={() => sendMessage(null, item.prompt)}><span className="suggestion-icon"><Sparkles size={16}/></span><span><strong>{item.title}</strong><small>{item.detail}</small></span><ChevronLeft size={16} className="suggestion-arrow"/></button>)}</div>
              <div className="welcome-hint"><Paperclip size={15}/> Start by uploading a PDF from the sidebar</div>
            </div> : <div className="messages">
              {messages.map(message => message.role === 'notice' ? <div className="system-notice" key={message.id}><Check size={15}/>{message.content}</div> : <div className={`message ${message.role}`} key={message.id}>
                <div className={`message-avatar ${message.role === 'assistant' ? 'assistant-avatar' : ''}`}>{message.role === 'assistant' ? <Sparkles size={17}/> : 'You'}</div>
                <div className="message-content"><div className="message-author">{message.role === 'assistant' ? 'DocuMind AI' : 'You'}</div><div className="message-text">{message.role === 'assistant' ? <ReactMarkdown>{message.content}</ReactMarkdown> : message.content}</div>{message.role === 'assistant' && <button className="copy-btn" onClick={() => copyText(message.id, message.content)}>{copiedId === message.id ? <Check size={14}/> : <Copy size={14}/>} {copiedId === message.id ? 'Copied' : 'Copy response'}</button>}</div>
              </div>)}
              {loading && <div className="message assistant"><div className="message-avatar assistant-avatar"><Sparkles size={17}/></div><div className="message-content"><div className="message-author">DocuMind AI</div><div className="thinking"><span/><span/><span/> Thinking about your question…</div></div></div>}
              <div ref={endRef}/>
            </div>}
          </div>
        </div>
        <div className="composer-area">
          {error && <div className="error-banner" role="alert"><CircleAlert size={17}/><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error"><X size={16}/></button></div>}
          <form className="composer" onSubmit={sendMessage}><button type="button" className="attach-btn" title="Upload PDF" aria-label="Upload PDF" disabled={!sessionId || uploading} onClick={() => fileInputRef.current?.click()}><Paperclip size={20}/></button><textarea ref={inputRef} rows={1} placeholder={sessionId ? 'Ask anything about your documents…' : 'Connecting to your workspace…'} value={input} disabled={!sessionId || loading} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e); } }}/><button className="send-btn" type="submit" aria-label="Send message" disabled={!input.trim() || !sessionId || loading}>{loading ? <LoaderCircle size={18} className="spin"/> : <ArrowUp size={19}/>}</button></form>
          <div className="composer-footnote">AI can make mistakes. Verify important information in the original PDF.</div>
        </div>
      </main>
    </div>
  );
}
