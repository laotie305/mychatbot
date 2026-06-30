import React, { useState } from "react";
import { 
  X, 
  Settings, 
  HelpCircle, 
  Check, 
  Copy, 
  ShieldCheck, 
  Info,
  Sliders,
  Terminal,
  Play,
  Loader2,
  AlertCircle
} from "lucide-react";
import { ApiStatus } from "../types";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  systemPrompt: string;
  onSaveSystemPrompt: (prompt: string) => void;
  apiStatus: ApiStatus | null;
}

export function SettingsModal({
  isOpen,
  onClose,
  systemPrompt,
  onSaveSystemPrompt,
  apiStatus,
}: SettingsModalProps) {
  const [localPrompt, setLocalPrompt] = useState(systemPrompt);
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSystemPrompt(localPrompt);
    onClose();
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/test-custom-api");
      
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const text = await res.text();
        setTestResult({
          success: false,
          endpointUsed: "/api/test-custom-api",
          status: res.status,
          statusText: res.statusText,
          error: `The server returned an HTML/text response instead of JSON. The backend server might still be booting up or restarting. Please wait 10-15 seconds and try again!`,
          rawResponseBody: text.substring(0, 1000)
        });
        return;
      }

      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({
        success: false,
        error: err.message || "Failed to contact diagnostic endpoint"
      });
    } finally {
      setTesting(false);
    }
  };

  const envTemplate = `# Custom API configuration
# Place your secure API key here. The application connects directly to Agnes AI.
CUSTOM_API_KEY="YOUR_CUSTOM_API_KEY_HERE"
`;

  const copyEnvTemplate = () => {
    navigator.clipboard.writeText(envTemplate);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-xs" 
        onClick={onClose} 
      />

      {/* Modal Box */}
      <div className="relative w-full max-w-xl bg-white rounded-xl shadow-xl border border-gray-100 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            <span className="font-semibold text-gray-800 text-sm">Settings & Secure Configuration</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          
          {/* Section 1: System Persona */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <Sliders className="w-3.5 h-3.5 text-indigo-500" />
              <span>System Prompt / Chatbot Persona</span>
            </div>
            <p className="text-xs text-gray-500">
              Define the instructions, tone, and behavior constraints for your custom chatbot.
            </p>
            <textarea
              value={localPrompt}
              onChange={(e) => setLocalPrompt(e.target.value)}
              className="w-full h-24 p-3 bg-white border border-gray-200 rounded-lg text-xs focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-gray-700 leading-relaxed font-sans"
              placeholder="e.g. You are a helpful assistant. Keep your responses concise and format them clearly."
            />
          </div>

          {/* Section 2: Security & Credentials */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Security & Deployment Status</span>
            </div>

            <div className="p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-lg flex gap-3">
              <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-800 space-y-1">
                <p className="font-semibold">Your Credentials Are Entirely Safe</p>
                <p className="leading-relaxed">
                  This application uses an Express backend proxy. The chatbot client never imports 
                  any credentials or accesses private APIs. All requests go securely through the server, 
                  meaning your custom keys are never exposed in browser requests or deployed builds.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Environment Configuration Template */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <Terminal className="w-3.5 h-3.5 text-indigo-500" />
                <span>Configure `.env` File</span>
              </div>
              <button
                onClick={copyEnvTemplate}
                className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
              >
                {copiedEnv ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-600">Copied Template!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy `.env` Template</span>
                  </>
                )}
              </button>
            </div>
            
            <p className="text-xs text-gray-500">
              Set up your custom API key by adding it to your local <code>.env</code> file:
            </p>

            <pre className="p-3.5 bg-gray-900 text-gray-100 rounded-lg text-[11px] font-mono leading-relaxed overflow-x-auto border border-gray-800">
              {envTemplate}
            </pre>
          </div>

          {/* Current Verification Status & Diagnostics */}
          <div className="pt-2 space-y-3">
            <div className="bg-gray-50 rounded-lg border border-gray-100 p-3.5 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <span className="text-gray-500 font-medium block">Loaded Configuration:</span>
                <span className="text-[10px] text-gray-400 block max-w-[280px] truncate">
                  {apiStatus?.config.hasCustom ? "Agnes AI (Secure Proxy)" : "No Active Key"}
                </span>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex gap-2">
                  {apiStatus?.config.hasCustom ? (
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-800 font-semibold rounded-md text-[10px]">
                      Active Key ({apiStatus.config.customModel})
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-amber-100 text-amber-800 font-semibold rounded-md text-[10px]">
                      No Active Key
                    </span>
                  )}
                </div>

                <button
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded text-[11px] border border-indigo-200 transition-colors cursor-pointer"
                >
                  {testing ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3" />
                      <span>Test Connection</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Test connection result panel */}
            {testResult && (
              <div className={`p-4 rounded-lg border text-xs space-y-2 animate-in fade-in duration-200 ${
                testResult.success 
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900" 
                  : "bg-red-50 border-red-200 text-red-900"
              }`}>
                <div className="flex items-center gap-2 font-bold">
                  {testResult.success ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>Connection Test: {testResult.success ? "SUCCESS" : "FAILED"}</span>
                </div>

                <div className="font-mono text-[11px] space-y-1 bg-white/70 p-3 rounded border border-black/5 overflow-x-auto max-h-[160px] leading-relaxed">
                  <p><strong>Endpoint:</strong> {testResult.endpointUsed || "N/A"}</p>
                  <p><strong>HTTP Status:</strong> {testResult.status || "N/A"} {testResult.statusText || ""}</p>
                  {testResult.durationMs && <p><strong>Latency:</strong> {testResult.durationMs}ms</p>}
                  {testResult.error && <p className="text-red-700 font-semibold"><strong>Error:</strong> {testResult.error}</p>}
                  {testResult.rawResponseBody && (
                    <div className="mt-1 pt-1 border-t border-black/5">
                      <strong>Raw Response:</strong>
                      <pre className="mt-1 whitespace-pre-wrap max-w-full text-[10px] text-gray-700">{testResult.rawResponseBody}</pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            Save Changes
          </button>
        </div>

      </div>
    </div>
  );
}
