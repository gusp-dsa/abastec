/**
 * storage.js
 * Camada de armazenamento local (localStorage)
 */

const StorageManager = (function () {
  'use strict';

  const STORAGE_KEY = 'registros_abastecimento';

  /**
   * Carrega todos os registros do localStorage
   * @returns {Array}
   */
  function _carregar() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Persiste a lista de registros no localStorage
   * @param {Array} lista
   */
  function _salvar(lista) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
  }

  /**
   * Gera um ID único baseado em timestamp + random
   * @returns {string}
   */
  function _gerarId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /**
   * Recupera todos os registros
   * @returns {Promise<Array>}
   */
  async function getAll() {
    return _carregar();
  }

  /**
   * Busca um registro pelo ID
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async function getById(id) {
    var lista = _carregar();
    return lista.find(function (r) { return r.id === id; }) || null;
  }

  /**
   * Adiciona um novo registro
   * @param {Object} registro
   * @returns {Promise<Object>}
   */
  async function add(registro) {
    var lista = _carregar();
    var novo = Object.assign({}, registro, { id: _gerarId() });
    lista.push(novo);
    _salvar(lista);
    return novo;
  }

  /**
   * Atualiza um registro existente
   * @param {string} id
   * @param {Object} dados
   * @returns {Promise<Object|null>}
   */
  async function update(id, dados) {
    var lista = _carregar();
    var idx = lista.findIndex(function (r) { return r.id === id; });
    if (idx === -1) return null;
    lista[idx] = Object.assign({}, lista[idx], dados, { id: id });
    _salvar(lista);
    return lista[idx];
  }

  /**
   * Remove um registro pelo ID
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async function remove(id) {
    var lista = _carregar();
    var nova = lista.filter(function (r) { return r.id !== id; });
    if (nova.length === lista.length) return false;
    _salvar(nova);
    return true;
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
