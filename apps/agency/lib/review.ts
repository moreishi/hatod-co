export type ReviewAction =
  "start-review" | "approve" | "reject" | "suspend" | "reactivate";

/** Inline photo payloads render as images; anything else is a reference. */
export function isInlineImage(storageKey: string): boolean {
  return storageKey.startsWith("data:image/");
}

/** Which review actions a driver status offers (empty outside the window). */
export function reviewActionsFor(status: string): ReviewAction[] {
  switch (status) {
    case "DOCUMENTS_PENDING":
      return ["start-review"];
    case "DOCUMENTS_UNDER_REVIEW":
      return ["approve", "reject"];
    case "ACTIVE":
      return ["suspend"];
    case "SUSPENDED":
      return ["reactivate"];
    default:
      return [];
  }
}

export function reviewActionLabel(action: ReviewAction): string {
  switch (action) {
    case "start-review":
      return "Start review";
    case "approve":
      return "Approve";
    case "reject":
      return "Reject";
    case "suspend":
      return "Suspend driver";
    case "reactivate":
      return "Reactivate";
  }
}
