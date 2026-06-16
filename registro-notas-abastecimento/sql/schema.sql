-- Schema do banco de dados (Vercel Postgres / Neon)
-- Execute no SQL Editor do painel Vercel Storage, se preferir criar manualmente.

CREATE TABLE IF NOT EXISTS notas_abastecimento (
  id              TEXT PRIMARY KEY,
  data            DATE NOT NULL,
  pep             TEXT NOT NULL,
  placa           TEXT NOT NULL,
  combustivel     TEXT NOT NULL,
  quantidade      DECIMAL(10, 2) NOT NULL,
  valor_unitario  DECIMAL(10, 2) NOT NULL,
  valor_total     DECIMAL(10, 2) NOT NULL,
  nota_fiscal     TEXT NOT NULL,
  posto           TEXT NOT NULL,
  observacoes     TEXT DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notas_data ON notas_abastecimento (data DESC);
CREATE INDEX IF NOT EXISTS idx_notas_pep ON notas_abastecimento (pep);
CREATE INDEX IF NOT EXISTS idx_notas_placa ON notas_abastecimento (placa);
CREATE INDEX IF NOT EXISTS idx_notas_combustivel ON notas_abastecimento (combustivel);
