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
    <div className="dhr-section dhr-reports-section">
      {/* <div className="dhr-section-header">
        <h1 className="dhr-section-title">Отчеты и аналитика</h1>
        <div className="dhr-section-controls">
          <button className="dhr-generate-btn">
            Создать отчет
          </button>
        </div>
      </div>

      <div className="dhr-stats-grid">
        <div className="dhr-stat-card">
          <div className="dhr-stat-content">
            <h3 className="dhr-stat-number">{analyticsData.totalReports}</h3>
            <p className="dhr-stat-label">Всего отчетов</p>
          </div>
        </div>

        <div className="dhr-stat-card">
          <div className="dhr-stat-content">
            <h3 className="dhr-stat-number">{analyticsData.thisMonth}</h3>
            <p className="dhr-stat-label">Отчетов за месяц</p>
          </div>
        </div>

        <div className="dhr-stat-card">
          <div className="dhr-stat-content">
            <h3 className="dhr-stat-number">-</h3>
            <p className="dhr-stat-label">{analyticsData.mostPopular}</p>
          </div>
        </div>

        <div className="dhr-stat-card">
          <div className="dhr-stat-content">
            <h3 className="dhr-stat-number">{analyticsData.averageSize}</h3>
            <p className="dhr-stat-label">Средний размер</p>
          </div>
        </div>
      </div>

      <div className="dhr-reports-content">
        <div className="dhr-categories-sidebar">
          <h3 className="dhr-subsection-title">Категории отчетов</h3>
          <div className="dhr-categories-list">
            {reportCategories.map(category => (
              <button
                key={category.id}
                className={`dhr-category-btn ${activeCategory === category.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(category.id)}
              >
                <span>{category.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="dhr-reports-main">
          <div className="dhr-reports-header">
            <h3 className="dhr-subsection-title">
              {reportCategories.find(cat => cat.id === activeCategory)?.name} отчеты
            </h3>
            <div className="dhr-reports-filters">
              <select className="dhr-filter-select">
                <option>Все периоды</option>
                <option>За месяц</option>
                <option>За семестр</option>
                <option>За год</option>
              </select>
              <select className="dhr-filter-select">
                <option>Все статусы</option>
                <option>Готово</option>
                <option>В обработке</option>
              </select>
            </div>
          </div>

          <div className="dhr-reports-list">
            {reports.map(report => (
              <div key={report.id} className="dhr-report-card">
                
                <div className="dhr-report-content">
                  <h4 className="dhr-report-title">{report.title}</h4>
                  <div className="dhr-report-meta">
                    <span className="dhr-report-generated">Создан: {report.generated}</span>
                  </div>
                </div>

                <div className="dhr-report-status">
                  <span className={`dhr-status-badge dhr-status-${report.status}`}>
                    {report.status === 'ready' && 'Готово'}
                    {report.status === 'processing' && 'В обработке'}
                    {report.status === 'error' && 'Ошибка'}
                  </span>
                </div>

                <div className="dhr-report-actions">
                  <button className="dhr-report-action-btn download">
                    Скачать
                  </button>
                  <button className="dhr-report-action-btn view">
                    Посмотреть
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="dhr-analytics-preview">
            <h3 className="dhr-subsection-title">Аналитика данных</h3>
            <div className="dhr-analytics-cards">
              <div className="dhr-analytics-card">
                <h4>Динамика успеваемости</h4>
                <div className="dhr-chart-placeholder">
                  <p>График успеваемости по месяцам</p>
                </div>
              </div>
              
              <div className="dhr-analytics-card">
                <h4>Распределение нагрузки</h4>
                <div className="dhr-chart-placeholder">
                  <p>Нагрузка по преподавателям</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedReport && (
        <div className="dhr-modal-overlay" onClick={() => setSelectedReport(null)}>
          <div className="dhr-modal" onClick={e => e.stopPropagation()}>
            <div className="dhr-modal-header">
              <h3>Детали отчета</h3>
              <button className="dhr-modal-close" onClick={() => setSelectedReport(null)}>
                ×
              </button>
            </div>
            <div className="dhr-modal-content">
              <div className="dhr-report-detail">
                <div className="dhr-detail-field">
                  <label>Название отчета</label>
                  <p>{selectedReport.title}</p>
                </div>
                <div className="dhr-detail-field">
                  <label>Период</label>
                  <p>{selectedReport.period}</p>
                </div>
                <div className="dhr-detail-field">
                  <label>Дата создания</label>
                  <p>{selectedReport.generated}</p>
                </div>
                <div className="dhr-detail-field">
                  <label>Размер</label>
                  <p>{selectedReport.size}</p>
                </div>
              </div>
            </div>
            <div className="dhr-modal-footer">
              <button className="dhr-btn-secondary">Экспорт</button>
              <button className="dhr-btn-primary">Скачать</button>
            </div>
          </div>
        </div>
      )} */}
    </div>
  );
};