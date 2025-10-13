import React, { useState, useRef, useEffect } from 'react';
import './PerformanceSectionStyle.css';
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
  Line,
  AreaChart,
  Area
} from 'recharts';

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

// Интерфейс для данных графиков
interface ChartData {
  name: string;
  value: number;
  color: string;
}

export const PerformanceSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'semesters' | 'subjects' | 'statistics'>('semesters');
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
      subject: 'Программирование',
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

  // Функция для подсчета общей статистики успеваемости
  const calculatePerformanceStatistics = () => {
    let totalGrades = 0;
    let grade5 = 0;
    let grade4 = 0;
    let grade3 = 0;
    let grade2 = 0;
    let totalAverage = 0;

    gradesData.forEach(subject => {
      subject.grades.forEach(grade => {
        totalGrades++;
        switch (grade) {
          case 5: grade5++; break;
          case 4: grade4++; break;
          case 3: grade3++; break;
          case 2: grade2++; break;
        }
      });
      totalAverage += subject.average;
    });

    const overallAverage = totalAverage / gradesData.length;
    const excellentPercentage = (grade5 / totalGrades) * 100;
    const goodPercentage = (grade4 / totalGrades) * 100;
    const satisfactoryPercentage = (grade3 / totalGrades) * 100;
    const unsatisfactoryPercentage = (grade2 / totalGrades) * 100;

    return {
      totalGrades,
      grade5,
      grade4,
      grade3,
      grade2,
      overallAverage: parseFloat(overallAverage.toFixed(1)),
      excellentPercentage: parseFloat(excellentPercentage.toFixed(1)),
      goodPercentage: parseFloat(goodPercentage.toFixed(1)),
      satisfactoryPercentage: parseFloat(satisfactoryPercentage.toFixed(1)),
      unsatisfactoryPercentage: parseFloat(unsatisfactoryPercentage.toFixed(1))
    };
  };

  const handleGradeClick = (gradeDetail: GradeDetail, gradeIndex: number, event: React.MouseEvent) => {
    const target = event.currentTarget as HTMLElement;
    const uniqueId = Date.now() + gradeIndex;
    
    gradeRefs.current.set(uniqueId, target);
    setClickedGradeId(uniqueId);
    setSelectedGrade(gradeDetail);
    
    document.body.style.overflow = 'hidden';
  };

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
        
        if (left + popupWidth > viewportWidth - 20) {
          left = rect.left + scrollX - popupWidth - 10;
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
    document.body.style.overflow = 'auto';
  };

  const calculateOverallAverage = () => {
    const averages = gradesData.map(grade => grade.average);
    return (averages.reduce((sum, avg) => sum + avg, 0) / averages.length).toFixed(1);
  };

  const getGradeColor = (grade: number) => {
    switch (grade) {
      case 5: return '#2cbb00ff';
      case 4: return '#a5db28ff';
      case 3: return '#f59e0b';
      case 2: return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getAverageGradeColor = (average: number) => {
    if (average >= 4.5) return '#2cbb00ff';
    if (average >= 3.5) return '#a5db28ff';
    if (average >= 2.5) return '#f59e0b';
    return '#ef4444';
  };

  const getFinalGradeColor = (finalGrade?: number) => {
    if (!finalGrade) return '#6b7280';
    return getGradeColor(finalGrade);
  };

  const getExamGradeColor = (examGrade?: number) => {
    if (!examGrade) return '#6b7280';
    return getGradeColor(examGrade);
  };

  const selectedSubjectData = gradesData.find(grade => grade.subject === selectedSubject);
  const statistics = calculatePerformanceStatistics();

  // Данные для графиков
  const gradeDistributionData: ChartData[] = [
    { name: 'Отлично (5)', value: statistics.grade5, color: '#2cbb00ff' },
    { name: 'Хорошо (4)', value: statistics.grade4, color: '#a5db28ff' },
    { name: 'Удовлетворительно (3)', value: statistics.grade3, color: '#f59e0b' },
    { name: 'Неудовлетворительно (2)', value: statistics.grade2, color: '#ef4444' }
  ];

  const gradePercentageData: ChartData[] = [
    { name: 'Отлично', value: statistics.excellentPercentage, color: '#2cbb00ff' },
    { name: 'Хорошо', value: statistics.goodPercentage, color: '#a5db28ff' },
    { name: 'Удовлетворительно', value: statistics.satisfactoryPercentage, color: '#f59e0b' },
    { name: 'Неудовлетворительно', value: statistics.unsatisfactoryPercentage, color: '#ef4444' }
  ];

  const progressData = [
    { name: 'Текущий средний балл', value: statistics.overallAverage, color: '#2cbb00ff' },
    { name: 'До максимального', value: 5 - statistics.overallAverage, color: '#e5e7eb' }
  ];

  const subjectPerformanceData = gradesData.map(subject => ({
    subject: subject.subject.length > 15 ? subject.subject.substring(0, 15) + '...' : subject.subject,
    average: subject.average,
    color: getAverageGradeColor(subject.average)
  }));

  const monthlyPerformanceData = [
    { month: 'Сентябрь', average: 4.2 },
    { month: 'Октябрь', average: 4.1 },
    { month: 'Ноябрь', average: 4.5 },
    { month: 'Декабрь', average: 4.3 },
    { month: 'Январь', average: 4.6 },
    { month: 'Февраль', average: 4.4 }
  ];

  // Кастомный тултип для графиков
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="pf-custom-tooltip">
          <p className="pf-tooltip-label">{label}</p>
          <p className="pf-tooltip-value">
            {payload[0].name}: {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  // Функция для рендера лейблов круговой диаграммы
  const renderCustomizedLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent, name } = props;
    
    if (typeof percent !== 'number' || typeof midAngle !== 'number') return null;
    
    const RADIAN = Math.PI / 180;
    const radius = (innerRadius as number) + ((outerRadius as number) - (innerRadius as number)) * 0.5;
    const x = (cx as number) + radius * Math.cos(-midAngle * RADIAN);
    const y = (cy as number) + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > (cx as number) ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Рендер секции статистики
  const renderStatisticsSection = () => {
    return (
      <div className="pf-statistics-section">
        <div className="pf-statistics-header">
          <h2>Статистика успеваемости</h2>
          <p>Общий обзор вашей успеваемости за семестр</p>
        </div>

        <div className="pf-statistics-grid">
          {/* Карточка с общей статистикой */}
          <div className="pf-stat-card-large">
            <h3>Общая статистика</h3>
            <div className="pf-overall-stats">
              <div className="pf-stat-item">
                <span className="pf-stat-label">Всего оценок:</span>
                <span className="pf-stat-value">{statistics.totalGrades}</span>
              </div>
              <div className="pf-stat-item">
                <span className="pf-stat-label">Отлично (5):</span>
                <span className="pf-stat-value">{statistics.grade5}</span>
              </div>
              <div className="pf-stat-item">
                <span className="pf-stat-label">Хорошо (4):</span>
                <span className="pf-stat-value">{statistics.grade4}</span>
              </div>
              <div className="pf-stat-item">
                <span className="pf-stat-label">Удовлетворительно (3):</span>
                <span className="pf-stat-value">{statistics.grade3}</span>
              </div>
              <div className="pf-stat-item">
                <span className="pf-stat-label">Неудовлетворительно (2):</span>
                <span className="pf-stat-value">{statistics.grade2}</span>
              </div>
              <div className="pf-stat-item">
                <span className="pf-stat-label">Процент отличных оценок:</span>
                <span className="pf-stat-value">{statistics.excellentPercentage}%</span>
              </div>
            </div>
          </div>

          {/* Индикатор среднего балла */}
          <div className="pf-stat-card-large">
            <h3>Средний балл</h3>
            <div className="pf-average-indicator">
              <div 
                className="pf-average-circle"
                style={{ 
                  background: `conic-gradient(#2cbb00ff ${(statistics.overallAverage / 5) * 360}deg, #e5e7eb 0deg)` 
                }}
              >
                <div className="pf-average-inner">
                  <span className="pf-average-value">{statistics.overallAverage}</span>
                  <small>из 5.0</small>
                </div>
              </div>
            </div>
          </div>

          {/* Столбчатая диаграмма распределения оценок */}
          <div className="pf-chart-card">
            <h3>Распределение оценок по категориям</h3>
            <ResponsiveContainer width="100%" height="80%">
              <BarChart data={gradeDistributionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {gradeDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Круговая диаграмма процентного соотношения */}
          <div className="pf-chart-card">
            <h3>Процентное соотношение оценок</h3>
            <ResponsiveContainer width="100%" height="80%">
              <PieChart>
                <Pie
                  data={gradePercentageData as any[]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={renderCustomizedLabel}
                >
                  {gradePercentageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Линейный график динамики успеваемости */}
          <div className="pf-chart-card pf-line-chart">
            <h3>Динамика успеваемости по месяцам</h3>
            <ResponsiveContainer width="100%" height="80%">
              <AreaChart
                data={monthlyPerformanceData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  domain={[0, 5]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="average" 
                  stroke="#2cbb00ff" 
                  fill="url(#colorPerformance)" 
                  strokeWidth={2}
                />
                <defs>
                  <linearGradient id="colorPerformance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2cbb00ff" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#2cbb00ff" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

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
          <button
            className={`pf-view-tab ${activeTab === 'statistics' ? 'active' : ''}`}
            onClick={() => setActiveTab('statistics')}
          >
            Статистика
          </button>
        </div>
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
        ) : activeTab === 'subjects' ? (
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
        ) : (
          renderStatisticsSection()
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