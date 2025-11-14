import React, { useState, useRef, useEffect, useCallback } from 'react';
import './AttendanceSectionStyle.css';
import { apiService } from '../services/studentApiService'; 
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

export interface Attendance {
  id: number;
  subject: string;
  statuses: ('п' | 'у'| 'н' | null)[];
  quantity: number;
  percent: number;
  teacher: string;
  reasonStatus?: AttendanceDetail[];
}

export interface AttendanceDetail {
  idLesson: number;
  date: string;
  topic: string;
  status: 'п' | 'у' | 'н' | null;
  teacher: string;
  comment?: string;
}

interface AttendanceSectionProps {
  studentId: number;
}

interface SubjectAttendance {
  nameSubjectTeachersDTO: {
    idSt: number;
    idSubject: number;
    nameSubject: string;
    teachers: Array<{
      idTeacher: number;
      lastnameTeacher: string;
      nameTeacher: string;
      patronymicTeacher: string;
    }>;
  };
  attendances: Array<{
    idLesson: number;
    date: string;
    status: 'п' | 'у' | 'н' | null;
    comment: string | null;
  }>;
}

interface LessonAttendance {
  idLesson: number;
  idTeacher: number;
  status: 'п' | 'у'  | 'н';
  comment: string;
}

interface SemesterInfo {
  number: number;
  name: string;
  value: 'first' | 'second';
}

