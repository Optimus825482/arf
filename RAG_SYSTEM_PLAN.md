# ARF RAG Kalıcı Hafıza Sistemi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Durum güncellemesi (2026-04-24):** RAG çekirdeği, belge extraction, chunking, gerçek GGUF embedding adaptörü, DB upsert ingestion, retrieval katmanı, korumalı `/api/rag/query` endpoint'i ve uygulama entegrasyonları eklendi. `node-llama-cpp` ile `embeddinggemma-300M-Q8_0.gguf` doğrudan yükleniyor; ayrı `llama-server` gerekmiyor. Güncel doğrulama: `npm run rag:build` geçti ve `scripts/rag/llama-embedding-wrapper.mjs` gerçek modelden `768` boyutlu embedding üretti. Kalan ana işler: tüm belge setinde gerçek ingestion, retrieval kalite smoke testi, `rag_seed.sql` dump ve sunucu restore.

Durum işaretleri:

```text
[x] tamamlandı
[~] kısmen tamamlandı / temel altyapı var
[ ] kaldı
```

**Goal:** `D:\arf\research_lab\matematik_belgeler_2` ve `D:\arf\research_lab\Matematik_Egitimi_Belgeleri` içindeki matematik eğitimi belgelerini yerel modellerle vektörleştirip PostgreSQL/pgvector üzerinde kalıcı, sunucuya taşınabilir ve uygulama içinden kullanılabilir bir RAG bilgi tabanı kurmak.

**Architecture:** Belgeler lokal ingestion pipeline ile çıkarılır, temizlenir, chunk edilir, yerel embedding modeliyle vektörleştirilir ve `rag_documents` / `rag_chunks` tablolarına idempotent olarak yazılır. Uygulama tarafında küçük bir retrieval katmanı, öğrenci/veli/AI akışlarına gerektiğinde bağlam döndürür. Üretimde tekrar embedding yapmak yerine hazırlanmış PostgreSQL dump veya SQL batch sunucuya yüklenir.

**Tech Stack:** Next.js 15, TypeScript, PostgreSQL, pgvector, mevcut `lib/db.ts`, mevcut `init-db.sql`, Node ingestion scriptleri, `node-llama-cpp`, yerel GGUF embedding modeli, opsiyonel reranker.

---

## Mevcut Durum

`init-db.sql` içinde `vector`, `rag_documents` ve `rag_chunks` tabloları mevcut. RAG chunk embedding kolonu `vector(768)` olarak sabitlendi; bu boyut `embeddinggemma-300M-Q8_0.gguf` gerçek çıktısıyla doğrulandı.

Güncel uygulama durumu: `rag_documents` / `rag_chunks` şeması güçlendirildi; `file_hash`, `content_hash`, `embedding_model`, `embedding_dim`, `ingestion_status`, `last_ingested_at` ve ilgili RAG indeksleri eklendi.

Belge dizinleri hedef olarak:

```text
D:\arf\research_lab\matematik_belgeler_2
D:\arf\research_lab\Matematik_Egitimi_Belgeleri
```

Linux/WSL karşılığı:

```text
/mnt/d/arf/research_lab/matematik_belgeler_2
/mnt/d/arf/research_lab/Matematik_Egitimi_Belgeleri
```

## Tasarım Kararları

Embedding ve ingestion lokal çalışacak. Sunucuya canlı belge işleme yükü taşınmayacak.

DB yazımı idempotent olacak: aynı `source_path + file_hash` tekrar çalıştırıldığında duplicate üretmeyecek, değişen belgeyi yeniden chunk edecektir.

Chunk metadata zengin tutulacak: `source_path`, `source_dir`, `page`, `section`, `chunk_index`, `file_hash`, `model_name`, `embedding_dim`, `language`, `topic`.

Retrieval varsayılanı dar ve güvenli olacak: topK `6`, minimum similarity `0.25`, maksimum context karakteri `6000`. Pedagojik cevaplarda kaynak başlığı ve kısa alıntı metadata olarak tutulacak; öğrenciye uzun ham metin basılmayacak.

## Önerilen Dosya Yapısı

