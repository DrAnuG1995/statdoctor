// Database row types matching the Supabase schema

export type UserRole = "admin" | "manager" | "sales" | "marketing" | "viewer";

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

// Doctors
export type DoctorStatus = "active" | "pipeline" | "unsubscribed" | "deleted";

export interface Doctor {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: DoctorStatus;
  source: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  app_downloaded: boolean;
  specialty: string | null;
  location: string | null;
  notes: string | null;
  medical_degree: string | null;
  skill_level: string | null;
  specialities: string[];
  ahpra_number: string | null;
  ahpra_restrictions: boolean;
  has_references: boolean;
  has_documents: boolean;
  registered_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface DoctorActivity {
  id: string;
  doctor_id: string;
  action: string;
  summary: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}

// Hospitals
export type HospitalStatus = "active" | "pipeline" | "pending" | "churned";

export interface Hospital {
  id: string;
  name: string;
  type: string | null;
  location: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: HospitalStatus;
  subscription_tier: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  position: number;
  color: string;
}

export interface HospitalDeal {
  id: string;
  hospital_id: string;
  name: string;
  value: number;
  stage_id: string;
  position: number;
  expected_close: string | null;
  assigned_to: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  hospital?: Hospital;
  stage?: PipelineStage;
}

export interface HospitalActivity {
  id: string;
  hospital_id: string;
  action: string;
  summary: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}

// Projects
export type ProjectStatus = "active" | "completed" | "on_hold";
export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  notion_page_id: string | null;
  deadline: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to: string | null;
  notion_block_id: string | null;
  due_date: string | null;
  position: number;
  created_at: string;
}

// Social Media
export type SocialPlatform = "facebook" | "instagram" | "tiktok" | "linkedin";
export type PostStatus = "draft" | "scheduled" | "published" | "failed";

export interface SocialAccount {
  id: string;
  platform: SocialPlatform;
  account_name: string;
  token_expires_at: string | null;
  created_at: string;
}

export interface SocialPost {
  id: string;
  content: string | null;
  platforms: string[];
  media_urls: string[];
  status: PostStatus;
  scheduled_at: string | null;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface AdCampaign {
  id: string;
  platform: string;
  campaign_id: string | null;
  name: string;
  status: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  cpc: number | null;
  cpm: number | null;
  synced_at: string;
}

// Investors
export type InvestorStatus = "active" | "pending" | "cold";
export type InvestorPipeline = "contacted" | "pitched" | "diligence" | "won" | "lost";

export interface Investor {
  id: string;
  name: string;
  company: string | null; // partner name
  email: string | null;
  phone: string | null;
  status: InvestorStatus;
  investment_amount: number | null;
  notes: string | null; // first line is pipeline stage
  created_at: string;
  updated_at: string;
}

export interface InvestorReport {
  id: string;
  title: string;
  content: string | null;
  pdf_url: string | null;
  created_by: string | null;
  created_at: string;
}

export interface InvestorReportRecipient {
  id: string;
  report_id: string;
  investor_id: string;
  tracking_id: string;
  email_sent: boolean;
  email_opened: boolean;
  opened_at: string | null;
  open_count: number;
}

export interface InvestorCommunication {
  id: string;
  investor_id: string;
  type: "email" | "call" | "meeting" | "note";
  subject: string | null;
  body: string | null;
  created_by: string | null;
  created_at: string;
}

// Activity Feed
export interface ActivityFeedItem {
  id: string;
  module: string;
  entity_id: string | null;
  action: string;
  summary: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}

// Shifts
export type ShiftStatus = "Active" | "Archived" | "Confirmed" | "Cancelled Doctor" | "Cancelled Hospital";

export interface Shift {
  id: string;
  shift_id: string;
  shift_no: number | null;
  shift_day_id: string | null;
  hospital_name: string;
  hospital_email: string | null;
  hospital_location: string | null;
  specialty: string | null;
  skill_level: string | null;
  support_level: string | null;
  rate_per_hour: number;
  fixed_rate: number;
  status: ShiftStatus;
  shift_date: string | null;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
  confirmed_at: string | null;
  completed_at: string | null;
  accommodation: string | null;
  travel_included: boolean;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  assigned_doctor_name: string | null;
  assigned_doctor_email: string | null;
  applicant_count: number;
  updated_at: string;
}

// Emails
export interface Email {
  id: string;
  gmail_id: string;
  thread_id: string;
  subject: string | null;
  snippet: string | null;
  from_address: string;
  from_name: string | null;
  to_addresses: string[];
  cc_addresses: string[];
  date: string;
  labels: string[];
  body_html: string | null;
  body_text: string | null;
  is_read: boolean;
  has_attachments: boolean;
  contact_type: "doctor" | "hospital" | "investor" | null;
  contact_id: string | null;
  synced_at: string;
  created_at: string;
}
