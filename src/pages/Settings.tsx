import React, { useState } from "react";
import { motion } from "motion/react";
import { Settings as SettingsIcon, Bell, Shield, User, Globe, Moon, Sun, Save } from "lucide-react";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("profile");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: Shield },
    { id: "appearance", label: "Appearance", icon: Globe }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-cyan-400" />
            Settings
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">Manage your account and application preferences.</p>
        </div>
        <button 
          onClick={handleSave}
          className="gradient-bg px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all"
        >
          {saved ? <span className="flex items-center gap-2">Saved!</span> : <><Save className="w-4 h-4" /> Save Changes</>}
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-64 space-y-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id 
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" 
                  : "text-[var(--text-secondary)] hover:bg-white/5"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 glass-card p-8 min-h-[400px]">
          {activeTab === "profile" && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <h2 className="text-xl font-bold">Profile Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Full Name</label>
                  <input type="text" className="w-full bg-[var(--bg-primary)] border border-[var(--glass-border)] rounded-xl py-2 px-4 text-sm" placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Email Address</label>
                  <input type="email" className="w-full bg-[var(--bg-primary)] border border-[var(--glass-border)] rounded-xl py-2 px-4 text-sm" placeholder="john@example.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Phone Number</label>
                  <input type="tel" className="w-full bg-[var(--bg-primary)] border border-[var(--glass-border)] rounded-xl py-2 px-4 text-sm" placeholder="+1 (555) 000-0000" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Location</label>
                  <input type="text" className="w-full bg-[var(--bg-primary)] border border-[var(--glass-border)] rounded-xl py-2 px-4 text-sm" placeholder="New York, USA" />
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "notifications" && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <h2 className="text-xl font-bold">Notification Preferences</h2>
              <div className="space-y-4">
                {[
                  { label: "Email Notifications", desc: "Receive updates about your appointments via email." },
                  { label: "SMS Alerts", desc: "Get text messages for urgent clinic updates." },
                  { label: "System Notifications", desc: "In-app alerts for new prescriptions and tests." },
                  { label: "Marketing Emails", desc: "Stay updated with our latest offers and news." }
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                    <div>
                      <p className="text-sm font-bold">{item.label}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{item.desc}</p>
                    </div>
                    <div className="w-12 h-6 bg-cyan-500/20 rounded-full relative p-1 cursor-pointer">
                      <div className="w-4 h-4 bg-cyan-500 rounded-full absolute right-1"></div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === "appearance" && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <h2 className="text-xl font-bold">Appearance Settings</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border-2 border-cyan-500 bg-slate-950 rounded-2xl flex flex-col items-center gap-3 cursor-pointer">
                  <Moon className="w-8 h-8 text-cyan-400" />
                  <span className="text-sm font-bold">Dark Mode</span>
                </div>
                <div className="p-4 border-2 border-transparent bg-white rounded-2xl flex flex-col items-center gap-3 cursor-pointer">
                  <Sun className="w-8 h-8 text-slate-400" />
                  <span className="text-sm font-bold text-slate-900">Light Mode</span>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "security" && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <h2 className="text-xl font-bold">Security & Privacy</h2>
              <div className="space-y-4">
                <button className="w-full text-left p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all">
                  <p className="text-sm font-bold">Change Password</p>
                  <p className="text-xs text-[var(--text-secondary)]">Update your account password regularly.</p>
                </button>
                <button className="w-full text-left p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all">
                  <p className="text-sm font-bold">Two-Factor Authentication</p>
                  <p className="text-xs text-[var(--text-secondary)]">Add an extra layer of security to your account.</p>
                </button>
                <button className="w-full text-left p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl hover:bg-rose-500/20 transition-all">
                  <p className="text-sm font-bold text-rose-500">Delete Account</p>
                  <p className="text-xs text-rose-500/60">Permanently remove your account and all data.</p>
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
