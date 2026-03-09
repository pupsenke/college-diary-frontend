import React, { useState, useEffect } from 'react';
import './ReportsSectionStyle.css';
import { headApiService } from '../services/headApiService';

interface Group {
  id: number;
  numberGroup: number;
  course: number;
  specialty: string;
  profile: string;
  studentsCount?: number;
  formEducation?: string;
  admissionYear?: number;
}

interface Student {
  id: number;
  lastName: string;
  name: string;
  patronymic: string;
  email: string | null;
  telephone?: string | null;
}

interface Subject {
  id: number;
  name: string;
}

interface Grade {
  subject: string;
  grade: number | string;
  date: string;
  teacher: string;
}

export const ReportsSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'diploma' | 'scholarship' | 'session'>('diploma');
  const [groups, setGroups] = useState<Group[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [subjects] = useState<Subject[]>([
    { id: 1, name: 'Математика' },
    { id: 2, name: 'Физика' },
    { id: 3, name: 'Программирование' },
    { id: 4, name: 'Базы данных' },
    { id: 5, name: 'Web-технологии' },
    { id: 6, name: 'Операционные системы' },
    { id: 7, name: 'Компьютерные сети' },
  ]);

  // Загрузка групп при монтировании
  useEffect(() => {
    loadGroups();
  }, []);

  // Фильтрация групп при изменении поискового запроса
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredGroups(groups);
    } else {
      const filtered = groups.filter(group => 
        group.numberGroup.toString().includes(searchTerm) ||
        group.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.profile.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (group.formEducation && group.formEducation.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredGroups(filtered);
    }
  }, [searchTerm, groups]);

  // Загрузка студентов при выборе группы
  useEffect(() => {
    if (selectedGroup) {
      loadStudents(selectedGroup);
    } else {
      setStudents([]);
      setSelectedStudent(null);
    }
  }, [selectedGroup]);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const groupsData = await headApiService.getGroups();
      const groupsWithCounts = await Promise.all(
        groupsData.map(async (group) => {
          try {
            const students = await headApiService.getGroupStudents(group.id);
            return {
              ...group,
              studentsCount: students.length,
              formEducation: group.formEducation || 'очная'
            };
          } catch {
            return {
              ...group,
              studentsCount: 0,
              formEducation: group.formEducation || 'очная'
            };
          }
        })
      );
      setGroups(groupsWithCounts);
      setFilteredGroups(groupsWithCounts);
    } catch (error) {
      console.error('Ошибка при загрузке групп:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async (groupId: number) => {
    try {
      const studentsData = await headApiService.getGroupStudents(groupId);
      setStudents(studentsData);
    } catch (error) {
      console.error('Ошибка при загрузке студентов:', error);
    }
  };

  const handleGroupSelect = (groupId: number) => {
    setSelectedGroup(groupId === selectedGroup ? null : groupId);
  };

  // Демо-данные для оценок диплома
  const diplomaGrades: Grade[] = [
    { subject: 'Математика', grade: 5, date: '15.06.2024', teacher: 'Иванова М.И.' },
    { subject: 'Физика', grade: 4, date: '10.06.2024', teacher: 'Петров А.С.' },
    { subject: 'Программирование', grade: 5, date: '05.06.2024', teacher: 'Сидоров В.В.' },
    { subject: 'Базы данных', grade: 5, date: '01.06.2024', teacher: 'Козлова Е.Н.' },
    { subject: 'Web-технологии', grade: 4, date: '25.05.2024', teacher: 'Морозов Д.А.' },
    { subject: 'Операционные системы', grade: 4, date: '20.05.2024', teacher: 'Волков И.И.' },
  ];

  // Демо-данные для стипендии
  const scholarshipData = [
    { group: '2992', students: 25, scholarshipHolders: 18, increased: 5, social: 2},
    { group: '2991', students: 28, scholarshipHolders: 20, increased: 6, social: 3},
  ];

  return (
    <div className="dhr-section dhr-reports-section">
      {/* Шапка */}
      <div className="dhr-department-header">
        <div className="dhr-header-content">
          <h1 className="dhr-department-title">Отчеты и ведомости</h1>
        </div>
      </div>

      {/* Табы */}
      <div className="dhr-tabs-container">
        <button
          className={`dhr-tab-button ${activeTab === 'diploma' ? 'dhr-tab-active' : ''}`}
          onClick={() => setActiveTab('diploma')}
        >
          Диплом
        </button>
        <button
          className={`dhr-tab-button ${activeTab === 'scholarship' ? 'dhr-tab-active' : ''}`}
          onClick={() => setActiveTab('scholarship')}
        >
          Стипендия
        </button>
        <button
          className={`dhr-tab-button ${activeTab === 'session' ? 'dhr-tab-active' : ''}`}
          onClick={() => setActiveTab('session')}
        >
          Сессия
        </button>
      </div>

      {/* Контент вкладок */}
      <div className="dhr-tab-content">
        {/* Вкладка Диплом */}
        {activeTab === 'diploma' && (
          <div className="dhr-diploma-content">
            {/* Поиск групп */}
            <div className="dhr-search-section">
              <div className="dhr-search-container">
                <input
                  type="text"
                  className="dhr-search-input"
                  placeholder="Поиск групп по номеру, специальности или профилю..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Карточки групп */}
            <div className="dhr-groups-grid">
              {loading ? (
                <div className="dhr-loading-groups">
                  <div className="dhr-loading-spinner"></div>
                  <p>Загрузка групп...</p>
                </div>
              ) : filteredGroups.length > 0 ? (
                filteredGroups.map(group => (
                  <div
                    key={group.id}
                    className={`dhr-group-card ${selectedGroup === group.id ? 'dhr-group-card-selected' : ''}`}
                    onClick={() => handleGroupSelect(group.id)}
                  >
                    <div className="dhr-group-card-header">
                      <div className="dhr-group-badge">
                        {group.numberGroup}
                      </div>
                      <div className="dhr-group-course">
                        {group.course} курс
                      </div>
                    </div>
                    
                    <div className="dhr-group-card-body">
                      <div className="dhr-group-stats">
                        <div className="dhr-group-stat">
                          <div className="dhr-stat-value">{group.studentsCount || 0}</div>
                          <div className="dhr-stat-label">студентов</div>
                        </div>
                        <div className="dhr-group-stat">
                          <div className="dhr-stat-value">
                            {group.formEducation === 'очная' ? 'Очно' : 
                             group.formEducation === 'заочная' ? 'Заочно' : group.formEducation}
                          </div>
                          <div className="dhr-stat-label">форма</div>
                        </div>
                        <div className="dhr-group-stat">
                          <div className="dhr-stat-value">{group.admissionYear || '—'}</div>
                          <div className="dhr-stat-label">год пост.</div>
                        </div>
                      </div>

                      <div className="dhr-group-info">
                        <div className="dhr-info-row">
                          <span className="dhr-info-label">Специальность:</span>
                          <span className="dhr-info-value">{group.specialty}</span>
                        </div>
                      </div>
                    </div>

                    {selectedGroup === group.id && (
                      <div className="dhr-group-card-footer">
                        <span className="dhr-selected-badge">Выбрана</span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="dhr-no-groups">
                  <p>Группы не найдены. Попробуйте изменить поисковый запрос.</p>
                </div>
              )}
            </div>

            {/* Студенты и оценки выбранной группы */}
            {selectedGroup && (
              <div className="dhr-split-layout">
                {/* Список студентов */}
                <div className="dhr-students-list">
                  <h3 className="dhr-section-subtitle">
                    Студенты группы
                    <span className="dhr-student-count">{students.length}</span>
                  </h3>
                  
                  {students.length > 0 ? (
                    <div className="dhr-students-grid">
                      {students.map(student => (
                        <div
                          key={student.id}
                          className={`dhr-student-card ${selectedStudent?.id === student.id ? 'dhr-student-card-selected' : ''}`}
                          onClick={() => setSelectedStudent(student)}
                        >
                          <div className="dhr-student-avatar">
                            {student.lastName.charAt(0)}{student.name.charAt(0)}
                          </div>
                          <div className="dhr-student-info">
                            <div className="dhr-student-name">
                              {student.lastName} {student.name} {student.patronymic}
                            </div>
                            {student.email && (
                              <div className="dhr-student-email">{student.email}</div>
                            )}
                            {student.telephone && (
                              <div className="dhr-student-phone">{student.telephone}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="dhr-no-students">
                      <p>В группе нет студентов</p>
                    </div>
                  )}
                </div>

                {/* Оценки выбранного студента */}
                <div className="dhr-grades-section">
                  {selectedStudent ? (
                    <>
                      <div className="dhr-grades-header">
                        <h3 className="dhr-section-subtitle">
                          Оценки диплома
                          <span className="dhr-student-subtitle">
                            {selectedStudent.lastName} {selectedStudent.name}
                          </span>
                        </h3>
                        <div className="dhr-actions">
                          <button className="dhr-action-btn dhr-edit-btn">
                           Редактировать
                          </button>
                          <button className="dhr-action-btn dhr-export-btn">
                           Экспорт
                          </button>
                        </div>
                      </div>

                      <div className="dhr-grades-summary">
                        <div className="dhr-summary-item">
                          <span className="dhr-summary-label">Средний балл:</span>
                          <span className="dhr-summary-value">4.5</span>
                        </div>
                        <div className="dhr-summary-item">
                          <span className="dhr-summary-label">Всего предметов:</span>
                          <span className="dhr-summary-value">{diplomaGrades.length}</span>
                        </div>
                      </div>

                      <div className="dhr-grades-table-container">
                        <table className="dhr-grades-table">
                          <thead>
                            <tr>
                              <th>Предмет</th>
                              <th>Оценка</th>
                              <th>Дата</th>
                              <th>Преподаватель</th>
                            </tr>
                          </thead>
                          <tbody>
                            {diplomaGrades.map((grade, index) => (
                              <tr key={index}>
                                <td>{grade.subject}</td>
                                <td>
                                  <span className={`dhr-grade-badge dhr-grade-${grade.grade}`}>
                                    {grade.grade}
                                  </span>
                                </td>
                                <td>{grade.date}</td>
                                <td>{grade.teacher}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      
                    </>
                  ) : (
                    <div className="dhr-no-selection">
                      <p>Выберите студента для просмотра оценок</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Вкладка Стипендия */}
        {activeTab === 'scholarship' && (
          <div className="dhr-scholarship-content">
            {/* Поиск и фильтры */}
            <div className="dhr-filters-section">
              <div className="dhr-search-container">
                <input
                  type="text"
                  className="dhr-search-input"
                  placeholder="Поиск по группам..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="dhr-filters-group">
                <div className="dhr-filter-item">
                  <label className="dhr-filter-label">Учебный год:</label>
                  <select className="dhr-filter-select">
                    <option value="2025-2026" selected>2025-2026</option>
                    <option value="2024-2025">2024-2025</option>
                    <option value="2023-2024">2023-2024</option>
                    <option value="2022-2023">2022-2023</option>
                  </select>
                </div>
                
                <div className="dhr-filter-item">
                  <label className="dhr-filter-label">Семестр:</label>
                  <select className="dhr-filter-select">
                    <option value="1">1 семестр</option>
                    <option value="2" selected>2 семестр</option>
                  </select>
                </div>
              </div>
              
            </div>

            {/* Карточки групп для стипендии */}
            <div className="dhr-scholarship-groups">
              {scholarshipData
                .filter(item => item.group.includes(searchTerm))
                .map((item, index) => (
                  <div key={index} className="dhr-scholarship-card">
                    <div className="dhr-scholarship-card-header">
                      <h4 className="dhr-scholarship-group-title">{item.group}</h4>
                      <span className="dhr-scholarship-total">{item.students} студ.</span>
                    </div>
                    
                    <div className="dhr-scholarship-stats">
                      <div className="dhr-scholarship-stat-row">
                        <span className="dhr-stat-label">"5"</span>
                        <span className="dhr-stat-value dhr-excellent-value">8</span>
                      </div>
                      <div className="dhr-scholarship-stat-row">
                        <span className="dhr-stat-label">"4" и "5"</span>
                        <span className="dhr-stat-value dhr-good-value">15</span>
                      </div>
                      <div className="dhr-scholarship-stat-row">
                        <span className="dhr-stat-label">Не получают стипендию</span>
                        <span className="dhr-stat-value dhr-no-scholarship-value">
                          {item.students - item.scholarshipHolders}
                        </span>
                      </div>
                    </div>
                    
                    <div className="dhr-scholarship-footer">
                      <button className="dhr-scholarship-details">Подробнее о группе</button>
                    </div>
                  </div>
                ))}
            </div>

            {/* Сводная таблица */}
            <div className="dhr-scholarship-summary">
              <h3 className="dhr-section-subtitle">Сводная информация по группам</h3>
              <div className="dhr-table-info">
                <span className="dhr-table-period">Учебный год: 2025-2026, 2 семестр</span>
              </div>
              <div className="dhr-scholarship-table-container">
                <table className="dhr-scholarship-table">
                  <thead>
                    <tr>
                      <th>Группа</th>
                      <th>Всего студентов</th>
                      <th>Стипендия "5"</th>
                      <th>Стипендия "4" и "5"</th>
                      <th>Не получают стипендию</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scholarshipData
                      .filter(item => item.group.includes(searchTerm))
                      .map((item, index) => (
                        <tr key={index}>
                          <td className="dhr-group-cell">{item.group}</td>
                          <td className="dhr-number-cell">{item.students}</td>
                          <td className="dhr-number-cell dhr-excellent-cell">8</td>
                          <td className="dhr-number-cell dhr-good-cell">15</td>
                          <td className="dhr-number-cell dhr-no-scholarship-cell">
                            {item.students - item.scholarshipHolders}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Вкладка Сессия */}
        {activeTab === 'session' && (
          <div className="dhr-session-content">
            {/* Поиск и фильтры */}
            <div className="dhr-filters-section">
              <div className="dhr-search-container">
                <input
                  type="text"
                  className="dhr-search-input"
                  placeholder="Поиск групп..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="dhr-filters-group">
                <div className="dhr-filter-item">
                  <label className="dhr-filter-label">Учебный год:</label>
                  <select className="dhr-filter-select">
                    <option value="2025-2026" selected>2025-2026</option>
                    <option value="2024-2025">2024-2025</option>
                    <option value="2023-2024">2023-2024</option>
                    <option value="2022-2023">2022-2023</option>
                  </select>
                </div>
                
                <div className="dhr-filter-item">
                  <label className="dhr-filter-label">Семестр:</label>
                  <select className="dhr-filter-select">
                    <option value="1">1 семестр</option>
                    <option value="2" selected>2 семестр</option>
                  </select>
                </div>
              </div>
              
            </div>

            {/* Карточки групп для сессии */}
            <div className="dhr-groups-grid dhr-small-cards">
              {filteredGroups.slice(0, 6).map(group => (
                <div
                  key={group.id}
                  className={`dhr-group-card dhr-small-card ${selectedGroup === group.id ? 'dhr-group-card-selected' : ''}`}
                  onClick={() => setSelectedGroup(group.id)}
                >
                  <div className="dhr-group-card-header">
                    <div className="dhr-group-badge dhr-small-badge">
                      {group.numberGroup}
                    </div>
                  </div>
                  <div className="dhr-group-card-body dhr-small-body">
                    <div className="dhr-group-info">
                      <div className="dhr-info-row">
                        <span className="dhr-info-label">Студентов:</span>
                        <span className="dhr-info-value">{group.studentsCount || 0}</span>
                      </div>
                      <div className="dhr-info-row">
                        <span className="dhr-info-label">Курс:</span>
                        <span className="dhr-info-value">{group.course}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Выбор предмета */}
            {selectedGroup && (
              <>
                <div className="dhr-filters">
                  <div className="dhr-filter-group">
                    <label className="dhr-filter-label">Предмет экзамена:</label>
                    <select
                      className="dhr-filter-select"
                      value={selectedSubject || ''}
                      onChange={(e) => setSelectedSubject(Number(e.target.value) || null)}
                    >
                      <option value="">Выберите предмет</option>
                      {subjects.map(subject => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedSubject && (
                  <div className="dhr-session-result">
                    <div className="dhr-session-header">
                      <h3 className="dhr-section-subtitle">Аттестационная ведомость</h3>
                      <div className="dhr-actions">
                        <button className="dhr-action-btn dhr-export-btn">
                          Экспорт
                        </button>
                        <button className="dhr-action-btn dhr-view-btn">
                          Просмотр
                        </button>
                      </div>
                    </div>

                    <div className="dhr-session-info">
                      <div className="dhr-info-grid">
                        <div className="dhr-info-item">
                          <span className="dhr-info-label">Группа:</span>
                          <span className="dhr-info-value">
                            {groups.find(g => g.id === selectedGroup)?.numberGroup}
                          </span>
                        </div>
                        <div className="dhr-info-item">
                          <span className="dhr-info-label">Предмет:</span>
                          <span className="dhr-info-value">
                            {subjects.find(s => s.id === selectedSubject)?.name}
                          </span>
                        </div>
                        <div className="dhr-info-item">
                          <span className="dhr-info-label">Преподаватель:</span>
                          <span className="dhr-info-value">Неизвестно</span>
                        </div>
                        <div className="dhr-info-item">
                          <span className="dhr-info-label">Учебный год:</span>
                          <span className="dhr-info-value">2024-2025</span>
                        </div>
                        <div className="dhr-info-item">
                          <span className="dhr-info-label">Семестр:</span>
                          <span className="dhr-info-value">2 семестр</span>
                        </div>
                        
                      </div>
                    </div>

                    <div className="dhr-session-table-container">
                      <table className="dhr-session-table">
                        <thead>
                          <tr>
                            <th>№</th>
                            <th>ФИО студента</th>
                            <th>Оценка</th>
                          </tr>
                        </thead>
                        <tbody>
                          {students.map((student, index) => (
                            <tr key={student.id}>
                              <td className="dhr-number-cell">{index + 1}</td>
                              <td>{student.lastName} {student.name} {student.patronymic}</td>
                              <td className="dhr-grade-cell">
                                <select className="dhr-grade-select" defaultValue="">
                                  <option value="">-</option>
                                  <option value="5">5 (отлично)</option>
                                  <option value="4">4 (хорошо)</option>
                                  <option value="3">3 (удовл.)</option>
                                  <option value="2">2 (неуд.)</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};