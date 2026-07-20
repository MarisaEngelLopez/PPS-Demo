"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

type LoginState = "idle" | "submitting";

const demoEmail = "demopps@pps.demo";

const inputStyle = {
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  fontSize: "1rem",
  padding: "0.75rem 0.85rem",
  width: "100%",
};

const buttonStyle = {
  background: "#0f172a",
  border: "1px solid #0f172a",
  borderRadius: 8,
  color: "white",
  cursor: "pointer",
  fontSize: "0.95rem",
  fontWeight: 800,
  minHeight: 46,
  padding: "0.75rem 1rem",
};

export function DemoLoginForm() {
  const router = useRouter();
  const [state, setState] = useState<LoginState>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setState("submitting");

    const formData = new FormData(event.currentTarget);
    const user = String(formData.get("user") || "").trim();
    const password = String(formData.get("password") || "");

    if (user !== "demoPPS") {
      setState("idle");
      setError("Demo access not recognized.");
      return;
    }

    const result = await authClient.signIn.email({
      email: demoEmail,
      password,
    });

    setState("idle");

    if (result.error) {
      setError("Demo access not recognized.");
      return;
    }

    router.push("/projects");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "grid",
        gap: "0.85rem",
      }}
    >
      <label style={{ display: "grid", gap: "0.35rem", fontWeight: 700 }}>
        User
        <input
          autoComplete="username"
          autoFocus
          name="user"
          required
          style={inputStyle}
          type="text"
        />
      </label>

      <label style={{ display: "grid", gap: "0.35rem", fontWeight: 700 }}>
        Password
        <input
          autoComplete="current-password"
          name="password"
          required
          style={inputStyle}
          type="password"
        />
      </label>

      {error ? (
        <p style={{ color: "#b91c1c", fontSize: "0.9rem", margin: 0 }}>
          {error}
        </p>
      ) : null}

      <button disabled={state === "submitting"} style={buttonStyle} type="submit">
        {state === "submitting" ? "Opening demo..." : "Open demo"}
      </button>
    </form>
  );
}
