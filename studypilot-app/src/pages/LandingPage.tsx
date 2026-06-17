import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";

function ShaderBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const syncSize = () => {
      const w = canvas.clientWidth || 1280;
      const h = canvas.clientHeight || 720;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };

    const ro = new ResizeObserver(syncSize);
    ro.observe(canvas);
    syncSize();

    const gl = (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return;

    const vs = `attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

    const fs = `precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    float t = u_time * 0.2;
    float noise = sin(uv.x * 3.0 + t) * 0.5 + 0.5;
    noise += sin(uv.y * 2.5 - t * 1.2) * 0.5 + 0.5;
    vec3 color1 = vec3(0.145, 0.388, 0.922);
    vec3 color2 = vec3(0.514, 0.235, 0.949);
    vec3 color3 = vec3(0.0, 0.835, 1.0);
    vec3 finalColor = mix(color1, color2, noise * 0.5 + uv.x * 0.5);
    finalColor = mix(finalColor, color3, sin(t + uv.y * 3.14) * 0.3 + 0.3);
    finalColor = mix(finalColor, vec3(1.0), 0.85);
    gl_FragColor = vec4(finalColor, 1.0);
}`;

    const createShader = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };

    const prog = gl.createProgram()!;
    gl.attachShader(prog, createShader(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, createShader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(prog, "a_position");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, "u_time");
    const uRes = gl.getUniformLocation(prog, "u_resolution");

    let animId: number;
    const render = (t: number) => {
      syncSize();
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (uTime) gl.uniform1f(uTime, t * 0.001);
      if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animId = requestAnimationFrame(render);
    };
    render(0);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full -z-10" style={{ display: "block" }} />;
}

function RevealOnScroll({ children, className = "", delay = "" }: { children: React.ReactNode; className?: string; delay?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("active");
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reveal ${className}`} style={delay ? { transitionDelay: delay } : undefined}>
      {children}
    </div>
  );
}

const features = [
  { icon: "auto_stories", title: "Smart Summaries", desc: "Convert long lectures and textbooks into concise, structured notes in seconds.", color: "primary" },
  { icon: "quiz", title: "AI Quiz Generator", desc: "Instant quizzes based on your specific study materials with detailed feedback.", color: "secondary" },
  { icon: "style", title: "Flashcard Generator", desc: "Automatically create active recall cards from key concepts identified in your text.", color: "tertiary" },
  { icon: "calendar_month", title: "Study Planner", desc: "Personalized schedules that adapt to your exam dates and learning pace.", color: "primary" },
  { icon: "insights", title: "Exam Readiness", desc: "Advanced analytics predict your exam performance and highlight weak spots.", color: "secondary" },
  { icon: "forum", title: "AI Doubt Solver", desc: "Chat with your documents. Ask questions and get context-aware answers instantly.", color: "tertiary" },
];

const steps = [
  { num: 1, title: "Upload Content", desc: "Drop PDFs, MP4s, or links to YouTube videos." },
  { num: 2, title: "AI Processing", desc: "Our LLMs extract core concepts and key insights." },
  { num: 3, title: "Interactive Study", desc: "Engage with flashcards, quizzes, and summaries." },
  { num: 4, title: "Ace Your Exams", desc: "Master your material with focused efficiency." },
];

const testimonials = [
  { name: "Sarah Jenkins", role: "Medical Student", quote: "I used to spend 5 hours a day just organizing my notes. Now it's done for me in seconds.", color: "primary-container" },
  { name: "Michael Chen", role: "CS Major", quote: "The flashcard generation is a game changer. It identifies exactly what I don't know.", color: "secondary-container" },
  { name: "Alex Rivera", role: "Law Student", quote: "Finally an AI that actually understands context instead of just guessing.", color: "tertiary-container" },
];

const faqs = [
  { q: "What kind of files can I upload?", a: "We support PDFs, Word docs, PowerPoint presentations, and MP4 video files. You can also paste direct links to YouTube educational videos." },
  { q: "Is my data private?", a: "Yes, we take privacy seriously. Your uploaded materials are used only to generate your personal study guides and are never used to train global AI models." },
  { q: "Can I export my flashcards?", a: "Absolutely! You can export your flashcards directly to Anki, Quizlet, or as a structured PDF/CSV file for offline study." },
];

