"use client";

import { SignIn } from "@clerk/nextjs";
import Image from "next/image";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <Image
            src="/images/モンジェネロゴタイプ.svg"
            alt="MonGene"
            width={200}
            height={60}
            className="mx-auto mb-6"
          />
          <h2 className="text-2xl font-bold text-mongene-ink">ログイン</h2>
          <p className="mt-2 text-sm text-mongene-muted">
            AIを使って数学の問題を生成しましょう
          </p>
        </div>
        <div className="flex justify-center">
          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none border border-mongene-border rounded-xl",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                socialButtonsBlockButton:
                  "border-mongene-border hover:bg-gray-50",
                formButtonPrimary:
                  "bg-mongene-green hover:bg-mongene-green/90 text-white",
              },
            }}
            routing="hash"
            fallbackRedirectUrl="/problems"
          />
        </div>
      </div>
    </div>
  );
}
