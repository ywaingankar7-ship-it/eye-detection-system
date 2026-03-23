import React, { useState } from "react";
import { User } from "../types";
import { Eye, Lock, Mail, ArrowRight, ShieldCheck, User as UserIcon, AlertCircle } from "lucide-react";
import { motion } from "motion/react";
import { auth, db } from "../firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { createUserProfile, getUserProfile } from "../firebaseUtils";
import { Chrome, Sun, Moon } from "lucide-react";
import { isEmailAdmin } from "../constants";

interface LoginProps {
  onLogin: (user: User, token: string) => void;
  theme: "dark" | "light";
  toggleTheme: () => void;
}

export default function Login({ onLogin, theme, toggleTheme }: LoginProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("admin@eyepower.ai");
  const [password, setPassword] = useState("admin@123");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>("");
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState("");

  const getPasswordStrength = (pass: string) => {
    let strength = 0;
    if (pass.length >= 8) strength++;
    if (/[A-Z]/.test(pass)) strength++;
    if (/[a-z]/.test(pass)) strength++;
    if (/[0-9]/.test(pass)) strength++;
    if (/[^A-Za-z0-9]/.test(pass)) strength++;
    return strength;
  };

  const strength = getPasswordStrength(password);
  const isPasswordValid = strength >= 5;

  const getStrengthLabel = (s: number) => {
    if (s === 0) return { label: "Very Weak", color: "bg-slate-700" };
    if (s <= 2) return { label: "Weak", color: "bg-rose-500" };
    if (s <= 3) return { label: "Fair", color: "bg-amber-500" };
    if (s <= 4) return { label: "Good", color: "bg-blue-500" };
    return { label: "Strong", color: "bg-emerald-500" };
  };

  const strengthInfo = getStrengthLabel(strength);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;
        
        await updateProfile(firebaseUser, { displayName: name });
        
        const userData: User = {
          id: Date.now(), // Legacy ID
          uid: firebaseUser.uid,
          name,
          email,
          role: isEmailAdmin(email) ? "admin" : "patient"
        };
        
        await createUserProfile(firebaseUser.uid, userData);
        onLogin(userData, await firebaseUser.getIdToken());
      } else {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const firebaseUser = userCredential.user;
          
          const profile = await getUserProfile(firebaseUser.uid) as User;
          const isMasterAdmin = isEmailAdmin(email);
          
          if (profile) {
            // Force admin role for the master email and update DB if needed
            if (isMasterAdmin && profile.role !== "admin") {
              profile.role = "admin";
              await createUserProfile(firebaseUser.uid, profile); 
            }
            onLogin(profile, await firebaseUser.getIdToken());
          } else {
            const userData: User = {
              id: Date.now(),
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || (isMasterAdmin ? "Admin" : "User"),
              email: firebaseUser.email || "",
              role: isMasterAdmin ? "admin" : "patient"
            };
            await createUserProfile(firebaseUser.uid, userData);
            onLogin(userData, await firebaseUser.getIdToken());
          }
        } catch (err: any) {
          // AUTO-CREATE ADMIN: If login fails because user doesn't exist AND it's the admin email
          const isMasterAdmin = isEmailAdmin(email);
          const isUserNotFound = err.code === "auth/user-not-found" || err.code === "auth/invalid-credential" || err.code === "auth/operation-not-allowed";
          
          if (isUserNotFound && isMasterAdmin && password === "admin@123") {
            try {
              console.log("Auto-creating admin account...");
              const userCredential = await createUserWithEmailAndPassword(auth, email, password);
              const firebaseUser = userCredential.user;
              await updateProfile(firebaseUser, { displayName: "Admin" });
              
              const userData: User = {
                id: Date.now(),
                uid: firebaseUser.uid,
                name: "Admin",
                email: email,
                role: "admin"
              };
              await createUserProfile(firebaseUser.uid, userData);
              onLogin(userData, await firebaseUser.getIdToken());
              return;
            } catch (createErr: any) {
              console.error("Auto-create failed:", createErr);
              if (createErr.code === "auth/email-already-in-use") {
                throw err; 
              }
              throw createErr;
            }
          }
          throw err;
        }
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      let msg = (
        <div className="space-y-2">
          <p className="font-bold">Authentication Failed</p>
          <p className="text-xs opacity-90">Something went wrong. Please check the details below:</p>
        </div>
      );

      const isMasterAdmin = isEmailAdmin(email);
      const isOperationNotAllowed = err.code === "auth/operation-not-allowed";
      const isInvalidCredential = err.code === "auth/invalid-credential";
      const isUserNotFound = err.code === "auth/user-not-found";
      const isWrongPassword = err.code === "auth/wrong-password";
      
      if (isUserNotFound || isWrongPassword || isInvalidCredential || isOperationNotAllowed) {
        msg = (
          <div className="space-y-2">
            <p className="font-bold">{isMasterAdmin ? "Admin Access Error" : "Authentication Error"}</p>
            <div className="text-xs opacity-90 space-y-2">
              {(isOperationNotAllowed || isInvalidCredential) && (
                <div className="p-4 bg-amber-500/20 border border-amber-500/30 rounded-2xl text-amber-200 shadow-lg">
                  <p className="font-bold mb-2 flex items-center gap-2 text-sm">
                    <AlertCircle className="w-5 h-5 text-amber-400" />
                    Action Required: Enable Email/Password
                  </p>
                  <p className="mb-3 leading-relaxed">The error <code>{err.code}</code> usually indicates that <strong>Email/Password Sign-In</strong> is not enabled in your Firebase project.</p>
                  <ol className="list-decimal ml-5 mt-2 space-y-2 font-medium">
                    <li>Go to the <a href={`https://console.firebase.google.com/project/${auth.app.options.projectId}/authentication/providers`} target="_blank" rel="noopener noreferrer" className="underline decoration-amber-500/50 hover:text-white transition-colors">Firebase Console Sign-In Providers</a>.</li>
                    <li>Click <b>"Add new provider"</b> and select <b>Email/Password</b>.</li>
                    <li>Toggle <b>"Enable"</b> and click <b>Save</b>.</li>
                    <li>Wait 30 seconds and try again.</li>
                  </ol>
                  <div className="mt-4 pt-3 border-t border-amber-500/20 text-[10px] opacity-80 italic">
                    <p>Current Project ID: <code className="bg-black/20 px-1 rounded">{auth.app.options.projectId}</code></p>
                  </div>
                </div>
              )}
              <p className="pt-2">
                {isMasterAdmin 
                  ? "The admin password might be incorrect, or the account hasn't been created yet. If you are the owner, try 'Continue with Google' to bypass this." 
                  : "Invalid credentials. If you don't have an account, please click \"Register Now\" below."}
              </p>
            </div>
          </div>
        );
      } else if (err.code === "auth/email-already-in-use") {
        msg = (
          <div className="space-y-2">
            <p className="font-bold">Email Already Registered</p>
            <p className="text-xs opacity-90">This email is already in use. If this is your account, please click <strong>"Sign In"</strong> below instead of registering.</p>
          </div>
        );
      } else {
        msg = <p>Error: {err.message || err.code}</p>;
      }
      setError(msg as any);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const firebaseUser = userCredential.user;

      const profile = await getUserProfile(firebaseUser.uid) as User;
      const isMasterAdmin = isEmailAdmin(firebaseUser.email);
      
      if (profile) {
        // Force admin role for master emails and update DB if needed
        if (isMasterAdmin && profile.role !== "admin") {
          profile.role = "admin";
          await createUserProfile(firebaseUser.uid, profile); 
        }
        onLogin(profile, await firebaseUser.getIdToken());
      } else {
        const userData: User = {
          id: Date.now(),
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || (isMasterAdmin ? "Admin" : "User"),
          email: firebaseUser.email || "",
          role: isMasterAdmin ? "admin" : "patient"
        };
        await createUserProfile(firebaseUser.uid, userData);
        onLogin(userData, await firebaseUser.getIdToken());
      }
    } catch (err: any) {
      console.error("Google Auth error:", err);
      setError(`Google Sign-In failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }
    setLoading(true);
    setError("");
    setResetSuccess("");
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSuccess("Password reset email sent! Please check your inbox.");
    } catch (err: any) {
      console.error("Reset error:", err);
      setError(`Failed to send reset email: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[var(--bg-primary)]">
      {/* Theme Toggle */}
      <div className="absolute top-8 right-8 z-50">
        <button 
          onClick={toggleTheme}
          className="p-2 glass rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-white/10 transition-all shadow-xl"
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      {/* Background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-500/10 blur-[120px] rounded-full"></div>

      <div className="flex w-full max-w-5xl bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] rounded-[32px] overflow-hidden shadow-2xl relative z-10">
        {/* Left Side - Image */}
        <div className="hidden lg:block w-1/2 relative">
          <img 
            src="https://picsum.photos/seed/eye-scan/800/1200?blur=1" 
            alt="Eye Diagnosis Machine" 
            className="w-full h-full object-cover opacity-60 grayscale hover:grayscale-0 transition-all duration-1000"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-primary)]/80 to-transparent"></div>
          <div className="absolute bottom-12 left-12 right-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <h2 className="text-4xl font-black text-[var(--text-primary)] mb-4 leading-tight">Precision Vision <br/><span className="text-cyan-400">Powered by AI</span></h2>
              <p className="text-[var(--text-secondary)] text-lg">The next generation of optical ERP and automated eye diagnosis systems.</p>
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
                {isForgotPassword ? "Reset Password" : (isRegistering ? "Create Account" : "AI Based Eye Power Detection")}
              </h1>
              <p className="text-slate-400">
                {isForgotPassword ? "Enter your email to receive a reset link" : (isRegistering ? "Join our eye care platform" : "Optical Shop & Eye Diagnosis ERP")}
              </p>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-sm mb-6 flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 flex-shrink-0" />
                <div className="flex-1">{error}</div>
              </div>
            )}

            {resetSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-sm mb-6 flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 flex-shrink-0" />
                <div className="flex-1">{resetSuccess}</div>
              </div>
            )}

            {isForgotPassword ? (
              <form onSubmit={handleForgotPassword} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-widest text-slate-500 ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all text-[var(--text-primary)]"
                      placeholder="name@company.com"
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full gradient-bg py-4 rounded-2xl font-bold flex items-center justify-center gap-2 group hover:shadow-lg hover:shadow-cyan-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      Send Reset Link
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

                <div className="text-center">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setError("");
                      setResetSuccess("");
                    }}
                    className="text-cyan-400 font-semibold hover:underline text-sm"
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="space-y-6">
              <button 
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white text-slate-900 rounded-2xl font-bold hover:bg-slate-100 transition-all disabled:opacity-50 mb-4"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                Continue with Google
              </button>

              <div className="relative flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-white/10"></div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Or with Email</span>
                <div className="flex-1 h-px bg-white/10"></div>
              </div>

              {!isRegistering && (
                <div className="flex gap-2 mb-4">
                  <button 
                    type="button"
                    onClick={() => { setEmail("admin@eyepower.ai"); setPassword("admin@123"); }}
                    className="flex-1 py-2 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-cyan-500/10 hover:text-cyan-400 transition-all"
                  >
                    Admin
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setEmail("patient@eyepower.ai"); setPassword("Patient@123"); }}
                    className="flex-1 py-2 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-500/10 hover:text-emerald-400 transition-all"
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
                      className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all text-[var(--text-primary)]"
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
                    className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all text-[var(--text-primary)]"
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
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl py-4 pl-12 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all text-[var(--text-primary)]"
                    placeholder="••••••••"
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-400 transition-colors"
                  >
                    {showPassword ? <Eye className="w-5 h-5 opacity-50" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {isRegistering && (
                  <div className="mt-2 px-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Strength: {strengthInfo.label}</span>
                      <span className="text-[10px] font-bold text-slate-500">{strength}/5</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden flex gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div 
                          key={i}
                          className={`h-full flex-1 transition-all duration-500 ${i <= strength ? strengthInfo.color : "bg-white/5"}`}
                        />
                      ))}
                    </div>
                    <p className="text-[9px] text-slate-500 mt-2 leading-relaxed">
                      Must include 8+ chars, uppercase, lowercase, number, and symbol.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-400">
                  <input type="checkbox" className="rounded border-white/10 bg-white/5 text-cyan-500" />
                  Remember me
                </label>
                <button 
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(true);
                    setError("");
                    setResetSuccess("");
                  }}
                  className="text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              <button 
                type="submit" 
                disabled={loading || (isRegistering && !isPasswordValid)}
                className="w-full gradient-bg py-4 rounded-2xl font-bold flex items-center justify-center gap-2 group hover:shadow-lg hover:shadow-cyan-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
          </>
        )}
      </motion.div>
    </div>
  </div>
</div>
);
}
