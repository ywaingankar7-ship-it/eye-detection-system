import React, { useState } from "react";
import { User } from "../types";
import { Eye, Lock, Mail, ArrowRight, ShieldCheck, User as UserIcon } from "lucide-react";
import { motion } from "motion/react";

interface LoginProps {
  onLogin: (user: User, token: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("admin@visionx.com");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const endpoint = isRegistering ? "/api/auth/register" : "/api/auth/login";
    const body = isRegistering ? { name, email, password } : { email, password };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (response.ok) {
        onLogin(data.user, data.token);
      } else {
        setError(data.error || (isRegistering ? "Registration failed" : "Login failed"));
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-950">
      {/* Background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-500/10 blur-[120px] rounded-full"></div>

      <div className="flex w-full max-w-5xl bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-[32px] overflow-hidden shadow-2xl relative z-10">
        {/* Left Side - Image */}
        <div className="hidden lg:block w-1/2 relative">
          <img 
            src="https://picsum.photos/seed/eye-scan/800/1200?blur=1" 
            alt="Eye Diagnosis Machine" 
            className="w-full h-full object-cover opacity-60 grayscale hover:grayscale-0 transition-all duration-1000"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 to-transparent"></div>
          <div className="absolute bottom-12 left-12 right-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <h2 className="text-4xl font-black text-white mb-4 leading-tight">Precision Vision <br/><span className="text-cyan-400">Powered by AI</span></h2>
              <p className="text-slate-300 text-lg">The next generation of optical ERP and automated eye diagnosis systems.</p>
            </motion.div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full lg:w-1/2 p-8 md:p-16 flex flex-col justify-center">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="mb-10">
              <div className="w-14 h-14 gradient-bg rounded-2xl flex items-center justify-center mb-6 shadow-2xl shadow-cyan-500/20">
                <Eye className="text-white w-8 h-8" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight mb-2 gradient-text">
                {isRegistering ? "Create Account" : "VisionX AI"}
              </h1>
              <p className="text-slate-400">
                {isRegistering ? "Join our eye care platform" : "Optical Shop & Eye Diagnosis ERP"}
              </p>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-sm mb-6 flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {!isRegistering && (
                <div className="flex gap-2 mb-4">
                  <button 
                    type="button"
                    onClick={() => { setEmail("admin@visionx.com"); setPassword("admin123"); }}
                    className="flex-1 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-cyan-500/10 hover:text-cyan-400 transition-all"
                  >
                    Admin
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setEmail("patient@visionx.ai"); setPassword("patient123"); }}
                    className="flex-1 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-500/10 hover:text-emerald-400 transition-all"
                  >
                    Patient
                  </button>
                </div>
              )}

              {isRegistering && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-widest text-slate-500 ml-1">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-widest text-slate-500 ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                    placeholder="name@company.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-widest text-slate-500 ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-400">
                  <input type="checkbox" className="rounded border-white/10 bg-white/5 text-cyan-500" />
                  Remember me
                </label>
                <a href="#" className="text-cyan-400 hover:text-cyan-300 transition-colors">Forgot password?</a>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full gradient-bg py-4 rounded-2xl font-bold flex items-center justify-center gap-2 group hover:shadow-lg hover:shadow-cyan-500/30 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    {isRegistering ? "Create Account" : "Sign In"}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-10 text-center text-sm text-slate-500">
              {isRegistering ? (
                <>
                  Already have an account?{" "}
                  <button 
                    onClick={() => setIsRegistering(false)} 
                    className="text-cyan-400 font-semibold hover:underline"
                  >
                    Sign In
                  </button>
                </>
              ) : (
                <>
                  New Patient?{" "}
                  <button 
                    onClick={() => {
                      setIsRegistering(true);
                      setEmail("");
                      setPassword("");
                    }} 
                    className="text-cyan-400 font-semibold hover:underline"
                  >
                    Register Now
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
