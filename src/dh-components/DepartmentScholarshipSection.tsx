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
  
  // Состояния для экспорта
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportData, setExportData] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');

  // **Функция для получения категорий стипендий группы (из второго кода)**
  const loadGroupScholarshipCategories = async (groupId: number): Promise<ScholarshipCategory[]> => {
    try {
      const categories = await headApiService.getStudentsByScholarshipCategories(groupId);
      return categories;
    } catch (error) {
      console.error(`Ошибка при загрузке категорий стипендий для группы ${groupId}:`, error);
      return [];
    }
  };

  // **Функция для получения категории студента**
  const getStudentCategory = (studentFullName: string, categories: ScholarshipCategory[]): string => {
    for (const category of categories) {
      if (category.students.includes(studentFullName)) {
        return category.category;
      }
    }
    return 'none';
  };

  // **Функция для получения студентов по типу стипендии**
  const getStudentsByType = (categoryType: string, studentsList: StudentInfo[], categories: ScholarshipCategory[]): StudentInfo[] => {
    const category = categories.find(c => c.category === categoryType);
    if (!category) return [];
    
    return studentsList.filter(student => 
      category.students.includes(getStudentFullName(student))
    );
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
        // **Получаем студентов группы**
        const students = await headApiService.getGroupStudents(group.id);
        
        // **ВНЕДРЕННЫЙ ЗАПРОС: получаем категории стипендий для группы из второго кода**
        const scholarshipCategories = await loadGroupScholarshipCategories(group.id);
        
        let groupExcellent = 0, groupGoodExcellent = 0, groupGood = 0, groupNone = 0;
        
        for (const student of students) {
          const studentFullName = getStudentFullName(student);
          // **Определяем тип стипендии студента на основе полученных категорий**
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

  // **Функция для открытия модального окна с детальной информацией о группе**
  const handleGroupClick = async (groupId: number) => {
    setLoadingGroupData(true);
    try {
      const students = await headApiService.getGroupStudents(groupId);
      setGroupStudents(students);
      setSelectedGroup(groupId);
      
      // **ВНЕДРЕННЫЙ ЗАПРОС: получаем категории стипендий для выбранной группы**
      const categories = await loadGroupScholarshipCategories(groupId);
      setGroupScholarshipCategories(categories);
      
      setShowGroupModal(true);
    } catch (error) {
      console.error('Ошибка загрузки студентов группы:', error);
    } finally {
      setLoadingGroupData(false);
    }
  };

  // **Функция для получения категории студента в модальном окне**
  const getModalStudentCategory = (studentFullName: string): string => {
    return getStudentCategory(studentFullName, groupScholarshipCategories);
  };

  // **Функция для получения названия категории стипендии**
  const getScholarshipTypeName = (category: string): string => {
    const types: Record<string, string> = {
      '5': 'Повышенная стипендия (+50%)',
      '4-5': 'Повышенная стипендия (+25%)',
      '4': 'Стандартная стипендия',
      'none': 'Не получает стипендию'
    };
    return types[category] || types.none;
  };

  // **Функция для получения цвета категории стипендии**
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

  // Генерация данных для экспорта
  const generateExportData = () => {
    // ... (код экспорта остается без изменений)
    const currentYear = new Date().getFullYear();
    const groupName = "Отделение |||";
    
    let html = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Списки студентов на стипендию - Отделение</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Times New Roman', Times, serif;
            background: #e0e0e0;
            display: flex;
            justify-content: center;
            padding: 40px;
        }
        .document {
            max-width: 1200px;
            width: 100%;
            background: white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            padding: 30px 25px 40px 25px;
        }
        .title {
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            line-height: 1.4;
            margin-bottom: 8px;
        }
        .subtitle {
            font-size: 16px;
            font-weight: bold;
            text-align: center;
            margin-bottom: 25px;
        }
        .specialty {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 15px;
            text-align: center;
        }
        .department-name {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 20px;
            text-align: center;
            color: #002FA7;
        }
        .styled-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            margin-bottom: 20px;
        }
        .styled-table th, .styled-table td {
            border: 1px solid #000;
            padding: 10px 12px;
            vertical-align: top;
        }
        .styled-table th {
            background-color: #f0f0f0;
            font-weight: bold;
            text-align: center;
        }
        .course-row td {
            border-top: 2px solid #000;
            font-weight: bold;
            background-color: #f8fafc;
        }
        .signature {
            margin-top: 45px;
            display: flex;
            justify-content: space-between;
            font-size: 13px;
        }
        .signature-line {
            margin-top: 5px;
            width: 220px;
            border-bottom: 1px solid #000;
        }
        .stats-info {
            margin-bottom: 20px;
            padding: 15px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
        }
        .stats-info p {
            margin: 5px 0;
        }
    </style>
</head>
<body>
    <div class="document">
        <div class="title">
            СПИСКИ СТУДЕНТОВ НА НАЗНАЧЕНИЕ<br>
            ГОСУДАРСТВЕННОЙ АКАДЕМИЧЕСКОЙ СТИПЕНДИИ
        </div>
        <div class="subtitle">
            (Федеральное финансирование)
        </div>
        <div class="specialty">
            Специальность 09.02.07 Информационные системы и программирование
        </div>
        <div class="department-name">
            ${groupName}
        </div>
        
        <div class="stats-info">
            <p><strong>Всего студентов:</strong> ${stats?.totalStudents || 0}</p>
            <p><strong>Получают стипендию:</strong> ${stats?.receivingCount || 0} (${stats?.coveragePercent.toFixed(1) || 0}%)</p>
            <p><strong>Студенты с повышенной стипендией (+50%):</strong> ${stats?.byGroup.reduce((sum, g) => sum + g.excellent, 0) || 0}</p>
            <p><strong>Студенты с повышенной стипендией (+25%):</strong> ${stats?.byGroup.reduce((sum, g) => sum + g.goodExcellent, 0) || 0}</p>
            <p><strong>Студенты со стандартной стипендией:</strong> ${stats?.byGroup.reduce((sum, g) => sum + g.good, 0) || 0}</p>
            <p><strong>Не получают стипендию:</strong> ${stats?.byGroup.reduce((sum, g) => sum + g.none, 0) || 0}</p>
        </div>

        <h4 style="margin-bottom: 10px;">Распределение по курсам</h4>
        ${[1, 2, 3, 4].map(course => {
          const courseGroups = stats?.byGroup.filter(g => g.course === course) || [];
          if (courseGroups.length === 0) return '';
          return `
            <table class="styled-table">
                <thead>
                    <tr class="course-row">
                        <th colspan="4">${course} курс</th>
                    </tr>
                    <tr>
                        <th style="width: 40%">Группа</th>
                        <th style="width: 20%">Всего студентов</th>
                        <th style="width: 20%">Получают стипендию</th>
                        <th style="width: 20%">Охват</th>
                    </tr>
                </thead>
                <tbody>
                    ${courseGroups.map(group => `
                        <tr>
                            <td>Группа ${group.groupName}</td>
                            <td style="text-align: center">${group.total}</td>
                            <td style="text-align: center">${group.excellent + group.goodExcellent + group.good}</td>
                            <td style="text-align: center">${group.coveragePercent.toFixed(1)}%</td>
                        </tr>
                    `).join('')}
                    <tr style="font-weight: bold; background-color: #f0f0f0;">
                        <td>Итого по ${course} курсу</td>
                        <td style="text-align: center">${stats?.byCourse[course].total || 0}</td>
                        <td style="text-align: center">${(stats?.byCourse[course].excellent || 0) + (stats?.byCourse[course].goodExcellent || 0) + (stats?.byCourse[course].good || 0)}</td>
                        <td style="text-align: center">${stats?.byCourse[course].total ? ((((stats?.byCourse[course].excellent || 0) + (stats?.byCourse[course].goodExcellent || 0) + (stats?.byCourse[course].good || 0)) / stats?.byCourse[course].total) * 100).toFixed(1) : 0}%</td>
                    </tr>
                </tbody>
            </table>
          `;
        }).join('')}

        <div class="signature">
            <div>
                Председатель стипендиальной комиссии<br>
                <div class="signature-line"></div>
            </div>
            <div>
                Секретарь<br>
                <div class="signature-line"></div>
            </div>
        </div>
        <div style="margin-top: 20px; font-size: 11px; text-align: center; color: #64748b;">
            Документ сформирован автоматически ${new Date().toLocaleString()}
        </div>
    </div>
</body>
</html>`;
    
    return html;
  };

  const handleExport = () => {
    const data = generateExportData();
    setExportData(data);
    setEditedContent(data);
    setIsEditing(false);
    setShowExportModal(true);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(exportData);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleSaveEdit = () => {
    setExportData(editedContent);
    setIsEditing(false);
  };

  const handleDownload = () => {
    const blob = new Blob([exportData], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `стипендии_отделение.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
        {/* <button className="dss-export-btn" onClick={handleExport}>
          Экспорт ведомости
        </button> */}
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

      {/* **Модальное окно с детальной информацией о группе** */}
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

      {/* **Модальное окно с детальной информацией о студенте** */}
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

      {/* Модальное окно экспорта
      {showExportModal && (
        <div className="dss-modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="dss-export-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dss-modal-header">
              <h3>Просмотр и экспорт ведомости</h3>
              <button className="dss-modal-close" onClick={() => setShowExportModal(false)}>×</button>
            </div>
            <div className="dss-modal-toolbar">
              {!isEditing ? (
                <>
                  <button className="dss-toolbar-btn" onClick={() => setIsEditing(true)}>Редактировать</button>
                  <button className="dss-toolbar-btn" onClick={handlePrint}>Печать</button>
                  <button className="dss-toolbar-btn" onClick={handleDownload}>Скачать</button>
                </>
              ) : (
                <>
                  <button className="dss-toolbar-btn primary" onClick={handleSaveEdit}>Сохранить изменения</button>
                  <button className="dss-toolbar-btn" onClick={() => { setIsEditing(false); setEditedContent(exportData); }}>❌ Отменить</button>
                </>
              )}
            </div>
            <div className="dss-modal-content">
              {isEditing ? (
                <textarea 
                  className="dss-edit-area"
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  rows={20}
                />
              ) : (
                <iframe srcDoc={exportData} className="dss-preview-frame" title="Предпросмотр" />
              )}
            </div>
          </div>
        </div>
      )} */}
    </div>
  );
};