/**
 * api/registros/index.js
 * GET  /api/registros — lista todos os registros
 * POST /api/registros — cria um novo registro
 */

import { ensureTable, getAllRegistros, createRegistro } from '../../lib/db.js';

function parseBody(req) {
  if (!req.body) return {};
  return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    await ensureTable();

    if (req.method === 'GET') {
      const registros = await getAllRegistros();
      return res.status(200).json(registros);
    }

    if (req.method === 'POST') {
      const body = parseBody(req);
      const required = ['data', 'pep', 'placa', 'combustivel', 'quantidade', 'valorUnitario', 'notaFiscal', 'posto'];

      for (const field of required) {
        if (body[field] === undefined || body[field] === null || body[field] === '') {
          return res.status(400).json({ error: 'Campo obrigatório: ' + field });
        }
      }

      const registro = await createRegistro({
        data: body.data,
        pep: String(body.pep).toUpperCase(),
        placa: String(body.placa).toUpperCase(),
        combustivel: body.combustivel,
        quantidade: parseFloat(body.quantidade),
        valorUnitario: parseFloat(body.valorUnitario),
        notaFiscal: body.notaFiscal,
        posto: body.posto,
        observacoes: body.observacoes || ''
      });

      return res.status(201).json(registro);
    }

    return res.status(405).json({ error: 'Método não permitido' });
  } catch (error) {
    console.error('[GET/POST /api/registros]', error);
    return res.status(500).json({ error: error.message || 'Erro interno do servidor' });
  }
}
