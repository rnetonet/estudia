// Estado da aplicacao
const STORAGE_KEY = 'estudia_errors';
let errors = [];
let charts = {
    materias: null,
    assuntos: null,
    timeline: null
};

// Cores para graficos
const CHART_COLORS = [
    '#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1'
];

// Inicializacao
document.addEventListener('DOMContentLoaded', () => {
    loadFromStorage();
    setupEventListeners();
    updateUI();
});

// Carregar dados do LocalStorage
function loadFromStorage() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            errors = JSON.parse(stored);
        } catch (e) {
            console.error('Erro ao carregar dados:', e);
            errors = [];
        }
    }
}

// Salvar dados no LocalStorage
function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(errors));
}

// Configurar eventos
function setupEventListeners() {
    // Formulario
    document.getElementById('error-form').addEventListener('submit', handleFormSubmit);

    // Botoes de dados
    document.getElementById('btn-export').addEventListener('click', exportData);
    document.getElementById('btn-import').addEventListener('change', importData);
    document.getElementById('btn-clear').addEventListener('click', clearAllData);

    // Filtro de grafico
    document.getElementById('filter-materia').addEventListener('change', updateTimelineChart);

    // Busca no historico
    document.getElementById('search-history').addEventListener('input', renderHistory);
}

// Adicionar erro
function handleFormSubmit(e) {
    e.preventDefault();

    const newError = {
        id: Date.now(),
        materia: document.getElementById('materia').value.trim(),
        assunto: document.getElementById('assunto').value.trim(),
        prova: document.getElementById('prova').value.trim(),
        mes: parseInt(document.getElementById('mes').value),
        ano: parseInt(document.getElementById('ano').value),
        createdAt: new Date().toISOString()
    };

    errors.push(newError);
    saveToStorage();
    updateUI();
    e.target.reset();

    // Definir ano atual como padrao
    document.getElementById('ano').value = new Date().getFullYear();
}

// Deletar erro
function deleteError(id) {
    if (confirm('Tem certeza que deseja excluir este erro?')) {
        errors = errors.filter(err => err.id !== id);
        saveToStorage();
        updateUI();
    }
}

// Limpar todos os dados
function clearAllData() {
    if (confirm('Tem certeza que deseja excluir TODOS os dados? Esta acao nao pode ser desfeita.')) {
        errors = [];
        saveToStorage();
        updateUI();
    }
}