```text
scripts/rag/
  inventory.ts              # belge ve lokal model envanteri
  extract.ts                # pdf/docx/txt/md metin çıkarımı
  chunk.ts                  # temizleme ve chunk üretimi
  embed.ts                  # lokal embedding modeli adaptörü
  ingest.ts                 # DB upsert pipeline
  verify.ts                 # kalite ve retrieval smoke test

lib/rag/
  types.ts                  # ortak RAG tipleri
  retrieve.ts               # pgvector arama API'si
  context.ts                # LLM prompt context formatlayıcı

app/api/rag/query/route.ts  # korumalı retrieval endpoint

tests/rag/
  chunk.test.ts
  retrieve.test.ts
```

Güncel dosya durumu:

```text
scripts/rag/
  inventory.ts              # eklendi
  extract.ts                # eklendi; txt/md/html/pdf/docx çıkarımı hazır
  chunk.ts                  # eklendi
  embed.ts                  # eklendi; gerçek external runtime + deterministic 768 fallback
  ingest.ts                 # eklendi; dry-run ve temel DB write yolu
  verify.ts                 # eklendi
  types.ts                  # eklendi
  llama-embedding-wrapper.mjs # eklendi; node-llama-cpp + GGUF embedding runner

lib/rag/
  types.ts                  # eklendi
  embeddings.ts             # eklendi
  retrieve.ts               # eklendi
  context.ts                # eklendi; PEDAGOGICAL_BASE + RAG birleşik context

tests/rag/
  inventory-ingest.test.ts  # eklendi
  retrieve-context.test.ts  # eklendi
  route-integration.test.ts # eklendi

app/api/rag/query/route.ts  # eklendi; auth + rate limit + schema validation
```

## Faz 1: Envanter ve Model Boyutu

- [x] Belge dizinlerinin varlığını ve dosya türlerini raporla.

Komut:

```bash
find /mnt/d/arf/research_lab/matematik_belgeler_2 /mnt/d/arf/research_lab/Matematik_Egitimi_Belgeleri -maxdepth 3 -type f | sed 's/.*//g' | sort | uniq -c
```

Beklenen çıktı: PDF/DOCX/TXT/MD gibi dosya türleri sayılmış olmalı.

Gerçekleşen ölçüm: hedef klasörlerde `110 pdf` ve `10 html` görüldü.

- [x] Lokal model dizinlerini ve embedding boyutunu belirle.

Kontrol edilmesi gereken bilgi:

```text
model_name
embedding_dim
model_path
runtime: python | node | onnx | sentence-transformers | llama.cpp
```

Doğrulanmış karar:

```text
model_name: hf_ggml-org_embeddinggemma-300M-Q8_0
embedding_dim: 768
model_path: D:\arf\research_lab\models\hf_ggml-org_embeddinggemma-300M-Q8_0.gguf
runtime: node-llama-cpp
```

Güncel karar: `D:\arf\research_lab\models\hf_ggml-org_embeddinggemma-300M-Q8_0.gguf` mevcut. `scripts/rag/llama-embedding-wrapper.mjs`, `node-llama-cpp` ile GGUF modeli doğrudan yükler, stdin metnini embed eder ve stdout'a JSON float array basar. Smoke test çıktısı `length=768` verdi. `RAG_EMBED_DIM=768`, `rag_chunks.embedding vector(768)` ve `embedding_dim DEFAULT 768` aynı boyutta hizalıdır. Runtime tanımlı değilse deterministic fallback devam eder; production ingestion için gerçek runtime env'i açık kalmalıdır.

## Faz 2: Şema Sertleştirme

- [x] `init-db.sql` için migration planı çıkar.

Gerekli ek alanlar:

```sql
ALTER TABLE rag_documents
ADD COLUMN IF NOT EXISTS file_hash TEXT,
ADD COLUMN IF NOT EXISTS ingestion_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS last_ingested_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE rag_chunks
ADD COLUMN IF NOT EXISTS content_hash TEXT,
ADD COLUMN IF NOT EXISTS embedding_model TEXT,
ADD COLUMN IF NOT EXISTS embedding_dim INTEGER;

CREATE INDEX IF NOT EXISTS idx_rag_documents_file_hash ON rag_documents(file_hash);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_metadata_gin ON rag_chunks USING gin(metadata);
```

