import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import GeminiChatbot from "./GeminiChatbot";
import { User } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface LayoutProps {
  user: User;
  onLogout: () => void;
  theme: "dark" | "light";
  toggleTheme: () => void;
}

export default function Layout({ user, onLogout, theme, toggleTheme }: LayoutProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-[var(--bg-primary)] transition-colors duration-300">
      <Sidebar user={user} onLogout={onLogout} isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      <motion.div 
        initial={false}
        animate={{ marginLeft: isCollapsed ? 80 : 256 }}
        className="flex-1 flex flex-col"
      >
        <Header user={user} theme={theme} toggleTheme={toggleTheme} />
        <main className="flex-1 p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={window.location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </motion.div>
      <GeminiChatbot />
    </div>
  );
}
