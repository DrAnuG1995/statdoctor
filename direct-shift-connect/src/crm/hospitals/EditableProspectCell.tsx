import { useState, useEffect, useRef } from "react";
import { Pencil } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

type Field = "email" | "contact" | "role" | "location" | "type";

interface EditableProspectCellProps {
  hospitalName: string;
  field: Field;
  value: string;
  onSaved: (newValue: string) => void;
  placeholder?: string;
  className?: string;
  linkify?: boolean;
}

const SIMPLE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EditableProspectCell({
  hospitalName,
  field,
  value,
  onSaved,
  placeholder = "— add",
  className = "",
  linkify = false,
}: EditableProspectCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function save() {
    const trimmed = draft.trim();
    if (trimmed === value.trim()) {
      setEditing(false);
      return;
    }
    if (field === "email" && trimmed && !SIMPLE_EMAIL.test(trimmed)) {
      toast.error("Invalid email format");
      return;
    }
    setSaving(true);
    try {
      // Upsert the override row (composite update across one field)
      const { error } = await supabase
        .from("prospect_overrides")
        .upsert(
          {
            hospital_name: hospitalName,
            [field]: trimmed || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "hospital_name" }
        );
      if (error) throw error;
      onSaved(trimmed);
      toast.success(`${field} updated`);
      setEditing(false);
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes("Could not find the table")) {
        toast.error(
          "prospect_overrides table not created yet — paste supabase/migrations/005_prospect_overrides.sql into Supabase SQL Editor"
        );
      } else {
        toast.error(`Save failed: ${msg}`);
      }
      setDraft(value);
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
        className={`group inline-flex items-center gap-1 text-left ${className}`}
        title="Click to edit"
      >
        {value ? (
          linkify ? (
            <span className="text-blue-600 group-hover:underline">{value}</span>
          ) : (
            <span>{value}</span>
          )
        ) : (
          <span className="text-muted-foreground italic">{placeholder}</span>
        )}
        <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 shrink-0" />
      </button>
    );
  }

  return (
    <input
      ref={inputRef}
      type={field === "email" ? "email" : "text"}
      disabled={saving}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          save();
        } else if (e.key === "Escape") {
          setDraft(value);
          setEditing(false);
        }
      }}
      className={`w-full rounded border border-blue-300 bg-white px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 ${className}`}
    />
  );
}
