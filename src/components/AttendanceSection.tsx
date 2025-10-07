import React, { useState, useRef, useEffect } from 'react';
import './AttendanceSectionStyle.css';

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

export const AttendanceSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'semesters' | 'subjects'>('semesters');
  const [selectedSemester, setSelectedSemester] = useState<'first' | 'second'>('first');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedAttendance, setSelectedAttendance] = useState<GradeDetail | null>(null);
  const [attendancePosition, setAttendancePosition] = useState<{ top: number; left: number } | null>(null);
  const [clickedAttendanceId, setClickedAttendanceId] = useState<number | null>(null);
  
  const attendanceRefs = useRef<Map<number, HTMLElement>>(new Map());

  // Данные по посещаемости
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
      case 'п': return '#2cbb00ff'; // зеленый
      case 'у': return '#f59e0b'; // оранжевый
      case 'б': return '#6b7280'; // серый
      case 'н': return '#ef4444'; // красный
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

  return (
    <div className="attendance-section">
      <div className="attendance-header">
        <div className="at-view-tabs">
          <button
            className={`at-view-tab ${activeTab === 'semesters' ? 'active' : ''}`}
            onClick={() => setActiveTab('semesters')}
          >
            По семестрам
          </button>
          <button
            className={`at-view-tab ${activeTab === 'subjects' ? 'active' : ''}`}
            onClick={() => setActiveTab('subjects')}
          >
            По предметам
          </button>
        </div>
        <button className="pf-statistic-btn">
          Статистика
        </button>
      </div>

      <div className="attendance-content">
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

            <div className="attendance-table-container">
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th>№</th>
                    <th>Предмет</th>
                    <th>Посещаемость</th>
                    <th>Количество пропусков</th>
                    <th>Процент посещаемости</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceData.map((subject, index) => {
                    const absences = calculateAbsences(subject.statuses);
                    return (
                      <tr key={subject.id}>
                        <td>{index + 1}.</td>
                        <td className="subject-name">{subject.subject}</td>
                        <td className="attendance-list">
                          <div className="attendance-scroll-container">
                            {subject.statuses.map((status, statusIndex) => (
                              <span
                                key={statusIndex}
                                className="status-bubble"
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
                        <td className="absences-cell">
                          <div className="absences-breakdown">
                            <div className="absence-type">
                              <span className="absence-dot excused"></span>
                              <span>У: {absences.excused}</span>
                            </div>
                            <div className="absence-type">
                              <span className="absence-dot sick"></span>
                              <span>Б: {absences.sick}</span>
                            </div>
                            <div className="absence-type">
                              <span className="absence-dot absent"></span>
                              <span>Н: {absences.absent}</span>
                            </div>
                            <div className="absence-total">
                              Всего: {absences.excused + absences.sick + absences.absent}
                            </div>
                          </div>
                        </td>
                        <td className="attendance-percent">
                          <span 
                            className="percent-bubble"
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
              <div className="subject-attendance-table-container">
                <table className="subject-attendance-table">
                  <thead>
                    <tr>
                      <th>№</th>
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
                            className="status-bubble subject-status"
                            style={{ backgroundColor: getStatusColor(detail.status) }}
                            title={getStatusText(detail.status)}
                          >
                            {detail.status}
                          </span>
                        </td>
                        <td className="topic-cell">{detail.topic}</td>
                        <td className="date-cell">{detail.date}</td>
                        <td className="teacher-cell">{detail.teacher}</td>
                        <td className="reason-cell">
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
              <div className="no-subject-selected">
                <p>Выберите предмет для просмотра посещаемости</p>
              </div>
            )}
            <div className="attendance-stats">
              <div className="stat-card">
                <div className="stat-value-attendance">{calculateOverallAttendance()}%</div>
                <div className="stat-label-attendance">Общая посещаемость</div>
              </div>
              <div className="stat-card">
                <div className="stat-value-attendance">
                  2
                </div>
                <div className="stat-label-attendance">Количество пропусков по уважительной причине</div>
              </div>
              <div className="stat-card">
                <div className="stat-value-attendance">1</div>
                <div className="stat-label-attendance">Количество пропусков по неуважительной причине</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Всплывающее окно с информацией о посещаемости */}
      {selectedAttendance && attendancePosition && (
        <>
          <div className="attendance-popup-overlay" onClick={closeAttendancePopup}></div>
          <div
            className="attendance-popup"
            style={{
              top: `${attendancePosition.top}px`,
              left: `${attendancePosition.left}px`
            }}
          >
            <div className="attendance-popup-header">
              <h4>Информация о посещаемости</h4>
              <button className="attendance-popup-close" onClick={closeAttendancePopup}>×</button>
            </div>
            <div className="attendance-popup-content">
              <div className="attendance-info-row">
                <span className="attendance-info-label">Дата:</span>
                <span className="attendance-info-value">{selectedAttendance.date}</span>
              </div>
              <div className="attendance-info-row">
                <span className="attendance-info-label">Тема:</span>
                <span className="attendance-info-value">{selectedAttendance.topic}</span>
              </div>
              <div className="attendance-info-row">
                <span className="attendance-info-label">Преподаватель:</span>
                <span className="attendance-info-value">{selectedAttendance.teacher}</span>
              </div>
              <div className="attendance-info-row">
                <span className="attendance-info-label">Статус:</span>
                <span 
                  className="status-value-bubble"
                  style={{ backgroundColor: getStatusColor(selectedAttendance.status) }}
                >
                  {selectedAttendance.status} - {getStatusText(selectedAttendance.status)}
                </span>
              </div>
              {selectedAttendance.reason && (
                <div className="attendance-info-row">
                  <span className="attendance-info-label">Причина:</span>
                  <span className="attendance-info-value">{selectedAttendance.reason}</span>
                </div>
              )}
              {selectedAttendance.startDate && selectedAttendance.endDate && (
                <div className="attendance-info-row">
                  <span className="attendance-info-label">Период больничного:</span>
                  <span className="attendance-info-value">с {selectedAttendance.startDate} по {selectedAttendance.endDate}</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};