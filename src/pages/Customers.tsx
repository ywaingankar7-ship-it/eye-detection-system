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
  Trash2,
  CloudUpload,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { Customer } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { migrateData } from "../services/migrationService";
import { cn } from "../lib/utils";

import { db } from "../firebase";
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  query,
  orderBy,
  where
} from "firebase/firestore";
import { handleFirestoreError, OperationType, logActivity } from "../firebaseUtils";

export default function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{id: string, source: string, name: string} | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<any>(null);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    age: "",
    gender: "Other"
  });

  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // Listen to customers collection
    const qCustomers = query(collection(db, "customers"));
    const unsubCustomers = onSnapshot(qCustomers, (snapshot) => {
      const customerData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        source: 'customer'
      }));
      updateMergedList(customerData, 'customers');
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "customers");
    });
    unsubscribers.push(unsubCustomers);

    // Listen to users collection (registered patients)
    const qUsers = query(collection(db, "users"), where("role", "==", "patient"));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      const userData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        source: 'user'
      }));
      updateMergedList(userData, 'users');
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "users");
    });
    unsubscribers.push(unsubUsers);

    let allCustomers: any[] = [];
    let allUsers: any[] = [];

    const updateMergedList = (data: any[], type: 'customers' | 'users') => {
      if (type === 'customers') allCustomers = data;
      else allUsers = data;

      // Merge and remove duplicates by email
      const merged = [...allCustomers];
      allUsers.forEach(user => {
        const exists = merged.find(c => c.email === user.email && user.email !== "");
        if (!exists) {
          merged.push(user);
        }
      });

      // Sort by created_at
      merged.sort((a: any, b: any) => {
        const dateA = a.created_at?.seconds || (a.created_at ? new Date(a.created_at).getTime() / 1000 : 0);
        const dateB = b.created_at?.seconds || (b.created_at ? new Date(b.created_at).getTime() / 1000 : 0);
        return dateB - dateA;
      });

      setCustomers(merged);
      setLoading(false);
    };

    return () => unsubscribers.forEach(unsub => unsub());
  }, []);

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

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "customers"), {
        ...newCustomer,
        created_at: serverTimestamp()
      });
      await logActivity("Add Customer", `Added new customer: ${newCustomer.name}`);
      setIsAddModalOpen(false);
      setNewCustomer({ name: "", email: "", phone: "", address: "", age: "", gender: "Other" });
    } catch (err) {
      console.error("Failed to add customer:", err);
      handleFirestoreError(err, OperationType.CREATE, "customers");
    }
  };

  const handleDeleteCustomer = async () => {
    if (!deleteConfirm) return;
    const { id, source } = deleteConfirm;
    
    try {
      const collectionName = source === 'user' ? "users" : "customers";
      const docId = String(id);
      
      console.log(`Deleting ${collectionName}/${docId}...`);
      
      const docRef = doc(db, collectionName, docId);
      await deleteDoc(docRef);
      
      await logActivity("Delete Customer", `Deleted ${source} record: ${deleteConfirm.name} (ID: ${id})`);
      setDeleteConfirm(null);
    } catch (err: any) {
      console.error("Delete operation failed:", err);
      handleFirestoreError(err, OperationType.DELETE, `${source === 'user' ? 'users' : 'customers'}/${id}`);
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
    link.setAttribute("download", "eyepower_customers.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Customer Directory</h1>
          <p className="text-slate-400 mt-1">Manage patient records, eye test history, and contact details.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleMigration}
            disabled={migrating}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
              migrationResult ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "glass hover:bg-white/10"
            }`}
          >
            {migrating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Syncing...
              </>
            ) : migrationResult ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Synced
              </>
            ) : (
              <>
                <CloudUpload className="w-5 h-5" />
                Sync Data
              </>
            )}
          </button>
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
                    className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl px-4 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-cyan-500/50 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-500">Age</label>
                    <input 
                      type="number" 
                      value={newCustomer.age}
                      onChange={(e) => setNewCustomer({ ...newCustomer, age: e.target.value })}
                      className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl px-4 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-cyan-500/50 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-500">Gender</label>
                    <select 
                      value={newCustomer.gender}
                      onChange={(e) => setNewCustomer({ ...newCustomer, gender: e.target.value })}
                      className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl px-4 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-cyan-500/50 outline-none"
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
                      className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl px-4 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-cyan-500/50 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-500">Email</label>
                    <input 
                      type="email" 
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                      className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl px-4 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-cyan-500/50 outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-500">Address</label>
                  <textarea 
                    value={newCustomer.address}
                    onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                    className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl px-4 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-cyan-500/50 outline-none h-20 resize-none"
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

      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md glass-card p-8 text-center space-y-6"
            >
              <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto">
                <Trash2 className="w-10 h-10 text-rose-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Delete Record?</h2>
                <p className="text-slate-400 mt-2">
                  Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? 
                  This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-3 glass rounded-xl font-bold hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteCustomer}
                  className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 rounded-xl font-bold shadow-lg shadow-rose-500/20 transition-all"
                >
                  Delete Now
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="glass-card">
        <div className="p-6 border-b border-[var(--glass-border)]">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search by name, email or phone..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[var(--bg-primary)] border border-[var(--glass-border)] rounded-xl py-2 pl-10 pr-4 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
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
                className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl p-6 hover:bg-[var(--card-hover)] transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button 
                    onClick={() => setDeleteConfirm({ id: customer.id, source: customer.source, name: customer.name })}
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
                    <p className="text-xs text-slate-500">ID: #VX{String(customer.id || "").slice(0, 4).toUpperCase()}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={cn(
                        "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider",
                        customer.source === 'user' ? "bg-purple-500/10 text-purple-400" : "bg-cyan-500/10 text-cyan-400"
                      )}>
                        {customer.source === 'user' ? "Registered Patient" : "Manual Record"}
                      </span>
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

                <div className="mt-6 pt-6 border-t border-[var(--glass-border)] flex gap-2">
                  <button 
                    onClick={() => navigate(`/ai-test?customerId=${customer.id}`)}
                    className="flex-1 py-2 bg-[var(--bg-primary)] hover:bg-cyan-500/10 hover:text-cyan-400 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border border-[var(--glass-border)]"
                  >
                    <History className="w-4 h-4" />
                    Test History
                  </button>
                  <button 
                    onClick={() => alert(`Profile for ${customer.name}`)}
                    className="px-4 py-2 bg-[var(--bg-primary)] hover:bg-[var(--card-hover)] rounded-xl text-xs font-bold transition-all border border-[var(--glass-border)]"
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
