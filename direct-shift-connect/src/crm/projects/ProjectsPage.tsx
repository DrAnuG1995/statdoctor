import { PageHeader } from "../shared/components/PageHeader";
import { EmptyState } from "../shared/components/EmptyState";
import { FolderKanban } from "lucide-react";

export default function ProjectsPage() {
  return (
    <div>
      <PageHeader title="Projects" description="Manage your projects and tasks" />
      <EmptyState
        icon={FolderKanban}
        title="Coming Soon"
        description="Project management with Notion integration will be available in an upcoming update"
      />
    </div>
  );
}
