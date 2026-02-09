"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Send, Paperclip, Bot, User, Loader2, FlaskConical, X } from "lucide-react";
import Header from "@/components/layout/Header";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { Button } from "@/components/ui/button";
import { API_CONFIG } from "@/lib/config/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ApiProvider = "openai" | "claude" | "gemini";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface FileAttachment {
  name: string;
  type: string;
  size: number;
  base64: string;
}

interface UserInfo {
  role?: string;
  profile_image?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_PROVIDERS: { value: ApiProvider; label: string }[] = [
  { value: "openai", label: "ChatGPT" },
  { value: "claude", label: "Claude" },
  { value: "gemini", label: "Gemini" },
];

const MODEL_OPTIONS: Record<ApiProvider, string[]> = {
  openai: ["gpt-4o", "o4-mini"],
  claude: ["claude-sonnet-4-5-20250514", "claude-haiku-4-20250414"],
  gemini: ["gemini-2.5-pro-preview-06-05", "gemini-2.5-flash-preview-05-20"],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LaboratoryPage() {
  const { user: clerkUser, isLoaded } = useUser();
  const router = useRouter();

  // User data from API
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [selectedApi, setSelectedApi] = useState<ApiProvider>("openai");
  const [selectedModel, setSelectedModel] = useState(MODEL_OPTIONS.openai[0]);
  const [customModel, setCustomModel] = useState("");
  const [useCustomModel, setUseCustomModel] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---------------------------------------------------------------------------
  // Auth & user data
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!isLoaded) return;
    if (!clerkUser) {
      router.push("/");
      return;
    }

    const fetchUser = async () => {
      try {
        const token = await clerkUser.getSessions().then((sessions) => {
          // Clerk v6: use getToken from useAuth or session
          return null;
        });

        const res = await fetch(`${API_CONFIG.API_URL}/users/me`, {
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          setUserInfo(data);
          if (data.role !== "admin") {
            router.push("/");
            return;
          }
        } else {
          router.push("/");
          return;
        }
      } catch {
        router.push("/");
        return;
      }
      setAuthChecked(true);
    };

    fetchUser();
  }, [isLoaded, clerkUser, router]);

