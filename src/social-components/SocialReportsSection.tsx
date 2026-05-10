import React, { useState, useMemo } from 'react';
import './SocialReportsSection.css';

interface ReportData {
  id: number;
  name: string;
  type: 'orphans' | 'disabled';
  date: string;
}

interface ReportConfig {
  type: 'orphans' | 'disabled' | null;
  actualDate: string;
}

const REPORT_TYPES = [
  {
    key: 'orphans' as const,
    title: 'Дети-сироты',
    subtitle: 'и детях, оставшихся без попечения родителей',
    cardImg: '/social-icons/orphans_icon.svg',
    modalImg: '/social-icons/orphans_icon.svg',
    columns: [
      '№',
      'ФИО',
      'Направление/специальность',
      'Дата рождения',
      'Сведения о родителях',
      'Адрес места жительства, телефон',
      'Адрес регистрации',
      'Опекун (ФИО, телефон, родство)',
      'Форма обучения (очная/заочная/дистанционная), бюджет/платно'
    ]
  },
  {
    key: 'disabled' as const,
    title: 'Дети-инвалиды',
    subtitle: 'и лицах с ограниченными возможностями здоровья',
    cardImg: '/social-icons/disabled_icon.svg',
    modalImg: '/social-icons/disabled_icon.svg',
    columns: [
      '№',
      'ФИО',
      'Направление/специальность',
      'Справка МСЭ (серия, №, дата, срок действия)',
      'Статус (инвалид/ребенок-инвалид/инвалид с детства/ОВЗ), группа инвалидности',
      'Вид ограничений (нозология)',
      'Дата рождения',
      'Адрес места жительства по справке МСЭ, телефон',
      'Форма обучения (очная/заочная/дистанционная), бюджет/платно'
    ]
  }
];

