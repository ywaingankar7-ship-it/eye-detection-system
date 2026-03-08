import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Users, 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  MapPin, 
  History, 
  Download,
  MoreHorizontal,
  Trash2
} from "lucide-react";
import { Customer } from "../types";
import { motion, AnimatePresence } from "motion/react";

export default function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    age: "",
    gender: "Other"
  });

  const fetchCustomers = () => {
    fetch("/api/customers", {
      headers: { Authorization: `Bearer ${localStorage.getItem("visionx_token")}` }
    })
    .then(res => res.json())
    .then(data => {
      setCustomers(data);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("visionx_token")}` 
        },
        body: JSON.stringify(newCustomer)
      });
      if (response.ok) {
        setIsAddModalOpen(false);
        setNewCustomer({ name: "", email: "", phone: "", address: "", age: "", gender: "Other" });
        fetchCustomers();
      }
    } catch (err) {
      console.error("Failed to add customer:", err);
    }
  };

  const handleDeleteCustomer = async (id: number) => {
    if (!confirm("Are you sure you want to delete this customer?")) return;
    try {
      const response = await fetch(`/api/customers/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("visionx_token")}` }
      });
      if (response.ok) {
        fetchCustomers();
      }
    } catch (err) {
      alert("Failed to delete customer");
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm)
  );

  const exportToCSV = () => {
    const headers = ["ID", "Name", "Email", "Phone", "Address", "Created At"];
    const rows = customers.map(c => [c.id, c.name, c.email, c.phone, c.address, c.created_at]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "visionx_customers.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer Directory</h1>
          <p className="text-slate-400 mt-1">Manage patient records, eye test history, and contact details.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={exportToCSV}
            className="glass px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-white/10 transition-all"
          >
            <Download className="w-5 h-5" />
            Export CSV
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="gradient-bg px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/20"
          >
            <Plus className="w-5 h-5" />
            New Customer
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg glass-card p-8 space-y-6"
            >
              <h2 className="text-2xl font-bold">Add New Customer</h2>
              <form onSubmit={handleAddCustomer} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-500">Full Name</label>
                  <input 
                    required
                    type="text" 
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:ring-2 focus:ring-cyan-500/50 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-500">Age</label>
                    <input 
                      type="number" 
                      value={newCustomer.age}
                      onChange={(e) => setNewCustomer({ ...newCustomer, age: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:ring-2 focus:ring-cyan-500/50 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-500">Gender</label>
                    <select 
                      value={newCustomer.gender}
                      onChange={(e) => setNewCustomer({ ...newCustomer, gender: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:ring-2 focus:ring-cyan-500/50 outline-none"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-500">Phone</label>
                    <input 
                      type="tel" 
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:ring-2 focus:ring-cyan-500/50 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-500">Email</label>
                    <input 
                      type="email" 
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:ring-2 focus:ring-cyan-500/50 outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-500">Address</label>
                  <textarea 
                    value={newCustomer.address}
                    onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:ring-2 focus:ring-cyan-500/50 outline-none h-20 resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 py-3 glass rounded-xl font-bold hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 gradient-bg rounded-xl font-bold shadow-lg shadow-cyan-500/20"
                  >
                    Save Customer
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="glass-card">
        <div className="p-6 border-b border-white/10">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search by name, email or phone..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-6">
          {loading ? (
            [1,2,3,4,5,6].map(i => (
              <div key={i} className="h-48 bg-white/5 rounded-2xl animate-pulse"></div>
            ))
          ) : filteredCustomers.length > 0 ? (
            filteredCustomers.map((customer, i) => (
              <motion.div 
                key={customer.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button 
                    onClick={() => handleDeleteCustomer(customer.id)}
                    className="p-2 hover:bg-rose-500/10 rounded-lg text-slate-400 hover:text-rose-400 transition-all"
                    title="Delete Customer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button className="p-2 hover:bg-white/10 rounded-lg text-slate-400">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-start gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center text-xl font-bold shadow-lg shadow-cyan-500/10">
                    {customer.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{customer.name}</h3>
                    <p className="text-xs text-slate-500">ID: #VX{customer.id.toString().padStart(4, '0')}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded-md text-[10px] font-bold uppercase tracking-wider">Active</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-slate-400">
                    <Mail className="w-4 h-4 text-slate-500" />
                    <span className="truncate">{customer.email || "No email"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-400">
                    <Phone className="w-4 h-4 text-slate-500" />
                    <span>{customer.phone || "No phone"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-400">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    <span className="truncate">{customer.address || "No address"}</span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-white/5 flex gap-2">
                  <button 
                    onClick={() => navigate(`/ai-test?customerId=${customer.id}`)}
                    className="flex-1 py-2 bg-white/5 hover:bg-cyan-500/10 hover:text-cyan-400 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <History className="w-4 h-4" />
                    Test History
                  </button>
                  <button 
                    onClick={() => alert(`Profile for ${customer.name}`)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-all"
                  >
                    Profile
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center opacity-50">
              <Users className="w-16 h-16 mx-auto mb-4" />
              <p className="text-lg font-bold">No customers found</p>
              <p className="text-sm">Try adjusting your search or add a new customer.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
