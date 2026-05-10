"use client";

import { useToast } from "@/components/ui/ToastProvider";

type ActionResult = {
  ok: boolean;
  message: string;
};

type ServerAction = (formData: FormData) => Promise<ActionResult | undefined>;

export function useActionToast() {
  const { showToast } = useToast();

  async function handleAction(
    action: ServerAction,
    formData: FormData,
    onSuccess?: () => void
  ) {
    const res = await action(formData);

    if (!res) {
      showToast("Action not completed: unexpected error.", "error");
      return;
    }

    showToast(res.message, res.ok ? "success" : "error");

    if (res.ok && onSuccess) {
      onSuccess();
    }
  }

  return { handleAction };
}