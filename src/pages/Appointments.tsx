import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  Clock, 
  User, 
  CheckCircle2, 
  XCircle, 
  Clock4, 
  Plus,
  ChevronLeft,
  ChevronRight,
  Filter,
  Activity
} from "lucide-react";
import { Appointment } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { format, isToday, isTomorrow, parseISO } from "date-fns";

export default function Appointments() {
  const [user, setUser] = useState<any>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [newAppt, setNewAppt] = useState({
    customer_id: "",
    date: new Date().toISOString().split('T')[0],
    time: "10:00 AM",
    notes: ""
  });

  useEffect(() => {
    const savedUser = localStorage.getItem("visionx_user");
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
    }

    Promise.all([
      fetch("/api/appointments", { headers: { Authorization: `Bearer ${localStorage.getItem("visionx_token")}` } }).then(res => {
        if (!res.ok) throw new Error("Failed to fetch appointments");
        return res.json();
      }),
      fetch("/api/customers", { headers: { Authorization: `Bearer ${localStorage.getItem("visionx_token")}` } }).then(res => {
        if (!res.ok) throw new Error("Failed to fetch customers");
        return res.json();
      })
    ]).then(([apptData, custData]) => {
      setAppointments(apptData);
      setCustomers(custData);
    }).catch(err => {
      console.error("Failed to fetch appointments data", err);
      setError(err.message);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("visionx_token")}` 
        },
        body: JSON.stringify(newAppt),
      });
      if (response.ok) {
        const data = await response.json();
        const customer = customers.find(c => c.id === parseInt(newAppt.customer_id));
        setAppointments(prev => [...prev, { 
          id: data.id, 
          ...newAppt, 
          customer_id: parseInt(newAppt.customer_id),
          customer_name: customer?.name || "Unknown",
          status: "pending" 
        } as any]);
        setShowModal(false);
      }
    } catch (err) {
      alert("Booking failed");
    }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      const response = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("visionx_token")}` 
        },
        body: JSON.stringify({ status }),
      });
      if (response.ok) {
        setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: status as any } : a));
      }
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const [activeTab, setActiveTab] = useState("Today");

  const filteredAppointments = appointments.filter(a => {
    const matchesStatus = filter === "all" || a.status === filter;
    const date = parseISO(a.date);
    let matchesTab = true;
    if (activeTab === "Today") matchesTab = isToday(date);
    else if (activeTab === "Tomorrow") matchesTab = isTomorrow(date);
    
    // If patient, only show their own appointments
    const matchesUser = user?.role === 'admin' || a.customer_email === user?.email;
    
    return matchesStatus && matchesTab && matchesUser;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-emerald-400/10 text-emerald-400 border-emerald-400/20";
      case "completed": return "bg-cyan-400/10 text-cyan-400 border-cyan-400/20";
      case "pending": return "bg-amber-400/10 text-amber-400 border-amber-400/20";
      default: return "bg-slate-400/10 text-slate-400 border-slate-400/20";
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Appointment Scheduler</h1>
          <p className="text-slate-400 mt-1">Manage patient visits, eye exams, and consultations.</p>
        </div>
        {user?.role === 'patient' && (
          <button 
            onClick={() => {
              // Auto-select the current patient
              const me = customers.find(c => c.email === user.email);
              if (me) {
                setNewAppt(prev => ({ ...prev, customer_id: me.id.toString() }));
              }
              setShowModal(true);
            }}
            className="gradient-bg px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/20"
          >
            <Plus className="w-5 h-5" />
            Book Appointment
          </button>
        )}
      </div>

      {error && (
        <div className="glass-card p-8 text-center max-w-md mx-auto">
          <Calendar className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Failed to Load Appointments</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="gradient-bg px-6 py-2 rounded-xl font-bold"
          >
            Retry
          </button>
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-card w-full max-w-md relative z-10"
            >
              <h2 className="text-2xl font-bold mb-6">Book Appointment</h2>
              <form onSubmit={handleBook} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Select Customer</label>
                  <select 
                    required
                    value={newAppt.customer_id}
                    onChange={(e) => setNewAppt({ ...newAppt, customer_id: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  >
                    <option value="">-- Select --</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Date</label>
                    <input 
                      type="date"
                      required
                      value={newAppt.date}
                      onChange={(e) => setNewAppt({ ...newAppt, date: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Time</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. 10:00 AM"
                      value={newAppt.time}
                      onChange={(e) => setNewAppt({ ...newAppt, time: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Notes</label>
                  <textarea 
                    value={newAppt.notes}
                    onChange={(e) => setNewAppt({ ...newAppt, notes: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 h-24"
                    placeholder="Reason for visit..."
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 gradient-bg rounded-xl font-bold shadow-lg shadow-cyan-500/20 transition-all"
                  >
                    Confirm Booking
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold">Calendar</h3>
              <div className="flex gap-1">
                <button className="p-1 hover:bg-white/10 rounded"><ChevronLeft className="w-4 h-4" /></button>
                <button className="p-1 hover:bg-white/10 rounded"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {['S','M','T','W','T','F','S'].map((d, i) => <span key={`${d}-${i}`} className="text-[10px] font-bold text-slate-500">{d}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {Array.from({ length: 31 }).map((_, i) => (
                <button 
                  key={i} 
                  className={`aspect-square flex items-center justify-center text-xs rounded-lg transition-all ${
                    i + 1 === new Date().getDate() ? 'gradient-bg font-bold' : 'hover:bg-white/10'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="glass-card">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Filter className="w-4 h-4 text-cyan-400" />
              Filter Status
            </h3>
            <div className="space-y-2">
              {['all', 'pending', 'approved', 'completed'].map(s => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`w-full text-left px-4 py-2 rounded-xl text-sm capitalize transition-all ${
                    filter === s ? 'bg-white/10 text-cyan-400 font-bold' : 'text-slate-400 hover:bg-white/5'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center gap-4 overflow-x-auto pb-2 no-scrollbar">
            {['Today', 'Tomorrow', 'All'].map((tab) => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                  activeTab === tab ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {loading ? (
                [1,2,3].map(i => <div key={i} className="h-24 bg-white/5 rounded-2xl animate-pulse"></div>)
              ) : filteredAppointments.length > 0 ? (
                filteredAppointments.map((app, i) => (
                  <motion.div
                    key={app.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass-card flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-6">
                      <div className="text-center min-w-[60px]">
                        <p className="text-xs font-bold text-slate-500 uppercase">{format(parseISO(app.date), 'MMM')}</p>
                        <p className="text-2xl font-black text-cyan-400">{format(parseISO(app.date), 'dd')}</p>
                      </div>
                      <div className="h-10 w-[1px] bg-white/10 hidden md:block"></div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-lg">{app.customer_name}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${getStatusColor(app.status)}`}>
                            {app.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-400">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-cyan-400" />
                            {app.time}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <User className="w-4 h-4 text-slate-500" />
                            Dr. VisionX
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Admin can only view, no action buttons as per request */}
                      {user?.role === 'admin' && (
                        <span className="text-[10px] text-slate-500 uppercase font-bold px-2 py-1 bg-white/5 rounded-lg">View Only</span>
                      )}
                      
                      {app.status === 'completed' && (
                        <button 
                          onClick={() => window.location.href = `/ai-test?customerId=${app.customer_id}`}
                          className="px-4 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                        >
                          <Activity className="w-4 h-4" />
                          View Report
                        </button>
                      )}
                      <button className="p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                        <Clock4 className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="py-20 text-center opacity-50">
                  <Calendar className="w-16 h-16 mx-auto mb-4" />
                  <p className="text-lg font-bold">No appointments found</p>
                  <p className="text-sm">Everything is clear for now.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
