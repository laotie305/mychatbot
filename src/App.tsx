import React, { useState, useEffect, useRef } from "react";
import { 
  Send, 
  Settings as SettingsIcon, 
  Trash2, 
  Cpu, 
  HelpCircle, 
  Sparkles,
  Bot,
  User,
  Copy,
  Check,
  RotateCcw,
  AlertCircle
} from "lucide-react";
import { Sidebar } from "./components/Sidebar";
import { SettingsModal } from "./components/SettingsModal";
import { MarkdownRenderer } from "./components/MarkdownRenderer";
import { ChatSession, Message, ApiStatus } from "./types";

const LOCAL_STORAGE_KEY = "custom_chatbot_sessions";
const DEFAULT_SYSTEM_PROMPT = "You are a helpful, professional, and friendly AI chatbot assistant. Always format your responses cleanly with markdown where applicable.";

const QUICK_STARTERS = [
  {
    title: "Draft an Email",
    prompt: "Draft a polite email to my team announcing a project launch this Friday. Keep it inspiring yet professional.",
    desc: "Announce a launch successfully"
  },
  {
    title: "Explain Complex Topic",
    prompt: "Explain how Quantum Computing works in simple terms that a 10-year-old can easily understand.",
    desc: "Break down physics simply"
  },
  {
    title: "Translate a Phrase",
    prompt: "Translate the phrase 'Quality is not an act, it is a habit' into Spanish, French, and Chinese with pronounciation guides.",
    desc: "Multi-language translations"
  },
  {
    title: "Code Assistant",
    prompt: "Write a high-performance TypeScript function to debounce an API call, and explain how it prevents race conditions.",
    desc: "Generate optimized code"
  }
];

