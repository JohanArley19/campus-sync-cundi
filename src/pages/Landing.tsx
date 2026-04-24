import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import InteractiveDemo from "@/components/landing/InteractiveDemo";
import {
  GraduationCap,
  ArrowRight,
  BookOpen,
  ListChecks,
  Sparkles,
  BarChart3,
  ShieldCheck,
  Cloud,
} from "lucide-react";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Autenticación segura",
    body: "Registro, inicio de sesión y recuperación de contraseña con tokens de expiración para proteger tus datos.",
  },
  {
    icon: BookOpen,
    title: "Gestión de materias",
    body: "Organiza tus materias del semestre con código, color y un panel claro de seguimiento.",
  },
  {
    icon: ListChecks,
    title: "Actividades con estados",
    body: "Registra tareas, parciales y trabajos. Marca cada una como pendiente, realizada o no realizada.",
  },
  {
    icon: Sparkles,
    title: "Priorización inteligente",
    body: "Un modelo de IA analiza tu carga, fechas e historial y sugiere automáticamente qué hacer primero.",
  },
  {
    icon: BarChart3,
    title: "Dashboard interactivo",
    body: "Métricas y gráficos que muestran tu rendimiento y te ayudan a tomar mejores decisiones.",
  },
  {
    icon: Cloud,
    title: "Disponible en la nube",
    body: "Acceso remoto desde cualquier dispositivo, con la confiabilidad de un entorno escalable.",
  },
];




export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="CampusSync — Universidad de Cundinamarca"
        description="CampusSync: sistema web inteligente para la gestión y priorización de actividades académicas. Optimiza tu tiempo, reduce la procrastinación y mejora tu rendimiento."
      />

      {/* Nav */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg gradient-hero flex items-center justify-center shadow-emerald">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-display text-sm font-bold text-foreground">CampusSync</span>
              <span className="font-body text-[10px] text-muted-foreground">U. Cundinamarca</span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="font-body">Iniciar sesión</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="font-body shadow-sm">
                Crear cuenta
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="mx-auto max-w-4xl text-center space-y-6 animate-fade-in">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent-soft px-3 py-1 text-xs font-body font-medium text-accent-foreground">
            <Sparkles className="h-3 w-3" />
            Powered by Inteligencia Artificial
          </span>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-[1.05] text-balance">
            Organiza tu vida académica.
            <br />
            <span className="text-primary">Mejora tu rendimiento.</span>
          </h1>
          <p className="mx-auto max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed text-balance">
            Sistema web inteligente para estudiantes universitarios. Gestiona materias y actividades,
            recibe sugerencias de prioridad por IA y visualiza tu progreso en un dashboard claro.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link to="/signup">
              <Button size="lg" className="font-body shadow-emerald w-full sm:w-auto">
                Comenzar gratis
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="font-body w-full sm:w-auto">
                Ya tengo cuenta
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16 bg-secondary/40 border-y border-border">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12 max-w-2xl mx-auto">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
              Todo lo que necesitas en un solo lugar
            </h2>
            <p className="mt-3 text-muted-foreground">
              Funcionalidades pensadas para reducir la procrastinación y apoyar tu autorregulación.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-md"
                >
                  <div className="h-10 w-10 rounded-lg bg-primary-soft flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-foreground mb-1.5">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Demo interactiva (reemplaza la lista de objetivos) */}
      <InteractiveDemo />

      {/* CTA */}
      <section className="px-6 py-20 bg-primary text-primary-foreground">
        <div className="mx-auto max-w-3xl text-center space-y-5">
          <h2 className="font-display text-3xl sm:text-4xl font-bold">
            ¿Listo para tomar el control de tu semestre?
          </h2>
          <p className="text-primary-foreground/85 text-lg">
            Crea tu cuenta gratis y empieza a organizar tus materias en menos de un minuto.
          </p>
          <Link to="/signup">
            <Button size="lg" variant="secondary" className="font-body shadow-lg">
              Comenzar ahora
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <p className="font-body">
            © {new Date().getFullYear()} Universidad de Cundinamarca — Extensión Facatativá
          </p>
          <p className="font-body text-xs">Ingeniería de Sistemas y Computación</p>
        </div>
      </footer>
    </div>
  );
}
