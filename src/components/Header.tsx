import React from "react";
import { Bell, Search, Settings, HelpCircle, Sun, Moon } from "lucide-react";
import { User } from "../types";

interface HeaderProps {
  user: User;
  theme: "dark" | "light";
  toggleTheme: () => void;
}

export default function Header({ user, theme, toggleTheme }: HeaderProps) {
  return (
    <header className="h-20 bg-[var(--glass-bg)] backdrop-blur-xl border-b border-[var(--glass-border)] px-8 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search records, customers, inventory..." 
            className="w-full bg-[var(--bg-primary)] border border-[var(--glass-border)] rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all text-[var(--text-primary)]"
          />
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
          <button className="p-2 text-slate-400 hover:text-[var(--text-primary)] hover:bg-[var(--card-hover)] rounded-lg transition-all relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-cyan-500 rounded-full border-2 border-[var(--bg-primary)]"></span>
          </button>
          <button className="p-2 text-slate-400 hover:text-[var(--text-primary)] hover:bg-[var(--card-hover)] rounded-lg transition-all">
            <HelpCircle className="w-5 h-5" />
          </button>
          <button className="p-2 text-slate-400 hover:text-[var(--text-primary)] hover:bg-[var(--card-hover)] rounded-lg transition-all">
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
