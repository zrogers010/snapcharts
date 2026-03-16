import { redirect } from "next/navigation";

type LegacySnapshotPageProps = {
  params: { id: string };
};

export default function LegacySnapshotPage({ params }: LegacySnapshotPageProps) {
  redirect(`/chart/${encodeURIComponent(params.id)}`);
}
