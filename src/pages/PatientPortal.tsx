import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  Clock, 
  FileText, 
  Activity, 
  User as UserIcon,
  ShoppingBag,
  ChevronRight,
  Eye,
  Bell,
  ShoppingCart,
  Trash2,
  CheckCircle2,
  Download
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format, parseISO } from "date-fns";

export default function PatientPortal() {
  const [user, setUser] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "prescriptions" | "notifications" | "cart">("overview");

  useEffect(() => {
    const savedUser = localStorage.getItem("visionx_user");
    if (savedUser) setUser(JSON.parse(savedUser));

    const fetchData = async () => {
      try {
        const token = localStorage.getItem("visionx_token");
        const headers = { Authorization: `Bearer ${token}` };
        
        const [apptRes, testRes, prescRes, notifRes, cartRes] = await Promise.all([
          fetch("/api/patient/appointments", { headers }),
          fetch("/api/patient/tests", { headers }),
          fetch("/api/patient/prescriptions", { headers }),
          fetch("/api/notifications", { headers }),
          fetch("/api/cart", { headers })
        ]);

        if (apptRes.ok) setAppointments(await apptRes.json());
        if (testRes.ok) setTestResults(await testRes.json());
        if (prescRes.ok) setPrescriptions(await prescRes.json());
        if (notifRes.ok) setNotifications(await notifRes.json());
        if (cartRes.ok) setCart(await cartRes.json());
      } catch (err) {
        console.error("Failed to fetch patient data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleRemoveFromCart = async (id: number) => {
    try {
      const response = await fetch(`/api/cart/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem("visionx_token")}` }
      });
      if (response.ok) {
        setCart(prev => prev.filter(item => item.id !== id));
      }
    } catch (err) {
      console.error("Failed to remove from cart", err);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${localStorage.getItem("visionx_token")}` }
      });
      if (response.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      }
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  if (loading || !user) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
    </div>
  );

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Patient Portal</h1>
          <p className="text-slate-400 mt-1">Welcome back, {user.name}. Manage your eye health and optical orders.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setActiveTab("cart")}
            className="relative glass-card px-4 py-3 flex items-center gap-2 hover:border-cyan-500/30 transition-all"
          >
            <ShoppingCart className="w-5 h-5 text-cyan-400" />
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-cyan-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {cart.length}
              </span>
            )}
            <span className="text-sm font-bold">Cart</span>
          </button>
          <button className="gradient-bg px-6 py-3 rounded-xl font-bold shadow-lg shadow-cyan-500/20 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Book Appointment
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/10 pb-px">
        {[
          { id: "overview", label: "Overview", icon: Activity },
          { id: "prescriptions", label: "Prescriptions", icon: FileText },
          { id: "notifications", label: "Notifications", icon: Bell, count: unreadCount },
          { id: "cart", label: "My Cart", icon: ShoppingCart }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all relative ${
              activeTab === tab.id ? "text-cyan-400" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count ? (
              <span className="bg-cyan-500 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">
                {tab.count}
              </span>
            ) : null}
            {activeTab === tab.id && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400" />
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Profile & Stats (Always visible or context-dependent) */}
        <div className="space-y-6">
          <div className="glass-card p-6 text-center">
            <div className="w-24 h-24 gradient-bg rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-bold text-white shadow-xl shadow-cyan-500/20">
              {user.name.charAt(0)}
            </div>
            <h2 className="text-xl font-bold">{user.name}</h2>
            <p className="text-slate-400 text-sm mb-6">{user.email}</p>
            <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-6">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Member Since</p>
                <p className="text-sm font-bold">Feb 2024</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Patient ID</p>
                <p className="text-sm font-bold">#VX-9921</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              Quick Actions
            </h3>
            <div className="space-y-3">
              <button 
                onClick={() => window.location.href = '/ai-test'}
                className="w-full flex items-center justify-between p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-bold text-cyan-400">Start AI Eye Test</span>
                </div>
                <ChevronRight className="w-4 h-4 text-cyan-400" />
              </button>
              <button 
                onClick={() => window.location.href = '/inventory'}
                className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all group"
              >
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-4 h-4 text-slate-400 group-hover:text-white" />
                  <span className="text-sm font-medium">Browse Eyewear</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-all" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {activeTab === "overview" && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Upcoming Appointments */}
                <section>
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Clock className="w-6 h-6 text-amber-400" />
                    Upcoming Appointments
                  </h3>
                  <div className="space-y-4">
                    {appointments.length > 0 ? (
                      appointments.map((appt: any) => (
                        <div key={appt.id} className="glass-card flex items-center justify-between p-6">
                          <div className="flex items-center gap-6">
                            <div className="text-center min-w-[60px]">
                              <p className="text-xs font-bold text-slate-500 uppercase">{format(parseISO(appt.date), 'MMM')}</p>
                              <p className="text-2xl font-black text-cyan-400">{format(parseISO(appt.date), 'dd')}</p>
                            </div>
                            <div>
                              <h4 className="font-bold text-lg">Eye Examination</h4>
                              <p className="text-sm text-slate-400 flex items-center gap-2">
                                <Clock className="w-4 h-4" /> {appt.time}
                              </p>
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                            appt.status === 'approved' ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' : 'bg-amber-400/10 text-amber-400 border-amber-400/20'
                          }`}>
                            {appt.status}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="glass-card p-12 text-center opacity-50">
                        <Calendar className="w-12 h-12 mx-auto mb-4" />
                        <p>No upcoming appointments scheduled.</p>
                      </div>
                    )}
                  </div>
                </section>

                {/* Recent Test Results */}
                <section>
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <FileText className="w-6 h-6 text-violet-400" />
                    Recent Eye Test Results
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {testResults.length > 0 ? (
                      testResults.map((test: any) => (
                        <div key={test.id} className="glass-card p-6 hover:border-cyan-500/30 transition-all cursor-pointer group">
                          <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 bg-violet-500/10 rounded-xl flex items-center justify-center text-violet-400">
                              <Eye className="w-6 h-6" />
                            </div>
                            <span className="text-xs text-slate-500">{format(parseISO(test.date), 'MMM dd, yyyy')}</span>
                          </div>
                          <h4 className="font-bold mb-2">AI Diagnosis Report</h4>
                          <p className="text-xs text-slate-400 line-clamp-2 mb-4">
                            {JSON.parse(test.results).summary || "Detailed analysis of your eye health and refractive power."}
                          </p>
                          <button className="text-cyan-400 text-xs font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                            View Full Report <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full glass-card p-12 text-center opacity-50">
                        <Activity className="w-12 h-12 mx-auto mb-4" />
                        <p>No test results available yet.</p>
                      </div>
                    )}
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === "prescriptions" && (
              <motion.div
                key="prescriptions"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {prescriptions.length > 0 ? (
                  prescriptions.map((presc: any) => (
                    <div key={presc.id} className="glass-card overflow-hidden">
                      <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                        <div>
                          <h4 className="font-bold text-lg">Optical Prescription</h4>
                          <p className="text-xs text-slate-400">Issued on {format(parseISO(presc.date), 'MMMM dd, yyyy')}</p>
                        </div>
                        <button className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg hover:bg-cyan-500 hover:text-white transition-all">
                          <Download className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="p-6 grid grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Right Eye (OD)</h5>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-white/5 p-2 rounded-lg">
                              <p className="text-[10px] text-slate-500 mb-1">SPH</p>
                              <p className="font-bold">{presc.sph_od}</p>
                            </div>
                            <div className="bg-white/5 p-2 rounded-lg">
                              <p className="text-[10px] text-slate-500 mb-1">CYL</p>
                              <p className="font-bold">{presc.cyl_od}</p>
                            </div>
                            <div className="bg-white/5 p-2 rounded-lg">
                              <p className="text-[10px] text-slate-500 mb-1">AXIS</p>
                              <p className="font-bold">{presc.axis_od}</p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Left Eye (OS)</h5>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-white/5 p-2 rounded-lg">
                              <p className="text-[10px] text-slate-500 mb-1">SPH</p>
                              <p className="font-bold">{presc.sph_os}</p>
                            </div>
                            <div className="bg-white/5 p-2 rounded-lg">
                              <p className="text-[10px] text-slate-500 mb-1">CYL</p>
                              <p className="font-bold">{presc.cyl_os}</p>
                            </div>
                            <div className="bg-white/5 p-2 rounded-lg">
                              <p className="text-[10px] text-slate-500 mb-1">AXIS</p>
                              <p className="font-bold">{presc.axis_os}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="px-6 pb-6 flex items-center justify-between">
                        <div className="flex gap-8">
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest">PD</p>
                            <p className="font-bold">{presc.pd} mm</p>
                          </div>
                          {presc.add_power && (
                            <div>
                              <p className="text-[10px] text-slate-500 uppercase tracking-widest">ADD</p>
                              <p className="font-bold">{presc.add_power}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                          <CheckCircle2 className="w-4 h-4" /> Valid Prescription
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="glass-card p-12 text-center opacity-50">
                    <FileText className="w-12 h-12 mx-auto mb-4" />
                    <p>No prescriptions found in your records.</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "notifications" && (
              <motion.div
                key="notifications"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {notifications.length > 0 ? (
                  notifications.map((notif: any) => (
                    <div 
                      key={notif.id} 
                      className={`glass-card p-4 flex items-start gap-4 transition-all ${!notif.is_read ? 'border-cyan-500/30 bg-cyan-500/5' : ''}`}
                      onClick={() => !notif.is_read && handleMarkAsRead(notif.id)}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        notif.type === 'appointment' ? 'bg-amber-500/10 text-amber-400' : 
                        notif.type === 'order' ? 'bg-emerald-500/10 text-emerald-400' : 
                        'bg-cyan-500/10 text-cyan-400'
                      }`}>
                        <Bell className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-bold text-sm">{notif.title}</h4>
                          <span className="text-[10px] text-slate-500">{format(parseISO(notif.created_at), 'MMM dd, HH:mm')}</span>
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed">{notif.message}</p>
                      </div>
                      {!notif.is_read && (
                        <div className="w-2 h-2 bg-cyan-500 rounded-full mt-2" />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="glass-card p-12 text-center opacity-50">
                    <Bell className="w-12 h-12 mx-auto mb-4" />
                    <p>No notifications at this time.</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "cart" && (
              <motion.div
                key="cart"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {cart.length > 0 ? (
                  <>
                    <div className="space-y-4">
                      {cart.map((item: any) => (
                        <div key={item.id} className="glass-card p-4 flex items-center gap-6">
                          <div className="w-20 h-20 bg-white/5 rounded-xl overflow-hidden flex-shrink-0">
                            <img 
                              src={item.image_url || "https://picsum.photos/seed/glass/200/200"} 
                              alt={item.model}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold">{item.brand} {item.model}</h4>
                            <p className="text-xs text-slate-500 uppercase tracking-widest">{item.type}</p>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-cyan-400 font-bold">${item.price}</span>
                              <span className="text-xs text-slate-500">Qty: {item.quantity}</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleRemoveFromCart(item.id)}
                            className="p-3 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-xl transition-all"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="glass-card p-6 flex items-center justify-between bg-cyan-500/5 border-cyan-500/20">
                      <div>
                        <p className="text-sm text-slate-400">Total Amount</p>
                        <p className="text-2xl font-black text-white">
                          ${cart.reduce((acc, item) => acc + (item.price * item.quantity), 0)}
                        </p>
                      </div>
                      <button className="gradient-bg px-8 py-4 rounded-xl font-bold shadow-xl shadow-cyan-500/20 flex items-center gap-2">
                        Checkout Now
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="glass-card p-12 text-center opacity-50">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-4" />
                    <p>Your cart is empty. Browse our collection to add items.</p>
                    <button 
                      onClick={() => window.location.href = '/inventory'}
                      className="mt-4 text-cyan-400 font-bold hover:underline"
                    >
                      Go to Inventory
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
