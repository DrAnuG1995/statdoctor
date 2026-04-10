import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  X,
  RefreshCw,
  Mail,
  Download,
  Trash2,
  CheckCircle2,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────

export interface StatusOption {
  value: string;
  label: string;
}

export interface BulkActionsConfig {
  /** Entity name for display, e.g. "doctor", "hospital" */
  entityName: string;
  /** Available statuses for bulk status change */
  statuses: StatusOption[];
  /** Callback for bulk status change */
  onStatusChange?: (ids: string[], status: string) => Promise<void>;
  /** Callback for bulk delete */
  onDelete?: (ids: string[]) => Promise<void>;
  /** Callback for CSV export — receives selected IDs (empty = export all) */
  onExport?: (ids: string[]) => void;
  /** Email field getter — returns email for a given ID, null if no email */
  getEmail?: (id: string) => string | null;
  /** Name field getter for email personalization */
  getName?: (id: string) => string;
  /** Whether to show the email action */
  showEmail?: boolean;
  /** Whether to show the delete action */
  showDelete?: boolean;
}

interface BulkActionsToolbarProps {
  selectedIds: Set<string>;
  onClear: () => void;
  config: BulkActionsConfig;
  totalCount: number;
}

// ── CSV export helper ────────────────────────────────────────────────

export function downloadCSV(
  filename: string,
  headers: string[],
  rows: string[][]
) {
  const escape = (v: string) => {
    if (v.includes(",") || v.includes('"') || v.includes("\n")) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };
  const csv = [
    headers.map(escape).join(","),
    ...rows.map((r) => r.map(escape).join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Bulk email dialog ────────────────────────────────────────────────

function BulkEmailDialog({
  open,
  onClose,
  recipientCount,
  emails,
  entityName,
}: {
  open: boolean;
  onClose: () => void;
  recipientCount: number;
  emails: string[];
  entityName: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(emails.join(", "));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenMailto = () => {
    // Use BCC for privacy
    const mailto = `mailto:?bcc=${encodeURIComponent(emails.join(","))}`;
    window.location.href = mailto;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-[#1F3A6A]" />
            Bulk Email — {recipientCount} {entityName}{recipientCount !== 1 ? "s" : ""}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Recipients ({emails.length} with email)</Label>
            <div className="mt-1 max-h-[120px] overflow-y-auto rounded-md border bg-gray-50 p-2 text-xs">
              {emails.length === 0 ? (
                <span className="text-muted-foreground">No email addresses found for selected {entityName}s</span>
              ) : (
                emails.join(", ")
              )}
            </div>
          </div>

          {emails.length > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy} className="flex-1">
                {copied ? (
                  <>
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-green-600" />
                    Copied!
                  </>
                ) : (
                  "Copy all emails"
                )}
              </Button>
              <Button size="sm" onClick={handleOpenMailto} className="flex-1 bg-[#1F3A6A] hover:bg-[#1F3A6A]/90">
                <Mail className="mr-1.5 h-3.5 w-3.5" />
                Open in email client
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Confirm dialog ───────────────────────────────────────────────────

function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  destructive,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  loading?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{description}</p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className={
              destructive
                ? "bg-red-600 hover:bg-red-700"
                : "bg-[#1F3A6A] hover:bg-[#1F3A6A]/90"
            }
          >
            {loading ? "Processing..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main toolbar ─────────────────────────────────────────────────────

export function BulkActionsToolbar({
  selectedIds,
  onClear,
  config,
  totalCount,
}: BulkActionsToolbarProps) {
  const [statusVal, setStatusVal] = useState("");
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [processing, setProcessing] = useState(false);

  const count = selectedIds.size;
  if (count === 0) return null;

  const ids = Array.from(selectedIds);

  const handleStatusChange = async () => {
    if (!config.onStatusChange || !statusVal) return;
    setProcessing(true);
    try {
      await config.onStatusChange(ids, statusVal);
      setShowStatusConfirm(false);
      setStatusVal("");
      onClear();
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!config.onDelete) return;
    setProcessing(true);
    try {
      await config.onDelete(ids);
      setShowDeleteConfirm(false);
      onClear();
    } finally {
      setProcessing(false);
    }
  };

  const emails = config.getEmail
    ? ids.map((id) => config.getEmail!(id)).filter(Boolean) as string[]
    : [];

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-[#1F3A6A]/20 bg-[#1F3A6A]/5 px-4 py-2.5">
        {/* Selection count */}
        <span className="mr-1 text-sm font-semibold text-[#1F3A6A]">
          {count} of {totalCount} selected
        </span>

        <div className="mx-1 h-5 w-px bg-[#1F3A6A]/20" />

        {/* Status change */}
        {config.onStatusChange && (
          <div className="flex items-center gap-1.5">
            <Select
              value={statusVal}
              onValueChange={(v) => {
                setStatusVal(v);
                setShowStatusConfirm(true);
              }}
            >
              <SelectTrigger className="h-8 w-[150px] bg-white text-xs">
                <SelectValue placeholder="Change status" />
              </SelectTrigger>
              <SelectContent>
                {config.statuses.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Email */}
        {config.showEmail !== false && config.getEmail && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 bg-white text-xs"
            onClick={() => setShowEmailDialog(true)}
          >
            <Mail className="mr-1.5 h-3.5 w-3.5" />
            Email ({emails.length})
          </Button>
        )}

        {/* Export */}
        {config.onExport && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 bg-white text-xs"
            onClick={() => config.onExport!(ids)}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export CSV
          </Button>
        )}

        {/* Delete */}
        {config.showDelete && config.onDelete && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-red-200 bg-white text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
        )}

        <div className="flex-1" />

        {/* Clear selection */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-muted-foreground"
          onClick={onClear}
        >
          <X className="mr-1 h-3.5 w-3.5" />
          Clear
        </Button>
      </div>

      {/* Status change confirm */}
      <ConfirmDialog
        open={showStatusConfirm}
        onClose={() => {
          setShowStatusConfirm(false);
          setStatusVal("");
        }}
        onConfirm={handleStatusChange}
        title="Change Status"
        description={`Change the status of ${count} ${config.entityName}${count !== 1 ? "s" : ""} to "${config.statuses.find((s) => s.value === statusVal)?.label || statusVal}"?`}
        confirmLabel="Change Status"
        loading={processing}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Selected"
        description={`Are you sure you want to delete ${count} ${config.entityName}${count !== 1 ? "s" : ""}? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={processing}
      />

      {/* Email dialog */}
      <BulkEmailDialog
        open={showEmailDialog}
        onClose={() => setShowEmailDialog(false)}
        recipientCount={count}
        emails={emails}
        entityName={config.entityName}
      />
    </>
  );
}
