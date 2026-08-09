import { notFound } from "next/navigation";
import StudyTransitionScreen from "../../../../_components/StudyTransitionScreen";
import {
  getNextStudyHref,
  getStudyStepParams,
  isStudyOrderId,
  isStudyStep,
} from "../../../../_lib/studyFlow";

export function generateStaticParams() {
  return getStudyStepParams();
}

export default async function LoginPausePage({
  params,
}: {
  params: Promise<{ order: string; step: string }>;
}) {
  const { order, step } = await params;
  if (!isStudyOrderId(order) || !isStudyStep(step)) notFound();

  const isLastStep = step === "4";

  return (
    <StudyTransitionScreen
      title="Please complete the short questionnaire"
      actionHref={getNextStudyHref(order, step)}
      actionLabel={isLastStep ? "Complete study" : "Start next sign-in"}
    />
  );
}