// Exportar dados
function exportData() {
    const dataStr = JSON.stringify(errors, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `estudia_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Importar dados
function importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const imported = JSON.parse(event.target.result);
            if (Array.isArray(imported)) {
                const merge = confirm('Deseja mesclar com os dados existentes?\n\nClique em OK para mesclar ou Cancelar para substituir.');

                if (merge) {
                    // Mesclar dados (evitar duplicatas por ID)
                    const existingIds = new Set(errors.map(e => e.id));
                    const newErrors = imported.filter(e => !existingIds.has(e.id));
                    errors = [...errors, ...newErrors];
                } else {
                    errors = imported;
                }

                saveToStorage();
                updateUI();
                alert('Dados importados com sucesso!');
            } else {
                alert('Formato de arquivo invalido.');
            }
        } catch (err) {
            alert('Erro ao ler arquivo: ' + err.message);
        }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
}

// Atualizar toda a UI
function updateUI() {
    updateDataLists();
    updateMateriaFilter();
    renderHistory();
    updateCharts();
}

// Atualizar datalists para autocomplete
function updateDataLists() {
    const materias = [...new Set(errors.map(e => e.materia))];
    const assuntos = [...new Set(errors.map(e => e.assunto))];
    const provas = [...new Set(errors.map(e => e.prova))];

    document.getElementById('materias-list').innerHTML =
        materias.map(m => `<option value="${m}">`).join('');
    document.getElementById('assuntos-list').innerHTML =
        assuntos.map(a => `<option value="${a}">`).join('');
    document.getElementById('provas-list').innerHTML =
        provas.map(p => `<option value="${p}">`).join('');
}

// Atualizar filtro de materias
function updateMateriaFilter() {
    const materias = [...new Set(errors.map(e => e.materia))].sort();
    const select = document.getElementById('filter-materia');
    const currentValue = select.value;

    select.innerHTML = '<option value="">Todas</option>' +
        materias.map(m => `<option value="${m}">${m}</option>`).join('');

    select.value = currentValue;
}

// Renderizar historico
function renderHistory() {
    const container = document.getElementById('history-list');
    const searchTerm = document.getElementById('search-history').value.toLowerCase();

    const filtered = errors.filter(e =>
        e.materia.toLowerCase().includes(searchTerm) ||
        e.assunto.toLowerCase().includes(searchTerm) ||
        e.prova.toLowerCase().includes(searchTerm)
    );

    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state">Nenhum erro registrado ainda.</div>';
        return;
    }

    // Ordenar por data de criacao (mais recente primeiro)
    const sorted = [...filtered].sort((a, b) => b.id - a.id);

    const meses = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    container.innerHTML = sorted.map(error => `
        <div class="history-item">
            <div class="history-item-info">
                <span class="history-item-materia">${escapeHtml(error.materia)}</span>
                <span class="history-item-assunto"> - ${escapeHtml(error.assunto)}</span>
                <div class="history-item-meta">
                    ${escapeHtml(error.prova)} | ${meses[error.mes]}/${error.ano}
                </div>
            </div>
            <button class="history-item-delete" onclick="deleteError(${error.id})" title="Excluir">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                </svg>
            </button>
        </div>
    `).join('');
}

// Escapar HTML para prevenir XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Atualizar todos os graficos
function updateCharts() {
    updateMateriasChart();
    updateAssuntosChart();
    updateTimelineChart();
}

// Grafico de erros por materia
function updateMateriasChart() {
    const ctx = document.getElementById('chart-materias').getContext('2d');

    const materiaCount = {};
    errors.forEach(e => {
        materiaCount[e.materia] = (materiaCount[e.materia] || 0) + 1;
    });

    const labels = Object.keys(materiaCount).sort((a, b) => materiaCount[b] - materiaCount[a]);
    const data = labels.map(l => materiaCount[l]);

    if (charts.materias) {
        charts.materias.destroy();
    }

    charts.materias = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: CHART_COLORS.slice(0, labels.length),
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                }
            }
        }
    });
}

// Grafico de erros por assunto
function updateAssuntosChart() {
    const ctx = document.getElementById('chart-assuntos').getContext('2d');

    const assuntoCount = {};
    errors.forEach(e => {
        assuntoCount[e.assunto] = (assuntoCount[e.assunto] || 0) + 1;
    });

    // Pegar top 10 assuntos
    const sorted = Object.entries(assuntoCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const labels = sorted.map(s => s[0]);
    const data = sorted.map(s => s[1]);

    if (charts.assuntos) {
        charts.assuntos.destroy();
    }

    charts.assuntos = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Erros',
                data: data,
                backgroundColor: CHART_COLORS[0],
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Grafico de timeline
function updateTimelineChart() {
    const ctx = document.getElementById('chart-timeline').getContext('2d');
    const filterMateria = document.getElementById('filter-materia').value;

    let filteredErrors = errors;
    if (filterMateria) {
        filteredErrors = errors.filter(e => e.materia === filterMateria);
    }

    // Agrupar por mes/ano
    const timelineData = {};
    filteredErrors.forEach(e => {
        const key = `${e.ano}-${String(e.mes).padStart(2, '0')}`;
        timelineData[key] = (timelineData[key] || 0) + 1;
    });

    // Ordenar por data
    const sortedKeys = Object.keys(timelineData).sort();
    const labels = sortedKeys.map(k => {
        const [ano, mes] = k.split('-');
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        return `${meses[parseInt(mes) - 1]}/${ano}`;
    });
    const data = sortedKeys.map(k => timelineData[k]);

    if (charts.timeline) {
        charts.timeline.destroy();
    }

    charts.timeline = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Erros',
                data: data,
                borderColor: CHART_COLORS[0],
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                fill: true,
                tension: 0.3,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Definir ano atual como padrao no carregamento
document.getElementById('ano').value = new Date().getFullYear();
