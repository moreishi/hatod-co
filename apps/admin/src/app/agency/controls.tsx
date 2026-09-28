"use client";

import { Btn } from "../ui";
import { ONBOARDING_STEPS, STEP_LABELS, canGoLive, type OnboardingState } from "@/lib/onboarding";
import { completeOnboardingAction, decideApplicationAction } from "./actions";
import { Badge } from "../ui";

export function DecideButtons({ id }: { id: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Btn tone="primary" onClick={() => decideApplicationAction(id, "approve")}>
        Approve → grant agency
      </Btn>
      <Btn tone="danger" onClick={() => decideApplicationAction(id, "reject")}>
        Reject
      </Btn>
    </div>
  );
}

export function OnboardingTracker({ state }: { state: OnboardingState }) {
  const live = canGoLive(state);
  return (
    <div className="mt-2 rounded-lg bg-zinc-50 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Onboarding {live && <Badge tone="ok">ready for go-live</Badge>}
      </p>
      <ol className="flex flex-col gap-1">
        {ONBOARDING_STEPS.map((step, i) => {
          const done = state.done.includes(step);
          const unlocked = i === 0 || state.done.includes(ONBOARDING_STEPS[i - 1]);
          return (
            <li key={step} className="flex items-center justify-between gap-2 text-sm">
              <span className={done ? "text-zinc-400 line-through" : ""}>
                {i + 1}. {STEP_LABELS[step]}
              </span>
              {!done && (
                <Btn
                  tone="primary"
                  disabled={!unlocked}
                  title={unlocked ? undefined : "Complete previous steps first"}
                  onClick={() => completeOnboardingAction(state.applicationId, step)}
                >
                  Mark done
                </Btn>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