  // ---------------------------------------------------------------------------
  // Scroll to bottom on new messages
  // ---------------------------------------------------------------------------

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ---------------------------------------------------------------------------
  // Auto-resize textarea
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  // ---------------------------------------------------------------------------
  // Model selection sync
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!useCustomModel) {
      setSelectedModel(MODEL_OPTIONS[selectedApi][0]);
    }
  }, [selectedApi, useCustomModel]);

  // ---------------------------------------------------------------------------
  // File handling
  // ---------------------------------------------------------------------------

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > MAX_FILE_SIZE) {
      alert("ファイルサイズは10MB以下にしてください。");
      return;
    }

    setFile(selected);
    // Reset input so the same file can be re-selected
    e.target.value = "";
  }, []);

  const fileToBase64 = useCallback((f: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g. "data:image/png;base64,")
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Send message
  // ---------------------------------------------------------------------------

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed && !file) return;
    if (isLoading) return;

    const model = useCustomModel ? customModel.trim() : selectedModel;
    if (!model) {
      alert("モデルを選択または入力してください。");
      return;
    }

    // Build user message
    const userContent = file ? `${trimmed}\n\n[添付: ${file.name}]` : trimmed;
    const userMessage: ChatMessage = {
      role: "user",
      content: userContent,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Prepare file attachment
      let attachment: FileAttachment | null = null;
      if (file) {
        const base64 = await fileToBase64(file);
        attachment = {
          name: file.name,
          type: file.type,
          size: file.size,
          base64,
        };
        setFile(null);
      }

      // Build history for context
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch(`${API_CONFIG.API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: trimmed,
          api: selectedApi,
          model,
          history,
          ...(attachment ? { files: [attachment] } : {}),
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `API error: ${res.status}`);
      }

      const data = await res.json();

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.content || data.message || "（応答なし）",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: `エラーが発生しました: ${err instanceof Error ? err.message : "不明なエラー"}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [input, file, isLoading, selectedApi, selectedModel, customModel, useCustomModel, messages, fileToBase64]);

  // ---------------------------------------------------------------------------
  // Keyboard shortcut
  // ---------------------------------------------------------------------------

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // ---------------------------------------------------------------------------
  // Render guards
  // ---------------------------------------------------------------------------

  if (!isLoaded || !authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={userInfo} />

      <main className="mx-auto max-w-4xl px-4 pt-20 pb-4">
        {/* Page title */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
            <FlaskConical className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">ラボラトリー</h1>
            <p className="text-sm text-gray-500">AI モデル実験・比較チャット（管理者専用）</p>
          </div>
        </div>

        {/* Controls */}
        <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-end gap-4">
            {/* API Provider */}
            <div className="flex-shrink-0">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                API プロバイダー
              </label>
              <div className="flex gap-1 rounded-lg border border-gray-200 p-1">
                {API_PROVIDERS.map((provider) => (
                  <button
                    key={provider.value}
                    onClick={() => {
                      setSelectedApi(provider.value);
                      setUseCustomModel(false);
                    }}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      selectedApi === provider.value
                        ? "bg-purple-600 text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {provider.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Model Selector */}
            <div className="min-w-[220px] flex-1">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                モデル
              </label>
              {useCustomModel ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                    placeholder="カスタムモデル ID を入力..."
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                  <button
                    onClick={() => {
                      setUseCustomModel(false);
                      setCustomModel("");
                    }}
                    className="rounded-lg px-2 text-gray-400 hover:text-gray-600"
                    title="プリセットに戻す"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    {MODEL_OPTIONS[selectedApi].map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setUseCustomModel(true)}
                    className="whitespace-nowrap rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-500 hover:bg-gray-50"
                    title="カスタムモデルを入力"
                  >
                    カスタム
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chat area */}
        <div className="flex flex-col rounded-lg border border-gray-200 bg-white shadow-sm" style={{ height: "calc(100vh - 320px)" }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <FlaskConical className="mb-3 h-12 w-12 text-gray-300" />
                <p className="text-sm text-gray-400">
                  メッセージを入力して AI モデルを実験しましょう。
                </p>
                <p className="mt-1 text-xs text-gray-300">
                  Shift+Enter で改行、Enter で送信
                </p>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-100">
                    <Bot className="h-4 w-4 text-purple-600" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-purple-600 text-white"
                      : "border border-gray-200 bg-gray-50"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <MarkdownRenderer content={msg.content} />
                  ) : (
                    <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                  )}
                  <p
                    className={`mt-1 text-right text-[10px] ${
                      msg.role === "user" ? "text-purple-200" : "text-gray-400"
                    }`}
                  >
                    {msg.timestamp.toLocaleTimeString("ja-JP", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                {msg.role === "user" && (
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-200">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-100">
                  <Bot className="h-4 w-4 text-purple-600" />
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>応答を生成中...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-gray-200 p-4">
            {/* File preview */}
            {file && (
              <div className="mb-2 flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-sm">
                <Paperclip className="h-4 w-4 text-purple-500" />
                <span className="flex-1 truncate text-purple-700">{file.name}</span>
                <span className="text-xs text-purple-400">
                  {(file.size / 1024).toFixed(0)} KB
                </span>
                <button
                  onClick={() => setFile(null)}
                  className="text-purple-400 hover:text-purple-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="flex items-end gap-2">
              {/* File upload */}
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,.pdf,.txt,.csv,.json,.md"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="flex-shrink-0"
                title="ファイルを添付"
              >
                <Paperclip className="h-5 w-5" />
              </Button>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="メッセージを入力..."
                rows={1}
                disabled={isLoading}
                className="flex-1 resize-none rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
              />

              {/* Send */}
              <Button
                onClick={handleSend}
                disabled={isLoading || (!input.trim() && !file)}
                className="flex-shrink-0 bg-purple-600 hover:bg-purple-700"
                size="icon"
                title="送信"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
