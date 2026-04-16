import React from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Eye, 
  LogOut,
  ChevronRight,
  ChevronLeft,
  Menu,
  FileText
} from "lucide-react";
import { User } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface SidebarProps {
  user: User;
  onLogout: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
}

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Users, label: "Customers", path: "/customers" },
  { icon: FileText, label: "Prescriptions", path: "/prescriptions" },
  { icon: Calendar, label: "Appointments", path: "/appointments" },
  { icon: Eye, label: "AI Eye Test", path: "/ai-test" },
  { icon: LayoutDashboard, label: "Analytics", path: "/analytics" },
];

export default function Sidebar({ user, onLogout, isCollapsed, setIsCollapsed }: SidebarProps) {
  const location = useLocation();

  const filteredMenuItems = menuItems.filter(item => {
    if (user.role === 'admin') {
      return item.path !== '/ai-test';
    } else if (user.role === 'staff') {
      return item.path !== '/analytics' && item.path !== '/ai-test';
    } else {
      // Patient role
      return ['/dashboard', '/appointments', '/ai-test'].includes(item.path);
    }
  });

  return (
    <motion.div 
      initial={false}
      animate={{ width: isCollapsed ? 80 : 256 }}
      className="h-screen glass border-r border-white/10 flex flex-col fixed left-0 top-0 z-50 overflow-hidden"
    >
      <div className="p-6 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20 flex-shrink-0">
            <Eye className="text-white w-6 h-6" />
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="whitespace-nowrap"
              >
                <h1 className="font-bold text-sm tracking-tight gradient-text uppercase leading-tight">AI Based Eye Power Detection</h1>
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-semibold">AI Optical ERP</p>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>
        
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 hover:bg-[var(--card-hover)] rounded-lg text-slate-400 transition-colors"
        >
          {isCollapsed ? <Menu className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
        {filteredMenuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center justify-between p-3 rounded-xl transition-all duration-300 group ${
                isActive 
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-lg shadow-cyan-500/5" 
                  : "text-slate-400 hover:bg-[var(--card-hover)] hover:text-[var(--text-primary)]"
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? "text-cyan-400" : "group-hover:text-slate-200"}`} />
                {!isCollapsed && (
                  <motion.span 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="font-medium text-sm whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </div>
              {!isCollapsed && isActive && (
                <motion.div layoutId="active-pill">
                  <ChevronRight className="w-4 h-4" />
                </motion.div>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl p-4 mb-4 overflow-hidden"
            >
              <div className="flex items-center gap-3 mb-1">
                <div className="w-8 h-8 rounded-full bg-[var(--bg-primary)] flex items-center justify-center text-xs font-bold text-cyan-400 border border-[var(--glass-border)] flex-shrink-0">
                  {user.name.charAt(0)}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-semibold truncate">{user.name}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">{user.role}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <button
          onClick={onLogout}
          className={`w-full flex items-center gap-3 p-3 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-xl transition-all duration-300 ${isCollapsed ? "justify-center" : ""}`}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="font-medium text-sm">Sign Out</span>}
        </button>
      </div>
    </motion.div>
  );
}
