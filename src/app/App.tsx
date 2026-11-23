import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Toaster } from '@/components/ui/Toaster';
import { toast } from '@/components/ui/toastStore';
import { AuthProvider } from '@/features/auth/components/AuthProvider';
import { ForgotPasswordPage } from '@/features/auth/components/ForgotPasswordPage';
import { LoginPage } from '@/features/auth/components/LoginPage';
import { ResetPasswordPage } from '@/features/auth/components/ResetPasswordPage';
import { SignUpPage } from '@/features/auth/components/SignUpPage';
import { AcceptInvitePage } from '@/features/clubs/components/AcceptInvitePage';
import { CreateClubPage } from '@/features/clubs/components/CreateClubPage';
import { CashRegisterPage } from '@/features/cash-register/components/CashRegisterPage';
import { CashReportPage } from '@/features/cash-register/components/CashReportPage';
import { CashTablePage } from '@/features/cash-game/components/CashTablePage';
import { CashTablesPage } from '@/features/cash-game/components/CashTablesPage';
import { MembersPage } from '@/features/clubs/components/MembersPage';
import { SettingsPage } from '@/features/settings/components/SettingsPage';
import { OpenMovementsPage } from '@/features/ledger/components/OpenMovementsPage';
import { ReceiptPage } from '@/features/ledger/components/ReceiptPage';
import { UndoCenterPage } from '@/features/ledger/components/UndoCenterPage';
import { EditPlayerPage } from '@/features/players/components/EditPlayerPage';
import { NewPlayerPage } from '@/features/players/components/NewPlayerPage';
import { PlayerDetailPage } from '@/features/players/components/PlayerDetailPage';
import { PlayersPage } from '@/features/players/components/PlayersPage';
import { toFriendlyMessage } from '@/lib/errors';
import { AppLayout } from './AppLayout';
import { DashboardPage } from './DashboardPage';
import { RequireAuth, RequireClub } from './guards';
import { NotFoundPage } from './NotFoundPage';
import { useTheme } from './useTheme';

function reportError(error: unknown) {
  console.error(error);
  toast.error(toFriendlyMessage(error));
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: reportError }),
  mutationCache: new MutationCache({ onError: reportError }),
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: true, retry: 1 },
  },
});

const router = createBrowserRouter([
  { path: '/entrar', element: <LoginPage /> },
  { path: '/cadastro', element: <SignUpPage /> },
  { path: '/esqueci-senha', element: <ForgotPasswordPage /> },
  { path: '/redefinir-senha', element: <ResetPasswordPage /> },
  { path: '/convite/:token', element: <AcceptInvitePage /> },
  {
    element: <RequireAuth />,
    children: [
      { path: '/novo-clube', element: <CreateClubPage /> },
      {
        element: <RequireClub />,
        children: [
          { path: '/recibo/:entryId', element: <ReceiptPage /> },
          { path: '/caixa/:sessionId/relatorio', element: <CashReportPage /> },
          {
            element: <AppLayout />,
            children: [
              { path: '/', element: <DashboardPage /> },
              { path: '/jogadores', element: <PlayersPage /> },
              { path: '/jogadores/novo', element: <NewPlayerPage /> },
              { path: '/jogadores/:playerId', element: <PlayerDetailPage /> },
              { path: '/jogadores/:playerId/editar', element: <EditPlayerPage /> },
              { path: '/movimentacoes', element: <OpenMovementsPage /> },
              { path: '/desfazer', element: <UndoCenterPage /> },
              { path: '/mesas', element: <CashTablesPage /> },
              { path: '/mesas/:tableId', element: <CashTablePage /> },
              { path: '/caixa', element: <CashRegisterPage /> },
              { path: '/equipe', element: <MembersPage /> },
              { path: '/configuracoes', element: <SettingsPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);

function ThemeBoot() {
  useTheme();
  return null;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeBoot />
        <RouterProvider router={router} />
      </AuthProvider>
      <Toaster />
    </QueryClientProvider>
  );
}