Uygulananlar: `file_hash`, `content_hash`, `embedding_model`, `embedding_dim`, `ingestion_status`, `last_ingested_at`, `idx_rag_chunks_metadata_gin`, model/dim indexleri ve `vector(768)` ivfflat index eklendi.

- [x] Eğer embedding boyutu değişirse `vector(N)` ve indeksler için ayrı migration yaz.

Not: RAG embedding boyutu `768` olarak netleşti. Gelecekte model değişirse `rag_chunks.embedding vector(N)`, `RAG_EMBED_DIM`, wrapper smoke testi ve dump/restore prosedürü birlikte güncellenmeli.

## Faz 3: Belge Çıkarma Pipeline

- [x] `scripts/rag/extract.ts` veya Python eşleniği oluştur.

Desteklenecek minimum formatlar:

```text
.pdf  -> sayfa bazlı text
.docx -> paragraf bazlı text
.txt  -> düz text
.md   -> markdown text
```

Çıktı tipi:

```ts
type ExtractedDocument = {
  sourcePath: string;
  sourceDir: string;
  sourceType: string;
  title: string;
  fileHash: string;
  extractedText: string;
  pages?: Array<{ page: number; text: string }>;
  metadata: Record<string, unknown>;
};
```

- [x] Boş veya OCR gerektiren belgeleri `ingestion_status='needs_ocr'` olarak işaretle.

Güncel durum: `txt`, `md`, `html`, `pdf` ve `docx` çıkarımı hazır. `pdf` için önce opsiyonel Microsoft MarkItDown CLI (`MARKITDOWN_CMD`, varsayılan `markitdown`) deneniyor; kurulu değilse basit metin-PDF literal fallback kullanılıyor. Metin çıkmayan scan/OCR gerektiren PDF'ler `needs_ocr` olarak raporlanıyor ve DB tarafında `ingestion_status` alanına yazılabiliyor. `docx` için ZIP içindeki `word/document.xml` okunarak paragraf bazlı text çıkarımı yapılıyor; geçersiz/metinsiz DOCX `unsupported` kalıyor.

## Faz 4: Chunk ve Metadata

- [x] `scripts/rag/chunk.ts` içinde deterministic chunk üret.

Önerilen ayarlar:

```text
chunk_size: 900-1200 token estimate
overlap: 120-180 token estimate
minimum_chunk_chars: 300
```

Chunk tipi:

```ts
type RagChunk = {
  chunkIndex: number;
  title: string;
  content: string;
  tokenEstimate: number;
  contentHash: string;
  metadata: {
    sourcePath: string;
    sourceDir: string;
    pageStart?: number;
    pageEnd?: number;
    topic?: string;
  };
};
```

- [~] Matematik eğitimi konu etiketleri için basit ilk sınıflandırma ekle.

Başlangıç topic listesi:

```text
problem_cozme
sayi_duyusu
mental_math
islem_akiciligi
olcme_degerlendirme
pedagoji
motivasyon
veli_rehberligi
```

Güncel durum: deterministic chunk ve topic sınıflandırma eklendi; testlerde determinism doğrulandı. Topic listesi planla birebir aynı kapsamda genişletilmedi, başlangıç sınıflandırması mevcut.

## Faz 5: Lokal Embedding ve Ingestion

- [x] `scripts/rag/embed.ts` içinde tek fonksiyonlu adaptör yaz.

Arayüz:

```ts
type Embedder = {
  modelName: string;
  embeddingDim: number;
  embedTexts(texts: string[]): Promise<number[][]>;
};
```

- [x] `scripts/rag/ingest.ts` idempotent çalışmalı.

Akış:

```text
1. belgeyi oku
2. hash hesapla
3. aynı source_path ve file_hash varsa atla
4. text çıkar
5. chunk üret
6. batch embedding al
7. transaction içinde rag_documents upsert
8. eski chunkları sil
9. yeni chunkları bulk insert
10. chunk_count ve last_ingested_at güncelle
```

- [x] Büyük belge setinde batch boyutu ve retry sınırı ekle.

Başlangıç değerleri:

```text
embedding_batch_size=16
db_insert_batch_size=100
max_retries=3
```

