import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ScholarDashboard from "./pages/ScholarDashboard";
import FacultyDashboard from "./pages/FacultyDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import BookingPage from "./pages/BookingPage";
import LinkDocument1 from "./pages/LinkDocument1";
import LinkDocument2 from "./pages/LinkDocument2";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/scholar"
              element={
                <ProtectedRoute allowedRoles={['scholar']}>
                  <ScholarDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/faculty"
              element={
                <ProtectedRoute allowedRoles={['faculty']}>
                  <FacultyDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/book/:slotId"
              element={
                <ProtectedRoute allowedRoles={['faculty']}>
                  <BookingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/link-document-1"
              element={
                <ProtectedRoute allowedRoles={['faculty']}>
                  <LinkDocument1 />
                </ProtectedRoute>
              }
            />
            <Route
              path="/link-document-2"
              element={
                <ProtectedRoute allowedRoles={['faculty']}>
                  <LinkDocument2 />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
