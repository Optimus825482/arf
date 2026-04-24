-- ARF Hyper-Cognitive Database Schema (Phase 3)
-- PostgreSQL + pgvector required

-- 1. pgvector eklentisini aktif et
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Öğrenci rütbe ve temel profil tablosu
CREATE TABLE IF NOT EXISTS student_profiles (
    uid TEXT PRIMARY KEY,
    username TEXT,
    rank TEXT DEFAULT 'Acemi Pilot',
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    metrics JSONB, -- Anlık metriklerin özeti
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. L2: Episodic Memory (Anısal Hafıza)
-- Her anı için bir vektör (1536 boyutlu - OpenAI/DeepSeek standartı)
CREATE TABLE IF NOT EXISTS episodic_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uid TEXT REFERENCES student_profiles(uid),
    event_context TEXT,
    action_taken TEXT,
    outcome TEXT,
    embedding vector(1536), -- Semantik arama için vektör alanı
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. L3: Semantic Graph Nodes (Kavram Düğümleri)
CREATE TABLE IF NOT EXISTS cognitive_nodes (
    id TEXT PRIMARY KEY, -- örn: 'concept_multiplication'
    uid TEXT REFERENCES student_profiles(uid),
    label TEXT,
    strength FLOAT DEFAULT 0.0, -- 0.0 - 1.0 arası gelişim seviyesi
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. L3: Semantic Graph Edges (İlişki Haritası)
CREATE TABLE IF NOT EXISTS cognitive_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uid TEXT REFERENCES student_profiles(uid),
    source_node TEXT REFERENCES cognitive_nodes(id),
    target_node TEXT REFERENCES cognitive_nodes(id),
    relation_type TEXT, -- 'TRIGGERS', 'IMPROVES', 'DEPENDS_ON'
    weight FLOAT DEFAULT 0.5,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Fonksiyon: updated_at sütununu otomatik güncelle
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_student_profiles_updated_at BEFORE UPDATE ON student_profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
