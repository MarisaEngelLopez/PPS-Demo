"use client";

import { useToast } from "@/components/ui/ToastProvider";

type ActionResult = {
  ok: boolean;
  message: string;
};

type ServerAction<TActionResult extends ActionResult = ActionResult> = (
  formData: FormData
) => Promise<TActionResult | undefined>;

export function useActionToast() {
  const { showToast } = useToast();

  async function handleAction<TActionResult extends ActionResult = ActionResult>(
    action: ServerAction<TActionResult>,
    formData: FormData,
    onSuccess?: (result: TActionResult) => void | Promise<void>
  ) {
    const res = await action(formData);

    if (!res) {
      showToast("Action not completed: unexpected error.", "error");
      return;
    }

    showToast(res.message, res.ok ? "success" : "error");

    if (res.ok && onSuccess) {
      await onSuccess(res);
    }
  }

  return { handleAction };
}
