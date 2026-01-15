import React, { useState } from 'react';
import './ReportsSectionStyle.css';

interface Report {
  id: number;
  title: string;
  type: string;
  period: string;
  generated: string;
  status: 'ready' | 'processing' | 'error';
  size: string;
}

export const ReportsSection: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('academic');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const reports: Report[] = [
    {
      id: 1,
      title: 'Отчет по успеваемости за семестр',
      type: 'academic',
      period: 'Осенний семестр 2024',
      generated: '15.01.2024',
      status: 'ready',
      size: '2.4 MB'
    },
    {
      id: 2,
      title: 'Статистика посещаемости',
      type: 'attendance',
      period: 'Январь 2024',
      generated: '10.01.2024',
      status: 'ready',
      size: '1.8 MB'
    },
    {
      id: 3,
      title: 'Отчет по учебной нагрузке',
      type: 'workload',
      period: '2023-2024 учебный год',
      generated: '05.01.2024',
      status: 'ready',
      size: '3.2 MB'
    }
  ];

  const reportCategories = [
    { id: 'academic', name: 'Учебные', icon: '' },
    { id: 'attendance', name: 'Посещаемость', icon: '' },
    { id: 'workload', name: 'Нагрузка', icon: '' },
    { id: 'financial', name: 'Финансовые', icon: '' }
  ];

  const analyticsData = {
    totalReports: 24,
    thisMonth: 8,
    mostPopular: 'Успеваемость',
    averageSize: '2.1 MB'
  };

  return (
    <div className="dh-section dh-reports-section">
      <div className="dh-section-header">
        <h1 className="dh-section-title">Отчеты и аналитика</h1>
        <div className="dh-section-controls">
          <button className="dh-generate-btn">
            Создать отчет
          </button>
        </div>
      </div>

      <div className="dh-stats-grid">
        <div className="dh-stat-card">
          <div className="dh-stat-content">
            <h3 className="dh-stat-number">{analyticsData.totalReports}</h3>
            <p className="dh-stat-label">Всего отчетов</p>
          </div>
        </div>

        <div className="dh-stat-card">
          <div className="dh-stat-content">
            <h3 className="dh-stat-number">{analyticsData.thisMonth}</h3>
            <p className="dh-stat-label">Отчетов за месяц</p>
          </div>
        </div>

        <div className="dh-stat-card">
          <div className="dh-stat-content">
            <h3 className="dh-stat-number">-</h3>
            <p className="dh-stat-label">{analyticsData.mostPopular}</p>
          </div>
        </div>

        <div className="dh-stat-card">
          <div className="dh-stat-content">
            <h3 className="dh-stat-number">{analyticsData.averageSize}</h3>
            <p className="dh-stat-label">Средний размер</p>
          </div>
        </div>
      </div>

      <div className="dh-reports-content">
        <div className="dh-categories-sidebar">
          <h3 className="dh-subsection-title">Категории отчетов</h3>
          <div className="dh-categories-list">
            {reportCategories.map(category => (
              <button
                key={category.id}
                className={`dh-category-btn ${activeCategory === category.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(category.id)}
              >
                <span>{category.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="dh-reports-main">
          <div className="dh-reports-header">
            <h3 className="dh-subsection-title">
              {reportCategories.find(cat => cat.id === activeCategory)?.name} отчеты
            </h3>
            <div className="dh-reports-filters">
              <select className="dh-filter-select">
                <option>Все периоды</option>
                <option>За месяц</option>
                <option>За семестр</option>
                <option>За год</option>
              </select>
              <select className="dh-filter-select">
                <option>Все статусы</option>
                <option>Готово</option>
                <option>В обработке</option>
              </select>
            </div>
          </div>

          <div className="dh-reports-list">
            {reports.map(report => (
              <div key={report.id} className="dh-report-card">
                
                <div className="dh-report-content">
                  <h4 className="dh-report-title">{report.title}</h4>
                  <div className="dh-report-meta">
                    <span className="dh-report-generated">Создан: {report.generated}</span>
                  </div>
                </div>

                <div className="dh-report-status">
                  <span className={`dh-status-badge dh-status-${report.status}`}>
                    {report.status === 'ready' && 'Готово'}
                    {report.status === 'processing' && 'В обработке'}
                    {report.status === 'error' && 'Ошибка'}
                  </span>
                </div>

                <div className="dh-report-actions">
                  <button className="dh-report-action-btn download">
                    Скачать
                  </button>
                  <button className="dh-report-action-btn view">
                    Посмотреть
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="dh-analytics-preview">
            <h3 className="dh-subsection-title">Аналитика данных</h3>
            <div className="dh-analytics-cards">
              <div className="dh-analytics-card">
                <h4>Динамика успеваемости</h4>
                <div className="dh-chart-placeholder">
                  <p>График успеваемости по месяцам</p>
                </div>
              </div>
              
              <div className="dh-analytics-card">
                <h4>Распределение нагрузки</h4>
                <div className="dh-chart-placeholder">
                  <p>Нагрузка по преподавателям</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedReport && (
        <div className="dh-modal-overlay" onClick={() => setSelectedReport(null)}>
          <div className="dh-modal" onClick={e => e.stopPropagation()}>
            <div className="dh-modal-header">
              <h3>Детали отчета</h3>
              <button className="dh-modal-close" onClick={() => setSelectedReport(null)}>
                ×
              </button>
            </div>
            <div className="dh-modal-content">
              <div className="dh-report-detail">
                <div className="dh-detail-field">
                  <label>Название отчета</label>
                  <p>{selectedReport.title}</p>
                </div>
                <div className="dh-detail-field">
                  <label>Период</label>
                  <p>{selectedReport.period}</p>
                </div>
                <div className="dh-detail-field">
                  <label>Дата создания</label>
                  <p>{selectedReport.generated}</p>
                </div>
                <div className="dh-detail-field">
                  <label>Размер</label>
                  <p>{selectedReport.size}</p>
                </div>
              </div>
            </div>
            <div className="dh-modal-footer">
              <button className="dh-btn-secondary">Экспорт</button>
              <button className="dh-btn-primary">Скачать</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};