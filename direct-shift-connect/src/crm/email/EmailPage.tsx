import { useState, useMemo, lazy, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "../shared/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Mail, MailOpen, Paperclip, Users, Layers, Reply, Zap } from "lucide-react";
import { toast } from "sonner";
import type { Email } from "../shared/types";

const EmailFlowsPage = lazy(() => import("./EmailFlowsPage"));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-AU", { month: "short", day: "numeric" });
}

const CONTACT_COLORS: Record<string, string> = {
  doctor: "bg-blue-100 text-blue-800",
  hospital: "bg-purple-100 text-purple-800",
  investor: "bg-green-100 text-green-800",
};

function ContactBadge({ type }: { type: string }) {
  const colors = CONTACT_COLORS[type] || "bg-gray-100 text-gray-700";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${colors}`}>
      {type}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Data hooks
// ---------------------------------------------------------------------------

function useEmails(search: string, tab: string) {
  return useQuery({
    queryKey: ["emails", search, tab],
    queryFn: async () => {
      let query = supabase
        .from("emails")
        .select("*")
        .order("date", { ascending: false });

      if (tab === "inbox") {
        query = query.contains("labels", ["INBOX"]);
      } else if (tab === "sent") {
        query = query.contains("labels", ["SENT"]);
      }

      if (search) {
        query = query.or(
          `subject.ilike.%${search}%,from_address.ilike.%${search}%,from_name.ilike.%${search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Email[];
    },
  });
}

function useThreadEmails(threadId: string | null) {
  return useQuery({
    queryKey: ["email-thread", threadId],
    queryFn: async () => {
      if (!threadId) return [];
      const { data, error } = await supabase
        .from("emails")
        .select("*")
        .eq("thread_id", threadId)
        .order("date", { ascending: true });
      if (error) throw error;
      return data as Email[];
    },
    enabled: !!threadId,
  });
}

// ---------------------------------------------------------------------------
// Email list item
// ---------------------------------------------------------------------------

