import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, ChevronRight, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/student")({
  head: () => ({
    meta: [
      { title: "O'quvchi paneli • Informatika 9" },
      { name: "description", content: "Ism, familiya va sinfingizni kiriting va testni boshlang." },
    ],
  }),
  component: StudentPage,
});

type Topic = { id: string; slug: string; title: string; description: string; order_num: number };

function StudentPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [klass, setKlass] = useState("");
  const [identified, setIdentified] = useState(false);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? sessionStorage.getItem("student") : null;
    if (saved) {
      const s = JSON.parse(saved);
      setName(s.name);
      setKlass(s.klass);
      setIdentified(true);
    }
  }, []);

  useEffect(() => {
    if (!identified) return;
    setLoading(true);
    supabase
      .from("topics")
      .select("*")
      .order("order_num")
      .then(({ data }) => {
        setTopics(data || []);
        setLoading(false);
      });
  }, [identified]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !klass.trim()) return;
    sessionStorage.setItem("student", JSON.stringify({ name: name.trim(), klass: klass.trim() }));
    setIdentified(true);
  };

  const logout = () => {
    sessionStorage.removeItem("student");
    setIdentified(false);
    setName("");
    setKlass("");
  };

  if (!identified) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="inline-grid h-16 w-16 place-items-center rounded-2xl text-primary-foreground mb-4" style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-glow)" }}>
              <GraduationCap className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-bold mb-2">O'quvchi paneli</h1>
            <p className="text-muted-foreground">Testni boshlash uchun ma'lumotlaringizni kiriting</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4 p-6 rounded-2xl bg-card border border-border" style={{ boxShadow: "var(--shadow-soft)" }}>
            <div>
              <label className="block text-sm font-medium mb-2">Ism va familiya</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Masalan: Ali Valiyev"
                className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Sinf</label>
              <input
                value={klass}
                onChange={(e) => setKlass(e.target.value)}
                required
                placeholder="Masalan: 9-A"
                className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
              style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-soft)" }}
            >
              Davom etish →
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Salom,</p>
            <h1 className="text-3xl font-bold">{name} <span className="text-primary">• {klass}</span></h1>
          </div>
          <button onClick={logout} className="text-sm text-muted-foreground hover:text-foreground underline">Chiqish</button>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <BookOpen className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold">1-bob mavzulari — testni ishlash uchun mavzu ustiga bosing</h2>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Yuklanmoqda...</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {topics.map((t) => (
              <button
                key={t.id}
                onClick={() => navigate({ to: "/student/quiz/$slug", params: { slug: t.slug } })}
                className="group text-left p-5 rounded-2xl bg-card border border-border hover:border-primary hover:shadow-lg transition-all"
                style={{ boxShadow: "var(--shadow-soft)" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold px-2 py-1 rounded-md text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
                        Mavzu {t.order_num}
                      </span>
                    </div>
                    <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">{t.title}</h3>
                    <p className="text-sm text-muted-foreground">{t.description}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}