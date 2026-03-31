import { RouterProvider } from "react-router";
import { AuthProvider, useAuth } from "./auth";
import { AuthScreen } from "./components/AuthScreen";
import { router } from "./routes";

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-700">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return <RouterProvider router={router} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
