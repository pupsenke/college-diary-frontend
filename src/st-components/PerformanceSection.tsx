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
import { 
  apiService, 
  StudentMark, 
  SubjectMark, 
  TeacherSubject, 
  MarkChange 
} from '../services/apiService';

export interface Grade {
  id: number;
  subject: string;
  grades: number[];
  average: number;
  examGrade: number;
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

interface PerformanceSectionProps {
  studentId: number;
  teacherId?: number;
}

export const PerformanceSection: React.FC<PerformanceSectionProps> = ({ 
  studentId, 
  teacherId = 1 // Значение по умолчанию
}) => {
  const [activeTab, setActiveTab] = useState<'semesters' | 'subjects' | 'statistics'>('semesters');
  const [selectedSemester, setSelectedSemester] = useState<'first' | 'second'>('first');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<{subject: string, grade: number, number: number, topic: string} | null>(null);
  const [gradePosition, setGradePosition] = useState<{ top: number; left: number } | null>(null);
  const [clickedGradeId, setClickedGradeId] = useState<number | null>(null);
  const [studentMarks, setStudentMarks] = useState<StudentMark[]>([]);
  const [subjectMarks, setSubjectMarks] = useState<{[key: number]: SubjectMark[]}>({});
  const [teacherSubjects, setTeacherSubjects] = useState<TeacherSubject[]>([]);
  const [markChanges, setMarkChanges] = useState<MarkChange[]>([]);
  const [loading, setLoading] = useState(true);
  
  const gradeRefs = useRef<Map<number, HTMLElement>>(new Map());

  // Загрузка данных студента
  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        setLoading(true);
        
        // Загрузка оценок студента через apiService
        const marksData = await apiService.getStudentMarks(studentId);
        setStudentMarks(marksData);

        // Загрузка детальной информации по каждому предмету
        const subjectMarksData: {[key: number]: SubjectMark[]} = {};
        for (const mark of marksData) {
          const subjectId = mark.stNameSubjectDTO.idSubject;
          try {
            const subjectMarkData = await apiService.getSubjectMarks(studentId, subjectId);
            subjectMarksData[subjectId] = subjectMarkData;
          } catch (error) {
            console.error(`Ошибка при загрузке данных по предмету ${subjectId}:`, error);
            subjectMarksData[subjectId] = [];
          }
        }
        setSubjectMarks(subjectMarksData);

        // Загрузка информации о преподавателе и предметах
        const teacherData = await apiService.getTeacherSubjects(teacherId);
        setTeacherSubjects(teacherData);

      } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [studentId, teacherId]);

  // Загрузка информации об оценке при клике
  const fetchMarkChanges = async (markNumber: number) => {
    try {
      // Используем studentId из пропсов и teacherId для stId
      const changes = await apiService.getMarkChanges(studentId, teacherId, markNumber);
      setMarkChanges(changes);
    } catch (error) {
      console.error('Ошибка при загрузке истории оценки:', error);
    }
  };

  // Функция для определения семестра по дате
  const getSemesterByDate = (dateString: string): 'first' | 'second' => {
    try {
      const [day, month, year] = dateString.split('.').map(Number);
      const date = new Date(year, month - 1, day);
      
      const monthNum = date.getMonth() + 1;
      const dayNum = date.getDate();
      
      // Первый семестр: 1 сентября - 31 декабря
      if (monthNum === 9 && dayNum >= 1) return 'first';
      if (monthNum >= 10 && monthNum <= 12) return 'first';
      
      // Второй семестр: 1 января - 31 августа
      return 'second';
    } catch (error) {
      console.error('Ошибка при определении семестра:', error);
      return 'first';
    }
  };

  // Функция для получения темы урока из данных API
  const getLessonTopic = (subjectId: number, markNumber: number): string => {
    const marks = subjectMarks[subjectId];
    if (!marks) return `Работа ${markNumber}`;
    
    const mark = marks.find(m => m.number === markNumber);
    if (!mark) return `Работа ${markNumber}`;
    
    // Используем typeMark как тему урока
    return mark.typeMark || `Работа ${markNumber}`;
  };

  // Функция для получения даты урока из данных API
  const getLessonDate = (subjectId: number, markNumber: number): string => {
    const marks = subjectMarks[subjectId];
    if (!marks) {
      // Генерируем дату на основе текущего времени и номера оценки
      const currentDate = new Date();
      const gradeDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - markNumber * 7);
      return gradeDate.toLocaleDateString('ru-RU');
    }
    
    const mark = marks.find(m => m.number === markNumber);
    if (!mark || !mark.dateLesson) {
      // Генерируем дату на основе текущего времени и номера оценки
      const currentDate = new Date();
      const gradeDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - markNumber * 7);
      return gradeDate.toLocaleDateString('ru-RU');
    }
    
    // Преобразуем дату из API в нужный формат
    try {
      const date = new Date(mark.dateLesson);
      return date.toLocaleDateString('ru-RU');
    } catch (error) {
      console.error('Ошибка при преобразовании даты:', error);
      const currentDate = new Date();
      const gradeDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - markNumber * 7);
      return gradeDate.toLocaleDateString('ru-RU');
    }
  };

  // Преобразование данных из API в формат компонента с разделением по семестрам
  const transformStudentMarksToGrades = (semester: 'first' | 'second'): Grade[] => {
    return studentMarks.map((studentMark) => {
      const subjectId = studentMark.stNameSubjectDTO.idSubject;
      
      // Создаем детали оценок на основе доступных данных
      const gradeDetails: GradeDetail[] = studentMark.marksBySt.map((mark, markIndex) => {
        const lessonDate = getLessonDate(subjectId, mark.number);
        const lessonTopic = getLessonTopic(subjectId, mark.number);

        return {
          id: mark.number,
          date: lessonDate,
          topic: lessonTopic,
          grade: mark.value,
          teacher: `${studentMark.stNameSubjectDTO.lastnameTeacher} ${studentMark.stNameSubjectDTO.nameTeacher.charAt(0)}.${studentMark.stNameSubjectDTO.patronymicTeacher.charAt(0)}.`,
          type: 'Работа'
        };
      });

      // Фильтруем оценки по семестру
      const semesterGradeDetails = gradeDetails.filter(detail => 
        getSemesterByDate(detail.date) === semester
      );

      const semesterGrades = semesterGradeDetails.map(detail => detail.grade);
      const average = semesterGrades.length > 0 
        ? semesterGrades.reduce((sum, grade) => sum + grade, 0) / semesterGrades.length 
        : 0;

      return {
        id: studentMark.stNameSubjectDTO.idSubject,
        subject: studentMark.stNameSubjectDTO.nameSubject,
        grades: semesterGrades,
        average: parseFloat(average.toFixed(1)),
        examGrade: 0, // Убираем оценку за сессию
        gradeDetails: semesterGradeDetails
      };
    }).filter(grade => grade.grades.length > 0); // Фильтруем предметы без оценок в выбранном семестре
  };

  // Получаем данные для текущего выбранного семестра
  const gradesData = transformStudentMarksToGrades(selectedSemester);
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
        if (grade >= 4.5) grade5++;
        else if (grade >= 3.5) grade4++;
        else if (grade >= 2.5) grade3++;
        else grade2++;
      });
      totalAverage += subject.average;
    });

    const overallAverage = totalAverage / (gradesData.length || 1);
    const excellentPercentage = totalGrades > 0 ? (grade5 / totalGrades) * 100 : 0;
    const goodPercentage = totalGrades > 0 ? (grade4 / totalGrades) * 100 : 0;
    const satisfactoryPercentage = totalGrades > 0 ? (grade3 / totalGrades) * 100 : 0;
    const unsatisfactoryPercentage = totalGrades > 0 ? (grade2 / totalGrades) * 100 : 0;

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

  // Функция для расчета динамики успеваемости по двухнедельным периодам
  const calculateBiWeeklyPerformance = () => {
    const allGrades: { date: Date; grade: number }[] = [];
    
    // Собираем все оценки с датами
    gradesData.forEach(subject => {
      subject.gradeDetails?.forEach(detail => {
        const [day, month, year] = detail.date.split('.').map(Number);
        allGrades.push({
          date: new Date(year, month - 1, day),
          grade: detail.grade
        });
      });
    });

    // Сортируем оценки по дате
    allGrades.sort((a, b) => a.date.getTime() - b.date.getTime());

    if (allGrades.length === 0) {
      return [{ period: 'Нет данных', average: 0 }];
    }

    // Группируем оценки по двухнедельным периодам
    const periods: { period: string; grades: number[] }[] = [];
    const startDate = new Date(allGrades[0].date);
    
    let currentPeriodStart = new Date(startDate);
    let currentPeriodEnd = new Date(currentPeriodStart);
    currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 13); // +14 дней включая начальный

    let currentPeriodGrades: number[] = [];

    allGrades.forEach(gradeItem => {
      while (gradeItem.date > currentPeriodEnd) {
        // Завершаем текущий период и начинаем новый
        if (currentPeriodGrades.length > 0) {
          periods.push({
            period: `${currentPeriodStart.toLocaleDateString('ru-RU')} - ${currentPeriodEnd.toLocaleDateString('ru-RU')}`,
            grades: [...currentPeriodGrades]
          });
        }
        
        currentPeriodStart.setDate(currentPeriodStart.getDate() + 14);
        currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 14);
        currentPeriodGrades = [];
      }
      
      currentPeriodGrades.push(gradeItem.grade);
    });

    // Добавляем последний период
    if (currentPeriodGrades.length > 0) {
      periods.push({
        period: `${currentPeriodStart.toLocaleDateString('ru-RU')} - ${currentPeriodEnd.toLocaleDateString('ru-RU')}`,
        grades: [...currentPeriodGrades]
      });
    }

    // Рассчитываем средние значения для каждого периода
    return periods.map(period => ({
      period: period.period.split(' - ')[0], // Берем только начальную дату для краткости
      average: period.grades.reduce((sum, grade) => sum + grade, 0) / period.grades.length
    }));
  };

  const handleGradeClick = async (subject: string, grade: number, gradeNumber: number, topic: string, event: React.MouseEvent) => {
    const target = event.currentTarget as HTMLElement;
    const uniqueId = Date.now() + gradeNumber;
    
    gradeRefs.current.set(uniqueId, target);
    setClickedGradeId(uniqueId);
    setSelectedGrade({ subject, grade, number: gradeNumber, topic });
    
    // Загружаем историю изменений оценки
    await fetchMarkChanges(gradeNumber);
    
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
    setMarkChanges([]);
    document.body.style.overflow = 'auto';
  };

  const calculateOverallAverage = () => {
    const averages = gradesData.map(grade => grade.average);
    return (averages.reduce((sum, avg) => sum + avg, 0) / (averages.length || 1)).toFixed(1);
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 4.5) return '#2cbb00ff';
    if (grade >= 3.5) return '#a5db28ff';
    if (grade >= 2.5) return '#f59e0b';
    return '#ef4444';
  };

  const getAverageGradeColor = (average: number) => {
    if (average >= 4.5) return '#2cbb00ff';
    if (average >= 3.5) return '#a5db28ff';
    if (average >= 2.5) return '#f59e0b';
    return '#ef4444';
  };

  const selectedSubjectData = gradesData.find(grade => grade.subject === selectedSubject);
  const statistics = calculatePerformanceStatistics();
  const biWeeklyPerformanceData = calculateBiWeeklyPerformance();

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

  // Кастомный тултип для графиков
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="pf-custom-tooltip">
          <p className="pf-tooltip-label">{label}</p>
          <p className="pf-tooltip-value">
            Средний балл: {payload[0].value.toFixed(1)}
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

  // Компонент выбора семестра
  const SemesterSelector = () => (
    <div className="semester-controls">
      <div className="semester-tabs">
        <button
          className={`semester-tab ${selectedSemester === 'first' ? 'active' : ''}`}
          onClick={() => setSelectedSemester('first')}
        >
          1-ый семестр (01.09-31.12)
        </button>
        <button
          className={`semester-tab ${selectedSemester === 'second' ? 'active' : ''}`}
          onClick={() => setSelectedSemester('second')}
        >
          2-ой семестр (01.01-31.08)
        </button>
      </div>
    </div>
  );

  // Рендер секции статистики
  const renderStatisticsSection = () => {
    return (
      <div className="pf-statistics-section">
        <div className="pf-statistics-header">
          <h2>Статистика успеваемости</h2>
          <p>Общий обзор вашей успеваемости за {selectedSemester === 'first' ? 'первый' : 'второй'} семестр</p>
        </div>

        <SemesterSelector />

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
            <h3>Динамика успеваемости по двухнедельным периодам</h3>
            <ResponsiveContainer width="100%" height="80%">
              <AreaChart
                data={biWeeklyPerformanceData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="period" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
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

  if (loading) {
    return (
      <div className="grades-section">
        <div className="pf-loading">
          <div className="pf-loading-spinner"></div>
          Загрузка данных...
        </div>
      </div>
    );
  }

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
            <SemesterSelector />

            <div className="grades-table-container">
              <table className="grades-table">
                <thead>
                  <tr>
                    <th>№</th>
                    <th>Предмет</th>
                    <th>Оценки</th>
                    <th>Ср. балл</th>
                    <th>Сессия</th>
                  </tr>
                </thead>
                <tbody>
                  {gradesData.map((subject, index) => (
                    <tr key={subject.id}>
                      <td className="number-column">{index + 1}.</td>
                      <td className="subject-name">{subject.subject}</td>
                      <td className="grades-list">
                        <div className="grades-scroll-container">
                          {subject.grades.map((grade, gradeIndex) => {
                            const gradeDetail = subject.gradeDetails?.[gradeIndex];
                            return (
                              <span
                                key={gradeIndex}
                                className="grade-bubble"
                                style={{ backgroundColor: getGradeColor(grade) }}
                                onClick={(e) => 
                                  handleGradeClick(
                                    subject.subject,
                                    grade,
                                    gradeIndex + 1,
                                    gradeDetail?.topic || `Работа ${gradeIndex + 1}`,
                                    e
                                  )
                                }
                              >
                                {grade}
                              </span>
                            );
                          })}
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
                        -
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : activeTab === 'subjects' ? (
          <>
            <SemesterSelector />

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
                <div className="stat-value-grade">-</div>
                <div className="stat-label-grade">Сессия</div>
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
                <span className="grade-info-label">Предмет:</span>
                <span className="grade-info-value">{selectedGrade.subject}</span>
              </div>
              <div className="grade-info-row">
                <span className="grade-info-label">Тема:</span>
                <span className="grade-info-value">{selectedGrade.topic}</span>
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
              
              {markChanges.length > 0 && (
                <>
                  <div className="grade-info-row" style={{flexDirection: 'column', alignItems: 'flex-start'}}>
                    <span className="grade-info-label" style={{marginBottom: '8px'}}>История изменений:</span>
                    <div style={{width: '100%'}}>
                      {markChanges.map((change, index) => (
                        <div key={change.id} style={{
                          padding: '6px 0',
                          borderBottom: index < markChanges.length - 1 ? '1px solid #f1f5f9' : 'none',
                          fontSize: '12px'
                        }}>
                          <div style={{display: 'flex', justifyContent: 'space-between'}}>
                            <span style={{color: '#64748b'}}>
                              {new Date(change.dateTime).toLocaleDateString('ru-RU')}
                            </span>
                            <span style={{
                              color: change.action.includes('добавление') ? '#2cbb00ff' : 
                                     change.action.includes('изменение') ? '#f59e0b' : '#64748b',
                              fontWeight: '500'
                            }}>
                              {change.action}
                            </span>
                          </div>
                          {change.newValue && (
                            <div style={{textAlign: 'right', color: '#1e293b', marginTop: '2px'}}>
                              Новое значение: {change.newValue}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};