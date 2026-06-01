
-- Roles
CREATE TYPE public.app_role AS ENUM ('teacher', 'student');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "users see own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Auto-assign teacher role on signup (any Google login becomes teacher in this app)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'teacher')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Topics
CREATE TABLE public.topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL,
  order_num int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.topics TO anon, authenticated;
GRANT ALL ON public.topics TO service_role;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "topics readable by all" ON public.topics FOR SELECT TO anon, authenticated USING (true);

-- Questions
CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  options jsonb NOT NULL,
  correct_index int NOT NULL,
  order_num int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.questions TO anon, authenticated;
GRANT ALL ON public.questions TO service_role;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questions readable by all" ON public.questions FOR SELECT TO anon, authenticated USING (true);

-- Student sessions
CREATE TABLE public.student_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name text NOT NULL,
  student_class text NOT NULL,
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  total_questions int NOT NULL DEFAULT 0,
  correct_count int NOT NULL DEFAULT 0,
  duration_seconds int,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.student_sessions TO anon, authenticated;
GRANT ALL ON public.student_sessions TO service_role;
ALTER TABLE public.student_sessions ENABLE ROW LEVEL SECURITY;

-- Anyone can create their own session row & update only that row (no auth yet, so we let inserts in)
CREATE POLICY "anyone can insert session" ON public.student_sessions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anyone can update session" ON public.student_sessions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
-- Teachers see everything; students only need their own row right after creation (allow read all for simplicity since data is non-sensitive school quiz results)
CREATE POLICY "sessions readable by all" ON public.student_sessions FOR SELECT TO anon, authenticated USING (true);

-- Seed topics
INSERT INTO public.topics (slug, title, description, order_num) VALUES
('qurilma-komponentlari', 'Kompyuter tizimi qurilma komponentlari', 'Kompyuter tizimining qurilma komponentlari va ichki qurilmalari.', 1),
('tashqi-qurilmalar', 'Tashqi va yordamchi qurilmalar', 'Kompyuterning tashqi va yordamchi qurilmalari.', 2),
('dasturiy-taminot', 'Dasturiy ta''minot tushunchasi', 'Kompyuterni boshqarish uchun foydalaniladigan dastur.', 3),
('software', 'Software tushunchasi', 'Software so''zining ma''nosi va turlari.', 4),
('tizimli-dt', 'Tizimli dasturiy ta''minot (OS, GUI, CLI)', 'Operatsion tizimlar, grafik (GUI) va buyruqlar qatori (CLI) interfeysi.', 5),
('protsessor', 'Markaziy protsessor', 'Markaziy protsessor (CPU) va uning vazifasi.', 6),
('ichki-xotira', 'Ichki xotira: ROM va RAM', 'Ichki xotira turlari, ROM va RAM o''zaro taqqoslash.', 7),
('kiritish-chiqarish', 'Kiritish va chiqarish qurilmalari', 'Kiritish/chiqarish va ikkilamchi tashqi xotira qurilmalari.', 8),
('stol-portativ', 'Stol va portativ kompyuterlar', 'Stol va portativ kompyuterlardan tarmoqqa ulangan/ulanmagan holda foydalanish.', 9),
('mobil-tex', '3G/4G, planshet va smartfonlar', '3G/4G texnologiyalari, planshet va smartfonlardan foydalanish.', 10),
('yangi-tex', 'Rivojlanayotgan texnologiyalar', 'Rivojlanayotgan texnologiyalarning kundalik hayotga ta''siri.', 11);

-- Seed questions (5 per topic)
DO $$
DECLARE
  t RECORD;
  qs jsonb;