Güncel durum: external GGUF/runtime embedding adaptörü, `RAG_EMBED_DIM` boyut doğrulaması, deterministic fallback, dry-run ingestion ve transaction içinde DB upsert eklendi. Büyük belge seti için `batchSize`, `maxRetries`, `resume` ve progress callback/CLI stderr log davranışı eklendi. Gerçek tüm belge ingestion henüz yapılmadı.

## Faz 6: Retrieval Katmanı

- [x] `lib/rag/retrieve.ts` oluştur.

Fonksiyon:

```ts
export async function retrieveRagContext(input: {
  query: string;
  topic?: string;
  limit?: number;
  minSimilarity?: number;
}): Promise<Array<{
  content: string;
  similarity: number;
  title: string;
  sourcePath: string;
  metadata: Record<string, unknown>;
}>>;
```

SQL iskeleti:

```sql
SELECT
  c.content,
  c.metadata,
  d.title,
  d.source_path,
  1 - (c.embedding <=> $1::vector) AS similarity
FROM rag_chunks c
JOIN rag_documents d ON d.id = c.document_id
WHERE ($2::text IS NULL OR d.topic = $2 OR c.metadata->>'topic' = $2)
ORDER BY c.embedding <=> $1::vector
LIMIT $3;
```

- [x] `lib/rag/context.ts` içinde LLM için kısa kaynaklı context formatı üret.

Format:

```text
[RAG Kaynak 1 | başlık | skor 0.82]
kısa chunk içeriği
```

Güncel durum: `retrieveRagContext()` DB yoksa `[]` döner, deterministic query embedding kullanır, `topK/limit`, `minSimilarity`, `maxContextChars/maxChars` guard'ları vardır. `context.ts`, `PEDAGOGICAL_BASE` ile RAG kaynaklarını sanitize edilmiş kısa LLM context olarak birleştirir.

## Faz 7: Uygulama Entegrasyonu

- [x] İlk entegrasyon noktası olarak `app/api/student/route.ts` seç.

Kullanım prensibi:

```text
placement, action plan, learning path, taktik önerisi veya veli briefing üretirken kullanıcı metriğine göre kısa RAG query oluştur.
RAG sonucu yoksa mevcut pedagojik bilgi tabanı ile devam et.
RAG hiçbir zaman ana akışı bozmasın.
```

- [x] İkinci entegrasyon noktası olarak `app/api/deepseek-briefing/route.ts` değerlendir.

Amaç:

```text
Veli raporuna kaynak destekli kısa pedagojik öneri eklemek.
```

Ek entegrasyon: `app/api/missions/route.ts` günlük görev üretimine `PEDAGOJIK/RAG SINYALI` eklendi. RAG helper hata verirse veya DB boşsa ana akış fallback ile devam eder.

## Faz 8: Test ve Kalite Kapıları

- [x] Chunk testleri:

```text
aynı input aynı chunk hashlerini üretir
chunk minimum karakter sınırını korur
overlap boş veya aşırı büyük değildir
```

- [x] Retrieval testleri:

```text
boş sonuçta [] döner
topic filter SQL parametresi doğru kurulur
minSimilarity altında kalanlar filtrelenir
```

- [~] Ingestion smoke test:

```bash
npm run rag:inventory
npm run rag:ingest -- --dry-run
npm run rag:verify -- --query "zihinden hızlı işlem akıcılığı nasıl gelişir?"
```

Başarı kriteri:

```text
dry-run belge/chunk sayısı üretir
verify en az 3 kaynak döndürür
ortalama similarity raporlanır
duplicate chunk oluşmaz
```

Güncel doğrulama: `tests/rag/inventory-ingest.test.ts`, `tests/rag/retrieve-context.test.ts`, `tests/rag/route-integration.test.ts` ve `tests/rag/cli-runner.test.ts` eklendi. Önceki genel doğrulamada `npx vitest run` 11 dosya / 34 test geçti ve `npx tsc --noEmit --incremental false` geçti. Güncel ek doğrulamada `npm run rag:build` geçti; wrapper gerçek GGUF modelden `length=768` embedding üretti. Tüm belge seti için gerçek dry-run / ingestion / verify smoke henüz çalıştırılmadı.

## Faz 9: Sunucuya Hazır DB Taşıma

