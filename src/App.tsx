import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { User } from "./types";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Customers from "./pages/Customers";
import Inventory from "./pages/Inventory";
import Appointments from "./pages/Appointments";
import AIEyeTest from "./pages/AIEyeTest";
import Analytics from "./pages/Analytics";
import PatientPortal from "./pages/PatientPortal";
import Prescriptions from "./pages/Prescriptions";
import VirtualTryOn from "./pages/VirtualTryOn";

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
        <Route 
          path="/login" 
          element={user ? <Navigate to="/" /> : <Login onLogin={handleLogin} />} 
        />
        
        <Route element={user ? <Layout user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}>
          <Route path="/" element={user?.role === 'patient' ? <PatientPortal /> : <Dashboard />} />
          {(user?.role === 'admin' || user?.role === 'staff') && (
            <>
              <Route path="/customers" element={<Customers />} />
              <Route path="/prescriptions" element={<Prescriptions />} />
            </>
          )}
          {user?.role === 'admin' && (
            <Route path="/analytics" element={<Analytics />} />
          )}
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/ai-test" element={<AIEyeTest />} />
          <Route path="/try-on" element={<VirtualTryOn />} />
          {user?.role === 'patient' && (
            <Route path="/portal" element={<PatientPortal />} />
          )}
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}
