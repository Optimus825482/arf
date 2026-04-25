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

-- 5. RAG source documents
CREATE TABLE IF NOT EXISTS rag_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_path TEXT NOT NULL UNIQUE,
    source_type TEXT NOT NULL,
    title TEXT NOT NULL,
    topic TEXT,
    authors JSONB,
    publication_year INTEGER,
    doi TEXT,
    metadata JSONB,
    file_hash TEXT,
    content_hash TEXT,
    extracted_text TEXT NOT NULL,
    summary TEXT,
    chunk_count INTEGER DEFAULT 0,
    ingestion_status TEXT NOT NULL DEFAULT 'pending',
    last_ingested_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE IF EXISTS rag_documents
ADD COLUMN IF NOT EXISTS ingestion_status TEXT NOT NULL DEFAULT 'pending';

ALTER TABLE IF EXISTS rag_documents
ADD COLUMN IF NOT EXISTS last_ingested_at TIMESTAMP WITH TIME ZONE;

-- 6. RAG chunks with embeddings
CREATE TABLE IF NOT EXISTS rag_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    token_estimate INTEGER,
    metadata JSONB,
    content_hash TEXT,
    embedding_model TEXT DEFAULT 'hf_ggml-org_embeddinggemma-300M-Q8_0',
    embedding_dim INTEGER DEFAULT 768,
    embedding vector(768),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(document_id, chunk_index)
);

DROP TRIGGER IF EXISTS update_rag_documents_updated_at ON rag_documents;
CREATE TRIGGER update_rag_documents_updated_at
BEFORE UPDATE ON rag_documents
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- RAG indexes
CREATE INDEX IF NOT EXISTS idx_rag_documents_topic ON rag_documents(topic);
CREATE INDEX IF NOT EXISTS idx_rag_documents_year ON rag_documents(publication_year);
CREATE INDEX IF NOT EXISTS idx_rag_documents_file_hash ON rag_documents(file_hash);
CREATE INDEX IF NOT EXISTS idx_rag_documents_content_hash ON rag_documents(content_hash);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_document_chunk_index ON rag_chunks(document_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_content_hash ON rag_chunks(content_hash);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_metadata_gin ON rag_chunks USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_embedding_model_dim ON rag_chunks(embedding_model, embedding_dim);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_embedding_ivfflat
ON rag_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
