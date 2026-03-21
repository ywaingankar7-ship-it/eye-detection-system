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
import { db, auth } from "../firebase";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  orderBy,
  getDocs,
  limit,
  addDoc,
  serverTimestamp
} from "firebase/firestore";
import { handleFirestoreError, OperationType, logActivity } from "../firebaseUtils";

export default function PatientPortal() {
  const [user, setUser] = useState<any>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "prescriptions" | "notifications" | "cart">("overview");
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [newAppt, setNewAppt] = useState({
    date: new Date().toISOString().split('T')[0],
    time: "10:00 AM",
    notes: ""
  });

  useEffect(() => {
    const savedUser = localStorage.getItem("eyepower_user");
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
    } else {
      setLoading(false);
      return;
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    // 1. Find Customer Record by Email
    const findCustomer = async () => {
      try {
        const q = query(collection(db, "customers"), where("email", "==", user.email), limit(1));
        const snap = await getDocs(q);
        
        // Always listen for appointments by email (most reliable for patients)
        const unsubAppts = onSnapshot(
          query(collection(db, "appointments"), where("customer_email", "==", user.email), orderBy("date", "desc")),
          (s) => setAppointments(s.docs.map(d => ({ id: d.id, ...d.data() })))
        );

        let unsubTests = () => {};
        let unsubPresc = () => {};

        if (!snap.empty) {
          const custData = { id: snap.docs[0].id, ...snap.docs[0].data() };
          setCustomer(custData);
          
          // Listen to Customer-specific data (tests and prescriptions are usually linked by doc ID)
          unsubTests = onSnapshot(
            query(collection(db, "eye_tests"), where("customer_email", "==", user.email), orderBy("date", "desc")),
            (s) => setTestResults(s.docs.map(d => ({ id: d.id, ...d.data() })))
          );

          unsubPresc = onSnapshot(
            query(collection(db, "prescriptions"), where("customer_email", "==", user.email), orderBy("date", "desc")),
            (s) => setPrescriptions(s.docs.map(d => ({ id: d.id, ...d.data() })))
          );
        } else {
          setLoading(false); // No customer record found, but still show portal
        }

        return () => {
          unsubAppts();
          unsubTests();
          unsubPresc();
        };
      } catch (err) {
        console.error("Error finding customer record:", err);
        setLoading(false);
      }
    };

    findCustomer();

    // 3. Listen to User-specific data (Notifications & Cart)
    const unsubNotif = onSnapshot(
      query(collection(db, "notifications"), where("user_id", "==", user.uid), orderBy("created_at", "desc")),
      (s) => setNotifications(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    const unsubCart = onSnapshot(
      query(collection(db, "cart"), where("user_id", "==", user.uid)),
      (s) => setCart(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    setLoading(false);

    return () => {
      unsubNotif();
      unsubCart();
    };
  }, [user]);

  const handleRemoveFromCart = async (id: string) => {
    try {
      await deleteDoc(doc(db, "cart", id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `cart/${id}`);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, "notifications", id), { is_read: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `notifications/${id}`);
    }
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    try {
      // Use customer data if available, otherwise fallback to user data
      const bookingData = {
        ...newAppt,
        customer_id: user.uid, // Always use UID for security rules and consistency
        customer_name: customer?.name || user.name || "Unknown Patient",
        customer_email: customer?.email || user.email || "",
        status: "pending",
        created_at: serverTimestamp()
      };

      await addDoc(collection(db, "appointments"), bookingData);
      
      await logActivity("Book Appointment", `Patient ${bookingData.customer_name} booked an appointment for ${newAppt.date}`);
      
      setShowBookingModal(false);
      setNewAppt({ date: new Date().toISOString().split('T')[0], time: "10:00 AM", notes: "" });
      // The onSnapshot listener will pick up the new appointment
    } catch (err) {
      console.error("Booking failed:", err);
      handleFirestoreError(err, OperationType.CREATE, "appointments");
    } finally {
      setLoading(false);
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
          <button 
            onClick={() => setShowBookingModal(true)}
            className="gradient-bg px-6 py-3 rounded-xl font-bold shadow-lg shadow-cyan-500/20 flex items-center gap-2"
          >
            <Calendar className="w-5 h-5" />
            Book Appointment
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showBookingModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBookingModal(false)}
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
                    onClick={() => setShowBookingModal(false)}
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
                <p className="text-sm font-bold">
                  {customer?.created_at ? 
                    (customer.created_at.toDate ? format(customer.created_at.toDate(), 'MMM yyyy') : format(parseISO(customer.created_at), 'MMM yyyy')) : 
                    format(new Date(), 'MMM yyyy')}
                </p>
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
                {/* Prominent Eye Test Section */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-card border-4 border-cyan-500 bg-cyan-500/10 p-8 text-center relative overflow-hidden group shadow-[0_0_50px_-12px_rgba(34,211,238,0.5)]"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Eye className="w-48 h-48 text-cyan-400" />
                  </div>
                  <div className="relative z-10">
                    <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tighter uppercase leading-none text-[var(--text-primary)]">
                      START YOUR <br/>
                      <span className="gradient-text">AI EYE TEST</span>
                    </h2>
                    <p className="text-[var(--text-secondary)] text-sm mb-6 font-medium max-w-md mx-auto">
                      Experience clinical-grade vision analysis powered by advanced computer vision and Gemini 3.1 Pro.
                    </p>
                    <button
                      onClick={() => window.location.href = '/ai-test'}
                      className="gradient-bg px-8 py-4 rounded-2xl font-black text-lg shadow-[0_15px_40px_rgba(34,211,238,0.4)] hover:scale-105 active:scale-95 transition-all flex items-center gap-3 mx-auto group"
                    >
                      <Activity className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                      BEGIN DIAGNOSIS
                    </button>
                  </div>
                </motion.div>

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
                              <p className="text-xs font-bold text-slate-500 uppercase">{format(appt.date instanceof Date ? appt.date : parseISO(appt.date), 'MMM')}</p>
                              <p className="text-2xl font-black text-cyan-400">{format(appt.date instanceof Date ? appt.date : parseISO(appt.date), 'dd')}</p>
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
                            <span className="text-xs text-slate-500">{format(test.date?.toDate ? test.date.toDate() : parseISO(test.date), 'MMM dd, yyyy')}</span>
                          </div>
                          <h4 className="font-bold mb-2">{test.type === 'face_shape' ? 'Face Shape Analysis' : 'AI Diagnosis Report'}</h4>
                          <p className="text-xs text-slate-400 line-clamp-2 mb-4">
                            {typeof test.results === 'string' ? JSON.parse(test.results).summary : test.results.summary || "Detailed analysis of your eye health and refractive power."}
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
                          <p className="text-xs text-slate-400">Issued on {format(presc.date?.toDate ? presc.date.toDate() : parseISO(presc.date), 'MMMM dd, yyyy')}</p>
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
                            <span className="text-[10px] text-slate-500">{format(notif.created_at?.toDate ? notif.created_at.toDate() : parseISO(notif.created_at), 'MMM dd, HH:mm')}</span>
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
