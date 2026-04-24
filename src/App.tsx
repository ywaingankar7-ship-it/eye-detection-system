import React, { useState, useEffect, Suspense, lazy, Component, ErrorInfo, ReactNode } from "react";
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
import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { testConnection } from "./firebaseUtils";
import { isEmailAdmin } from "./constants";

// Error Boundary Component
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.error?.message || "{}");
        if (parsed.error) {
          errorMessage = `Firestore Error: ${parsed.error} (${parsed.operationType} on ${parsed.path})`;
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-8">
          <div className="glass-card max-w-md w-full text-center">
            <h2 className="text-2xl font-bold text-rose-500 mb-4">Application Error</h2>
            <p className="text-slate-400 mb-6">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="gradient-bg px-6 py-2 rounded-xl font-bold"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Lazy load heavy components
const AIEyeTest = lazy(() => import("./pages/AIEyeTest"));
const Analytics = lazy(() => import("./pages/Analytics"));
const About = lazy(() => import("./pages/About"));
const Settings = lazy(() => import("./pages/Settings"));
const Notifications = lazy(() => import("./pages/Notifications"));

const LoadingFallback = () => (
  <div className="min-h-[400px] flex flex-col items-center justify-center gap-4 text-cyan-400">
    <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
    <p className="text-xs font-bold uppercase tracking-widest animate-pulse">Loading module...</p>
  </div>
);

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("eyepower_user");
    if (saved) {
      const parsed = JSON.parse(saved) as User;
      if (isEmailAdmin(parsed.email)) {
        parsed.role = "admin";
      }
      return parsed;
    }
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("eyepower_theme");
    return (saved as "dark" | "light") || "dark";
  });

  const toggleTheme = () => setTheme(prev => prev === "dark" ? "light" : "dark");

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "light") {
      root.classList.add("light");
    } else {
      root.classList.remove("light");
    }
    localStorage.setItem("eyepower_theme", theme);
  }, [theme]);

  // Force admin role for master account if user is logged in
  useEffect(() => {
    if (user && isEmailAdmin(user.email) && user.role !== 'admin') {
      console.log("Correcting admin role in App state");
      const updatedUser = { ...user, role: 'admin' as const };
      setUser(updatedUser);
      localStorage.setItem("eyepower_user", JSON.stringify(updatedUser));
    }
  }, [user]);

  useEffect(() => {
    // Check network connectivity
    const checkConnectivity = async () => {
      try {
        await fetch("https://www.google.com/favicon.ico", { mode: 'no-cors' });
        console.log("Network reachable");
      } catch (e) {
        console.warn("Network unreachable or blocked:", e);
      }
    };
    checkConnectivity();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Auth state changed:", firebaseUser?.email);
      if (firebaseUser) {
        testConnection(); // Test connection after auth is ready
        try {
          const docRef = doc(db, "users", firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const userData = docSnap.data() as User;
            console.log("User profile found:", userData.email, userData.role);
            // Force admin role for the master email (case-insensitive)
            if (isEmailAdmin(userData.email)) {
              userData.role = "admin";
              console.log("Forced admin role for master account (profile exists)");
            }
            setUser(userData);
            localStorage.setItem("eyepower_user", JSON.stringify(userData));
          } else {
            // Fallback if profile doesn't exist yet
            const isMasterAdmin = isEmailAdmin(firebaseUser.email);
            console.log("User profile NOT found, fallback isMasterAdmin:", isMasterAdmin);
            const fallbackUser: User = {
              id: Date.now(),
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || (isMasterAdmin ? "Admin" : "User"),
              email: firebaseUser.email || "",
              role: isMasterAdmin ? "admin" : "patient"
            };
            setUser(fallbackUser);
            if (isMasterAdmin) {
              console.log("Forced admin role for master account (fallback)");
            }
          }
        } catch (err) {
          console.error("Failed to fetch user profile:", err);
        }
      } else {
        setUser(null);
        localStorage.removeItem("eyepower_user");
        localStorage.removeItem("eyepower_token");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = (userData: User, token: string) => {
    console.log("Login attempt:", userData.email, userData.role);
    // Force admin role for the master email
    if (isEmailAdmin(userData.email)) {
      userData.role = "admin";
      console.log("Forced admin role for master account");
    }
    setUser(userData);
    localStorage.setItem("eyepower_user", JSON.stringify(userData));
    localStorage.setItem("eyepower_token", token);
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setUser(null);
      localStorage.removeItem("eyepower_user");
      localStorage.removeItem("eyepower_token");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/" element={<Landing user={user} theme={theme} toggleTheme={toggleTheme} />} />
          
          <Route 
            path="/login" 
            element={user ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} theme={theme} toggleTheme={toggleTheme} />} 
          />
          
          <Route element={user ? <Layout user={user} onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} /> : <Navigate to="/login" />}>
            <Route path="/dashboard" element={
              user?.role === 'admin' || user?.role === 'staff' 
                ? <Dashboard /> 
                : <PatientPortal />
            } />
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
            <Route path="/appointments" element={<Appointments />} />
            <Route path="/ai-test" element={
              <Suspense fallback={<LoadingFallback />}>
                <AIEyeTest />
              </Suspense>
            } />
            <Route path="/about" element={
              <Suspense fallback={<LoadingFallback />}>
                <About />
              </Suspense>
            } />
            <Route path="/settings" element={
              <Suspense fallback={<LoadingFallback />}>
                <Settings />
              </Suspense>
            } />
            <Route path="/notifications" element={
              <Suspense fallback={<LoadingFallback />}>
                <Notifications />
              </Suspense>
            } />
            {user?.role === 'patient' && (
              <Route path="/portal" element={<PatientPortal />} />
            )}
          </Route>

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}
