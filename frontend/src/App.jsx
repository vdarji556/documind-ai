import { useState, useRef, useEffect } from 'react';
import { Send, Upload, FileCheck, Loader2, ShieldCheck, Menu, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import brandData from '../branding.json';
import './index.css';

// For local dev, Vite runs on 5173, FastAPI on 8000
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function App() {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle, uploading, success, error
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize Session
  useEffect(() => {
    async function initSession() {
      try {
        const res = await fetch(`${API_URL}/api/session`);
        const data = await res.json();
        setSessionId(data.session_id);
        
        // Add welcome message
        setMessages([
          { 
            id: 1, 
            role: 'assistant', 
            content: 'Hello! I am ready to answer questions about the Model Context Protocol (MCP) document. You can also upload your own PDF in the sidebar to add knowledge to this session.' 
          }
        ]);
      } catch (err) {
        console.error("Failed to initialize session:", err);
        setMessages([
          { id: 1, role: 'assistant', content: '⚠️ Error connecting to the RAG backend. Please ensure the FastAPI server is running.' }
        ]);
      }
    }
    initSession();
  }, []);


  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !sessionId) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert("Only PDF files are supported");
      return;
    }

    setUploadStatus('uploading');
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('session_id', sessionId);

    try {
      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setUploadStatus('success');
        setMessages(prev => [...prev, { 
          id: Date.now(), 
          role: 'assistant', 
          content: `✅ Successfully processed **${file.name}**. I can now answer questions about it!` 
        }]);
      } else {
        throw new Error(data.detail || "Upload failed");
      }
    } catch (err) {
      console.error(err);
      setUploadStatus('error');
      alert(err.message);
    }
    
    // reset input
    e.target.value = null;
    
    // revert to idle after 3s
    setTimeout(() => {
      if (uploadStatus !== 'uploading') setUploadStatus('idle');
    }, 3000);
  };


  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !sessionId || isLoading) return;

    const userMsg = { id: Date.now(), role: 'user', content: inputMessage.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Pass only role and content to match Backend expected schema
      const historyPayload = messages.map(m => ({ role: m.role, content: m.content }));

      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          message: userMsg.content,
          history: historyPayload
        })
      });

      if (!res.ok) throw new Error('Failed to get response');

      const data = await res.json();
      
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        role: 'assistant', 
        content: data.response 
      }]);
      
    } catch (error) {
      console.error("Chat Error:", error);
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        role: 'assistant', 
        content: 'Sorry, I encountered an error processing your request.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="app-container">
      {/* Mobile Header */}
      <div className="mobile-header">
        <img src={brandData.brand.logo.title} alt="Logo" className="mobile-logo" />
        <button className="menu-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Overlay */}
      {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}
      
      {/* Sidebar Panel */}
      <div className={`sidebar glass-panel ${isSidebarOpen ? 'open' : ''}`}>
        <div className="brand">
          <img src={brandData.brand.logo.title} alt="HERE AND NOW AI Logo" className="brand-logo" />
          <div className="brand-slogan">{brandData.brand.slogan}</div>
        </div>

        <div style={{ marginTop: '20px' }}>
          <h3 style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '16px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Add Knowledge
          </h3>
          
          <div 
            className="upload-zone"
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".pdf" 
            />
            
            {uploadStatus === 'idle' && (
              <>
                <Upload size={32} className="upload-icon" />
                <p style={{ fontSize: '0.9rem', color: '#c0c8d4' }}>Click to upload PDF</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>Limit ~10MB</p>
              </>
            )}

            {uploadStatus === 'uploading' && (
              <>
                <Loader2 size={32} className="upload-icon" style={{ animation: 'spin 1s linear infinite' }} />
                <p style={{ fontSize: '0.9rem', color: '#c0c8d4' }}>Processing document...</p>
              </>
            )}

            {uploadStatus === 'success' && (
              <>
                <FileCheck size={32} style={{ color: '#10b981', marginBottom: '12px' }} />
                <p style={{ fontSize: '0.9rem', color: '#10b981' }}>Upload complete!</p>
              </>
            )}

            {uploadStatus === 'error' && (
              <>
                <p style={{ fontSize: '0.9rem', color: '#ef4444' }}>Upload failed</p>
              </>
            )}
          </div>
        </div>

        <div className="app-description">
          <h3>About This App</h3>
          <p>
            An Enterprise RAG Chatbot designed to interact intelligently with your documents.
          </p>
          
          <h4>How to Use</h4>
          <p>
            Upload a PDF using the zone above and start asking context-specific questions to extract insights instantly.
          </p>

          <h4>Key Benefits</h4>
          <div className="benefit-card">
            <ShieldCheck size={20} className="benefit-icon" />
            <div className="benefit-text">
              <strong>100% Private & Secure</strong>
              <span>Your data stays only with you. It never leaves your enterprise or your machine.</span>
            </div>
          </div>
        </div>
        
        <div className="sidebar-footer">
          <div className="social-links">
            {Object.entries(brandData.brand.socialMedia).map(([key, url]) => (
              <a key={key} href={url} target="_blank" rel="noopener noreferrer" className="social-link" title={key}>
                {key}
              </a>
            ))}
          </div>
          <div className="contact-info">
            <a href={`mailto:${brandData.brand.email}`}>{brandData.brand.email}</a>
            <a href={`tel:${brandData.brand.mobile.replace(/\s/g, '')}`}>{brandData.brand.mobile}</a>
          </div>
          <div className="session-id">
            Session ID: {sessionId ? `${sessionId.substring(0,8)}...` : 'Connecting...'}
          </div>
        </div>
      </div>

      {/* Main Chat Panel */}
      <div className="chat-container glass-panel">
        <div className="chat-history">
          {messages.map((msg) => (
            <div key={msg.id} className={`message-wrapper ${msg.role === 'assistant' ? 'bot' : 'user'}`}>
              <div 
                className="avatar"
                style={msg.role === 'assistant' ? { backgroundImage: `url(${brandData.brand.chatbot.face})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
              >
                {msg.role === 'user' ? 'U' : ''}
              </div>
              <div className="message-bubble">
                {msg.role === 'user' ? (
                  msg.content
                ) : (
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="message-wrapper bot">
              <div 
                className="avatar"
                style={{ backgroundImage: `url(${brandData.brand.chatbot.face})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
              ></div>
              <div className="message-bubble" style={{ minWidth: '60px' }}>
                <div className="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <form className="input-area" onSubmit={handleSendMessage}>
          <input
            type="text"
            className="chat-input"
            placeholder="Ask me anything about the document..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={!sessionId || isLoading}
          />
          <button 
            type="submit" 
            className="send-btn"
            disabled={!inputMessage.trim() || !sessionId || isLoading}
          >
            <Send size={18} />
          </button>
        </form>
      </div>

    </div>
  );
}

export default App;
