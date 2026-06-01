import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, Clock, Trophy, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/student_/quiz/$slug")({
  component: QuizPage,
});

type Question = {
  id: string;
  question_text: string;
  options: string[];
  correct_index: number;
  order_num: number;
};

type Topic = { id: string; slug: string; title: string; description: string };

function QuizPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<{ name: string; klass: string } | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
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
        .select("id, question_text, options, correct_index, order_num")
        .eq("topic_id", tdata.id)
        .order("order_num");
      setQuestions((qdata || []) as unknown as Question[]);
      // create session
      const { data: sess } = await supabase
        .from("student_sessions")
        .insert({
          student_name: student.name,
          student_class: student.klass,
          topic_id: tdata.id,
          total_questions: (qdata || []).length,
        })
        .select("id")
        .single();
      if (sess) setSessionId(sess.id);
      setStartTime(Date.now());
      setLoading(false);
    })();
  }, [student, slug]);

  const choose = (qid: string, idx: number) => {
    if (finished) return;
    setAnswers((a) => ({ ...a, [qid]: idx }));
  };

  const submit = async () => {
    const total = questions.length;
    const correct = questions.reduce((acc, q) => acc + (answers[q.id] === q.correct_index ? 1 : 0), 0);
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
  const answered = answers[q.id] !== undefined;
  const progress = ((current + 1) / questions.length) * 100;

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
          <h2 className="text-xl font-semibold mb-6">{q.question_text}</h2>
          <div className="space-y-3">
            {q.options.map((opt, idx) => {
              const selected = answers[q.id] === idx;
              return (
                <button
                  key={idx}
                  onClick={() => choose(q.id, idx)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                    selected
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50 hover:bg-secondary"
                  }`}
                >
                  <div className={`h-7 w-7 rounded-full grid place-items-center font-bold text-sm flex-shrink-0 ${
                    selected ? "text-primary-foreground" : "bg-secondary text-foreground"
                  }`} style={selected ? { background: "var(--gradient-hero)" } : {}}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <span className="flex-1">{opt}</span>
                </button>
              );
            })}
          </div>
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
              disabled={Object.keys(answers).length !== questions.length}
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