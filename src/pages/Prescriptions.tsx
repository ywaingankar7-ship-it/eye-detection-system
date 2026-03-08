import React, { useState, useEffect } from "react";
import { 
  FileText, 
  Plus, 
  Download, 
  Search, 
  User, 
  Calendar as CalendarIcon,
  Eye,
  CheckCircle2,
  Loader2,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { Prescription, Customer } from "../types";
import { cn } from "../lib/utils";

export default function Prescriptions() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState("");

  const [formData, setFormData] = useState({
    customer_id: "",
    date: new Date().toISOString().split('T')[0],
    sph_od: "", cyl_od: "", axis_od: "",
    sph_os: "", cyl_os: "", axis_os: "",
    add_power: "", pd: "", doctor_notes: ""
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("visionx_token");
        const [prescRes, custRes] = await Promise.all([
          fetch("/api/prescriptions", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/customers", { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setPrescriptions(await prescRes.json());
        setCustomers(await custRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleExportPDF = (p: Prescription) => {
    const doc = new jsPDF() as any;
    
    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text("VisionX AI - Optical Prescription", 15, 25);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(`Patient: ${p.customer_name}`, 15, 55);
    doc.text(`Date: ${new Date(p.date).toLocaleDateString()}`, 15, 62);
    doc.text(`Prescription ID: #PX-${p.id.toString().padStart(4, '0')}`, 15, 69);

    // Table
    doc.autoTable({
      startY: 80,
      head: [['Eye', 'SPH', 'CYL', 'AXIS']],
      body: [
        ['Right (OD)', p.sph_od, p.cyl_od, p.axis_od],
        ['Left (OS)', p.sph_os, p.cyl_os, p.axis_os]
      ],
      theme: 'grid',
      headStyles: { fillColor: [6, 182, 212] }
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    doc.text(`Add Power: ${p.add_power}`, 15, finalY + 15);
    doc.text(`PD: ${p.pd} mm`, 15, finalY + 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Doctor's Notes:", 15, finalY + 35);
    doc.text(p.doctor_notes || "No additional notes.", 15, finalY + 42);

    doc.save(`Prescription_${p.customer_name}_${p.date}.pdf`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem("visionx_token");
      const res = await fetch("/api/prescriptions", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        const newPresc = await res.json();
        // Refresh list
        const prescRes = await fetch("/api/prescriptions", { headers: { Authorization: `Bearer ${token}` } });
        setPrescriptions(await prescRes.json());
        setIsAdding(false);
        setFormData({
          customer_id: "",
          date: new Date().toISOString().split('T')[0],
          sph_od: "", cyl_od: "", axis_od: "",
          sph_os: "", cyl_os: "", axis_os: "",
          add_power: "", pd: "", doctor_notes: ""
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPrescriptions = prescriptions.filter(p => 
    p.customer_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading && !isAdding) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Digital Prescriptions</h1>
          <p className="text-slate-500">Manage and export clinical-grade optical prescriptions.</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="gradient-bg text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-cyan-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
        >
          {isAdding ? <FileText className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          {isAdding ? "View All" : "New Prescription"}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {isAdding ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-card p-8 border-white/5"
          >
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Select Patient</label>
                  <select
                    required
                    value={formData.customer_id}
                    onChange={(e) => setFormData({...formData, customer_id: e.target.value})}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-cyan-500/50 outline-none"
                  >
                    <option value="">Choose a patient...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-cyan-500/50 outline-none"
                  />
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-12">
                {/* Right Eye */}
                <div className="space-y-6">
                  <h3 className="text-cyan-400 font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Right Eye (OD)
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs text-slate-500">SPH</label>
                      <input type="text" placeholder="-1.25" value={formData.sph_od} onChange={(e) => setFormData({...formData, sph_od: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white text-sm" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-slate-500">CYL</label>
                      <input type="text" placeholder="-0.50" value={formData.cyl_od} onChange={(e) => setFormData({...formData, cyl_od: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white text-sm" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-slate-500">AXIS</label>
                      <input type="text" placeholder="180" value={formData.axis_od} onChange={(e) => setFormData({...formData, axis_od: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white text-sm" />
                    </div>
                  </div>
                </div>

                {/* Left Eye */}
                <div className="space-y-6">
                  <h3 className="text-indigo-400 font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Left Eye (OS)
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs text-slate-500">SPH</label>
                      <input type="text" placeholder="-1.50" value={formData.sph_os} onChange={(e) => setFormData({...formData, sph_os: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white text-sm" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-slate-500">CYL</label>
                      <input type="text" placeholder="-0.25" value={formData.cyl_os} onChange={(e) => setFormData({...formData, cyl_os: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white text-sm" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-slate-500">AXIS</label>
                      <input type="text" placeholder="175" value={formData.axis_os} onChange={(e) => setFormData({...formData, axis_os: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white text-sm" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Add Power</label>
                  <input type="text" placeholder="+2.00" value={formData.add_power} onChange={(e) => setFormData({...formData, add_power: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:ring-2 focus:ring-cyan-500/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">PD (Pupillary Distance)</label>
                  <input type="text" placeholder="63" value={formData.pd} onChange={(e) => setFormData({...formData, pd: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:ring-2 focus:ring-cyan-500/50" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Doctor's Notes</label>
                <textarea
                  rows={4}
                  value={formData.doctor_notes}
                  onChange={(e) => setFormData({...formData, doctor_notes: e.target.value})}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none"
                  placeholder="Additional instructions for the patient or lab..."
                ></textarea>
              </div>

              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-8 py-3 rounded-xl border border-white/10 text-slate-400 font-bold hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="gradient-bg text-white px-10 py-3 rounded-xl font-bold shadow-xl shadow-cyan-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  Save Prescription
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search by patient name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl py-2.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                />
              </div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">
                Total: {filteredPrescriptions.length} Records
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredPrescriptions.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card p-6 border-white/5 hover:border-white/20 transition-all group"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <User className="w-6 h-6 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white truncate">{p.customer_name}</h3>
                        <div className="flex items-center gap-2 text-slate-500 text-xs mt-1">
                          <CalendarIcon className="w-3 h-3" />
                          {new Date(p.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleExportPDF(p)}
                      className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500 hover:text-white transition-all shadow-lg shadow-cyan-500/10"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">OD (Right)</p>
                      <p className="text-sm font-bold text-white">{p.sph_od} / {p.cyl_od} x {p.axis_od}°</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">OS (Left)</p>
                      <p className="text-sm font-bold text-white">{p.sph_os} / {p.cyl_os} x {p.axis_os}°</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">PD: {p.pd}mm</span>
                    </div>
                    <button className="flex items-center gap-1.5 text-cyan-400 text-xs font-bold uppercase tracking-widest hover:gap-2.5 transition-all">
                      View Details
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
