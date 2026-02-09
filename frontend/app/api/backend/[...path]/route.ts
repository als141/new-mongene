import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const BACKEND_BASE =
  process.env.USE_LOCAL_BACKEND === "true"
    ? process.env.DEV_BACKEND_BASE || "http://localhost:8000"
    : process.env.BACKEND_URL || "http://localhost:8000";

async function proxyRequest(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const { getToken } = await auth();

  const backendPath = `/api/v1/${path.join("/")}`;
  const url = new URL(backendPath, BACKEND_BASE);
  url.search = req.nextUrl.search;

  const headers = new Headers();
  headers.set("Content-Type", req.headers.get("Content-Type") || "application/json");

  const token = await getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const isSSE =
    req.headers.get("Accept")?.includes("text/event-stream") ||
    backendPath.includes("-sse");

  const fetchOptions: RequestInit = {
    method: req.method,
    headers,
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    const contentType = req.headers.get("Content-Type") || "";
    if (contentType.includes("multipart/form-data")) {
      headers.delete("Content-Type");
      fetchOptions.body = await req.arrayBuffer();
    } else {
      try {
        fetchOptions.body = await req.text();
      } catch {
        // no body
      }
    }
  }

  try {
    const response = await fetch(url.toString(), fetchOptions);

    if (isSSE && response.ok && response.body) {
      return new NextResponse(response.body, {
        status: response.status,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const data = await response.text();
    return new NextResponse(data, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (error) {
    console.error("Backend proxy error:", error);
    return NextResponse.json(
      { error: "Backend connection failed" },
      { status: 502 }
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const DELETE = proxyRequest;
export const PATCH = proxyRequest;
