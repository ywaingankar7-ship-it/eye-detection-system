import React, { useState, useEffect, useRef } from "react";
import { Bell, Search, Settings, HelpCircle, Sun, Moon, X } from "lucide-react";
import { User } from "../types";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";

interface HeaderProps {
  user: User;
  theme: "dark" | "light";
  toggleTheme: () => void;
}

export default function Header({ user, theme, toggleTheme }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const searchablePages = [
    { name: "Dashboard", path: "/dashboard", description: "Main overview and analytics" },
    { name: "Customers", path: "/customers", description: "Manage patient records", role: ["admin", "staff"] },
    { name: "Appointments", path: "/appointments", description: "Schedule and view bookings" },
    { name: "Inventory", path: "/inventory", description: "Stock and frame management" },
    { name: "AI Eye Test", path: "/ai-test", description: "Start a new vision diagnosis" },
    { name: "Virtual Try-On", path: "/try-on", description: "Try frames using AR" },
    { name: "Prescriptions", path: "/prescriptions", description: "Digital prescription records", role: ["admin", "staff"] },
    { name: "Analytics", path: "/analytics", description: "Deep dive into clinic data", role: ["admin"] },
    { name: "About", path: "/about", description: "Learn about the technology" },
    { name: "Settings", path: "/settings", description: "Account and app preferences" },
    { name: "Notifications", path: "/notifications", description: "View your alerts" },
    { name: "Patient Portal", path: "/portal", description: "Self-service for patients", role: ["patient"] }
  ];

  const filteredPages = searchablePages.filter(page => {
    const matchesQuery = page.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         page.description.toLowerCase().includes(searchQuery.toLowerCase());
    const hasRole = !page.role || page.role.includes(user.role);
    return matchesQuery && hasRole && searchQuery.length > 0;
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setShowSearchResults(false);
    setSearchQuery("");
  }, [location.pathname]);

  return (
    <header className="h-20 bg-[var(--glass-bg)] backdrop-blur-xl border-b border-[var(--glass-border)] px-8 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-4 flex-1 max-w-xl" ref={searchRef}>
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchResults(true);
            }}
            onFocus={() => setShowSearchResults(true)}
            placeholder="Search pages, records, tools..." 
            className="w-full bg-[var(--bg-primary)] border border-[var(--glass-border)] rounded-xl py-2 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all text-[var(--text-primary)]"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[var(--text-primary)]"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <AnimatePresence>
            {showSearchResults && filteredPages.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-full left-0 right-0 mt-2 glass-card p-2 shadow-2xl border border-[var(--glass-border)] max-h-[400px] overflow-auto"
              >
                {filteredPages.map((page) => (
                  <button
                    key={page.path}
                    onClick={() => navigate(page.path)}
                    className="w-full text-left p-3 rounded-xl hover:bg-white/5 transition-all flex items-center justify-between group"
                  >
                    <div>
                      <p className="text-sm font-bold text-[var(--text-primary)]">{page.name}</p>
                      <p className="text-[10px] text-slate-500">{page.description}</p>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Search className="w-3 h-3 text-cyan-400" />
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleTheme}
            className="p-1.5 text-slate-400 hover:text-[var(--text-primary)] hover:bg-[var(--card-hover)] rounded-lg transition-all"
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button 
            onClick={() => navigate("/notifications")}
            className="p-2 text-slate-400 hover:text-[var(--text-primary)] hover:bg-[var(--card-hover)] rounded-lg transition-all relative"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-cyan-500 rounded-full border-2 border-[var(--bg-primary)]"></span>
          </button>
          <button 
            onClick={() => navigate("/about")}
            className="p-2 text-slate-400 hover:text-[var(--text-primary)] hover:bg-[var(--card-hover)] rounded-lg transition-all"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
          <button 
            onClick={() => navigate("/settings")}
            className="p-2 text-slate-400 hover:text-[var(--text-primary)] hover:bg-[var(--card-hover)] rounded-lg transition-all"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        <div className="h-8 w-[1px] bg-[var(--glass-border)] mx-2"></div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{user.name}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">{user.role}</p>
          </div>
          <div className="w-10 h-10 rounded-xl gradient-bg p-[1px]">
            <div className="w-full h-full rounded-[11px] bg-[var(--bg-primary)] flex items-center justify-center font-bold text-cyan-400">
              {user.name.charAt(0)}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
