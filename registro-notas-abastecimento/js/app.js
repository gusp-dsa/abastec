/**
 * app.js
 * Lógica principal da aplicação de Registro de Notas de Abastecimento
 */

(function () {
  'use strict';

  /* --- Estado da aplicação --- */
  var state = {
    currentSection: 'dashboard',
    sortColumn: 'data',
    sortDirection: 'desc',
    currentPage: 1,
    itemsPerPage: 10,
    deleteTargetId: null,
    registros: [],
    loading: false,
    filters: {
      pep: '',
      combustivel: '',
      placa: '',
      dataInicial: '',
      dataFinal: '',
      busca: ''
    }
  };

  /* --- Referências DOM --- */
  var DOM = {};

  /* --- Inicialização --- */
  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    cacheDOMElements();
    bindEvents();
    updateCurrentDate();
    await navigateTo('dashboard');
  }

  /**
   * Armazena referências aos elementos DOM utilizados
   */
  function cacheDOMElements() {
    DOM.sidebar = document.getElementById('sidebar');
    DOM.sidebarOverlay = document.getElementById('sidebarOverlay');
    DOM.menuToggle = document.getElementById('menuToggle');
    DOM.pageTitle = document.getElementById('pageTitle');
    DOM.currentDate = document.getElementById('currentDate');
    DOM.navItems = document.querySelectorAll('.nav-item');
    DOM.sections = document.querySelectorAll('.section');

    // Formulário de cadastro
    DOM.formCadastro = document.getElementById('formCadastro');
    DOM.quantidade = document.getElementById('quantidade');
    DOM.valorUnitario = document.getElementById('valorUnitario');
    DOM.valorTotal = document.getElementById('valorTotal');
    DOM.placa = document.getElementById('placa');

    // Consulta
    DOM.buscaRapida = document.getElementById('buscaRapida');
    DOM.filtroPep = document.getElementById('filtroPep');
    DOM.filtroCombustivel = document.getElementById('filtroCombustivel');
    DOM.filtroPlaca = document.getElementById('filtroPlaca');
    DOM.filtroDataInicial = document.getElementById('filtroDataInicial');
    DOM.filtroDataFinal = document.getElementById('filtroDataFinal');
    DOM.btnLimparFiltros = document.getElementById('btnLimparFiltros');
    DOM.tabelaBody = document.getElementById('tabelaBody');
    DOM.tabelaRegistros = document.getElementById('tabelaRegistros');
    DOM.paginationInfo = document.getElementById('paginationInfo');
    DOM.paginationPages = document.getElementById('paginationPages');
    DOM.btnPrevPage = document.getElementById('btnPrevPage');
    DOM.btnNextPage = document.getElementById('btnNextPage');

    // Dashboard
    DOM.statTotalRegistros = document.getElementById('statTotalRegistros');
    DOM.statTotalGasto = document.getElementById('statTotalGasto');
    DOM.statTotalLitros = document.getElementById('statTotalLitros');
    DOM.statTiposCombustivel = document.getElementById('statTiposCombustivel');
    DOM.fuelStats = document.getElementById('fuelStats');
    DOM.recentList = document.getElementById('recentList');

    // Exportação
    DOM.exportCount = document.getElementById('exportCount');
    DOM.exportTotal = document.getElementById('exportTotal');
    DOM.btnExportar = document.getElementById('btnExportar');

    // Modal de edição
    DOM.modalOverlay = document.getElementById('modalOverlay');
    DOM.modalClose = document.getElementById('modalClose');
    DOM.modalCancel = document.getElementById('modalCancel');
    DOM.modalSave = document.getElementById('modalSave');
    DOM.formEdicao = document.getElementById('formEdicao');
    DOM.editQuantidade = document.getElementById('editQuantidade');
    DOM.editValorUnitario = document.getElementById('editValorUnitario');
    DOM.editValorTotal = document.getElementById('editValorTotal');
    DOM.editPlaca = document.getElementById('editPlaca');

    // Modal de confirmação
    DOM.confirmOverlay = document.getElementById('confirmOverlay');
    DOM.confirmDetails = document.getElementById('confirmDetails');
    DOM.confirmCancel = document.getElementById('confirmCancel');
    DOM.confirmDelete = document.getElementById('confirmDelete');

    // Toast e loading
    DOM.toastContainer = document.getElementById('toastContainer');
    DOM.loadingOverlay = document.getElementById('loadingOverlay');
  }

  function setLoading(active) {
    state.loading = active;
    if (DOM.loadingOverlay) {
      DOM.loadingOverlay.classList.toggle('active', active);
    }
  }

  /**
   * Recarrega registros do banco de dados via API
   */
  async function refreshData() {
    try {
      state.registros = await StorageManager.getAll();
    } catch (error) {
      state.registros = [];
      showToast(error.message || 'Erro ao carregar registros.', 'error');
    }
  }

  /**
   * Vincula eventos da interface
   */
  function bindEvents() {
    // Navegação
    DOM.navItems.forEach(function (item) {
      item.addEventListener('click', function () {
        navigateTo(item.dataset.section).catch(function () {});
        closeSidebar();
      });
    });

    DOM.menuToggle.addEventListener('click', toggleSidebar);
    DOM.sidebarOverlay.addEventListener('click', closeSidebar);

    // Cadastro - cálculo automático do valor total
    DOM.quantidade.addEventListener('input', calcularValorTotalCadastro);
    DOM.valorUnitario.addEventListener('input', calcularValorTotalCadastro);
    DOM.placa.addEventListener('input', formatarPlacaInput);
    DOM.formCadastro.addEventListener('submit', handleCadastroSubmit);
    DOM.formCadastro.addEventListener('reset', function () {
      clearFormErrors(DOM.formCadastro);
      DOM.valorTotal.value = '';
    });

    // Edição - cálculo automático
    DOM.editQuantidade.addEventListener('input', calcularValorTotalEdicao);
    DOM.editValorUnitario.addEventListener('input', calcularValorTotalEdicao);
    DOM.editPlaca.addEventListener('input', formatarPlacaInput);
    DOM.modalSave.addEventListener('click', handleEdicaoSave);
    DOM.modalClose.addEventListener('click', closeEditModal);
    DOM.modalCancel.addEventListener('click', closeEditModal);
    DOM.modalOverlay.addEventListener('click', function (e) {
      if (e.target === DOM.modalOverlay) closeEditModal();
    });

    // Exclusão
    DOM.confirmCancel.addEventListener('click', closeConfirmModal);
    DOM.confirmDelete.addEventListener('click', handleDeleteConfirm);
    DOM.confirmOverlay.addEventListener('click', function (e) {
      if (e.target === DOM.confirmOverlay) closeConfirmModal();
    });

    // Filtros e busca
    DOM.buscaRapida.addEventListener('input', debounce(handleFilterChange, 300));
    DOM.filtroPep.addEventListener('input', debounce(handleFilterChange, 300));
    DOM.filtroCombustivel.addEventListener('change', handleFilterChange);
    DOM.filtroPlaca.addEventListener('input', debounce(handleFilterChange, 300));
    DOM.filtroDataInicial.addEventListener('change', handleFilterChange);
    DOM.filtroDataFinal.addEventListener('change', handleFilterChange);
    DOM.btnLimparFiltros.addEventListener('click', limparFiltros);

    // Ordenação
    DOM.tabelaRegistros.querySelectorAll('th.sortable').forEach(function (th) {
      th.addEventListener('click', function () {
        handleSort(th.dataset.sort);
      });
    });

    // Paginação
    DOM.btnPrevPage.addEventListener('click', function () {
      if (state.currentPage > 1) {
        state.currentPage--;
        renderTable();
      }
    });
    DOM.btnNextPage.addEventListener('click', function () {
      var filtered = getFilteredRegistros();
      var totalPages = Math.ceil(filtered.length / state.itemsPerPage);
      if (state.currentPage < totalPages) {
        state.currentPage++;
        renderTable();
      }
    });

    // Exportação
    DOM.btnExportar.addEventListener('click', handleExport);

    // Fechar modais com Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeEditModal();
        closeConfirmModal();
        closeSidebar();
      }
    });
  }

  /* --- Navegação --- */

  var sectionTitles = {
    dashboard: 'Dashboard',
    cadastro: 'Novo Registro',
    consulta: 'Consultar Registros',
    exportar: 'Exportar Excel'
  };

  async function navigateTo(section) {
    state.currentSection = section;

    DOM.navItems.forEach(function (item) {
      item.classList.toggle('active', item.dataset.section === section);
    });

    DOM.sections.forEach(function (sec) {
      sec.classList.toggle('active', sec.id === 'section-' + section);
    });

    DOM.pageTitle.textContent = sectionTitles[section] || section;
    await renderAll();
  }

  function toggleSidebar() {
    DOM.sidebar.classList.toggle('open');
    DOM.sidebarOverlay.classList.toggle('active');
  }

  function closeSidebar() {
    DOM.sidebar.classList.remove('open');
    DOM.sidebarOverlay.classList.remove('active');
  }

  /* --- Renderização geral --- */

  async function renderAll() {
    setLoading(true);
    try {
      await refreshData();
      renderDashboard();
      renderTable();
      renderExportPreview();
      updateSortIndicators();
    } finally {
      setLoading(false);
    }
  }

  function updateCurrentDate() {
    var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    DOM.currentDate.textContent = new Date().toLocaleDateString('pt-BR', options);
  }

  /* --- Dashboard --- */

  function renderDashboard() {
    var registros = state.registros;
    var stats = StorageManager.getStats(registros);

    DOM.statTotalRegistros.textContent = stats.totalRegistros;
    DOM.statTotalGasto.textContent = formatCurrency(stats.totalGasto);
    DOM.statTotalLitros.textContent = formatNumber(stats.totalLitros) + ' L';
    DOM.statTiposCombustivel.textContent = Object.keys(stats.porCombustivel).length;

    renderFuelStats(stats.porCombustivel, stats.totalLitros);
    renderRecentList(registros);
  }

  function renderFuelStats(porCombustivel, totalLitros) {
    var keys = Object.keys(porCombustivel);

    if (keys.length === 0) {
      DOM.fuelStats.innerHTML = '<p class="empty-message">Nenhum registro cadastrado.</p>';
      return;
    }

    var maxLitros = Math.max.apply(null, keys.map(function (k) {
      return porCombustivel[k].quantidade;
    }));

    DOM.fuelStats.innerHTML = keys.map(function (comb) {
      var data = porCombustivel[comb];
      var percent = maxLitros > 0 ? (data.quantidade / maxLitros) * 100 : 0;
      return '<div class="fuel-stat-item">' +
        '<div style="flex:1">' +
          '<div class="fuel-stat-name">' + escapeHtml(comb) + ' (' + data.count + ' registro' + (data.count !== 1 ? 's' : '') + ')</div>' +
          '<div class="fuel-stat-bar"><div class="fuel-stat-bar-fill" style="width:' + percent + '%"></div></div>' +
        '</div>' +
        '<div class="fuel-stat-values">' +
          '<span class="fuel-stat-litros">' + formatNumber(data.quantidade) + ' L</span>' +
          '<span class="fuel-stat-valor">' + formatCurrency(data.valor) + '</span>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function renderRecentList(registros) {
    if (registros.length === 0) {
      DOM.recentList.innerHTML = '<p class="empty-message">Nenhum registro cadastrado.</p>';
      return;
    }

    var recentes = registros.slice().sort(function (a, b) {
      return new Date(b.createdAt || b.data) - new Date(a.createdAt || a.data);
    }).slice(0, 5);

    DOM.recentList.innerHTML = recentes.map(function (reg) {
      return '<div class="recent-item">' +
        '<div class="recent-item-info">' +
          '<span class="recent-item-placa">' + escapeHtml(reg.placa) + '</span>' +
          '<span class="recent-item-detail">' + formatDateBR(reg.data) + ' · ' + escapeHtml(reg.combustivel) + ' · ' + formatNumber(reg.quantidade) + ' L</span>' +
        '</div>' +
        '<span class="recent-item-value">' + formatCurrency(reg.valorTotal) + '</span>' +
      '</div>';
    }).join('');
  }

  /* --- Cadastro --- */

  function calcularValorTotalCadastro() {
    var qtd = parseFloat(DOM.quantidade.value) || 0;
    var unit = parseFloat(DOM.valorUnitario.value) || 0;
    DOM.valorTotal.value = qtd > 0 && unit > 0 ? formatCurrency(qtd * unit) : '';
  }

  function calcularValorTotalEdicao() {
    var qtd = parseFloat(DOM.editQuantidade.value) || 0;
    var unit = parseFloat(DOM.editValorUnitario.value) || 0;
    DOM.editValorTotal.value = qtd > 0 && unit > 0 ? formatCurrency(qtd * unit) : '';
  }

  async function handleCadastroSubmit(e) {
    e.preventDefault();

    if (!validateForm(DOM.formCadastro)) return;

    var dados = extractFormData(DOM.formCadastro);

    setLoading(true);
    try {
      await StorageManager.add(dados);
      showToast('Registro cadastrado com sucesso!', 'success');
      DOM.formCadastro.reset();
      DOM.valorTotal.value = '';
      await renderAll();
    } catch (error) {
      showToast(error.message || 'Erro ao cadastrar registro.', 'error');
    } finally {
      setLoading(false);
    }
  }

  /* --- Edição --- */

  async function openEditModal(id) {
    var registro = state.registros.find(function (r) { return r.id === id; });

    if (!registro) {
      setLoading(true);
      try {
        registro = await StorageManager.getById(id);
      } catch (error) {
        showToast(error.message || 'Erro ao buscar registro.', 'error');
        return;
      } finally {
        setLoading(false);
      }
    }

    if (!registro) {
      showToast('Registro não encontrado.', 'error');
      return;
    }

    document.getElementById('editId').value = registro.id;
    document.getElementById('editData').value = registro.data;
    document.getElementById('editPep').value = registro.pep;
    document.getElementById('editPlaca').value = registro.placa;
    document.getElementById('editCombustivel').value = registro.combustivel;
    document.getElementById('editQuantidade').value = registro.quantidade;
    document.getElementById('editValorUnitario').value = registro.valorUnitario;
    document.getElementById('editNotaFiscal').value = registro.notaFiscal;
    document.getElementById('editPosto').value = registro.posto;
    document.getElementById('editObservacoes').value = registro.observacoes || '';

    calcularValorTotalEdicao();
    clearFormErrors(DOM.formEdicao);
    DOM.modalOverlay.classList.add('active');
  }

  function closeEditModal() {
    DOM.modalOverlay.classList.remove('active');
    DOM.formEdicao.reset();
    clearFormErrors(DOM.formEdicao);
  }

  async function handleEdicaoSave() {
    if (!validateForm(DOM.formEdicao, 'edit')) return;

    var id = document.getElementById('editId').value;
    var dados = extractFormData(DOM.formEdicao);

    setLoading(true);
    try {
      var updated = await StorageManager.update(id, dados);

      if (updated) {
        showToast('Registro atualizado com sucesso!', 'success');
        closeEditModal();
        await renderAll();
      } else {
        showToast('Erro ao atualizar registro.', 'error');
      }
    } catch (error) {
      showToast(error.message || 'Erro ao atualizar registro.', 'error');
    } finally {
      setLoading(false);
    }
  }

  /* --- Exclusão --- */

  function openConfirmModal(id) {
    var registro = state.registros.find(function (r) { return r.id === id; });
    if (!registro) {
      showToast('Registro não encontrado.', 'error');
      return;
    }

    state.deleteTargetId = id;
    DOM.confirmDetails.innerHTML =
      '<strong>' + escapeHtml(registro.placa) + ' — ' + formatDateBR(registro.data) + '</strong>' +
      escapeHtml(registro.combustivel) + ' · ' + formatNumber(registro.quantidade) + ' L · ' + formatCurrency(registro.valorTotal);

    DOM.confirmOverlay.classList.add('active');
  }

  function closeConfirmModal() {
    DOM.confirmOverlay.classList.remove('active');
    state.deleteTargetId = null;
  }

  async function handleDeleteConfirm() {
    if (!state.deleteTargetId) return;

    var targetId = state.deleteTargetId;
    closeConfirmModal();

    setLoading(true);
    try {
      var removed = await StorageManager.remove(targetId);

      if (removed) {
        showToast('Registro excluído com sucesso!', 'success');
        await renderAll();
        var filtered = getFilteredRegistros();
        var totalPages = Math.ceil(filtered.length / state.itemsPerPage);
        if (state.currentPage > totalPages && totalPages > 0) {
          state.currentPage = totalPages;
          renderTable();
          renderExportPreview();
        }
      } else {
        showToast('Erro ao excluir registro.', 'error');
      }
    } catch (error) {
      showToast(error.message || 'Erro ao excluir registro.', 'error');
    } finally {
      setLoading(false);
    }
  }

  /* --- Filtros e Consulta --- */

  function handleFilterChange() {
    state.filters.busca = DOM.buscaRapida.value.trim().toLowerCase();
    state.filters.pep = DOM.filtroPep.value.trim().toLowerCase();
    state.filters.combustivel = DOM.filtroCombustivel.value;
    state.filters.placa = DOM.filtroPlaca.value.trim().toLowerCase();
    state.filters.dataInicial = DOM.filtroDataInicial.value;
    state.filters.dataFinal = DOM.filtroDataFinal.value;
    state.currentPage = 1;
    renderTable();
    renderExportPreview();
  }

  function limparFiltros() {
    DOM.buscaRapida.value = '';
    DOM.filtroPep.value = '';
    DOM.filtroCombustivel.value = '';
    DOM.filtroPlaca.value = '';
    DOM.filtroDataInicial.value = '';
    DOM.filtroDataFinal.value = '';
    handleFilterChange();
  }

  function getFilteredRegistros() {
    var registros = state.registros;
    var f = state.filters;

    return registros.filter(function (reg) {
      // Filtro por PEP
      if (f.pep && reg.pep.toLowerCase().indexOf(f.pep) === -1) return false;

      // Filtro por combustível
      if (f.combustivel && reg.combustivel !== f.combustivel) return false;

      // Filtro por placa
      if (f.placa && reg.placa.toLowerCase().indexOf(f.placa) === -1) return false;

      // Filtro por data inicial
      if (f.dataInicial && reg.data < f.dataInicial) return false;

      // Filtro por data final
      if (f.dataFinal && reg.data > f.dataFinal) return false;

      // Busca rápida (PEP, placa, nota fiscal, posto, observações)
      if (f.busca) {
        var searchFields = [
          reg.pep, reg.placa, reg.notaFiscal, reg.posto,
          reg.observacoes || '', reg.combustivel
        ].join(' ').toLowerCase();

        if (searchFields.indexOf(f.busca) === -1) return false;
      }

      return true;
    });
  }

  function sortRegistros(registros) {
    var col = state.sortColumn;
    var dir = state.sortDirection === 'asc' ? 1 : -1;

    return registros.slice().sort(function (a, b) {
      var valA = a[col];
      var valB = b[col];

      if (col === 'quantidade' || col === 'valorUnitario' || col === 'valorTotal') {
        return (valA - valB) * dir;
      }

      if (col === 'data') {
        return (valA < valB ? -1 : valA > valB ? 1 : 0) * dir;
      }

      valA = String(valA || '').toLowerCase();
      valB = String(valB || '').toLowerCase();
      return valA.localeCompare(valB, 'pt-BR') * dir;
    });
  }

  function handleSort(column) {
    if (state.sortColumn === column) {
      state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      state.sortColumn = column;
      state.sortDirection = 'asc';
    }
    updateSortIndicators();
    renderTable();
  }

  function updateSortIndicators() {
    DOM.tabelaRegistros.querySelectorAll('th.sortable').forEach(function (th) {
      th.classList.remove('sort-asc', 'sort-desc');
      if (th.dataset.sort === state.sortColumn) {
        th.classList.add(state.sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
      }
    });
  }

  /* --- Tabela e Paginação --- */

  function renderTable() {
    var filtered = getFilteredRegistros();
    var sorted = sortRegistros(filtered);
    var totalItems = sorted.length;
    var totalPages = Math.max(1, Math.ceil(totalItems / state.itemsPerPage));

    if (state.currentPage > totalPages) {
      state.currentPage = totalPages;
    }

    var start = (state.currentPage - 1) * state.itemsPerPage;
    var pageItems = sorted.slice(start, start + state.itemsPerPage);

    if (pageItems.length === 0) {
      DOM.tabelaBody.innerHTML = '<tr class="empty-row"><td colspan="10">Nenhum registro encontrado.</td></tr>';
    } else {
      DOM.tabelaBody.innerHTML = pageItems.map(function (reg) {
        return '<tr>' +
          '<td>' + formatDateBR(reg.data) + '</td>' +
          '<td>' + escapeHtml(reg.pep) + '</td>' +
          '<td><strong>' + escapeHtml(reg.placa) + '</strong></td>' +
          '<td>' + getCombustivelBadge(reg.combustivel) + '</td>' +
          '<td>' + formatNumber(reg.quantidade) + '</td>' +
          '<td>' + formatCurrency(reg.valorUnitario) + '</td>' +
          '<td><strong>' + formatCurrency(reg.valorTotal) + '</strong></td>' +
          '<td>' + escapeHtml(reg.notaFiscal) + '</td>' +
          '<td>' + escapeHtml(reg.posto) + '</td>' +
          '<td><div class="actions-cell">' +
            '<button class="btn-icon edit" title="Editar" data-id="' + reg.id + '" onclick="App.editRegistro(\'' + reg.id + '\')">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
            '</button>' +
            '<button class="btn-icon delete" title="Excluir" data-id="' + reg.id + '" onclick="App.deleteRegistro(\'' + reg.id + '\')">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>' +
            '</button>' +
          '</div></td>' +
        '</tr>';
      }).join('');
    }

    // Info de paginação
    var showingFrom = totalItems === 0 ? 0 : start + 1;
    var showingTo = Math.min(start + state.itemsPerPage, totalItems);
    DOM.paginationInfo.textContent = 'Exibindo ' + showingFrom + '–' + showingTo + ' de ' + totalItems + ' registros';

    // Botões de paginação
    DOM.btnPrevPage.disabled = state.currentPage <= 1;
    DOM.btnNextPage.disabled = state.currentPage >= totalPages;

    renderPageButtons(totalPages);
  }

  function renderPageButtons(totalPages) {
    if (totalPages <= 1) {
      DOM.paginationPages.innerHTML = '';
      return;
    }

    var pages = [];
    var current = state.currentPage;
    var maxVisible = 5;
    var startPage = Math.max(1, current - Math.floor(maxVisible / 2));
    var endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (var i = startPage; i <= endPage; i++) {
      pages.push('<button class="page-btn' + (i === current ? ' active' : '') + '" data-page="' + i + '">' + i + '</button>');
    }

    DOM.paginationPages.innerHTML = pages.join('');

    DOM.paginationPages.querySelectorAll('.page-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.currentPage = parseInt(btn.dataset.page, 10);
        renderTable();
      });
    });
  }

  /* --- Exportação --- */

  function renderExportPreview() {
    var filtered = getFilteredRegistros();
    var totalValor = filtered.reduce(function (sum, reg) {
      return sum + (reg.valorTotal || 0);
    }, 0);

    DOM.exportCount.textContent = filtered.length;
    DOM.exportTotal.textContent = formatCurrency(totalValor);
  }

  function handleExport() {
    var filtered = getFilteredRegistros();

    if (filtered.length === 0) {
      showToast('Nenhum registro para exportar. Ajuste os filtros ou cadastre registros.', 'error');
      return;
    }

    try {
      var sorted = sortRegistros(filtered);
      ExportManager.exportToExcel(sorted);
      showToast(filtered.length + ' registro(s) exportado(s) com sucesso!', 'success');
    } catch (error) {
      showToast(error.message || 'Erro ao exportar planilha.', 'error');
    }
  }

  /* --- Validação --- */

  var requiredFields = {
    cadastro: ['data', 'pep', 'placa', 'combustivel', 'quantidade', 'valorUnitario', 'notaFiscal', 'posto'],
    edit: ['editData', 'editPep', 'editPlaca', 'editCombustivel', 'editQuantidade', 'editValorUnitario', 'editNotaFiscal', 'editPosto']
  };

  var fieldMapping = {
    editData: 'data',
    editPep: 'pep',
    editPlaca: 'placa',
    editCombustivel: 'combustivel',
    editQuantidade: 'quantidade',
    editValorUnitario: 'valorUnitario',
    editNotaFiscal: 'notaFiscal',
    editPosto: 'posto',
    editObservacoes: 'observacoes'
  };

  function validateForm(form, prefix) {
    var isEdit = prefix === 'edit';
    var fields = isEdit ? requiredFields.edit : requiredFields.cadastro;
    var valid = true;

    clearFormErrors(form);

    fields.forEach(function (fieldId) {
      var field = document.getElementById(fieldId);
      var errorEl = form.querySelector('[data-for="' + fieldId + '"]');
      var value = field.value.trim();
      var fieldName = isEdit ? (fieldMapping[fieldId] || fieldId) : fieldId;

      if (!value) {
        showFieldError(field, errorEl, 'Campo obrigatório.');
        valid = false;
        return;
      }

      if (fieldName === 'quantidade' || fieldName === 'valorUnitario') {
        var num = parseFloat(value);
        if (isNaN(num) || num <= 0) {
          showFieldError(field, errorEl, 'Informe um valor maior que zero.');
          valid = false;
        }
      }

      if (fieldName === 'placa') {
        var placaClean = value.replace(/[^a-zA-Z0-9]/g, '');
        if (placaClean.length < 7) {
          showFieldError(field, errorEl, 'Placa inválida. Informe 7 caracteres.');
          valid = false;
        }
      }
    });

    return valid;
  }

  function showFieldError(field, errorEl, message) {
    field.classList.add('invalid');
    if (errorEl) errorEl.textContent = message;
  }

  function clearFormErrors(form) {
    form.querySelectorAll('.invalid').forEach(function (el) {
      el.classList.remove('invalid');
    });
    form.querySelectorAll('.error-message').forEach(function (el) {
      el.textContent = '';
    });
  }

  function extractFormData(form) {
    var isEdit = form.id === 'formEdicao';
    var getVal = function (id, editId) {
      return document.getElementById(isEdit ? editId : id).value.trim();
    };

    var quantidade = parseFloat(getVal('quantidade', 'editQuantidade'));
    var valorUnitario = parseFloat(getVal('valorUnitario', 'editValorUnitario'));

    return {
      data: getVal('data', 'editData'),
      pep: getVal('pep', 'editPep').toUpperCase(),
      placa: getVal('placa', 'editPlaca').toUpperCase().replace(/[^A-Z0-9]/g, ''),
      combustivel: getVal('combustivel', 'editCombustivel'),
      quantidade: quantidade,
      valorUnitario: valorUnitario,
      valorTotal: Math.round(quantidade * valorUnitario * 100) / 100,
      notaFiscal: getVal('notaFiscal', 'editNotaFiscal'),
      posto: getVal('posto', 'editPosto'),
      observacoes: getVal('observacoes', 'editObservacoes')
    };
  }

  /* --- Utilitários --- */

  function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  }

  function formatNumber(value) {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value || 0);
  }

  function formatDateBR(isoDate) {
    if (!isoDate) return '';
    var parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate;
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }

  function formatarPlacaInput(e) {
    var input = e.target;
    var value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (value.length > 7) value = value.substring(0, 7);
    input.value = value;
  }

  function getCombustivelBadge(combustivel) {
    var classes = {
      'Diesel S10': 'badge-diesel-s10',
      'Diesel Comum': 'badge-diesel-comum',
      'Gasolina': 'badge-gasolina',
      'Etanol': 'badge-etanol'
    };
    var cls = classes[combustivel] || '';
    return '<span class="badge ' + cls + '">' + escapeHtml(combustivel) + '</span>';
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  function debounce(fn, delay) {
    var timer;
    return function () {
      var args = arguments;
      var context = this;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(context, args);
      }, delay);
    };
  }

  function showToast(message, type) {
    var toast = document.createElement('div');
    toast.className = 'toast ' + (type || 'info');
    toast.textContent = message;
    DOM.toastContainer.appendChild(toast);

    setTimeout(function () {
      toast.classList.add('hiding');
      setTimeout(function () {
        toast.remove();
      }, 300);
    }, 3500);
  }

  /* --- API pública (para onclick inline na tabela) --- */
  window.App = {
    editRegistro: openEditModal,
    deleteRegistro: openConfirmModal
  };

})();
