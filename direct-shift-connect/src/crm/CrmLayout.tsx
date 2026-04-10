import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import {
  GlobalSearchTrigger,
  GlobalSearchDialog,
  useGlobalSearchShortcut,
} from "./shared/components/GlobalSearch";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  Stethoscope,
  Building2,
  FolderKanban,
  Share2,
  TrendingUp,
  Mail,
  LogOut,
  CalendarClock,
  CheckSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import statdoctorLogo from "@/assets/statdoctor-logo.svg";

const navItems = [
  { to: "/crm", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/crm/tasks", icon: CheckSquare, label: "Tasks" },
  { to: "/crm/email", icon: Mail, label: "Email" },
  { to: "/crm/doctors", icon: Stethoscope, label: "Doctors" },
  { to: "/crm/shifts", icon: CalendarClock, label: "Shifts" },
  { to: "/crm/hospitals", icon: Building2, label: "Hospitals" },
  { to: "/crm/projects", icon: FolderKanban, label: "Projects" },
  { to: "/crm/social", icon: Share2, label: "Social Media" },
  { to: "/crm/investors", icon: TrendingUp, label: "Investors" },
];

export default function CrmLayout() {
  const navigate = useNavigate();
  const { open: searchOpen, setOpen: setSearchOpen } = useGlobalSearchShortcut();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/crm/login", { replace: true });
  };

  return (
    <div className="crm-theme">
      <SidebarProvider>
        <Sidebar className="border-r-0">
          <SidebarHeader className="bg-[#1F3A6A] px-4 py-5">
            <div className="flex items-center gap-3">
              <img src={statdoctorLogo} alt="StatDoctor" className="h-8 brightness-0 invert" />
              <span className="text-sm font-medium text-white/60">CRM</span>
            </div>
          </SidebarHeader>
          <SidebarContent className="bg-[#1F3A6A]">
            <SidebarGroup>
              <SidebarGroupLabel className="px-4 text-xs font-semibold uppercase tracking-wider text-white/50">
                Modules
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.to}
                          end={item.end}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                              isActive
                                ? "bg-[#A4D65E]/20 text-[#A4D65E]"
                                : "text-white/70 hover:bg-white/10 hover:text-white"
                            )
                          }
                        >
                          <item.icon className="h-5 w-5 shrink-0" />
                          <span>{item.label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="bg-[#1F3A6A] p-4">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-5 w-5" />
              <span>Sign out</span>
            </button>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-white px-4">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-6" />
            <div className="flex-1" />
            <GlobalSearchTrigger onClick={() => setSearchOpen(true)} />
            <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
          </header>
          <main className="flex-1 overflow-auto bg-gray-50 p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
