import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Cpu, HardDrive, Monitor, Smartphone, Sparkles, BookOpen, Trophy, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Informatika 9 • 1-bob — Elektron topshiriqlar" },
      { name: "description", content: "9-sinf informatika fanining 1-bobi: kompyuter tizimining turlari va komponentlari bo'yicha elektron testlar." },
      { property: "og:title", content: "Informatika 9 • 1-bob — Elektron topshiriqlar" },
      { property: "og:description", content: "9-sinf informatika fanining 1-bobi bo'yicha onlayn baholash platformasi." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ background: "var(--gradient-hero)" }} />
        <div className="container mx-auto px-4 py-20 sm:py-28 relative">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" /> 9-sinf • Informatika
            </span>
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-6">
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-hero)" }}>
                Bilimingni sina,
              </span>
              <br />
              o'z natijangni ko'r!
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Bu platforma 9-sinf informatika darsligining <b className="text-foreground">1-bobi — "Kompyuter tizimining turlari va komponentlari"</b> mavzulari bo'yicha elektron topshiriqlar jamlangan onlayn maktab vositasi.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                to="/student"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-105"
                style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-glow)" }}
              >
                <Zap className="h-5 w-5" /> Testni boshlash
              </Link>
              <Link
                to="/teacher"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold border-2 border-primary/30 hover:bg-primary/5 transition-colors"
              >
                <Trophy className="h-5 w-5" /> O'qituvchi paneli
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* About chapter */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <BookOpen className="h-7 w-7 text-primary" />
            <h2 className="text-3xl font-bold">1-bob haqida</h2>
          </div>
          <p className="text-lg text-muted-foreground mb-10">
            Ushbu bob yakunida siz kompyuter tizimi qurilmalarini aniqlash, dasturiy ta'minot tushunchasini izohlash, ichki va tashqi xotira turlarini farqlash, hamda zamonaviy mobil va rivojlanayotgan texnologiyalar haqida fikr yurita olasiz.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Cpu, title: "Qurilmalar", text: "CPU, RAM, ROM va boshqalar" },
              { icon: HardDrive, title: "Xotira", text: "Ichki va tashqi xotira turlari" },
              { icon: Monitor, title: "Dasturiy ta'minot", text: "OS, GUI, CLI tushunchalari" },
              { icon: Smartphone, title: "Mobil tex.", text: "3G/4G, smartfon, planshet" },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="p-5 rounded-2xl border border-border bg-card hover:shadow-lg transition-shadow" style={{ boxShadow: "var(--shadow-soft)" }}>
                <div className="h-10 w-10 rounded-xl grid place-items-center mb-3 text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold mb-1">{title}</h3>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-secondary/50 py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold mb-10 text-center">Qanday ishlaydi?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { n: "01", t: "O'quvchi sifatida kir", d: "Ism, familiya va sinfingizni kiriting. Ro'yxatdan o'tish shart emas." },
              { n: "02", t: "Mavzuni tanlang", d: "1-bobning 11 ta mavzusidan birini tanlab, testni ishlang." },
              { n: "03", t: "Natijangizni ko'ring", d: "Test yakunida ball va sarflagan vaqtingizni darhol ko'rasiz." },
            ].map((s) => (
              <div key={s.n} className="p-6 rounded-2xl bg-card border border-border">
                <div className="text-3xl font-bold text-primary mb-2">{s.n}</div>
                <h3 className="font-semibold text-lg mb-2">{s.t}</h3>
                <p className="text-muted-foreground text-sm">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
        © Informatika 9-sinf • 1-bob elektron baholash platformasi
      </footer>
    </div>
  );
}
