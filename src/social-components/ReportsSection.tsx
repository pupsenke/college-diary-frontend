import React, { useState, useEffect } from 'react';
import './ReportsSection.css';

interface ReportData {
  id: number;
  name: string;
  type: string;
  date: string;
  status: 'Утвержден' | 'Ожидает' | 'Отклонен';
  author: string;
}

export const ReportsSection: React.FC = () => {
  // Состояния
  const [reports, setReports] = useState<ReportData[]>([
    { id: 1, name: "Отчет по детям-сиротам", type: "По категории", date: "15.03.2024", status: "Утвержден", author: "Сергеева П.А." },
    { id: 2, name: "Социальный портрет группы 2992", type: "По группе", date: "10.03.2024", status: "Утвержден", author: "Сергеева П.А." },
    { id: 3, name: "Сводный отчет за 1 семестр", type: "Сводный", date: "28.02.2024", status: "Утвержден", author: "Сергеева П.А." },
    { id: 4, name: "Студенты группы риска", type: "По категории", date: "20.02.2024", status: "Ожидает", author: "Сергеева П.А." },
    { id: 5, name: "Отчет по посещаемости", type: "Сводный", date: "15.02.2024", status: "Утвержден", author: "Сергеева П.А." },
    { id: 6, name: "Дети из многодетных семей", type: "По категории", date: "05.02.2024", status: "Утвержден", author: "Сергеева П.А." },
  ]);

  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<string | null>(null);

  // Статистика
  const stats = {
    totalReports: 24,
    pendingReports: 3,
    thisMonth: 5,
    approvedReports: 18
  };

  // Типы отчетов для быстрого создания
  const reportTypes = [
    { 
      icon: 'fas fa-tags', 
      title: 'По категории', 
      description: 'Отчет по студентам определенной социальной категории',
      gradient: 'linear-gradient(135deg, #002FA7 0%, #5986f7 100%)'
    },
    { 
      icon: 'fas fa-users', 
      title: 'По группе', 
      description: 'Детальный отчет по учебной группе',
      gradient: 'linear-gradient(135deg, #002FA7 0%, #5986f7 100%)'
    },
    { 
      icon: 'fas fa-chart-bar', 
      title: 'Сводный отчет', 
      description: 'Общая статистика по всем группам',
      gradient: 'linear-gradient(135deg, #002FA7 0%, #5986f7 100%)'
    },
  ];

  // Шаблоны отчетов
  const templates = [
    { icon: 'fas fa-tags', title: 'По категории', description: 'Стандартный отчет по социальной категории' },
    { icon: 'fas fa-users', title: 'По группе', description: 'Детальный отчет по учебной группе' },
    { icon: 'fas fa-chart-bar', title: 'Сводный отчет', description: 'Общая статистика по всем группам' },
    { icon: 'fas fa-calendar-check', title: 'Посещаемость', description: 'Отчет по посещаемости студентов' },
    { icon: 'fas fa-graduation-cap', title: 'Успеваемость', description: 'Отчет по успеваемости студентов' },
    { icon: 'fas fa-exclamation-triangle', title: 'Группа риска', description: 'Отчет по студентам группы риска' },
  ];

  // Обработчики
  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // В реальном приложении здесь был бы запрос к API
    }, 1000);
  };

  const handleCreateReport = () => {
    setShowCreateModal(true);
  };

  const handleUseTemplate = (template: string) => {
    setCurrentTemplate(template);
    setShowTemplatesModal(false);
    setShowCreateModal(true);
  };

  const handleViewReport = (id: number) => {
    setShowPreviewModal(true);
  };

  const handleEditReport = (id: number) => {
    alert(`Редактирование отчета #${id}`);
  };

  const handleExportReport = (id: number) => {
    alert(`Экспорт отчета #${id}`);
  };

  // Рендер статуса отчета
  const renderStatus = (status: ReportData['status']) => {
    const statusConfig = {
      'Утвержден': { bg: 'rgba(0, 47, 167, 0.1)', color: '#002FA7', border: '1px solid rgba(0, 47, 167, 0.2)' },
      'Ожидает': { bg: 'rgba(255, 167, 38, 0.1)', color: '#ffa726', border: '1px solid rgba(255, 167, 38, 0.2)' },
      'Отклонен': { bg: 'rgba(220, 38, 38, 0.1)', color: '#dc2626', border: '1px solid rgba(220, 38, 38, 0.2)' }
    };

    const config = statusConfig[status];
    return (
      <span style={{
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 600,
        background: config.bg,
        color: config.color,
        border: config.border
      }}>
        {status}
      </span>
    );
  };

  return (
    <div className="reports-section">
      {/* Заголовок */}
      <div className="reports-header">
        <div className="reports-title">
          <h2><i className="fas fa-chart-pie"></i> Отчеты</h2>
          <p>Создание и управление отчетами по социальной работе</p>
        </div>
        
        <div className="reports-actions">
          <button className="btn-primary" onClick={handleCreateReport}>
            <i className="fas fa-plus"></i>
            Создать отчет
          </button>
          <button className="btn-secondary" onClick={() => setShowTemplatesModal(true)}>
            <i className="fas fa-layer-group"></i>
            Шаблоны
          </button>
        </div>
      </div>

      {/* Статистика */}
      <div className="reports-stats-cards">
        <div className="reports-stat-card">
          <div className="reports-stat-icon">
            <i className="fas fa-file-alt"></i>
          </div>
          <div className="reports-stat-info">
            <h3>{stats.totalReports}</h3>
            <p>Всего отчетов</p>
          </div>
        </div>
        
        <div className="reports-stat-card">
          <div className="reports-stat-icon">
            <i className="fas fa-clock"></i>
          </div>
          <div className="reports-stat-info">
            <h3>{stats.pendingReports}</h3>
            <p>Ожидают обработки</p>
          </div>
        </div>
        
        <div className="reports-stat-card">
          <div className="reports-stat-icon">
            <i className="fas fa-calendar-check"></i>
          </div>
          <div className="reports-stat-info">
            <h3>{stats.thisMonth}</h3>
            <p>За этот месяц</p>
          </div>
        </div>
        
        <div className="reports-stat-card">
          <div className="reports-stat-icon">
            <i className="fas fa-check-circle"></i>
          </div>
          <div className="reports-stat-info">
            <h3>{stats.approvedReports}</h3>
            <p>Утверждено</p>
          </div>
        </div>
      </div>

      {/* Таблица отчетов */}
      <div className="reports-table-container">
        <div className="section-header" style={{ padding: '20px 24px', background: '#f8f9ff' }}>
          <h3><i className="fas fa-history"></i> Недавние отчеты</h3>
          <button 
            className="btn-secondary" 
            onClick={handleRefresh} 
            disabled={loading}
            style={{ padding: '10px 15px' }}
          >
            <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
          </button>
        </div>
        
        <table className="reports-table">
          <thead>
            <tr>
              <th>Название отчета</th>
              <th>Тип</th>
              <th>Дата создания</th>
              <th>Статус</th>
              <th>Автор</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {reports.map(report => (
              <tr key={report.id}>
                <td><strong>{report.name}</strong></td>
                <td>
                  <span style={{ 
                    padding: '4px 10px', 
                    background: '#f8f9ff', 
                    borderRadius: '12px', 
                    fontSize: '12px',
                    color: '#002FA7'
                  }}>
                    {report.type}
                  </span>
                </td>
                <td>{report.date}</td>
                <td>{renderStatus(report.status)}</td>
                <td>{report.author}</td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="btn-secondary" 
                      style={{ padding: '5px 10px', fontSize: '12px' }}
                      onClick={() => handleViewReport(report.id)}
                    >
                      <i className="fas fa-eye"></i>
                    </button>
                    <button 
                      className="btn-secondary" 
                      style={{ padding: '5px 10px', fontSize: '12px' }}
                      onClick={() => handleEditReport(report.id)}
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button 
                      className="btn-secondary" 
                      style={{ padding: '5px 10px', fontSize: '12px' }}
                      onClick={() => handleExportReport(report.id)}
                    >
                      <i className="fas fa-download"></i>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Быстрое создание отчетов */}
      <div className="reports-quick-create">
        {reportTypes.map((type, index) => (
          <div key={index} className="report-type-card" onClick={() => handleUseTemplate(type.title)}>
            <div className="report-type-icon" style={{ background: type.gradient }}>
              <i className={type.icon}></i>
            </div>
            <h4>{type.title}</h4>
            <p>{type.description}</p>
          </div>
        ))}
      </div>

      {/* Модальное окно создания отчета */}
      {showCreateModal && (
        <div className="reports-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="reports-modal" onClick={(e) => e.stopPropagation()}>
            <div className="reports-modal-header">
              <h3><i className="fas fa-file-export"></i> Создание нового отчета</h3>
              <button className="reports-modal-close" onClick={() => setShowCreateModal(false)}>
                &times;
              </button>
            </div>
            
            <div className="reports-modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="reports-form-group">
                  <label>Тип отчета</label>
                  <select className="reports-form-select">
                    <option value="">Выберите тип отчета</option>
                    <option value="category">По социальной категории</option>
                    <option value="group">По учебной группе</option>
                    <option value="summary">Сводный отчет</option>
                    <option value="custom">Произвольный отчет</option>
                  </select>
                </div>
                
                <div className="reports-form-group">
                  <label>Название отчета</label>
                  <input 
                    type="text" 
                    className="reports-form-input" 
                    placeholder="Введите название отчета"
                    defaultValue={currentTemplate ? `Отчет: ${currentTemplate}` : ''}
                  />
                </div>
                
                <div className="reports-form-group">
                  <label>Описание</label>
                  <textarea 
                    className="reports-form-textarea" 
                    placeholder="Введите описание отчета" 
                    rows={3}
                  />
                </div>
                
                <div className="reports-form-group">
                  <label>Формат экспорта</label>
                  <div className="reports-radio-group">
                    <label className="reports-radio-label">
                      <input type="radio" name="format" value="pdf" defaultChecked />
                      <span>PDF</span>
                    </label>
                    <label className="reports-radio-label">
                      <input type="radio" name="format" value="excel" />
                      <span>Excel</span>
                    </label>
                    <label className="reports-radio-label">
                      <input type="radio" name="format" value="word" />
                      <span>Word</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="reports-modal-footer">
              <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                Отмена
              </button>
              <button className="btn-primary">
                <i className="fas fa-download"></i> Создать отчет
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно шаблонов */}
      {showTemplatesModal && (
        <div className="reports-modal-overlay" onClick={() => setShowTemplatesModal(false)}>
          <div className="reports-modal" onClick={(e) => e.stopPropagation()}>
            <div className="reports-modal-header">
              <h3><i className="fas fa-layer-group"></i> Шаблоны отчетов</h3>
              <button className="reports-modal-close" onClick={() => setShowTemplatesModal(false)}>
                &times;
              </button>
            </div>
            
            <div className="reports-modal-body">
              <div className="reports-templates-grid">
                {templates.map((template, index) => (
                  <div 
                    key={index} 
                    className="report-template-card"
                    onClick={() => handleUseTemplate(template.title)}
                  >
                    <div className="report-type-icon" style={{ background: 'linear-gradient(135deg, #002FA7 0%, #5986f7 100%)' }}>
                      <i className={template.icon}></i>
                    </div>
                    <h4>{template.title}</h4>
                    <p>{template.description}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="reports-modal-footer">
              <button className="btn-secondary" onClick={() => setShowTemplatesModal(false)}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно предпросмотра */}
      {showPreviewModal && (
        <div className="reports-modal-overlay" onClick={() => setShowPreviewModal(false)}>
          <div className="reports-modal" style={{ maxWidth: '1000px', height: '90vh' }} onClick={(e) => e.stopPropagation()}>
            <div className="reports-modal-header">
              <h3><i className="fas fa-eye"></i> Предпросмотр отчета</h3>
              <button className="reports-modal-close" onClick={() => setShowPreviewModal(false)}>
                &times;
              </button>
            </div>
            
            <div className="reports-modal-body" style={{ height: 'calc(100% - 120px)', overflowY: 'auto' }}>
              <div className="report-preview">
                <div className="report-preview-header">
                  <h1 className="report-preview-title">Отчет по социальной работе</h1>
                  <p className="report-preview-subtitle">Статистика и анализ • {new Date().toLocaleDateString('ru-RU')}</p>
                  <div className="report-preview-metadata">
                    <div>Дата создания: {new Date().toLocaleDateString('ru-RU')}</div>
                    <div>Автор: Сергеева П.А.</div>
                    <div>Политехнический колледж</div>
                  </div>
                </div>
                
                <div className="report-preview-section">
                  <h3>Общая статистика</h3>
                  <div className="report-preview-stats">
                    <div className="report-preview-stat-item">
                      <div className="report-preview-stat-value">450</div>
                      <div className="report-preview-stat-label">Всего студентов</div>
                    </div>
                    <div className="report-preview-stat-item">
                      <div className="report-preview-stat-value">12</div>
                      <div className="report-preview-stat-label">Учебных групп</div>
                    </div>
                    <div className="report-preview-stat-item">
                      <div className="report-preview-stat-value">72%</div>
                      <div className="report-preview-stat-label">Социальный охват</div>
                    </div>
                  </div>
                </div>
                
                <div className="report-preview-section">
                  <h3>Распределение по категориям</h3>
                  <table className="report-preview-table">
                    <thead>
                      <tr>
                        <th>Социальная категория</th>
                        <th>Количество студентов</th>
                        <th>Процент от общего числа</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Дети-сироты</td>
                        <td>24</td>
                        <td>5.3%</td>
                      </tr>
                      <tr>
                        <td>Дети из многодетных семей</td>
                        <td>68</td>
                        <td>15.1%</td>
                      </tr>
                      <tr>
                        <td>Инвалиды и лица с ОВЗ</td>
                        <td>18</td>
                        <td>4.0%</td>
                      </tr>
                      <tr>
                        <td>Малообеспеченные семьи</td>
                        <td>95</td>
                        <td>21.1%</td>
                      </tr>
                      <tr>
                        <td>Студенты группы риска</td>
                        <td>45</td>
                        <td>10.0%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <div className="report-preview-section">
                  <h3>Выводы и рекомендации</h3>
                  <p>На основании анализа социального состава студентов колледжа можно сделать следующие выводы:</p>
                  <ul style={{ marginTop: '10px', paddingLeft: '20px', color: '#666' }}>
                    <li>Наибольшую долю составляют студенты из малообеспеченных семей (21.1%)</li>
                    <li>Требуется усилить работу с детьми-сиротами и студентами группы риска</li>
                    <li>Необходимо разработать дополнительные меры социальной поддержки</li>
                    <li>Рекомендуется увеличить количество индивидуальных консультаций</li>
                  </ul>
                </div>
                
                <div className="report-preview-footer">
                  Отчет сгенерирован автоматически системой социального педагога
                </div>
              </div>
            </div>
            
            <div className="reports-modal-footer">
              <button className="btn-secondary" onClick={() => setShowPreviewModal(false)}>
                Закрыть
              </button>
              <button className="btn-primary">
                <i className="fas fa-download"></i> Скачать отчет
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};