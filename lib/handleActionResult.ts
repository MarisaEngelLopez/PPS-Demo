export type ActionResult = {
  ok: boolean;
  message: string;
};

export function getToastType(result: ActionResult) {
  return result.ok ? "success" : "error";
}

export function fallbackActionResult(): ActionResult {
  return {
    ok: false,
    message: "Action not completed: unexpected error.",
  };
}