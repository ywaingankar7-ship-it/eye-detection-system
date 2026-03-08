import React, { useState, useEffect } from "react";
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Users, 
  Download, 
  Calendar,
  Filter,
  Activity
} from "lucide-react";
import { motion } from "motion/react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart as RePieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area
} from "recharts";

const COLORS = ["#06b6d4", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];

export default function Analytics() {
  const [eyeStats, setEyeStats] = useState<any>(null);
  const [demographics, setDemographics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eyeRes, demoRes] = await Promise.all([
          fetch("/api/analytics/eye-conditions", { headers: { Authorization: `Bearer ${localStorage.getItem("visionx_token")}` } }),
          fetch("/api/analytics/demographics", { headers: { Authorization: `Bearer ${localStorage.getItem("visionx_token")}` } })
        ]);
        
        const eyeData = await eyeRes.json();
        const demoData = await demoRes.json();
        
        setEyeStats(eyeData);
        setDemographics(demoData);
      } catch (err: any) {
        console.error("Failed to fetch analytics", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const eyeConditionData = eyeStats ? [
    { name: "Myopia", value: eyeStats.myopia },
    { name: "Hyperopia", value: eyeStats.hyperopia },
    { name: "Astigmatism", value: eyeStats.astigmatism },
    { name: "Normal", value: eyeStats.normal }
  ] : [];

  const downloadCSV = () => {
    const headers = ["Condition", "Count"];
    const rows = eyeConditionData.map(d => [d.name, d.value]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "visionx_analytics.csv");
    link.click();
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="glass-card max-w-md mx-auto text-center">
          <Activity className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Failed to Load Analytics</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="gradient-bg px-6 py-2 rounded-xl font-bold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics & Reports</h1>
          <p className="text-slate-400 mt-1">Comprehensive insights into clinical performance and patient demographics.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={downloadCSV}
            className="glass px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-white/10 transition-all"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button className="gradient-bg px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/20">
            <Calendar className="w-4 h-4" />
            Last 30 Days
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total Diagnoses", value: "1,284", change: "+12.5%", icon: Activity, color: "text-cyan-400" },
          { label: "AI Accuracy", value: "98.4%", change: "+0.2%", icon: TrendingUp, color: "text-emerald-400" },
          { label: "New Patients", value: "342", change: "+18.3%", icon: Users, color: "text-violet-400" },
          { label: "Appointments", value: "856", change: "+5.4%", icon: Calendar, color: "text-amber-400" }
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-lg bg-white/5 ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                stat.change.startsWith('+') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
              }`}>
                {stat.change}
              </span>
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
            <h3 className="text-2xl font-black mt-1">{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold flex items-center gap-2">
              <PieChart className="w-5 h-5 text-cyan-400" />
              Eye Condition Distribution
            </h3>
            <button className="p-2 hover:bg-white/5 rounded-lg transition-all">
              <Filter className="w-4 h-4 text-slate-500" />
            </button>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={eyeConditionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {eyeConditionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
              </RePieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {eyeConditionData.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                <span className="text-xs text-slate-400">{d.name}: <span className="text-white font-bold">{d.value}</span></span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-violet-400" />
              Age-wise Condition Analysis
            </h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={demographics?.age || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="age_group" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="glass-card">
        <div className="flex items-center justify-between mb-8">
          <h3 className="font-bold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            Monthly Eye Condition Trends
          </h3>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={[
              { month: 'Jan', myopia: 45, hyperopia: 20, astigmatism: 15 },
              { month: 'Feb', myopia: 52, hyperopia: 25, astigmatism: 18 },
              { month: 'Mar', myopia: 48, hyperopia: 22, astigmatism: 20 },
              { month: 'Apr', myopia: 61, hyperopia: 30, astigmatism: 25 },
              { month: 'May', myopia: 55, hyperopia: 28, astigmatism: 22 },
              { month: 'Jun', myopia: 67, hyperopia: 35, astigmatism: 30 },
            ]}>
              <defs>
                <linearGradient id="colorMyopia" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                itemStyle={{ color: '#fff' }}
              />
              <Area type="monotone" dataKey="myopia" stroke="#06b6d4" fillOpacity={1} fill="url(#colorMyopia)" />
              <Area type="monotone" dataKey="hyperopia" stroke="#8b5cf6" fillOpacity={0} />
              <Area type="monotone" dataKey="astigmatism" stroke="#ec4899" fillOpacity={0} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