export default function App() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Error reading from localStorage:", e);
    }
    
    // Default initial session if none found
    const initialSession: ChatSession = {
      id: "session-1",
      title: "First Chat",
      messages: [],
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    return [initialSession];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return sessions[0]?.id || "session-1";
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Find the currently active session
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  // Fetch server API status on mount
  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const response = await fetch("/api/health");
        if (response.ok) {
          const data = await response.json();
          setApiStatus(data);
        }
      } catch (error) {
        console.error("Failed to fetch API health status:", error);
      }
    };
    checkApiStatus();
  }, []);

  // Save sessions to localStorage whenever sessions change
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  // Scroll to bottom when messages list grows
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages?.length, loading]);

  // Handle auto-growing textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  // Create new session helper
  const handleNewSession = () => {
    const newSessionId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newSessionId,
      title: `New Chat ${sessions.length + 1}`,
      messages: [],
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSessionId);
  };

  // Delete session helper
  const handleDeleteSession = (idToDelete: string) => {
    if (sessions.length <= 1) {
      // Keep at least one session
      const resetSession: ChatSession = {
        id: `session-${Date.now()}`,
        title: "New Conversation",
        messages: [],
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      setSessions([resetSession]);
      setActiveSessionId(resetSession.id);
      return;
    }

    const filtered = sessions.filter(s => s.id !== idToDelete);
    setSessions(filtered);
    
    if (activeSessionId === idToDelete) {
      setActiveSessionId(filtered[0].id);
    }
  };

  // Rename session helper
  const handleRenameSession = (idToRename: string, newTitle: string) => {
    setSessions(prev =>
      prev.map(s => (s.id === idToRename ? { ...s, title: newTitle, updatedAt: Date.now() } : s))
    );
  };

  // Save custom system prompt
  const handleSaveSystemPrompt = (newPrompt: string) => {
    setSessions(prev =>
      prev.map(s => (s.id === activeSessionId ? { ...s, systemPrompt: newPrompt, updatedAt: Date.now() } : s))
    );
  };

  // Handle message sending
  const handleSendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || loading) return;

    setGlobalError(null);
    setInput("");

    // Create user message
    const userMessage: Message = {
      id: `msg-user-${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: Date.now()
    };

    // Update session state locally first (Optimistic rendering)
    let updatedMessages = [...activeSession.messages, userMessage];
    
    // Auto rename empty sessions based on first question
    let newTitle = activeSession.title;
    if (activeSession.messages.length === 0) {
      newTitle = trimmed.length > 25 ? `${trimmed.substring(0, 22)}...` : trimmed;
    }

    setSessions(prev =>
      prev.map(s =>
        s.id === activeSessionId
          ? {
              ...s,
              title: newTitle,
              messages: updatedMessages,
              updatedAt: Date.now()
            }
          : s
      )
    );

    setLoading(true);

    try {
      // Map local messages to server proxy format { role: 'user' | 'model', content: string }
      const apiPayloadMessages = updatedMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiPayloadMessages,
          systemInstruction: activeSession.systemPrompt
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: `msg-assistant-${Date.now()}`,
        role: "model",
        content: data.text,
        timestamp: Date.now()
      };

      setSessions(prev =>
        prev.map(s =>
          s.id === activeSessionId
            ? {
                ...s,
                messages: [...updatedMessages, assistantMessage],
                updatedAt: Date.now()
              }
            : s
        )
      );
    } catch (err: any) {
      console.error("Error communicating with chat API:", err);
      setGlobalError(err.message || "Could not connect to the proxy service. Please check your configurations.");
    } finally {
      setLoading(false);
    }
  };

  // Key press listener on input textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(input);
    }
  };

  // Copy individual message handler (satisfies copy results requirement)
  const handleCopyMessage = (msgId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(msgId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  // Reset current chat logs
  const handleResetCurrentChat = () => {
    if (window.confirm("Are you sure you want to clear this conversation's history?")) {
      setSessions(prev =>
        prev.map(s => (s.id === activeSessionId ? { ...s, messages: [], updatedAt: Date.now() } : s))
      );
      setGlobalError(null);
    }
  };

  return (
    <div className="w-screen h-screen flex bg-white font-sans text-gray-800 overflow-hidden antialiased">
      {/* Sidebar Section */}
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        apiStatus={apiStatus}
      />

      {/* Main Interactive Chat Panel */}
      <div className="flex-1 flex flex-col h-full bg-white relative">
        
        {/* Workspace Top Header bar */}
        <div className="h-14 px-6 border-b border-gray-200 flex items-center justify-between bg-white z-10 shrink-0">
          <div className="flex flex-col min-w-0">
            <h2 className="text-sm font-semibold text-gray-800 truncate">
              {activeSession?.title || "Conversations"}
            </h2>
            <p className="text-[10px] text-gray-400 font-medium tracking-wide">
              {activeSession?.messages.length || 0} Messages • {activeSession?.systemPrompt === DEFAULT_SYSTEM_PROMPT ? "Standard Mode" : "Custom Persona"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetCurrentChat}
              disabled={activeSession?.messages.length === 0}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
              title="Clear History"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
              title="Settings & Prompt Configuration"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Conversation Message List area */}
        <div className="flex-1 overflow-y-auto bg-gray-50/45 p-6 space-y-6">
          
          {/* Global error banner */}
          {globalError && (
            <div className="max-w-3xl mx-auto bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 text-xs text-red-800 shadow-xs animate-in slide-in-from-top-4 duration-200">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <p className="font-semibold">Chat Connection Error</p>
                <p className="leading-relaxed">{globalError}</p>
                <div className="pt-2 flex gap-3">
                  <button 
                    onClick={() => handleSendMessage(activeSession.messages[activeSession.messages.length - 1]?.content || "")}
                    className="font-semibold text-red-900 hover:underline cursor-pointer"
                  >
                    Retry last message
                  </button>
                  <button 
                    onClick={() => setSettingsOpen(true)}
                    className="font-semibold text-indigo-700 hover:underline cursor-pointer"
                  >
                    Configure .env Setup
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* If there are no messages, display the gorgeous empty welcome area */}
          {activeSession?.messages.length === 0 ? (
            <div className="max-w-3xl mx-auto pt-10 pb-8 space-y-10">
              <div className="text-center space-y-3.5 max-w-xl mx-auto">
                <div className="inline-flex p-3.5 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-600">
                  <Bot className="w-7 h-7" />
                </div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                  Secure Custom Chatbot
                </h1>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Start conversing with our full-stack model. Your API keys are kept secure on the Express server 
                  and never leaked to the browser or during public deployments.
                </p>
              </div>

              {/* Quick Prompt Starters */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Select a prompt to begin
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {QUICK_STARTERS.map((starter, index) => (
                    <button
                      key={index}
                      onClick={() => handleSendMessage(starter.prompt)}
                      className="text-left p-4 bg-white hover:bg-indigo-50/50 border border-gray-100 hover:border-indigo-200 rounded-xl shadow-xs transition-all cursor-pointer group flex flex-col gap-1"
                    >
                      <span className="font-semibold text-xs text-gray-800 group-hover:text-indigo-900 transition-colors">
                        {starter.title}
                      </span>
                      <span className="text-[11px] text-gray-400 leading-normal truncate w-full">
                        {starter.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Dialogue flow */
            <div className="max-w-3xl mx-auto space-y-5">
              {activeSession.messages.map((message) => {
                const isUser = message.role === "user";
                const isCopied = copiedMessageId === message.id;

                return (
                  <div 
                    key={message.id} 
                    className={`flex gap-3.5 group ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    {/* Bot Avatar */}
                    {!isUser && (
                      <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-xs border border-indigo-700">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    {/* Chat Bubble Box */}
                    <div className={`relative max-w-[85%] rounded-2xl p-4 border shadow-2xs ${
                      isUser 
                        ? "bg-gray-900 text-white border-gray-800 rounded-br-xs" 
                        : "bg-white text-gray-800 border-gray-200/85 rounded-bl-xs"
                    }`}>
                      
                      {/* Message Content with Markdown parsing */}
                      {isUser ? (
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      ) : (
                        <MarkdownRenderer content={message.content} />
                      )}

                      {/* Micro-actions line */}
                      <div className={`mt-3 flex items-center justify-between text-[10px] ${
                        isUser ? "text-gray-400" : "text-gray-400"
                      }`}>
                        <span>
                          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>

                        {/* Copy result button (Satisfies requirement: "支持复制结果") */}
                        <button
                          onClick={() => handleCopyMessage(message.id, message.content)}
                          className={`p-1 rounded-md opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all cursor-pointer ${
                            isUser ? "hover:bg-gray-800 hover:text-white" : "hover:bg-gray-100 hover:text-gray-700"
                          }`}
                          title="Copy Message Text"
                        >
                          {isCopied ? (
                            <span className="flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span className="text-emerald-500 font-semibold text-[9px]">Copied!</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Copy className="w-3 h-3" />
                              <span className="text-[9px]">Copy</span>
                            </span>
                          )}
                        </button>
                      </div>

                    </div>

                    {/* User Avatar */}
                    {isUser && (
                      <div className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600 shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Waiting for response stream/API loader indicator */}
              {loading && (
                <div className="flex gap-3.5 justify-start">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-xs border border-indigo-700 animate-pulse">
                    <Bot className="w-4 h-4" />
                  </div>
                  
                  <div className="bg-white text-gray-800 border border-gray-200/85 rounded-2xl rounded-bl-xs p-4 flex items-center gap-2 shadow-2xs">
                    <div className="flex gap-1">
                      <div className="h-1.5 w-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="h-1.5 w-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="h-1.5 w-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs text-gray-400 font-medium ml-1">AI is thinking...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

        </div>

        {/* Input Bar area */}
        <div className="p-4 border-t border-gray-200 bg-white shrink-0 z-10">
          <div className="max-w-3xl mx-auto space-y-2">
            
            <div className="relative flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
              
              {/* Multiline capable auto-growing textarea */}
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask whatever you'd like... (Enter to send, Shift+Enter for new lines)"
                className="flex-1 bg-transparent border-0 outline-hidden resize-none py-1 px-1 text-sm max-h-[180px] min-h-[24px] text-gray-700 leading-relaxed font-sans placeholder-gray-400 focus:ring-0"
                rows={1}
                disabled={loading}
              />

              {/* Submit button */}
              <button
                onClick={() => handleSendMessage(input)}
                disabled={!input.trim() || loading}
                id="btn-send-message"
                className="p-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none shrink-0"
                title="Send Message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Footer tips */}
            <div className="flex items-center justify-between text-[10px] text-gray-400 px-1 font-medium">
              <span>Press Enter to send</span>
              <span>All communications are proxied securely to protect credentials.</span>
            </div>

          </div>
        </div>

      </div>

      {/* Settings Panel & Prompt Customization Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        systemPrompt={activeSession?.systemPrompt || DEFAULT_SYSTEM_PROMPT}
        onSaveSystemPrompt={handleSaveSystemPrompt}
        apiStatus={apiStatus}
      />
    </div>
  );
}
