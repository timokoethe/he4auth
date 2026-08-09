import { notFound } from "next/navigation";
import FaceAuthScreen from "../../../_components/FaceAuthScreen";
import {
  getStudyCondition,
  getStudyStepParams,
  isStudyOrderId,
  isStudyStep,
} from "../../../_lib/studyFlow";

export function generateStaticParams() {
  return getStudyStepParams();
}

export default async function StudyLoginPage({
  params,
}: {
  params: Promise<{ order: string; step: string }>;
}) {
  const { order, step } = await params;
  if (!isStudyOrderId(order) || !isStudyStep(step)) notFound();

  const condition = getStudyCondition(order, step);
  const returnHref = `/study/${order}/${step}`;

  return (
    <FaceAuthScreen
      variant={condition.variant}
      showLabel={condition.showLabel}
      studyFlow={{
        pauseHref: `${returnHref}/pause`,
        returnHref,
      }}
    />
  );
}
