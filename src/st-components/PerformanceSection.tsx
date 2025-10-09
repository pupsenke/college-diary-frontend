import React, { useState, useRef, useEffect } from 'react';
import './PerformanceSectionStyle.css';

export interface Grade {
  id: number;
  subject: string;
  grades: number[];
  average: number;
  examGrade: number;
  finalGrade?: number;
  gradeDetails?: GradeDetail[];
}

export interface GradeDetail {
  id: number;
  date: string;
  topic: string;
  grade: number;
  teacher: string;
  type: string;
}

export const PerformanceSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'semesters' | 'subjects'>('semesters');
  const [selectedSemester, setSelectedSemester] = useState<'first' | 'second'>('first');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<GradeDetail | null>(null);
  const [gradePosition, setGradePosition] = useState<{ top: number; left: number } | null>(null);
  const [clickedGradeId, setClickedGradeId] = useState<number | null>(null);
  
  const gradeRefs = useRef<Map<number, HTMLElement>>(new Map());

  // Заглушка данных из базы данных
  const gradesData: Grade[] = [
    {
      id: 1,
      subject: 'Русский язык',
      grades: [5, 4, 3, 2, 5, 4, 3, 5, 4, 5, 3, 4, 5, 4, 3, 5, 4, 5, 3, 4, 5, 4, 3, 5, 4, 5, 3, 4, 5, 4],
      average: 4.1,
      examGrade: 4,
      finalGrade: 4,
      gradeDetails: [
        { id: 1, date: '13.09.2024', topic: 'Введение. Основные термины', grade: 5, teacher: 'Иванова А.С.', type: 'Контрольная работа' },
        { id: 2, date: '20.09.2024', topic: 'Синтаксис и пунктуация', grade: 4, teacher: 'Иванова А.С.', type: 'Практическая работа' },
        { id: 3, date: '27.09.2024', topic: 'Морфология', grade: 3, teacher: 'Иванова А.С.', type: 'Тест' },
        { id: 4, date: '04.10.2024', topic: 'Фонетика', grade: 2, teacher: 'Иванова А.С.', type: 'Самостоятельная работа' },
      ]
    },
    {
      id: 2,
      subject: 'Литература',
      grades: [3, 4, 5, 4, 3, 4, 5, 4, 3, 4, 5, 4, 3, 4, 5],
      average: 4.0,
      examGrade: 4,
      finalGrade: 4,
      gradeDetails: [
        { id: 1, date: '15.09.2024', topic: 'Русская классическая литература', grade: 3, teacher: 'Петрова М.В.', type: 'Анализ текста' },
        { id: 2, date: '22.09.2024', topic: 'Поэзия Серебряного века', grade: 4, teacher: 'Петрова М.В.', type: 'Эссе' },
        { id: 3, date: '29.09.2024', topic: 'Современная литература', grade: 5, teacher: 'Петрова М.В.', type: 'Доклад' },
      ]
    },
    {
      id: 3,
      subject: 'Математика',
      grades: [5, 5, 4, 5, 4, 5, 5, 4, 5, 5, 4, 5, 5, 4, 5, 5, 4, 5, 5, 4, 5, 5, 4, 5, 5, 4, 5, 5, 4, 5],
      average: 4.7,
      examGrade: 5,
      finalGrade: 5,
      gradeDetails: [
        { id: 1, date: '14.09.2024', topic: 'Алгебраические уравнения', grade: 5, teacher: 'Сидоров В.П.', type: 'Контрольная работа' },
        { id: 2, date: '21.09.2024', topic: 'Геометрия', grade: 5, teacher: 'Сидоров В.П.', type: 'Практическая работа' },
        { id: 3, date: '28.09.2024', topic: 'Тригонометрия', grade: 4, teacher: 'Сидоров В.П.', type: 'Тест' },
      ]
    },
    {
      id: 4,
      subject: 'Программирование FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
      grades: [5, 5, 5, 4, 5, 5, 5, 4, 5, 5, 5, 4, 5, 5, 5, 4, 5, 5, 5, 4, 5, 5, 5, 4, 5, 5, 5, 4, 5, 5],
      average: 4.8,
      examGrade: 5,
      finalGrade: 5,
      gradeDetails: [
        { id: 1, date: '16.09.2024', topic: 'Основы JavaScript', grade: 5, teacher: 'Козлов Д.А.', type: 'Лабораторная работа' },
        { id: 2, date: '23.09.2024', topic: 'React компоненты', grade: 5, teacher: 'Козлов Д.А.', type: 'Проект' },
        { id: 3, date: '30.09.2024', topic: 'Работа с API', grade: 5, teacher: 'Козлов Д.А.', type: 'Практическая работа' },
        { id: 4, date: '07.10.2024', topic: 'TypeScript', grade: 4, teacher: 'Козлов Д.А.', type: 'Тест' },
      ]
    },
    {
      id: 5,
      subject: 'Базы данных',
      grades: [4, 5, 4, 3, 4, 5, 4, 3, 4, 5, 4, 3, 4, 5, 4],
      average: 4.1,
      examGrade: 4,
      finalGrade: 4,
      gradeDetails: [
        { id: 1, date: '17.09.2024', topic: 'SQL запросы', grade: 4, teacher: 'Николаев С.В.', type: 'Практическая работа' },
        { id: 2, date: '24.09.2024', topic: 'Нормализация баз данных', grade: 5, teacher: 'Николаев С.В.', type: 'Тест' },
        { id: 3, date: '01.10.2024', topic: 'Транзакции', grade: 4, teacher: 'Николаев С.В.', type: 'Лабораторная работа' },
        { id: 4, date: '08.10.2024', topic: 'Оптимизация запросов', grade: 3, teacher: 'Николаев С.В.', type: 'Контрольная работа' },
      ]
    }
  ];

  const subjects = gradesData.map(grade => grade.subject);

  const handleGradeClick = (gradeDetail: GradeDetail, gradeIndex: number, event: React.MouseEvent) => {
    const target = event.currentTarget as HTMLElement;
    const uniqueId = Date.now() + gradeIndex; // Создаем уникальный ID
    
    gradeRefs.current.set(uniqueId, target);
    setClickedGradeId(uniqueId);
    setSelectedGrade(gradeDetail);
    
    // Блокируем скролл body
    document.body.style.overflow = 'hidden';
  };

  // Эффект для вычисления позиции после рендера
  useEffect(() => {
    if (clickedGradeId && selectedGrade) {
      const element = gradeRefs.current.get(clickedGradeId);
      if (element) {
        const rect = element.getBoundingClientRect();
        const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        const popupWidth = 320;
        const viewportWidth = window.innerWidth;
        
        let left = rect.right + scrollX + 10;
        
        // Если popup выходит за правый край экрана
        if (left + popupWidth > viewportWidth - 20) {
          left = rect.left + scrollX - popupWidth - 10; // показываем слева от элемента
        }
        
        setGradePosition({
          top: scrollY,
          left: viewportWidth / 2
        });
      }
    }
  }, [clickedGradeId, selectedGrade]);

  const closeGradePopup = () => {
    setSelectedGrade(null);
    setGradePosition(null);
    setClickedGradeId(null);
    // Восстанавливаем скролл body
    document.body.style.overflow = 'auto';
  };

  const calculateOverallAverage = () => {
    const averages = gradesData.map(grade => grade.average);
    return (averages.reduce((sum, avg) => sum + avg, 0) / averages.length).toFixed(1);
  };

  const calculateAttendancePercentage = () => {
    return 87;
  };

  const getGradeColor = (grade: number) => {
    switch (grade) {
      case 5: return '#2cbb00ff'; // зеленый
      case 4: return '#a5db28ff'; // зелено-желтый
      case 3: return '#f59e0b'; // оранжевый
      case 2: return '#ef4444'; // красный
      default: return '#6b7280'; // серый для других оценок
    }
  };

  // Функция для определения цвета средней оценки
  const getAverageGradeColor = (average: number) => {
    if (average >= 4.5) return '#2cbb00ff'; // зеленый
    if (average >= 3.5) return '#a5db28ff'; // зелено-желтый
    if (average >= 2.5) return '#f59e0b'; // оранжевый
    return '#ef4444'; // красный
  };

  // Функция для определения цвета итоговой оценки
  const getFinalGradeColor = (finalGrade?: number) => {
    if (!finalGrade) return '#6b7280'; // серый для отсутствующей оценки
    return getGradeColor(finalGrade);
  };

    // Функция для определения цвета 'экзаменационной оценки' оценки
  const getExamGradeColor = (examGrade?: number) => {
    if (!examGrade) return '#6b7280'; // серый для отсутствующей оценки
    return getGradeColor(examGrade);
  };

  const selectedSubjectData = gradesData.find(grade => grade.subject === selectedSubject);

  return (
    <div className="grades-section">
      <div className="grades-header">
        <div className="pf-view-tabs">
          
          <button
            className={`pf-view-tab ${activeTab === 'semesters' ? 'active' : ''}`}
            onClick={() => setActiveTab('semesters')}
          >
            По семестрам
          </button>
          <button
            className={`pf-view-tab ${activeTab === 'subjects' ? 'active' : ''}`}
            onClick={() => setActiveTab('subjects')}
          >
            По предметам
          </button>
        </div>
        <button 
            className="pf-statistic-btn"
          >
            Статистика
          </button>
      </div>

      <div className="grades-content">
        {activeTab === 'semesters' ? (
          <>
            <div className="semester-controls">
              <div className="semester-tabs">
                <button
                  className={`semester-tab ${selectedSemester === 'first' ? 'active' : ''}`}
                  onClick={() => setSelectedSemester('first')}
                >
                  1-ый семестр
                </button>
                <button
                  className={`semester-tab ${selectedSemester === 'second' ? 'active' : ''}`}
                  onClick={() => setSelectedSemester('second')}
                >
                  2-ой семестр
                </button>
              </div>
            </div>

            <div className="grades-table-container">
              <table className="grades-table">
                <thead>
                  <tr>
                    <th>№</th>
                    <th>Предмет</th>
                    <th>Оценки</th>
                    <th>Ср. балл</th>
                    <th>Сессия</th>
                    <th>Итог</th>
                  </tr>
                </thead>
                <tbody>
                  {gradesData.map((subject, index) => (
                    <tr key={subject.id}>
                      <td className="number-column">{index + 1}.</td>
                      <td className="subject-name">{subject.subject}</td>
                      <td className="grades-list">
                        <div className="grades-scroll-container">
                          {subject.grades.map((grade, gradeIndex) => (
                            <span
                              key={gradeIndex}
                              className="grade-bubble"
                              style={{ backgroundColor: getGradeColor(grade) }}
                              onClick={(e) => 
                                handleGradeClick(
                                  subject.gradeDetails![gradeIndex % subject.gradeDetails!.length], 
                                  gradeIndex, 
                                  e
                                )
                              }
                            >
                              {grade}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="average-grade">
                        <span 
                          className="grade-bubble average-grade-bubble"
                          style={{ backgroundColor: getAverageGradeColor(subject.average) }}
                        >
                          {subject.average.toFixed(1)}
                        </span>
                      </td>
                      <td className="exam-grade">
                        {subject.finalGrade ? (
                          <span 
                            className="grade-bubble final-grade-bubble"
                            style={{ backgroundColor: getExamGradeColor(subject.examGrade) }}
                          >
                            {subject.examGrade}
                          </span>
                        ) : (
                          '-'
                        )}
                        </td>
                      <td className="final-grade">
                        {subject.finalGrade ? (
                          <span 
                            className="grade-bubble final-grade-bubble"
                            style={{ backgroundColor: getFinalGradeColor(subject.finalGrade) }}
                          >
                            {subject.finalGrade}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            
          </>
        ) : (
          <>
            <div className="subject-controls">
              <div className="subject-filter">
                <label htmlFor="subject-select">Предмет:</label>
                <select
                  id="subject-select"
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="subject-select"
                >
                  <option value="">Выберите предмет</option>
                  {subjects.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>
            </div>

            {selectedSubjectData ? (
              <div className="subject-grades-table-container">
                <table className="subject-grades-table">
                  <thead>
                    <tr>
                      <th>№</th>
                      <th>Оценка</th>
                      <th>Тема</th>
                      <th>Дата</th>
                      <th>Тип работы</th>
                      <th>Преподаватель</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSubjectData.gradeDetails?.map((detail, index) => (
                      <tr key={detail.id}>
                        <td>{index + 1}.</td>
                        <td>
                          <span 
                            className="grade-bubble subject-grade"
                            style={{ backgroundColor: getGradeColor(detail.grade) }}
                          >
                            {detail.grade}
                          </span>
                        </td>
                        <td className="topic-cell">{detail.topic}</td>
                        <td className="date-cell">{detail.date}</td>
                        <td className="type-cell">{detail.type}</td>
                        <td className="teacher-cell">{detail.teacher}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
               
              </div>
              
            ) : (
              <div className="no-subject-selected">
                <p>Выберите предмет для просмотра оценок</p>
              </div>
            )}
            <div className="grades-stats">
              <div className="stat-card">
                <div className="stat-value-grade">{calculateOverallAverage()}</div>
                <div className="stat-label-grade">Средняя оценка</div>
              </div>
              <div className="stat-card">
                <div className="stat-value-grade">5</div>
                <div className="stat-label-grade">Экзамен</div>
              </div>
              <div className="stat-card">
                <div className="stat-value-grade">5</div>
                <div className="stat-label-grade">Итоговая оценка</div>
              </div>
            </div>
          </>
        )}
          
      </div>

      {/* Всплывающее окно с информацией об оценке */}
      {selectedGrade && gradePosition && (
        <>
          <div className="grade-popup-overlay" onClick={closeGradePopup}></div>
          <div
            className="grade-popup"
            style={{
              top: `${gradePosition.top}px`,
              left: `${gradePosition.left}px`
            }}
          >
            <div className="grade-popup-header">
              <h4>Информация об оценке</h4>
              <button className="grade-popup-close" onClick={closeGradePopup}>×</button>
            </div>
            <div className="grade-popup-content">
              <div className="grade-info-row">
                <span className="grade-info-label">Дата:</span>
                <span className="grade-info-value">{selectedGrade.date}</span>
              </div>
              <div className="grade-info-row">
                <span className="grade-info-label">Тема:</span>
                <span className="grade-info-value">{selectedGrade.topic}</span>
              </div>
              <div className="grade-info-row">
                <span className="grade-info-label">Тип работы:</span>
                <span className="grade-info-value">{selectedGrade.type}</span>
              </div>
              <div className="grade-info-row">
                <span className="grade-info-label">Преподаватель:</span>
                <span className="grade-info-value">{selectedGrade.teacher}</span>
              </div>
              <div className="grade-info-row">
                <span className="grade-info-label">Оценка:</span>
                <span 
                  className="grade-value-bubble"
                  style={{ backgroundColor: getGradeColor(selectedGrade.grade) }}
                >
                  {selectedGrade.grade}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};