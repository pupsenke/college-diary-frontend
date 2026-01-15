import React, { useState } from 'react';
import './DepartmentManagementSectionStyle.css';
import { GroupDetail } from './GroupDetail';

export const DepartmentManagementSection: React.FC = () => {
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      speciality: 'Прикладная информатика'
    },
  ];

  const handleGroupClick = (groupId: number) => {
    setSelectedGroupId(groupId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedGroupId(null);
  };

  return (
    <>
      <div className="dh-department-container">
        {/* Шапка с названием отделения */}
        <div className="dh-department-header dh-department-header-white">
          <div className="dh-header-content">
            <h1 className="dh-department-title dh-department-title-blue">Отделение информационных технологий</h1>
            <div className="dh-department-meta">
              <span className="dh-groups-count dh-groups-count-blue">{departmentInfo.totalGroups} учебных групп</span>
            </div>
          </div>
        </div>

        {/* Основной контент в сетке */}
        <div className="dhm-department-grid">
          {/* Левая колонка - основная информация */}
          <div className="dh-main-column">
            {/* Блок общей информации */}
            <div className="dh-info-section">
              <div className="dh-section-header">
                <h2 className="dh-section-title">Общая информация</h2>
              </div>
              <div className="dh-info-content">
                <div className="dh-info-card">
                  <div className="dh-info-label">Специальности</div>
                  <div className="dh-specialities-list">
                    {departmentInfo.specialities.map((speciality, index) => (
                      <div key={index} className="dh-speciality-item">
                        <span>{speciality}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="dh-info-stats">
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
            <div className="dh-metrics-section">
              <div className="dh-section-header">
                <h2 className="dh-section-title">Ключевые показатели</h2>
              </div>
              <div className="dh-metrics-grid">
                <div className="dh-metric-card dh-performance-card">
                  <div className="dh-metric-header">
                    <h3 className="dh-metric-title">Средний балл</h3>
                  </div>
                  <div className="dh-metric-value">{departmentInfo.averagePerformance}</div>
                  <div className="dh-metric-progress">
                    <div className="dh-progress-bar">
                      <div className="dh-progress-fill" style={{ width: '82%' }}></div>
                    </div>
                    <span className="dh-progress-text">82% студентов сдают успешно</span>
                  </div>
                </div>

                <div className="dh-metric-card dh-attendance-card">
                  <div className="dh-metric-header">
                    <h3 className="dh-metric-title">Посещаемость</h3>
                  </div>
                  <div className="dh-metric-value">{departmentInfo.averageAttendance}%</div>
                  <div className="dh-metric-progress">
                    <div className="dh-progress-bar">
                      <div className="dh-progress-fill" style={{ width: '86%' }}></div>
                    </div>
                    <span className="dh-progress-text">Высокий уровень посещаемости</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Блок учебных групп */}
            <div className="dh-groups-section">
              <div className="dh-section-header">
                <h2 className="dh-section-title">Учебные группы ({academicGroups.length})</h2>
                <button className="dh-add-group-btn">
                  Добавить группу
                </button>
              </div>
              <div className="dh-groups-grid">
                {academicGroups.map(group => (
                  <div key={group.id} className="dh-group-card" onClick={() => handleGroupClick(group.id)}>
                    <div className="dh-group-header">
                      <div className="dh-group-badge">{group.name}</div>
                      <div className="dh-group-course">{group.course} курс</div>
                    </div>
                    <div className="dh-group-body">
                      <div className="dh-group-metrics">
                        <div className="dh-group-metric">
                          <div className="dh-metric-value">{group.students}</div>
                          <div className="dh-metric-label">студентов</div>
                        </div>
                        <div className="dh-group-metric">
                          <div className="dh-metric-value">{group.performance}</div>
                          <div className="dh-metric-label">средний балл</div>
                        </div>
                        <div className="dh-group-metric">
                          <div className="dh-metric-value">{group.attendance}%</div>
                          <div className="dh-metric-label">посещаемость</div>
                        </div>
                      </div>
                      <div className="dh-group-info">
                        <div className="dh-info-row">
                          <span className="dh-info-label">Куратор:</span>
                          <span className="dh-info-value">{group.curator}</span>
                        </div>
                        <div className="dh-info-row">
                          <span className="dh-info-label">Староста:</span>
                          <span className="dh-info-value">{group.leader}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Правая колонка - управление структурами */}
          <div className="dh-side-column">
            <div className="dh-management-section">
              <div className="dh-section-header">
                <h2 className="dh-section-title">Управление структурами</h2>
              </div>
              <div className="dh-management-actions">
                <button className="dh-management-btn">
                  <div className="dh-btn-content">
                    <div className="dh-btn-title">Добавить группу</div>
                    <div className="dh-btn-description">Создание новой учебной группы</div>
                  </div>
                </button>

                <button className="dh-management-btn">
                  <div className="dh-btn-content">
                    <div className="dh-btn-title">Редактировать группы</div>
                    <div className="dh-btn-description">Изменение данных учебных групп</div>
                  </div>
                </button>

                <button className="dh-management-btn">
                  <div className="dh-btn-content">
                    <div className="dh-btn-title">Закрепить куратора и старосту</div>
                    <div className="dh-btn-description">Назначение ответственных за группы</div>
                  </div>
                </button>

                <div className="dh-management-info">
                  <h3 className="dh-info-title">Быстрые действия</h3>
                  <p className="dh-info-text">
                    На этой странице доступны все инструменты для управления структурой отделения.
                    Вы можете добавлять группы, назначать кураторов и просматривать ключевые показатели.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Модальное окно с информацией о группе */}
      {isModalOpen && selectedGroupId && (
        <div className="dh-modal-overlay" onClick={handleCloseModal}>
          <div className="dh-modal-content" onClick={(e) => e.stopPropagation()}>
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