"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { Camera, Trash2, Save, User, Loader2, Shield, Mail, Key, Settings } from "lucide-react";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { API_CONFIG } from "@/lib/config/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserInfo {
  role?: string;
  email?: string;
  profile_image?: string;
  preferred_api?: string;
  preferred_model?: string;
}

type ApiOption = "gemini" | "claude" | "openai";

const API_OPTIONS: { value: ApiOption; label: string }[] = [
  { value: "gemini", label: "Gemini" },
  { value: "claude", label: "Claude" },
  { value: "openai", label: "OpenAI" },
];

const MODEL_OPTIONS: Record<ApiOption, string[]> = {
  gemini: ["gemini-2.5-pro-preview-06-05", "gemini-2.5-flash-preview-05-20"],
  claude: ["claude-sonnet-4-5-20250514", "claude-haiku-4-20250414"],
  openai: ["gpt-4o", "o4-mini"],
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif"];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AccountPage() {
  const { user: clerkUser, isLoaded } = useUser();

  // User data
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile image
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Email
  const [newEmail, setNewEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMessage, setEmailMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // API preferences
  const [preferredApi, setPreferredApi] = useState<ApiOption>("gemini");
  const [preferredModel, setPreferredModel] = useState(MODEL_OPTIONS.gemini[0]);
  const [prefSaving, setPrefSaving] = useState(false);
  const [prefMessage, setPrefMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ---------------------------------------------------------------------------
  // Fetch user data
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!isLoaded || !clerkUser) return;

    const fetchUser = async () => {
      try {
        const res = await fetch(`${API_CONFIG.API_URL}/users/me`, {
          credentials: "include",
        });
        if (res.ok) {
          const data: UserInfo = await res.json();
          setUserInfo(data);
          setProfileImage(data.profile_image || null);

          if (data.preferred_api && (data.preferred_api as ApiOption) in MODEL_OPTIONS) {
            setPreferredApi(data.preferred_api as ApiOption);
          }
          if (data.preferred_model) {
            setPreferredModel(data.preferred_model);
          }
        }
      } catch {
        // Silently handle
      }
      setLoading(false);
    };

    fetchUser();
  }, [isLoaded, clerkUser]);

  // Sync model options when API changes
  useEffect(() => {
    const models = MODEL_OPTIONS[preferredApi];
    if (!models.includes(preferredModel)) {
      setPreferredModel(models[0]);
    }
  }, [preferredApi, preferredModel]);

  // ---------------------------------------------------------------------------
  // Profile image handlers
  // ---------------------------------------------------------------------------

  const handleImageSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(selected.type)) {
      alert("JPG, PNG, GIF 形式の画像を選択してください。");
      return;
    }

    if (selected.size > MAX_IMAGE_SIZE) {
      alert("ファイルサイズは5MB以下にしてください。");
      return;
    }

    setIsUploading(true);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(selected);
      });

      const res = await fetch(`${API_CONFIG.API_URL}/profile-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          image: base64,
          filename: selected.name,
          content_type: selected.type,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setProfileImage(data.url || data.profile_image);
        setUserInfo((prev) => prev ? { ...prev, profile_image: data.url || data.profile_image } : prev);
      } else {
        alert("画像のアップロードに失敗しました。");
      }
    } catch {
      alert("画像のアップロード中にエラーが発生しました。");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  }, []);

  const handleImageDelete = useCallback(async () => {
    if (!confirm("プロフィール画像を削除しますか？")) return;

    setIsUploading(true);
    try {
      const res = await fetch(`${API_CONFIG.API_URL}/profile-image`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        setProfileImage(null);
        setUserInfo((prev) => prev ? { ...prev, profile_image: undefined } : prev);
      } else {
        alert("画像の削除に失敗しました。");
      }
    } catch {
      alert("画像の削除中にエラーが発生しました。");
    } finally {
      setIsUploading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Email handler
  // ---------------------------------------------------------------------------

  const handleEmailChange = useCallback(async () => {
    if (!newEmail.trim()) return;
    setEmailSaving(true);
    setEmailMessage(null);

    try {
      // Use Clerk's built-in email update
      if (clerkUser) {
        await clerkUser.createEmailAddress({ email: newEmail.trim() });
        setEmailMessage({ type: "success", text: "確認メールを送信しました。メールを確認してください。" });
        setNewEmail("");
      }
    } catch (err) {
      setEmailMessage({
        type: "error",
        text: err instanceof Error ? err.message : "メールアドレスの変更に失敗しました。",
      });
    } finally {
      setEmailSaving(false);
    }
  }, [newEmail, clerkUser]);

  // ---------------------------------------------------------------------------
  // Password handler
  // ---------------------------------------------------------------------------

  const handlePasswordChange = useCallback(async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage({ type: "error", text: "すべてのフィールドを入力してください。" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "新しいパスワードが一致しません。" });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMessage({ type: "error", text: "パスワードは8文字以上にしてください。" });
      return;
    }

    setPasswordSaving(true);
    setPasswordMessage(null);

    try {
      if (clerkUser) {
        await clerkUser.updatePassword({
          currentPassword,
          newPassword,
        });
        setPasswordMessage({ type: "success", text: "パスワードを変更しました。" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      setPasswordMessage({
        type: "error",
        text: err instanceof Error ? err.message : "パスワードの変更に失敗しました。",
      });
    } finally {
      setPasswordSaving(false);
    }
  }, [currentPassword, newPassword, confirmPassword, clerkUser]);

  // ---------------------------------------------------------------------------
  // API preferences handler
  // ---------------------------------------------------------------------------

  const handleSavePreferences = useCallback(async () => {
    setPrefSaving(true);
    setPrefMessage(null);

    try {
      const res = await fetch(`${API_CONFIG.API_URL}/user-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          preferred_api: preferredApi,
          preferred_model: preferredModel,
        }),
      });

      if (res.ok) {
        setPrefMessage({ type: "success", text: "設定を保存しました。" });
      } else {
        throw new Error("保存に失敗しました。");
      }
    } catch (err) {
      setPrefMessage({
        type: "error",
        text: err instanceof Error ? err.message : "設定の保存に失敗しました。",
      });
    } finally {
      setPrefSaving(false);
    }
  }, [preferredApi, preferredModel]);

  // ---------------------------------------------------------------------------
  // Render guards
  // ---------------------------------------------------------------------------

  if (!isLoaded || loading) {
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

      <main className="mx-auto max-w-2xl px-4 pt-20 pb-12">
        {/* Page title */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
            <Settings className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">アカウント設定</h1>
            <p className="text-sm text-gray-500">プロフィール・セキュリティ・API設定</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* ------------------------------------------------------------ */}
          {/* Section 1: Profile Image                                      */}
          {/* ------------------------------------------------------------ */}
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
              <Camera className="h-4 w-4 text-gray-500" />
              プロフィール画像
            </h2>

            <div className="flex items-center gap-6">
              {/* Image preview */}
              <div className="relative h-24 w-24 flex-shrink-0">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="プロフィール"
                    className="h-24 w-24 rounded-full border-2 border-gray-200 object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-gray-300 bg-gray-50">
                    <User className="h-10 w-10 text-gray-400" />
                  </div>
                )}

                {isUploading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  画像を変更
                </Button>

                {profileImage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleImageDelete}
                    disabled={isUploading}
                    className="text-red-500 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    削除
                  </Button>
                )}

                <p className="text-xs text-gray-400">
                  JPG, PNG, GIF / 5MB以下
                </p>
              </div>
            </div>
          </section>

          {/* ------------------------------------------------------------ */}
          {/* Section 2: Email                                              */}
          {/* ------------------------------------------------------------ */}
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
              <Mail className="h-4 w-4 text-gray-500" />
              メールアドレス
            </h2>

            <div className="mb-4">
              <p className="text-sm text-gray-600">
                現在のメールアドレス:{" "}
                <span className="font-medium text-gray-900">
                  {clerkUser?.primaryEmailAddress?.emailAddress || userInfo?.email || "未設定"}
                </span>
              </p>
            </div>

            <div className="flex gap-2">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="新しいメールアドレス"
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <Button
                variant="outline"
                size="default"
                onClick={handleEmailChange}
                disabled={emailSaving || !newEmail.trim()}
              >
                {emailSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                変更
              </Button>
            </div>

            {emailMessage && (
              <p className={`mt-2 text-sm ${emailMessage.type === "success" ? "text-emerald-600" : "text-red-500"}`}>
                {emailMessage.text}
              </p>
            )}
          </section>

          {/* ------------------------------------------------------------ */}
          {/* Section 3: Password                                           */}
          {/* ------------------------------------------------------------ */}
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
              <Key className="h-4 w-4 text-gray-500" />
              パスワード変更
            </h2>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  現在のパスワード
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  新しいパスワード
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="8文字以上"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  パスワード確認
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <Button
                variant="outline"
                onClick={handlePasswordChange}
                disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
              >
                {passwordSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Shield className="mr-2 h-4 w-4" />
                )}
                パスワードを変更
              </Button>

              {passwordMessage && (
                <p className={`text-sm ${passwordMessage.type === "success" ? "text-emerald-600" : "text-red-500"}`}>
                  {passwordMessage.text}
                </p>
              )}
            </div>
          </section>

          {/* ------------------------------------------------------------ */}
          {/* Section 4: API Preferences                                    */}
          {/* ------------------------------------------------------------ */}
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
              <Settings className="h-4 w-4 text-gray-500" />
              API 設定
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  優先 API プロバイダー
                </label>
                <select
                  value={preferredApi}
                  onChange={(e) => setPreferredApi(e.target.value as ApiOption)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {API_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  優先モデル
                </label>
                <select
                  value={preferredModel}
                  onChange={(e) => setPreferredModel(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {MODEL_OPTIONS[preferredApi].map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                variant="outline"
                onClick={handleSavePreferences}
                disabled={prefSaving}
              >
                {prefSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                設定を保存
              </Button>

              {prefMessage && (
                <p className={`text-sm ${prefMessage.type === "success" ? "text-emerald-600" : "text-red-500"}`}>
                  {prefMessage.text}
                </p>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
