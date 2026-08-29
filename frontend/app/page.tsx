"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Zap,
  CheckCircle2,
  ArrowRight,
  Activity,
  Sparkles,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { login, register } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = loginSchema
  .extend({
    full_name: z.string().min(2, "Full name must be at least 2 characters"),
    confirmPassword: z.string().min(6, "Confirm password is required"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const { user, setToken, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { full_name: "", email: "", password: "", confirmPassword: "" },
  });

  // Auto redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/dashboard");
    }
  }, [authLoading, user, router]);

  const handleLogin = async (data: LoginForm) => {
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await login(data.email, data.password);
      await setToken(res.access_token);
      router.push("/dashboard");
    } catch (e: unknown) {
      setError((e as Error).message || "Failed to authenticate. Please check your credentials.");
    }
  };

  const handleRegister = async (data: RegisterForm) => {
    setError(null);
    setSuccessMsg(null);
    try {
      await register(data.email, data.password, data.full_name);
      setSuccessMsg("Account created! Signing you in...");
      const res = await login(data.email, data.password);
      await setToken(res.access_token);
      router.push("/dashboard");
    } catch (e: unknown) {
      setError((e as Error).message || "Registration failed. Username may already exist.");
    }
  };

  const handleDemoLogin = async () => {
    loginForm.setValue("email", "ops@sentinel.io");
    loginForm.setValue("password", "password123");
    setError(null);
    try {
      let res;
      try {
        res = await login("ops@sentinel.io", "password123");
      } catch {
        await register("ops@sentinel.io", "password123", "Lead SRE Engineer");
        res = await login("ops@sentinel.io", "password123");
      }
      await setToken(res.access_token);
      router.push("/dashboard");
    } catch (e: unknown) {
      setError((e as Error).message || "Demo login failed");
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 lg:p-8 overflow-hidden bg-[#0a0e1a]">
      {/* Dynamic Ambient Background Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-48 -left-48 w-[550px] h-[550px] bg-indigo-600/15 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-48 -right-48 w-[550px] h-[550px] bg-violet-600/15 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-cyan-600/5 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Side: Product Showcase & Value Props */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="hidden lg:flex lg:col-span-6 flex-col justify-center space-y-6 pr-4"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-semibold w-fit">
            <Sparkles size={13} className="text-indigo-400 animate-spin-slow" />
            Next-Gen Autonomous SRE Platform
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Incident Response, <br />
              <span className="gradient-text">Engineered for Velocity.</span>
            </h1>
            <p className="text-sm xl:text-base text-slate-400 leading-relaxed max-w-lg">
              SentinelOps unifies multi-agent LangGraph diagnostics, real-time cascading blast-radius mapping, and instant blameless post-mortems on Groq Cloud.
            </p>
          </div>

          {/* Highlights */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-400">
                  <Activity size={16} />
                </div>
                <span className="text-xs font-bold text-slate-200">Live Loss Ticker</span>
              </div>
              <p className="text-[11px] text-slate-400">Real-time revenue risk tracking calculated dynamically.</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400">
                  <Zap size={16} />
                </div>
                <span className="text-xs font-bold text-slate-200">Autonomous RCA</span>
              </div>
              <p className="text-[11px] text-slate-400">LangGraph agent root cause analysis with FAISS index.</p>
            </div>
          </div>

          {/* Social Proof */}
          <div className="flex items-center gap-3 pt-2 text-xs text-slate-400">
            <div className="flex -space-x-2">
              {["#6366f1", "#8b5cf6", "#06b6d4", "#10b981"].map((color, i) => (
                <div
                  key={i}
                  className="w-7 h-7 rounded-full border-2 border-[#0a0e1a] flex items-center justify-center font-bold text-[10px] text-white"
                  style={{ background: color }}
                >
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
            </div>
            <span>Trusted by Site Reliability & Platform teams</span>
          </div>
        </motion.div>

        {/* Right Side: Auth Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="lg:col-span-6 w-full max-w-md mx-auto"
        >
          {/* Mobile Brand Header */}
          <div className="lg:hidden text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3 animate-pulse-glow"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
              <Shield size={28} color="white" />
            </div>
            <h1 className="text-2xl font-bold gradient-text">SentinelOps</h1>
            <p className="text-xs text-slate-400 mt-0.5">AI-Powered Incident Intelligence</p>
          </div>

          <div
            className="rounded-2xl p-7 lg:p-8 backdrop-blur-xl border transition-all shadow-2xl"
            style={{
              background: "rgba(15, 22, 41, 0.85)",
              borderColor: "rgba(99, 102, 241, 0.25)",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(99, 102, 241, 0.1)",
            }}
          >
            {/* Header / Brand in desktop card */}
            <div className="hidden lg:flex items-center gap-3 mb-6 pb-4 border-b border-indigo-500/15">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg animate-pulse-glow"
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
              >
                <Shield size={20} color="white" />
              </div>
              <div>
                <h2 className="font-bold text-base text-white tracking-wide">SentinelOps</h2>
                <p className="text-[11px] text-slate-400">Enterprise Command Access</p>
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex rounded-xl p-1 mb-6 bg-[#0a0e1a]/80 border border-slate-800">
              {(["login", "register"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m);
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="flex-1 py-2 text-xs font-semibold capitalize rounded-lg transition-all relative"
                  style={{
                    color: mode === m ? "#ffffff" : "#94a3b8",
                  }}
                >
                  {mode === m && (
                    <motion.div
                      layoutId="active-tab"
                      className="absolute inset-0 rounded-lg"
                      style={{
                        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                        boxShadow: "0 2px 10px rgba(99, 102, 241, 0.4)",
                      }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{m === "login" ? "Sign In" : "Create Account"}</span>
                </button>
              ))}
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -6, height: 0 }}
                  className="flex items-start gap-2.5 p-3 rounded-xl mb-4 bg-red-500/10 border border-red-500/30 text-red-400 text-xs"
                >
                  <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                  <span className="flex-1">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success Message */}
            <AnimatePresence>
              {successMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -6, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -6, height: 0 }}
                  className="flex items-center gap-2.5 p-3 rounded-xl mb-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs"
                >
                  <CheckCircle2 size={15} className="flex-shrink-0" />
                  <span>{successMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <AnimatePresence mode="wait">
              {mode === "login" ? (
                <motion.form
                  key="login"
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 15 }}
                  onSubmit={loginForm.handleSubmit(handleLogin)}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Work Email
                    </label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        {...loginForm.register("email")}
                        type="email"
                        placeholder="sre@sentinel.io"
                        className="input-field pl-10"
                        autoComplete="email"
                      />
                    </div>
                    {loginForm.formState.errors.email && (
                      <p className="text-[11px] text-red-400 mt-1">
                        {loginForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                        Password
                      </label>
                    </div>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        {...loginForm.register("password")}
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="input-field pl-10 pr-10"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {loginForm.formState.errors.password && (
                      <p className="text-[11px] text-red-400 mt-1">
                        {loginForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loginForm.formState.isSubmitting}
                    className="btn-primary w-full justify-center py-3 text-sm mt-2 shadow-lg"
                  >
                    {loginForm.formState.isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Authenticating...
                      </>
                    ) : (
                      <>
                        Sign In to Command Center <ArrowRight size={15} />
                      </>
                    )}
                  </button>

                  {/* Demo Login Shortcut */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleDemoLogin}
                      className="w-full py-2.5 px-3 rounded-xl border border-indigo-500/25 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                    >
                      <Zap size={13} className="text-indigo-400" />
                      Quick 1-Click Demo Login (ops@sentinel.io)
                    </button>
                  </div>
                </motion.form>
              ) : (
                <motion.form
                  key="register"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  onSubmit={registerForm.handleSubmit(handleRegister)}
                  className="space-y-3.5"
                >
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <UserIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        {...registerForm.register("full_name")}
                        placeholder="Jane Doe"
                        className="input-field pl-10"
                        autoComplete="name"
                      />
                    </div>
                    {registerForm.formState.errors.full_name && (
                      <p className="text-[11px] text-red-400 mt-1">
                        {registerForm.formState.errors.full_name.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Work Email
                    </label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        {...registerForm.register("email")}
                        type="email"
                        placeholder="sre@sentinel.io"
                        className="input-field pl-10"
                        autoComplete="email"
                      />
                    </div>
                    {registerForm.formState.errors.email && (
                      <p className="text-[11px] text-red-400 mt-1">
                        {registerForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        {...registerForm.register("password")}
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="input-field pl-10 pr-10"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {registerForm.formState.errors.password && (
                      <p className="text-[11px] text-red-400 mt-1">
                        {registerForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        {...registerForm.register("confirmPassword")}
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="input-field pl-10 pr-10"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {registerForm.formState.errors.confirmPassword && (
                      <p className="text-[11px] text-red-400 mt-1">
                        {registerForm.formState.errors.confirmPassword.message}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={registerForm.formState.isSubmitting}
                    className="btn-primary w-full justify-center py-3 text-sm mt-2 shadow-lg"
                  >
                    {registerForm.formState.isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        Create Account & Enter <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LangGraph AI & Groq Active
              </span>
              <span>AES-256 / JWT Auth</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
