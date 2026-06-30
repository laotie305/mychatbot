import React, { useState } from "react";
import { 
  MessageSquare, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Search, 
  Cpu,
  CloudLightning,
  Sparkles
} from "lucide-react";
import { ChatSession, ApiStatus } from "../types";

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, newTitle: string) => void;
  apiStatus: ApiStatus | null;
}

export function Sidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onRenameSession,
  apiStatus,
}: SidebarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const filteredSessions = sessions.filter((session) =>
    session.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const startRename = (e: React.MouseEvent, id: string, currentTitle: string) => {
    e.stopPropagation();
    setEditingId(id);
    setEditTitle(currentTitle);
  };

  const saveRename = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameSession(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const cancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  return (
    <div className="w-80 h-full bg-gray-50 border-r border-gray-200 flex flex-col select-none">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-gray-200 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
            <span className="font-semibold text-gray-800 text-sm tracking-tight">
              Custom Chatbot
            </span>
          </div>
          <button
            onClick={onNewSession}
            id="btn-new-chat"
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            New Chat
          </button>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 text-xs rounded-lg focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-gray-700"
          />
        </div>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
        {filteredSessions.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-400">
            No conversations found
          </div>
        ) : (
          filteredSessions.map((session) => {
            const isActive = session.id === activeSessionId;
            const isEditing = session.id === editingId;

            return (
              <div
                key={session.id}
                onClick={() => !isEditing && onSelectSession(session.id)}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? "bg-indigo-50 text-indigo-900 border border-indigo-100"
                    : "text-gray-600 hover:bg-gray-100 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <MessageSquare className={`w-4 h-4 shrink-0 ${isActive ? "text-indigo-600" : "text-gray-400"}`} />
                  {isEditing ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveRename(e as any, session.id);
                        if (e.key === "Escape") cancelRename(e as any);
                      }}
                      className="w-full px-1.5 py-0.5 bg-white border border-indigo-300 rounded focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-gray-800"
                      autoFocus
                    />
                  ) : (
                    <span className="truncate pr-2">{session.title}</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  {isEditing ? (
                    <>
                      <button
                        onClick={(e) => saveRename(e, session.id)}
                        className="p-1 hover:bg-gray-200 rounded text-emerald-600 cursor-pointer"
                        title="Save rename"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={cancelRename}
                        className="p-1 hover:bg-gray-200 rounded text-gray-400 cursor-pointer"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={(e) => startRename(e, session.id, session.title)}
                        className="p-1 hover:bg-indigo-100 rounded text-gray-400 hover:text-indigo-600 cursor-pointer"
                        title="Rename Chat"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(session.id);
                        }}
                        className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-600 cursor-pointer"
                        title="Delete Chat"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Sidebar Footer with Secure Status Check */}
      <div className="p-4 border-t border-gray-200 bg-gray-100">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
            <span>Server Proxy Status</span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>

          {apiStatus ? (
            <div className="space-y-1.5">
              {apiStatus.config.hasCustom ? (
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                  <Cpu className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate font-medium">
                    Active: {apiStatus.config.customModel}
                  </span>
                </div>
              ) : apiStatus.config.hasGemini ? (
                <div className="flex items-center gap-1.5 text-xs text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">
                  <CloudLightning className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="truncate font-medium">Active: Gemini (Default)</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-100">
                  <span className="font-semibold text-amber-600">⚠ No Key Configured</span>
                </div>
              )}
              <div className="text-[10px] text-gray-500 text-center">
                All keys are kept safe on the server
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-400 italic">Connecting to server...</div>
          )}
        </div>
      </div>
    </div>
  );
}
