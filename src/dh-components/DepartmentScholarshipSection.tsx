import React, { useState, useEffect } from 'react';
import { headApiService, StudentInfo } from '../services/headApiService';
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
  
  // Состояния для экспорта
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportData, setExportData] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');

  // Функция для генерации случайных оценок студента (демо-режим)
  const generateStudentGrades = (studentId: number, groupId: number): { count5: number; count4: number; count3: number; avg: number } => {
    const seed = (studentId * groupId * 12345) % 100;
    const gradesCount = 8 + Math.floor(seed % 5);
    let count5 = 0, count4 = 0, count3 = 0;
    
    for (let i = 0; i < gradesCount; i++) {
      const random = (seed * (i + 1)) % 10;
      if (random < 1) count3++;
      else if (random < 4) count4++;
      else count5++;
    }
    
    const total = count5 + count4 + count3;
    const avg = total > 0 ? (count5 * 5 + count4 * 4 + count3 * 3) / total : 0;
    
    return { count5, count4, count3, avg };
  };

  // Определение типа стипендии по среднему баллу
  const getScholarshipType = (avg: number): 'excellent' | 'good-excellent' | 'good' | 'none' => {
    if (avg >= 4.8) return 'excellent';
    if (avg >= 4.0) return 'good-excellent';
    if (avg >= 3.5) return 'good';
    return 'none';
  };

  const getScholarshipTypeName = (type: string): string => {
    const types = {
      excellent: 'Стипендия +50% (только 5)',
      'good-excellent': 'Стипендия +25% (4-5)',
      good: 'Стандартная стипендия (только 4)',
      none: 'Не получает стипендию'
    };
    return types[type as keyof typeof types] || types.none;
  };

  const loadDepartmentScholarshipStats = async () => {
    setLoading(true);
    try {
      const groups = await headApiService.getGroups();
      const filteredGroups = groups.filter(g => g.specialty === "09.02.07 Информационные системы и программирование");
      
      const byCourse: DepartmentScholarshipStats['byCourse'] = { 1: { total: 0, excellent: 0, goodExcellent: 0, good: 0, none: 0 }, 2: { total: 0, excellent: 0, goodExcellent: 0, good: 0, none: 0 }, 3: { total: 0, excellent: 0, goodExcellent: 0, good: 0, none: 0 }, 4: { total: 0, excellent: 0, goodExcellent: 0, good: 0, none: 0 } };
      const byGroup: DepartmentScholarshipStats['byGroup'] = [];
      let totalStudents = 0;
      let totalExcellent = 0;
      let totalGoodExcellent = 0;
      let totalGood = 0;
      let totalNone = 0;

      for (const group of filteredGroups) {
        const students = await headApiService.getGroupStudents(group.id);
        let groupExcellent = 0, groupGoodExcellent = 0, groupGood = 0, groupNone = 0;
        
        for (const student of students) {
          const { avg } = generateStudentGrades(student.id, group.id);
          const type = getScholarshipType(avg);
          
          switch (type) {
            case 'excellent': groupExcellent++; break;
            case 'good-excellent': groupGoodExcellent++; break;
            case 'good': groupGood++; break;
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
          coveragePercent: ((groupExcellent + groupGoodExcellent + groupGood) / students.length) * 100
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

  useEffect(() => {
    loadDepartmentScholarshipStats();
  }, []);

  const filteredGroups = stats?.byGroup.filter(g => selectedCourse === 'all' || g.course === selectedCourse) || [];

  const handleGroupClick = async (groupId: number) => {
    try {
      const students = await headApiService.getGroupStudents(groupId);
      setGroupStudents(students);
      setSelectedGroup(groupId);
      setShowGroupModal(true);
    } catch (error) {
      console.error('Ошибка загрузки студентов группы:', error);
    }
  };

  const getStudentFullName = (student: StudentInfo) => {
    return `${student.lastName} ${student.name} ${student.patronymic}`;
  };

  // Генерация данных для экспорта
  const generateExportData = () => {
    const currentYear = new Date().getFullYear();
    const groupName = "Отделение информационных технологий";
    
    // Группируем студентов по типам стипендий по курсам
    const getStudentsByTypeAndCourse = (type: string, course: number) => {
      const groups = stats?.byGroup.filter(g => g.course === course) || [];
      const students: string[] = [];
      // Здесь нужно собрать студентов, но для экспорта используем только статистику
      return students;
    };
    
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
        .student-list {
            list-style: none;
            margin: 0;
            padding-left: 0;
        }
        .student-list li {
            margin-bottom: 4px;
            padding-left: 20px;
            position: relative;
        }
        .student-list li:before {
            content: "•";
            position: absolute;
            left: 5px;
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
        <button className="dss-export-btn" onClick={handleExport}>
          Экспорт ведомости
        </button>
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
                <tr key={group.groupId} onClick={() => handleGroupClick(group.groupId)} className="dss-group-row">
                  <td className="dss-group-name">Группа {group.groupName} </td>
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

      {/* Модальное окно экспорта */}
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
      )}
    </div>
  );
};