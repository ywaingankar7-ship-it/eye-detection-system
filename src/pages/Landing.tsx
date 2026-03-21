import React from "react";
import { motion } from "motion/react";
import { 
  Zap, 
  Eye, 
  Shield, 
  ArrowRight, 
  Camera, 
  Sparkles,
  ChevronRight,
  ShoppingBag,
  Activity,
  Sun,
  Moon,
  ShoppingCart,
  Calendar
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../lib/utils";
import { User } from "../types";

const FeatureCard = ({ 
  icon: Icon, 
  title, 
  description, 
  className,
  delay = 0 
}: { 
  icon: any, 
  title: string, 
  description: string, 
  className?: string,
  delay?: number
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    viewport={{ once: true }}
    className={cn(
      "glass-card p-8 group hover:border-cyan-500/30 transition-all duration-500",
      className
    )}
  >
    <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
      <Icon className="w-6 h-6 text-cyan-400" />
    </div>
    <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
    <p className="text-slate-400 leading-relaxed">{description}</p>
  </motion.div>
);

export default function Landing({ user, theme, toggleTheme }: { user: User | null, theme: "dark" | "light", toggleTheme: () => void }) {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] selection:bg-cyan-500/30 transition-colors duration-300">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-[100] border-b border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Eye className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-black text-[var(--text-primary)] tracking-tighter italic uppercase">AI Based Eye Power Detection</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-bold text-slate-500 hover:text-[var(--text-primary)] transition-colors uppercase tracking-widest">Features</a>
            <a href="#tech" className="text-sm font-bold text-slate-500 hover:text-[var(--text-primary)] transition-colors uppercase tracking-widest">Technology</a>
            
            <button 
              onClick={toggleTheme}
              className="p-2 text-slate-500 hover:text-cyan-400 hover:bg-white/5 rounded-xl transition-all"
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {user ? (
              <Link to="/dashboard" className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all">
                Dashboard
              </Link>
            ) : (
              <Link to="/login" className="px-6 py-2 rounded-xl gradient-bg text-white font-bold shadow-lg shadow-cyan-500/20 hover:scale-105 transition-all">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        {/* Background Atmosphere */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-cyan-400 text-xs font-bold uppercase tracking-widest mb-8"
            >
              <Sparkles className="w-4 h-4" /> The Future of Eyewear is Here
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-6xl md:text-8xl font-black text-[var(--text-primary)] tracking-tighter mb-8 leading-[0.9]"
            >
              EYE POWER <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">DETECTION</span> REIMAGINED.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-xl text-slate-500 mb-12 max-w-2xl mx-auto leading-relaxed"
            >
              Experience the world's first AI-powered eye power detection platform. 
              Virtual try-ons, precision eye tests, and premium eyewear curated just for you.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-col items-center justify-center gap-6"
            >
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
                <Link 
                  to="/inventory"
                  className="w-full sm:w-auto px-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2 group"
                >
                  <ShoppingCart className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" /> My Cart
                </Link>
                <Link 
                  to="/appointments"
                  className="w-full sm:w-auto px-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2 group"
                >
                  <Calendar className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" /> Book Appointment
                </Link>
              </div>
              
              <Link 
                to={user ? "/dashboard" : "/login"}
                className="w-full max-w-lg px-12 py-8 gradient-bg rounded-[2.5rem] font-black text-4xl text-white shadow-2xl shadow-cyan-500/40 hover:scale-105 active:scale-95 transition-all flex flex-col items-center justify-center gap-2 group uppercase tracking-tighter"
              >
                <span className="text-sm font-bold tracking-[0.3em] text-cyan-200 opacity-80 mb-1">Access Your Account</span>
                <div className="flex items-center gap-4">
                  Patient Portal <ArrowRight className="w-10 h-10 group-hover:translate-x-3 transition-transform" />
                </div>
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Floating Elements */}
        <motion.div 
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-10 hidden xl:block"
        >
          <div className="glass-card p-4 flex items-center gap-4 border-cyan-500/20">
            <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">AI Accuracy</p>
              <p className="text-sm font-black text-white">99.8% Precision</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          animate={{ y: [0, 20, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-1/4 right-10 hidden xl:block"
        >
          <div className="glass-card p-4 flex items-center gap-4 border-purple-500/20">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Camera className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">AR Engine</p>
              <p className="text-sm font-black text-white">Real-time Tracking</p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 relative">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-end justify-between mb-20 gap-8">
            <div className="max-w-2xl">
              <h2 className="text-4xl md:text-6xl font-black text-[var(--text-primary)] tracking-tighter mb-6 leading-none">
                REVOLUTIONIZING <br /> THE EYE CARE EXPERIENCE.
              </h2>
              <p className="text-slate-400 text-lg">
                We've combined cutting-edge computer vision with premium craftsmanship to redefine how you see and are seen.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div id="tech" className="h-px w-24 bg-white/10 hidden lg:block" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em]">Our Core Tech</span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={Camera}
              title="Virtual Try-On"
              description="Our advanced AR engine tracks 468 facial landmarks in real-time for a perfect fit visualization."
              delay={0.1}
            />
            <FeatureCard 
              icon={Activity}
              title="AI Diagnostics"
              description="Get instant insights into your eye health and prescription needs using our proprietary vision models."
              delay={0.2}
            />
            <FeatureCard 
              icon={ShoppingBag}
              title="Smart Inventory"
              description="Browse a curated collection of premium frames with real-time stock and personalized recommendations."
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32">
        <div className="container mx-auto px-6">
          <div className="relative rounded-[40px] overflow-hidden bg-gradient-to-br from-cyan-600 to-blue-700 p-12 md:p-24 text-center">
            <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/vision/1920/1080')] opacity-10 mix-blend-overlay grayscale" />
            <div className="relative z-10 max-w-3xl mx-auto">
              <h2 className="text-4xl md:text-6xl font-black text-white mb-8 tracking-tighter leading-none">
                READY TO SEE THE <br /> WORLD DIFFERENTLY?
              </h2>
              <p className="text-cyan-50 text-xl mb-12 opacity-80">
                Join thousands of users who have already upgraded their vision experience with AI Based Eye Power Detection System.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link 
                  to="/inventory"
                  className="px-10 py-5 bg-white text-slate-900 rounded-2xl font-black hover:scale-105 transition-all flex items-center gap-3"
                >
                  Get Started Now <ChevronRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-white/5">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Eye className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-black text-[var(--text-primary)] tracking-tighter italic uppercase">AI Based Eye Power Detection</span>
            </div>
            <p className="text-slate-500 text-sm font-medium">
              © 2026 AI Based Eye Power Detection System. All rights reserved.
            </p>
            <div className="flex items-center gap-8">
              <a href="#" className="text-slate-400 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest">Privacy</a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
