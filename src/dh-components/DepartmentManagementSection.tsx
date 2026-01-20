import React, { useState } from 'react';
import './DepartmentManagementSectionStyle.css';
import { GroupDetail } from './GroupDetail';

export const DepartmentManagementSection: React.FC = () => {
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const departmentInfo = {
    name: 'Отделение информационных технологий',
    specialities: ['09.02.07 Информационные системы и программирование'],
    totalGroups: 8,
    totalStudents: 192,
    totalTeachers: 24,
    averagePerformance: 4.1,
    averageAttendance: 86.0
  };

  const academicGroups = [
    {
      id: 1,
      name: '2992',
      course: 4,
      students: 26,
      curator: 'Голубева Г.А.',
      leader: 'Шевякова А.И.',
      performance: 4.2,
      attendance: 87.5,
      speciality: 'Информационные системы и программирование'
    },
    {
      id: 2,
      name: '2991',
      course: 4,
      students: 24,
      curator: 'Сазонова Н.В.',
      leader: 'Смирнов А.И.',
      performance: 4.0,
      attendance: 85.2,
      speciality: 'Информационные системы и программирование'
    },
    {
      id: 3,
      name: '2993',
      course: 4,
      students: 28,
      curator: 'Иванов И.И.',
      leader: 'Петров П.П.',
      performance: 4.3,
      attendance: 88.0,
      speciality: 'Информационные системы и программирование'
    },
  ];

  // Функция для поиска групп
  const filteredGroups = academicGroups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.curator.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.leader.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.speciality.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleGroupClick = (groupId: number) => {
    setSelectedGroupId(groupId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedGroupId(null);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  return (
    <>
      <div className="dhm-department-container">
        {/* Шапка с названием отделения */}
        <div className="dhm-department-header dhm-department-header-white">
          <div className="dhm-header-content">
            <h1 className="dhm-department-title dhm-department-title-blue">Отделение информационных технологий</h1>
            <div className="dhm-department-meta">
              <span className="dhm-groups-count dhm-groups-count-blue">{departmentInfo.totalGroups} учебных групп</span>
            </div>
          </div>
        </div>

        {/* Основной контент в сетке */}
        <div className="dhm-department-grid">
          {/* Левая колонка - основная информация */}
          <div className="dhm-main-column-full">
            {/* Блок общей информации */}
            <div className="dhm-info-section">
              <div className="dhm-section-header">
                <h2 className="dhm-section-title">Общая информация</h2>
              </div>
              <div className="dhm-info-content">
                <div className="dhm-info-card">
                  <div className="dhm-info-label">Специальности</div>
                  <div className="dhm-specialities-list">
                    {departmentInfo.specialities.map((speciality, index) => (
                      <div key={index} className="dhm-speciality-item">
                        <span>{speciality}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="dhm-info-stats">
                  <div className="dhm-stat-item">
                    <div className="dhm-stat-content">
                      <div className="dhm-stat-number">{departmentInfo.totalStudents}</div>
                      <div className="dhm-stat-text">студентов</div>
                    </div>
                  </div>

                  <div className="dhm-stat-item">
                    <div className="dhm-stat-content">
                      <div className="dhm-stat-number">{departmentInfo.totalTeachers}</div>
                      <div className="dhm-stat-text">преподавателей</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Блок ключевых показателей */}
            <div className="dhm-metrics-section">
              <div className="dhm-section-header">
                <h2 className="dhm-section-title">Ключевые показатели</h2>
              </div>
              <div className="dhm-metrics-grid">
                <div className="dhm-metric-card dhm-performance-card">
                  <div className="dhm-metric-header">
                    <h3 className="dhm-metric-title">Средний балл</h3>
                  </div>
                  <div className="dhm-metric-value">{departmentInfo.averagePerformance}</div>
                  <div className="dhm-metric-progress">
                    <div className="dhm-progress-bar">
                      <div className="dhm-progress-fill" style={{ width: '82%' }}></div>
                    </div>
                    <span className="dhm-progress-text">82% студентов сдают успешно</span>
                  </div>
                </div>

                <div className="dhm-metric-card dhm-attendance-card">
                  <div className="dhm-metric-header">
                    <h3 className="dhm-metric-title">Посещаемость</h3>
                  </div>
                  <div className="dhm-metric-value">{departmentInfo.averageAttendance}%</div>
                  <div className="dhm-metric-progress">
                    <div className="dhm-progress-bar">
                      <div className="dhm-progress-fill" style={{ width: '86%' }}></div>
                    </div>
                    <span className="dhm-progress-text">Высокий уровень посещаемости</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Блок учебных групп */}
            <div className="dhm-groups-section">
              <div className="dhm-section-header">
                <h2 className="dhm-section-title">Учебные группы ({filteredGroups.length})</h2>
                <div className="dhm-groups-actions">
                  <div className="dhm-search-container">
                    <input
                      type="text"
                      className="dhm-search-input"
                      placeholder="Поиск по группам, кураторам, старостам..."
                      value={searchTerm}
                      onChange={handleSearchChange}
                    />
                  </div>
                  <button className="dhm-add-group-btn">
                    Добавить группу
                  </button>
                </div>
              </div>
              <div className="dhm-groups-grid">
                {filteredGroups.length > 0 ? (
                  filteredGroups.map(group => (
                    <div key={group.id} className="dhm-group-card" onClick={() => handleGroupClick(group.id)}>
                      <div className="dhm-group-header">
                        <div className="dhm-group-badge">{group.name}</div>
                        <div className="dhm-group-course">{group.course} курс</div>
                      </div>
                      <div className="dhm-group-body">
                        <div className="dhm-group-metrics">
                          <div className="dhm-group-metric">
                            <div className="dhm-metric-value">{group.students}</div>
                            <div className="dhm-metric-label">студентов</div>
                          </div>
                          <div className="dhm-group-metric">
                            <div className="dhm-metric-value">{group.performance}</div>
                            <div className="dhm-metric-label">средний балл</div>
                          </div>
                          <div className="dhm-group-metric">
                            <div className="dhm-metric-value">{group.attendance}%</div>
                            <div className="dhm-metric-label">посещаемость</div>
                          </div>
                        </div>
                        <div className="dhm-group-info">
                          <div className="dhm-info-row">
                            <span className="dhm-info-label">Куратор:</span>
                            <span className="dhm-info-value">{group.curator}</span>
                          </div>
                          <div className="dhm-info-row">
                            <span className="dhm-info-label">Староста:</span>
                            <span className="dhm-info-value">{group.leader}</span>
                          </div>
                          <div className="dhm-info-row">
                            <span className="dhm-info-label">Специальность:</span>
                            <span className="dhm-info-value">{group.speciality}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="dhm-no-groups">
                    <p>Группы не найдены. Попробуйте изменить поисковый запрос.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Модальное окно с информацией о группе */}
      {isModalOpen && selectedGroupId && (
        <div className="dhm-modal-overlay" onClick={handleCloseModal}>
          <div className="dhm-modal-content" onClick={(e) => e.stopPropagation()}>
            <GroupDetail 
              groupId={selectedGroupId} 
              onClose={handleCloseModal}
            />
          </div>
        </div>
      )}
    </>
  );
};