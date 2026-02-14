import React, { useState, useMemo } from 'react';
import './ReportsSection.css';

interface ReportData {
  id: number;
  name: string;
  type: string;
  date: string;
}

interface ReportFilters {
  reportType: string;
  category?: string;
  group?: string;
  course?: string;
  specialty?: string;
  dateFrom: string;
  dateTo: string;
  format: 'pdf' | 'doc';
}

export const ReportsSection: React.FC = () => {
  // Состояния
  const [reports] = useState<ReportData[]>([
    { id: 1, name: "Отчет по детям-сиротам", type: "По категории", date: "14.02.2026" },
    { id: 2, name: "Социальный портрет группы 2992", type: "По группе", date: "10.02.2026" },
    { id: 3, name: "Сводный отчет за 1 семестр", type: "Сводный отчет", date: "18.01.2026" }
  ]);

  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<string | null>(null);
  
  // Фильтры и поиск
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const [reportFilters, setReportFilters] = useState<ReportFilters>({
    reportType: '',
    dateFrom: '',
    dateTo: '',
    format: 'pdf'
  });

  // Данные для фильтров
  const socialCategories = [
    "Дети-сироты",
    "Дети из многодетных семей",
    "Инвалиды и лица с ОВЗ",
    "Малообеспеченные семьи",
    "Мигранты и беженцы",
    "Студенты в трудной жизненной ситуации",
    "Студенты группы риска",
    "Одаренные дети"
  ];

  // Группы по курсам
  const groupsByCourse: Record<string, string[]> = {
    "1": ["1911", "1912", "1913"],
    "2": ["2911", "2912", "2913"],
    "3": ["3911", "3912", "3913"],
    "4": ["4911", "4912", "4913"]
  };

  const specialties = [
    "Информационные системы и программирование",
    "Программирование в компьютерных системах",
    "Сетевое и системное администрирование"
  ];
  
  const reportTypes = ["По категории", "По группе", "Сводный отчет"];

  // Типы отчетов для быстрого создания
  const reportTypeCards = [
    { 
      icon: '/social-icons/all_categories_icon.svg',
      title: 'По категории', 
      description: 'Отчет по студентам определенной социальной категории',
      gradient: 'linear-gradient(135deg, #002FA7 0%, #5986f7 100%)'
    },
    { 
      icon: '/social-icons/responsible_icon.svg',
      title: 'По группе', 
      description: 'Детальный отчет по учебной группе',
      gradient: 'linear-gradient(135deg, #002FA7 0%, #5986f7 100%)'
    },
    { 
      icon: '/social-icons/consolidated_icon.svg',
      title: 'Сводный отчет', 
      description: 'Общая статистика по всем группам',
      gradient: 'linear-gradient(135deg, #002FA7 0%, #5986f7 100%)'
    },
  ];

  // Фильтрация и сортировка отчетов
  const filteredReports = useMemo(() => {
    let result = [...reports];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(report =>
        report.name.toLowerCase().includes(term) ||
        report.type.toLowerCase().includes(term)
      );
    }

    if (typeFilter !== 'all') {
      result = result.filter(report => report.type === typeFilter);
    }

    result.sort((a, b) => {
      let valueA, valueB;
      
      switch(sortBy) {
        case 'name':
          valueA = a.name;
          valueB = b.name;
          break;
        case 'type':
          valueA = a.type;
          valueB = b.type;
          break;
        case 'date':
        default:
          const [dA, mA, yA] = a.date.split('.');
          const [dB, mB, yB] = b.date.split('.');
          valueA = new Date(`${yA}-${mA}-${dA}`).getTime();
          valueB = new Date(`${yB}-${mB}-${dB}`).getTime();
          break;
      }

      if (sortOrder === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });

    return result;
  }, [reports, searchTerm, typeFilter, sortBy, sortOrder]);

  // Обработчики
  const handleRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleCreateReport = (template?: string) => {
    if (template) {
      setCurrentTemplate(template);
      setReportFilters({
        ...reportFilters,
        reportType: template
      });
    }
    setShowCreateModal(true);
  };

  const handleFilterChange = (field: keyof ReportFilters, value: string) => {
    setReportFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleDownload = (reportId: number, format: 'pdf' | 'doc') => {
    console.log(`Скачивание отчета #${reportId} в формате ${format}`);
  };

  const handleCreateSubmit = () => {
    console.log('Создание отчета с параметрами:', reportFilters);
    setShowCreateModal(false);
    setCurrentTemplate(null);
    setReportFilters({
      reportType: '',
      dateFrom: '',
      dateTo: '',
      format: 'pdf'
    });
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

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
                <span>Создание отчетов по категориям и группам</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon"></span>
                <span>Скачивание отчетов в PDF и Word форматах</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon"></span>
                <span>Готовые шаблоны для быстрого создания</span>
              </div>
            </div>
          </div>
          <div className="info-section">
            <h4>Как использовать</h4>
            <div className="usage-steps">
              <div className="step">
                <span className="step-number">1</span>
                <span>Выберите шаблон отчета из карточек</span>
              </div>
              <div className="step">
                <span className="step-number">2</span>
                <span>Заполните параметры отчета в модальном окне</span>
              </div>
              <div className="step">
                <span className="step-number">3</span>
                <span>Скачайте готовый отчет в нужном формате</span>
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

  // Рендер дополнительных полей
  const renderAdditionalFields = () => {
    const reportType = currentTemplate || reportFilters.reportType;

    switch (reportType) {
      case 'По категории':
        return (
          <div className="pc-form-group">
            <label>Социальная категория</label>
            <select 
              className="pc-select-enhanced"
              value={reportFilters.category || ''}
              onChange={(e) => handleFilterChange('category', e.target.value)}
            >
              <option value="">Выберите категорию</option>
              {socialCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        );
      
      case 'По группе':
        return (
          <>
            <div className="pc-form-group">
              <label>Курс</label>
              <select 
                className="pc-select-enhanced"
                value={reportFilters.course || ''}
                onChange={(e) => {
                  handleFilterChange('course', e.target.value);
                  handleFilterChange('group', '');
                }}
              >
                <option value="">Выберите курс</option>
                <option value="1">1 курс</option>
                <option value="2">2 курс</option>
                <option value="3">3 курс</option>
                <option value="4">4 курс</option>
              </select>
            </div>
            
            {reportFilters.course && (
              <div className="pc-form-group">
                <label>Учебная группа</label>
                <select 
                  className="pc-select-enhanced"
                  value={reportFilters.group || ''}
                  onChange={(e) => handleFilterChange('group', e.target.value)}
                >
                  <option value="">Выберите группу</option>
                  {groupsByCourse[reportFilters.course]?.map(group => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
              </div>
            )}
          </>
        );
      
      case 'Сводный отчет':
        return (
          <div className="pc-form-group">
            <label>Специальность</label>
            <select 
              className="pc-select-enhanced"
              value={reportFilters.specialty || ''}
              onChange={(e) => handleFilterChange('specialty', e.target.value)}
            >
              <option value="">Все специальности</option>
              {specialties.map(spec => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="reports-section">
      {/* Заголовок с кнопками */}
      <div className="reports-cabinet-header">
        <InfoIcon />
        <div className="reports-header-actions">
          <RefreshButton />
        </div>
      </div>

      {/* Быстрое создание отчетов */}
      <div className="reports-quick-create">
        {reportTypeCards.map((type, index) => (
          <div 
            key={index} 
            className="report-type-card"
            onClick={() => handleCreateReport(type.title)}
          >
            <div className="report-type-icon" style={{ background: type.gradient }}>
              <img src={type.icon} alt={type.title} className="report-type-svg-icon" />
            </div>
            <h4>{type.title}</h4>
            <p>{type.description}</p>
          </div>
        ))}
      </div>

      {/* Панель управления */}
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
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">Все типы</option>
                {reportTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
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
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="date">По дате</option>
                <option value="name">По названию</option>
                <option value="type">По типу</option>
              </select>
              <button 
                className="reports-sort-order-btn"
                onClick={toggleSortOrder}
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

      {/* Таблица отчетов */}
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
                      <span className="reports-type-badge">{report.type}</span>
                    </td>
                    <td className="reports-date-cell">
                      <span className="reports-date">{report.date}</span>
                    </td>
                    <td className="reports-actions-cell">
                      <div className="reports-actions">
                        <button 
                          className="reports-action-btn pdf-btn"
                          onClick={() => handleDownload(report.id, 'pdf')}
                          title="Скачать PDF"
                        >
                          PDF
                        </button>
                        <button 
                          className="reports-action-btn word-btn"
                          onClick={() => handleDownload(report.id, 'doc')}
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

      {/* Модальное окно создания отчета */}
      {showCreateModal && (
        <div className="reports-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="reports-modal" onClick={(e) => e.stopPropagation()}>
            <div className="reports-modal-header">
              <div className="reports-modal-header-content">
                <div className="reports-modal-icon">
                  <img src="/social-icons/creation_icon.svg" alt="Создать отчет" />
                </div>
                <div>
                  <h3>Создание нового отчета</h3>
                  <p className="reports-modal-subtitle">
                    {currentTemplate || 'Заполните параметры отчета'}
                  </p>
                </div>
              </div>
              <button 
                className="reports-modal-close"
                onClick={() => {
                  setShowCreateModal(false);
                  setCurrentTemplate(null);
                  setReportFilters({
                    reportType: '',
                    dateFrom: '',
                    dateTo: '',
                    format: 'pdf'
                  });
                }}
              >
                ✕
              </button>
            </div>

            <div className="reports-modal-content"> 
              {renderAdditionalFields()}
              
              {/* Период - две колонки */}
              <div className="pc-form-row">
                <div className="pc-form-group pc-form-group-half">
                  <label>Период с</label>
                  <input
                    type="date"
                    className="pc-input-enhanced"
                    value={reportFilters.dateFrom}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  />
                </div>
                <div className="pc-form-group pc-form-group-half">
                  <label>Период по</label>
                  <input
                    type="date"
                    className="pc-input-enhanced"
                    value={reportFilters.dateTo}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  />
                </div>
              </div>

              {/* Формат экспорта */}
              <div className="pc-form-group">
                <label>Формат экспорта</label>
                <div className="format-toggle">
                  <input 
                    type="radio" 
                    name="format" 
                    id="format-pdf"
                    value="pdf" 
                    checked={reportFilters.format === 'pdf'}
                    onChange={(e) => handleFilterChange('format', e.target.value as 'pdf' | 'doc')}
                  />
                  <input 
                    type="radio" 
                    name="format" 
                    id="format-doc"
                    value="doc" 
                    checked={reportFilters.format === 'doc'}
                    onChange={(e) => handleFilterChange('format', e.target.value as 'pdf' | 'doc')}
                  />
                  
                  <div className="format-toggle-slider">
                    <label 
                      htmlFor="format-pdf" 
                      className={`format-option ${reportFilters.format === 'pdf' ? 'active' : ''}`}
                    >
                      PDF
                    </label>
                    <label 
                      htmlFor="format-doc" 
                      className={`format-option ${reportFilters.format === 'doc' ? 'active' : ''}`}
                    >
                      Word
                    </label>
                    <div 
                      className="format-toggle-highlight"
                      style={{
                        left: reportFilters.format === 'pdf' ? '4px' : 'calc(50% + 2px)',
                        width: 'calc(50% - 8px)'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="reports-modal-actions">
              <button
                className="reports-btn-secondary"
                onClick={() => {
                  setShowCreateModal(false);
                  setCurrentTemplate(null);
                  setReportFilters({
                    reportType: '',
                    dateFrom: '',
                    dateTo: '',
                    format: 'pdf'
                  });
                }}
              >
                Отмена
              </button>
              <button
                className="reports-confirm-btn"
                onClick={handleCreateSubmit}
                disabled={!reportFilters.reportType}
              >
                Создать отчет
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};