-- ARF Hyper-Cognitive Database Schema (Phase 3)
-- PostgreSQL + pgvector required

-- Required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Student profile memory anchor
CREATE TABLE IF NOT EXISTS student_profiles (
    uid TEXT PRIMARY KEY,
    username TEXT,
    rank TEXT DEFAULT 'Acemi Pilot',
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    metrics JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. L2 Episodic Memory
CREATE TABLE IF NOT EXISTS episodic_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uid TEXT NOT NULL REFERENCES student_profiles(uid) ON DELETE CASCADE,
    event_context TEXT NOT NULL,
    action_taken TEXT,
    outcome TEXT NOT NULL DEFAULT 'neutral',
    embedding vector(1536),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. L3 Semantic Graph Nodes
CREATE TABLE IF NOT EXISTS cognitive_nodes (
    id TEXT PRIMARY KEY,
    uid TEXT NOT NULL REFERENCES student_profiles(uid) ON DELETE CASCADE,
    label TEXT NOT NULL,
    strength FLOAT DEFAULT 0.0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. L3 Semantic Graph Edges
CREATE TABLE IF NOT EXISTS cognitive_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uid TEXT NOT NULL REFERENCES student_profiles(uid) ON DELETE CASCADE,
    source_node TEXT NOT NULL REFERENCES cognitive_nodes(id) ON DELETE CASCADE,
    target_node TEXT NOT NULL REFERENCES cognitive_nodes(id) ON DELETE CASCADE,
    relation_type TEXT NOT NULL,
    weight FLOAT DEFAULT 0.5,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Common timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_student_profiles_updated_at ON student_profiles;
CREATE TRIGGER update_student_profiles_updated_at
BEFORE UPDATE ON student_profiles
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_cognitive_nodes_updated_at ON cognitive_nodes;
CREATE TRIGGER update_cognitive_nodes_updated_at
BEFORE UPDATE ON cognitive_nodes
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_cognitive_edges_updated_at ON cognitive_edges;
CREATE TRIGGER update_cognitive_edges_updated_at
BEFORE UPDATE ON cognitive_edges
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_student_profiles_rank ON student_profiles(rank);
CREATE INDEX IF NOT EXISTS idx_student_profiles_level ON student_profiles(level);
CREATE INDEX IF NOT EXISTS idx_episodic_memories_uid_created_at ON episodic_memories(uid, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cognitive_nodes_uid ON cognitive_nodes(uid);
CREATE INDEX IF NOT EXISTS idx_cognitive_nodes_uid_strength ON cognitive_nodes(uid, strength DESC);
CREATE INDEX IF NOT EXISTS idx_cognitive_edges_uid ON cognitive_edges(uid);
CREATE INDEX IF NOT EXISTS idx_cognitive_edges_source_target ON cognitive_edges(source_node, target_node);

-- Basic vector index placeholder for future semantic search
CREATE INDEX IF NOT EXISTS idx_episodic_memories_embedding_ivfflat
ON episodic_memories
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
