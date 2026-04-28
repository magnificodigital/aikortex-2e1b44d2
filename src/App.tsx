import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import HelpBubble from "@/components/help/HelpBubble";

// Lazy-loaded pages
const LandingPage = lazy(() => import("./pages/LandingPage"));
const Home = lazy(() => import("./pages/Home"));
const Index = lazy(() => import("./pages/Index"));
const Clients = lazy(() => import("./pages/Clients"));
const Projects = lazy(() => import("./pages/Projects"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Team = lazy(() => import("./pages/Team"));
const Financial = lazy(() => import("./pages/Financial"));
const Contracts = lazy(() => import("./pages/Contracts"));
const Reports = lazy(() => import("./pages/Reports"));
const Partners = lazy(() => import("./pages/Partners"));
const Sales = lazy(() => import("./pages/Sales"));
const Aikortex = lazy(() => import("./pages/Aikortex"));
const AgentDetail = lazy(() => import("./pages/AgentDetail"));
const AikortexCRM = lazy(() => import("./pages/AikortexCRM"));
const AikortexAutomations = lazy(() => import("./pages/AikortexAutomations"));
const AikortexMessages = lazy(() => import("./pages/AikortexMessages"));
const AikortexBroadcasts = lazy(() => import("./pages/AikortexBroadcasts"));
const WebEdit = lazy(() => import("./pages/WebEdit"));
const AlowDigital = lazy(() => import("./pages/AlowDigital"));
const IAgora = lazy(() => import("./pages/IAgora"));
const SintonIA = lazy(() => import("./pages/SintonIA"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ClientRegistration = lazy(() => import("./pages/ClientRegistration"));
const AppBuilder = lazy(() => import("./pages/AppBuilder"));
const Apps = lazy(() => import("./pages/Apps"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const Credits = lazy(() => import("./pages/Credits"));
const ClientDetailPage = lazy(() => import("./pages/ClientDetail"));
const Workspace = lazy(() => import("./pages/Workspace"));

const Pricing = lazy(() => import("./pages/Pricing"));
const Templates = lazy(() => import("./pages/Templates"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Meetings = lazy(() => import("./pages/Meetings"));
const MeetingRoom = lazy(() => import("./pages/MeetingRoom"));
const Tutorials = lazy(() => import("./pages/Tutorials"));
const CallLogs = lazy(() => import("./pages/CallLogs"));
const Financeiro = lazy(() => import("./pages/Financeiro"));

const queryClient = new QueryClient();

// Agency-only route guard
const AgencyRoute = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute tenantTypes={['agency', 'platform']}>{children}</ProtectedRoute>
);

// Client-only route guard
const ClientRoute = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute tenantTypes={['client']}>{children}</ProtectedRoute>
);

const Loading = () => (
  <div className="flex h-screen items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <WorkspaceProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/pricing" element={<Pricing />} />

              {/* Agency routes */}
              <Route path="/home" element={<AgencyRoute><Home /></AgencyRoute>} />
              <Route path="/apps" element={<AgencyRoute><Apps /></AgencyRoute>} />
              <Route path="/app-builder" element={<AgencyRoute><AppBuilder /></AgencyRoute>} />
              <Route path="/templates" element={<AgencyRoute><Templates /></AgencyRoute>} />
              <Route path="/dashboard" element={<AgencyRoute><Index /></AgencyRoute>} />
              <Route path="/cadastro-cliente/:token" element={<ClientRegistration />} />
              <Route path="/clients" element={<AgencyRoute><Clients /></AgencyRoute>} />
              <Route path="/clients/:clientId" element={<AgencyRoute><ClientDetailPage /></AgencyRoute>} />
              <Route path="/projects" element={<AgencyRoute><Projects /></AgencyRoute>} />
              <Route path="/tasks" element={<AgencyRoute><Tasks /></AgencyRoute>} />
              <Route path="/team" element={<AgencyRoute><Team /></AgencyRoute>} />
              <Route path="/financial" element={<AgencyRoute><Financial /></AgencyRoute>} />
              <Route path="/financeiro" element={<AgencyRoute><Financeiro /></AgencyRoute>} />
              <Route path="/contracts" element={<AgencyRoute><Contracts /></AgencyRoute>} />
              <Route path="/reports" element={<AgencyRoute><Reports /></AgencyRoute>} />
              <Route path="/partners" element={<AgencyRoute><Partners /></AgencyRoute>} />
              <Route path="/sales" element={<AgencyRoute><Sales /></AgencyRoute>} />
              <Route path="/aikortex" element={<AgencyRoute><AikortexCRM /></AgencyRoute>} />
              <Route path="/aikortex/crm" element={<AgencyRoute><AikortexCRM /></AgencyRoute>} />
              <Route path="/aikortex/agents" element={<AgencyRoute><Aikortex /></AgencyRoute>} />
              <Route path="/aikortex/agents/:agentId" element={<AgencyRoute><AgentDetail /></AgencyRoute>} />
              <Route path="/calls" element={<AgencyRoute><CallLogs /></AgencyRoute>} />
              <Route path="/aikortex/automations" element={<AgencyRoute><AikortexAutomations /></AgencyRoute>} />
              <Route path="/aikortex/messages" element={<AgencyRoute><AikortexMessages /></AgencyRoute>} />
              <Route path="/aikortex/broadcasts" element={<AgencyRoute><AikortexBroadcasts /></AgencyRoute>} />
              <Route path="/webedit" element={<AgencyRoute><WebEdit /></AgencyRoute>} />
              <Route path="/alowdigital" element={<AgencyRoute><AlowDigital /></AgencyRoute>} />
              <Route path="/iagora" element={<AgencyRoute><IAgora /></AgencyRoute>} />
              <Route path="/sintonia" element={<AgencyRoute><SintonIA /></AgencyRoute>} />
              <Route path="/ai-setup" element={<AgencyRoute><Credits /></AgencyRoute>} />
              <Route path="/credits" element={<Navigate to="/ai-setup" replace />} />
              <Route path="/settings" element={<AgencyRoute><SettingsPage /></AgencyRoute>} />
              <Route path="/meetings" element={<AgencyRoute><Meetings /></AgencyRoute>} />
              <Route path="/meetings/:roomId" element={<ProtectedRoute><MeetingRoom /></ProtectedRoute>} />

              {/* Admin routes - platform only */}
              <Route path="/admin" element={<ProtectedRoute roles={['platform_owner','platform_admin']}><AdminPanel /></ProtectedRoute>} />

              {/* Client workspace routes */}
              <Route path="/workspace" element={<ClientRoute><Workspace /></ClientRoute>} />
              <Route path="/workspace/*" element={<ClientRoute><Workspace /></ClientRoute>} />

              <Route path="/tutorials" element={<Navigate to="/home" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <HelpBubble />
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
      </WorkspaceProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
