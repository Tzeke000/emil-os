import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Prospects from './pages/Prospects';
import ProspectDetail from './pages/ProspectDetail';
import Templates from './pages/Templates';
import Inbox from './pages/Inbox';
import Memory from './pages/Memory';
import Playbooks from './pages/Playbooks';
import Approvals from './pages/Approvals';
import AgentSettingsPage from './pages/AgentSettingsPage';
import TruthSync from './pages/TruthSync';
import ModuleBuilder from './pages/ModuleBuilder';
import ModelRouter from './pages/ModelRouter';
import TaskOrchestrator from './pages/TaskOrchestrator';
import MemoryBrowser from './pages/MemoryBrowser';
import MemoryMigration from './pages/MemoryMigration';
import Workbench from './pages/Workbench';
import ArchiveExplorer from './pages/ArchiveExplorer';
import TriggerIntegrations from './pages/TriggerIntegrations';
import LiveRuntimeLogs from './pages/LiveRuntimeLogs';
import IdentityCorePage from './pages/IdentityCorePage';
import MindStatePage from './pages/MindStatePage';
import ReflectionsPage from './pages/ReflectionsPage';
import RelationshipProfilePage from './pages/RelationshipProfilePage';
import PreferencesPage from './pages/PreferencesPage';
import EvolutionLogPage from './pages/EvolutionLogPage';
import PromptOptimizer from './pages/PromptOptimizer';
import TokenWastePage from './pages/TokenWastePage';
import ContextTrimAdvisor from './pages/ContextTrimAdvisor';
import PlaybookExpander from './pages/PlaybookExpander';
import TaskBatcher from './pages/TaskBatcher';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/prospects" element={<Prospects />} />
        <Route path="/prospects/:id" element={<ProspectDetail />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/memory" element={<Memory />} />
        <Route path="/playbooks" element={<Playbooks />} />
        <Route path="/approvals" element={<Approvals />} />
        <Route path="/settings" element={<AgentSettingsPage />} />
        <Route path="/truth-sync" element={<TruthSync />} />
        <Route path="/modules" element={<ModuleBuilder />} />
        <Route path="/model-router" element={<ModelRouter />} />
        <Route path="/tasks" element={<TaskOrchestrator />} />
        <Route path="/memory-browser" element={<MemoryBrowser />} />
        <Route path="/memory-migration" element={<MemoryMigration />} />
        <Route path="/workbench" element={<Workbench />} />
        <Route path="/archive" element={<ArchiveExplorer />} />
        <Route path="/triggers" element={<TriggerIntegrations />} />
        <Route path="/logs" element={<LiveRuntimeLogs />} />
        <Route path="/identity" element={<IdentityCorePage />} />
        <Route path="/mind-state" element={<MindStatePage />} />
        <Route path="/reflections" element={<ReflectionsPage />} />
        <Route path="/relationship" element={<RelationshipProfilePage />} />
        <Route path="/preferences" element={<PreferencesPage />} />
        <Route path="/evolution" element={<EvolutionLogPage />} />
        <Route path="/prompt-optimizer" element={<PromptOptimizer />} />
        <Route path="/token-waste" element={<TokenWastePage />} />
        <Route path="/context-trim" element={<ContextTrimAdvisor />} />
        <Route path="/playbook-expander" element={<PlaybookExpander />} />
        <Route path="/task-batcher" element={<TaskBatcher />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App