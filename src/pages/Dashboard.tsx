import React, { useState, useEffect } from "react";
import { 
  Users, 
  Calendar, 
  AlertTriangle, 
  Activity,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Eye
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
import { motion } from "motion/react";

import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const savedUser = localStorage.getItem("visionx_user");
    if (savedUser) setUser(JSON.parse(savedUser));

    const token = localStorage.getItem("visionx_token");
    if (!token) {
      navigate("/login");
      return;
    }

    Promise.all([
      fetch("/api/analytics", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/activity-logs", { headers: { Authorization: `Bearer ${token}` } })
    ])
    .then(async ([statsRes, logsRes]) => {
      if (!statsRes.ok || !logsRes.ok) throw new Error("Failed to fetch dashboard data");
      const stats = await statsRes.json();
      const logs = await logsRes.json();
      setData(stats);
      setActivities(logs);
    })
    .catch(err => {
      console.error(err);
      setError(err.message);
    })
    .finally(() => {
      setLoading(false);
    });
  }, [navigate]);

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center bg-slate-950">
    <div className="flex flex-col items-center gap-4">
      <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-400 animate-pulse font-medium">Loading Intelligence Hub...</p>
    </div>
  </div>;

  if (error || !data || !data.stats) return <div className="min-h-screen flex items-center justify-center bg-slate-950 p-8">
    <div className="glass-card max-w-md mx-auto text-center">
      <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
      <h2 className="text-xl font-bold mb-2">Failed to Load Dashboard</h2>
      <p className="text-slate-400 mb-6">{error || "The analytics service is currently unavailable."}</p>
      <button 
        onClick={() => window.location.reload()}
        className="gradient-bg px-6 py-2 rounded-xl font-bold"
      >
        Retry
      </button>
    </div>
  </div>;

  const stats = [
    ...(user.role === 'admin' ? [{ label: "Total Customers", value: data.stats.totalCustomers, icon: Users, color: "text-blue-400", bg: "bg-blue-400/10", trend: "+12%" }] : []),
    { label: "AI Tests Done", value: data.stats.aiTests, icon: Activity, color: "text-violet-400", bg: "bg-violet-400/10", trend: "+24%" },
    { label: "Appointments Today", value: data.stats.appointmentsToday, icon: Calendar, color: "text-amber-400", bg: "bg-amber-400/10", trend: "0%" },
    { label: "System Accuracy", value: "98.4%", icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-400/10", trend: "+0.2%" },
  ];

  const handleExport = () => {
    const reportData = JSON.stringify(data, null, 2);
    const blob = new Blob([reportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `visionx_report_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-slate-400 mt-1">Welcome back, {user.name}! Here's what's happening today.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleExport}
            className="glass px-4 py-2 rounded-xl text-sm font-medium hover:bg-white/10 transition-all"
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
            <h2 className="text-3xl font-black mb-2 tracking-tight">VisionX Intelligence <span className="text-cyan-400">Hub</span></h2>
            <p className="text-slate-300 text-lg max-w-2xl leading-relaxed">
              Welcome to your advanced clinical command center. We've analyzed <span className="text-white font-bold">{data.stats.aiTests}</span> cases this month with clinical-grade precision.
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
        {stats.map((stat, i) => (
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
              Diagnosis Trends
            </h3>
          </div>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[
                { day: 'Mon', tests: 12 },
                { day: 'Tue', tests: 18 },
                { day: 'Wed', tests: 15 },
                { day: 'Thu', tests: 22 },
                { day: 'Fri', tests: 30 },
                { day: 'Sat', tests: 25 },
                { day: 'Sun', tests: 20 },
              ]}>
                <defs>
                  <linearGradient id="colorTests" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
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
            {data.stats.lowStock > 0 && (
              <div className="p-4 bg-amber-400/5 border border-amber-400/20 rounded-xl">
                <p className="text-sm font-bold text-amber-400 mb-1">Low Stock Alert</p>
                <p className="text-xs text-slate-400">{data.stats.lowStock} items are running low on stock. Please restock soon.</p>
              </div>
            )}
            <div className="p-4 bg-cyan-400/5 border border-cyan-400/20 rounded-xl">
              <p className="text-sm font-bold text-cyan-400 mb-1">New Appointment</p>
              <p className="text-xs text-slate-400">You have {data.stats.appointmentsToday} appointments scheduled for today.</p>
            </div>
            <div className="p-4 bg-violet-400/5 border border-violet-400/20 rounded-xl">
              <p className="text-sm font-bold text-violet-400 mb-1">AI System Ready</p>
              <p className="text-xs text-slate-400">Gemini-3.1-Pro is online and ready for high-precision eye diagnosis.</p>
            </div>
          </div>
          <button className="w-full mt-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-semibold transition-all">
            View All Notifications
          </button>
        </div>
      </div>

      <div className="glass-card">
        <h3 className="font-bold text-lg mb-6">Recent Activity</h3>
        <div className="space-y-4">
          {activities.slice(0, 5).map((activity, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 font-bold">
                  {activity.user_name?.charAt(0) || "U"}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{activity.user_name} <span className="text-slate-400 font-normal">{activity.action}</span></p>
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
