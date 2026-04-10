import { PageHeader } from "../shared/components/PageHeader";
import { EmptyState } from "../shared/components/EmptyState";
import { Share2 } from "lucide-react";

export default function SocialPage() {
  return (
    <div>
      <PageHeader title="Social Media" description="Track your social media and ad campaigns" />
      <EmptyState
        icon={Share2}
        title="Coming Soon"
        description="Social media tracking, content calendar, and Meta Ads integration will be available in an upcoming update"
      />
    </div>
  );
}
