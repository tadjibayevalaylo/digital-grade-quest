import { Link } from "@tanstack/react-router";
import { GraduationCap, Home, Users } from "lucide-react";

export function Header() {
  const linkBase =
    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:bg-primary/10";
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <div className="grid h-9 w-9 place-items-center rounded-xl text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="hidden sm:inline">Informatika 9 • 1-bob</span>
          <span className="sm:hidden">Inf 9</span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link to="/" className={linkBase} activeOptions={{ exact: true }} activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary" }}>
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Bosh sahifa</span>
          </Link>
          <Link to="/teacher" className={linkBase} activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary" }}>
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">O'qituvchi</span>
          </Link>
          <Link to="/student" className={linkBase} activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary" }}>
            <GraduationCap className="h-4 w-4" />
            <span className="hidden sm:inline">O'quvchi</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}