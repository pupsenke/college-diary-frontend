import React, { useState, useEffect, useRef } from 'react';
import { headApiService, StudentInfo } from '../services/headApiService';
import './ScholarshipSectionStyle.css';

interface SessionGrades {
  hasGrade5: boolean;
  hasGrade4: boolean;
  hasGrade3: boolean;
  bestGrade: number;
  gradesList: number[];
  count5: number;
  count4: number;
  count3: number;
  countNA: number;
}

interface ScholarshipData {
  studentId: number;
  year: number;
  semester: 1 | 2;
  sessionGrades: SessionGrades;
  scholarshipType: 'excellent' | 'good-excellent' | 'good' | 'none';
  bonusPercent: number;
}

interface ScholarshipSectionProps {
  groupId: number;
  onClose?: () => void;
}

export const ScholarshipSection: React.FC<ScholarshipSectionProps> = ({ groupId, onClose }) => {
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [scholarships, setScholarships] = useState<ScholarshipData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedSemester, setSelectedSemester] = useState<1 | 2>(1);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportData, setExportData] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<StudentInfo | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadStudents();
    loadAvailableYears();
  }, [groupId]);

  useEffect(() => {
    if (students.length > 0) {
      loadScholarships();
    }
  }, [students, selectedYear, selectedSemester]);

  const loadStudents = async () => {
    try {
      const studentsData = await headApiService.getGroupStudents(groupId);
      setStudents(studentsData);
    } catch (error) {
      console.error('Ошибка при загрузке студентов:', error);
    }
  };

  const loadAvailableYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 3; i <= currentYear + 2; i++) {
      years.push(i);
    }
    setAvailableYears(years);
  };

  const getMockSessionGrades = (studentId: number, year: number, semester: 1 | 2): SessionGrades => {
    const seed = (studentId * year * semester) % 100;
    const gradesCount = 8 + Math.floor(seed % 5);
    const gradesList: number[] = [];
    let count5 = 0, count4 = 0, count3 = 0, countNA = 0;
    
    for (let i = 0; i < gradesCount; i++) {
      const random = (seed * (i + 1)) % 10;
      let grade: number;
      if (random < 1) grade = 3;
      else if (random < 4) grade = 4;
      else grade = 5;
      gradesList.push(grade);
      
      if (grade === 5) count5++;
      else if (grade === 4) count4++;
      else if (grade === 3) count3++;
    }
    
    countNA = Math.floor((seed % 15) / 5);
    
    const hasGrade5 = count5 > 0;
    const hasGrade4 = count4 > 0;
    const hasGrade3 = count3 > 0;
    const bestGrade = count5 > 0 ? 5 : (count4 > 0 ? 4 : 3);
    
    return { hasGrade5, hasGrade4, hasGrade3, bestGrade, gradesList, count5, count4, count3, countNA };
  };

  const getScholarshipInfo = (sessionGrades: SessionGrades): {
    type: 'excellent' | 'good-excellent' | 'good' | 'none';
    bonusPercent: number;
  } => {
    if (sessionGrades.hasGrade3) {
      return { type: 'none', bonusPercent: 0 };
    }
    if (sessionGrades.hasGrade5 && !sessionGrades.hasGrade4) {
      return { type: 'excellent', bonusPercent: 50 };
    }
    if (sessionGrades.hasGrade5 && sessionGrades.hasGrade4) {
      return { type: 'good-excellent', bonusPercent: 25 };
    }
    if (sessionGrades.hasGrade4 && !sessionGrades.hasGrade5) {
      return { type: 'good', bonusPercent: 0 };
    }
    return { type: 'none', bonusPercent: 0 };
  };

  const loadScholarships = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const scholarshipsData: ScholarshipData[] = [];
      
      for (const student of students) {
        const sessionGrades = getMockSessionGrades(student.id, selectedYear, selectedSemester);
        const { type, bonusPercent } = getScholarshipInfo(sessionGrades);
        
        scholarshipsData.push({
          studentId: student.id,
          year: selectedYear,
          semester: selectedSemester,
          sessionGrades: sessionGrades,
          scholarshipType: type,
          bonusPercent: bonusPercent
        });
      }
      
      scholarshipsData.sort((a, b) => {
        const order = { excellent: 0, 'good-excellent': 1, good: 2, none: 3 };
        return order[a.scholarshipType] - order[b.scholarshipType];
      });
      
      setScholarships(scholarshipsData);
    } catch (error) {
      console.error('Ошибка при загрузке данных о стипендиях:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScholarshipForStudent = (studentId: number): ScholarshipData | undefined => {
    return scholarships.find(s => s.studentId === studentId);
  };

  const getScholarshipTypeName = (type: ScholarshipData['scholarshipType']): string => {
    const types = {
      excellent: `Стипендия +50% (только 5)`,
      'good-excellent': `Стипендия +25% (4-5)`,
      good: `Стандартная стипендия (только 4)`,
      none: 'Не получает стипендию'
    };
    return types[type];
  };

  const getStudentFullName = (student: StudentInfo) => {
    return `${student.lastName} ${student.name} ${student.patronymic}`;
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
  };

  const handleSemesterChange = (semester: 1 | 2) => {
    setSelectedSemester(semester);
  };

  const generateExportData = () => {
    const groupName = `Группа ${groupId}`;
    
    const excellentStudents = students.filter(s => getScholarshipForStudent(s.id)?.scholarshipType === 'excellent');
    const goodExcellentStudents = students.filter(s => getScholarshipForStudent(s.id)?.scholarshipType === 'good-excellent');
    const goodStudents = students.filter(s => getScholarshipForStudent(s.id)?.scholarshipType === 'good');
    
    let html = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Списки студентов на стипендию</title>
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
        }
        .styled-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
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
        .group-row td {
            border-top: 2px solid #000;
            font-weight: bold;
        }
        .student-list {
            list-style: none;
            margin: 0;
            padding-left: 0;
        }
        .student-list li {
            margin-bottom: 6px;
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
            Специальность 09.02.07 Информационные системы и программирование III курс
        </div>

        <table class="styled-table">
            <thead>
                <tr>
                    <th style="width: 15%">Группа/ФИО</th>
                    <th style="width: 30%">«5»</th>
                    <th style="width: 30%">«4-5»</th>
                    <th style="width: 25%">«4»</th>
                </tr>
            </thead>
            <tbody>
                <tr class="group-row">
                    <td>${groupName}</td>
                    <td></td>
                    <td></td>
                    <td></td>
                </tr>
                <tr>
                    <td></td>
                    <td>
                        <ul class="student-list">
                            ${excellentStudents.map((s, index) => `<li>${index + 1}. ${getStudentFullName(s)}</li>`).join('')}
                            ${excellentStudents.length === 0 ? '<li>—</li>' : ''}
                        </ul>
                    </td>
                    <td>
                        <ul class="student-list">
                            ${goodExcellentStudents.map((s, index) => `<li>${index + 1}. ${getStudentFullName(s)}</li>`).join('')}
                            ${goodExcellentStudents.length === 0 ? '<li>—</li>' : ''}
                        </ul>
                    </td>
                    <td>
                        <ul class="student-list">
                            ${goodStudents.map((s, index) => `<li>${index + 1}. ${getStudentFullName(s)}</li>`).join('')}
                            ${goodStudents.length === 0 ? '<li>—</li>' : ''}
                        </ul>
                    </td>
                </tr>
            </tbody>
        </table>

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
    a.download = `стипендии_${selectedYear}_семестр_${selectedSemester}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatistics = () => {
    const totalStudents = students.length;
    const receivingCount = scholarships.filter(s => s.scholarshipType !== 'none').length;
    const byType = {
      excellent: scholarships.filter(s => s.scholarshipType === 'excellent').length,
      goodExcellent: scholarships.filter(s => s.scholarshipType === 'good-excellent').length,
      good: scholarships.filter(s => s.scholarshipType === 'good').length,
      none: scholarships.filter(s => s.scholarshipType === 'none').length
    };

    return { totalStudents, receivingCount, byType, coveragePercent: totalStudents > 0 ? (receivingCount / totalStudents) * 100 : 0 };
  };

  const stats = getStatistics();

  const studentsByType = {
    excellent: students.filter(s => getScholarshipForStudent(s.id)?.scholarshipType === 'excellent'),
    goodExcellent: students.filter(s => getScholarshipForStudent(s.id)?.scholarshipType === 'good-excellent'),
    good: students.filter(s => getScholarshipForStudent(s.id)?.scholarshipType === 'good'),
    none: students.filter(s => getScholarshipForStudent(s.id)?.scholarshipType === 'none')
  };

  return (
    <div className="schs-container">
      <div className="schs-filters">
        <div className="schs-filters-left">
          <div className="schs-filter-group">
            <label className="schs-filter-label">Год:</label>
            <select className="schs-filter-select" value={selectedYear} onChange={(e) => handleYearChange(Number(e.target.value))}>
              {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>

          <div className="schs-filter-group">
            <label className="schs-filter-label">Семестр:</label>
            <div className="schs-semester-buttons">
              <button className={`schs-semester-btn ${selectedSemester === 1 ? 'active' : ''}`} onClick={() => handleSemesterChange(1)}>1 семестр</button>
              <button className={`schs-semester-btn ${selectedSemester === 2 ? 'active' : ''}`} onClick={() => handleSemesterChange(2)}>2 семестр</button>
            </div>
          </div>
        </div>
        
        <button className="schs-export-btn" onClick={handleExport}>
          Экспорт документа
        </button>
      </div>

      <div className="schs-stats">
        <div className="schs-stat-card"><div className="schs-stat-value">{stats.totalStudents}</div><div className="schs-stat-label">Всего студентов</div></div>
        <div className="schs-stat-card"><div className="schs-stat-value">{stats.receivingCount}</div><div className="schs-stat-label">Получают стипендию</div></div>
        <div className="schs-stat-card"><div className="schs-stat-value">{stats.coveragePercent.toFixed(1)}%</div><div className="schs-stat-label">Охват стипендиями</div></div>
      </div>

      <div className="schs-categories">
        <h3 className="schs-categories-title">Список студентов по категориям стипендий</h3>
        <div className="schs-categories-grid">
          <div className="schs-category-card excellent-category">
            <div className="category-header">
              <span className="category-name">Повышенная стипендия (+50%)</span>
              <span className="category-count">{studentsByType.excellent.length}</span>
            </div>
            <div className="category-list">
              {studentsByType.excellent.map((student, index) => (
                <div 
                  key={student.id} 
                  className="category-student" 
                  onClick={() => setSelectedStudentForDetails(student)}
                >
                  {getStudentFullName(student)}
                </div>
              ))}
              {studentsByType.excellent.length === 0 && <div className="category-empty">Нет студентов</div>}
            </div>
          </div>

          <div className="schs-category-card goodexcellent-category">
            <div className="category-header">
              <span className="category-name">Повышенная стипендия (+25%)</span>
              <span className="category-count">{studentsByType.goodExcellent.length}</span>
            </div>
            <div className="category-list">
              {studentsByType.goodExcellent.map((student, index) => (
                <div 
                  key={student.id} 
                  className="category-student" 
                  onClick={() => setSelectedStudentForDetails(student)}
                >
                  {getStudentFullName(student)}
                </div>
              ))}
              {studentsByType.goodExcellent.length === 0 && <div className="category-empty">Нет студентов</div>}
            </div>
          </div>

          <div className="schs-category-card good-category">
            <div className="category-header">
              <span className="category-name">Стандартная стипендия</span>
              <span className="category-count">{studentsByType.good.length}</span>
            </div>
            <div className="category-list">
              {studentsByType.good.map((student, index) => (
                <div 
                  key={student.id} 
                  className="category-student" 
                  onClick={() => setSelectedStudentForDetails(student)}
                >
                  {getStudentFullName(student)}
                </div>
              ))}
              {studentsByType.good.length === 0 && <div className="category-empty">Нет студентов</div>}
            </div>
          </div>

          <div className="schs-category-card none-category">
            <div className="category-header">
              <span className="category-name">Не получают стипендию</span>
              <span className="category-count">{studentsByType.none.length}</span>
            </div>
            <div className="category-list">
              {studentsByType.none.map((student, index) => (
                <div 
                  key={student.id} 
                  className="category-student" 
                  onClick={() => setSelectedStudentForDetails(student)}
                >
                  {getStudentFullName(student)}
                </div>
              ))}
              {studentsByType.none.length === 0 && <div className="category-empty">Нет студентов</div>}
            </div>
          </div>
        </div>
      </div>

      {showExportModal && (
        <div className="schs-modal-overlay">
          <div className="schs-modal">
            <div className="schs-modal-header">
              <h3>Просмотр и экспорт ведомости</h3>
              <button className="schs-modal-close" onClick={() => setShowExportModal(false)}>×</button>
            </div>
            <div className="schs-modal-toolbar">
              {!isEditing ? (
                <>
                  <button className="schs-toolbar-btn" onClick={() => setIsEditing(true)}>Редактировать</button>
                  <button className="schs-toolbar-btn" onClick={handlePrint}>Печать</button>
                  <button className="schs-toolbar-btn" onClick={handleDownload}>Скачать</button>
                </>
              ) : (
                <>
                  <button className="schs-toolbar-btn primary" onClick={handleSaveEdit}>Сохранить изменения</button>
                  <button className="schs-toolbar-btn" onClick={() => { setIsEditing(false); setEditedContent(exportData); }}>Отменить</button>
                </>
              )}
            </div>
            <div className="schs-modal-content">
              {isEditing ? (
                <textarea 
                  className="schs-edit-area"
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  rows={20}
                />
              ) : (
                <iframe srcDoc={exportData} className="schs-preview-frame" title="Предпросмотр" />
              )}
            </div>
          </div>
        </div>
      )}

      {selectedStudentForDetails && (
        <div className="schs-modal-overlay" onClick={() => setSelectedStudentForDetails(null)}>
          <div className="schs-student-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="schs-modal-header">
              <h3>Детали успеваемости</h3>
              <button className="schs-modal-close" onClick={() => setSelectedStudentForDetails(null)}>✕</button>
            </div>
            <div className="schs-student-details">
              <div className="detail-row">
                <span className="detail-label">Студент:</span>
                <span className="detail-value">{getStudentFullName(selectedStudentForDetails)}</span>
                
              </div>
              
              {(() => {
                const scholarship = getScholarshipForStudent(selectedStudentForDetails.id);
                
                return (
                  <>
                  <div className="detail-row">
                      <span className="detail-label">Тип стипендии:</span>
                      <span className={`detail-value scholarship-type-${scholarship?.scholarshipType}`}>
                        {getScholarshipTypeName(scholarship?.scholarshipType || 'none')}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Оценки за сессию:</span>
                      
                      <div className="grades-stats-container">
                        <div className="grade-stat-card grade-5">
                          <div className="grade-stat-value">{scholarship?.sessionGrades.count5 || 0}</div>
                          <div className="grade-stat-label">Отлично (5)</div>
                        </div>
                        <div className="grade-stat-card grade-4">
                          <div className="grade-stat-value">{scholarship?.sessionGrades.count4 || 0}</div>
                          <div className="grade-stat-label">Хорошо (4)</div>
                        </div>
                        <div className="grade-stat-card grade-3">
                          <div className="grade-stat-value">{scholarship?.sessionGrades.count3 || 0}</div>
                          <div className="grade-stat-label">Удовлетворительно (3)</div>
                        </div>
                        <div className="grade-stat-card grade-na">
                          <div className="grade-stat-value">{scholarship?.sessionGrades.countNA || 0}</div>
                          <div className="grade-stat-label">Не аттестован</div>
                        </div>
                      </div>
                    </div>
                    
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};