function EmailRow({
  email,
  isSelected,
  onSelect,
}: {
  email: Email;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-4 py-3 border-b transition-colors ${
        isSelected
          ? "bg-[#1F3A6A]/5 border-l-2 border-l-[#A4D65E]"
          : "hover:bg-gray-50 border-l-2 border-l-transparent"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {!email.is_read && (
            <span className="h-2 w-2 shrink-0 rounded-full bg-[#1F3A6A]" />
          )}
          <span
            className={`truncate text-sm ${
              email.is_read ? "text-muted-foreground" : "font-semibold text-[#1F3A6A]"
            }`}
          >
            {email.from_name || email.from_address}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {email.has_attachments && (
            <Paperclip className="h-3 w-3 text-muted-foreground" />
          )}
          {email.contact_type && <ContactBadge type={email.contact_type} />}
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
            {formatRelativeDate(email.date)}
          </span>
        </div>
      </div>
      <p
        className={`mt-0.5 truncate text-sm ${
          email.is_read ? "text-muted-foreground" : "font-medium"
        }`}
      >
        {email.subject || "(no subject)"}
      </p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">
        {email.snippet || ""}
      </p>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Email detail / thread view
// ---------------------------------------------------------------------------

function EmailDetail({ email }: { email: Email }) {
  const { data: threadEmails = [] } = useThreadEmails(email.thread_id);

  // If the thread has more than one email, show thread; otherwise just the selected email
  const emails = threadEmails.length > 1 ? threadEmails : [email];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <h2 className="text-xl font-bold text-[#1F3A6A]">
          {email.subject || "(no subject)"}
        </h2>
        {threadEmails.length > 1 && (
          <p className="mt-1 text-xs text-muted-foreground">
            {threadEmails.length} messages in thread
          </p>
        )}
      </div>

      {/* Thread messages */}
      <ScrollArea className="flex-1">
        <div className="divide-y">
          {emails.map((msg) => (
            <div key={msg.id} className="px-6 py-4">
              {/* Metadata */}
              <div className="flex items-start justify-between mb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#1F3A6A]">
                      {msg.from_name || msg.from_address}
                    </span>
                    {msg.contact_type && <ContactBadge type={msg.contact_type} />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    From: {msg.from_address}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    To: {msg.to_addresses.join(", ")}
                  </p>
                  {msg.cc_addresses.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Cc: {msg.cc_addresses.join(", ")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {msg.has_attachments && (
                    <Badge variant="outline" className="text-[10px]">
                      <Paperclip className="h-3 w-3 mr-1" />
                      Attachments
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(msg.date).toLocaleString("en-AU", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
              </div>

              {/* Labels */}
              {msg.labels.length > 0 && (
                <div className="flex gap-1 mb-3 flex-wrap">
                  {msg.labels.map((label) => (
                    <Badge key={label} variant="secondary" className="text-[10px]">
                      {label}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Body */}
              {msg.body_html ? (
                <div
                  className="prose prose-sm max-w-none text-sm"
                  dangerouslySetInnerHTML={{ __html: msg.body_html }}
                />
              ) : (
                <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-sans">
                  {msg.body_text || ""}
                </pre>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Reply bar */}
      <div className="border-t px-6 py-3">
        <Button variant="outline" size="sm" className="gap-2">
          <Reply className="h-4 w-4" />
          Reply
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compose dialog
// ---------------------------------------------------------------------------

function ComposeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();

  const saveDraft = useMutation({
    mutationFn: async (draft: {
      to: string;
      subject: string;
      body: string;
    }) => {
      const { data, error } = await supabase
        .from("emails")
        .insert({
          gmail_id: `draft-${Date.now()}`,
          thread_id: `draft-thread-${Date.now()}`,
          subject: draft.subject,
          from_address: "me",
          from_name: "Me",
          to_addresses: draft.to.split(",").map((a) => a.trim()),
          cc_addresses: [],
          date: new Date().toISOString(),
          labels: ["DRAFT"],
          body_text: draft.body,
          body_html: null,
          snippet: draft.body.slice(0, 100),
          is_read: true,
          has_attachments: false,
          contact_type: null,
          contact_id: null,
          synced_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emails"] });
      onOpenChange(false);
      toast.success("Draft saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    saveDraft.mutate({
      to: form.get("to") as string,
      subject: form.get("subject") as string,
      body: form.get("body") as string,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Compose Email</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="to">To</Label>
            <Input id="to" name="to" type="text" placeholder="recipient@example.com" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" name="subject" type="text" placeholder="Subject" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea id="body" name="body" rows={8} placeholder="Write your message..." required />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#1F3A6A] hover:bg-[#1F3A6A]/90"
              disabled={saveDraft.isPending}
            >
              {saveDraft.isPending ? "Saving..." : "Save Draft"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function EmailPage() {
  const [activeTab, setActiveTab] = useState("inbox");
  const [search, setSearch] = useState("");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);

  const { data: emails = [], isLoading } = useEmails(search, activeTab);

  const selectedEmail = useMemo(
    () => emails.find((e) => e.id === selectedEmailId) ?? null,
    [emails, selectedEmailId]
  );

  // Summary stats
  const totalCount = emails.length;
  const unreadCount = emails.filter((e) => !e.is_read).length;
  const contactCount = emails.filter((e) => e.contact_type !== null).length;
  const threadCount = new Set(emails.map((e) => e.thread_id)).size;

  return (
    <div>
      <PageHeader
        title="Email"
        description="Gmail inbox synced to your CRM"
        actionLabel="Compose"
        onAction={() => setShowCompose(true)}
      />

      {/* Summary cards */}
      {activeTab !== "flows" && <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-[#1F3A6A]" />
              <div className="text-2xl font-bold text-[#1F3A6A]">{totalCount}</div>
            </div>
            <p className="text-xs text-muted-foreground">Total Emails</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <MailOpen className="h-4 w-4 text-yellow-600" />
              <div className="text-2xl font-bold text-yellow-600">{unreadCount}</div>
            </div>
            <p className="text-xs text-muted-foreground">Unread</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-600" />
              <div className="text-2xl font-bold text-green-600">{contactCount}</div>
            </div>
            <p className="text-xs text-muted-foreground">From Contacts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-purple-600" />
              <div className="text-2xl font-bold text-purple-600">{threadCount}</div>
            </div>
            <p className="text-xs text-muted-foreground">Threads</p>
          </CardContent>
        </Card>
      </div>}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
        <TabsList>
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          <TabsTrigger value="sent">Sent</TabsTrigger>
          <TabsTrigger value="all">All Mail</TabsTrigger>
          <TabsTrigger value="flows" className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" />
            Flows
          </TabsTrigger>
        </TabsList>

        {/* Search — hide on flows tab */}
        {activeTab !== "flows" && (
          <div className="mt-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by subject or sender..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        )}

        {/* Two-panel layout shared across all tabs */}
        {["inbox", "sent", "all"].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-0">
            <Card className="overflow-hidden">
              <div className="flex" style={{ height: "calc(100vh - 380px)", minHeight: 500 }}>
                {/* Left panel — email list */}
                <div className="w-[400px] shrink-0 border-r">
                  <ScrollArea className="h-full">
                    {isLoading ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        Loading emails...
                      </p>
                    ) : emails.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                        <Mail className="h-10 w-10 text-muted-foreground/40 mb-3" />
                        <p className="text-sm font-medium text-muted-foreground">No emails found</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {search
                            ? "Try a different search term"
                            : "Emails will appear here once synced"}
                        </p>
                      </div>
                    ) : (
                      emails.map((email) => (
                        <EmailRow
                          key={email.id}
                          email={email}
                          isSelected={email.id === selectedEmailId}
                          onSelect={() => setSelectedEmailId(email.id)}
                        />
                      ))
                    )}
                  </ScrollArea>
                </div>

                {/* Right panel — email detail */}
                <div className="flex-1 min-w-0">
                  {selectedEmail ? (
                    <EmailDetail email={selectedEmail} />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-center px-4">
                      <MailOpen className="h-12 w-12 text-muted-foreground/30 mb-3" />
                      <p className="text-sm font-medium text-muted-foreground">
                        Select an email to view
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Choose an email from the list on the left
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </TabsContent>
        ))}

        <TabsContent value="flows" className="mt-4">
          <Suspense fallback={<div className="py-12 text-center text-muted-foreground">Loading flows...</div>}>
            <EmailFlowsPage />
          </Suspense>
        </TabsContent>
      </Tabs>

      {/* Compose dialog */}
      <ComposeDialog open={showCompose} onOpenChange={setShowCompose} />
    </div>
  );
}
