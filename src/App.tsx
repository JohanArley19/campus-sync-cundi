import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { StudentRoute } from "@/components/auth/StudentRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Landing from "./pages/Landing";
import Subjects from "./pages/Subjects";
import Activities from "./pages/Activities";
import Assistant from "./pages/Assistant";
import Admin from "./pages/Admin";
import AdminStudent from "./pages/AdminStudent";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              path="/app"
              element={
                <StudentRoute>
                  <Index />
                </StudentRoute>
              }
            />
            <Route
              path="/app/materias"
              element={
                <StudentRoute>
                  <Subjects />
                </StudentRoute>
              }
            />
            <Route
              path="/app/actividades"
              element={
                <StudentRoute>
                  <Activities />
                </StudentRoute>
              }
            />
            <Route
              path="/app/asistente"
              element={
                <StudentRoute>
                  <Assistant />
                </StudentRoute>
              }
            />
            <Route
              path="/app/admin"
              element={
                <AdminRoute>
                  <Admin />
                </AdminRoute>
              }
            />
            <Route
              path="/app/admin/estudiantes/:userId"
              element={
                <AdminRoute>
                  <AdminStudent />
                </AdminRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
