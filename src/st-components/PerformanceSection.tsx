import React, { useState, useRef, useEffect } from 'react';
import './PerformanceSectionStyle.css';
import { apiService } from '../services/apiService'; // Добавьте этот импорт
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

export interface StudentMark {
  stNameSubjectDTO: {
    idSt: number;
    idSubject: number;
    nameSubject: string;
    idTeacher: number;
    lastnameTeacher: string;
    nameTeacher: string;
    patronymicTeacher: string;
  };
  marksBySt: Array<{
    number: number;
    value: number | null;
  }> | null;
  certification: number | null; 
}

interface PerformanceSectionProps {
  studentId: number;
}

export const PerformanceSection: React.FC<PerformanceSectionProps> = ({ 
  studentId
}) => {
  const [activeTab, setActiveTab] = useState<'semesters' | 'subjects' | 'analytics'>('semesters');
  const [selectedSemester, setSelectedSemester] = useState<'first' | 'second'>('first');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<{subject: string, grade: number | null, number: number, topic: string, teacher: string} | null>(null);
  const [studentMarks, setStudentMarks] = useState<StudentMark[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Загрузка данных студента
  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        setLoading(true);
        const marksData = await apiService.getStudentMarks(studentId);
        setStudentMarks(marksData ?? []);
      } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [studentId]);

  // Обработчик клика по предмету - переключает на вкладку предметов
  const handleSubjectClick = (subjectName: string) => {
    setSelectedSubject(subjectName);
    setActiveTab('subjects');
  };

  // Преобразование данных из API
  const transformStudentMarksToGrades = (semester: 'first' | 'second'): Grade[] => {
    if (!studentMarks) return [];

    return studentMarks
      .filter(studentMark => studentMark && studentMark.stNameSubjectDTO)
      .map((studentMark) => {
        const subjectId = studentMark.stNameSubjectDTO?.idSubject;
        
        if (!subjectId) return null;

        const gradeDetails: GradeDetail[] = [];
        const validGrades: number[] = [];
        
        if (studentMark.marksBySt && Array.isArray(studentMark.marksBySt)) {
          studentMark.marksBySt.forEach((mark) => {
            if (getSemesterByWorkNumber(mark.number) === semester) {
              const lessonDate = getLessonDate(mark.number);
              const lessonTopic = getLessonTopic(mark.number);

              gradeDetails.push({
                id: mark.number,
                date: lessonDate,
                topic: lessonTopic,
                grade: mark.value || 0,
                teacher: `${studentMark.stNameSubjectDTO.lastnameTeacher} ${studentMark.stNameSubjectDTO.nameTeacher.charAt(0)}.${studentMark.stNameSubjectDTO.patronymicTeacher.charAt(0)}.`,
                type: 'Работа',
                hasValue: mark.value !== null
              });

              if (mark.value !== null) {
                validGrades.push(mark.value);
              }
            }
          });
        }

        gradeDetails.sort((a, b) => a.id - b.id);

        const average = validGrades.length > 0 
          ? validGrades.reduce((sum, grade) => sum + grade, 0) / validGrades.length 
          : 0;

        return {
          id: subjectId,
          subject: studentMark.stNameSubjectDTO.nameSubject || 'Неизвестный предмет',
          grades: validGrades,
          average: parseFloat(average.toFixed(1)),
          examGrade: studentMark.certification, // Используем certification из API
          gradeDetails: gradeDetails,
          teacher: `${studentMark.stNameSubjectDTO.lastnameTeacher} ${studentMark.stNameSubjectDTO.nameTeacher.charAt(0)}.${studentMark.stNameSubjectDTO.patronymicTeacher.charAt(0)}.`
        };
      })
      .filter(grade => grade !== null) as Grade[];
  };

  const getSemesterByWorkNumber = (workNumber: number): 'first' | 'second' => {
    return workNumber <= 24 ? 'first' : 'second';
  };

  const getLessonTopic = (markNumber: number): string => {
    return `Работа ${markNumber}`;
  };

  const getLessonDate = (markNumber: number): string => {
    const currentDate = new Date();
    const semesterStart = selectedSemester === 'first' 
      ? new Date(currentDate.getFullYear(), 8, 1)
      : new Date(currentDate.getFullYear(), 0, 1);
    
    const gradeDate = new Date(semesterStart);
    gradeDate.setDate(semesterStart.getDate() + (markNumber - 1) * 7);
    
    return gradeDate.toLocaleDateString('ru-RU');
  };

  const handleGradeClick = (subject: string, grade: number | null, gradeNumber: number, topic: string, teacher: string) => {
    setSelectedGrade({ subject, grade, number: gradeNumber, topic, teacher });
  };

  const closeGradePopup = () => {
    setSelectedGrade(null);
  };

  const gradesData = transformStudentMarksToGrades(selectedSemester);
  const subjects = gradesData.map(grade => grade.subject);

  // Статистика
  const calculatePerformanceStatistics = () => {
    let totalGrades = 0;
    let grade5 = 0;
    let grade4 = 0;
    let grade3 = 0;
    let grade2 = 0;
    let totalAverage = 0;
    let subjectsWithGrades = 0;

    gradesData.forEach(subject => {
      if (subject.grades.length > 0) {
        subjectsWithGrades++;
        subject.grades.forEach(grade => {
          totalGrades++;
          if (grade >= 4) grade5++; // Зеленый для оценок 4 и 5
          else if (grade >= 3.5) grade4++;
          else if (grade >= 2.5) grade3++;
          else grade2++;
        });
        totalAverage += subject.average;
      }
    });

    const overallAverage = subjectsWithGrades > 0 ? totalAverage / subjectsWithGrades : 0;
    const excellentPercentage = totalGrades > 0 ? (grade5 / totalGrades) * 100 : 0;

    return {
      totalGrades,
      grade5,
      grade4,
      grade3,
      grade2,
      overallAverage: parseFloat(overallAverage.toFixed(1)),
      excellentPercentage: parseFloat(excellentPercentage.toFixed(1)),
      totalSubjects: gradesData.length,
      subjectsWithGrades
    };
  };

  const getGradeColor = (grade: number | null) => {
    if (grade === null) return '#d1d5db'; // Более светлый серый
    if (grade >= 4) return '#2cbb00'; // Зеленый для оценок 4 и 5
    if (grade >= 3) return '#f59e0b'; // Оранжевый
    if (grade >= 2) return '#ef4444'; // Красный
    return '#d1d5db'; // Более светлый серый
  };

  const getPerformanceColor = (average: number) => {
    if (average >= 4) return '#2cbb00'; // Зеленый для среднего балла 4 и выше
    if (average >= 3) return '#f59e0b';
    return '#ef4444';
  };

  const statistics = calculatePerformanceStatistics();
  const selectedSubjectData = gradesData.find(grade => grade.subject === selectedSubject);

  // Данные для графиков
  const performanceData = [
    { subject: 'Отлично', count: statistics.grade5, color: '#2cbb00' },
    { subject: 'Хорошо', count: statistics.grade4, color: 'rgba(233, 245, 11, 1)' },
    { subject: 'Удовл.', count: statistics.grade3, color: '#f59e0b' },
    { subject: 'Неудовл.', count: statistics.grade2, color: '#ef4444' }
  ];

  const progressData = [
    { week: 'Нед. 1', average: 4.2 },
    { week: 'Нед. 2', average: 4.5 },
    { week: 'Нед. 3', average: 4.1 },
    { week: 'Нед. 4', average: 4.7 },
    { week: 'Нед. 5', average: 4.8 },
    { week: 'Нед. 6', average: 4.9 }
  ];

  // Компоненты
  const SemesterSelector = () => (
    <div className="pf-semester-selector">
      <div className="pf-semester-buttons">
        <button
          className={`pf-semester-btn ${selectedSemester === 'first' ? 'pf-active' : ''}`}
          onClick={() => setSelectedSemester('first')}
        >
          1 семестр
        </button>
        <button
          className={`pf-semester-btn ${selectedSemester === 'second' ? 'pf-active' : ''}`}
          onClick={() => setSelectedSemester('second')}
        >
          2 семестр
        </button>
      </div>
    </div>
  );

  const ViewToggle = () => (
    <div className="pf-view-toggle">
      <button
        className={`pf-toggle-btn ${viewMode === 'grid' ? 'pf-active' : ''}`}
        onClick={() => setViewMode('grid')}
      >
        Сетка
      </button>
      <button
        className={`pf-toggle-btn ${viewMode === 'list' ? 'pf-active' : ''}`}
        onClick={() => setViewMode('list')}
      >
        Список
      </button>
    </div>
  );

  // Рендер карточек предметов
  const renderSubjectCards = () => (
    <div className="pf-subjects-grid">
      {gradesData.map((subject, index) => (
        <div 
          key={subject.id} 
          className="pf-subject-card"
          onClick={() => handleSubjectClick(subject.subject)}
          style={{ cursor: 'pointer' }}
        >
          <div className="pf-card-header">
            <h3 className="pf-subject-title">{subject.subject}</h3>
            <div className="at-teacher-badge">
              {subject.teacher}
            </div>
          </div>
          
          <div className="pf-grades-preview">
            {subject.gradeDetails?.slice(0, 8).map((detail, gradeIndex) => (
              <div
                key={detail.id}
                className={`pf-preview-grade ${!detail.hasValue ? 'pf-no-data' : ''}`}
                style={{ backgroundColor: getGradeColor(detail.hasValue ? detail.grade : null) }}
                onClick={(e) => {
                  e.stopPropagation(); // Предотвращаем всплытие клика на карточку
                  handleGradeClick(
                    subject.subject,
                    detail.hasValue ? detail.grade : null,
                    detail.id,
                    detail.topic,
                    subject.teacher
                  );
                }}
              >
                {detail.hasValue ? detail.grade : '-'}
              </div>
            ))}
            {subject.gradeDetails && subject.gradeDetails.length > 8 && (
              <div className="pf-more-grades">+{subject.gradeDetails.length - 8}</div>
            )}
            {(!subject.gradeDetails || subject.gradeDetails.length === 0) && (
              <div className="pf-no-grades">Нет оценок</div>
            )}
          </div>

          <div className="pf-card-footer">
            <div className="pf-average-score">
              <span className="pf-average-label">Средний балл:</span>
              <span 
                className="pf-average-value"
                style={{ color: getPerformanceColor(subject.average) }}
              >
                {subject.average > 0 ? subject.average.toFixed(1) : '-'}
              </span>
            </div>
            <div className="pf-grades-count">
              {subject.grades.length} оценок
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // Рендер таблицы предметов
  const renderSubjectsTable = () => (
    <div className="pf-subjects-table-container">
      <table className="pf-subjects-table">
        <thead>
          <tr>
            <th>Предмет</th>
            <th>Оценки</th>
            <th>Средний балл</th>
            <th>Сессия</th>
          </tr>
        </thead>
        <tbody>
          {gradesData.map((subject) => (
            <tr 
              key={subject.id}
              className="pf-subject-row"
              onClick={() => handleSubjectClick(subject.subject)}
              style={{ cursor: 'pointer' }}
            >
              <td className="pf-subject-cell">
                <div className="pf-subject-info">
                  <span className="pf-subject-name">{subject.subject}</span>
                </div>
              </td>
              <td className="pf-grades-cell">
                <div className="pf-grades-stack">
                  {subject.gradeDetails?.slice(0, 24).map((detail) => (
                    <span
                      key={detail.id}
                      className={`pf-stack-grade ${!detail.hasValue ? 'pf-no-data' : ''}`}
                      style={{ backgroundColor: getGradeColor(detail.hasValue ? detail.grade : null) }}
                      onClick={(e) => {
                        e.stopPropagation(); // Предотвращаем всплытие клика на строку
                        handleGradeClick(
                          subject.subject,
                          detail.hasValue ? detail.grade : null,
                          detail.id,
                          detail.topic,
                          subject.teacher
                        );
                      }}
                    >
                      {detail.hasValue ? detail.grade : '-'}
                    </span>
                  ))}
                  {(!subject.gradeDetails || subject.gradeDetails.length === 0) && (
                    <span className="pf-no-data-text">Нет оценок</span>
                  )}
                </div>
              </td>
              <td className="pf-average-cell">
                <div 
                  className="pf-average-badge"
                  style={{ 
                    backgroundColor: subject.average > 0 ? getPerformanceColor(subject.average) + '20' : '#f8fafc',
                    color: subject.average > 0 ? getPerformanceColor(subject.average) : '#64748b'
                  }}
                >
                  {subject.average > 0 ? subject.average.toFixed(1) : '-'}
                </div>
              </td>
              <td className="pf-session-cell">
                <div 
                  className="pf-session-grade"
                  style={{ 
                    backgroundColor: subject.examGrade !== null ? getGradeColor(subject.examGrade) : '#f8fafc',
                    color: subject.examGrade !== null ? 'white' : '#64748b'
                  }}
                >
                  {subject.examGrade !== null ? subject.examGrade : '-'}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Рендер аналитики
  const renderAnalytics = () => (
    <div className="pf-analytics-container">
      <div className="pf-stats-cards">
        <div className="pf-stat-card">
          <div className="pf-stat-content">
            <div className="pf-stat-value">{statistics.overallAverage}</div>
            <div className="pf-stat-label">Средний балл</div>
          </div>
        </div>

        <div className="pf-stat-card">
          <div className="pf-stat-content">
            <div className="pf-stat-value">{statistics.excellentPercentage}%</div>
            <div className="pf-stat-label">Оценок 4+</div>
          </div>
        </div>

        {/* ИЗМЕНЕНИЕ: Вместо "Всего предметов" теперь "Всего оценок" */}
        <div className="pf-stat-card">
          <div className="pf-stat-content">
            <div className="pf-stat-value">{statistics.totalGrades}</div>
            <div className="pf-stat-label">Всего оценок</div>
          </div>
        </div>
      </div>

      <div className="pf-charts-grid">
        <div className="pf-chart-card pf-large">
          <h3>Распределение оценок</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="subject" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {performanceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="pf-chart-card pf-large">
          <h3>Прогресс обучения</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="week" />
              <YAxis domain={[3, 5]} />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="average" 
                stroke="#2cbb00" 
                strokeWidth={3}
                dot={{ fill: '#2cbb00', strokeWidth: 2, r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="pf-loading">
        <div className="pf-loading-spinner"></div>
        <p>Загрузка данных об успеваемости...</p>
      </div>
    );
  }

  return (
    <div className="pf-performance-section">
      {/* Навигация */}
      <div className="pf-nav">
        <button
          className={`pf-nav-btn ${activeTab === 'semesters' ? 'pf-active' : ''}`}
          onClick={() => setActiveTab('semesters')}
        >
          По семестрам
        </button>
        <button
          className={`pf-nav-btn ${activeTab === 'subjects' ? 'pf-active' : ''}`}
          onClick={() => setActiveTab('subjects')}
        >
          По предметам
        </button>
        <button
          className={`pf-nav-btn ${activeTab === 'analytics' ? 'pf-active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          Аналитика
        </button>
      </div>

      {/* Контролы */}
      <div className="pf-controls-section">
        <SemesterSelector />
        <ViewToggle />
      </div>

      {/* Контент */}
      <div className="pf-content">
        {activeTab === 'semesters' && (
          <div className="pf-tab-content">
            {viewMode === 'grid' ? renderSubjectCards() : renderSubjectsTable()}
          </div>
        )}

        {activeTab === 'subjects' && (
          <div className="pf-tab-content">
            <div className="pf-subject-detail-container">
              <div className="pf-subject-selector">
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="pf-select"
                >
                  <option value="">Выберите предмет</option>
                  {subjects.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>

              {selectedSubjectData ? (
                <div className="pf-subject-detail">
                  <div className="pf-detail-header">
                    <h2>{selectedSubjectData.subject}</h2>
                    <div className="pf-subject-meta">
                      <span className="pf-meta-item">Преподаватель: {selectedSubjectData.teacher}</span>
                      <span className="pf-meta-item">Средний балл: {selectedSubjectData.average.toFixed(1)}</span>
                    </div>
                  </div>

                  <div className="pf-grades-timeline">
                    {selectedSubjectData.gradeDetails?.map((detail) => (
                      <div key={detail.id} className="pf-timeline-item">
                        <div className="pf-timeline-content">
                          <div className="pf-grade-header">
                            <span className="pf-grade-topic">{detail.topic}</span>
                            <span className="pf-grade-date">{detail.date}</span>
                          </div>
                          <div className="pf-grade-details">
                            <span 
                              className={`pf-grade-value ${!detail.hasValue ? 'pf-no-data' : ''}`}
                              style={{ 
                                backgroundColor: detail.hasValue ? getGradeColor(detail.grade) : '#d1d5db'
                              }}
                              onClick={() => handleGradeClick(
                                selectedSubjectData.subject,
                                detail.hasValue ? detail.grade : null,
                                detail.id,
                                detail.topic,
                                selectedSubjectData.teacher
                              )}
                            >
                              {detail.hasValue ? detail.grade : '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="pf-no-subject-selected">
                  <div className="pf-empty-state">
                    <h3>Выберите предмет</h3>
                    <p>Для просмотра детальной информации выберите предмет из списка или кликните на предмет в семестре</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && renderAnalytics()}
      </div>

      {/* Попап с информацией об оценке */}
      {selectedGrade && (
        <div className="pf-popup-overlay" onClick={closeGradePopup}>
          <div className="pf-popup" onClick={(e) => e.stopPropagation()}>
            <div className="pf-popup-header">
              <h3>Информация об оценке</h3>
              <button className="pf-popup-close" onClick={closeGradePopup}>
                <span>×</span>
              </button>
            </div>
            <div className="pf-popup-content">
              <div className="pf-grade-info-minimal">
                <div 
                  className="pf-grade-circle-minimal"
                  style={{ 
                    backgroundColor: getGradeColor(selectedGrade.grade),
                    borderColor: getGradeColor(selectedGrade.grade)
                  }}
                >
                  <span className="pf-grade-number-minimal">
                    {selectedGrade.grade || '-'}
                  </span>
                </div>
                <div className="pf-grade-details-minimal">
                  <div className="pf-detail-item">
                    <span className="pf-detail-label">Предмет</span>
                    <span className="pf-detail-value">{selectedGrade.subject}</span>
                  </div>
                  <div className="pf-detail-item">
                    <span className="pf-detail-label">Тема работы</span>
                    <span className="pf-detail-value">{selectedGrade.topic}</span>
                  </div>
                  <div className="pf-detail-item">
                    <span className="pf-detail-label">Номер работы</span>
                    <span className="pf-detail-value">{selectedGrade.number}</span>
                  </div>
                  <div className="pf-detail-item">
                    <span className="pf-detail-label">Преподаватель</span>
                    <span className="pf-detail-value pf-teacher">{selectedGrade.teacher}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Интерфейсы
export interface Grade {
  id: number;
  subject: string;
  grades: number[];
  average: number;
  examGrade: number | null;
  gradeDetails?: GradeDetail[];
  teacher: string;
}

export interface GradeDetail {
  id: number;
  date: string;
  topic: string;
  grade: number;
  teacher: string;
  type: string;
  hasValue: boolean;
}