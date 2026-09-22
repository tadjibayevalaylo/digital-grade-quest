import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Check, Loader2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ApiError,
  DARAJA_OPTIONS,
  TYPE_LABELS,
  createQuestion,
  deleteQuestion,
  listQuestions,
  updateQuestion,
  type ApiQuestion,
  type ApiTopic,
  type QuestionType,
} from "@/lib/teacherApi";

const inputCls =
  "w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50";
const btnGhost =
  "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm border border-border hover:bg-secondary";

type Draft = {
  turi: QuestionType;
  matn: string;
  daraja: string;
  togri_javob_matni: string;
  choices: { matn: string; togri: boolean }[];
};

const emptyDraft = (): Draft => ({
  turi: "multiple_choice",
  matn: "",
  daraja: "oson",
  togri_javob_matni: "True",
  choices: [
    { matn: "", togri: true },
    { matn: "", togri: false },
  ],
});

function darajaColor(d: string) {
  if (d === "qiyin") return "var(--destructive)";
  if (d === "o'rta" || d === "orta") return "var(--highlight)";
  return "var(--success)";
}

export function QuestionsManager({
  topic,
  onClose,
}: {
  topic: ApiTopic;
  onClose: () => void;
}) {
  const [items, setItems] = useState<ApiQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ApiQuestion | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setListError(null);
    try {
      setItems(await listQuestions(topic.id));
    } catch (e) {
      setListError(e instanceof ApiError ? e.message : "Savollarni yuklab bo'lmadi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic.id]);

  const openNew = () => {
    setEditing(null);
    setDraft(emptyDraft());
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (q: ApiQuestion) => {
    setEditing(q);
    setDraft({
      turi: q.turi,
      matn: q.matn,
      daraja: q.daraja || "oson",
      togri_javob_matni: q.togri_javob_matni || (q.turi === "true_false" ? "True" : ""),
      choices:
        q.choices && q.choices.length >= 2
          ? q.choices.map((c) => ({ matn: c.matn, togri: !!c.togri }))
          : [
              { matn: "", togri: true },
              { matn: "", togri: false },
            ],
    });
    setFormError(null);
    setFormOpen(true);
  };

  const save = async () => {
    setFormError(null);
    if (!draft.matn.trim()) {
      setFormError("Savol matnini kiriting.");
      return;
    }
    const payload: Parameters<typeof createQuestion>[0] = {
      topic_id: topic.id,
      matn: draft.matn.trim(),
      turi: draft.turi,
      daraja: draft.daraja,
    };
    if (draft.turi === "multiple_choice") {
      const choices = draft.choices.filter((c) => c.matn.trim());
      if (choices.length < 2) {
        setFormError("Kamida 2 ta variant kiritilishi shart.");
        return;
      }
      if (choices.filter((c) => c.togri).length !== 1) {
        setFormError("Aynan 1 ta to'g'ri variant belgilanishi kerak.");
        return;
      }
      payload.choices = choices.map((c) => ({ matn: c.matn.trim(), togri: c.togri }));
    } else if (draft.turi === "fill_blank") {
      if (!draft.togri_javob_matni.trim()) {
        setFormError("To'g'ri javobni kiriting.");
        return;
      }
      payload.togri_javob_matni = draft.togri_javob_matni.trim();
    } else {
      payload.togri_javob_matni = draft.togri_javob_matni === "False" ? "False" : "True";
    }

    setSaving(true);
    try {
      if (editing) await updateQuestion(editing.id, payload);
      else await createQuestion(payload);
      setFormOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Saqlashda xatolik.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (q: ApiQuestion) => {
    if (!window.confirm("Bu savol o'chiriladi. Davom etasizmi?")) return;
    try {
      await deleteQuestion(q.id);
      await load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "O'chirishda xatolik.");
    }
  };

  return (
    <>
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Savollar — {topic.nomi}</DialogTitle>
            <DialogDescription>Bu mavzu savollarini qo'shish, tahrirlash va o'chirish.</DialogDescription>
          </DialogHeader>

          <div className="flex justify-end">
            <button onClick={openNew} className={btnPrimary}>
              <Plus className="h-4 w-4" /> Yangi savol qo'shish
            </button>
          </div>

          {loading ? (
            <div className="py-10 text-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin inline" />
            </div>
          ) : listError ? (
            <p className="py-6 text-center text-sm text-destructive">{listError}</p>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Hozircha savollar yo'q.</p>
          ) : (
            <div className="space-y-3">
              {items.map((q, i) => (
                <div key={q.id} className="p-4 rounded-2xl border border-border bg-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs text-muted-foreground">#{i + 1}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                          {TYPE_LABELS[q.turi] ?? q.turi}
                        </span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: darajaColor(q.daraja), color: "white" }}
                        >
                          {q.daraja}
                        </span>
                      </div>
                      <p className="font-medium break-words">{q.matn}</p>
                      {q.turi === "multiple_choice" ? (
                        <ul className="mt-2 space-y-1">
                          {(q.choices || []).map((c, ci) => (
                            <li
                              key={ci}
                              className="text-sm flex items-center gap-2"
                              style={c.togri ? { color: "var(--success)", fontWeight: 600 } : undefined}
                            >
                              {c.togri ? <Check className="h-4 w-4" /> : <span className="w-4" />}
                              {c.matn}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm font-semibold" style={{ color: "var(--success)" }}>
                          To'g'ri javob: {q.togri_javob_matni}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => openEdit(q)} className={btnGhost} title="Tahrirlash">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => remove(q)}
                        className={btnGhost + " text-destructive"}
                        title="O'chirish"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Question form */}
      <Dialog open={formOpen} onOpenChange={(o) => !o && setFormOpen(false)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Savolni tahrirlash" : "Yangi savol"}</DialogTitle>
          </DialogHeader>

          {formError && (
            <div className="px-3 py-2 rounded-xl bg-destructive/10 text-destructive text-sm font-medium">
              {formError}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Savol turi</label>
              <div className="grid sm:grid-cols-3 gap-2">
                {(Object.keys(TYPE_LABELS) as QuestionType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, turi: t }))}
                    className={
                      "px-3 py-2 rounded-xl text-sm border transition-colors " +
                      (draft.turi === t
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-secondary")
                    }
                  >
                    {TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Savol matni *</label>
              <textarea
                rows={3}
                value={draft.matn}
                onChange={(e) => setDraft((d) => ({ ...d, matn: e.target.value }))}
                className={inputCls}
              />
              {draft.turi === "fill_blank" && (
                <p className="text-xs text-muted-foreground mt-1">
                  Eslatma: bo'sh joy uchun savol matnida <span className="font-mono">____</span> belgisidan
                  foydalaning.
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Qiyinlik darajasi</label>
              <select
                value={draft.daraja}
                onChange={(e) => setDraft((d) => ({ ...d, daraja: e.target.value }))}
                className={inputCls}
              >
                {DARAJA_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {draft.turi === "multiple_choice" && (
              <div>
                <label className="text-sm font-medium mb-2 block">Variantlar (to'g'risini belgilang)</label>
                <div className="space-y-2">
                  {draft.choices.map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correct-choice"
                        checked={c.togri}
                        onChange={() =>
                          setDraft((d) => ({
                            ...d,
                            choices: d.choices.map((x, xi) => ({ ...x, togri: xi === i })),
                          }))
                        }
                        className="h-4 w-4 accent-[var(--primary)]"
                      />
                      <input
                        value={c.matn}
                        placeholder={`Variant ${i + 1}`}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            choices: d.choices.map((x, xi) =>
                              xi === i ? { ...x, matn: e.target.value } : x,
                            ),
                          }))
                        }
                        className={inputCls}
                      />
                      {draft.choices.length > 2 && (
                        <button
                          type="button"
                          onClick={() =>
                            setDraft((d) => {
                              const choices = d.choices.filter((_, xi) => xi !== i);
                              if (!choices.some((x) => x.togri)) choices[0].togri = true;
                              return { ...d, choices };
                            })
                          }
                          className="p-2 rounded-lg hover:bg-secondary text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setDraft((d) => ({ ...d, choices: [...d.choices, { matn: "", togri: false }] }))
                  }
                  className={btnGhost + " mt-2"}
                >
                  <Plus className="h-4 w-4" /> Variant qo'shish
                </button>
              </div>
            )}

            {draft.turi === "fill_blank" && (
              <div>
                <label className="text-sm font-medium mb-1 block">To'g'ri javob *</label>
                <input
                  value={draft.togri_javob_matni}
                  onChange={(e) => setDraft((d) => ({ ...d, togri_javob_matni: e.target.value }))}
                  className={inputCls}
                />
              </div>
            )}

            {draft.turi === "true_false" && (
              <div>
                <label className="text-sm font-medium mb-2 block">To'g'ri javob</label>
                <div className="flex gap-4">
                  {[
                    { v: "True", l: "To'g'ri" },
                    { v: "False", l: "Noto'g'ri" },
                  ].map(({ v, l }) => (
                    <label key={v} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="tf-answer"
                        checked={draft.togri_javob_matni === v}
                        onChange={() => setDraft((d) => ({ ...d, togri_javob_matni: v }))}
                        className="h-4 w-4 accent-[var(--primary)]"
                      />
                      {l}
                    </label>
                  ))}
                </div>
              </div>
            )}
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
    </>
  );
}
