"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Date.now();

    setToasts((current) => [...current, { id, message, type }]);

    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      <div
        style={{
          position: "fixed",
          top: "1rem",
          right: "1rem",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          maxWidth: "360px",
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              padding: "0.85rem 1rem",
              borderRadius: "10px",
              boxShadow: "0 10px 25px rgba(15, 23, 42, 0.18)",
              background:
                toast.type === "success"
                  ? "#dcfce7"
                  : toast.type === "error"
                    ? "#fee2e2"
                    : "#e0f2fe",
              color:
                toast.type === "success"
                  ? "#166534"
                  : toast.type === "error"
                    ? "#991b1b"
                    : "#075985",
              border:
                toast.type === "success"
                  ? "1px solid #86efac"
                  : toast.type === "error"
                    ? "1px solid #fecaca"
                    : "1px solid #bae6fd",
              fontSize: "0.9rem",
              fontWeight: 600,
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return context;
}