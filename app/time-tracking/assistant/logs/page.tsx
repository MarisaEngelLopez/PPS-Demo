import { redirect } from "next/navigation";

export default function TimeTrackingAgentLogsRedirectPage() {
  redirect("/configuration/agents/transactions?agentKey=TIME_TRACKING");
}
