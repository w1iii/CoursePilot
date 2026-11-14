-- RAG vector store. Access only through trusted server-side database roles.
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.documents (
  id varchar(255) PRIMARY KEY,
  course_key varchar(64) NOT NULL CHECK (length(course_key) > 0),
  course_id bigint NOT NULL CHECK (course_id > 0),
  module_id bigint CHECK (module_id IS NULL OR module_id > 0),
  owner_id varchar(255),
  source_fingerprint varchar(64),
  title varchar(1024) NOT NULL,
  source_type varchar(16) NOT NULL CHECK (source_type IN ('pdf', 'html', 'pptx', 'spreadsheet', 'word', 'text')),
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_documents_course_key_module
  ON public.documents (course_key, module_id);

CREATE TABLE IF NOT EXISTS public.chunks (
  id varchar(255) PRIMARY KEY,
  document_id varchar(255) NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  course_key varchar(64) NOT NULL CHECK (length(course_key) > 0),
  course_id bigint NOT NULL CHECK (course_id > 0),
  module_id bigint CHECK (module_id IS NULL OR module_id > 0),
  title varchar(1024) NOT NULL,
  source_type varchar(16) NOT NULL CHECK (source_type IN ('pdf', 'html', 'pptx', 'spreadsheet', 'word', 'text')),
  content text NOT NULL,
  chunk_index integer NOT NULL CHECK (chunk_index >= 0),
  embedding vector(1536) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_chunks_document_chunk_index UNIQUE (document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS ix_chunks_course_key_module
  ON public.chunks (course_key, module_id);
CREATE INDEX IF NOT EXISTS ix_chunks_embedding_hnsw
  ON public.chunks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chunks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.documents, public.chunks FROM anon, authenticated;
GRANT ALL ON public.documents, public.chunks TO service_role;
