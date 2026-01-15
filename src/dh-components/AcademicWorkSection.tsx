import React, { useState } from 'react';
import './AcademicWorkSectionStyle.css';

interface AcademicGroup {
  id: number;
  name: string;
  course: number;
  studentsCount: number;
  curator: string;
  performance: number;
  attendance: number;
}

interface ScheduleItem {
  id: number;
  group: string;
  subject: string;
  teacher: string;
  time: string;
  classroom: string;
  day: string;
}

export const AcademicWorkSection: React.FC = () => {
  const [activeView, setActiveView] = useState('schedule');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const academicGroups: AcademicGroup[] = [
    {
      id: 1,
      name: '2992',
      course: 4,
      studentsCount: 26,
      curator: 'Голубева Г.А.',
      performance: 4.2,
      attendance: 87.5
    },
    {
      id: 2,
      name: '2991',
      course: 4,
      studentsCount: 24,
      curator: 'Сазонова Н.В.',
      performance: 4.0,
      attendance: 85.2
    }
  ];

  const schedule: ScheduleItem[] = [
    {
      id: 1,
      group: '2992',
      subject: 'Программирование',
      teacher: 'Петров А.В.',
      time: '09:00 - 10:30',
      classroom: 'ауд. 111',
      day: 'Понедельник'
    },
    {
      id: 2,
      group: '2991',
      subject: 'Базы данных',
      teacher: 'Иванова М.П.',
      time: '10:45 - 12:15',
      classroom: 'ауд. 222',
      day: 'Понедельник'
    }
  ];

  const academicStats = {
    totalGroups: 8,
    totalStudents: 192,
    averagePerformance: 4.1,
    averageAttendance: 85.2
  };

  return (
    <div className="dh-section dh-academic-section">
      <div className="dh-section-header">
        <h1 className="dh-section-title">Учебная работа</h1>
        <div className="dh-section-controls">
          <button 
            className={`dh-view-btn ${activeView === 'schedule' ? 'active' : ''}`}
            onClick={() => setActiveView('schedule')}
          >
            Расписание
          </button>
          <button 
            className={`dh-view-btn ${activeView === 'groups' ? 'active' : ''}`}
            onClick={() => setActiveView('groups')}
          >
            Учебные группы
          </button>
          <button 
            className={`dh-view-btn ${activeView === 'performance' ? 'active' : ''}`}
            onClick={() => setActiveView('performance')}
          >
            Успеваемость
          </button>
        </div>
      </div>

      <div className="dh-stats-grid">
        <div className="dh-stat-card">
          <div className="dh-stat-content">
            <h3 className="dh-stat-number">{academicStats.totalGroups}</h3>
            <p className="dh-stat-label">Учебных групп</p>
          </div>
        </div>

        <div className="dh-stat-card">
          <div className="dh-stat-content">
            <h3 className="dh-stat-number">{academicStats.totalStudents}</h3>
            <p className="dh-stat-label">Студентов</p>
          </div>
        </div>

        <div className="dh-stat-card">
          <div className="dh-stat-content">
            <h3 className="dh-stat-number">{academicStats.averagePerformance}</h3>
            <p className="dh-stat-label">Средний балл</p>
          </div>
        </div>

        <div className="dh-stat-card">
          <div className="dh-stat-content">
            <h3 className="dh-stat-number">{academicStats.averageAttendance}%</h3>
            <p className="dh-stat-label">Посещаемость</p>
          </div>
        </div>
      </div>

      {activeView === 'schedule' && (
        <div className="dh-schedule-view">
          <div className="dh-schedule-header">
            <h3 className="dh-subsection-title">Расписание занятий</h3>
            <div className="dh-date-controls">
              <button className="dh-date-btn">
                <p>Назад</p>
              </button>
              <span className="dh-current-date">
                {selectedDate.toLocaleDateString('ru-RU', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
              <button className="dh-date-btn">
                <p>Вперед</p>
              </button>
            </div>
          </div>

          <div className="dh-schedule-grid">
            {schedule.map(item => (
              <div key={item.id} className="dh-schedule-card">
                <div className="dh-schedule-time">{item.time}</div>
                <div className="dh-schedule-content">
                  <h4 className="dh-schedule-subject">{item.subject}</h4>
                  <div className="dh-schedule-details">
                    <span className="dh-schedule-group">{item.group}</span>
                    <span className="dh-schedule-teacher">{item.teacher}</span>
                    <span className="dh-schedule-classroom">{item.classroom}</span>
                  </div>
                </div>
                <div className="dh-schedule-actions">
                  <button className="dh-schedule-action-btn">
                    Реадактировать
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeView === 'groups' && (
        <div className="dh-groups-view">
          <div className="dh-groups-header">
            <h3 className="dh-subsection-title">Учебные группы</h3>
            <button className="dh-add-btn">
              Добавить группу
            </button>
          </div>

          <div className="dh-groups-grid">
            {academicGroups.map(group => (
              <div key={group.id} className="dh-group-card">
                <div className="dh-group-header">
                  <h4 className="dh-group-name">{group.name}</h4>
                  <span className="dh-group-course">{group.course} курс</span>
                </div>
                
                <div className="dh-group-info">
                  <div className="dh-group-stat">
                    <span className="dh-group-stat-value">{group.studentsCount}</span>
                    <span className="dh-group-stat-label">студентов</span>
                  </div>
                  <div className="dh-group-stat">
                    <span className="dh-group-stat-value">{group.performance}</span>
                    <span className="dh-group-stat-label">средний балл</span>
                  </div>
                  <div className="dh-group-stat">
                    <span className="dh-group-stat-value">{group.attendance}%</span>
                    <span className="dh-group-stat-label">посещаемость</span>
                  </div>
                </div>

                <div className="dh-group-curator">
                  <span className="dh-curator-label">Куратор:</span>
                  <span className="dh-curator-name">{group.curator}</span>
                </div>

                <div className="dh-group-actions">
                  <button className="dh-group-btn primary">Подробнее</button>
                  <button className="dh-group-btn secondary">Расписание</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeView === 'performance' && (
        <div className="dh-performance-view">
          <div className="dh-performance-header">
            <h3 className="dh-subsection-title">Мониторинг успеваемости</h3>
            <div className="dh-performance-filters">
              <select className="dh-filter-select">
                <option>Все группы</option>
                <option>2992</option>
                <option>2991</option>
              </select>
              <select className="dh-filter-select">
                <option>Все предметы</option>
                <option>Программирование</option>
                <option>Математика</option>
                <option>Базы данных</option>
              </select>
            </div>
          </div>

          <div className="dh-performance-content">
            <div className="dh-performance-stats">
              <div className="dh-performance-card">
                <h4>Общая успеваемость</h4>
                <div className="dh-performance-value">4.1</div>
                <div className="dh-performance-progress">
                  <div className="dh-progress-bar">
                    <div className="dh-progress-fill" style={{width: '82%'}}></div>
                  </div>
                  <span>82% студентов сдают успешно</span>
                </div>
              </div>

              <div className="dh-performance-card">
                <h4>Академические задолженности</h4>
                <div className="dh-performance-value">8</div>
                <div className="dh-performance-subtext">студентов имеют долги</div>
              </div>

              <div className="dh-performance-card">
                <h4>Отличники</h4>
                <div className="dh-performance-value">24</div>
                <div className="dh-performance-subtext">студентов учатся на отлично</div>
              </div>
            </div>

            <div className="dh-performance-chart">
              <div className="dh-chart-placeholder">
                <p>График успеваемости по группам</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};