- [ ] Lokal ingestion tamamlandıktan sonra sadece RAG tablolarını dump et.

Komut iskeleti:

```bash
pg_dump "$DATABASE_URL" \
  --data-only \
  --table=rag_documents \
  --table=rag_chunks \
  --file=rag_seed.sql
```

- [ ] Sunucuda önce schema, sonra data yükle.

Sıra:

```text
1. pgvector extension aktif mi kontrol et
2. init-db.sql veya migrationları çalıştır
3. rag_seed.sql yükle
4. vector indexleri ANALYZE et
5. retrieval smoke test çalıştır
```

Güncel durum: gerçek lokal ingestion tamamlanmadığı için dump/restore aşamasına geçilmedi.

## Riskler ve Guardrail

Embedding boyutu bilinmeden schema sabitlenmemeli.

OCR gerektiren PDF’ler ingestion kalitesini düşürebilir; bunlar ayrı raporlanmalı.

Kaynak belgeler telif/mahremiyet açısından kontrol edilmeli; öğrenciye ham uzun alıntı gösterilmemeli.

RAG bağlamı LLM cevabını desteklemeli, uygulama kararlarını tek başına belirlememeli.

Sunucuda embedding modeli çalıştırılmayacaksa query embedding stratejisi netleşmeli. Mevcut kod `retrieveRagContext()` çağrısında query embedding üretmek için aynı `RAG_EMBEDDING_CMD=node` ve `RAG_EMBEDDING_ARGS=scripts/rag/llama-embedding-wrapper.mjs` mekanizmasını kullanır; sunucuda bu runtime çalışmayacaksa retrieval için aynı embedding runner kurulmalı veya query embedding'i ayrı bir endpoint/service üzerinden sağlanmalıdır.

## İlk Uygulama Sırası

- [x] Envanter scripti.
- [x] Embedding model boyutu doğrulama.
- [x] Schema migration netleştirme.
- [x] Dry-run ingestion altyapısı.
- [ ] Gerçek ingestion.
- [x] Retrieval fonksiyonu.
- [x] Student route içinde pasif/fallback güvenli entegrasyon.
- [ ] Dump ve sunucu restore prosedürü.

## Kalan İşler

- [x] `scripts/rag` için çalışır CLI runner ekle (`tsx`, build edilmiş JS veya package scriptleri).
- [x] HTML text extraction ekle.
- [x] PDF text extraction ekle; scan/OCR gerekenleri ayrı `needs_ocr` raporla.
- [x] DOCX paragraf extraction ekle.
- [x] GGUF `embeddinggemma-300M` için gerçek embedding runtime ve embedding boyut doğrulaması yap.
- [x] Schema'ya `ingestion_status`, `last_ingested_at`, `idx_rag_chunks_metadata_gin` ekle veya ayrı migration dosyası oluştur.
- [x] `scripts/rag/ingest.ts` gerçek DB transaction/upsert yolunu production-grade hale getir.
- [x] Büyük belge seti için batch size, retry, progress log ve resume davranışı ekle.
- [x] `app/api/rag/query/route.ts` korumalı retrieval endpoint'ini ekle.
- [ ] Tüm belge setinde gerçek dry-run çalıştır ve raporu kaydet.
- [ ] Tüm belge setinde gerçek ingestion çalıştır.
- [ ] `npm run rag:verify -- --query "zihinden hızlı işlem akıcılığı nasıl gelişir?"` ile gerçek DB retrieval smoke testini çalıştır.
- [ ] `rag_seed.sql` dump ve sunucu restore prosedürünü uygula.

## Tamamlanma Kriteri

Bu plan tamamlandığında lokal PostgreSQL içinde tüm matematik belgeleri chunk ve embedding olarak bulunacak, `retrieveRagContext()` query ile ilgili kaynakları döndürecek, uygulama LLM promptlarına güvenli kısa RAG bağlamı ekleyebilecek ve hazırlanmış RAG tabloları sunucuya taşınabilir durumda olacaktır.





, "StitchMCP": {

   "command": "npx",

   "args": [

​    "-y",

​    "mcp-remote",

​    "https://stitch.googleapis.com/mcp",

​    "--header",

​    "X-Goog-Api-Key: ${STITCH_API_KEY}"

   ]

  }
