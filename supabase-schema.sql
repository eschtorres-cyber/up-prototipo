-- UP App · Schema completo
-- Ejecutar en Supabase SQL Editor

-- ── PROFILES ─────────────────────────────────────────
CREATE TABLE profiles (
  id        UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name      TEXT,
  role      TEXT,
  norte     TEXT,
  horizonte TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Solo tu perfil" ON profiles FOR ALL USING (auth.uid() = id);

-- ── HITOS ────────────────────────────────────────────
CREATE TABLE hitos (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users ON DELETE CASCADE,
  texto      TEXT NOT NULL,
  completado BOOLEAN DEFAULT FALSE,
  orden      INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE hitos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Solo tus hitos" ON hitos FOR ALL USING (auth.uid() = user_id);

-- ── ENTRADAS DE DIARIO ────────────────────────────────
CREATE TABLE entradas (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users ON DELETE CASCADE,
  texto       TEXT NOT NULL,
  tags        TEXT[],
  sintesis_up TEXT,
  semana      TEXT,  -- formato "2026-W15"
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE entradas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Solo tus entradas" ON entradas FOR ALL USING (auth.uid() = user_id);

-- ── RESUMENES SEMANALES ───────────────────────────────
CREATE TABLE resumenes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users ON DELETE CASCADE,
  semana      TEXT NOT NULL,
  avances     JSONB,
  para_llevar JSONB,
  intencion   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE resumenes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Solo tus resumenes" ON resumenes FOR ALL USING (auth.uid() = user_id);

-- ── LOGROS ───────────────────────────────────────────
CREATE TABLE logros (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users ON DELETE CASCADE,
  titulo      TEXT NOT NULL,
  descripcion TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE logros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Solo tus logros" ON logros FOR ALL USING (auth.uid() = user_id);

-- ── TRIGGER: crear perfil al registrarse ──────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
