import { notFound } from "next/navigation";
import StudyTransitionScreen from "../../../../_components/StudyTransitionScreen";
import {
  isStudyOrderId,
  STUDY_ORDER_IDS,
} from "../../../../_lib/studyFlow";

export function generateStaticParams() {
  return STUDY_ORDER_IDS.map((order) => ({ order }));
}

export default async function SignupPausePage({
  params,
}: {
  params: Promise<{ order: string }>;
}) {
  const { order } = await params;
  if (!isStudyOrderId(order)) notFound();

  return (
    <StudyTransitionScreen
      title="Please notify the study moderator"
      actionHref={`/study/${order}/1`}
      actionLabel="Start first sign-in"
    />
  );
}
