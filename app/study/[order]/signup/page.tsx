import { notFound } from "next/navigation";
import SignupFlow from "../../../_components/SignupFlow";
import {
  isStudyOrderId,
  STUDY_ORDER_IDS,
} from "../../../_lib/studyFlow";

export function generateStaticParams() {
  return STUDY_ORDER_IDS.map((order) => ({ order }));
}

export default async function StudySignupPage({
  params,
}: {
  params: Promise<{ order: string }>;
}) {
  const { order } = await params;
  if (!isStudyOrderId(order)) notFound();

  return <SignupFlow completionHref={`/study/${order}/signup/pause`} />;
}
