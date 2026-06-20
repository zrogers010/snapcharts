import { redirect } from "next/navigation";

type LegacySnapshotPageProps = {
  params: Promise<{ id: string }>;
};

export default async function LegacySnapshotPage({ params }: LegacySnapshotPageProps) {
  const { id } = await params;
  redirect(`/chart/${encodeURIComponent(id)}`);
}
