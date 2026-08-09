export const STUDY_ORDER_IDS = ["1", "2", "3", "4"] as const;
export const STUDY_STEPS = ["1", "2", "3", "4"] as const;

export type StudyOrderId = (typeof STUDY_ORDER_IDS)[number];
export type StudyStep = (typeof STUDY_STEPS)[number];
export type StudyConditionId = "A" | "B" | "C" | "D";

export const ACCOUNT_PREVIEW_MS = 1500;

export const STUDY_CONDITIONS: Record<
  StudyConditionId,
  {
    variant: "normal" | "he";
    showLabel: boolean;
    moderatorLabel: string;
  }
> = {
  A: {
    variant: "normal",
    showLabel: false,
    moderatorLabel: "Standard · no label",
  },
  B: {
    variant: "normal",
    showLabel: true,
    moderatorLabel: "Standard · with label",
  },
  C: {
    variant: "he",
    showLabel: false,
    moderatorLabel: "HE · no label",
  },
  D: {
    variant: "he",
    showLabel: true,
    moderatorLabel: "HE · with label",
  },
};

export const STUDY_ORDERS: Record<
  StudyOrderId,
  readonly [StudyConditionId, StudyConditionId, StudyConditionId, StudyConditionId]
> = {
  "1": ["A", "B", "D", "C"],
  "2": ["B", "C", "A", "D"],
  "3": ["C", "D", "B", "A"],
  "4": ["D", "A", "C", "B"],
};

export function isStudyOrderId(value: string): value is StudyOrderId {
  return STUDY_ORDER_IDS.includes(value as StudyOrderId);
}

export function isStudyStep(value: string): value is StudyStep {
  return STUDY_STEPS.includes(value as StudyStep);
}

export function getStudyCondition(order: StudyOrderId, step: StudyStep) {
  const conditionId = STUDY_ORDERS[order][Number(step) - 1];
  return {
    conditionId,
    ...STUDY_CONDITIONS[conditionId],
  };
}

export function getNextStudyHref(order: StudyOrderId, step: StudyStep) {
  const nextStep = Number(step) + 1;
  return nextStep <= STUDY_STEPS.length
    ? `/study/${order}/${nextStep}`
    : `/study/${order}/complete`;
}

export function isStudyLoginHref(value: string): boolean {
  return /^\/study\/[1-4]\/[1-4]$/.test(value);
}

export function getStudyStepParams() {
  return STUDY_ORDER_IDS.flatMap((order) =>
    STUDY_STEPS.map((step) => ({ order, step })),
  );
}
