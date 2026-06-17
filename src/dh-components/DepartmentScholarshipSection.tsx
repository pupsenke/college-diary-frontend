import React, { useState, useEffect } from 'react';
import { headApiService, StudentInfo, ScholarshipCategory } from '../services/headApiService';
import './DepartmentScholarshipSectionStyle.css';

interface DepartmentScholarshipStats {
  totalStudents: number;
  receivingCount: number;
  coveragePercent: number;
  byCourse: {
    [course: number]: {
      total: number;
      excellent: number;
      goodExcellent: number;
      good: number;
      none: number;
    };
  };
  byGroup: Array<{
    groupId: number;
    groupName: string;
    course: number;
    total: number;
    excellent: number;
    goodExcellent: number;
    good: number;
    none: number;
    coveragePercent: number;
  }>;
}

interface DepartmentScholarshipSectionProps {
  onClose?: () => void;
}

export const DepartmentScholarshipSection: React.FC<DepartmentScholarshipSectionProps> = ({ onClose }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DepartmentScholarshipStats | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<number | 'all'>('all');
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [groupStudents, setGroupStudents] = useState<StudentInfo[]>([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<StudentInfo | null>(null);
  const [groupScholarshipCategories, setGroupScholarshipCategories] = useState<ScholarshipCategory[]>([]);
  const [loadingGroupData, setLoadingGroupData] = useState(false);

  // Функция для получения категорий стипендий группы
  const loadGroupScholarshipCategories = async (groupId: number): Promise<ScholarshipCategory[]> => {
    try {
      const categories = await headApiService.getStudentsByScholarshipCategories(groupId);
      return categories;
    } catch (error) {
      console.error(`Ошибка при загрузке категорий стипендий для группы ${groupId}:`, error);
      return [];
    }
  };

  // Функция для получения категории студента
  const getStudentCategory = (studentFullName: string, categories: ScholarshipCategory[]): string => {
    for (const category of categories) {
      if (category.students.includes(studentFullName)) {
        return category.category;
      }
    }
    return 'none';
  };


  const getStudentFullName = (student: StudentInfo): string => {
    return `${student.lastName} ${student.name} ${student.patronymic}`;
  };

  const loadDepartmentScholarshipStats = async () => {
    setLoading(true);
    try {
      const groups = await headApiService.getGroups();
      const filteredGroups = groups.filter(g => g.specialty === "09.02.07 Информационные системы и программирование");
      
      const byCourse: DepartmentScholarshipStats['byCourse'] = { 
        1: { total: 0, excellent: 0, goodExcellent: 0, good: 0, none: 0 }, 
        2: { total: 0, excellent: 0, goodExcellent: 0, good: 0, none: 0 }, 
        3: { total: 0, excellent: 0, goodExcellent: 0, good: 0, none: 0 }, 
        4: { total: 0, excellent: 0, goodExcellent: 0, good: 0, none: 0 } 
      };
      const byGroup: DepartmentScholarshipStats['byGroup'] = [];
      let totalStudents = 0;
      let totalExcellent = 0;
      let totalGoodExcellent = 0;
      let totalGood = 0;
      let totalNone = 0;

      for (const group of filteredGroups) {
        const students = await headApiService.getGroupStudents(group.id);
        
        const scholarshipCategories = await loadGroupScholarshipCategories(group.id);
        
        let groupExcellent = 0, groupGoodExcellent = 0, groupGood = 0, groupNone = 0;
        
        for (const student of students) {
          const studentFullName = getStudentFullName(student);
          const category = getStudentCategory(studentFullName, scholarshipCategories);
          
          switch (category) {
            case '5': groupExcellent++; break;
            case '4-5': groupGoodExcellent++; break;
            case '4': groupGood++; break;
            default: groupNone++;
          }
        }
        
        const course = group.course;
        byCourse[course].total += students.length;
        byCourse[course].excellent += groupExcellent;
        byCourse[course].goodExcellent += groupGoodExcellent;
        byCourse[course].good += groupGood;
        byCourse[course].none += groupNone;
        
        totalStudents += students.length;
        totalExcellent += groupExcellent;
        totalGoodExcellent += groupGoodExcellent;
        totalGood += groupGood;
        totalNone += groupNone;
        
        byGroup.push({
          groupId: group.id,
          groupName: group.numberGroup.toString(),
          course: group.course,
          total: students.length,
          excellent: groupExcellent,
          goodExcellent: groupGoodExcellent,
          good: groupGood,
          none: groupNone,
          coveragePercent: students.length > 0 ? ((groupExcellent + groupGoodExcellent + groupGood) / students.length) * 100 : 0
        });
      }

      const receivingCount = totalExcellent + totalGoodExcellent + totalGood;
      
      setStats({
        totalStudents,
        receivingCount,
        coveragePercent: totalStudents > 0 ? (receivingCount / totalStudents) * 100 : 0,
        byCourse,
        byGroup: byGroup.sort((a, b) => a.groupName.localeCompare(b.groupName))
      });
    } catch (error) {
      console.error('Ошибка загрузки статистики стипендий:', error);
    } finally {
      setLoading(false);
    }
  };

  // Функция для открытия модального окна с детальной информацией о группе
  const handleGroupClick = async (groupId: number) => {
    setLoadingGroupData(true);
    try {
      const students = await headApiService.getGroupStudents(groupId);
      setGroupStudents(students);
      setSelectedGroup(groupId);
      
      const categories = await loadGroupScholarshipCategories(groupId);
      setGroupScholarshipCategories(categories);
      
      setShowGroupModal(true);
    } catch (error) {
      console.error('Ошибка загрузки студентов группы:', error);
    } finally {
      setLoadingGroupData(false);
    }
  };

  // Функция для получения категории студента в модальном окне
  const getModalStudentCategory = (studentFullName: string): string => {
    return getStudentCategory(studentFullName, groupScholarshipCategories);
  };

  // Функция для получения названия категории стипендии
  const getScholarshipTypeName = (category: string): string => {
    const types: Record<string, string> = {
      '5': 'Повышенная стипендия (+50%)',
      '4-5': 'Повышенная стипендия (+25%)',
      '4': 'Стандартная стипендия',
      'none': 'Не получает стипендию'
    };
    return types[category] || types.none;
  };

  // Функция для получения цвета категории стипендии
  const getScholarshipColor = (category: string): string => {
    const colors: Record<string, string> = {
      '5': '#10b981',
      '4-5': '#3b82f6',
      '4': '#f59e0b',
      'none': '#ef4444'
    };
    return colors[category] || colors.none;
  };

  useEffect(() => {
    loadDepartmentScholarshipStats();
  }, []);

  const filteredGroups = stats?.byGroup.filter(g => selectedCourse === 'all' || g.course === selectedCourse) || [];

  if (loading) {
    return (
      <div className="dhp-department-scholarship">
        <div className="dss-loading">
          <div className="dss-loading-spinner"></div>
          <p>Загрузка статистики стипендий...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="dhp-department-scholarship">
        <div className="dss-error">
          <p>Не удалось загрузить данные</p>
          <button onClick={loadDepartmentScholarshipStats} className="dss-retry-btn">Повторить</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dhp-department-scholarship">
      <div className="dss-header">
        <div className="dss-header-left">
          <h2 className="dss-title">Статистика стипендий по отделению</h2>
          <p className="dss-subtitle">Информация о назначении государственной академической стипендии</p>
        </div>
      </div>

      {/* Карточки с общей статистикой */}
      <div className="dss-stats-cards">
        <div className="dss-stat-card">
          <div className="dss-stat-value">{stats.coveragePercent.toFixed(1)}%</div>
          <div className="dss-stat-label">Охват стипендиями</div>
        </div>
        <div className="dss-stat-card">
          <div className="dss-stat-value">{stats.receivingCount}</div>
          <div className="dss-stat-label">Получают стипендию</div>
        </div>
        <div className="dss-stat-card">
          <div className="dss-stat-value">{stats.totalStudents - stats.receivingCount}</div>
          <div className="dss-stat-label">Не получают стипендию</div>
        </div>
      </div>

      {/* Распределение по курсам */}
      <div className="dss-section">
        <h3 className="dss-section-title">Распределение по курсам</h3>
        <div className="dss-courses-grid">
          {[1, 2, 3, 4].map(course => (
            <div key={course} className="dss-course-card">
              <div className="dss-course-header">{course} курс</div>
              <div className="dss-course-stats">
                <div className="dss-course-stat">
                  <span className="dss-course-stat-value">{stats.byCourse[course].total}</span>
                  <span className="dss-course-stat-label">студентов</span>
                </div>
                <div className="dss-course-stat">
                  <span className="dss-course-stat-value">{stats.byCourse[course].excellent}</span>
                  <span className="dss-course-stat-label">+50%</span>
                </div>
                <div className="dss-course-stat">
                  <span className="dss-course-stat-value">{stats.byCourse[course].goodExcellent}</span>
                  <span className="dss-course-stat-label">+25%</span>
                </div>
                <div className="dss-course-stat">
                  <span className="dss-course-stat-value">{stats.byCourse[course].good}</span>
                  <span className="dss-course-stat-label">стандарт</span>
                </div>
              </div>
              <div className="dss-course-progress">
                <div className="dss-progress-bar">
                  <div 
                    className="dss-progress-fill excellent" 
                    style={{ width: `${(stats.byCourse[course].excellent / stats.byCourse[course].total) * 100}%` }}
                    title={`Повышенная 50%: ${stats.byCourse[course].excellent}`}
                  ></div>
                  <div 
                    className="dss-progress-fill good-excellent" 
                    style={{ width: `${(stats.byCourse[course].goodExcellent / stats.byCourse[course].total) * 100}%` }}
                    title={`Повышенная 25%: ${stats.byCourse[course].goodExcellent}`}
                  ></div>
                  <div 
                    className="dss-progress-fill good" 
                    style={{ width: `${(stats.byCourse[course].good / stats.byCourse[course].total) * 100}%` }}
                    title={`Стандартная: ${stats.byCourse[course].good}`}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Таблица групп */}
      <div className="dss-section">
        <div className="dss-section-header">
          <h3 className="dss-section-title">Распределение по группам</h3>
          <div className="dss-course-filter">
            <button 
              className={`dss-filter-btn ${selectedCourse === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCourse('all')}
            >
              Все курсы
            </button>
            {[1, 2, 3, 4].map(course => (
              <button
                key={course}
                className={`dss-filter-btn ${selectedCourse === course ? 'active' : ''}`}
                onClick={() => setSelectedCourse(course)}
              >
                {course} курс
              </button>
            ))}
          </div>
        </div>
        
        <div className="dss-table-container">
          <table className="dss-groups-table">
            <thead>
              <tr>
                <th>Группа</th>
                <th>Курс</th>
                <th>Студентов</th>
                <th>+50% (5)</th>
                <th>+25% (4-5)</th>
                <th>Стандарт (4)</th>
                <th>Не получают</th>
                <th>Охват</th>
              </tr>
            </thead>
            <tbody>
              {filteredGroups.map(group => (
                <tr key={group.groupId} onClick={() => handleGroupClick(group.groupId)} className="dss-group-row" style={{ cursor: 'pointer' }}>
                  <td className="dss-group-name">Группа {group.groupName}</td>
                  <td>{group.course}</td>
                  <td>{group.total}</td>
                  <td className="dss-cell-excellent">{group.excellent}</td>
                  <td className="dss-cell-good-excellent">{group.goodExcellent}</td>
                  <td className="dss-cell-good">{group.good}</td>
                  <td className="dss-cell-none">{group.none}</td>
                  <td className="dss-cell-coverage">
                    <div className="dss-coverage-badge" style={{ backgroundColor: group.coveragePercent >= 70 ? '#10b981' : group.coveragePercent >= 50 ? '#f59e0b' : '#ef4444' }}>
                      {group.coveragePercent.toFixed(1)}%
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Модальное окно с детальной информацией о группе */}
      {showGroupModal && (
        <div className="dss-modal-overlay" onClick={() => setShowGroupModal(false)}>
          <div className="dss-group-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dss-modal-header">
              <h3>Стипендии группы</h3>
              <button className="dss-modal-close" onClick={() => setShowGroupModal(false)}>×</button>
            </div>
            <div className="dss-modal-content">
              {loadingGroupData ? (
                <div className="dss-loading-small">
                  <div className="dss-loading-spinner-small"></div>
                  <p>Загрузка данных...</p>
                </div>
              ) : (
                <div className="dss-group-details">
                  <div className="dss-group-info-header">
                    <h4>Всего студентов: {groupStudents.length}</h4>
                  </div>
                  
                  <div className="dss-scholarship-categories">
                    {/* Категория: Повышенная стипендия (+50%) */}
                    <div className="dss-category-block excellent">
                      <div className="dss-category-title">
                        <span className="dss-category-badge excellent"></span>
                        <span>Повышенная стипендия (+50%)</span>
                        <span className="dss-category-count">
                          {groupStudents.filter(s => getModalStudentCategory(getStudentFullName(s)) === '5').length}
                        </span>
                      </div>
                      <div className="dss-category-students">
                        {groupStudents.filter(s => getModalStudentCategory(getStudentFullName(s)) === '5').map((student, idx) => (
                          <div 
                            key={student.id} 
                            className="dss-student-item"
                            onClick={() => setSelectedStudentForDetails(student)}
                          >
                            {getStudentFullName(student)}
                          </div>
                        ))}
                        {groupStudents.filter(s => getModalStudentCategory(getStudentFullName(s)) === '5').length === 0 && (
                          <div className="dss-empty-category">Нет студентов</div>
                        )}
                      </div>
                    </div>

                    {/* Категория: Повышенная стипендия (+25%) */}
                    <div className="dss-category-block goodexcellent">
                      <div className="dss-category-title">
                        <span className="dss-category-badge goodexcellent"></span>
                        <span>Повышенная стипендия (+25%)</span>
                        <span className="dss-category-count">
                          {groupStudents.filter(s => getModalStudentCategory(getStudentFullName(s)) === '4-5').length}
                        </span>
                      </div>
                      <div className="dss-category-students">
                        {groupStudents.filter(s => getModalStudentCategory(getStudentFullName(s)) === '4-5').map((student, idx) => (
                          <div 
                            key={student.id} 
                            className="dss-student-item"
                            onClick={() => setSelectedStudentForDetails(student)}
                          >
                            {getStudentFullName(student)}
                          </div>
                        ))}
                        {groupStudents.filter(s => getModalStudentCategory(getStudentFullName(s)) === '4-5').length === 0 && (
                          <div className="dss-empty-category">Нет студентов</div>
                        )}
                      </div>
                    </div>

                    {/* Категория: Стандартная стипендия */}
                    <div className="dss-category-block good">
                      <div className="dss-category-title">
                        <span className="dss-category-badge good"></span>
                        <span>Стандартная стипендия</span>
                        <span className="dss-category-count">
                          {groupStudents.filter(s => getModalStudentCategory(getStudentFullName(s)) === '4').length}
                        </span>
                      </div>
                      <div className="dss-category-students">
                        {groupStudents.filter(s => getModalStudentCategory(getStudentFullName(s)) === '4').map((student, idx) => (
                          <div 
                            key={student.id} 
                            className="dss-student-item"
                            onClick={() => setSelectedStudentForDetails(student)}
                          >
                            {getStudentFullName(student)}
                          </div>
                        ))}
                        {groupStudents.filter(s => getModalStudentCategory(getStudentFullName(s)) === '4').length === 0 && (
                          <div className="dss-empty-category">Нет студентов</div>
                        )}
                      </div>
                    </div>

                    {/* Категория: Не получают стипендию */}
                    <div className="dss-category-block none">
                      <div className="dss-category-title">
                        <span className="dss-category-badge none"></span>
                        <span>Не получают стипендию</span>
                        <span className="dss-category-count">
                          {groupStudents.filter(s => getModalStudentCategory(getStudentFullName(s)) === 'none').length}
                        </span>
                      </div>
                      <div className="dss-category-students">
                        {groupStudents.filter(s => getModalStudentCategory(getStudentFullName(s)) === 'none').map((student, idx) => (
                          <div 
                            key={student.id} 
                            className="dss-student-item"
                            onClick={() => setSelectedStudentForDetails(student)}
                          >
                            {getStudentFullName(student)}
                          </div>
                        ))}
                        {groupStudents.filter(s => getModalStudentCategory(getStudentFullName(s)) === 'none').length === 0 && (
                          <div className="dss-empty-category">Нет студентов</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно с детальной информацией о студенте */}
      {selectedStudentForDetails && (
        <div className="dss-modal-overlay" onClick={() => setSelectedStudentForDetails(null)}>
          <div className="dss-student-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dss-modal-header">
              <h3>Информация о студенте</h3>
              <button className="dss-modal-close" onClick={() => setSelectedStudentForDetails(null)}>×</button>
            </div>
            <div className="dss-modal-content">
              <div className="dss-student-info">
                <div className="dss-student-field">
                  <span className="dss-field-label">ФИО:</span>
                  <span className="dss-field-value">{getStudentFullName(selectedStudentForDetails)}</span>
                </div>
                <div className="dss-student-field">
                  <span className="dss-field-label">Категория стипендии:</span>
                  <span 
                    className="dss-field-value dss-scholarship-type"
                    style={{ color: getScholarshipColor(getModalStudentCategory(getStudentFullName(selectedStudentForDetails))) }}
                  >
                    {getScholarshipTypeName(getModalStudentCategory(getStudentFullName(selectedStudentForDetails)))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};