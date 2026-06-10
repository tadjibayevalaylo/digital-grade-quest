ALTER TABLE public.questions
  ADD COLUMN difficulty text NOT NULL DEFAULT 'orta',
  ADD COLUMN question_type text NOT NULL DEFAULT 'mcq';

ALTER TABLE public.questions
  ADD CONSTRAINT questions_difficulty_check CHECK (difficulty IN ('oson','orta','qiyin')),
  ADD CONSTRAINT questions_type_check CHECK (question_type IN ('mcq','truefalse','fillblank','matching'));