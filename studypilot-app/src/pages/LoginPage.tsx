import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { authService } from "../services/auth.service";

export default function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await authService.login(email, password);
      navigate("/guides");
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message || "Invalid email or password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-animate font-body text-on-surface min-h-screen flex flex-col selection:bg-primary-fixed">
      <main className="flex-grow flex items-center justify-center px-margin-mobile md:px-margin-desktop py-12 relative overflow-hidden">
        {/* Background Blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/5 blur-[120px]" />

        <div className="glass-card w-full max-w-[480px] rounded-[24px] p-8 md:p-12 shadow-2xl relative z-10">
          {/* Brand */}
          <div className="flex flex-col items-center mb-10 text-center">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
                <span className="material-symbols-outlined text-on-primary text-[24px]">school</span>
              </div>
              <span className="font-headline text-headline-md text-primary tracking-tight">ScholarStudy</span>
            </div>
            <h1 className="font-headline text-headline-lg text-on-surface mb-2">Welcome back, Scholar</h1>
            <p className="font-body text-body-md text-on-surface-variant">Continue your journey to mastery.</p>
          </div>

          {/* Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 text-red-600 p-3.5 rounded-xl text-body-sm font-medium border border-red-200/50">
                {error}
              </div>
            )}
            <div>
              <label className="block font-label text-label-md text-on-surface-variant mb-2 ml-1">Email Address</label>
              <input
                className="input-soft w-full px-4 py-3.5 rounded-xl border-none font-body text-on-surface placeholder:text-outline-variant"
                placeholder="scholar@study.ai"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2 ml-1">
                <label className="block font-label text-label-md text-on-surface-variant">Password</label>
                <a className="font-label text-label-sm text-primary hover:underline transition-all" href="#">Forgot password?</a>
              </div>
              <input
                className="input-soft w-full px-4 py-3.5 rounded-xl border-none font-body text-on-surface placeholder:text-outline-variant"
                placeholder="••••••••"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              className="gradient-btn w-full py-4 rounded-xl font-headline text-on-primary flex items-center justify-center gap-2 group text-lg"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
              ) : (
                <>
                  Sign In
                  <span className="material-symbols-outlined text-[20px] transition-transform group-hover:translate-x-1">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant/30" />
            </div>
            <div className="relative flex justify-center text-label-sm uppercase">
              <span className="bg-transparent px-4 text-on-surface-variant/60 font-medium font-label">or continue with</span>
            </div>
          </div>

          {/* Social Auth */}
          <div className="grid grid-cols-2 gap-4">
            <button className="flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-outline-variant/30 bg-white/40 hover:bg-white/60 transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              <span className="font-label text-label-md text-on-surface">Google</span>
            </button>
            <button className="flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-outline-variant/30 bg-white/40 hover:bg-white/60 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 23 23"><path d="M0 0H11V11H0V0Z" fill="#F25022"/><path d="M12 0H23V11H12V0Z" fill="#7FBA00"/><path d="M0 12H11V23H0V12Z" fill="#00A4EF"/><path d="M12 12H23V23H12V12Z" fill="#FFB900"/></svg>
              <span className="font-label text-label-md text-on-surface">Microsoft</span>
            </button>
          </div>

          {/* Footer Link */}
          <div className="mt-10 text-center">
            <p className="font-body text-body-sm text-on-surface-variant">
              Don't have an account?{" "}
              <Link className="text-primary font-semibold hover:underline decoration-2 underline-offset-4" to="/signup">Sign up</Link>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-transparent text-primary flex flex-col md:flex-row justify-between items-center px-margin-mobile md:px-margin-desktop py-unit w-full max-w-container-max mx-auto">
        <div className="text-headline-md font-headline font-bold text-primary mb-4 md:mb-0">ScholarStudy AI</div>
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 mb-4 md:mb-0">
          <a className="text-on-surface-variant hover:text-primary transition-colors text-body-sm" href="#">Privacy Policy</a>
          <a className="text-on-surface-variant hover:text-primary transition-colors text-body-sm" href="#">Terms of Service</a>
          <a className="text-on-surface-variant hover:text-primary transition-colors text-body-sm" href="#">Help Center</a>
        </div>
        <div className="text-body-sm text-on-surface-variant">© 2024 ScholarStudy AI. All rights reserved.</div>
      </footer>
    </div>
  );
}
