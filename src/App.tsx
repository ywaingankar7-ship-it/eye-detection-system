import React, { useState, useEffect, Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { User } from "./types";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Landing from "./pages/Landing";
import Customers from "./pages/Customers";
import Appointments from "./pages/Appointments";
import PatientPortal from "./pages/PatientPortal";
import Prescriptions from "./pages/Prescriptions";

// Lazy load heavy components
const Inventory = lazy(() => import("./pages/Inventory"));
const AIEyeTest = lazy(() => import("./pages/AIEyeTest"));
const Analytics = lazy(() => import("./pages/Analytics"));
const VirtualTryOn = lazy(() => import("./pages/VirtualTryOn"));

const LoadingFallback = () => (
  <div className="min-h-[400px] flex flex-col items-center justify-center gap-4 text-cyan-400">
    <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
    <p className="text-xs font-bold uppercase tracking-widest animate-pulse">Loading module...</p>
  </div>
);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("visionx_user");
      const token = localStorage.getItem("visionx_token");
      if (savedUser && token) {
        setUser(JSON.parse(savedUser));
      }
    } catch (err) {
      console.error("Failed to parse saved user:", err);
      localStorage.removeItem("visionx_user");
      localStorage.removeItem("visionx_token");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogin = (userData: User, token: string) => {
    setUser(userData);
    localStorage.setItem("visionx_user", JSON.stringify(userData));
    localStorage.setItem("visionx_token", token);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("visionx_user");
    localStorage.removeItem("visionx_token");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing user={user} />} />
        
        <Route 
          path="/login" 
          element={user ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />} 
        />
        
        <Route element={user ? <Layout user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}>
          <Route path="/dashboard" element={user?.role === 'patient' ? <PatientPortal /> : <Dashboard />} />
          {(user?.role === 'admin' || user?.role === 'staff') && (
            <>
              <Route path="/customers" element={<Customers />} />
              <Route path="/prescriptions" element={<Prescriptions />} />
            </>
          )}
          {user?.role === 'admin' && (
            <Route path="/analytics" element={
              <Suspense fallback={<LoadingFallback />}>
                <Analytics />
              </Suspense>
            } />
          )}
          <Route path="/inventory" element={
            <Suspense fallback={<LoadingFallback />}>
              <Inventory />
            </Suspense>
          } />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/ai-test" element={
            <Suspense fallback={<LoadingFallback />}>
              <AIEyeTest />
            </Suspense>
          } />
          <Route path="/try-on" element={
            <Suspense fallback={<LoadingFallback />}>
              <VirtualTryOn />
            </Suspense>
          } />
          {user?.role === 'patient' && (
            <Route path="/portal" element={<PatientPortal />} />
          )}
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}