export const ReportsSection: React.FC = () => {
  const [reports, setReports] = useState<ReportData[]>([
    { id: 1, name: 'Информация о детях-сиротах', type: 'orphans', date: '17.09.2025' },
    { id: 2, name: 'Информация о лицах с инвалидностью', type: 'disabled', date: '07.10.2025' },
    { id: 3, name: 'Информация о детях-сиротах', type: 'orphans', date: '14.02.2026' },
    { id: 4, name: 'Информация о лицах с инвалидностью', type: 'disabled', date: '14.02.2026' },
  ]);

  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [previewType, setPreviewType] = useState<'orphans' | 'disabled' | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'orphans' | 'disabled'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const [config, setConfig] = useState<ReportConfig>({
    type: null,
    actualDate: new Date().toISOString().split('T')[0]
  });

  const filteredReports = useMemo(() => {
    let result = [...reports];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(r => r.name.toLowerCase().includes(term));
    }

    if (typeFilter !== 'all') {
      result = result.filter(r => r.type === typeFilter);
    }

    result.sort((a, b) => {
      if (sortBy === 'date') {
        const parseDate = (d: string) => {
          const [day, month, year] = d.split('.');
          return new Date(`${year}-${month}-${day}`).getTime();
        };
        return sortOrder === 'asc' 
          ? parseDate(a.date) - parseDate(b.date)
          : parseDate(b.date) - parseDate(a.date);
      }
      return sortOrder === 'asc' 
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    });

    return result;
  }, [reports, searchTerm, typeFilter, sortBy, sortOrder]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const openCreateModal = (type: 'orphans' | 'disabled') => {
    setConfig(prev => ({ ...prev, type }));
    setShowCreateModal(true);
  };

  const handleCreateSubmit = () => {
    if (!config.type) return;
    
    const newReport: ReportData = {
      id: Date.now(),
      name: `Информация ${config.type === 'orphans' ? 'о детях-сиротах' : 'о лицах с инвалидностью'}`,
      type: config.type,
      date: new Date().toLocaleDateString('ru-RU'),
    };
    
    setReports(prev => [newReport, ...prev]);
    setShowCreateModal(false);
    setConfig({
      type: null,
      actualDate: new Date().toISOString().split('T')[0]
    });
  };

  const handleDownload = (reportId: number) => {
    console.log(`Скачивание отчета #${reportId} в формате Word`);
  };

  const activeReportType = REPORT_TYPES.find(r => r.key === config.type);

  const InfoIcon = () => (
    <div className="info-icon-btn" tabIndex={0}>
      <button className="header-btn" type="button">
        <span className="info-icon-text">i</span>
        <span>Информация</span>
      </button>
      <div className="info-tooltip small">
        <div className="info-tooltip-content">
          <div className="info-header">
            <div className="info-title">
              <h3>Отчеты</h3>
              <p>Здесь вы можете создавать и скачивать отчеты по социальной работе.</p>
            </div>
          </div>
          <div className="info-section">
            <h4>Основные возможности</h4>
            <div className="features-grid">
              <div className="feature-item">
                <span className="feature-icon"></span>
                <span>Формирование отчетов по детям-сиротам и детям-инвалидам</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon"></span>
                <span>Скачивание отчетов в формате Word</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon"></span>
                <span>Автоматическое формирование по всем группам</span>
              </div>
            </div>
          </div>
          <div className="info-section">
            <h4>Как использовать</h4>
            <div className="usage-steps">
              <div className="step">
                <span className="step-number">1</span>
                <span>Выберите тип отчета из карточек</span>
              </div>
              <div className="step">
                <span className="step-number">2</span>
                <span>Укажите дату актуальности</span>
              </div>
              <div className="step">
                <span className="step-number">3</span>
                <span>Скачайте готовый отчет</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const RefreshButton = () => (
    <button 
      className={`header-btn pc-refresh-btn ${refreshing ? 'pc-refreshing' : ''}`}
      onClick={handleRefresh}
      disabled={refreshing}
    >
      <img 
        src="/st-icons/upload_icon.svg" 
        className={`pc-refresh-icon ${refreshing ? 'pc-refresh-spin' : ''}`}
        alt="Обновить"
      />
      <span>{refreshing ? 'Обновление...' : 'Обновить данные'}</span>
    </button>
  );

  return (
    <div className="reports-section">
      <div className="reports-cabinet-header">
        <InfoIcon />
        <div className="reports-header-actions">
          <RefreshButton />
        </div>
      </div>

      <div className="reports-stats-grid">
        {REPORT_TYPES.map(type => (
          <div key={type.key} className="reports-stat-card">
            <div className="reports-stat-icon">
              <img src={type.cardImg} alt={type.title} />
            </div>
            <div className="reports-stat-info">
              <h3>—</h3>
              <p>{type.title}</p>
            </div>
          </div>
        ))}
        <div className="reports-stat-card">
          <div className="reports-stat-icon">
            <img src="/social-icons/all_od_icon.svg" alt="Всего" />
          </div>
          <div className="reports-stat-info">
            <h3>—</h3>
            <p>Всего студентов</p>
          </div>
        </div>
      </div>

      <div className="reports-quick-create two-columns">
        {REPORT_TYPES.map(type => (
          <div key={type.key} className="report-type-card large">
            <div className="report-type-card-header">
              <div className="report-type-icon-wrap">
                <img src={type.cardImg} alt={type.title} className="report-type-img" />
              </div>
              <div className="report-type-titles">
                <h4>{type.title}</h4>
                <p>{type.subtitle}</p>
              </div>
            </div>
            <div className="report-type-card-body">
              <div className="report-type-actions">
                <button 
                  className="reports-confirm-btn"
                  onClick={() => openCreateModal(type.key)}
                >
                  Сформировать отчёт
                </button>
                <button 
                  className="reports-btn-text"
                  onClick={() => setPreviewType(previewType === type.key ? null : type.key)}
                >
                  {previewType === type.key ? 'Скрыть структуру' : 'Посмотреть структуру'}
                </button>
              </div>
            </div>

            {previewType === type.key && (
              <div className="report-structure-expand">
                <ol className="report-structure-list">
                  {type.columns.map((col, i) => (
                    <li key={i}>
                      <span className="report-structure-num">{i + 1}.</span>
                      <span className="report-structure-text">{col}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="reports-control-panel">
        <div className="reports-controls-top-row">
          <div className="reports-search-box">
            <input
              type="text"
              placeholder="Поиск по названию или типу"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="reports-search-input"
            />
            <div className="reports-search-icon">
              <img src="/social-icons/search_icon.svg" alt="Поиск" />
            </div>
            {searchTerm && (
              <button className="reports-search-clear" onClick={() => setSearchTerm('')}>
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="reports-controls-middle-row">
          <div className="reports-filters-grid">
            <div className="reports-filter-group">
              <label className="reports-filter-label">Тип отчета</label>
              <select 
                className="reports-filter-select"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
              >
                <option value="all">Все типы</option>
                <option value="orphans">Дети-сироты</option>
                <option value="disabled">Дети-инвалиды</option>
              </select>
            </div>
          </div>
        </div>

        <div className="reports-controls-bottom-row">
          <div className="reports-sort-controls">
            <div className="reports-sort-group">
              <label className="reports-sort-label">Сортировка:</label>
              <select 
                className="reports-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="date">По дате</option>
                <option value="name">По названию</option>
              </select>
              <button 
                className="reports-sort-order-btn"
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                title={sortOrder === 'asc' ? 'По возрастанию' : 'По убыванию'}
              >
                <img 
                  src={sortOrder === 'asc' ? "/social-icons/sort_asc_icon.svg" : "/social-icons/sort_desc_icon.svg"} 
                  alt="Сортировка"
                  className="reports-sort-order-icon"
                />
                <span>{sortOrder === 'asc' ? 'По возрастанию' : 'По убыванию'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="recent-reports-section">
        <div className="recent-reports-header">
          <h3>Недавние отчеты</h3>
          <div className="reports-count">
            <img src="/social-icons/documents_icon.svg" alt="Фильтр" />
            <span>Показано: <strong>{filteredReports.length}</strong> из <strong>{reports.length}</strong></span>
          </div>
        </div>
        
        <div className="recent-reports-table-container">
          <table className="reports-table">
            <thead>
              <tr>
                <th className="reports-number-column">№</th>
                <th className="reports-name-column">Название отчета</th>
                <th className="reports-type-column"></th>
                <th className="reports-date-column"></th>
                <th className="reports-actions-column"></th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.length > 0 ? (
                filteredReports.map((report, index) => (
                  <tr key={report.id} className="reports-row">
                    <td className="reports-number-cell">{index + 1}.</td>
                    <td className="reports-name-cell">
                      <div className="reports-name-wrapper">
                        <span className="reports-name">{report.name}</span>
                      </div>
                    </td>
                    <td className="reports-type-cell">
                      <span className="reports-type-badge">
                        {report.type === 'orphans' ? 'Дети-сироты' : 'Дети-инвалиды'}
                      </span>
                    </td>
                    <td className="reports-date-cell">
                      <span className="reports-date">{report.date}</span>
                    </td>
                    <td className="reports-actions-cell">
                      <div className="reports-actions">
                        <button 
                          className="reports-action-btn word-btn"
                          onClick={() => handleDownload(report.id)}
                          title="Скачать Word"
                        >
                          Word
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="reports-empty-cell">
                    Отчеты не найдены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && activeReportType && (
        <div className="reports-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="reports-modal" onClick={(e) => e.stopPropagation()}>
            <div className="reports-modal-header">
              <div className="reports-modal-header-content">
                <div className="reports-modal-icon">
                  <img src={activeReportType.modalImg} alt="" />
                </div>
                <div>
                  <h3>Создание нового отчета</h3>
                  <p className="reports-modal-subtitle">
                    {activeReportType.title}
                  </p>
                </div>
              </div>
              <button 
                className="reports-modal-close"
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="reports-modal-content"> 
              <div className="pc-form-group">
                <label>Дата актуальности (по состоянию на)</label>
                <input
                  type="date"
                  className="pc-input-enhanced"
                  value={config.actualDate}
                  onChange={(e) => setConfig(prev => ({ ...prev, actualDate: e.target.value }))}
                />
              </div>

              <div className="pc-form-group">
                <label>Формат экспорта</label>
                <div className="reports-format-static">
                  <span className="reports-format-badge">Word (.docx)</span>
                </div>
              </div>
            </div>

            <div className="reports-modal-actions">
              <button
                className="reports-btn-secondary"
                onClick={() => setShowCreateModal(false)}
              >
                Отмена
              </button>
              <button
                className="reports-confirm-btn"
                onClick={handleCreateSubmit}
                disabled={!config.actualDate}
              >
                Сформировать отчет
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};