export const AttendanceSection: React.FC<AttendanceSectionProps> = ({ 
  studentId 
}) => {
  const [activeTab, setActiveTab] = useState<'semesters' | 'subjects' | 'analytics'>('semesters');
  const [selectedSemester, setSelectedSemester] = useState<'first' | 'second'>('first');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedAttendance, setSelectedAttendance] = useState<{
    subject: string, 
    status: 'п' | 'у' | 'н' | null, 
    idLesson: number, 
    date: string, 
    teacher: string, 
    comment?: string
  } | null>(null);
  const [attendanceData, setAttendanceData] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [error, setError] = useState<string | null>(null);
  const [isUsingCache, setIsUsingCache] = useState(false);
  const [lessonAttendance, setLessonAttendance] = useState<LessonAttendance | null>(null);
  const [lessonAttendanceLoading, setLessonAttendanceLoading] = useState(false);
  const [semesters, setSemesters] = useState<SemesterInfo[]>([]);
  const [studentCourse, setStudentCourse] = useState<number>(1);
  const [activeAttendanceTab, setActiveAttendanceTab] = useState<'info' | 'comments'>('info');
  const [newComment, setNewComment] = useState('');
  const [addCommentMode, setAddCommentMode] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<'3days' | 'week' | 'month' | 'all'>('week');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  });

  // Функция загрузки данных с приоритетом API
  const fetchAttendanceData = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
        const cacheKey = `attendance_${studentId}`;
        localStorage.removeItem(`cache_${cacheKey}`);
      } else {
        setLoading(true);
      }
      
      setError(null);
      setIsUsingCache(false);

      const data: SubjectAttendance[] = await apiService.getStudentAttendance(studentId);
      
      const transformedData: Attendance[] = data.map(subject => {
        const teachers = subject.nameSubjectTeachersDTO.teachers || [];
        const mainTeacher = teachers[0] || { 
          lastnameTeacher: 'Неизвестно', 
          nameTeacher: 'Н', 
          patronymicTeacher: 'П' 
        };
        
        const teacherString = `${mainTeacher.lastnameTeacher} ${mainTeacher.nameTeacher.charAt(0)}.${mainTeacher.patronymicTeacher.charAt(0)}.`;
        
        // Включаем ВСЕ статусы для отображения (включая null)
        const statuses: ('п' | 'у' | 'н' | null)[] = subject.attendances.map(a => a.status);
        
        // Для статистики учитываем только выставленные статусы (не null)
        const validAttendances = subject.attendances.filter(a => a.status !== null);
        const validStatuses = validAttendances.map(a => a.status as 'п' | 'у' | 'н');
        
        const presentCount = validStatuses.filter(status => status === 'п').length;
        const totalCount = validStatuses.length;
        const percent = totalCount > 0 ? (presentCount / totalCount) * 100 : 0;

        const reasonStatus: AttendanceDetail[] = subject.attendances.map(attendance => ({
          idLesson: attendance.idLesson,
          date: attendance.date,
          topic: `Занятие ${attendance.idLesson}`,
          status: attendance.status,
          teacher: teacherString,
          comment: attendance.comment || undefined
        }));

        return {
          id: subject.nameSubjectTeachersDTO.idSubject,
          subject: subject.nameSubjectTeachersDTO.nameSubject,
          teacher: teacherString,
          statuses, 
          quantity: totalCount, 
          percent: parseFloat(percent.toFixed(1)),
          reasonStatus
        };
      });

      setAttendanceData(transformedData);
      
    } catch (error) {
      console.error('Ошибка при загрузке данных с API:', error);
      setError('Не удалось загрузить данные о посещаемости');
      setAttendanceData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Функция для определения семестров по курсу
  const getSemestersByCourse = (course: number): SemesterInfo[] => {
    const semesterPairs = [
      { course: 1, semesters: [1, 2] },
      { course: 2, semesters: [3, 4] },
      { course: 3, semesters: [5, 6] },
      { course: 4, semesters: [7, 8] }
    ];
    
    const pair = semesterPairs.find(p => p.course === course) || semesterPairs[0];
    
    return pair.semesters.map(semesterNumber => ({
      number: semesterNumber,
      name: `${semesterNumber} семестр`,
      value: semesterNumber % 2 === 1 ? 'first' : 'second'
    }));
  };


  // Функция загрузки детальной информации о посещаемости урока
  const fetchLessonAttendance = async (lessonId: number) => {
    if (!lessonId) return;
    
    setLessonAttendanceLoading(true);
    try {
      const attendance = await apiService.getLessonAttendance(lessonId, studentId);
      setLessonAttendance(attendance);
    } catch (error) {
      console.error('Ошибка загрузки информации о посещаемости урока:', error);
      setLessonAttendance(null);
    } finally {
      setLessonAttendanceLoading(false);
    }
  };

  const fetchStudentCourse = async () => {
    try {
      const studentData = await apiService.getStudentData(studentId);
      if (studentData?.idGroup) {
        const groupData = await apiService.getGroupData(studentData.idGroup);
        const course = groupData.course || 1;
        setStudentCourse(course);
        setSemesters(getSemestersByCourse(course));
      } else {
        setStudentCourse(1);
        setSemesters(getSemestersByCourse(1));
      }
    } catch (error) {
      console.error('Ошибка при загрузке данных студента:', error);
      setStudentCourse(1);
      setSemesters(getSemestersByCourse(1));
    }
  };


  useEffect(() => {
  const loadData = async () => {
    await fetchStudentCourse();
    await fetchAttendanceData();
  };
  loadData();
}, [studentId]);


  // Функция принудительного обновления
  const handleRefresh = async () => {
    await fetchAttendanceData(true);
  };


  const handleAttendanceClick = async (
    subject: string, 
    status: 'п' | 'у' | 'н' | null, 
    idLesson: number, 
    date: string, 
    teacher: string, 
    comment?: string
  ) => {
    setSelectedAttendance({ subject, status, idLesson, date, teacher, comment });
    
    if (idLesson) {
      await fetchLessonAttendance(idLesson);
    }
  };

  // Функция для форматирования даты
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const closeAttendancePopup = () => {
    setSelectedAttendance(null);
    setLessonAttendance(null);
  };

  const subjects = attendanceData.map(attendance => attendance.subject);

  // Статистика
  const calculateAttendanceStatistics = () => {
    let totalPresent = 0;
    let totalExcused = 0;
    let totalAbsent = 0;
    let totalLessons = 0; 

    attendanceData.forEach(subject => {
      // Для статистики учитываем только выставленные статусы
      const validStatuses = subject.statuses.filter(status => status !== null) as ('п' | 'у' | 'н')[];
      const stats = calculateSubjectStats(validStatuses);
      
      totalPresent += stats.present;
      totalExcused += stats.excused;
      totalAbsent += stats.absent;
      totalLessons += validStatuses.length; // Только выставленные статусы
    });

    const totalAbsences = totalExcused + totalAbsent;
    const overallPercent = totalLessons > 0 ? ((totalPresent / totalLessons) * 100) : 0;

    return {
      totalPresent,
      totalExcused,
      totalAbsent,
      totalLessons,
      totalAbsences,
      overallPercent: parseFloat(overallPercent.toFixed(1))
    };
  };

  const calculateSubjectStats = (statuses: ('п' | 'у' | 'н' | null)[]) => {
    const present = statuses.filter(status => status === 'п').length;
    const excused = statuses.filter(status => status === 'у').length;
    const absent = statuses.filter(status => status === 'н').length;
    
    return { present, excused, absent };
  };

  const getStatusColor = (status: 'п' | 'у' | 'н' | null) => {
    switch (status) {
      case 'п': return '#2cbb00';
      case 'у': return '#f59e0b';
      case 'н': return '#ef4444';
      default: return '#d1d5db';
    }
  };

  const getStatusText = (status: 'п' | 'у'| 'н' | null) => {
    switch (status) {
      case 'п': return 'Присутствовал';
      case 'у': return 'Уважительная причина';
      case 'н': return 'Отсутствовал';
      default: return 'Не отмечен';
    }
  };

  const getPercentColor = (percent: number) => {
    if (percent >= 90) return '#2cbb00';
    if (percent >= 75) return '#a5db28';
    if (percent >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const statistics = calculateAttendanceStatistics();
  const selectedSubjectData = attendanceData.find(attendance => attendance.subject === selectedSubject);

  // Данные для графиков
  const attendanceChartData = [
    { subject: 'Присутствовал', count: statistics.totalPresent, color: '#2cbb00' },
    { subject: 'Уважительные', count: statistics.totalExcused, color: '#f59e0b' },
    { subject: 'Неуважительные', count: statistics.totalAbsent, color: '#ef4444' }
  ];

  const progressData = [
    { week: 'Нед. 1', attendance: 85 },
    { week: 'Нед. 2', attendance: 78 },
    { week: 'Нед. 3', attendance: 92 },
    { week: 'Нед. 4', attendance: 88 },
    { week: 'Нед. 5', attendance: 90 },
    { week: 'Нед. 6', attendance: 87 }
  ];
  
  const handleSubjectClick = (subjectName: string) => {
    setSelectedSubject(subjectName);
      setActiveTab('subjects');
  };

  // Компоненты
  const RefreshButton = () => (
    <button 
      className={`at-refresh-btn ${refreshing ? 'at-refreshing' : ''}`}
      onClick={handleRefresh}
      disabled={refreshing}
    >
      <img 
        src="/st-icons/upload_icon.svg" 
        className={`at-refresh-icon ${refreshing ? 'at-refresh-spin' : ''}`}
      />
    </button>
  );

  const SemesterSelector = () => (
    <div className="at-semester-selector">
      <div className="at-semester-buttons">
        {semesters.map((semester) => (
          <button
            key={semester.number}
            className={`at-semester-btn ${selectedSemester === semester.value ? 'at-active' : ''}`}
            onClick={() => setSelectedSemester(semester.value)}
          >
            {semester.name}
          </button>
        ))}
      </div>
    </div>
  );

  const ViewToggle = () => (
    activeTab === 'semesters' ? (
      <div className="at-view-toggle">
        <button
          className={`at-toggle-btn ${viewMode === 'grid' ? 'at-active' : ''}`}
          onClick={() => setViewMode('grid')}
        >
          Сетка
        </button>
        <button
          className={`at-toggle-btn ${viewMode === 'list' ? 'at-active' : ''}`}
          onClick={() => setViewMode('list')}
        >
          Список
        </button>
      </div>
    ) : null
  );

  // Функция для отображения состояния "нет данных"
  const renderNoDataState = () => (
    <div className="at-no-data-state">
      <div className="at-empty-state">
        <p>Нет данных за выбранный семестр</p>
      </div>
    </div>
  );

  // Обновленный рендер карточек предметов - ВСЕ данные для первого семестра
  const renderSubjectCards = () => {
    if (selectedSemester === 'second') {
      return renderNoDataState();
    }

    return (
      <div className="at-subjects-grid">
        {attendanceData.map((subject) => (
          <div 
            key={subject.id} 
            className="at-subject-card"
            onClick={() => handleSubjectClick(subject.subject)}
            style={{ cursor: 'pointer' }}
          >
            <div className="at-card-header">
              <h3 className="at-subject-title">{subject.subject}</h3>
              <div className="at-teacher-badge">
                {subject.teacher}
              </div>
            </div>
            
            <div className="at-attendance-preview">
              {subject.statuses.slice(0, 8).map((status, index) => {
                const detail = subject.reasonStatus?.[index];
                return (
                  <div
                    key={index}
                    className="at-preview-status"
                    style={{ backgroundColor: getStatusColor(status) }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAttendanceClick(
                        subject.subject,
                        status,
                        detail?.idLesson || 0,
                        detail?.date || '',
                        subject.teacher,
                        detail?.comment
                      );
                    }}
                    title={getStatusText(status)}
                  >
                    {status || '-'}
                  </div>
                );
              })}
              {subject.statuses.length > 8 && (
                <div className="at-more-statuses">+{subject.statuses.length - 8}</div>
              )}
              {(!subject.statuses) && (
                <div className="at-no-statuses">Нет данных о посещаемости</div>
              )}
            </div>

            <div className="at-card-footer">
              <div className="at-percent-score">
                <span className="at-percent-label">Посещаемость:</span>
                <span 
                  className="at-percent-value"
                  style={{ color: getPercentColor(subject.percent) }}
                >
                  {subject.percent}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Обновленный рендер таблицы предметов - ВСЕ данные для первого семестра
  const renderSubjectsTable = () => {
    if (selectedSemester === 'second') {
      return renderNoDataState();
    }

    const calculateAbsencesStats = (statuses: ('п' | 'у' | 'н' | null)[]) => {
      const validStatuses = statuses.filter(status => status !== null) as ('п' | 'у' | 'н')[];
      const stats = calculateSubjectStats(validStatuses);
      return {
        present: stats.present,
        excused: stats.excused,
        absent: stats.absent,
        totalAbsences: stats.excused + stats.absent
      };
    };

    return (
      <div className="at-subjects-table-container">
        <table className="at-subjects-table">
          <thead>
            <tr>
              <th>Предмет</th>
              <th>Посещаемость</th>
              <th>Пропуски</th>
              <th>Процент</th>
            </tr>
          </thead>
          <tbody>
            {attendanceData.map((subject) => {
              const stats = calculateAbsencesStats(subject.statuses);
              return (
                <tr 
                  key={subject.id}
                  className="at-subject-row"
                  onClick={() => handleSubjectClick(subject.subject)}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="at-subject-cell">
                    <div className="at-subject-info">
                      <span className="at-subject-name">{subject.subject}</span>
                    </div>
                  </td>
                  <td className="at-attendance-cell">
                    <div className="at-attendance-stack">
                      {subject.statuses.slice(0, 16).map((status, index) => {
                        const detail = subject.reasonStatus?.[index];
                        return (
                          <span
                            key={index}
                            className="at-stack-status"
                            style={{ backgroundColor: getStatusColor(status) }}
                            onClick={(e) => {
                              e.stopPropagation(); // Останавливаем всплытие
                              handleAttendanceClick(
                                subject.subject,
                                status,
                                detail?.idLesson || 0,
                                detail?.date || '',
                                subject.teacher,
                                detail?.comment
                              );
                            }}
                            title={`${getStatusText(status)} - Занятие ${index + 1}`}
                          >
                            {status || '-'}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td className="at-absences-cell">
                    <div className="at-absences-breakdown">
                      <div className="at-absence-type">
                        <span className="at-absence-dot at-excused"></span>
                        <span className="at-absence-count">У: {stats.excused}</span>
                      </div>
                      <div className="at-absence-type">
                        <span className="at-absence-dot at-absent"></span>
                        <span className="at-absence-count">Н: {stats.absent}</span>
                      </div>
                      <div className="at-absence-total">
                        Всего: {stats.totalAbsences}
                      </div>
                    </div>
                  </td>
                  <td className="at-percent-cell">
                    <div 
                      className="at-percent-badge"
                      style={{ 
                        backgroundColor: getPercentColor(subject.percent) + '20',
                        color: getPercentColor(subject.percent)
                      }}
                    >
                      {subject.percent}%
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // Компонент фильтра периодов
  const PeriodFilter = () => (
    <div className="at-period-filter">
      <div className="at-date-range">
        <div className="at-date-inputs">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="at-date-input"
            placeholder="Начальная дата"
          />
          <span className="at-date-separator">—</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="at-date-input"
            placeholder="Конечная дата"
          />
          <button
            className="at-apply-filter-btn"
            onClick={() => {
              // Применяем фильтр - пересчитываем данные
              const progressResult = calculateAttendanceProgress();
              if (!progressResult.hasEnoughData) {
                setError(progressResult.message);
              }
            }}
          >
            Применить
          </button>
          <button
            className="at-reset-filter-btn"
            onClick={() => {
              setDateRange({ start: '', end: '' });
            }}
          >
            Сбросить
          </button>
        </div>
      </div>
    </div>
  );

  //  функция для расчета динамики посещаемости
  const calculateAttendanceProgress = () => {
    const allDates: string[] = [];
    
    attendanceData.forEach(subject => {
      subject.reasonStatus?.forEach(detail => {
        if (detail.date && detail.status !== null) {
          allDates.push(detail.date);
        }
      });
    });

    if (allDates.length === 0) {
      return { data: [], hasEnoughData: false, message: 'Нет данных о посещаемости' };
    }

    // Уникальные даты, отсортированные по возрастанию
    const uniqueDates = Array.from(new Set(allDates)).sort((a, b) => 
      new Date(a).getTime() - new Date(b).getTime()
    );

    // Фильтруем даты по выбранному диапазону
    let filteredDates = uniqueDates;
    
    if (dateRange.start && dateRange.end) {
      filteredDates = uniqueDates.filter(date => {
        try {
          const currentDate = new Date(date);
          const startDate = new Date(dateRange.start);
          const endDate = new Date(dateRange.end);
          // Добавляем 1 день к конечной дате чтобы включить её в диапазон
          endDate.setDate(endDate.getDate() + 1);
          return currentDate >= startDate && currentDate < endDate;
        } catch (error) {
          console.error('Ошибка фильтрации дат:', error);
          return true;
        }
      });
    }

    if (filteredDates.length === 0) {
      return { 
        data: [], 
        hasEnoughData: false, 
        message: 'Нет данных в выбранном диапазоне дат' 
      };
    }

    let progressData: { period: string; attendance: number; date: string }[] = [];
    
    const totalDays = filteredDates.length;
    
    if (totalDays <= 10) {
      // Меньше 10 дней - группируем по дням
      progressData = groupByDays(filteredDates);
    } else if (totalDays <= 30) {
      // 11-30 дней - группируем по 3 дням
      progressData = groupBy3Days(filteredDates);
    } else if (totalDays <= 90) {
      // 31-90 дней - группируем по неделям
      progressData = groupByWeeks(filteredDates);
    } else {
      // Больше 90 дней - группируем по месяцам
      progressData = groupByMonths(filteredDates);
    }

    if (progressData.length === 0) {
      return { 
        data: [], 
        hasEnoughData: false, 
        message: 'Не удалось сгруппировать данные для построения графика' 
      };
    }

    return { 
      data: progressData, 
      hasEnoughData: true, 
      message: `Данные за период: ${formatDate(filteredDates[0])} - ${formatDate(filteredDates[filteredDates.length - 1])} (${totalDays} ${getDateWord(totalDays)})` 
    };
  };

  // Функция для получения номера недели в году
  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNumber = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNumber;
  };

  const groupByDays = (dates: string[]) => {
    const progressData: { period: string; attendance: number; date: string }[] = [];
    
    dates.forEach((date, index) => {
      const periodLabel = formatShortDate(date);
      const attendancePercent = calculateAttendanceForPeriod([date]);
      
      progressData.push({
        period: periodLabel,
        attendance: attendancePercent,
        date: date
      });
    });
    
    return progressData;
  };

  // Функции группировки
  const groupBy3Days = (dates: string[]) => {
    const progressData: { period: string; attendance: number; date: string }[] = [];
    
    for (let i = 0; i < dates.length; i += 3) {
      const periodDates = dates.slice(i, i + 3);
      if (periodDates.length === 0) continue;
      
      const startDate = formatShortDate(periodDates[0]);
      const endDate = formatShortDate(periodDates[periodDates.length - 1]);
      const periodLabel = periodDates.length === 1 ? startDate : `${startDate} - ${endDate}`;
      
      const attendancePercent = calculateAttendanceForPeriod(periodDates);
      
      progressData.push({
        period: periodLabel,
        attendance: attendancePercent,
        date: periodDates[0]
      });
    }
    
    return progressData;
  };

  const groupByWeeks = (dates: string[]) => {
    const progressData: { period: string; attendance: number; date: string }[] = [];
    const weeks: { [key: string]: string[] } = {};
    
    // Группируем даты по неделям
    dates.forEach(date => {
      const dateObj = new Date(date);
      const year = dateObj.getFullYear();
      const weekNumber = getWeekNumber(dateObj);
      const weekKey = `${year}-W${weekNumber.toString().padStart(2, '0')}`;
      
      if (!weeks[weekKey]) {
        weeks[weekKey] = [];
      }
      weeks[weekKey].push(date);
    });
    
    // Обрабатываем каждую неделю
    Object.keys(weeks).forEach(weekKey => {
      const weekDates = weeks[weekKey];
      const weekNum = parseInt(weekKey.split('-W')[1]);
      const year = weekKey.split('-')[0];
      const periodLabel = `Нед. ${weekNum}, ${year}`;
      
      const attendancePercent = calculateAttendanceForPeriod(weekDates);
      
      progressData.push({
        period: periodLabel,
        attendance: attendancePercent,
        date: weekDates[0]
      });
    });
    
    // Сортируем по дате
    return progressData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const groupByMonths = (dates: string[]) => {
    const progressData: { period: string; attendance: number; date: string }[] = [];
    const months: { [key: string]: string[] } = {};
    
    // Группируем даты по месяцам
    dates.forEach(date => {
      const dateObj = new Date(date);
      const year = dateObj.getFullYear();
      const month = dateObj.getMonth();
      const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
      
      if (!months[monthKey]) {
        months[monthKey] = [];
      }
      months[monthKey].push(date);
    });
    
    // Обрабатываем каждый месяц
    Object.keys(months).forEach(monthKey => {
      const monthDates = months[monthKey];
      const [year, month] = monthKey.split('-');
      const monthName = new Date(parseInt(year), parseInt(month)).toLocaleDateString('ru-RU', { 
        month: 'long'
      });
      const periodLabel = `${monthName} ${year}`;
      
      const attendancePercent = calculateAttendanceForPeriod(monthDates);
      
      progressData.push({
        period: periodLabel,
        attendance: attendancePercent,
        date: monthDates[0]
      });
    });
    
    // Сортируем по дате
    return progressData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  // Общая функция расчета посещаемости для периода
  const calculateAttendanceForPeriod = (dates: string[]): number => {
    let totalLessons = 0;
    let presentLessons = 0;
    
    dates.forEach(date => {
      attendanceData.forEach(subject => {
        subject.reasonStatus?.forEach(detail => {
          if (detail.date === date && detail.status !== null) {
            totalLessons++;
            if (detail.status === 'п') {
              presentLessons++;
            }
          }
        });
      });
    });
    
    return totalLessons > 0 ? parseFloat(((presentLessons / totalLessons) * 100).toFixed(1)) : 0;
  };

  // Вспомогательная функция для правильного склонения слов
  const getDateWord = (count: number) => {
    if (count === 1) return 'занятие';
    if (count >= 2 && count <= 4) return 'занятия';
    return 'занятий';
  };

  const formatShortDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  };

    const hasDataInSelectedSemester = useCallback(() => {
    if (selectedSemester === 'first') return true;
    
    if (!attendanceData || attendanceData.length === 0) return false;
    
    return attendanceData.some(subject => 
      subject.reasonStatus && 
      subject.reasonStatus.some(detail => detail.status !== null)
    );
  }, [attendanceData, selectedSemester]);

  // Обновите рендер аналитики
  const renderAnalytics = () => {
    if (selectedSemester === 'second') {
      return (
        <div className="at-analytics-container">
          {renderNoDataState()}
        </div>
      );
    }
    const progressResult = calculateAttendanceProgress();
    
    return (
      <div className="at-analytics-container">
        <div className="at-stats-cards">
          <div className="at-stat-card">
            <div className="at-stat-content">
              <div className="at-stat-value">{statistics.overallPercent}%</div>
              <div className="at-stat-label">Общая посещаемость</div>
            </div>
          </div>

          <div className="at-stat-card">
            <div className="at-stat-content">
              <div className="at-stat-value">{statistics.totalPresent}</div>
              <div className="at-stat-label">Присутствовал</div>
            </div>
          </div>

          <div className="at-stat-card">
            <div className="at-stat-content">
              <div className="at-stat-value">{statistics.totalAbsences}</div>
              <div className="at-stat-label">Всего пропусков</div>
            </div>
          </div>
        </div>

        <div className="at-charts-grid">
          <div className="at-chart-card at-large">
            <h3>Распределение посещаемости</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={attendanceChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="subject" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} name='Количество'>
                  {attendanceChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>



          <div className="at-chart-card at-large">
            <div className="at-chart-header">
              <h3>Динамика посещаемости</h3>
              <PeriodFilter />
            </div>

            {progressResult.hasEnoughData ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={progressResult.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="period" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                  />
                  <YAxis domain={[0, 100]} />
                  <Tooltip 
                    formatter={(value) => [`${value}%`, 'Посещаемость']}
                    labelFormatter={(label) => `Период: ${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="attendance" 
                    stroke="#2cbb00" 
                    strokeWidth={3}
                    dot={{ fill: '#2cbb00', strokeWidth: 2, r: 6 }}
                    name="Посещаемость"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="at-insufficient-data">
                <div className="at-data-warning-icon">⚠️</div>
                <h4>Недостаточно данных</h4>
                <p>{progressResult.message}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="at-loading">
        <div className="at-loading-spinner"></div>
        <p>Загрузка данных о посещаемости...</p>
      </div>
    );
  }

  return (
    <div className="at-attendance-section">
      {/* Статусная информация */}
      {(error || isUsingCache) && (
        <div className="at-status-info">
          {error && <div className="at-error-message">{error}</div>}
          {isUsingCache && (
            <div className="at-cache-warning">
              Используются кэшированные данные. Некоторые данные могут быть устаревшими.
            </div>
          )}
        </div>
      )}

      {/* Навигация */}
      <div className="at-nav">
        <button
          className={`at-nav-btn ${activeTab === 'semesters' ? 'at-active' : ''}`}
          onClick={() => setActiveTab('semesters')}
        >
          По семестрам
        </button>
        <button
          className={`at-nav-btn ${activeTab === 'subjects' ? 'at-active' : ''}`}
          onClick={() => setActiveTab('subjects')}
        >
          По предметам
        </button>
        <button
          className={`at-nav-btn ${activeTab === 'analytics' ? 'at-active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          Аналитика
        </button>
      </div>

      {/* Контролы */}
      <div className="at-controls-section">
        <SemesterSelector />
        <div className="at-controls-section-left">
          <ViewToggle />
          <RefreshButton />
        </div>
      </div>

      {/* Контент */}
      <div className="at-content">
        {activeTab === 'semesters' && (
          <div className="at-tab-content">
            {viewMode === 'grid' ? renderSubjectCards() : renderSubjectsTable()}
          </div>
        )}

        {activeTab === 'subjects' && (
          <div className="at-tab-content">
            <div className="at-subject-detail-container">
              <div className="at-subject-selector">
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="at-select"
                >
                  <option value="">Выберите предмет</option>
                  {subjects.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>

              {selectedSubjectData ? (
                <div className="at-subject-detail">
                  <div className="at-detail-header">
                    <h2>{selectedSubjectData.subject}</h2>
                    <div className="at-subject-meta">
                      <span className="at-meta-item">Преподаватель: {selectedSubjectData.teacher}</span>
                      <span className="at-meta-item">Посещаемость: {selectedSubjectData.percent}%</span>
                    </div>
                  </div>

                  <div className="at-attendance-timeline">
                    {selectedSubjectData.reasonStatus?.map((detail, index) => (
                      <div key={detail.idLesson} className="at-timeline-item">
                        <div className="at-timeline-content"
                        onClick={() => handleAttendanceClick(
                                selectedSubjectData.subject,
                                detail.status,
                                detail.idLesson,
                                detail.date,
                                detail.teacher,
                                detail.comment
                              )}>
                          <div className="at-attendance-header">
                            
                          </div>
                          <div className="at-attendance-details">
                            
                            <span 
                              className="at-attendance-value"
                              style={{ 
                                backgroundColor: getStatusColor(detail.status)
                              }}
                              
                            >
                              {detail.status || '-'}
                            </span>
                            <span className="at-attendance-date">{formatDate(detail.date)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="at-no-subject-selected">
                  <div className="at-empty-state">
                    <h3>Выберите предмет</h3>
                    <p>Для просмотра детальной информации выберите предмет из списка</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && renderAnalytics()}
      </div>

      {/* Попап с информацией о посещаемости */}
      {selectedAttendance && (
        <div className="at-popup-overlay" onClick={closeAttendancePopup}>
          <div className="at-popup at-popup-large" onClick={(e) => e.stopPropagation()}>
            <div className="at-popup-header">
              <h3>Информация о посещаемости</h3>
              <button className="at-popup-close" onClick={closeAttendancePopup}>
                <span>×</span>
              </button>
            </div>
            
            <div className="at-popup-content">
              <div className="at-attendance-info-detailed">
                <div className="at-attendance-main-info">
                  <div 
                    className="at-status-circle-large"
                    style={{ 
                      backgroundColor: getStatusColor(selectedAttendance.status),
                      borderColor: getStatusColor(selectedAttendance.status)
                    }}
                  >
                    <span className="at-status-symbol-large">
                      {selectedAttendance.status || '-'}
                    </span>
                  </div>
                  <div className="at-attendance-basic-details">
                    <div className="at-detail-item">
                      <span className="at-detail-label">Предмет</span>
                      <span className="at-detail-value">{selectedAttendance.subject}</span>
                    </div>
                    <div className="at-detail-item">
                      <span className="at-detail-label">Дата занятия</span>
                      <span className="at-detail-value">
                        {selectedAttendance.date ? formatDate(selectedAttendance.date) : 'Не указана'}
                      </span>
                    </div>
                    <div className="at-detail-item">
                      <span className="at-detail-label">Статус</span>
                      <span className="at-detail-value at-status-text">
                        {getStatusText(selectedAttendance.status)}
                      </span>
                    </div>
                    <div className="at-detail-item">
                      <span className="at-detail-label">Преподаватель</span>
                      <span className="at-detail-value at-teacher">{selectedAttendance.teacher}</span>
                    </div>
                    
                    {/* Причина пропуска для статуса "у" */}
                    {selectedAttendance.status === 'у' && (
                      <div className="at-detail-item at-reason-item">
                        <span className="at-detail-label">Причина пропуска</span>
                        <div className="at-reason-content">
                          {lessonAttendanceLoading ? (
                            <div className="at-loading-small">
                              <div className="at-loading-spinner"></div>
                              <p>Загрузка информации...</p>
                            </div>
                          ) : lessonAttendance?.comment ? (
                            <span className="at-detail-value at-reason-text">
                              {lessonAttendance.comment}
                            </span>
                          ) : selectedAttendance.comment ? (
                            <span className="at-detail-value at-reason-text">
                              {selectedAttendance.comment}
                            </span>
                          ) : (
                            <span className="at-detail-value at-no-reason">
                              Причина не указана
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Информация для неотмеченных статусов */}
                    {selectedAttendance.status === null && (
                      <div className="at-detail-item at-no-status-info">
                        <span className="at-detail-label">Информация</span>
                        <span className="at-detail-value at-no-status-text">
                          Статус посещения ещё не выставлен преподавателем
                        </span>
                      </div>
                    )}
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