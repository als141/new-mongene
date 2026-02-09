"use client";

import { useUser, useClerk, UserButton } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FlaskConical, User, LogOut, Settings } from "lucide-react";

interface HeaderProps {
  user?: {
    role?: string;
    profile_image?: string;
  } | null;
}

export default function Header({ user }: HeaderProps = {}) {
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const isDemo = user?.role === "demo";
  const isAdmin = user?.role === "admin";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between h-full px-4 mx-auto max-w-7xl">
        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/images/モンジェネロゴタイプ.svg"
            alt="MonGene"
            width={140}
            height={36}
            priority
          />
        </Link>

        {/* Right: Demo badge + UserButton */}
        <div className="flex items-center gap-3">
          {isDemo && (
            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
              デモモード
            </span>
          )}

          <UserButton afterSignOutUrl="/">
            <UserButton.MenuItems>
              <UserButton.Link
                label="アカウント設定"
                labelIcon={<Settings className="h-4 w-4" />}
                href="/account"
              />
              {isAdmin && (
                <UserButton.Link
                  label="ラボラトリー"
                  labelIcon={<FlaskConical className="h-4 w-4" />}
                  href="/laboratory"
                />
              )}
              <UserButton.Action
                label="ログアウト"
                labelIcon={<LogOut className="h-4 w-4" />}
                onClick={() => signOut(() => router.push("/"))}
              />
            </UserButton.MenuItems>
          </UserButton>
        </div>
      </div>
    </header>
  );
}
