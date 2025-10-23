import React, { useState, useRef, useEffect } from 'react';
import './AttendanceSectionStyle.css';
// Библиотеки для статистики
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
  Area,
  PieLabelRenderProps
} from 'recharts';

export interface Attendance {
  id: number;
  subject: string;
  statuses: ('п' | 'у' | 'б' | 'н')[];
  quantity: number;
  percent: number;
  reasonStatus?: GradeDetail[];
}

export interface GradeDetail {
  id: number;
  date: string;
  topic: string;
  status: 'п' | 'у' | 'б' | 'н';
  teacher: string;
  reason?: string;
  startDate?: string;
  endDate?: string;
}

// Интерфейс для данных круговой диаграммы
interface PieData {
  name: string;
  value: number;
  color: string;
}

// Интерфейс для данных столбчатой диаграммы
interface BarData {
  name: string;
  value: number;
  color: string;
}

export const AttendanceSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'semesters' | 'subjects' | 'statistics'>('semesters');
  const [selectedSemester, setSelectedSemester] = useState<'first' | 'second'>('first');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedAttendance, setSelectedAttendance] = useState<GradeDetail | null>(null);
  const [attendancePosition, setAttendancePosition] = useState<{ top: number; left: number } | null>(null);
  const [clickedAttendanceId, setClickedAttendanceId] = useState<number | null>(null);
  
  const attendanceRefs = useRef<Map<number, HTMLElement>>(new Map());

  // Данные по посещаемости
  // ЗАГЛУШКИ !!!
  const attendanceData: Attendance[] = [
    {
      id: 1,
      subject: 'Русский язык',
      statuses: ['п', 'п', 'у', 'п', 'п', 'н', 'п', 'п', 'б', 'п', 'п', 'п', 'у', 'п', 'п', 'п', 'н', 'п', 'п', 'п', 'п', 'п', 'у', 'п', 'п', 'п', 'п', 'п', 'п', 'п'],
      quantity: 30,
      percent: 83.3,
      reasonStatus: [
        { id: 1, date: '13.09.2024', topic: 'Введение. Основные термины', status: 'п', teacher: 'Иванова А.С.' },
        { id: 2, date: '20.09.2024', topic: 'Синтаксис и пунктуация', status: 'п', teacher: 'Иванова А.С.' },
        { id: 3, date: '27.09.2024', topic: 'Морфология', status: 'у', teacher: 'Иванова А.С.', reason: 'Семейные обстоятельства' },
        { id: 4, date: '04.10.2024', topic: 'Фонетика', status: 'п', teacher: 'Иванова А.С.' },
        { id: 5, date: '11.10.2024', topic: 'Орфография', status: 'п', teacher: 'Иванова А.С.' },
        { id: 6, date: '18.10.2024', topic: 'Пунктуация', status: 'н', teacher: 'Иванова А.С.' },
        { id: 7, date: '25.10.2024', topic: 'Стилистика', status: 'п', teacher: 'Иванова А.С.' },
        { id: 8, date: '01.11.2024', topic: 'Лексикология', status: 'п', teacher: 'Иванова А.С.' },
        { id: 9, date: '08.11.2024', topic: 'Фразеология', status: 'б', teacher: 'Иванова А.С.', startDate: '08.11.2024', endDate: '15.11.2024' },
        { id: 10, date: '15.11.2024', topic: 'Словообразование', status: 'п', teacher: 'Иванова А.С.' },
      ]
    },
    {
      id: 2,
      subject: 'Литература',
      statuses: ['п', 'п', 'п', 'п', 'у', 'п', 'п', 'п', 'п', 'п', 'п', 'п', 'п', 'п', 'п'],
      quantity: 15,
      percent: 93.3,
      reasonStatus: [
        { id: 1, date: '15.09.2024', topic: 'Русская классическая литература', status: 'п', teacher: 'Петрова М.В.' },
        { id: 2, date: '22.09.2024', topic: 'Поэзия Серебряного века', status: 'п', teacher: 'Петрова М.В.' },
        { id: 3, date: '29.09.2024', topic: 'Современная литература', status: 'п', teacher: 'Петрова М.В.' },
        { id: 4, date: '06.10.2024', topic: 'Зарубежная литература', status: 'п', teacher: 'Петрова М.В.' },
        { id: 5, date: '13.10.2024', topic: 'Драматургия', status: 'у', teacher: 'Петрова М.В.', reason: 'Участие в конференции' },
      ]
    },
    {
      id: 3,
      subject: 'Математика',
      statuses: ['п', 'п', 'п', 'п', 'п', 'п', 'п', 'п', 'п', 'п', 'п', 'п', 'п', 'п', 'п', 'п', 'п', 'п', 'п', 'п', 'п', 'п', 'п', 'п', 'п', 'п', 'п', 'п', 'п', 'п'],
      quantity: 30,
      percent: 100,
      reasonStatus: [
        { id: 1, date: '14.09.2024', topic: 'Алгебраические уравнения', status: 'п', teacher: 'Сидоров В.П.' },
        { id: 2, date: '21.09.2024', topic: 'Геометрия', status: 'п', teacher: 'Сидоров В.П.' },
        { id: 3, date: '28.09.2024', topic: 'Тригонометрия', status: 'п', teacher: 'Сидоров В.П.' },
      ]
    },
    {
      id: 4,
      subject: 'Программирование',
      statuses: ['п', 'п', 'п', 'у', 'п', 'п', 'п', 'п', 'п', 'п', 'п', 'п', 'п', 'п', 'п', 'п', 'п', 'п', 'п', 'п', 'п', 'п', 'п', 'п', 'п', 'п', 'п', 'п', 'п', 'п'],
      quantity: 30,
      percent: 96.7,
      reasonStatus: [
        { id: 1, date: '16.09.2024', topic: 'Основы JavaScript', status: 'п', teacher: 'Козлов Д.А.' },
        { id: 2, date: '23.09.2024', topic: 'React компоненты', status: 'п', teacher: 'Козлов Д.А.' },
        { id: 3, date: '30.09.2024', topic: 'Работа с API', status: 'п', teacher: 'Козлов Д.А.' },
        { id: 4, date: '07.10.2024', topic: 'TypeScript', status: 'у', teacher: 'Козлов Д.А.', reason: 'Выезд на соревнования' },
      ]
    },
    {
      id: 5,
      subject: 'Базы данных',
      statuses: ['п', 'п', 'н', 'п', 'у', 'п', 'п', 'н', 'п', 'п', 'б', 'п', 'п', 'п', 'п'],
      quantity: 15,
      percent: 73.3,
      reasonStatus: [
        { id: 1, date: '17.09.2024', topic: 'SQL запросы', status: 'п', teacher: 'Николаев С.В.' },
        { id: 2, date: '24.09.2024', topic: 'Нормализация баз данных', status: 'п', teacher: 'Николаев С.В.' },
        { id: 3, date: '01.10.2024', topic: 'Транзакции', status: 'н', teacher: 'Николаев С.В.' },
        { id: 4, date: '08.10.2024', topic: 'Оптимизация запросов', status: 'п', teacher: 'Николаев С.В.' },
        { id: 5, date: '15.10.2024', topic: 'Индексы', status: 'у', teacher: 'Николаев С.В.', reason: 'Посещение врача' },
        { id: 6, date: '22.10.2024', topic: 'Резервное копирование', status: 'п', teacher: 'Николаев С.В.' },
        { id: 7, date: '29.10.2024', topic: 'Безопасность БД', status: 'н', teacher: 'Николаев С.В.' },
        { id: 8, date: '05.11.2024', topic: 'NoSQL базы данных', status: 'п', teacher: 'Николаев С.В.' },
        { id: 9, date: '12.11.2024', topic: 'Реляционная алгебра', status: 'п', teacher: 'Николаев С.В.' },
        { id: 10, date: '19.11.2024', topic: 'Хранимые процедуры', status: 'б', teacher: 'Николаев С.В.', startDate: '19.11.2024', endDate: '26.11.2024' },
      ]
    }
  ];

  const subjects = attendanceData.map(attendance => attendance.subject);

  // Функция для подсчета общей статистики
  const calculateOverallStatistics = () => {
    let totalPresent = 0;
    let totalExcused = 0;
    let totalSick = 0;
    let totalAbsent = 0;
    let totalLessons = 0;

    attendanceData.forEach(subject => {
      const absences = calculateAbsences(subject.statuses);
      totalPresent += absences.present;
      totalExcused += absences.excused;
      totalSick += absences.sick;
      totalAbsent += absences.absent;
      totalLessons += subject.statuses.length;
    });

    const totalAbsences = totalExcused + totalSick + totalAbsent;
    const overallPercent = ((totalPresent / totalLessons) * 100).toFixed(1);

    return {
      totalPresent,
      totalExcused,
      totalSick,
      totalAbsent,
      totalLessons,
      totalAbsences,
      overallPercent: parseFloat(overallPercent)
    };
  };

  // Функция для подсчета пропусков по типам
  const calculateAbsences = (statuses: ('п' | 'у' | 'б' | 'н')[]) => {
    const present = statuses.filter(status => status === 'п').length;
    const excused = statuses.filter(status => status === 'у').length;
    const sick = statuses.filter(status => status === 'б').length;
    const absent = statuses.filter(status => status === 'н').length;
    
    return { present, excused, sick, absent };
  };

  const handleAttendanceClick = (attendanceDetail: GradeDetail, attendanceIndex: number, event: React.MouseEvent) => {
    const target = event.currentTarget as HTMLElement;
    const uniqueId = Date.now() + attendanceIndex;
    
    attendanceRefs.current.set(uniqueId, target);
    setClickedAttendanceId(uniqueId);
    setSelectedAttendance(attendanceDetail);
    
    document.body.style.overflow = 'hidden';
  };

  useEffect(() => {
    if (clickedAttendanceId && selectedAttendance) {
      const element = attendanceRefs.current.get(clickedAttendanceId);
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
        
        setAttendancePosition({
          top: scrollY,
          left: viewportWidth / 2
        });
      }
    }
  }, [clickedAttendanceId, selectedAttendance]);

  const closeAttendancePopup = () => {
    setSelectedAttendance(null);
    setAttendancePosition(null);
    setClickedAttendanceId(null);
    document.body.style.overflow = 'auto';
  };

  const calculateOverallAttendance = () => {
    const totalPercent = attendanceData.reduce((sum, subject) => sum + subject.percent, 0);
    return (totalPercent / attendanceData.length).toFixed(1);
  };

  const getStatusColor = (status: 'п' | 'у' | 'б' | 'н') => {
    switch (status) {
      case 'п': return '#2cbb00ff';
      case 'у': return '#f59e0b';
      case 'б': return '#6b7280';
      case 'н': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status: 'п' | 'у' | 'б' | 'н') => {
    switch (status) {
      case 'п': return 'Присутствовал';
      case 'у': return 'Уважительная причина';
      case 'б': return 'Больничный';
      case 'н': return 'Отсутствовал';
      default: return '';
    }
  };

  const getPercentColor = (percent: number) => {
    if (percent >= 90) return '#2cbb00ff';
    if (percent >= 75) return '#a5db28ff';
    if (percent >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const selectedSubjectData = attendanceData.find(attendance => attendance.subject === selectedSubject);
  const statistics = calculateOverallStatistics();

  // Данные для графиков
  const barChartData: BarData[] = [
    { name: 'Присутствовал', value: statistics.totalPresent, color: '#2cbb00ff' },
    { name: 'Уважительные', value: statistics.totalExcused, color: '#f59e0b' },
    { name: 'Больничные', value: statistics.totalSick, color: '#6b7280' },
    { name: 'Неуважительные', value: statistics.totalAbsent, color: '#ef4444' }
  ];

  const pieChartData: PieData[] = [
    { name: 'Уважительные', value: statistics.totalExcused, color: '#f59e0b' },
    { name: 'Больничные', value: statistics.totalSick, color: '#6b7280' },
    { name: 'Неуважительные', value: statistics.totalAbsent, color: '#ef4444' }
  ];

  const progressData = [
    { name: 'Посещаемость', value: statistics.overallPercent, color: '#2cbb00ff' },
    { name: 'Осталось', value: 100 - statistics.overallPercent, color: '#e5e7eb' }
  ];

  const lineChartData = [
    { month: 'Сентябрь', attendance: 85 },
    { month: 'Октябрь', attendance: 78 },
    { month: 'Ноябрь', attendance: 92 },
    { month: 'Декабрь', attendance: 88 },
    { month: 'Январь', attendance: 90 },
    { month: 'Февраль', attendance: 87 }
  ];

  // Кастомный тултип для графиков
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="at-custom-tooltip">
          <p className="at-tooltip-label">{label}</p>
          <p className="at-tooltip-value">
            {payload[0].name}: {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  // Функция для рендера лейблов круговой диаграммы
  const renderCustomizedLabel = (props: PieLabelRenderProps) => {
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

  // Рендер секции статистики с Recharts
  const renderStatisticsSection = () => {
    return (
      <div className="at-statistics-section">
        <div className="at-statistics-header">
          <h2>Статистика посещаемости</h2>
          <p>Общий обзор вашей посещаемости за семестр</p>
        </div>

        <div className="at-statistics-grid">
          {/* Карточка с общей статистикой */}
          <div className="at-stat-card-large">
            <h3>Общая статистика</h3>
            <div className="at-overall-stats">
              <div className="at-stat-item">
                <span className="at-stat-label">Всего занятий:</span>
                <span className="at-stat-value">{statistics.totalLessons}</span>
              </div>
              <div className="at-stat-item">
                <span className="at-stat-label">Присутствовал:</span>
                <span className="at-stat-value">{statistics.totalPresent}</span>
              </div>
              <div className="at-stat-item">
                <span className="at-stat-label">Пропуски всего:</span>
                <span className="at-stat-value">{statistics.totalAbsences}</span>
              </div>
              <div className="at-stat-item">
                <span className="at-stat-label">Уважительные:</span>
                <span className="at-stat-value">{statistics.totalExcused}</span>
              </div>
              <div className="at-stat-item">
                <span className="at-stat-label">Больничные:</span>
                <span className="at-stat-value">{statistics.totalSick}</span>
              </div>
              <div className="at-stat-item">
                <span className="at-stat-label">Неуважительные:</span>
                <span className="at-stat-value">{statistics.totalAbsent}</span>
              </div>
            </div>
          </div>

          {/* Индикатор процента посещаемости */}
          <div className="at-stat-card-large">
            <h3>Процент посещаемости</h3>
            <div className="at-percent-indicator">
              <div 
                className="at-percent-circle"
                style={{ 
                  background: `conic-gradient(#2cbb00ff ${statistics.overallPercent * 3.6}deg, #e5e7eb 0deg)` 
                }}
              >
                <div className="at-percent-inner">
                  <span className="at-percent-value">{statistics.overallPercent}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Столбчатая диаграмма */}
          <div className="at-chart-card">
            <h3>Общее количество пропусков по категориям</h3>
            <ResponsiveContainer width="100%" height="80%">
              <BarChart 
                data={barChartData} 
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
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
                  {barChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Круговая диаграмма пропусков */}
          <div className="at-chart-card">
            <h3>Распределение пропусков</h3>
            <ResponsiveContainer width="100%" height="80%">
              <PieChart>
                <Pie
                  data={pieChartData as any[]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={renderCustomizedLabel}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Линейный график */}
          <div className="at-chart-card at-line-chart">
            <h3>Динамика посещаемости по месяцам</h3>
            <ResponsiveContainer width="100%" height="80%">
              <AreaChart
                data={lineChartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  domain={[0, 100]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="attendance" 
                  stroke="#2cbb00ff" 
                  fill="url(#colorAttendance)" 
                  strokeWidth={2}
                />
                <defs>
                  <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
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

  // Остальной код компонента остается без изменений
  // ... (ваш существующий код для других вкладок)

  return (
    <div className="at-attendance-section">
      <div className="at-attendance-header">
        <div className="at-view-tabs">
          <button
            className={`at-view-tab ${activeTab === 'semesters' ? 'at-active' : ''}`}
            onClick={() => setActiveTab('semesters')}
          >
            По семестрам
          </button>
          <button
            className={`at-view-tab ${activeTab === 'subjects' ? 'at-active' : ''}`}
            onClick={() => setActiveTab('subjects')}
          >
            По предметам
          </button>
          <button
            className={`at-view-tab ${activeTab === 'statistics' ? 'at-active' : ''}`}
            onClick={() => setActiveTab('statistics')}
          >
            Статистика
          </button>
        </div>
      </div>

      <div className="at-attendance-content">
        {activeTab === 'semesters' ? (
          <>
            <div className="at-semester-controls">
              <div className="at-semester-tabs">
                <button
                  className={`at-semester-tab ${selectedSemester === 'first' ? 'at-active' : ''}`}
                  onClick={() => setSelectedSemester('first')}
                >
                  1-ый семестр
                </button>
                <button
                  className={`at-semester-tab ${selectedSemester === 'second' ? 'at-active' : ''}`}
                  onClick={() => setSelectedSemester('second')}
                >
                  2-ой семестр
                </button>
              </div>
            </div>

            <div className="at-attendance-table-container">
              <table className="at-attendance-table">
                <thead>
                  <tr>
                    <th>№</th>
                    <th>Предмет</th>
                    <th>Посещаемость</th>
                    <th>Пропуски</th>
                    <th>Процент</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceData.map((subject, index) => {
                    const absences = calculateAbsences(subject.statuses);
                    return (
                      <tr key={subject.id}>
                        <td>{index + 1}.</td>
                        <td className="at-subject-name">{subject.subject}</td>
                        <td className="at-attendance-list">
                          <div className="at-attendance-scroll-container">
                            {subject.statuses.map((status, statusIndex) => (
                              <span
                                key={statusIndex}
                                className="at-status-bubble"
                                style={{ backgroundColor: getStatusColor(status) }}
                                onClick={(e) => 
                                  handleAttendanceClick(
                                    subject.reasonStatus![statusIndex % subject.reasonStatus!.length], 
                                    statusIndex, 
                                    e
                                  )
                                }
                                title={getStatusText(status)}
                              >
                                {status}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="at-absences-cell">
                          <div className="at-absences-breakdown">
                            <div className="at-absence-type">
                              <span className="at-absence-dot at-excused"></span>
                              <span>У: {absences.excused}</span>
                            </div>
                            <div className="at-absence-type">
                              <span className="at-absence-dot at-sick"></span>
                              <span>Б: {absences.sick}</span>
                            </div>
                            <div className="at-absence-type">
                              <span className="at-absence-dot at-absent"></span>
                              <span>Н: {absences.absent}</span>
                            </div>
                            <div className="at-absence-total">
                              Всего: {absences.excused + absences.sick + absences.absent}
                            </div>
                          </div>
                        </td>
                        <td className="at-attendance-percent">
                          <span 
                            className="at-percent-bubble"
                            style={{ backgroundColor: getPercentColor(subject.percent) }}
                          >
                            {subject.percent}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : activeTab === 'subjects' ? (
          <>
            <div className="at-subject-controls">
              <div className="at-subject-filter">
                <label htmlFor="at-subject-select">Предмет:</label>
                <select
                  id="at-subject-select"
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="at-subject-select"
                >
                  <option value="">Выберите предмет</option>
                  {subjects.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>
            </div>

            {selectedSubjectData ? (
              <div className="at-subject-attendance-table-container">
                <table className="at-subject-attendance-table">
                  <thead>
                    <tr>
                      <th className="at-subject-attendance-table-column1">№</th>
                      <th>Статус</th>
                      <th>Тема</th>
                      <th>Дата</th>
                      <th>Преподаватель</th>
                      <th>Причина</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSubjectData.reasonStatus?.map((detail, index) => (
                      <tr key={detail.id}>
                        <td>{index + 1}.</td>
                        <td>
                          <span 
                            className="at-status-bubble at-subject-status"
                            style={{ backgroundColor: getStatusColor(detail.status) }}
                            title={getStatusText(detail.status)}
                          >
                            {detail.status}
                          </span>
                        </td>
                        <td className="at-topic-cell">{detail.topic}</td>
                        <td className="at-date-cell">{detail.date}</td>
                        <td className="at-teacher-cell">{detail.teacher}</td>
                        <td className="at-reason-cell">
                          {detail.reason || 
                           (detail.startDate && detail.endDate ? `Больничный с ${detail.startDate} по ${detail.endDate}` : 
                           detail.status === 'п' ? 'Присутствовал' : 'Не указана')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="at-no-subject-selected">
                <p>Выберите предмет для просмотра посещаемости</p>
              </div>
            )}
            <div className="at-attendance-stats">
              <div className="at-stat-card">
                <div className="at-stat-value-attendance">{calculateOverallAttendance()}%</div>
                <div className="at-stat-label-attendance">Общая посещаемость</div>
              </div>
              <div className="at-stat-card">
                <div className="at-stat-value-attendance">
                  2
                </div>
                <div className="at-stat-label-attendance">Количество пропусков по уважительной причине</div>
              </div>
              <div className="at-stat-card">
                <div className="at-stat-value-attendance">1</div>
                <div className="at-stat-label-attendance">Количество пропусков по неуважительной причине</div>
              </div>
            </div>
          </>
        ) : (
          renderStatisticsSection()
        )}
      </div>

      {/* Всплывающее окно с информацией о посещаемости */}
      {selectedAttendance && attendancePosition && (
        <>
          <div className="at-attendance-popup-overlay" onClick={closeAttendancePopup}></div>
          <div
            className="at-attendance-popup"
            style={{
              top: `${attendancePosition.top}px`,
              left: `${attendancePosition.left}px`
            }}
          >
            <div className="at-attendance-popup-header">
              <h4>Информация о посещаемости</h4>
              <button className="at-attendance-popup-close" onClick={closeAttendancePopup}>×</button>
            </div>
            <div className="at-attendance-popup-content">
              <div className="at-attendance-info-row">
                <span className="at-attendance-info-label">Дата:</span>
                <span className="at-attendance-info-value">{selectedAttendance.date}</span>
              </div>
              <div className="at-attendance-info-row">
                <span className="at-attendance-info-label">Тема:</span>
                <span className="at-attendance-info-value">{selectedAttendance.topic}</span>
              </div>
              <div className="at-attendance-info-row">
                <span className="at-attendance-info-label">Преподаватель:</span>
                <span className="at-attendance-info-value">{selectedAttendance.teacher}</span>
              </div>
              <div className="at-attendance-info-row">
                <span className="at-attendance-info-label">Статус:</span>
                <span 
                  className="at-status-value-bubble"
                  style={{ backgroundColor: getStatusColor(selectedAttendance.status) }}
                >
                  {selectedAttendance.status} - {getStatusText(selectedAttendance.status)}
                </span>
              </div>
              {selectedAttendance.reason && (
                <div className="at-attendance-info-row">
                  <span className="at-attendance-info-label">Причина:</span>
                  <span className="at-attendance-info-value">{selectedAttendance.reason}</span>
                </div>
              )}
              {selectedAttendance.startDate && selectedAttendance.endDate && (
                <div className="at-attendance-info-row">
                  <span className="at-attendance-info-label">Период больничного:</span>
                  <span className="at-attendance-info-value">с {selectedAttendance.startDate} по {selectedAttendance.endDate}</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};