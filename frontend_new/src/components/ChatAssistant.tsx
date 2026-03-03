import { Send, Mic, Bot, User, ChevronRight, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Message } from '../types';
import { sendChatMessage } from '../api';
import { useAuth } from '../AuthContext';

const INITIAL_MESSAGES: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content: 'Namaste! I am Prahar, your assistant for government schemes. I can help you find scholarships, grants, and benefits tailored to your profile.\n\nSign in to get personalized recommendations, or ask me anything!',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    suggestions: ['Schemes for students', 'PM-KISAN eligibility', 'Scholarships for women', 'Show all schemes'],
  },
];

export default function ChatAssistant() {
  const { isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (text?: string) => {
    const content = (text || input).trim();
    if (!content || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.slice(-6).map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));

      const data = await sendChatMessage(content, history);

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || 'I could not process that. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: data.suggestions,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble connecting to the server. Please check your connection and try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: ['Try again', 'Show all schemes'],
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background-light">
      {/* Header */}
      <header className="bg-white p-4 border-b border-primary/10 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
            <Bot className="size-6" />
          </div>
          <div>
            <h1 className="font-bold text-primary">Prahar AI</h1>
            <div className="flex items-center gap-1">
              <span className="size-2 bg-green-500 rounded-full" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Online</span>
            </div>
          </div>
        </div>
        <button className="flex items-center gap-1 px-3 py-1.5 bg-primary/5 rounded-full text-primary text-xs font-bold">
          <Sparkles className="size-3" />
          English
        </button>
        {!isAuthenticated && (
          <span className="bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
            <AlertCircle className="size-3" />
            Sign in for personal results
          </span>
        )}
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`size-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'assistant' ? 'bg-primary text-white' : 'bg-slate-200 text-slate-600'
            }`}>
              {msg.role === 'assistant' ? <Bot className="size-5" /> : <User className="size-5" />}
            </div>
            
            <div className={`max-w-[80%] space-y-2 ${msg.role === 'user' ? 'items-end' : ''}`}>
              <div className={`p-4 rounded-2xl shadow-sm ${
                msg.role === 'assistant' 
                ? 'bg-white text-slate-700 rounded-tl-none' 
                : 'bg-primary text-white rounded-tr-none'
              }`}>
                <p className="text-sm leading-relaxed">{msg.content}</p>
                
                {msg.schemes && (
                  <div className="mt-4 space-y-3">
                    {msg.schemes.map(s => (
                      <div key={s.id} className="bg-white border border-primary/10 p-4 rounded-xl shadow-sm">
                        <h4 className="font-bold text-primary text-sm">{s.title}</h4>
                        <p className="text-xs text-slate-500 mt-1">{s.eligibility}</p>
                        <button className="mt-3 text-primary text-xs font-bold flex items-center gap-1 hover:underline">
                          View Details
                          <ChevronRight className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block px-1">
                {msg.timestamp}
              </span>
              
              {msg.suggestions && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {msg.suggestions.map((s, i) => (
                    <button 
                      key={i}
                      onClick={() => handleSend(s)}
                      disabled={loading}
                      className="px-4 py-2 bg-white border border-primary/10 rounded-full text-xs font-medium text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex gap-3">
            <div className="size-8 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
              <Bot className="size-5" />
            </div>
            <div className="bg-white rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center gap-2">
              <Loader2 className="size-4 text-primary animate-spin" />
              <span className="text-sm text-slate-500">Prahar is thinking…</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />

      </main>

      {/* Input Area */}
      <footer className="p-4 bg-white border-t border-primary/10 pb-24">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="flex-1 relative flex items-center bg-slate-100 rounded-2xl">
            <input 
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Ask Prahar…"
              disabled={loading}
              className="w-full bg-transparent border-none focus:ring-0 py-4 pl-6 pr-14 text-sm outline-none"
            />
            <button 
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="absolute right-3 p-2 text-primary hover:bg-primary/10 rounded-xl transition-colors disabled:opacity-40"
            >
              <Send className="size-5" />
            </button>
          </div>
          <button className="size-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all">
            <Mic className="size-6" />
          </button>
        </div>
        <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-4">
          Powered by Digital India
        </p>
      </footer>
    </div>
  );
}
