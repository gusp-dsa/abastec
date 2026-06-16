/**
 * api/registros/[id].js
 * GET    /api/registros/:id — busca um registro
 * PUT    /api/registros/:id — atualiza um registro
 * DELETE /api/registros/:id — exclui um registro
 */

import { ensureTable, getRegistroById, updateRegistro, deleteRegistro } from '../../lib/db.js';

function parseBody(req) {
  if (!req.body) return {};
  return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'ID não informado' });
  }

  try {
    await ensureTable();

    if (req.method === 'GET') {
      const registro = await getRegistroById(id);
      if (!registro) {
        return res.status(404).json({ error: 'Registro não encontrado' });
      }
      return res.status(200).json(registro);
    }

    if (req.method === 'PUT') {
      const body = parseBody(req);
      const required = ['data', 'pep', 'placa', 'combustivel', 'quantidade', 'valorUnitario', 'notaFiscal', 'posto'];

      for (const field of required) {
        if (body[field] === undefined || body[field] === null || body[field] === '') {
          return res.status(400).json({ error: 'Campo obrigatório: ' + field });
        }
      }

      const updated = await updateRegistro(id, {
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

      if (!updated) {
        return res.status(404).json({ error: 'Registro não encontrado' });
      }

      return res.status(200).json(updated);
    }

    if (req.method === 'DELETE') {
      const removed = await deleteRegistro(id);
      if (!removed) {
        return res.status(404).json({ error: 'Registro não encontrado' });
      }
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Método não permitido' });
  } catch (error) {
    console.error('[/' + req.method + ' /api/registros/' + id + ']', error);
    return res.status(500).json({ error: error.message || 'Erro interno do servidor' });
  }
}
