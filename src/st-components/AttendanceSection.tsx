import React, { useState, useRef, useEffect } from 'react';
import './AttendanceSectionStyle.css';
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

export interface Attendance {
  id: number;
  subject: string;
  statuses: ('п' | 'у' | 'б' | 'н')[];
  quantity: number;
  percent: number;
  teacher: string;
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

interface PerformanceSectionProps {
  studentId: number;
}

export const AttendanceSection: React.FC<PerformanceSectionProps> = ({ 
  studentId 
}) => {
  const [activeTab, setActiveTab] = useState<'semesters' | 'subjects' | 'analytics'>('semesters');
  const [selectedSemester, setSelectedSemester] = useState<'first' | 'second'>('first');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedAttendance, setSelectedAttendance] = useState<{subject: string, status: 'п' | 'у' | 'б' | 'н', number: number, topic: string, teacher: string, reason?: string, startDate?: string, endDate?: string} | null>(null);
  const [attendanceData, setAttendanceData] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Загрузка данных посещаемости
  useEffect(() => {
    const fetchAttendanceData = async () => {
      try {
        setLoading(true);
        // Временные данные вместо API
        const data: Attendance[] = [
          {
            id: 1,
            subject: 'Разработка программных модулей',
            teacher: 'Цымбалюк Л.Н.',
            statuses: ['п', 'п', 'у', 'п', 'п', 'н', 'п', 'п', 'б', 'п'],
            quantity: 10,
            percent: 80,
            reasonStatus: [
              { id: 1, date: '13.09.2024', topic: 'Введение', status: 'п', teacher: 'Иванова А.С.' },
              { id: 2, date: '20.09.2024', topic: 'Синтаксис', status: 'п', teacher: 'Иванова А.С.' },
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
            subject: 'Внедрение и поддержка компьютерных систем',
            teacher: 'Богданов М.М.',
            statuses: ['п', 'п', 'п', 'п', 'п', 'п', 'п', 'п', 'п', 'п'],
            quantity: 10,
            percent: 100,
            reasonStatus: [
              { id: 1, date: '14.09.2024', topic: 'Алгебра', status: 'п', teacher: 'Сидоров В.П.' },
              { id: 2, date: '21.09.2024', topic: 'Геометрия', status: 'п', teacher: 'Сидоров В.П.' },
              { id: 3, date: '28.09.2024', topic: 'Тригонометрия', status: 'п', teacher: 'Сидоров В.П.' },
            ]
          },
          {
            id: 3,
            subject: 'Поддержка и тестирование программных модулей',
            teacher: 'Андреев А.И.',
            statuses: ['п', 'п', 'п', 'у', 'п', 'п', 'п', 'п', 'п', 'п'],
            quantity: 10,
            percent: 90,
            reasonStatus: [
              { id: 1, date: '16.09.2024', topic: 'JavaScript', status: 'п', teacher: 'Козлов Д.А.' },
              { id: 2, date: '23.09.2024', topic: 'React', status: 'п', teacher: 'Козлов Д.А.' },
              { id: 3, date: '30.09.2024', topic: 'API', status: 'п', teacher: 'Козлов Д.А.' },
              { id: 4, date: '07.10.2024', topic: 'TypeScript', status: 'у', teacher: 'Козлов Д.А.', reason: 'Выезд на соревнования' },
            ]
          },
          {
            id: 4,
            subject: 'Системное программирование',
            teacher: 'Иванов А.',
            statuses: ['п', 'п', 'н', 'п', 'у', 'п', 'п', 'н', 'п', 'п'],
            quantity: 10,
            percent: 70,
            reasonStatus: [
              { id: 1, date: '17.09.2024', topic: 'SQL', status: 'п', teacher: 'Николаев С.В.' },
              { id: 2, date: '24.09.2024', topic: 'Нормализация', status: 'п', teacher: 'Николаев С.В.' },
              { id: 3, date: '01.10.2024', topic: 'Транзакции', status: 'н', teacher: 'Николаев С.В.' },
              { id: 4, date: '08.10.2024', topic: 'Оптимизация', status: 'п', teacher: 'Николаев С.В.' },
              { id: 5, date: '15.10.2024', topic: 'Индексы', status: 'у', teacher: 'Николаев С.В.', reason: 'Посещение врача' },
            ]
          }
        ];
        setAttendanceData(data);
      } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendanceData();
  }, [studentId]);

  const handleAttendanceClick = (subject: string, status: 'п' | 'у' | 'б' | 'н', number: number, topic: string, teacher: string, reason?: string, startDate?: string, endDate?: string) => {
    setSelectedAttendance({ subject, status, number, topic, teacher, reason, startDate, endDate });
  };

  const closeAttendancePopup = () => {
    setSelectedAttendance(null);
  };

  const subjects = attendanceData.map(attendance => attendance.subject);

  // Статистика
  const calculateAttendanceStatistics = () => {
    let totalPresent = 0;
    let totalExcused = 0;
    let totalSick = 0;
    let totalAbsent = 0;
    let totalLessons = 0;

    attendanceData.forEach(subject => {
      const stats = calculateSubjectStats(subject.statuses);
      totalPresent += stats.present;
      totalExcused += stats.excused;
      totalSick += stats.sick;
      totalAbsent += stats.absent;
      totalLessons += subject.statuses.length;
    });

    const totalAbsences = totalExcused + totalSick + totalAbsent;
    const overallPercent = totalLessons > 0 ? ((totalPresent / totalLessons) * 100) : 0;

    return {
      totalPresent,
      totalExcused,
      totalSick,
      totalAbsent,
      totalLessons,
      totalAbsences,
      overallPercent: parseFloat(overallPercent.toFixed(1))
    };
  };

  const calculateSubjectStats = (statuses: ('п' | 'у' | 'б' | 'н')[]) => {
    const present = statuses.filter(status => status === 'п').length;
    const excused = statuses.filter(status => status === 'у').length;
    const sick = statuses.filter(status => status === 'б').length;
    const absent = statuses.filter(status => status === 'н').length;
    
    return { present, excused, sick, absent };
  };

  const getStatusColor = (status: 'п' | 'у' | 'б' | 'н') => {
    switch (status) {
      case 'п': return '#2cbb00';
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
    { subject: 'Больничные', count: statistics.totalSick, color: '#6b7280' },
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

  // Компоненты
  const SemesterSelector = () => (
    <div className="at-semester-selector">
      <div className="at-semester-buttons">
        <button
          className={`at-semester-btn ${selectedSemester === 'first' ? 'active' : ''}`}
          onClick={() => setSelectedSemester('first')}
        >
          1 семестр
        </button>
        <button
          className={`at-semester-btn ${selectedSemester === 'second' ? 'active' : ''}`}
          onClick={() => setSelectedSemester('second')}
        >
          2 семестр
        </button>
      </div>
    </div>
  );

  const ViewToggle = () => (
    <div className="at-view-toggle">
      <button
        className={`at-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
        onClick={() => setViewMode('grid')}
      >
        Сетка
      </button>
      <button
        className={`at-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
        onClick={() => setViewMode('list')}
      >
        Список
      </button>
    </div>
  );

  // Рендер карточек предметов
  const renderSubjectCards = () => (
    <div className="at-subjects-grid">
      {attendanceData.map((subject) => (
        <div key={subject.id} className="at-subject-card">
          <div className="at-card-header">
            <h3 className="at-subject-title">{subject.subject}</h3>
            <div className="at-teacher-badge">
              {subject.teacher}
            </div>
          </div>
          
          <div className="at-attendance-preview">
            {subject.statuses.slice(0, 8).map((status, index) => (
              <div
                key={index}
                className="at-preview-status"
                style={{ backgroundColor: getStatusColor(status) }}
                onClick={() => handleAttendanceClick(
                  subject.subject,
                  status,
                  index + 1,
                  subject.reasonStatus?.[index]?.topic || `Занятие ${index + 1}`,
                  subject.teacher,
                  subject.reasonStatus?.[index]?.reason,
                  subject.reasonStatus?.[index]?.startDate,
                  subject.reasonStatus?.[index]?.endDate
                )}
                title={getStatusText(status)}
              >
                {status}
              </div>
            ))}
            {subject.statuses.length > 8 && (
              <div className="at-more-statuses">+{subject.statuses.length - 8}</div>
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
            <div className="at-lessons-count">
              {subject.statuses.length} занятий
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // Рендер таблицы предметов
  const renderSubjectsTable = () => {
    const calculateAbsencesStats = (statuses: ('п' | 'у' | 'б' | 'н')[]) => {
      const stats = calculateSubjectStats(statuses);
      return {
        present: stats.present,
        excused: stats.excused,
        sick: stats.sick,
        absent: stats.absent,
        totalAbsences: stats.excused + stats.sick + stats.absent
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
                <tr key={subject.id}>
                  <td className="at-subject-cell">
                    <div className="at-subject-info">
                      <span className="at-subject-name">{subject.subject}</span>
                    </div>
                  </td>
                  <td className="at-attendance-cell">
                    <div className="at-attendance-stack">
                      {subject.statuses.slice(0, 16).map((status, index) => (
                        <span
                          key={index}
                          className="at-stack-status"
                          style={{ backgroundColor: getStatusColor(status) }}
                          onClick={() => handleAttendanceClick(
                            subject.subject,
                            status,
                            index + 1,
                            subject.reasonStatus?.[index]?.topic || `Занятие ${index + 1}`,
                            subject.teacher,
                            subject.reasonStatus?.[index]?.reason,
                            subject.reasonStatus?.[index]?.startDate,
                            subject.reasonStatus?.[index]?.endDate
                          )}
                          title={`${getStatusText(status)} - Занятие ${index + 1}`}
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
                        <span className="at-absence-count">У: {stats.excused}</span>
                      </div>
                      <div className="at-absence-type">
                        <span className="at-absence-dot at-sick"></span>
                        <span className="at-absence-count">Б: {stats.sick}</span>
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

  // Рендер аналитики
  const renderAnalytics = () => (
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
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {attendanceChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="at-chart-card at-large">
          <h3>Динамика посещаемости</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="week" />
              <YAxis domain={[60, 100]} />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="attendance" 
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
      <div className="at-loading">
        <div className="at-loading-spinner"></div>
        <p>Загрузка данных о посещаемости...</p>
      </div>
    );
  }

  return (
    <div className="at-attendance-section">
      {/* Навигация */}
      <div className="at-nav">
        <button
          className={`at-nav-btn ${activeTab === 'semesters' ? 'active' : ''}`}
          onClick={() => setActiveTab('semesters')}
        >
          По семестрам
        </button>
        <button
          className={`at-nav-btn ${activeTab === 'subjects' ? 'active' : ''}`}
          onClick={() => setActiveTab('subjects')}
        >
          По предметам
        </button>
        <button
          className={`at-nav-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          Аналитика
        </button>
      </div>

      {/* Контролы */}
      <div className="at-controls-section">
        <SemesterSelector />
        <ViewToggle />
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
                    {selectedSubjectData.reasonStatus?.map((detail) => (
                      <div key={detail.id} className="at-timeline-item">
                        <div className="at-timeline-marker"></div>
                        <div className="at-timeline-content">
                          <div className="at-attendance-header">
                            <span className="at-attendance-topic">{detail.topic}</span>
                            <span className="at-attendance-date">{detail.date}</span>
                          </div>
                          <div className="at-attendance-details">
                            <span 
                              className="at-attendance-value"
                              style={{ 
                                backgroundColor: getStatusColor(detail.status)
                              }}
                              onClick={() => handleAttendanceClick(
                                selectedSubjectData.subject,
                                detail.status,
                                detail.id,
                                detail.topic,
                                detail.teacher,
                                detail.reason,
                                detail.startDate,
                                detail.endDate
                              )}
                            >
                              {detail.status}
                            </span>
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
          <div className="at-popup" onClick={(e) => e.stopPropagation()}>
            <div className="at-popup-header">
              <h3>Информация о посещаемости</h3>
              <button className="at-popup-close" onClick={closeAttendancePopup}>
                <span>×</span>
              </button>
            </div>
            <div className="at-popup-content">
              <div className="at-attendance-info-minimal">
                <div 
                  className="at-status-circle-minimal"
                  style={{ 
                    backgroundColor: getStatusColor(selectedAttendance.status),
                    borderColor: getStatusColor(selectedAttendance.status)
                  }}
                >
                  <span className="at-status-symbol-minimal">
                    {selectedAttendance.status}
                  </span>
                </div>
                <div className="at-attendance-details-minimal">
                  <div className="at-detail-item">
                    <span className="at-detail-label">Предмет</span>
                    <span className="at-detail-value">{selectedAttendance.subject}</span>
                  </div>
                  <div className="at-detail-item">
                    <span className="at-detail-label">Тема занятия</span>
                    <span className="at-detail-value">{selectedAttendance.topic}</span>
                  </div>
                  <div className="at-detail-item">
                    <span className="at-detail-label">Дата</span>
                    <span className="at-detail-value">{selectedSubjectData?.reasonStatus?.[selectedAttendance.number - 1]?.date || 'Не указана'}</span>
                  </div>
                  <div className="at-detail-item">
                    <span className="at-detail-label">Статус</span>
                    <span className="at-detail-value at-status-text">{getStatusText(selectedAttendance.status)}</span>
                  </div>
                  <div className="at-detail-item">
                    <span className="at-detail-label">Преподаватель</span>
                    <span className="at-detail-value at-teacher">{selectedAttendance.teacher}</span>
                  </div>
                  {selectedAttendance.reason && (
                    <div className="at-detail-item">
                      <span className="at-detail-label">Причина</span>
                      <span className="at-detail-value">{selectedAttendance.reason}</span>
                    </div>
                  )}
                  {selectedAttendance.startDate && selectedAttendance.endDate && (
                    <div className="at-detail-item">
                      <span className="at-detail-label">Период больничного</span>
                      <span className="at-detail-value">с {selectedAttendance.startDate} по {selectedAttendance.endDate}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};