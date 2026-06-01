# Phase 2 (deferred)

Planned production additions:

- **Postgres + pgvector** — user accounts, session history, bullet-level embeddings
- **OCR pipeline** — scanned PDF ingestion via Unstructured or Tesseract
- **Auth** — Clerk/Auth.js with session ownership
- **Human review dashboard** — queue for low-confidence validations

MVP uses Redis (optional) + in-memory session store and OpenAI embeddings cached in-process.
