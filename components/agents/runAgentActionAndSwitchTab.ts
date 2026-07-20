type ActionResult = {
  ok: boolean;
  message: string;
};

type ServerAction<TActionResult extends ActionResult = ActionResult> = (
  formData: FormData
) => Promise<TActionResult | undefined>;

type HandleAction = <TActionResult extends ActionResult = ActionResult>(
  action: ServerAction<TActionResult>,
  formData: FormData,
  onSuccess?: (result: TActionResult) => void | Promise<void>
) => Promise<void>;

export async function runAgentActionAndSwitchTab<TTab extends string>(
  input: {
    handleAction: HandleAction;
    action: ServerAction;
    formData: FormData;
    setActiveTab: (tab: TTab) => void;
    tab: TTab;
    afterAction?: () => void;
  }
) {
  await input.handleAction(input.action, input.formData);
  input.setActiveTab(input.tab);
  input.afterAction?.();
}
