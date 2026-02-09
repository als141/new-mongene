"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function Home() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      router.replace("/problems");
    } else {
      router.replace("/login");
    }
  }, [isSignedIn, isLoaded, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <Image
          src="/images/モンジェネロゴ.svg"
          alt="MonGene"
          width={120}
          height={120}
          className="mx-auto mb-4"
        />
        <p className="text-mongene-muted">リダイレクト中...</p>
      </div>
    </div>
  );
}
