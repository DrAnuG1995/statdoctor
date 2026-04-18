import { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import NotFound from "./pages/NotFound";
import { CrmRoutes } from "./crm/routes";

const queryClient = new QueryClient();

// Use Vite's built-in base so dev (`/`) and prod (`/statdoctor/`) both work
// without hardcoding the sub-path. import.meta.env.BASE_URL ends with a trailing
// slash; BrowserRouter expects the basename without one.
const basename = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

function CrmFallback() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1F3A6A] border-t-transparent" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={basename}>
        <Suspense fallback={<CrmFallback />}>
          <Routes>
            <Route path="/" element={<Navigate to="/crm/dashboard" replace />} />
            <Route path="/crm/*">
              {CrmRoutes()}
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
