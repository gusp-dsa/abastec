/**
 * storage.js
 * Camada de comunicação com a API REST (Vercel Postgres)
 */

const StorageManager = (function () {
  'use strict';

  const API_BASE = '/api/registros';

  /**
   * Executa requisição HTTP à API
   */
  async function request(url, options) {
    const response = await fetch(url, Object.assign({
      headers: { 'Content-Type': 'application/json' }
    }, options));

    if (!response.ok) {
      var errorBody = {};
      try {
        errorBody = await response.json();
      } catch (e) { /* resposta sem JSON */ }
      throw new Error(errorBody.error || 'Erro ao comunicar com o servidor (HTTP ' + response.status + ')');
    }

    if (response.status === 204) return null;
    return response.json();
  }

  /**
   * Recupera todos os registros do banco de dados
   * @returns {Promise<Array>}
   */
  async function getAll() {
    return request(API_BASE);
  }

  /**
   * Busca um registro pelo ID
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async function getById(id) {
    try {
      return await request(API_BASE + '/' + encodeURIComponent(id));
    } catch (error) {
      if (error.message.indexOf('404') !== -1 || error.message.indexOf('não encontrado') !== -1) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Adiciona um novo registro
   * @param {Object} registro
   * @returns {Promise<Object>}
   */
  async function add(registro) {
    return request(API_BASE, {
      method: 'POST',
      body: JSON.stringify(registro)
    });
  }

  /**
   * Atualiza um registro existente
   * @param {string} id
   * @param {Object} dados
   * @returns {Promise<Object|null>}
   */
  async function update(id, dados) {
    try {
      return await request(API_BASE + '/' + encodeURIComponent(id), {
        method: 'PUT',
        body: JSON.stringify(dados)
      });
    } catch (error) {
      if (error.message.indexOf('não encontrado') !== -1) return null;
      throw error;
    }
  }

  /**
   * Remove um registro pelo ID
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async function remove(id) {
    try {
      await request(API_BASE + '/' + encodeURIComponent(id), { method: 'DELETE' });
      return true;
    } catch (error) {
      if (error.message.indexOf('não encontrado') !== -1) return false;
      throw error;
    }
  }

  /**
   * Retorna estatísticas agregadas dos registros
   * @param {Array} registros
   * @returns {Object}
   */
  function getStats(registros) {
    var lista = registros || [];

    var stats = {
      totalRegistros: lista.length,
      totalGasto: 0,
      totalLitros: 0,
      porCombustivel: {}
    };

    lista.forEach(function (reg) {
      stats.totalGasto += reg.valorTotal || 0;
      stats.totalLitros += reg.quantidade || 0;

      var comb = reg.combustivel || 'Outros';
      if (!stats.porCombustivel[comb]) {
        stats.porCombustivel[comb] = { quantidade: 0, valor: 0, count: 0 };
      }
      stats.porCombustivel[comb].quantidade += reg.quantidade || 0;
      stats.porCombustivel[comb].valor += reg.valorTotal || 0;
      stats.porCombustivel[comb].count += 1;
    });

    return stats;
  }

  return {
    getAll: getAll,
    getById: getById,
    add: add,
    update: update,
    remove: remove,
    getStats: getStats
  };
})();
