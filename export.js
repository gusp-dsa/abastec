/**
 * export.js
 * Exportação de registros para Excel (.xlsx) utilizando SheetJS
 */

const ExportManager = (function () {
  'use strict';

  /**
   * Formata data ISO para exibição brasileira (dd/mm/aaaa)
   * @param {string} isoDate - Data no formato YYYY-MM-DD
   * @returns {string} Data formatada
   */
  function formatDateBR(isoDate) {
    if (!isoDate) return '';
    var parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate;
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }

  /**
   * Formata valor monetário para exibição
   * @param {number} value - Valor numérico
   * @returns {string} Valor formatado em R$
   */
  function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  }

  /**
   * Converte registros para formato de planilha
   * @param {Array} registros - Lista de registros filtrados
   * @returns {Array<Array>} Dados da planilha (cabeçalho + linhas)
   */
  function prepareSheetData(registros) {
    var header = [
      'Data',
      'PEP',
      'Placa',
      'Combustível',
      'Quantidade (L)',
      'Valor Unitário (R$)',
      'Valor Total (R$)',
      'Nota Fiscal',
      'Posto',
      'Observações'
    ];

    var rows = registros.map(function (reg) {
      return [
        formatDateBR(reg.data),
        reg.pep,
        reg.placa,
        reg.combustivel,
        reg.quantidade,
        reg.valorUnitario,
        reg.valorTotal,
        reg.notaFiscal,
        reg.posto,
        reg.observacoes || ''
      ];
    });

    return [header].concat(rows);
  }

  /**
   * Exporta registros para arquivo Excel (.xlsx)
   * @param {Array} registros - Lista de registros a exportar
   * @param {string} [filename] - Nome do arquivo (sem extensão)
   * @returns {boolean} true se exportação bem-sucedida
   */
  function exportToExcel(registros, filename) {
    if (typeof XLSX === 'undefined') {
      throw new Error('Biblioteca SheetJS (XLSX) não carregada. Verifique sua conexão com a internet.');
    }

    if (!registros || registros.length === 0) {
      throw new Error('Nenhum registro disponível para exportação.');
    }

    var sheetData = prepareSheetData(registros);
    var worksheet = XLSX.utils.aoa_to_sheet(sheetData);

    // Define largura das colunas para melhor visualização
    worksheet['!cols'] = [
      { wch: 12 },  // Data
      { wch: 16 },  // PEP
      { wch: 10 },  // Placa
      { wch: 14 },  // Combustível
      { wch: 14 },  // Quantidade
      { wch: 18 },  // Valor Unitário
      { wch: 16 },  // Valor Total
      { wch: 14 },  // Nota Fiscal
      { wch: 24 },  // Posto
      { wch: 30 }   // Observações
    ];

    // Formata colunas numéricas
    var range = XLSX.utils.decode_range(worksheet['!ref']);
    for (var R = range.s.r + 1; R <= range.e.r; ++R) {
      // Quantidade (coluna E = índice 4)
      var cellQtd = XLSX.utils.encode_cell({ r: R, c: 4 });
      if (worksheet[cellQtd]) {
        worksheet[cellQtd].t = 'n';
        worksheet[cellQtd].z = '#,##0.00';
      }
      // Valor Unitário (coluna F = índice 5)
      var cellUnit = XLSX.utils.encode_cell({ r: R, c: 5 });
      if (worksheet[cellUnit]) {
        worksheet[cellUnit].t = 'n';
        worksheet[cellUnit].z = 'R$ #,##0.00';
      }
      // Valor Total (coluna G = índice 6)
      var cellTotal = XLSX.utils.encode_cell({ r: R, c: 6 });
      if (worksheet[cellTotal]) {
        worksheet[cellTotal].t = 'n';
        worksheet[cellTotal].z = 'R$ #,##0.00';
      }
    }

    var workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Abastecimentos');

    var nomeArquivo = filename || 'notas_abastecimento_' + getTimestamp();
    XLSX.writeFile(workbook, nomeArquivo + '.xlsx');

    return true;
  }

  /**
   * Gera timestamp para nome de arquivo
   * @returns {string} Timestamp formatado
   */
  function getTimestamp() {
    var now = new Date();
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return now.getFullYear() +
      pad(now.getMonth() + 1) +
      pad(now.getDate()) + '_' +
      pad(now.getHours()) +
      pad(now.getMinutes());
  }

  return {
    exportToExcel: exportToExcel,
    formatDateBR: formatDateBR,
    formatCurrency: formatCurrency
  };
})();
