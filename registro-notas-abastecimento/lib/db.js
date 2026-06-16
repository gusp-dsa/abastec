/**
 * lib/db.js
 * Conexão e operações com Vercel Postgres
 */

import { sql } from '@vercel/postgres';

let tableReady = false;

/**
 * Garante que a tabela existe (criação automática na primeira requisição)
 */
export async function ensureTable() {
  if (tableReady) return;

  await sql`
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
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_notas_data ON notas_abastecimento (data DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_notas_pep ON notas_abastecimento (pep)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_notas_placa ON notas_abastecimento (placa)`;

  tableReady = true;
}

/**
 * Converte linha do banco (snake_case) para objeto da aplicação (camelCase)
 */
export function mapRowToRecord(row) {
  const dataValue = row.data instanceof Date
    ? row.data.toISOString().split('T')[0]
    : String(row.data).split('T')[0];

  return {
    id: row.id,
    data: dataValue,
    pep: row.pep,
    placa: row.placa,
    combustivel: row.combustivel,
    quantidade: parseFloat(row.quantidade),
    valorUnitario: parseFloat(row.valor_unitario),
    valorTotal: parseFloat(row.valor_total),
    notaFiscal: row.nota_fiscal,
    posto: row.posto,
    observacoes: row.observacoes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function generateId() {
  return 'reg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}

/**
 * Lista todos os registros
 */
export async function getAllRegistros() {
  const { rows } = await sql`
    SELECT * FROM notas_abastecimento
    ORDER BY data DESC, created_at DESC
  `;
  return rows.map(mapRowToRecord);
}

/**
 * Busca registro por ID
 */
export async function getRegistroById(id) {
  const { rows } = await sql`
    SELECT * FROM notas_abastecimento WHERE id = ${id}
  `;
  return rows.length ? mapRowToRecord(rows[0]) : null;
}

/**
 * Cria um novo registro
 */
export async function createRegistro(data) {
  const id = generateId();
  const valorTotal = Math.round(data.quantidade * data.valorUnitario * 100) / 100;

  await sql`
    INSERT INTO notas_abastecimento (
      id, data, pep, placa, combustivel, quantidade,
      valor_unitario, valor_total, nota_fiscal, posto, observacoes
    ) VALUES (
      ${id}, ${data.data}, ${data.pep}, ${data.placa}, ${data.combustivel},
      ${data.quantidade}, ${data.valorUnitario}, ${valorTotal},
      ${data.notaFiscal}, ${data.posto}, ${data.observacoes || ''}
    )
  `;

  return getRegistroById(id);
}

/**
 * Atualiza um registro existente
 */
export async function updateRegistro(id, data) {
  const existing = await getRegistroById(id);
  if (!existing) return null;

  const valorTotal = Math.round(data.quantidade * data.valorUnitario * 100) / 100;

  await sql`
    UPDATE notas_abastecimento SET
      data = ${data.data},
      pep = ${data.pep},
      placa = ${data.placa},
      combustivel = ${data.combustivel},
      quantidade = ${data.quantidade},
      valor_unitario = ${data.valorUnitario},
      valor_total = ${valorTotal},
      nota_fiscal = ${data.notaFiscal},
      posto = ${data.posto},
      observacoes = ${data.observacoes || ''},
      updated_at = NOW()
    WHERE id = ${id}
  `;

  return getRegistroById(id);
}

/**
 * Remove um registro
 */
export async function deleteRegistro(id) {
  const result = await sql`
    DELETE FROM notas_abastecimento WHERE id = ${id}
  `;
  return result.rowCount > 0;
}