export default function LandingPage() {
  return (
    <div className="bg-background text-on-surface font-body antialiased overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-surface/80 backdrop-blur-xl border-b border-white/20 shadow-sm shadow-primary/5">
        <div className="flex justify-between items-center h-20 px-8 max-w-container mx-auto">
          <div className="font-headline text-headline-md font-bold text-primary">StudyPilot AI</div>
          <div className="hidden md:flex gap-8 items-center">
            <a className="font-body text-on-surface-variant hover:text-primary transition-colors" href="#features">Features</a>
            <a className="font-body text-on-surface-variant hover:text-primary transition-colors" href="#how-it-works">How It Works</a>
            <a className="font-body text-on-surface-variant hover:text-primary transition-colors" href="#pricing">Pricing</a>
            <a className="font-body text-on-surface-variant hover:text-primary transition-colors" href="#faq">FAQ</a>
          </div>
          <div className="flex gap-6 items-center">
            <Link to="/login" className="font-body text-on-surface-variant hover:text-primary transition-colors">Login</Link>
            <Link to="/signup" className="bg-primary-container text-on-primary-container px-6 py-3 rounded-xl font-semibold active:scale-95 transition-transform">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen pt-20 flex items-center overflow-hidden">
        <ShaderBackground />
        <div className="max-w-container mx-auto px-8 w-full py-section-padding grid lg:grid-cols-2 gap-16 items-center">
          <div className="text-left">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary font-label text-label-caps mb-6 uppercase">AI-Powered Learning</span>
            <h1 className="font-headline text-display-xl mb-6 text-on-surface">
              Turn Any Study Material Into Your Personal <span className="text-primary">AI Tutor</span>
            </h1>
            <p className="font-body text-body-lg text-on-surface-variant mb-12 max-w-xl">
              Upload PDFs, lecture notes, or YouTube videos and instantly generate summaries, flashcards, quizzes, study plans, AI tutoring, and exam predictions.
            </p>
            <div className="flex flex-wrap gap-6">
              <Link to="/signup" className="bg-primary-container text-on-primary-container px-8 py-4 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95">
                Start Learning Free
              </Link>
              <button className="glass-card px-8 py-4 rounded-xl font-bold text-lg text-on-surface hover:bg-white/30 transition-all flex items-center gap-2">
                <span className="material-symbols-outlined">play_circle</span> Watch Demo
              </button>
            </div>
          </div>
          <div className="relative">
            <div className="glass-card p-4 rounded-2xl relative z-10 ambient-shadow">
              <div className="rounded-xl w-full bg-gradient-to-br from-surface-container-high to-surface-container aspect-video flex items-center justify-center">
                <div className="text-center opacity-60">
                  <span className="material-symbols-outlined text-6xl text-primary/40 mb-2">dashboard</span>
                  <p className="text-sm text-on-surface-variant">Dashboard Preview</p>
                </div>
              </div>
              {/* Floating elements */}
              <div className="absolute -top-10 -right-10 glass-card p-4 rounded-xl animate-float w-48 shadow-2xl">
                <div className="flex items-center gap-3 mb-2">
                  <span className="material-symbols-outlined text-secondary">psychology</span>
                  <span className="font-semibold text-sm">AI Prediction</span>
                </div>
                <div className="h-2 w-full bg-surface-variant rounded-full">
                  <div className="h-2 w-[92%] bg-secondary rounded-full" />
                </div>
                <p className="text-[10px] mt-2 text-on-surface-variant">92% Exam Readiness</p>
              </div>
              <div className="absolute -bottom-6 -left-10 glass-card p-4 rounded-xl animate-float shadow-2xl" style={{ animationDelay: "-3s" }}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs font-medium">New Quiz Generated!</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="bg-surface-container-low py-12 relative z-20">
        <div className="max-w-container mx-auto px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center text-center">
            <div>
              <div className="text-headline-md font-bold text-primary font-headline">10,000+</div>
              <div className="text-on-surface-variant font-label text-label-caps uppercase">Guides Created</div>
            </div>
            <div>
              <div className="text-headline-md font-bold text-primary font-headline">50,000+</div>
              <div className="text-on-surface-variant font-label text-label-caps uppercase">Flashcards</div>
            </div>
            <div>
              <div className="text-headline-md font-bold text-primary font-headline">95%</div>
              <div className="text-on-surface-variant font-label text-label-caps uppercase">Satisfaction</div>
            </div>
            <div>
              <div className="text-headline-md font-bold text-primary font-headline">24/7</div>
              <div className="text-on-surface-variant font-label text-label-caps uppercase">AI Tutor</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-section-padding bg-surface" id="features">
        <div className="max-w-container mx-auto px-8">
          <RevealOnScroll className="text-center mb-12 max-w-2xl mx-auto">
            <h2 className="font-headline text-display-lg mb-4">Everything You Need to Excel</h2>
            <p className="text-on-surface-variant text-body-lg">Stop studying harder. Start studying smarter with AI-driven tools designed for high performance.</p>
          </RevealOnScroll>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <RevealOnScroll key={f.title} delay={`${i * 100}ms`}>
                <div className="glass-card p-8 rounded-2xl hover:scale-[1.02] transition-transform duration-300 h-full">
                  <div className={`w-12 h-12 rounded-xl bg-${f.color}/10 flex items-center justify-center text-${f.color} mb-6`}>
                    <span className="material-symbols-outlined text-3xl">{f.icon}</span>
                  </div>
                  <h3 className="text-headline-md font-bold mb-4 font-headline">{f.title}</h3>
                  <p className="text-on-surface-variant">{f.desc}</p>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-section-padding bg-surface relative overflow-hidden" id="how-it-works">
        <div className="max-w-container mx-auto px-8">
          <RevealOnScroll>
            <h2 className="font-headline text-display-lg text-center mb-16">Four Steps to Mastery</h2>
          </RevealOnScroll>
          <div className="grid md:grid-cols-4 gap-8 relative">
            <div className="hidden md:block absolute top-8 left-0 w-full h-[2px] bg-outline-variant/30 -z-10" />
            {steps.map((s, i) => (
              <RevealOnScroll key={s.num} className="text-center" delay={`${i * 100}ms`}>
                <div className="w-16 h-16 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-xl mx-auto mb-6">{s.num}</div>
                <h4 className="font-bold mb-2 font-headline">{s.title}</h4>
                <p className="text-sm text-on-surface-variant">{s.desc}</p>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-section-padding bg-surface-container-high" id="pricing">
        <div className="max-w-container mx-auto px-8">
          <RevealOnScroll>
            <h2 className="font-headline text-display-lg text-center mb-16">Why StudyPilot?</h2>
          </RevealOnScroll>
          <div className="overflow-x-auto">
            <table className="w-full glass-card rounded-2xl overflow-hidden text-left border-collapse">
              <thead>
                <tr className="bg-primary/5">
                  <th className="p-6 font-bold">Feature</th>
                  <th className="p-6 font-bold text-primary">StudyPilot AI</th>
                  <th className="p-6 font-bold text-on-surface-variant/60">Traditional Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                <tr><td className="p-6">Setup Time</td><td className="p-6 text-primary font-semibold">Seconds (Auto-gen)</td><td className="p-6">Hours (Manual)</td></tr>
                <tr><td className="p-6">Retention Rate</td><td className="p-6 text-primary font-semibold">85% (Active Recall)</td><td className="p-6">30% (Passive Reading)</td></tr>
                <tr><td className="p-6">Availability</td><td className="p-6 text-primary font-semibold">24/7 AI Tutor</td><td className="p-6">Limited to office hours</td></tr>
                <tr><td className="p-6">Personalization</td><td className="p-6 text-primary font-semibold">Adaptive Learning</td><td className="p-6">One-size-fits-all</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-section-padding bg-surface">
        <div className="max-w-container mx-auto px-8">
          <RevealOnScroll>
            <h2 className="font-headline text-display-lg text-center mb-16">Loved by Students</h2>
          </RevealOnScroll>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <RevealOnScroll key={t.name} delay={`${i * 100}ms`}>
                <div className="glass-card p-8 rounded-2xl h-full flex flex-col">
                  <div className="flex text-yellow-500 mb-4">
                    {[...Array(5)].map((_, j) => (
                      <span key={j} className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    ))}
                  </div>
                  <p className="italic text-on-surface-variant mb-6 flex-1">"{t.quote}"</p>
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full bg-${t.color} flex items-center justify-center text-sm font-bold text-white`}>
                      {t.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <p className="font-bold">{t.name}</p>
                      <p className="text-xs text-on-surface-variant">{t.role}</p>
                    </div>
                  </div>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* AI Tech Section */}
      <section className="py-section-padding bg-inverse-surface text-inverse-on-surface relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-primary/10 blur-[120px] rounded-full" />
        <div className="max-w-container mx-auto px-8 relative z-10 grid lg:grid-cols-2 gap-16 items-center">
          <RevealOnScroll>
            <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 text-primary-fixed-dim font-label text-label-caps mb-6 uppercase">The Tech Stack</span>
            <h2 className="font-headline text-display-lg mb-6">Built on the World's Fastest AI</h2>
            <p className="text-body-lg mb-8 opacity-80">Leveraging Groq LLM acceleration and proprietary Retrieval-Augmented Generation (RAG) technology to provide instant, accurate study assistance with zero hallucinations.</p>
            <ul className="space-y-4">
              <li className="flex items-center gap-3"><span className="material-symbols-outlined text-primary-fixed-dim">bolt</span><span>Groq Inference: &lt; 100ms response time</span></li>
              <li className="flex items-center gap-3"><span className="material-symbols-outlined text-primary-fixed-dim">verified_user</span><span>Private & Secure RAG Architecture</span></li>
              <li className="flex items-center gap-3"><span className="material-symbols-outlined text-primary-fixed-dim">account_tree</span><span>Multi-modal input support (Video/Audio/PDF)</span></li>
            </ul>
          </RevealOnScroll>
          <RevealOnScroll>
            <div className="glass-card p-8 rounded-3xl border-white/10" style={{ background: "rgba(255,255,255,0.05)" }}>
              <div className="h-64 flex items-center justify-center">
                <span className="material-symbols-outlined text-[120px] opacity-20 animate-pulse">hub</span>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-section-padding bg-surface" id="faq">
        <div className="max-w-3xl mx-auto px-8">
          <RevealOnScroll>
            <h2 className="font-headline text-display-lg text-center mb-16">Frequently Asked Questions</h2>
          </RevealOnScroll>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <RevealOnScroll key={faq.q}>
                <details className="glass-card rounded-xl p-6 group">
                  <summary className="flex justify-between items-center cursor-pointer font-bold text-lg list-none">
                    {faq.q}
                    <span className="material-symbols-outlined transition-transform group-open:rotate-180">expand_more</span>
                  </summary>
                  <p className="mt-4 text-on-surface-variant">{faq.a}</p>
                </details>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-section-padding relative overflow-hidden bg-primary text-on-primary">
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-secondary/40 to-primary" />
        <div className="max-w-container mx-auto px-8 relative z-10 text-center">
          <h2 className="font-headline text-display-xl mb-6">Start Studying Smarter Today</h2>
          <p className="text-body-lg mb-12 opacity-90 max-w-2xl mx-auto">Join over 50,000 students who have transformed their learning habits with StudyPilot AI.</p>
          <div className="flex flex-wrap justify-center gap-6">
            <Link to="/signup" className="bg-white text-primary px-10 py-5 rounded-2xl font-extrabold text-xl hover:scale-105 transition-transform">
              Get Started Free
            </Link>
            <button className="bg-primary-container/20 border border-white/30 backdrop-blur px-10 py-5 rounded-2xl font-bold text-xl hover:bg-white/10 transition-colors">
              Compare Plans
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface-container-lowest py-12 border-t border-outline-variant">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 px-8 max-w-container mx-auto">
          <div className="col-span-2">
            <div className="font-headline text-headline-md font-bold text-on-surface mb-4">StudyPilot AI</div>
            <p className="text-on-surface-variant text-sm mb-6">Your AI-powered academic companion.</p>
          </div>
          <div>
            <h5 className="font-bold mb-4">Product</h5>
            <ul className="space-y-2 text-sm text-on-surface-variant">
              <li><a className="hover:text-primary" href="#features">Features</a></li>
              <li><a className="hover:text-primary" href="#pricing">Pricing</a></li>
              <li><a className="hover:text-primary" href="#">Roadmap</a></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold mb-4">Resources</h5>
            <ul className="space-y-2 text-sm text-on-surface-variant">
              <li><a className="hover:text-primary" href="#">Blog</a></li>
              <li><a className="hover:text-primary" href="#">Help Center</a></li>
              <li><a className="hover:text-primary" href="#">Guides</a></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold mb-4">Legal</h5>
            <ul className="space-y-2 text-sm text-on-surface-variant">
              <li><a className="hover:text-primary" href="#">Privacy Policy</a></li>
              <li><a className="hover:text-primary" href="#">Terms</a></li>
              <li><a className="hover:text-primary" href="#">Security</a></li>
            </ul>
          </div>
          <div className="col-span-2 md:col-span-1">
            <p className="text-xs text-on-surface-variant mt-8">© 2024 StudyPilot AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
