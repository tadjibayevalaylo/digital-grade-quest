import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, Clock, Trophy, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/student_/quiz/$slug")({
  component: QuizPage,
});

type QType = "mcq" | "truefalse" | "fillblank" | "matching";
type Question = {
  id: string;
  question_text: string;
  options: any;
  correct_index: number;
  order_num: number;
  difficulty: "oson" | "orta" | "qiyin";
  question_type: QType;
};

type Topic = { id: string; slug: string; title: string; description: string };

const QUIZ_SIZE = 10;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalizeText(s: string) {
  return s.trim().toLowerCase().replace(/[.,!?'`'"\s]+/g, "");
}

function isAnswerCorrect(q: Question, ans: any): boolean {
  if (ans === undefined || ans === null) return false;
  if (q.question_type === "mcq" || q.question_type === "truefalse") {
    return ans === q.correct_index;
  }
  if (q.question_type === "fillblank") {
    const correct = String(q.options?.answer ?? "");
    return normalizeText(String(ans)) === normalizeText(correct);
  }
  if (q.question_type === "matching") {
    const pairs: [string, string][] = q.options?.pairs ?? [];
    // ans is map: leftIndex -> rightValue (string)
    if (typeof ans !== "object") return false;
    return pairs.every(([_, right], i) => ans[i] === right);
  }
  return false;
}

function isAnswered(q: Question, ans: any): boolean {
  if (ans === undefined || ans === null) return false;
  if (q.question_type === "fillblank") return String(ans).trim().length > 0;
  if (q.question_type === "matching") {
    const pairs: [string, string][] = q.options?.pairs ?? [];
    return pairs.every((_, i) => typeof ans?.[i] === "string" && ans[i].length > 0);
  }
  return typeof ans === "number";
}

const diffStyle: Record<string, { label: string; bg: string; fg: string }> = {
  oson: { label: "Oson", bg: "color-mix(in oklab, var(--success) 15%, transparent)", fg: "var(--success)" },
  orta: { label: "O'rta", bg: "color-mix(in oklab, var(--highlight) 18%, transparent)", fg: "var(--highlight)" },
  qiyin: { label: "Qiyin", bg: "color-mix(in oklab, var(--destructive) 15%, transparent)", fg: "var(--destructive)" },
};

function QuizPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<{ name: string; klass: string } | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [current, setCurrent] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [finished, setFinished] = useState<null | { correct: number; total: number; durationSec: number }>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? sessionStorage.getItem("student") : null;
    if (!saved) {
      navigate({ to: "/student" });
      return;
    }
    setStudent(JSON.parse(saved));
  }, [navigate]);

  useEffect(() => {
    if (!student) return;
    (async () => {
      const { data: tdata } = await supabase.from("topics").select("*").eq("slug", slug).maybeSingle();
      if (!tdata) {
        setLoading(false);
        return;
      }
      setTopic(tdata as Topic);
      const { data: qdata } = await supabase
        .from("questions")
        .select("id, question_text, options, correct_index, order_num, difficulty, question_type")
        .eq("topic_id", tdata.id);
      const all = (qdata || []) as unknown as Question[];
      const picked = shuffle(all).slice(0, QUIZ_SIZE);
      setQuestions(picked);
      // create session
      const { data: sess } = await supabase
        .from("student_sessions")
        .insert({
          student_name: student.name,
          student_class: student.klass,
          topic_id: tdata.id,
          total_questions: picked.length,
        })
        .select("id")
        .single();
      if (sess) setSessionId(sess.id);
      setStartTime(Date.now());
      setLoading(false);
    })();
  }, [student, slug]);

  const setAns = (qid: string, value: any) => {
    if (finished) return;
    setAnswers((a) => ({ ...a, [qid]: value }));
  };

  const submit = async () => {
    const total = questions.length;
    const correct = questions.reduce((acc, q) => acc + (isAnswerCorrect(q, answers[q.id]) ? 1 : 0), 0);
    const durationSec = Math.max(1, Math.round((Date.now() - startTime) / 1000));
    setFinished({ correct, total, durationSec });
    if (sessionId) {
      await supabase
        .from("student_sessions")
        .update({
          correct_count: correct,
          finished_at: new Date().toISOString(),
          duration_seconds: durationSec,
        })
        .eq("id", sessionId);
    }
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">Yuklanmoqda...</div>;
  }

  if (!topic) {
    return <div className="container mx-auto px-4 py-16 text-center">Mavzu topilmadi. <Link to="/student" className="text-primary underline">Orqaga</Link></div>;
  }

  if (finished) {
    const pct = Math.round((finished.correct / finished.total) * 100);
    const mins = Math.floor(finished.durationSec / 60);
    const secs = finished.durationSec % 60;
    const grade = pct >= 86 ? { label: "A'lo", color: "var(--success)" } : pct >= 71 ? { label: "Yaxshi", color: "var(--primary)" } : pct >= 56 ? { label: "Qoniqarli", color: "var(--highlight)" } : { label: "Qayta urinib ko'ring", color: "var(--destructive)" };
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-grid h-20 w-20 place-items-center rounded-3xl text-primary-foreground mb-6" style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-glow)" }}>
            <Trophy className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Test yakunlandi!</h1>
          <p className="text-muted-foreground mb-8">{topic.title}</p>

          <div className="p-8 rounded-3xl bg-card border border-border mb-6" style={{ boxShadow: "var(--shadow-soft)" }}>
            <div className="text-7xl font-bold mb-2" style={{ color: grade.color }}>{pct}%</div>
            <div className="text-xl font-semibold mb-6" style={{ color: grade.color }}>{grade.label}</div>

            <div className="grid grid-cols-3 gap-4 text-left">
              <div className="p-4 rounded-xl bg-secondary">
                <div className="text-xs text-muted-foreground mb-1">To'g'ri javoblar</div>
                <div className="text-2xl font-bold">{finished.correct} / {finished.total}</div>
              </div>
              <div className="p-4 rounded-xl bg-secondary">
                <div className="text-xs text-muted-foreground mb-1">Sarflangan vaqt</div>
                <div className="text-2xl font-bold flex items-center gap-1"><Clock className="h-5 w-5" />{mins}:{String(secs).padStart(2, "0")}</div>
              </div>
              <div className="p-4 rounded-xl bg-secondary">
                <div className="text-xs text-muted-foreground mb-1">Foiz</div>
                <div className="text-2xl font-bold">{pct}%</div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-center flex-wrap">
            <Link to="/student" className="px-6 py-3 rounded-xl font-semibold border-2 border-primary/30 hover:bg-primary/5">
              Boshqa mavzu
            </Link>
            <button onClick={() => window.location.reload()} className="px-6 py-3 rounded-xl font-semibold text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
              Qayta ishlash
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return <div className="container mx-auto px-4 py-16 text-center">Ushbu mavzuda hozircha savollar yo'q.</div>;
  }

  const q = questions[current];
  const answered = isAnswered(q, answers[q.id]);
  const progress = ((current + 1) / questions.length) * 100;
  const diff = diffStyle[q.difficulty] || diffStyle.orta;

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium">{topic.title}</span>
            <span className="text-muted-foreground">{current + 1} / {questions.length}</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div className="h-full transition-all" style={{ width: `${progress}%`, background: "var(--gradient-hero)" }} />
          </div>
        </div>

        <div className="p-6 sm:p-8 rounded-2xl bg-card border border-border mb-6" style={{ boxShadow: "var(--shadow-soft)" }}>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: diff.bg, color: diff.fg }}>
              {diff.label}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-secondary text-muted-foreground">
              {q.question_type === "mcq" && "Test"}
              {q.question_type === "truefalse" && "To'g'ri / Noto'g'ri"}
              {q.question_type === "fillblank" && "Bo'sh joyni to'ldiring"}
              {q.question_type === "matching" && "Juftlik moslang"}
            </span>
          </div>
          <h2 className="text-xl font-semibold mb-6">{q.question_text}</h2>
          <QuestionBody q={q} value={answers[q.id]} onChange={(v) => setAns(q.id, v)} />
        </div>

        <div className="flex justify-between gap-3">
          <button
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
            className="px-5 py-3 rounded-xl font-medium border border-border disabled:opacity-40 hover:bg-secondary"
          >
            ← Oldingi
          </button>
          {current < questions.length - 1 ? (
            <button
              onClick={() => setCurrent((c) => c + 1)}
              disabled={!answered}
              className="px-6 py-3 rounded-xl font-semibold text-primary-foreground disabled:opacity-40 inline-flex items-center gap-2"
              style={{ background: "var(--gradient-hero)" }}
            >
              Keyingi <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={!questions.every((qq) => isAnswered(qq, answers[qq.id]))}
              className="px-6 py-3 rounded-xl font-semibold text-primary-foreground disabled:opacity-40 inline-flex items-center gap-2"
              style={{ background: "var(--gradient-hero)" }}
            >
              <CheckCircle2 className="h-5 w-5" /> Yakunlash
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function QuestionBody({ q, value, onChange }: { q: Question; value: any; onChange: (v: any) => void }) {
  if (q.question_type === "mcq" || q.question_type === "truefalse") {
    const opts: string[] = Array.isArray(q.options) ? q.options : [];
    return (
      <div className="space-y-3">
        {opts.map((opt, idx) => {
          const selected = value === idx;
          return (
            <button
              key={idx}
              onClick={() => onChange(idx)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                selected ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 hover:bg-secondary"
              }`}
            >
              <div
                className={`h-7 w-7 rounded-full grid place-items-center font-bold text-sm flex-shrink-0 ${
                  selected ? "text-primary-foreground" : "bg-secondary text-foreground"
                }`}
                style={selected ? { background: "var(--gradient-hero)" } : {}}
              >
                {String.fromCharCode(65 + idx)}
              </div>
              <span className="flex-1">{opt}</span>
            </button>
          );
        })}
      </div>
    );
  }

  if (q.question_type === "fillblank") {
    return (
      <div>
        <input
          type="text"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Javobni shu yerga yozing..."
          className="w-full p-4 rounded-xl border-2 border-border focus:border-primary outline-none text-lg bg-background"
        />
        <p className="text-xs text-muted-foreground mt-2">Bitta so'z bilan javob bering</p>
      </div>
    );
  }

  if (q.question_type === "matching") {
    return <MatchingQuestion q={q} value={value} onChange={onChange} />;
  }

  return null;
}

function MatchingQuestion({ q, value, onChange }: { q: Question; value: any; onChange: (v: any) => void }) {
  const pairs: [string, string][] = q.options?.pairs ?? [];
  const [rightOptions] = useState(() => shuffle(pairs.map((p) => p[1])));
  const current: Record<number, string> = value ?? {};

  const usedValues = new Set(Object.values(current));

  return (
    <div className="space-y-3">
      {pairs.map(([left], i) => (
        <div key={i} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="p-3 rounded-xl bg-secondary font-medium text-sm">{left}</div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <select
            value={current[i] ?? ""}
            onChange={(e) => onChange({ ...current, [i]: e.target.value })}
            className="p-3 rounded-xl border-2 border-border focus:border-primary outline-none bg-background text-sm"
          >
            <option value="">— tanlang —</option>
            {rightOptions.map((opt) => (
              <option key={opt} value={opt} disabled={usedValues.has(opt) && current[i] !== opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}