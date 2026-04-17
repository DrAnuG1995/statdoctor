import { useState, useMemo } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Search, Mail, Send, Upload, Building2, Globe, Users, Undo2, AlertTriangle, ExternalLink, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import EnrollInFlowDialog from "../email/EnrollInFlowDialog";
import { toast } from "sonner";
import { logActivity } from "../shared/logActivity";
import { ComposeEmailDialog } from "../shared/components/ComposeEmailDialog";
import type { HospitalStatus } from "../shared/types";

// ── Unified Prospect type ───────────────────────────────────────────

interface Prospect {
  hospital: string;
  location: string;
  type: string;
  email: string;
  health_service: string;
  contact: string;
  role: string;
  source: "MedRecruit" | "Notion" | "ACEM";
}

// ── MedRecruit Hospital List (139 hospitals) ────────────────────────

const MEDRECRUIT_HOSPITALS: Prospect[] = [
  { hospital: "Royal Adelaide Hospital / Queen Elizabeth Hospital / Flinders Medical Centre", location: "Adelaide, SA", type: "Tertiary/Teaching", email: "Health.CALHNMedicalWorkforce@sa.gov.au", health_service: "Central Adelaide LHN", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Albury Wodonga Health - Albury Campus", location: "Albury, NSW", type: "Regional", email: "careers@awh.org.au", health_service: "Albury Wodonga Health", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Alice Springs Hospital", location: "Alice Springs, NT", type: "Regional", email: "medicalrecruitment.doh@nt.gov.au", health_service: "NT Health", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Armidale Rural Referral Hospital", location: "Armidale, NSW", type: "Rural Referral", email: "HNELHD-MedicalWorkforce@health.nsw.gov.au", health_service: "Hunter New England LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "St John of God Midland Public Hospital", location: "Ascot, WA", type: "Public/Private", email: "recruitment.midland@sjog.org.au", health_service: "St John of God Health Care", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Ashburton Hospital", location: "Ashburton, South Island NZ", type: "Rural", email: "Amy.Walker@cdhb.health.nz", health_service: "Te Whatu Ora - Canterbury", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Auburn Hospital", location: "Auburn, NSW", type: "Metropolitan", email: "WSLHD-Recruitment@health.nsw.gov.au", health_service: "Western Sydney LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Bacchus Marsh & Melton Regional Hospital (Djerriwarrh Health Services)", location: "Bacchus Marsh, VIC", type: "Regional", email: "careers@wh.org.au", health_service: "Western Health", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Clutha Health First (Balclutha Hospital)", location: "Balclutha, South Island NZ", type: "Rural", email: "info@chf.co.nz", health_service: "Clutha Health First", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Grampians Health - Ballarat Base Hospital", location: "Ballarat Central, VIC", type: "Regional/Base", email: "careers@gh.org.au", health_service: "Grampians Health", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Ballina District Hospital", location: "Ballina, NSW", type: "District", email: "NNSWLHD-CandidateExperienceTeam@health.nsw.gov.au", health_service: "Northern NSW LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Bankstown-Lidcombe Hospital", location: "Bankstown, NSW", type: "Metropolitan", email: "SWSLHD-ESU@health.nsw.gov.au", health_service: "South Western Sydney LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "South East Regional Hospital / Batemans Bay District Hospital", location: "Batemans Bay, NSW", type: "District", email: "SNSWLHD-MedicalWorkforce@health.nsw.gov.au", health_service: "Southern NSW LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Bathurst Base Hospital", location: "Bathurst, NSW", type: "Base/Regional", email: "WNSWLHD-MedicalWorkforce@health.nsw.gov.au", health_service: "Western NSW LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Flinders Medical Centre", location: "Bedford Park, SA", type: "Tertiary/Teaching", email: "Health.SALHNMedicalWorkforce@sa.gov.au", health_service: "Southern Adelaide LHN", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Bellingen River District Hospital", location: "Bellingen, NSW", type: "Rural/District", email: "MNCLHD-MedicalWorkforce@health.nsw.gov.au", health_service: "Mid North Coast LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Belmont District Hospital", location: "Belmont, NSW", type: "District", email: "HNELHD-MedicalWorkforce@health.nsw.gov.au", health_service: "Hunter New England LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Bendigo Hospital (Bendigo Health)", location: "Bendigo, VIC", type: "Regional", email: "careers@bendigohealth.org.au", health_service: "Bendigo Health", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Riverland General Hospital", location: "Berri, SA", type: "Regional", email: "Health.RMCLHNAdmin@sa.gov.au", health_service: "Riverland Mallee Coorong LHN", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Bowen Hospital", location: "Bowen, QLD", type: "Rural", email: "MHHS-Medical-Workforce@health.qld.gov.au", health_service: "Mackay HHS", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Bowral & District Hospital", location: "Bowral, NSW", type: "District", email: "SWSLHD-ESU@health.nsw.gov.au", health_service: "South Western Sydney LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Box Hill Hospital (Eastern Health)", location: "Box Hill, VIC", type: "Metropolitan/Teaching", email: "careers@easternhealth.org.au", health_service: "Eastern Health", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Broken Hill Base Hospital", location: "Broken Hill, NSW", type: "Base/Regional", email: "FWLHD-Recruitment@health.nsw.gov.au", health_service: "Far West LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Broome Hospital", location: "Broome, WA", type: "Regional", email: "WACHS.KimberleyHR@health.wa.gov.au", health_service: "WA Country Health Service", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Calvary Public Hospital Bruce", location: "Bruce, ACT", type: "Metropolitan", email: "recruitment@calvarycare.org.au", health_service: "Calvary Health Care", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Bunbury Hospital (South West Health Campus)", location: "Bunbury, WA", type: "Regional", email: "WACHS.SouthWestHR@health.wa.gov.au", health_service: "WA Country Health Service", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Bundaberg Hospital", location: "Bundaberg, QLD", type: "Regional", email: "WBHHS-Recruitment@health.qld.gov.au", health_service: "Wide Bay HHS", contact: "", role: "", source: "MedRecruit" },
  { hospital: "North West Regional Hospital", location: "Burnie, TAS", type: "Regional", email: "recruitment@ths.tas.gov.au", health_service: "Tasmanian Health Service", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Byron Central Hospital", location: "Byron Central, NSW", type: "District", email: "NNSWLHD-CandidateExperienceTeam@health.nsw.gov.au", health_service: "Northern NSW LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Cairns Hospital", location: "Cairns North, QLD", type: "Regional/Tertiary", email: "CHHHS-MedicalWorkforce@health.qld.gov.au", health_service: "Cairns & Hinterland HHS", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Hawke's Bay Fallen Soldiers' Memorial Hospital", location: "Camberley, North Island NZ", type: "Regional", email: "sandra.bee@hbdhb.govt.nz", health_service: "Te Whatu Ora - Hawke's Bay", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Campbelltown Hospital", location: "Campbelltown, NSW", type: "Metropolitan", email: "SWSLHD-ESU@health.nsw.gov.au", health_service: "South Western Sydney LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Canberra Hospital (The)", location: "Canberra, ACT", type: "Tertiary/Teaching", email: "CHS.MedicalRecruitment@act.gov.au", health_service: "Canberra Health Services", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Sutherland Hospital", location: "Caringbah, NSW", type: "Metropolitan", email: "SESLHD-MedicalWorkforceUnit@health.nsw.gov.au", health_service: "South Eastern Sydney LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Casino and District Memorial Hospital", location: "Casino, NSW", type: "Rural", email: "NNSWLHD-CandidateExperienceTeam@health.nsw.gov.au", health_service: "Northern NSW LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Christchurch Hospital (Te Whatu Ora)", location: "Christchurch, South Island NZ", type: "Tertiary/Teaching", email: "careers@cdhb.health.nz", health_service: "Te Whatu Ora - Canterbury", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Coffs Harbour Base Hospital", location: "Coffs Harbour, NSW", type: "Base/Regional", email: "MNCLHD-MedicalWorkforce@health.nsw.gov.au", health_service: "Mid North Coast LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Concord Repatriation General Hospital", location: "Concord, NSW", type: "Metropolitan/Teaching", email: "SLHD-MedicalWorkforce@health.nsw.gov.au", health_service: "Sydney LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Rockingham General Hospital", location: "Cooloongup, WA", type: "Metropolitan", email: "RKPG.Recruitment@health.wa.gov.au", health_service: "Rockingham Peel Group", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Cooma District Hospital", location: "Cooma, NSW", type: "District", email: "SNSWLHD-MedicalWorkforce@health.nsw.gov.au", health_service: "Southern NSW LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Tweed Hospital (The Tweed)", location: "Cudgen, NSW", type: "Regional", email: "NNSWLHD-CandidateExperienceTeam@health.nsw.gov.au", health_service: "Northern NSW LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Dorrigo Multi-Purpose Service", location: "Dorrigo, NSW", type: "Rural/MPS", email: "MNCLHD-MedicalWorkforce@health.nsw.gov.au", health_service: "Mid North Coast LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Townsville University Hospital", location: "Douglas, QLD", type: "Tertiary/Teaching", email: "THHS-MedicalWorkforce@health.qld.gov.au", health_service: "Townsville HHS", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Dubbo Base Hospital", location: "Dubbo, NSW", type: "Base/Regional", email: "WNSWLHD-MedicalWorkforce@health.nsw.gov.au", health_service: "Western NSW LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Dunedin Hospital (Te Whatu Ora Southern)", location: "Dunedin, South Island NZ", type: "Tertiary/Teaching", email: "rmo.recruitment@southerndhb.govt.nz", health_service: "Te Whatu Ora - Southern", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Maitland Hospital", location: "East Maitland, NSW", type: "Regional", email: "HNELHD-MedicalWorkforce@health.nsw.gov.au", health_service: "Hunter New England LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Wollongong Hospital", location: "Figtree, NSW", type: "Regional/Teaching", email: "ISLHD-MedicalWorkforce@health.nsw.gov.au", health_service: "Illawarra Shoalhaven LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Northern Beaches Hospital", location: "Frenches Forest, NSW", type: "Metropolitan", email: "enquiries@northernbeacheshospital.com.au", health_service: "Northern Sydney LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Gin Gin Hospital", location: "Gin Gin, QLD", type: "Rural", email: "WBHHS-Recruitment@health.qld.gov.au", health_service: "Wide Bay HHS", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Gisborne Hospital (Hauora Tairāwhiti)", location: "Gisborne, North Island NZ", type: "Regional", email: "Communications@tdh.org.nz", health_service: "Hauora Tairāwhiti", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Gladstone Hospital", location: "Gladstone, QLD", type: "Regional", email: "CQHHS-Recruitment@health.qld.gov.au", health_service: "Central QLD HHS", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Gosford Hospital", location: "Gosford, NSW", type: "Regional/Teaching", email: "CCLHD-MWEUJMORecruit@health.nsw.gov.au", health_service: "Central Coast LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Goulburn Base Hospital", location: "Goulburn, NSW", type: "Base", email: "SNSWLHD-MedicalWorkforce@health.nsw.gov.au", health_service: "Southern NSW LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Grafton Base Hospital", location: "Grafton, NSW", type: "Base", email: "NNSWLHD-CandidateExperienceTeam@health.nsw.gov.au", health_service: "Northern NSW LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Griffith Base Hospital", location: "Griffith, NSW", type: "Base", email: "mlhd-griffith-dms@health.nsw.gov.au", health_service: "Murrumbidgee LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Waikato Hospital", location: "Hamilton, North Island NZ", type: "Tertiary/Teaching", email: "recruitment@waikatodhb.health.nz", health_service: "Te Whatu Ora - Waikato", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Wyong Hospital", location: "Hamlyn Terrace, NSW", type: "Regional", email: "CCLHD-MWEUJMORecruit@health.nsw.gov.au", health_service: "Central Coast LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Hornsby Ku-ring-gai Hospital", location: "Hornsby, NSW", type: "Metropolitan", email: "NSLHD-EmployeeServices@health.nsw.gov.au", health_service: "Northern Sydney LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Innisfail Hospital", location: "Innisfail, QLD", type: "Rural/Regional", email: "CHHHS-MedicalWorkforce@health.qld.gov.au", health_service: "Cairns & Hinterland HHS", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Southland Hospital", location: "Invercargill, South Island NZ", type: "Regional", email: "rmo.recruitment@southerndhb.govt.nz", health_service: "Te Whatu Ora - Southern", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Joondalup Health Campus", location: "Joondalup, WA", type: "Metropolitan", email: "recruitment@ramsayhealth.com.au", health_service: "Ramsay Health Care", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Kaitaia Hospital", location: "Kaitaia, North Island NZ", type: "Rural", email: "SMO.Jobs@northlanddhb.org.nz", health_service: "Te Whatu Ora - Northland", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Kalgoorlie Health Campus", location: "Kalgoorlie, WA", type: "Regional", email: "WACHS.GoldfieldsHR@health.wa.gov.au", health_service: "WA Country Health Service", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Bay of Islands Hospital", location: "Kawakawa, North Island NZ", type: "Rural", email: "SMO.Jobs@northlanddhb.org.nz", health_service: "Te Whatu Ora - Northland", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Kempsey District Hospital", location: "Kempsey, NSW", type: "District", email: "MNCLHD-MedicalWorkforce@health.nsw.gov.au", health_service: "Mid North Coast LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "St George Hospital", location: "Kogarah, NSW", type: "Metropolitan/Teaching", email: "SESLHD-MedicalWorkforceUnitSTG@health.nsw.gov.au", health_service: "South Eastern Sydney LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Latrobe Community Health Service / Mersey Community", location: "Latrobe, TAS", type: "Regional", email: "recruitment@ths.tas.gov.au", health_service: "Tasmanian Health Service", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Launceston General Hospital", location: "Launceston, TAS", type: "Regional/Teaching", email: "recruitment@ths.tas.gov.au", health_service: "Tasmanian Health Service", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Leongatha Memorial Hospital (Gippsland Southern Health)", location: "Leongatha, VIC", type: "Rural", email: "info@gshs.com.au", health_service: "Gippsland Southern Health Service", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Lismore Base Hospital", location: "Lismore, NSW", type: "Base/Regional", email: "NNSWLHD-CandidateExperienceTeam@health.nsw.gov.au", health_service: "Northern NSW LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Liverpool Hospital", location: "Liverpool, NSW", type: "Tertiary/Teaching", email: "SWSLHD-ESU@health.nsw.gov.au", health_service: "South Western Sydney LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Mackay Base Hospital", location: "Mackay, QLD", type: "Base/Regional", email: "MHHS-Medical-Workforce@health.qld.gov.au", health_service: "Mackay HHS", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Macksville District Hospital", location: "Macksville, NSW", type: "District", email: "MNCLHD-MedicalWorkforce@health.nsw.gov.au", health_service: "Mid North Coast LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Maclean District Hospital", location: "Maclean, NSW", type: "District", email: "NNSWLHD-CandidateExperienceTeam@health.nsw.gov.au", health_service: "Northern NSW LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Wairarapa Hospital", location: "Masterton, North Island NZ", type: "Regional", email: "kathy.lee@wairarapa.dhb.org.nz", health_service: "Te Whatu Ora - Wairarapa", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Royal Melbourne Hospital / The Alfred / St Vincent's Melbourne", location: "Melbourne, VIC", type: "Tertiary/Teaching", email: "medical.workforce@mh.org.au", health_service: "Melbourne Health", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Bacchus Marsh & Melton Regional Hospital", location: "Melton West, VIC", type: "Regional", email: "careers@wh.org.au", health_service: "Western Health", contact: "", role: "", source: "MedRecruit" },
  { hospital: "St John of God Midland Public Hospital", location: "Midland, WA", type: "Metropolitan", email: "recruitment.midland@sjog.org.au", health_service: "St John of God Health Care", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Mildura Base Public Hospital", location: "Mildura, VIC", type: "Base/Regional", email: "feedback@mbph.org.au", health_service: "Mildura Base Public Hospital", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Milton-Ulladulla Hospital", location: "Milton, NSW", type: "Rural", email: "ISLHD-MedicalWorkforce@health.nsw.gov.au", health_service: "Illawarra Shoalhaven LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Moruya District Hospital", location: "Moruya, NSW", type: "District", email: "SNSWLHD-MedicalWorkforce@health.nsw.gov.au", health_service: "Southern NSW LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Mount Gambier and Districts Health Service", location: "Mount Gambier, SA", type: "Regional", email: "Health.LCLHNAdmin@sa.gov.au", health_service: "Limestone Coast LHN", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Mudgee District Hospital", location: "Mudgee, NSW", type: "District", email: "WNSWLHD-MedicalWorkforce@health.nsw.gov.au", health_service: "Western NSW LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Muswellbrook District Hospital", location: "Muswellbrook, NSW", type: "District", email: "HNELHD-MedicalWorkforce@health.nsw.gov.au", health_service: "Hunter New England LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Nambour General Hospital", location: "Nambour, QLD", type: "Regional", email: "SCHHS-Recruitment@health.qld.gov.au", health_service: "Sunshine Coast HHS", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Nelson Hospital (Te Whatu Ora)", location: "Nelson, South Island NZ", type: "Regional", email: "hr@nmdhb.govt.nz", health_service: "Te Whatu Ora - Nelson Marlborough", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Taranaki Base Hospital", location: "New Plymouth, North Island NZ", type: "Base/Regional", email: "hr@tdhb.org.nz", health_service: "Te Whatu Ora - Taranaki", contact: "", role: "", source: "MedRecruit" },
  { hospital: "John Hunter Hospital", location: "Newcastle, NSW", type: "Tertiary/Teaching", email: "HNELHD-MedicalWorkforce@health.nsw.gov.au", health_service: "Hunter New England LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Newman Hospital", location: "Newman, WA", type: "Remote/Rural", email: "WACHS.PilbaraHR@health.wa.gov.au", health_service: "WA Country Health Service", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Nhill Hospital (West Wimmera Health Service)", location: "Nhill, VIC", type: "Rural", email: "intake@wwhs.net.au", health_service: "West Wimmera Health Service", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Shoalhaven District Memorial Hospital", location: "Nowra, NSW", type: "District/Regional", email: "ISLHD-MedicalWorkforce@health.nsw.gov.au", health_service: "Illawarra Shoalhaven LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Orange Health Service (Orange Base Hospital)", location: "Orange, NSW", type: "Base/Regional", email: "WNSWLHD-MedicalWorkforce@health.nsw.gov.au", health_service: "Western NSW LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Palmerston North Hospital (MidCentral)", location: "Palmerston North, North Island NZ", type: "Regional/Teaching", email: "helen.manoharan@tewhatuora.govt.nz", health_service: "Te Whatu Ora - MidCentral", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Parkes District Hospital", location: "Parkes, NSW", type: "District", email: "WNSWLHD-MedicalWorkforce@health.nsw.gov.au", health_service: "Western NSW LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Nepean Hospital", location: "Penrith, NSW", type: "Metropolitan/Teaching", email: "NBMLHD-JMORecruitment@health.nsw.gov.au", health_service: "Nepean Blue Mountains LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Port Augusta Hospital", location: "Port Augusta, SA", type: "Regional", email: "Health.FUNLHNAdmin@sa.gov.au", health_service: "Flinders & Upper North LHN", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Port Lincoln Hospital", location: "Port Lincoln, SA", type: "Regional", email: "chsaptllincolnswitchboard@health.sa.gov.au", health_service: "Eyre & Far North LHN", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Port Macquarie Base Hospital", location: "Port Macquarie, NSW", type: "Base/Regional", email: "MNCLHD-PMBH-HIRS@health.nsw.gov.au", health_service: "Mid North Coast LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Queanbeyan District Hospital", location: "Queanbeyan, NSW", type: "District", email: "SNSWLHD-MedicalWorkforce@health.nsw.gov.au", health_service: "Southern NSW LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Robina Hospital (Gold Coast Health)", location: "Robina, QLD", type: "Metropolitan", email: "GCHHS-Recruitment@health.qld.gov.au", health_service: "Gold Coast HHS", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Rockhampton Hospital", location: "Rockhampton, QLD", type: "Regional", email: "CQHHS-Recruitment@health.qld.gov.au", health_service: "Central QLD HHS", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Roma Hospital", location: "Roma, QLD", type: "Rural/Regional", email: "SWHHS-Recruitment@health.qld.gov.au", health_service: "South West HHS", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Rotorua Hospital (Lakes DHB)", location: "Rotorua, North Island NZ", type: "Regional", email: "vacancy@lakesdhb.govt.nz", health_service: "Te Whatu Ora - Lakes", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Sarina Hospital", location: "Sarina, QLD", type: "Rural", email: "sarina.admin@health.qld.gov.au", health_service: "Mackay HHS", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Shellharbour Hospital", location: "Shellharbour, NSW", type: "District", email: "ISLHD-MedicalWorkforce@health.nsw.gov.au", health_service: "Illawarra Shoalhaven LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Royal Perth Hospital / Perth Children's Hospital precinct", location: "Shenton Park, WA", type: "Tertiary", email: "RPH.InfoCentre@health.wa.gov.au", health_service: "East Metropolitan Health Service", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Goulburn Valley Health (GV Health) - Shepparton", location: "Shepparton, VIC", type: "Regional", email: "medicalworkforce@gvhealth.org.au", health_service: "Goulburn Valley Health", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Ipswich Hospital / West Moreton Health", location: "South Ripley, QLD", type: "Regional", email: "SNSWLHD-MedicalWorkforce@health.nsw.gov.au", health_service: "Southern NSW LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "The Alfred Hospital / South Melbourne precinct", location: "Southbank, VIC", type: "Tertiary/Teaching", email: "medical.workforce@alfred.org.au", health_service: "Alfred Health", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Gold Coast University Hospital", location: "Southport, QLD", type: "Tertiary/Teaching", email: "GCHHS-Recruitment@health.qld.gov.au", health_service: "Gold Coast HHS", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Sunshine Hospital (Western Health)", location: "St Albans, VIC", type: "Metropolitan", email: "careers@wh.org.au", health_service: "Western Health", contact: "", role: "", source: "MedRecruit" },
  { hospital: "The Alfred Hospital", location: "St Kilda, VIC", type: "Tertiary/Teaching", email: "medical.workforce@alfred.org.au", health_service: "Alfred Health", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Swan Hill District Health", location: "Swan Hill, VIC", type: "Rural/Regional", email: "hr@shdh.org.au", health_service: "Swan Hill District Health", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Manning Rural Referral Hospital", location: "Taree, NSW", type: "Rural Referral", email: "MNCLHD-MedicalWorkforce@health.nsw.gov.au", health_service: "Mid North Coast LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Taupo Hospital", location: "Taupo, North Island NZ", type: "Rural", email: "vacancy@lakesdhb.govt.nz", health_service: "Te Whatu Ora - Lakes", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Tauranga Hospital", location: "Tauranga, North Island NZ", type: "Regional", email: "medicalstaffrecruitment@bopdhb.govt.nz", health_service: "Te Whatu Ora - Bay of Plenty", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Timaru Hospital", location: "Timaru, South Island NZ", type: "Regional", email: "careers@scdhb.health.nz", health_service: "Te Whatu Ora - South Canterbury", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Tom Price Hospital", location: "Tom Price, WA", type: "Remote/Rural", email: "wachspb_tphadmin@health.wa.gov.au", health_service: "WA Country Health Service", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Latrobe Regional Hospital", location: "Traralgon West, VIC", type: "Regional", email: "inquiry@lrh.com.au", health_service: "Latrobe Regional Hospital", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Tully Hospital", location: "Tully, QLD", type: "Rural", email: "CHHHS-MedicalWorkforce@health.qld.gov.au", health_service: "Cairns & Hinterland HHS", contact: "", role: "", source: "MedRecruit" },
  { hospital: "South Coast District Hospital", location: "Victor Harbor, SA", type: "District", email: "CHSASCDHAdministration@health.sa.gov.au", health_service: "Barossa Hills Fleurieu LHN", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Ipswich Hospital (West Moreton Health)", location: "Wacol, QLD", type: "Regional", email: "wmmedicalworkforce@health.qld.gov.au", health_service: "West Moreton Health", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Wagga Wagga Rural Referral Hospital", location: "Wagga Wagga, NSW", type: "Rural Referral", email: "mlhd-careers@health.nsw.gov.au", health_service: "Murrumbidgee LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Sydney Adventist Hospital / Hornsby Hospital precinct", location: "Wahroonga, NSW", type: "Metropolitan/Private", email: "enquiries@sah.org.au", health_service: "Sydney Adventist Hospital (Private)", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Northeast Health Wangaratta", location: "Wangaratta, VIC", type: "Regional", email: "medicalworkforce@nhw.org.au", health_service: "Northeast Health Wangaratta", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Calvary Mater Newcastle", location: "Waratah, NSW", type: "Metropolitan/Teaching", email: "recruitment@calvarycare.org.au", health_service: "Calvary Health Care", contact: "", role: "", source: "MedRecruit" },
  { hospital: "West Gippsland Healthcare Group (Warragul Hospital)", location: "Warragul, VIC", type: "Regional", email: "info@wghg.com.au", health_service: "West Gippsland Healthcare Group", contact: "", role: "", source: "MedRecruit" },
  { hospital: "South West Healthcare - Warrnambool", location: "Warrnambool, VIC", type: "Regional", email: "careers@swh.net.au", health_service: "South West Healthcare", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Wellington Regional Hospital", location: "Wellington, North Island NZ", type: "Tertiary/Teaching", email: "rmo_recruitment@ccdhb.org.nz", health_service: "Te Whatu Ora - Capital & Coast", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Werribee Mercy Hospital", location: "Werribee, VIC", type: "Metropolitan", email: "careers@mercy.com.au", health_service: "Mercy Health", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Busselton Health Campus", location: "West Busselton, WA", type: "Regional", email: "wachssw.bndh.hospitaladmin@health.wa.gov.au", health_service: "WA Country Health Service", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Whakatane Hospital", location: "Whakatane, North Island NZ", type: "Regional", email: "BP-careers@tewhatuora.govt.nz", health_service: "Te Whatu Ora - Bay of Plenty", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Hawkesbury District Health Service (Windsor)", location: "Windsor, NSW", type: "District", email: "NBMLHD-HawkesburyHospital@health.nsw.gov.au", health_service: "Nepean Blue Mountains LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Albury Wodonga Health - Wodonga Campus", location: "Wodonga, VIC", type: "Regional", email: "careers@awh.org.au", health_service: "Albury Wodonga Health", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Wollongong Hospital", location: "Wollongong, NSW", type: "Regional/Teaching", email: "ISLHD-MedicalWorkforce@health.nsw.gov.au", health_service: "Illawarra Shoalhaven LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Woy Woy Hospital / Brisbane Waters Private Hospital", location: "Woy Woy, NSW", type: "District", email: "CCLHD-Feedback@health.nsw.gov.au", health_service: "Central Coast LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Wyong Hospital", location: "Wyong, NSW", type: "Regional", email: "CCLHD-MWEUJMORecruit@health.nsw.gov.au", health_service: "Central Coast LHD", contact: "", role: "", source: "MedRecruit" },
  { hospital: "Young District Hospital", location: "Young, NSW", type: "District", email: "SNSWLHD-MedicalWorkforce@health.nsw.gov.au", health_service: "Southern NSW LHD", contact: "", role: "", source: "MedRecruit" },
];

// ── Notion Hospital Prospective List ────────────────────────────────

const NOTION_HOSPITALS: Prospect[] = [
  { hospital: "The Melbourne Clinic", email: "chuang@themelbourneclinic.com.au", contact: "Chia Huang", role: "Medical Director", source: "Notion", location: "VIC", type: "", health_service: "" },
  { hospital: "Bethesda Hospital", email: "nelson@baptisthealth.net", contact: "Nelson Lazo", role: "CEO", source: "Notion", location: "WA", type: "", health_service: "" },
  { hospital: "Childers Hospital", email: "kevin.churchwell@childrenshospital.org", contact: "Kevin Churchwell", role: "CEO", source: "Notion", location: "QLD", type: "", health_service: "" },
  { hospital: "Epworth Richmond", email: "", contact: "", role: "", source: "Notion", location: "VIC", type: "", health_service: "" },
  { hospital: "Western Hospital", email: "", contact: "", role: "", source: "Notion", location: "VIC", type: "", health_service: "" },
  { hospital: "Cabrini Brighton", email: "", contact: "", role: "", source: "Notion", location: "VIC", type: "", health_service: "" },
  { hospital: "Castlemaine Health", email: "", contact: "", role: "", source: "Notion", location: "VIC", type: "", health_service: "" },
  { hospital: "Longreach Hospital", email: "", contact: "", role: "", source: "Notion", location: "QLD", type: "", health_service: "" },
  { hospital: "Kilcoy Hospital", email: "", contact: "", role: "", source: "Notion", location: "QLD", type: "", health_service: "" },
  { hospital: "Donnybrook Hospital", email: "", contact: "", role: "", source: "Notion", location: "WA", type: "", health_service: "" },
  { hospital: "Logan Hospital", email: "", contact: "", role: "", source: "Notion", location: "QLD", type: "", health_service: "" },
  { hospital: "Kingaroy Hospital", email: "", contact: "", role: "", source: "Notion", location: "QLD", type: "", health_service: "" },
  { hospital: "Gippsland Hospital", email: "", contact: "", role: "", source: "Notion", location: "VIC", type: "", health_service: "" },
  { hospital: "Clermont Hospital", email: "", contact: "", role: "", source: "Notion", location: "QLD", type: "", health_service: "" },
  { hospital: "Benalla Health", email: "", contact: "", role: "", source: "Notion", location: "VIC", type: "", health_service: "" },
  { hospital: "Chillagoe Hospital", email: "", contact: "", role: "", source: "Notion", location: "QLD", type: "", health_service: "" },
  { hospital: "Kiama Hospital", email: "", contact: "", role: "", source: "Notion", location: "NSW", type: "", health_service: "" },
  { hospital: "Hobson Healthcare", email: "", contact: "", role: "", source: "Notion", location: "VIC", type: "", health_service: "" },
  { hospital: "Atherton Hospital", email: "", contact: "", role: "", source: "Notion", location: "QLD", type: "", health_service: "" },
  { hospital: "Alpine Health", email: "", contact: "", role: "", source: "Notion", location: "VIC", type: "", health_service: "" },
  { hospital: "Ashford Hospital", email: "", contact: "", role: "", source: "Notion", location: "SA", type: "", health_service: "" },
  { hospital: "The Canberra Hospital", email: "", contact: "", role: "", source: "Notion", location: "ACT", type: "", health_service: "" },
  { hospital: "The Bays Hospital", email: "", contact: "", role: "", source: "Notion", location: "VIC", type: "", health_service: "" },
  { hospital: "Boonah Hospital", email: "", contact: "", role: "", source: "Notion", location: "QLD", type: "", health_service: "" },
  { hospital: "Hospital Surgical", email: "", contact: "", role: "", source: "Notion", location: "", type: "", health_service: "" },
  { hospital: "Memorial Hospital", email: "", contact: "", role: "", source: "Notion", location: "SA", type: "", health_service: "" },
  { hospital: "Stirling Hospital", email: "", contact: "", role: "", source: "Notion", location: "SA", type: "", health_service: "" },
  { hospital: "Forster Private Hospital", email: "", contact: "", role: "", source: "Notion", location: "NSW", type: "", health_service: "" },
  { hospital: "Maitland Private Hospital", email: "", contact: "", role: "", source: "Notion", location: "NSW", type: "", health_service: "" },
  { hospital: "Blacktown Hospital", email: "", contact: "", role: "", source: "Notion", location: "NSW", type: "", health_service: "" },
  { hospital: "York Hospital", email: "", contact: "", role: "", source: "Notion", location: "WA", type: "", health_service: "" },
  { hospital: "Elliston Hospital", email: "", contact: "", role: "", source: "Notion", location: "SA", type: "", health_service: "" },
  { hospital: "Baralaba Hospital", email: "", contact: "", role: "", source: "Notion", location: "QLD", type: "", health_service: "" },
  { hospital: "Stanthorpe Hospital", email: "", contact: "", role: "", source: "Notion", location: "QLD", type: "", health_service: "" },
  { hospital: "Lithgow Hospital", email: "", contact: "", role: "", source: "Notion", location: "NSW", type: "", health_service: "" },
  { hospital: "Augusta Hospital", email: "", contact: "", role: "", source: "Notion", location: "WA", type: "", health_service: "" },
  { hospital: "Wondai Hospital", email: "", contact: "", role: "", source: "Notion", location: "QLD", type: "", health_service: "" },
  { hospital: "Laidley Hospital", email: "", contact: "", role: "", source: "Notion", location: "QLD", type: "", health_service: "" },
  { hospital: "Balmain Hospital", email: "", contact: "", role: "", source: "Notion", location: "NSW", type: "", health_service: "" },
  { hospital: "Dalby Hospital", email: "", contact: "", role: "", source: "Notion", location: "QLD", type: "", health_service: "" },
  { hospital: "Townsville Hospital", email: "", contact: "", role: "", source: "Notion", location: "QLD", type: "", health_service: "" },
  { hospital: "Modbury Hospital", email: "", contact: "", role: "", source: "Notion", location: "SA", type: "", health_service: "" },
];

// ── ACEM Jobs Board Prospects (Apr 2026) ───────────────────────────

const ACEM_HOSPITALS: Prospect[] = [
  { hospital: "WA Virtual Emergency Department (WAVED)", location: "Perth, WA", type: "Virtual ED", email: "Ian.Dey@health.wa.gov.au", health_service: "WA Country Health Service (WACHS)", contact: "Dr Ian Dey", role: "Medical Director - WAVED", source: "ACEM" },
  { hospital: "Gawler Health Service", location: "Gawler East, SA", type: "Public Hospital", email: "sheetal.kanani@sa.gov.au", health_service: "Barossa Hills Fleurieu LHN", contact: "Sheetal Kanani", role: "Senior Medical Services Officer", source: "ACEM" },
  { hospital: "Launceston General Hospital", location: "Launceston, TAS", type: "Public Hospital", email: "fiona.cowan@ths.tas.gov.au", health_service: "Tasmanian Health Service", contact: "Dr Fiona Cowan", role: "Staff Specialist ED", source: "ACEM" },
  { hospital: "Box Hill Hospital", location: "Box Hill, VIC", type: "Metropolitan/Teaching", email: "anita.liu@easternhealth.org.au", health_service: "Eastern Health", contact: "Dr Anita Liu", role: "ED Director", source: "ACEM" },
  { hospital: "Maroondah Hospital", location: "Ringwood East, VIC", type: "Metropolitan", email: "benjamin.land@easternhealth.org.au", health_service: "Eastern Health", contact: "Dr Ben Land", role: "ED Director", source: "ACEM" },
  { hospital: "Angliss Hospital", location: "Upper Ferntree Gully, VIC", type: "Metropolitan", email: "martin.koolstra@easternhealth.org.au", health_service: "Eastern Health", contact: "Dr Marty Koolstra", role: "ED Director", source: "ACEM" },
  { hospital: "Maitland Hospital", location: "Metford, NSW", type: "Regional", email: "scott.flannagan@health.nsw.gov.au", health_service: "Hunter New England LHD", contact: "Dr Scott Flannagan", role: "Co-Director ED", source: "ACEM" },
  { hospital: "Bundaberg Hospital", location: "Bundaberg, QLD", type: "Regional", email: "", health_service: "Wide Bay HHS", contact: "Dr Timothy Graves", role: "ED Contact", source: "ACEM" },
  { hospital: "Auckland City Hospital", location: "Auckland, NZ", type: "Tertiary/Teaching", email: "markfr@adhb.govt.nz", health_service: "Health New Zealand - Te Whatu Ora", contact: "Mark Friedericksen", role: "Service Clinical Director AED", source: "ACEM" },
  { hospital: "PEHA (Private Emergency Health Australia)", location: "Townsville/Rockhampton/Mackay/Bundaberg, QLD", type: "Private ED Provider", email: "joinus@peha.com.au", health_service: "PEHA", contact: "", role: "", source: "ACEM" },
];

// ── All prospects combined ──────────────────────────────────────────

const ALL_PROSPECTS: Prospect[] = [...MEDRECRUIT_HOSPITALS, ...NOTION_HOSPITALS, ...ACEM_HOSPITALS];

// ── ProspectsPage Component ─────────────────────────────────────────

export default function ProspectsPage({ existingHospitalNames, hospitalNameToId }: { existingHospitalNames: Set<string>; hospitalNameToId?: Map<string, string> }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "MedRecruit" | "Notion" | "ACEM">("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedIdxs, setSelectedIdxs] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [totalToImport, setTotalToImport] = useState(0);
  const [showCompose, setShowCompose] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState<{ name: string; email: string }[]>([]);
  const [showConfirmImport, setShowConfirmImport] = useState(false);
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [lastImportIds, setLastImportIds] = useState<{ hospitalIds: string[]; dealIds: string[] } | null>(null);
  const [undoing, setUndoing] = useState(false);

  // Fetch pipeline stages for import
  const { data: stages = [] } = useQuery({
    queryKey: ["pipeline-stages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hospital_pipeline_stages")
        .select("*")
        .order("position");
      if (error) throw error;
      return data as { id: string; name: string; color: string; position: number }[];
    },
  });
  const defaultStageId = stages.length > 0 ? stages[0].id : null;

  // Get unique types for filter
  const uniqueTypes = useMemo(() => {
    const types = new Set<string>();
    ALL_PROSPECTS.forEach((p) => {
      if (p.type) types.add(p.type);
    });
    return Array.from(types).sort();
  }, []);

  // Filtered list
  const filtered = useMemo(() => {
    let list = ALL_PROSPECTS.map((p, i) => ({ ...p, _idx: i }));

    if (sourceFilter !== "all") {
      list = list.filter((p) => p.source === sourceFilter);
    }
    if (typeFilter !== "all") {
      list = list.filter((p) => p.type === typeFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.hospital.toLowerCase().includes(q) ||
          p.location.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          p.contact.toLowerCase().includes(q) ||
          p.health_service.toLowerCase().includes(q) ||
          p.type.toLowerCase().includes(q)
      );
    }

    return list;
  }, [search, sourceFilter, typeFilter]);

  // Counts
  const totalCount = ALL_PROSPECTS.length;
  const withEmail = ALL_PROSPECTS.filter((p) => p.email).length;
  const alreadyInCrm = ALL_PROSPECTS.filter((p) => existingHospitalNames.has(p.hospital.toLowerCase())).length;
  const selectableFiltered = filtered.filter((p) => !existingHospitalNames.has(p.hospital.toLowerCase()));

  // Selection helpers
  const toggleIdx = (idx: number) => {
    setSelectedIdxs((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    if (checked) {
      const set = new Set(selectedIdxs);
      selectableFiltered.forEach((p) => set.add(p._idx));
      setSelectedIdxs(set);
    } else {
      const toRemove = new Set(selectableFiltered.map((p) => p._idx));
      setSelectedIdxs((prev) => {
        const next = new Set(prev);
        toRemove.forEach((idx) => next.delete(idx));
        return next;
      });
    }
  };

  const allFilteredSelected =
    selectableFiltered.length > 0 &&
    selectableFiltered.every((p) => selectedIdxs.has(p._idx));

  // Email single prospect
  const handleEmailOne = (prospect: Prospect) => {
    if (!prospect.email) {
      toast.error("No email address for this prospect");
      return;
    }
    setEmailRecipients([{ name: prospect.hospital, email: prospect.email }]);
    setShowCompose(true);
  };

  // Email selected prospects
  const handleEmailSelected = () => {
    const recipients = Array.from(selectedIdxs)
      .map((idx) => ALL_PROSPECTS[idx])
      .filter((p) => p.email)
      .map((p) => ({ name: p.hospital, email: p.email }));

    if (recipients.length === 0) {
      toast.error("No email addresses found for selected prospects");
      return;
    }

    setEmailRecipients(recipients);
    setShowCompose(true);
  };

  // Show confirmation before importing
  const handleImportClick = () => {
    const toImport = Array.from(selectedIdxs)
      .map((idx) => ALL_PROSPECTS[idx])
      .filter((p) => !existingHospitalNames.has(p.hospital.toLowerCase()));

    if (toImport.length === 0) {
      toast.error("No new prospects to import (all already exist)");
      return;
    }

    setShowConfirmImport(true);
  };

  // Import selected into pipeline (called after confirmation)
  const handleImport = async () => {
    setShowConfirmImport(false);
    const toImport = Array.from(selectedIdxs)
      .map((idx) => ALL_PROSPECTS[idx])
      .filter((p) => !existingHospitalNames.has(p.hospital.toLowerCase()));

    if (toImport.length === 0) {
      toast.error("No new prospects to import (all already exist)");
      return;
    }

    setImporting(true);
    setImportedCount(0);
    setTotalToImport(toImport.length);

    const importedHospitalIds: string[] = [];
    const importedDealIds: string[] = [];
    let successCount = 0;

    for (const row of toImport) {
      try {
        const notes = row.source === "MedRecruit"
          ? `Source: MedRecruit | Location: ${row.location} | Type: ${row.type} | Health Service: ${row.health_service}`
          : `Source: Notion Prospect List${row.role ? ` | Role: ${row.role}` : ""}`;

        const { data, error } = await supabase
          .from("hospitals")
          .insert({
            name: row.hospital.trim(),
            contact_name: row.contact || null,
            contact_email: row.email || null,
            location: row.location || null,
            status: "pipeline" as HospitalStatus,
            notes,
          })
          .select()
          .single();
        if (error) throw error;

        importedHospitalIds.push(data.id);

        if (defaultStageId && data) {
          const { data: dealData } = await supabase.from("hospital_deals").insert({
            hospital_id: data.id,
            name: data.name,
            stage_id: defaultStageId,
            value: 0,
            position: 0,
          }).select().single();
          if (dealData) importedDealIds.push(dealData.id);
        }

        successCount++;
        setImportedCount(successCount);
      } catch (err) {
        console.error(`Failed to import ${row.hospital}:`, err);
      }
    }

    queryClient.invalidateQueries({ queryKey: ["hospitals"] });
    queryClient.invalidateQueries({ queryKey: ["pipeline-deals"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    queryClient.invalidateQueries({ queryKey: ["recent-activity"] });

    if (successCount > 0) {
      const preview = toImport.slice(0, 3).map((r) => r.hospital).join(", ");
      logActivity({
        module: "hospitals",
        action: "prospect_import",
        summary: `Imported ${successCount} prospect hospitals: ${preview}${successCount > 3 ? "..." : ""}`,
        metadata: { count: successCount },
      });
      // Store IDs for undo
      setLastImportIds({ hospitalIds: importedHospitalIds, dealIds: importedDealIds });
    }

    toast.success(`Imported ${successCount} hospital${successCount !== 1 ? "s" : ""} into pipeline`);
    setImporting(false);
    setSelectedIdxs(new Set());
  };

  // Undo last import
  const handleUndo = async () => {
    if (!lastImportIds) return;
    setUndoing(true);

    try {
      // Delete deals first (FK constraint)
      if (lastImportIds.dealIds.length > 0) {
        await supabase.from("hospital_deals").delete().in("id", lastImportIds.dealIds);
      }
      // Delete hospitals
      if (lastImportIds.hospitalIds.length > 0) {
        await supabase.from("hospitals").delete().in("id", lastImportIds.hospitalIds);
      }

      queryClient.invalidateQueries({ queryKey: ["hospitals"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-deals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });

      toast.success(`Undid import of ${lastImportIds.hospitalIds.length} hospital${lastImportIds.hospitalIds.length !== 1 ? "s" : ""}`);
      setLastImportIds(null);
    } catch (err) {
      console.error("Undo failed:", err);
      toast.error("Failed to undo import");
    } finally {
      setUndoing(false);
    }
  };

  const selectedWithEmail = Array.from(selectedIdxs)
    .map((idx) => ALL_PROSPECTS[idx])
    .filter((p) => p.email).length;

  const enrollRecipients = Array.from(selectedIdxs)
    .map((idx) => ALL_PROSPECTS[idx])
    .filter((p) => p.email)
    .map((p) => ({
      entityType: "hospital" as const,
      entityId: hospitalNameToId?.get(p.hospital.toLowerCase()) || p.hospital,
      name: p.hospital,
      email: p.email,
    }));

  return (
    <div>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full bg-blue-50 p-2">
              <Building2 className="h-4 w-4 text-[#1F3A6A]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1F3A6A]">{totalCount}</p>
              <p className="text-xs text-muted-foreground">Total Prospects</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full bg-green-50 p-2">
              <Mail className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{withEmail}</p>
              <p className="text-xs text-muted-foreground">With Email</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full bg-amber-50 p-2">
              <Users className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{alreadyInCrm}</p>
              <p className="text-xs text-muted-foreground">Already in CRM</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full bg-purple-50 p-2">
              <Globe className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">{MEDRECRUIT_HOSPITALS.length} / {NOTION_HOSPITALS.length} / {ACEM_HOSPITALS.length}</p>
              <p className="text-xs text-muted-foreground">MedRecruit / Notion / ACEM</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
        <div className="flex flex-1 gap-2 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search hospitals, locations, emails..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as typeof sourceFilter)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="MedRecruit">MedRecruit</SelectItem>
              <SelectItem value="Notion">Notion</SelectItem>
              <SelectItem value="ACEM">ACEM</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {uniqueTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 items-center">
          {lastImportIds && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleUndo}
              disabled={undoing}
              className="text-amber-700 border-amber-300 hover:bg-amber-50"
            >
              <Undo2 className="mr-1.5 h-4 w-4" />
              {undoing ? "Undoing..." : `Undo Import (${lastImportIds.hospitalIds.length})`}
            </Button>
          )}
          {selectedIdxs.size > 0 && (
            <>
              <span className="text-sm text-muted-foreground">
                {selectedIdxs.size} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEmailSelected}
                disabled={selectedWithEmail === 0}
              >
                <Mail className="mr-1.5 h-4 w-4" />
                Email {selectedWithEmail > 0 ? selectedWithEmail : ""}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEnrollDialog(true)}
                disabled={selectedWithEmail === 0}
              >
                <Zap className="mr-1.5 h-4 w-4 text-amber-500" />
                Enroll in Flow
              </Button>
              <Button
                size="sm"
                onClick={handleImportClick}
                disabled={importing}
                className="bg-[#1F3A6A] hover:bg-[#1F3A6A]/90"
              >
                <Upload className="mr-1.5 h-4 w-4" />
                {importing
                  ? `Importing ${importedCount}/${totalToImport}...`
                  : `Import ${selectedIdxs.size} to Pipeline`}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="max-h-[calc(100vh-380px)] overflow-auto">
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center gap-2 bg-slate-50 border-b px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <div className="w-8">
              <Checkbox
                checked={allFilteredSelected}
                onCheckedChange={(checked) => toggleAll(!!checked)}
              />
            </div>
            <div className="min-w-[250px] flex-[2]">Hospital</div>
            <div className="w-[140px]">Location</div>
            <div className="w-[120px]">Type</div>
            <div className="w-[130px]">Contact</div>
            <div className="flex-1 min-w-[200px]">Email</div>
            <div className="w-[80px] text-center">Actions</div>
          </div>

          {/* Rows */}
          <div className="divide-y">
            {filtered.map((row) => {
              const alreadyExists = existingHospitalNames.has(row.hospital.toLowerCase());
              const isSelected = selectedIdxs.has(row._idx);
              return (
                <div
                  key={row._idx}
                  className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors cursor-pointer ${
                    alreadyExists
                      ? "opacity-60 bg-gray-50 hover:bg-gray-100/80"
                      : isSelected
                      ? "bg-blue-50/60"
                      : "hover:bg-gray-50/50"
                  }`}
                  onClick={() => {
                    const hospitalId = hospitalNameToId?.get(row.hospital.toLowerCase());
                    if (alreadyExists && hospitalId) {
                      navigate(`/crm/hospitals/${hospitalId}`);
                    } else if (!alreadyExists) {
                      toggleIdx(row._idx);
                    }
                  }}
                >
                  <div className="w-8">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleIdx(row._idx)}
                      disabled={alreadyExists}
                    />
                  </div>
                  <div className="min-w-[250px] flex-[2]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium">{row.hospital}</span>
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap ${
                          row.source === "MedRecruit"
                            ? "text-blue-600 bg-blue-50"
                            : row.source === "ACEM"
                            ? "text-green-600 bg-green-50"
                            : "text-purple-600 bg-purple-50"
                        }`}
                      >
                        {row.source}
                      </span>
                      {alreadyExists && (
                        <span className="text-[10px] font-normal text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                          in CRM
                        </span>
                      )}
                    </div>
                    {row.health_service && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">{row.health_service}</p>
                    )}
                  </div>
                  <div className="w-[140px] text-xs text-muted-foreground truncate">{row.location || "—"}</div>
                  <div className="w-[120px] text-xs text-muted-foreground truncate">{row.type || "—"}</div>
                  <div className="w-[130px] text-xs text-muted-foreground truncate">
                    {row.contact || "—"}
                    {row.role && <span className="block text-[10px] text-muted-foreground/70">{row.role}</span>}
                  </div>
                  <div className="flex-1 min-w-[200px] text-xs text-muted-foreground truncate">
                    {row.email ? (
                      <a
                        href={`mailto:${row.email}`}
                        className="text-blue-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {row.email}
                      </a>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </div>
                  <div className="w-[80px] flex justify-center gap-1">
                    {alreadyExists && hospitalNameToId?.get(row.hospital.toLowerCase()) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        title="View in CRM"
                        onClick={(e) => { e.stopPropagation(); navigate(`/crm/hospitals/${hospitalNameToId.get(row.hospital.toLowerCase())}`); }}
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-[#1F3A6A]" />
                      </Button>
                    )}
                    {row.email && !alreadyExists && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        title={`Email ${row.hospital}`}
                        onClick={(e) => { e.stopPropagation(); handleEmailOne(row); }}
                      >
                        <Send className="h-3.5 w-3.5 text-[#1F3A6A]" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="px-3 py-12 text-center text-sm text-muted-foreground">
                No prospects match your search.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-2 text-xs text-muted-foreground text-right">
        Showing {filtered.length} of {totalCount} prospects
      </div>

      {/* Email Compose Dialog */}
      <ComposeEmailDialog
        open={showCompose}
        onOpenChange={setShowCompose}
        recipients={emailRecipients}
      />

      {/* Import Confirmation Dialog */}
      <Dialog open={showConfirmImport} onOpenChange={setShowConfirmImport}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm Import
            </DialogTitle>
            <DialogDescription>
              You are about to import{" "}
              <strong>
                {Array.from(selectedIdxs)
                  .map((idx) => ALL_PROSPECTS[idx])
                  .filter((p) => !existingHospitalNames.has(p.hospital.toLowerCase())).length}{" "}
                hospitals
              </strong>{" "}
              into the sales pipeline as Lead stage deals. This will create new hospital records.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
            You can undo this action immediately after import using the Undo button.
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowConfirmImport(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              className="bg-[#1F3A6A] hover:bg-[#1F3A6A]/90"
            >
              <Upload className="mr-1.5 h-4 w-4" />
              Yes, Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enroll in Flow Dialog */}
      <EnrollInFlowDialog
        open={showEnrollDialog}
        onOpenChange={setShowEnrollDialog}
        recipients={enrollRecipients}
      />
    </div>
  );
}
