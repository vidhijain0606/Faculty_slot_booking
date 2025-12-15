import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Welcome from "./pages/Welcome";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import FacultyDashboard from "./pages/FacultyDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import BookingPage from "./pages/BookingPage";
import UploadDocument from "./pages/UploadDocument";
import ViewDocuments from "./pages/ViewDocuments";
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
            {/* Public Routes */}
            <Route path="/" element={<Auth />} />
            <Route path="/auth" element={<Auth />} />

            {/* Protected Routes */}
            <Route 
              path="/welcome" 
              element={
                <ProtectedRoute allowedRoles={['faculty', 'admin']}>
                  <Welcome />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute allowedRoles={['faculty']}>
                  <Index />
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
              path="/upload-document"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <UploadDocument />
                </ProtectedRoute>
              }
            />

            <Route
              path="/view-documents"
              element={
                <ProtectedRoute allowedRoles={['faculty', 'admin']}>
                  <ViewDocuments />
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
            
            {/* Catch-all 404 Route - MUST BE LAST */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;