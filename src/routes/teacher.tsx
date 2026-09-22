import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import type { Session } from "@supabase/supabase-js";
import { LogOut, Users, Clock, Trophy, TrendingUp, BookOpen, Settings2, BarChart3 } from "lucide-react";
import { ContentManager } from "@/components/manage/ContentManager";

export const Route = createFileRoute("/teacher")({
  head: () => ({
    meta: [
      { title: "O'qituvchi paneli • Informatika 9" },
      { name: "description", content: "O'quvchilar natijalari va statistikasi." },
    ],
  }),
  component: TeacherPage,
});

type Row = {
  id: string;
  student_name: string;
  student_class: string;
  finished_at: string | null;
  correct_count: number;
  total_questions: number;
  duration_seconds: number | null;
  topic_id: string;
  created_at: string;
};

type Topic = { id: string; title: string; order_num: number };

function TeacherPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [topics, setTopics] = useState<Map<string, Topic>>(new Map());
  const [filterTopic, setFilterTopic] = useState<string>("all");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const [{ data: rdata }, { data: tdata }] = await Promise.all([
        supabase.from("student_sessions").select("*").not("finished_at", "is", null).order("finished_at", { ascending: false }),
        supabase.from("topics").select("id, title, order_num").order("order_num"),
      ]);
      setRows((rdata || []) as Row[]);
      const m = new Map<string, Topic>();
      (tdata || []).forEach((t) => m.set(t.id, t as Topic));
      setTopics(m);
    })();
  }, [session]);

  const signIn = async () => {
    setSigningIn(true);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/teacher" });
    if (r.error) {
      setSigningIn(false);
      alert("Kirishda xato: " + r.error.message);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) return <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">Yuklanmoqda...</div>;

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <div className="inline-grid h-16 w-16 place-items-center rounded-2xl text-primary-foreground mb-4" style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-glow)" }}>
            <Users className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold mb-2">O'qituvchi paneli</h1>
          <p className="text-muted-foreground mb-8">O'quvchilar natijasini ko'rish uchun Google akkauntingiz orqali tizimga kiring.</p>

          <div className="p-6 rounded-2xl bg-card border border-border" style={{ boxShadow: "var(--shadow-soft)" }}>
            <button
              onClick={signIn}
              disabled={signingIn}
              className="w-full py-3 rounded-xl font-semibold bg-foreground text-background hover:opacity-90 inline-flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24"><path fill="#fff" d="M21.35 11.1h-9.17v2.92h5.27c-.23 1.4-1.65 4.1-5.27 4.1-3.17 0-5.76-2.62-5.76-5.85s2.59-5.85 5.76-5.85c1.8 0 3.01.77 3.7 1.43l2.53-2.43C16.86 3.92 14.7 3 12.18 3 6.99 3 2.78 7.21 2.78 12.4s4.21 9.4 9.4 9.4c5.43 0 9.02-3.81 9.02-9.18 0-.62-.07-1.09-.15-1.52z"/></svg>
              {signingIn ? "Yo'naltirilmoqda..." : "Google bilan kirish"}
            </button>
            <p className="text-xs text-muted-foreground mt-4">Ro'yxatdan o'tish Google akkaunti orqali avtomatik amalga oshadi.</p>
          </div>
        </div>
      </div>
    );
  }

  const filtered = filterTopic === "all" ? rows : rows.filter((r) => r.topic_id === filterTopic);
  const totalAttempts = filtered.length;
  const avgScore = totalAttempts > 0 ? Math.round(filtered.reduce((a, r) => a + (r.correct_count / Math.max(1, r.total_questions)) * 100, 0) / totalAttempts) : 0;
  const avgTime = totalAttempts > 0 ? Math.round(filtered.reduce((a, r) => a + (r.duration_seconds || 0), 0) / totalAttempts) : 0;
  const uniqueStudents = new Set(filtered.map((r) => `${r.student_name}::${r.student_class}`)).size;

  const fmtDate = (s: string | null) =>
    s ? new Date(s).toLocaleString("uz-UZ", { dateStyle: "short", timeStyle: "short" }) : "—";
  const fmtDur = (s: number | null) => {
    if (!s) return "—";
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{session.user.email}</p>
          <h1 className="text-3xl font-bold">O'qituvchi paneli</h1>
        </div>
        <button onClick={signOut} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border hover:bg-secondary text-sm">
          <LogOut className="h-4 w-4" /> Chiqish
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Users, label: "Urinishlar", value: totalAttempts },
          { icon: BookOpen, label: "O'quvchilar", value: uniqueStudents },
          { icon: Trophy, label: "O'rtacha ball", value: `${avgScore}%` },
          { icon: Clock, label: "O'rtacha vaqt", value: fmtDur(avgTime) },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="p-5 rounded-2xl bg-card border border-border" style={{ boxShadow: "var(--shadow-soft)" }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-lg grid place-items-center text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-sm text-muted-foreground">{label}</span>
            </div>
            <div className="text-3xl font-bold">{value}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <TrendingUp className="h-5 w-5 text-primary" />
        <span className="font-medium">Mavzu bo'yicha:</span>
        <select
          value={filterTopic}
          onChange={(e) => setFilterTopic(e.target.value)}
          className="px-3 py-2 rounded-lg border border-input bg-background text-sm"
        >
          <option value="all">Barchasi</option>
          {[...topics.values()].map((t) => (
            <option key={t.id} value={t.id}>{t.order_num}. {t.title}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-card border border-border overflow-hidden" style={{ boxShadow: "var(--shadow-soft)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left p-3 font-semibold">O'quvchi</th>
                <th className="text-left p-3 font-semibold">Sinf</th>
                <th className="text-left p-3 font-semibold">Mavzu</th>
                <th className="text-center p-3 font-semibold">Natija</th>
                <th className="text-center p-3 font-semibold">Foiz</th>
                <th className="text-center p-3 font-semibold">Vaqt</th>
                <th className="text-left p-3 font-semibold">Sana</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Hozircha natijalar yo'q.</td></tr>
              ) : filtered.map((r) => {
                const pct = Math.round((r.correct_count / Math.max(1, r.total_questions)) * 100);
                const topic = topics.get(r.topic_id);
                const pctColor = pct >= 86 ? "var(--success)" : pct >= 71 ? "var(--primary)" : pct >= 56 ? "var(--highlight)" : "var(--destructive)";
                return (
                  <tr key={r.id} className="border-t border-border hover:bg-secondary/40">
                    <td className="p-3 font-medium">{r.student_name}</td>
                    <td className="p-3 text-muted-foreground">{r.student_class}</td>
                    <td className="p-3">{topic ? `${topic.order_num}. ${topic.title}` : "—"}</td>
                    <td className="p-3 text-center">{r.correct_count} / {r.total_questions}</td>
                    <td className="p-3 text-center font-semibold" style={{ color: pctColor }}>{pct}%</td>
                    <td className="p-3 text-center">{fmtDur(r.duration_seconds)}</td>
                    <td className="p-3 text-muted-foreground">{fmtDate(r.finished_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}