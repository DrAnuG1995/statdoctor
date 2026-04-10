import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  // Doctor statuses
  active: "bg-green-100 text-green-800 border-green-200",
  pipeline: "bg-blue-100 text-blue-800 border-blue-200",
  unsubscribed: "bg-yellow-100 text-yellow-800 border-yellow-200",
  deleted: "bg-red-100 text-red-800 border-red-200",
  // Hospital statuses
  pending: "bg-orange-100 text-orange-800 border-orange-200",
  churned: "bg-red-100 text-red-800 border-red-200",
  // Project statuses
  completed: "bg-green-100 text-green-800 border-green-200",
  on_hold: "bg-yellow-100 text-yellow-800 border-yellow-200",
  // Task statuses
  todo: "bg-gray-100 text-gray-800 border-gray-200",
  in_progress: "bg-blue-100 text-blue-800 border-blue-200",
  review: "bg-purple-100 text-purple-800 border-purple-200",
  done: "bg-green-100 text-green-800 border-green-200",
  // Investor statuses
  contacted: "bg-gray-100 text-gray-800 border-gray-200",
  pitched: "bg-yellow-100 text-yellow-800 border-yellow-200",
  diligence: "bg-blue-100 text-blue-800 border-blue-200",
  won: "bg-green-100 text-green-800 border-green-200",
  lost: "bg-red-100 text-red-800 border-red-200",
  // Post statuses
  draft: "bg-gray-100 text-gray-800 border-gray-200",
  scheduled: "bg-blue-100 text-blue-800 border-blue-200",
  published: "bg-green-100 text-green-800 border-green-200",
  failed: "bg-red-100 text-red-800 border-red-200",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const colors = statusColors[status] || "bg-gray-100 text-gray-800 border-gray-200";
  const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Badge variant="outline" className={cn("text-xs font-medium", colors, className)}>
      {label}
    </Badge>
  );
}
