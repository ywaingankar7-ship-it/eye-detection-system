import React, { useState, useEffect } from "react";
import { 
  Users, 
  Calendar, 
  AlertTriangle, 
  Activity,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  CloudUpload,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { migrateData } from "../services/migrationService";
import { useNavigate } from "react-router-dom";

import { db, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  limit,
  getDocs,
  getCountFromServer,
  where
} from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../firebaseUtils";

export default function Dashboard() {
  const [stats, setStats] = useState<any>({
    totalCustomers: 0,
    aiTests: 0,
    appointmentsToday: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const savedUserStr = localStorage.getItem("eyepower_user");
    const savedUser = savedUserStr ? JSON.parse(savedUserStr) : null;
    
    if (savedUser) {
      setUser(savedUser);
    }

    // Wait for auth to be fully initialized
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser && !savedUser) {
        navigate("/login");
        return;
      }

      if (!firebaseUser) return;

      // Real-time stats from Firestore
      const unsubscribers: (() => void)[] = [];

      // Simple count listeners
      const fetchStats = async () => {
        try {
          const isStaff = savedUser.role === 'admin' || savedUser.role === 'staff';
          
          const statsPromises: any = {
            aiTests: getCountFromServer(collection(db, "eye_tests")),
            appointmentsToday: getCountFromServer(query(collection(db, "appointments"), where("date", "==", new Date().toISOString().split('T')[0]))),
          };

          if (isStaff) {
            statsPromises.totalCustomers = getCountFromServer(collection(db, "customers"));
          }

          const results = await Promise.all(Object.entries(statsPromises).map(async ([key, promise]: [string, any]) => {
            try {
              const snap = await promise;
              return [key, snap.data().count];
            } catch (err) {
              console.warn(`Permission or fetch error for ${key} count:`, err);
              return [key, 0];
            }
          }));

          const newStats = Object.fromEntries(results);
          setStats((prev: any) => ({ ...prev, ...newStats }));
        } catch (err) {
          console.error("Error fetching stats:", err);
        }
      };

      fetchStats();

      // Activities listener - only for staff
      if (savedUser.role === 'admin' || savedUser.role === 'staff') {
        const activitiesQuery = query(collection(db, "activity_logs"), orderBy("timestamp", "desc"), limit(10));
        const unsubActivities = onSnapshot(activitiesQuery, (snapshot) => {
          const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setActivities(logs);
          setLoading(false);
        }, (err) => {
          if (err.message.includes("permissions")) {
            console.warn("User does not have permission to view activity logs.");
            setActivities([]);
          } else {
            handleFirestoreError(err, OperationType.GET, "activity_logs");
          }
          setLoading(false);
        });
        unsubscribers.push(unsubActivities);
      } else {
        setLoading(false);
      }

      return () => unsubscribers.forEach(unsub => unsub());
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
    <div className="flex flex-col items-center gap-4">
      <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-[var(--text-secondary)] animate-pulse font-medium">Loading Intelligence Hub...</p>
    </div>
  </div>;

  if (error) return <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-8">
    <div className="glass-card max-w-md mx-auto text-center">
      <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
      <h2 className="text-xl font-bold mb-2">Failed to Load Dashboard</h2>
      <p className="text-[var(--text-secondary)] mb-6">{error || "The analytics service is currently unavailable."}</p>
      <button 
        onClick={() => window.location.reload()}
        className="gradient-bg px-6 py-2 rounded-xl font-bold"
      >
        Retry
      </button>
    </div>
  </div>;

  const dashboardStats = [
    ...(user.role === 'admin' ? [{ label: "Total Customers", value: stats.totalCustomers, icon: Users, color: "text-blue-400", bg: "bg-blue-400/10", trend: "+12%" }] : []),
    { label: "AI Tests Done", value: stats.aiTests, icon: Activity, color: "text-violet-400", bg: "bg-violet-400/10", trend: "+24%" },
    { label: "Appointments Today", value: stats.appointmentsToday, icon: Calendar, color: "text-amber-400", bg: "bg-amber-400/10", trend: "0%" },
    { label: "System Accuracy", value: "98.4%", icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-400/10", trend: "+0.2%" },
  ];

  const handleExport = () => {
    const reportData = JSON.stringify({ stats, activities }, null, 2);
    const blob = new Blob([reportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `eyepower_report_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const handleMigration = async () => {
    const token = localStorage.getItem("eyepower_token");
    if (!token) return;
    
    setMigrating(true);
    try {
      const result = await migrateData(token);
      setMigrationResult(result);
      setTimeout(() => setMigrationResult(null), 5000);
    } catch (err) {
      console.error("Migration failed:", err);
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Prominent Eye Test Section - Moved to Very Top */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="glass-card border-4 border-cyan-500 bg-cyan-500/10 p-12 text-center relative overflow-hidden group shadow-[0_0_50px_-12px_rgba(34,211,238,0.5)]"
      >
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <Eye className="w-64 h-64 text-cyan-400" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto">
          <h2 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter uppercase leading-none text-[var(--text-primary)]">
            START YOUR <br/>
            <span className="gradient-text">AI EYE TEST</span>
          </h2>
          <p className="text-[var(--text-secondary)] text-xl mb-10 font-medium max-w-xl mx-auto">
            Experience clinical-grade vision analysis powered by advanced computer vision and Gemini 3.1 Pro.
          </p>
          <button
            onClick={() => navigate('/ai-test')}
            className="gradient-bg px-12 py-6 rounded-3xl font-black text-2xl shadow-[0_20px_50px_rgba(34,211,238,0.4)] hover:scale-105 active:scale-95 transition-all flex items-center gap-4 mx-auto group"
          >
            <Activity className="w-8 h-8 group-hover:rotate-12 transition-transform" />
            BEGIN DIAGNOSIS
          </button>
        </div>
      </motion.div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-slate-400 mt-1">Welcome back, {user.name}! Here's what's happening today.</p>
        </div>
        <div className="flex gap-3">
          {user.role === 'admin' && (
            <button 
              onClick={handleMigration}
              disabled={migrating}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                migrationResult ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "glass hover:bg-white/10"
              }`}
            >
              {migrating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Migrating...
                </>
              ) : migrationResult ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Synced to Cloud
                </>
              ) : (
                <>
                  <CloudUpload className="w-4 h-4" />
                  Sync to Cloud
                </>
              )}
            </button>
          )}
          <button 
            onClick={handleExport}
            className="glass px-4 py-2 rounded-xl text-sm font-medium hover:bg-[var(--card-hover)] transition-all"
          >
            Export Report
          </button>
          <button 
            onClick={() => navigate('/appointments')}
            className="gradient-bg px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-cyan-500/20"
          >
            New Appointment
          </button>
        </div>
      </div>

      <AnimatePresence>
        {migrationResult && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 mb-6"
          >
            <div className="flex items-center gap-3 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              <div>
                <p className="text-sm font-bold">Migration Successful!</p>
                <p className="text-xs opacity-80">
                  {Object.entries(migrationResult).map(([key, val]) => `${key}: ${val}`).join(', ')}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card relative overflow-hidden group min-h-[300px] flex items-center"
      >
        <div className="absolute inset-0 z-0">
          <img 
            src="https://picsum.photos/seed/doctor-clinic/1200/400?blur=2" 
            alt="Clinic Background" 
            className="w-full h-full object-cover opacity-20 grayscale"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent"></div>
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 p-6 w-full">
          <div className="w-24 h-24 gradient-bg rounded-3xl flex items-center justify-center shadow-2xl shadow-cyan-500/20 group-hover:scale-110 transition-transform duration-500 flex-shrink-0">
            <Eye className="text-white w-12 h-12 animate-pulse" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-3xl font-black mb-2 tracking-tight">AI Based Eye Power <span className="text-cyan-400">Detection</span></h2>
            <p className="text-slate-300 text-lg max-w-2xl leading-relaxed">
              Welcome to your advanced clinical command center. We've analyzed <span className="text-[var(--text-primary)] font-bold">{stats.aiTests}</span> cases this month with clinical-grade precision.
            </p>
            <div className="flex flex-wrap gap-4 mt-6 justify-center md:justify-start">
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                System Operational
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 rounded-full border border-cyan-500/20 text-[10px] font-bold uppercase tracking-widest text-cyan-400">
                <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
                Gemini 3.1 Pro Active
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardStats.map((stat, i) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">{stat.label}</p>
              <h3 className="text-2xl font-bold">{stat.value}</h3>
              <div className="flex items-center gap-1 mt-2">
                {stat.trend.startsWith("+") ? <ArrowUpRight className="w-3 h-3 text-emerald-400" /> : <ArrowDownRight className="w-3 h-3 text-rose-400" />}
                <span className={`text-[10px] font-bold ${stat.trend.startsWith("+") ? "text-emerald-400" : "text-rose-400"}`}>{stat.trend}</span>
                <span className="text-[10px] text-slate-500 ml-1">vs last month</span>
              </div>
            </div>
            <div className={`w-12 h-12 ${stat.bg} rounded-xl flex items-center justify-center`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card h-[400px] flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              Registration & Diagnosis Trends
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-cyan-400"></div>
                <span className="text-xs text-slate-400">Tests</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-violet-400"></div>
                <span className="text-xs text-slate-400">Registrations</span>
              </div>
            </div>
          </div>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[
                { day: 'Mon (16)', tests: 12, registrations: 5 },
                { day: 'Tue (17)', tests: 18, registrations: 8 },
                { day: 'Wed (18)', tests: 15, registrations: 4 },
                { day: 'Thu (19)', tests: 22, registrations: 12 },
                { day: 'Fri (20)', tests: 30, registrations: 15 },
                { day: 'Sat (21)', tests: 25, registrations: 10 },
                { day: 'Sun (22)', tests: 20, registrations: 7 },
              ]}>
                <defs>
                  <linearGradient id="colorTests" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRegs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="day" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px" }}
                  itemStyle={{ color: "#22d3ee" }}
                />
                <Area type="monotone" dataKey="tests" stroke="#22d3ee" strokeWidth={3} fillOpacity={1} fill="url(#colorTests)" />
                <Area type="monotone" dataKey="registrations" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorRegs)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card flex flex-col">
          <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            System Alerts
          </h3>
          <div className="space-y-4 flex-1 overflow-auto pr-2">
            <div className="p-4 bg-cyan-400/5 border border-cyan-400/20 rounded-xl">
              <p className="text-sm font-bold text-cyan-400 mb-1">New Appointment</p>
              <p className="text-xs text-slate-400">You have {stats.appointmentsToday} appointments scheduled for today.</p>
            </div>
            <div className="p-4 bg-violet-400/5 border border-violet-400/20 rounded-xl">
              <p className="text-sm font-bold text-violet-400 mb-1">AI System Ready</p>
              <p className="text-xs text-slate-400">Gemini-3.1-Pro is online and ready for high-precision eye diagnosis.</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/notifications')}
            className="w-full mt-6 py-3 bg-[var(--glass-bg)] hover:bg-[var(--card-hover)] rounded-xl text-sm font-semibold transition-all"
          >
            View All Notifications
          </button>
        </div>
      </div>

      <div className="glass-card">
        <h3 className="font-bold text-lg mb-6">Recent Activity</h3>
        <div className="space-y-4">
          {activities.slice(0, 5).map((activity, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-[var(--glass-bg)] rounded-xl border border-[var(--glass-border)]">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 font-bold">
                  {activity.user_name?.charAt(0) || "U"}
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{activity.user_name} <span className="text-slate-400 font-normal">{activity.action}</span></p>
                  <p className="text-xs text-slate-500">{activity.details}</p>
                </div>
              </div>
              <p className="text-xs text-slate-500">{new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          ))}
          {activities.length === 0 && (
            <p className="text-center text-slate-500 py-4">No recent activity found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