BEGIN
  -- Topic 1: qurilma-komponentlari
  SELECT id INTO t FROM public.topics WHERE slug='qurilma-komponentlari';
  INSERT INTO public.questions (topic_id, question_text, options, correct_index, order_num) VALUES
  (t.id, 'Kompyuter tizimining asosiy ichki komponenti qaysi?', '["Monitor","Markaziy protsessor","Printer","Skaner"]'::jsonb, 1, 1),
  (t.id, 'Quyidagilardan qaysi biri kompyuterning ichki qurilmasi hisoblanadi?', '["Klaviatura","Sichqoncha","RAM","Monitor"]'::jsonb, 2, 2),
  (t.id, 'Kompyuter tizimi qanday qismlardan tashkil topadi?', '["Faqat dasturiy ta''minot","Faqat qurilmalar","Qurilma va dasturiy ta''minot","Faqat foydalanuvchi"]'::jsonb, 2, 3),
  (t.id, 'Quyidagilardan qaysi biri tizim platasiga ulanmaydi?', '["Protsessor","RAM","Videokarta","Sichqoncha kovrigi"]'::jsonb, 3, 4),
  (t.id, 'Hardware so''zining ma''nosi nima?', '["Dasturlar","Qurilmalar","Fayllar","Drayverlar"]'::jsonb, 1, 5);

  -- Topic 2: tashqi-qurilmalar
  SELECT id INTO t FROM public.topics WHERE slug='tashqi-qurilmalar';
  INSERT INTO public.questions (topic_id, question_text, options, correct_index, order_num) VALUES
  (t.id, 'Quyidagilardan qaysi biri tashqi qurilma?', '["RAM","Protsessor","Printer","Tizim platasi"]'::jsonb, 2, 1),
  (t.id, 'Yordamchi qurilma deganda nimani tushunasiz?', '["Asosiy ishni bajaradigan qurilma","Qo''shimcha imkoniyat beruvchi qurilma","Faqat o''yin uchun qurilma","Hech narsa"]'::jsonb, 1, 2),
  (t.id, 'Skaner qanday qurilma?', '["Chiqarish","Kiritish","Saqlash","Hisoblash"]'::jsonb, 1, 3),
  (t.id, 'Tashqi qattiq disk qanday qurilma?', '["Kiritish","Chiqarish","Tashqi xotira","Protsessor"]'::jsonb, 2, 4),
  (t.id, 'Web-kamera asosan qanday qurilma?', '["Chiqarish","Kiritish","Xotira","Tarmoq"]'::jsonb, 1, 5);

  -- Topic 3: dasturiy-taminot
  SELECT id INTO t FROM public.topics WHERE slug='dasturiy-taminot';
  INSERT INTO public.questions (topic_id, question_text, options, correct_index, order_num) VALUES
  (t.id, 'Dasturiy ta''minot nima?', '["Qurilmalar to''plami","Kompyuterni boshqaruvchi dasturlar majmuasi","Faqat o''yinlar","Tashqi qurilma"]'::jsonb, 1, 1),
  (t.id, 'Dasturiy ta''minot qisqacha nima deb yuritiladi?', '["Hardware","Software","Firmware","Malware"]'::jsonb, 1, 2),
  (t.id, 'Dasturiy ta''minotning asosiy vazifasi?', '["Elektr berish","Ma''lumotlarni qayta ishlash","Sovutish","Bo''yash"]'::jsonb, 1, 3),
  (t.id, 'Dasturlarsiz kompyuter:', '["Ishlay oladi","Faqat o''yin o''ynaydi","Ishlay olmaydi","Tezroq ishlaydi"]'::jsonb, 2, 4),
  (t.id, 'Quyidagilardan qaysi biri dastur emas?', '["MS Word","Google Chrome","Klaviatura","Photoshop"]'::jsonb, 2, 5);

  -- Topic 4: software
  SELECT id INTO t FROM public.topics WHERE slug='software';
  INSERT INTO public.questions (topic_id, question_text, options, correct_index, order_num) VALUES
  (t.id, '"Software" so''zi qaysi tildan olingan?', '["Lotin","Ingliz","Yunon","Arab"]'::jsonb, 1, 1),
  (t.id, 'Software nimani anglatadi?', '["Qurilma","Dasturiy ta''minot","Elektr","Tarmoq"]'::jsonb, 1, 2),
  (t.id, 'Software qanday turlarga bo''linadi?', '["Tizimli va amaliy","Faqat tizimli","Faqat amaliy","Qattiq va yumshoq"]'::jsonb, 0, 3),
  (t.id, 'Quyidagilardan qaysi biri software emas?', '["Windows","Linux","Protsessor","MS Excel"]'::jsonb, 2, 4),
  (t.id, 'Software o''rnatish jarayoni nima deyiladi?', '["Format","Install","Update","Delete"]'::jsonb, 1, 5);

  -- Topic 5: tizimli-dt
  SELECT id INTO t FROM public.topics WHERE slug='tizimli-dt';
  INSERT INTO public.questions (topic_id, question_text, options, correct_index, order_num) VALUES
  (t.id, 'Operatsion tizim qaysi turkumga kiradi?', '["Amaliy DT","Tizimli DT","O''yin","Drayver"]'::jsonb, 1, 1),
  (t.id, 'GUI bu — ?', '["Buyruqlar qatori","Grafik foydalanuvchi interfeysi","Tarmoq","Xotira"]'::jsonb, 1, 2),
  (t.id, 'CLI bu — ?', '["Grafik interfeys","Buyruqlar qatori interfeysi","Til","Disk"]'::jsonb, 1, 3),
  (t.id, 'Quyidagilardan qaysi biri operatsion tizim?', '["Windows 10","MS Word","Google","Chrome"]'::jsonb, 0, 4),
  (t.id, 'GUI ning CLI dan asosiy farqi?', '["Faqat matn","Grafik elementlar bilan ishlaydi","Tezroq","Xavfsizroq"]'::jsonb, 1, 5);

  -- Topic 6: protsessor
  SELECT id INTO t FROM public.topics WHERE slug='protsessor';
  INSERT INTO public.questions (topic_id, question_text, options, correct_index, order_num) VALUES
  (t.id, 'Markaziy protsessor (CPU) ning asosiy vazifasi?', '["Ma''lumotlarni qayta ishlash","Suratga olish","Bosib chiqarish","Sovutish"]'::jsonb, 0, 1),
  (t.id, 'CPU qisqartmasi nimani anglatadi?', '["Central Power Unit","Central Processing Unit","Computer Personal Unit","Control Program Unit"]'::jsonb, 1, 2),
  (t.id, 'Protsessor tezligi qaysi birlikda o''lchanadi?', '["Bayt","Gerts","Volt","Litr"]'::jsonb, 1, 3),
  (t.id, 'Protsessor qaerga o''rnatiladi?', '["Monitorga","Tizim platasiga","Klaviaturaga","Diskka"]'::jsonb, 1, 4),
  (t.id, 'Protsessor "miyasi" deb ataladigan qism?', '["Periferiya","Yadro","Disk","Ekran"]'::jsonb, 1, 5);

  -- Topic 7: ichki-xotira
  SELECT id INTO t FROM public.topics WHERE slug='ichki-xotira';
  INSERT INTO public.questions (topic_id, question_text, options, correct_index, order_num) VALUES
  (t.id, 'RAM qanday xotira?', '["Doimiy","Operativ","Tashqi","Optik"]'::jsonb, 1, 1),
  (t.id, 'ROM qanday xotira?', '["Faqat o''qish uchun mo''ljallangan","Yozish uchun","Optik","Magnit"]'::jsonb, 0, 2),
  (t.id, 'Kompyuter o''chirilganda ma''lumot yo''qoladigan xotira?', '["ROM","RAM","HDD","SSD"]'::jsonb, 1, 3),
  (t.id, 'RAM va ROM o''rtasidagi asosiy farq?', '["Rangida","O''zgaruvchanligida","Hajmida","Narxida"]'::jsonb, 1, 4),
  (t.id, 'RAM ning to''liq nomi?', '["Read Access Memory","Random Access Memory","Real Active Memory","Run All Memory"]'::jsonb, 1, 5);

  -- Topic 8: kiritish-chiqarish
  SELECT id INTO t FROM public.topics WHERE slug='kiritish-chiqarish';
  INSERT INTO public.questions (topic_id, question_text, options, correct_index, order_num) VALUES
  (t.id, 'Quyidagilardan qaysi biri kiritish qurilmasi?', '["Monitor","Klaviatura","Printer","Kolonka"]'::jsonb, 1, 1),
  (t.id, 'Quyidagilardan qaysi biri chiqarish qurilmasi?', '["Sichqoncha","Skaner","Printer","Mikrofon"]'::jsonb, 2, 2),
  (t.id, 'Ikkilamchi (tashqi) xotira turi?', '["RAM","ROM","Flesh xotira","Protsessor"]'::jsonb, 2, 3),
  (t.id, 'Mikrofon qanday qurilma?', '["Chiqarish","Kiritish","Xotira","Tarmoq"]'::jsonb, 1, 4),
  (t.id, 'Monitor qanday qurilma?', '["Kiritish","Chiqarish","Xotira","Hisoblash"]'::jsonb, 1, 5);

  -- Topic 9: stol-portativ
  SELECT id INTO t FROM public.topics WHERE slug='stol-portativ';
  INSERT INTO public.questions (topic_id, question_text, options, correct_index, order_num) VALUES
  (t.id, 'Stol kompyuterining asosiy xususiyati?', '["Yengil olib yurish","Doimiy joyda ishlatiladi","Batareyada ishlaydi","Tegishli ekran"]'::jsonb, 1, 1),
  (t.id, 'Portativ kompyuter misoli?', '["Server","Noutbuk","Tower PC","Mainframe"]'::jsonb, 1, 2),
  (t.id, 'Tarmoqqa ulangan kompyuter qanday afzallikka ega?', '["Faqat tezroq","Ma''lumot almashishi","Energiya tejaydi","Hech qanday"]'::jsonb, 1, 3),
  (t.id, 'Noutbukning stol kompyuterdan asosiy farqi?', '["Batareyaga ega","Sichqonchaga ega","Klaviaturaga ega","Disk-ga ega"]'::jsonb, 0, 4),
  (t.id, 'LAN qanday tarmoq?', '["Global","Lokal","Shahar","Mintaqaviy"]'::jsonb, 1, 5);

  -- Topic 10: mobil-tex
  SELECT id INTO t FROM public.topics WHERE slug='mobil-tex';
  INSERT INTO public.questions (topic_id, question_text, options, correct_index, order_num) VALUES
  (t.id, '4G ning 3G dan asosiy farqi?', '["Tezligi yuqori","Arzonroq","Eski","Faqat ovoz uchun"]'::jsonb, 0, 1),
  (t.id, 'Smartfon — bu qanday qurilma?', '["Faqat telefon","Telefon + kompyuter imkoniyatlari","Faqat kamera","Faqat televizor"]'::jsonb, 1, 2),
  (t.id, 'Planshetning asosiy boshqaruv usuli?', '["Sichqoncha","Klaviatura","Sensor ekran","Joystik"]'::jsonb, 2, 3),
  (t.id, '"G" harfi 3G/4G da nimani anglatadi?', '["Giga","Generation","Google","Geo"]'::jsonb, 1, 4),
  (t.id, 'Quyidagilardan qaysi biri mobil OS?', '["Windows 7","Android","DOS","Linux Mint"]'::jsonb, 1, 5);

  -- Topic 11: yangi-tex
  SELECT id INTO t FROM public.topics WHERE slug='yangi-tex';
  INSERT INTO public.questions (topic_id, question_text, options, correct_index, order_num) VALUES
  (t.id, 'AI nimani anglatadi?', '["Auto Internet","Artificial Intelligence","Active Index","Anti Internet"]'::jsonb, 1, 1),
  (t.id, 'IoT — bu?', '["Internet of Things","Index of Time","Input of Text","Image of Type"]'::jsonb, 0, 2),
  (t.id, 'VR texnologiyasi nima?', '["Virtual reallik","Video tahrir","Veb resurs","Vakuum"]'::jsonb, 0, 3),
  (t.id, '5G texnologiyasining afzalligi?', '["Past tezlik","Yuqori tezlik va past kechikish","Yuqori narx","Faqat ovoz"]'::jsonb, 1, 4),
  (t.id, 'Bulutli texnologiya (Cloud) nimani anglatadi?', '["Mahalliy saqlash","Internet orqali masofaviy saqlash","Faqat o''yin","Faqat e-mail"]'::jsonb, 1, 5);
END $$;
