import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

export default function SignUpPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate("/guides");
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{ background: "radial-gradient(circle at top right, #e5eeff 0%, #f8f9ff 50%, #f1f5f9 100%)" }}>
      {/* Animated Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full animate-blob-move"
        style={{ background: "radial-gradient(circle, rgba(0,83,219,0.05) 0%, rgba(255,255,255,0) 70%)", filter: "blur(40px)", zIndex: -1 }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full animate-blob-move"
        style={{ background: "radial-gradient(circle, rgba(113,42,226,0.05) 0%, rgba(255,255,255,0) 70%)", filter: "blur(40px)", zIndex: -1, animationDelay: "-5s" }} />

      <main className="w-full max-w-[480px] z-10">
        <div className="glass-card rounded-xl p-8 md:p-10 flex flex-col items-center" style={{ boxShadow: "0 10px 40px -10px rgba(0,74,198,0.1)" }}>
          {/* Branding */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
              <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>auto_stories</span>
            </div>
            <h2 className="font-headline text-headline-md text-primary font-bold tracking-tight">ScholarStudy</h2>
          </div>

          {/* Headline */}
          <div className="text-center mb-8">
            <h1 className="font-headline text-headline-md text-on-surface mb-2">Start your journey to mastery</h1>
            <p className="font-body text-body-md text-on-surface-variant">Join thousands of scholars using AI to study smarter.</p>
          </div>

          {/* Form */}
          <form className="w-full space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="font-label text-label-md text-on-surface-variant block ml-1" htmlFor="name">Full Name</label>
              <input className="input-soft w-full px-4 py-3.5 rounded-lg font-body text-on-surface placeholder-outline-variant" id="name" placeholder="Alex Johnson" type="text" />
            </div>
            <div className="space-y-2">
              <label className="font-label text-label-md text-on-surface-variant block ml-1" htmlFor="email">Email Address</label>
              <input className="input-soft w-full px-4 py-3.5 rounded-lg font-body text-on-surface placeholder-outline-variant" id="email" placeholder="alex@university.edu" type="email" />
            </div>
            <div className="space-y-2">
              <label className="font-label text-label-md text-on-surface-variant block ml-1" htmlFor="password">Password</label>
              <div className="relative">
                <input
                  className="input-soft w-full px-4 py-3.5 rounded-lg font-body text-on-surface placeholder-outline-variant"
                  id="password"
                  placeholder="••••••••"
                  type={showPassword ? "text" : "password"}
                />
                <button
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <span className="material-symbols-outlined text-[20px]">{showPassword ? "visibility_off" : "visibility"}</span>
                </button>
              </div>
            </div>
            <button
              className="purple-gradient-btn w-full py-4 rounded-lg font-headline text-[18px] text-white font-bold mt-4"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating Account...
                </span>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="w-full flex items-center gap-4 my-8">
            <div className="h-[1px] flex-1 bg-outline-variant/30" />
            <span className="font-label text-label-sm text-outline uppercase tracking-widest">or</span>
            <div className="h-[1px] flex-1 bg-outline-variant/30" />
          </div>

          {/* Social Logins */}
          <div className="w-full grid grid-cols-1 gap-3">
            <button className="flex items-center justify-center gap-3 w-full py-3 px-4 border border-outline-variant rounded-lg bg-white/50 hover:bg-white transition-all duration-200">
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              <span className="font-body font-medium text-on-surface">Continue with Google</span>
            </button>
            <button className="flex items-center justify-center gap-3 w-full py-3 px-4 border border-outline-variant rounded-lg bg-white/50 hover:bg-white transition-all duration-200">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 23 23"><path d="M0 0H11V11H0V0Z" fill="#F25022"/><path d="M12 0H23V11H12V0Z" fill="#7FBA00"/><path d="M0 12H11V23H0V12Z" fill="#00A4EF"/><path d="M12 12H23V23H12V12Z" fill="#FFB900"/></svg>
              <span className="font-body font-medium text-on-surface">Continue with Microsoft</span>
            </button>
          </div>

          {/* Footer Link */}
          <div className="mt-10 text-center">
            <p className="font-body text-body-md text-on-surface-variant">
              Already have an account?{" "}
              <Link className="text-primary font-semibold hover:underline transition-all" to="/login">Sign in</Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 opacity-60">
          <p className="font-body text-body-sm text-on-surface-variant">© 2024 ScholarStudy. All rights reserved.</p>
          <div className="flex gap-4">
            <a className="font-body text-body-sm text-on-surface-variant hover:text-primary hover:underline" href="#">Terms of Service</a>
            <a className="font-body text-body-sm text-on-surface-variant hover:text-primary hover:underline" href="#">Privacy Policy</a>
          </div>
        </footer>
      </main>
    </div>
  );
}
