"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

export function AuthStatus() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <span style={{ color: "rgba(255,255,255,0.72)", fontSize: "0.8rem" }}>
        Checking session
      </span>
    );
  }

  if (!session) {
    return (
      <Link
        href="/login"
        style={{
          color: "white",
          fontSize: "0.85rem",
          fontWeight: 700,
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}
      >
        Sign in
      </Link>
    );
  }

  return (
    <div
      style={{
        alignItems: "center",
        display: "inline-flex",
        gap: "0.5rem",
        minWidth: 0,
      }}
    >
      <span
        title={session.user.email}
        style={{
          color: "rgba(255,255,255,0.86)",
          fontSize: "0.8rem",
          fontWeight: 700,
          maxWidth: 180,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {session.user.name || session.user.email}
      </span>
      <button
        type="button"
        onClick={() =>
          void authClient.signOut({
            fetchOptions: {
              onSuccess: () => {
                router.refresh();
              },
            },
          })
        }
        style={{
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.28)",
          borderRadius: 8,
          color: "white",
          cursor: "pointer",
          fontSize: "0.8rem",
          fontWeight: 700,
          minHeight: 36,
          padding: "0.35rem 0.55rem",
          whiteSpace: "nowrap",
        }}
      >
        Sign out
      </button>
    </div>
  );
}
