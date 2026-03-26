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
    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">{title}</h3>
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
              className="p-2 text-slate-500 hover:text-cyan-400 hover:bg-[var(--card-hover)] rounded-xl transition-all"
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {user ? (
              <Link to="/dashboard" className="px-6 py-2 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] font-bold hover:bg-[var(--card-hover)] transition-all">
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
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Section: Name and Description */}
            <div className="text-left">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] text-cyan-400 text-xs font-bold uppercase tracking-widest mt-[15px] mx-[5px] mb-5"
              >
                <Sparkles className="w-4 h-4" /> The Future of Eyewear is Here
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-4xl md:text-6xl font-black text-[var(--text-primary)] tracking-tighter mb-5 leading-[1.1]"
              >
                EYE POWER <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 uppercase">Detection</span> <br />
                REIMAGINED.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="text-lg text-slate-500 mb-5 max-w-xl leading-relaxed"
              >
                Experience the world's first AI-powered eye power detection platform. 
                Virtual try-ons, precision eye tests, and premium eyewear curated just for you.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Link 
                  to={user ? "/dashboard" : "/login"}
                  className="px-8 py-4 gradient-bg rounded-2xl font-bold text-white shadow-xl shadow-cyan-500/20 hover:scale-105 transition-all flex items-center gap-2 group"
                >
                  Patient Portal <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link 
                  to="/appointments"
                  className="px-8 py-4 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl font-bold text-[var(--text-primary)] hover:bg-[var(--card-hover)] transition-all flex items-center gap-2"
                >
                  Book Appointment
                </Link>
              </motion.div>
            </div>

            {/* Right Section: Visual Image */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.6 }}
              className="relative"
            >
              <div className="relative aspect-[16/10] rounded-[32px] overflow-hidden shadow-[0_20px_80px_-15px_rgba(34,211,238,0.3)] border border-[var(--glass-border)] group">
                <img 
                  src="../image/image.png" 
                  alt="AI Eye Diagnosis" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)]/40 via-transparent to-transparent"></div>
                
                {/* Overlay Stats */}
                <div className="absolute bottom-4 left-4 right-4 flex gap-3">
                  <div className="glass-card p-2.5 flex-1 backdrop-blur-md bg-white/5 border-white/10">
                    <p className="text-[7px] font-bold text-cyan-400 uppercase tracking-widest mb-0.5">AI Precision</p>
                    <p className="text-xs font-black">99.8%</p>
                  </div>
                  <div className="glass-card p-2.5 flex-1 backdrop-blur-md bg-white/5 border-white/10">
                    <p className="text-[7px] font-bold text-purple-400 uppercase tracking-widest mb-0.5">AR Engine</p>
                    <p className="text-xs font-black">Real-time</p>
                  </div>
                </div>
              </div>

              {/* Decorative Elements */}
              <div className="absolute -top-4 -right-4 w-20 h-20 bg-cyan-500/20 blur-3xl rounded-full animate-pulse"></div>
              <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-purple-500/20 blur-3xl rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
            </motion.div>
          </div>
        </div>
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
              <div id="tech" className="h-px w-24 bg-[var(--glass-border)] hidden lg:block" />
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
      <footer className="py-20 border-t border-[var(--glass-border)]">
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
              <a href="#" className="text-slate-400 hover:text-[var(--text-primary)] transition-colors text-sm font-bold uppercase tracking-widest">Privacy</a>
              <a href="#" className="text-slate-400 hover:text-[var(--text-primary)] transition-colors text-sm font-bold uppercase tracking-widest">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
