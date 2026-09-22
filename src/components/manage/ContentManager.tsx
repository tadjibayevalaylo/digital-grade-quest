import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, ListChecks, Loader2, LogOut, KeyRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ApiError,
  apiLogin,
  clearApiToken,
  createTopic,
  deleteTopic,
  getApiToken,
  listTopics,
  updateTopic,
  type ApiTopic,
} from "@/lib/teacherApi";
import { QuestionsManager } from "./QuestionsManager";

const inputCls =
  "w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50";
const btnGhost =
  "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm border border-border hover:bg-secondary";

export function ContentManager() {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setToken(getApiToken());
    setReady(true);
  }, []);

  if (!ready) return null;
  if (!token) return <ApiLogin onSuccess={(t) => setToken(t)} />;

  return (
    <TopicsPanel
      onSignedOut={() => {
        clearApiToken();
        setToken(null);
      }}
    />
  );
}

function ApiLogin({ onSuccess }: { onSuccess: (token: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onSuccess(await apiLogin(email.trim(), password));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kirishda xatolik.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 rounded-2xl bg-card border border-border" style={{ boxShadow: "var(--shadow-soft)" }}>
      <div className="flex items-center gap-2 mb-4">
        <KeyRound className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">Boshqaruv paneliga kirish</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Mavzular va savollarni boshqarish uchun o'qituvchi login va parolingizni kiriting.
      </p>
      {error && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-destructive/10 text-destructive text-sm font-medium">{error}</div>
      )}
      <form onSubmit={submit} className="space-y-3">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputCls}
        />
        <input
          type="password"
          required
          placeholder="Parol"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputCls}
        />
        <button type="submit" disabled={busy} className={btnPrimary + " w-full"}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Kirish
        </button>
      </form>
    </div>
  );
}

function TopicsPanel({ onSignedOut }: { onSignedOut: () => void }) {
  const [topics, setTopics] = useState<ApiTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ApiTopic | null>(null);
  const [nomi, setNomi] = useState("");
  const [tavsif, setTavsif] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [questionsTopic, setQuestionsTopic] = useState<ApiTopic | null>(null);

  const load = async () => {
    setLoading(true);
    setListError(null);
    try {
      const data = await listTopics();
      setTopics(
        [...data].sort((a, b) => (a.tartib ?? 0) - (b.tartib ?? 0)),
      );
    } catch (e) {
      setListError(e instanceof ApiError ? e.message : "Mavzularni yuklab bo'lmadi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditing(null);
    setNomi("");
    setTavsif("");
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (t: ApiTopic) => {
    setEditing(t);
    setNomi(t.nomi);
    setTavsif(t.tavsif || "");
    setFormError(null);
    setFormOpen(true);
  };

  const save = async () => {
    if (!nomi.trim()) {
      setFormError("Mavzu nomini kiriting.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await updateTopic(editing.id, {
          nomi: nomi.trim(),
          tavsif: tavsif.trim(),
          ...(editing.tartib != null ? { tartib: editing.tartib } : {}),
        });
      } else {
        await createTopic({ nomi: nomi.trim(), tavsif: tavsif.trim() });
      }
      setFormOpen(false);
      await load();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) onSignedOut();
      setFormError(e instanceof ApiError ? e.message : "Saqlashda xatolik.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (t: ApiTopic) => {
    if (!window.confirm("Bu mavzuga tegishli barcha savollar ham o'chiriladi, davom etasizmi?")) return;
    try {
      await deleteTopic(t.id);
      await load();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) onSignedOut();
      alert(e instanceof ApiError ? e.message : "O'chirishda xatolik.");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
        <h2 className="text-xl font-bold">Mavzular va savollar boshqaruvi</h2>
        <div className="flex gap-2">
          <button onClick={openNew} className={btnPrimary}>
            <Plus className="h-4 w-4" /> Yangi mavzu qo'shish
          </button>
          <button onClick={onSignedOut} className={btnGhost} title="Boshqaruvdan chiqish">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin inline" />
        </div>
      ) : listError ? (
        <p className="py-8 text-center text-sm text-destructive">{listError}</p>
      ) : topics.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Hozircha mavzular yo'q.</p>
      ) : (
        <div className="space-y-3">
          {topics.map((t, i) => (
            <div
              key={t.id}
              className="p-4 rounded-2xl bg-card border border-border flex items-start justify-between gap-4 flex-wrap"
              style={{ boxShadow: "var(--shadow-soft)" }}
            >
              <div className="flex gap-3 min-w-0">
                <div
                  className="h-9 w-9 shrink-0 rounded-xl grid place-items-center font-bold text-primary-foreground"
                  style={{ background: "var(--gradient-hero)" }}
                >
                  {t.tartib ?? i + 1}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold break-words">{t.nomi}</p>
                  {t.tavsif && <p className="text-sm text-muted-foreground break-words">{t.tavsif}</p>}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => setQuestionsTopic(t)} className={btnGhost}>
                  <ListChecks className="h-4 w-4" /> Savollar
                </button>
                <button onClick={() => openEdit(t)} className={btnGhost}>
                  <Pencil className="h-4 w-4" /> Tahrirlash
                </button>
                <button onClick={() => remove(t)} className={btnGhost + " text-destructive"}>
                  <Trash2 className="h-4 w-4" /> O'chirish
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={(o) => !o && setFormOpen(false)}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Mavzuni tahrirlash" : "Yangi mavzu"}</DialogTitle>
          </DialogHeader>
          {formError && (
            <div className="px-3 py-2 rounded-xl bg-destructive/10 text-destructive text-sm font-medium">
              {formError}
            </div>
          )}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Mavzu nomi *</label>
              <input value={nomi} onChange={(e) => setNomi(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Tavsif</label>
              <textarea rows={3} value={tavsif} onChange={(e) => setTavsif(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setFormOpen(false)} className={btnGhost}>
              Bekor qilish
            </button>
            <button onClick={save} disabled={saving} className={btnPrimary}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Saqlash
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {questionsTopic && (
        <QuestionsManager topic={questionsTopic} onClose={() => setQuestionsTopic(null)} />
      )}
    </div>
  );
}
