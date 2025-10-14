import React, { useState, useEffect, useRef } from 'react';
import './TeacherAttendanceSection.css';

// Типы данных
export interface Student {
  id: number;
  lastName: string;
  firstName: string;
  middleName: string;
  subgroup?: 'I' | 'II';
}

export interface AttendanceRecord {
  id: number;
  studentId: number;
  date: string;
  status: 'п' | 'у' | 'б' | 'н' | '';
  reason?: string;
  sickStartDate?: string;
  sickEndDate?: string;
}

export interface TeacherAttendanceSectionProps {
  groupNumber: string;
  subject: string;
  students: Student[];
  onBackToGroups?: () => void;
  onSetGrades?: () => void;
}

export const TeacherAttendanceSection: React.FC<TeacherAttendanceSectionProps> = ({
  groupNumber,
  subject,
  students,
  onBackToGroups,
  onSetGrades
}) => {
  const [selectedSubgroup, setSelectedSubgroup] = useState<string>('all');
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [allDates, setAllDates] = useState<string[]>([]);
  const [editingCell, setEditingCell] = useState<{studentId: number, date: string, type: 'date' | 'status'} | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showReasonModal, setShowReasonModal] = useState<{studentId: number, date: string} | null>(null);
  const [reasonText, setReasonText] = useState('');
  const [showSickModal, setShowSickModal] = useState<{studentId: number, date: string} | null>(null);
  const [sickStartDate, setSickStartDate] = useState('');
  const [sickEndDate, setSickEndDate] = useState('');
  const [studentSubgroups, setStudentSubgroups] = useState<Record<number, 'I' | 'II' | undefined>>({});
  const [dateRange, setDateRange] = useState<{start: string; end: string}>({
    start: '',
    end: ''
  });

  const inputRef = useRef<HTMLInputElement>(null);

  // Функция для получения цвета процента
  const getPercentColor = (percent: number) => {
    if (percent >= 90) return '#2cbb00';
    if (percent >= 75) return '#a5db28';
    if (percent >= 60) return '#f59e0b';
    return '#ef4444';
  };

  // Функция для получения класса статуса
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'п': return 'status-present';
      case 'у': return 'status-absent';
      case 'б': return 'status-sick';
      case 'н': return 'status-not';
      default: return 'status-empty';
    }
  };

    // Вспомогательная функция для парсинга дат
    const parseDate = (dateStr: string): number => {
    if (!dateStr) return 0;
    
    if (dateStr.includes('.')) {
      // Формат DD.MM
      const [day, month] = dateStr.split('.');
      return new Date(new Date().getFullYear(), parseInt(month) - 1, parseInt(day)).getTime();
    } else {
      // Формат YYYY-MM-DD
      return new Date(dateStr).getTime();
    }
  };
  
    // Фильтрация студентов по подгруппе
    const filteredStudents = students.filter(student => {
      if (selectedSubgroup === 'all') return true;
      return studentSubgroups[student.id] === selectedSubgroup;
    });

    // Фильтрация дат по выбранному диапазону
    const filteredDates = allDates.filter(date => {
    if (!dateRange.start && !dateRange.end) return true;
    
    const currentDate = parseDate(date);
    const startDate = parseDate(dateRange.start);
    const endDate = parseDate(dateRange.end);
    
    if (startDate && endDate) {
      return currentDate >= startDate && currentDate <= endDate;
    } else if (startDate) {
      return currentDate >= startDate;
    } else if (endDate) {
      return currentDate <= endDate;
    }
  
    return true;
  });

  // Инициализация дат и подгрупп
  useEffect(() => {
    const initialDates = [
      '04.09', '11.09', '18.09', '25.09', '02.10',
      '05.02', '12.02', '19.02', '26.02', '05.03'
    ];
    
    setAllDates(initialDates);

    // Инициализация записей посещаемости
    const initialRecords: AttendanceRecord[] = [];
    
    students.forEach(student => {
      initialDates.forEach(date => {
        initialRecords.push({
          id: Date.now() + Math.random(),
          studentId: student.id,
          date: date,
          status: ''
        });
      });
    });
    
    setAttendanceRecords(initialRecords);

    // Инициализация подгрупп студентов
    const initialSubgroups: Record<number, 'I' | 'II' | undefined> = {};
    students.forEach(student => {
      initialSubgroups[student.id] = student.subgroup;
    });
    setStudentSubgroups(initialSubgroups);

    // Установка начального диапазона дат (все даты)
    if (initialDates.length > 0) {
      setDateRange({
        start: '',
        end: ''
      });
    }
  }, [students]);

  // Обработка нажатий клавиш для навигации по таблице
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!editingCell || editingCell.type !== 'status') return;

      const currentStudentIndex = filteredStudents.findIndex(s => s.id === editingCell.studentId);
      const currentDateIndex = filteredDates.findIndex(d => d === editingCell.date);
      
      let newStudentIndex = currentStudentIndex;
      let newDateIndex = currentDateIndex;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          newStudentIndex = Math.max(0, currentStudentIndex - 1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          newStudentIndex = Math.min(filteredStudents.length - 1, currentStudentIndex + 1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          newDateIndex = Math.max(0, currentDateIndex - 1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          newDateIndex = Math.min(filteredDates.length - 1, currentDateIndex + 1);
          break;
        case 'Tab':
          e.preventDefault();
          if (e.shiftKey) {
            // Shift+Tab - двигаемся назад
            if (currentDateIndex > 0) {
              newDateIndex = currentDateIndex - 1;
            } else if (currentStudentIndex > 0) {
              newStudentIndex = currentStudentIndex - 1;
              newDateIndex = filteredDates.length - 1;
            }
          } else {
            // Tab - двигаемся вперед
            if (currentDateIndex < filteredDates.length - 1) {
              newDateIndex = currentDateIndex + 1;
            } else if (currentStudentIndex < filteredStudents.length - 1) {
              newStudentIndex = currentStudentIndex + 1;
              newDateIndex = 0;
            }
          }
          break;
        default:
          return;
      }

      // Если позиция изменилась, переходим к новой ячейке
      if (newStudentIndex !== currentStudentIndex || newDateIndex !== currentDateIndex) {
        const newStudent = filteredStudents[newStudentIndex];
        const newDate = filteredDates[newDateIndex];
        
        if (newStudent && newDate) {
          const record = getAttendanceRecord(newStudent.id, newDate);
          setEditingCell({ 
            studentId: newStudent.id, 
            date: newDate, 
            type: 'status' 
          });
          setEditValue(record.status);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editingCell, filteredStudents, filteredDates]);

  // Фокус на input при редактировании
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingCell]);

  // Получение записи посещаемости для студента и даты
  const getAttendanceRecord = (studentId: number, date: string): AttendanceRecord => {
    return attendanceRecords.find(record => 
      record.studentId === studentId && record.date === date
    ) || {
      id: Date.now() + Math.random(),
      studentId,
      date,
      status: ''
    };
  };

  // Обновление записи посещаемости
  const updateAttendanceRecord = (studentId: number, date: string, updates: Partial<AttendanceRecord>) => {
    setAttendanceRecords(prev => {
      const existingIndex = prev.findIndex(record => 
        record.studentId === studentId && record.date === date
      );
      
      if (existingIndex >= 0) {
        const newRecords = [...prev];
        newRecords[existingIndex] = { ...newRecords[existingIndex], ...updates };
        return newRecords;
      } else {
        return [...prev, {
          id: Date.now() + Math.random(),
          studentId,
          date,
          status: '',
          ...updates
        }];
      }
    });
  };

  // Обновление подгруппы студента
  const updateStudentSubgroup = (studentId: number, subgroup: 'I' | 'II' | undefined) => {
    setStudentSubgroups(prev => ({
      ...prev,
      [studentId]: subgroup
    }));
  };

  // Начало редактирования ячейки
  const handleCellClick = (studentId: number, date: string, type: 'date' | 'status', currentValue: string) => {
    setEditingCell({ studentId, date, type });
    setEditValue(currentValue);
  };

  // Сохранение редактирования
  const handleSaveEdit = () => {
    if (!editingCell) return;

    if (editingCell.type === 'date') {
      // Валидация формата даты
      const dateRegex = /^(0[1-9]|[12][0-9]|3[01])\.(0[1-9]|1[0-2])$/;
      if (dateRegex.test(editValue)) {
        // Обновляем дату во всех записях для этого студента
        const oldDate = editingCell.date;
        
        setAttendanceRecords(prev => 
          prev.map(record => 
            record.studentId === editingCell.studentId && record.date === oldDate
              ? { ...record, date: editValue }
              : record
          )
        );
        
        // Обновляем массив дат
        setAllDates(prev => {
          const newDates = [...prev];
          const index = newDates.indexOf(oldDate);
          if (index >= 0) {
            newDates[index] = editValue;
          }
          return newDates;
        });
      }
      setEditingCell(null);
      setEditValue('');
    } else if (editingCell.type === 'status') {
        const lowerCaseValue = editValue.toLowerCase();

        const isValidStatus = (value: string): value is 'п' | 'у' | 'б' | 'н' | '' => {
            return ['п', 'у', 'б', 'н', ''].includes(value);
        };
        
        if (isValidStatus(lowerCaseValue)) {
            const status = lowerCaseValue;
            const currentRecord = getAttendanceRecord(editingCell.studentId, editingCell.date);
            
            if (status === 'у') {
              setShowReasonModal({ 
                studentId: editingCell.studentId, 
                date: editingCell.date
              });
              setReasonText(currentRecord.reason || '');
            } else if (status === 'б') {
              setShowSickModal({ 
                studentId: editingCell.studentId, 
                date: editingCell.date
              });
              setSickStartDate(currentRecord.sickStartDate || '');
              setSickEndDate(currentRecord.sickEndDate || '');
            } else if (status === 'п' || status === 'н' || status === '') {
              updateAttendanceRecord(
                editingCell.studentId, 
                editingCell.date, 
                { 
                  status,
                  reason: undefined,
                  sickStartDate: undefined,
                  sickEndDate: undefined
                }
              );
            }
        }
    }
  };

  // Отмена редактирования
  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // Обработка нажатия клавиш
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  // Сохранение причины отсутствия
  const handleSaveReason = () => {
    if (showReasonModal) {
      updateAttendanceRecord(
        showReasonModal.studentId, 
        showReasonModal.date, 
        { 
          status: 'у',
          reason: reasonText 
        }
      );
      setShowReasonModal(null);
      setReasonText('');
    }
  };

  // Сохранение периода больничного
  const handleSaveSickPeriod = () => {
    if (showSickModal) {
      updateAttendanceRecord(
        showSickModal.studentId, 
        showSickModal.date, 
        { 
          status: 'б',
          sickStartDate,
          sickEndDate
        }
      );
      setShowSickModal(null);
      setSickStartDate('');
      setSickEndDate('');
    }
  };

  // Добавление новой даты
  const handleAddDate = () => {
    const newDate = 'Новая дата';
    
    setAllDates(prev => [...prev, newDate]);
    
    // Добавляем записи для всех студентов
    const newRecords: AttendanceRecord[] = students.map(student => ({
      id: Date.now() + Math.random(),
      studentId: student.id,
      date: newDate,
      status: ''
    }));
    
    setAttendanceRecords(prev => [...prev, ...newRecords]);
    
    // Начинаем редактирование первой ячейки новой даты
    if (students.length > 0) {
      setEditingCell({ 
        studentId: students[0].id, 
        date: newDate, 
        type: 'date' 
      });
      setEditValue(newDate);
    }
  };

  // Расчет процента посещаемости для студента в выбранном диапазоне дат
  const calculateAttendancePercentage = (studentId: number): number => {
    const studentRecords = attendanceRecords.filter(record => 
      record.studentId === studentId && filteredDates.includes(record.date)
    );
    
    if (studentRecords.length === 0) return 0;
    
    const presentCount = studentRecords.filter(record => 
      record.status === 'п'
    ).length;
    
    return (presentCount / studentRecords.length) * 100;
  };

  // Расчет общего процента посещаемости группы в выбранном диапазоне дат
  const calculateGroupAttendancePercentage = (): number => {
    if (filteredStudents.length === 0) return 0;
    
    const totalPercentage = filteredStudents.reduce((sum, student) => {
      return sum + calculateAttendancePercentage(student.id);
    }, 0);
    
    return totalPercentage / filteredStudents.length;
  };

    const calculateTotalAttendancePercentage = (studentId: number): number => {
    const studentRecords = attendanceRecords.filter(record => 
      record.studentId === studentId
    );
    
    if (studentRecords.length === 0) return 0;
    
    const presentCount = studentRecords.filter(record => 
      record.status === 'п'
    ).length;
    
    return (presentCount / studentRecords.length) * 100;
  };

  const calculateTotalGroupAttendancePercentage = (): number => {
    if (filteredStudents.length === 0) return 0;
    
    const totalPercentage = filteredStudents.reduce((sum, student) => {
      return sum + calculateTotalAttendancePercentage(student.id);
    }, 0);
    
    return totalPercentage / filteredStudents.length;
  };

  // Обработчик клика по кнопке "Выставить оценки"
  const handleSetGrades = () => {
    if (onSetGrades) {
      onSetGrades();
    }
  };

  // Рендер таблицы
  const renderTable = () => {
    return (
      <div className="attendance-table-wrapper">
        <table className="attendance-table">
          <thead>
            <tr>
              {/* Фиксированные колонки слева */}
              <th className="column-number sticky-col">№</th>
              <th className="column-name sticky-col">ФИО</th>
              <th className="column-subgroup sticky-col">Подгруппа</th>
              
              {/* Динамические колонки с датами */}
              {filteredDates.map((date, index) => (
                <th 
                  key={index}
                  className="column-date"
                  onDoubleClick={() => {
                    if (students.length > 0) {
                      setEditingCell({ 
                        studentId: students[0].id, 
                        date, 
                        type: 'date' 
                      });
                      setEditValue(date);
                    }
                  }}
                >
                  {date}
                </th>
              ))}
              
              {/* Кнопка добавления даты */}
              <th className="column-add-date">
                <button 
                  className="add-date-btn" 
                  onClick={handleAddDate}
                  title="Добавить дату"
                >
                  +
                </button>
              </th>
              
              {/* Фиксированные колонки справа */}
              <th className="column-percentage sticky-col-right"></th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student, studentIndex) => {
              const attendancePercentage = calculateAttendancePercentage(student.id);
              
              return (
                <tr key={student.id}>
                  {/* Фиксированные ячейки слева */}
                  <td className="column-number sticky-col">
                    <div className="cell-number">{studentIndex + 1}</div>
                  </td>
                  <td className="column-name sticky-col">
                    <div className="cell-name">
                      {student.lastName} {student.firstName} {student.middleName}
                    </div>
                  </td>
                  <td className="column-subgroup sticky-col">
                    <div className="cell-subgroup">
                      <select 
                        value={studentSubgroups[student.id] || ''}
                        onChange={(e) => updateStudentSubgroup(student.id, e.target.value as 'I' | 'II' | undefined)}
                        className="subgroup-select">
                        <option value="">-</option>
                        <option value="I">I</option>
                        <option value="II">II</option>
                      </select>
                    </div>
                  </td>
                  
                  {/* Ячейки с посещаемостью по датам */}
                  {filteredDates.map((date, dateIndex) => {
                    const record = getAttendanceRecord(student.id, date);
                    const isEditing = editingCell?.studentId === student.id && 
                                    editingCell?.date === date;
                    
                    return (
                      <td 
                        key={dateIndex}
                        className="column-date"
                      >
                        <div 
                          className={`cell-status-container ${isEditing ? 'editing' : ''}`}
                          onClick={() => handleCellClick(student.id, date, 'status', record.status)}
                        >
                          {isEditing && editingCell?.type === 'status' ? (
                            <div className="status-input-container">
                              <input
                                ref={inputRef}
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={handleSaveEdit}
                                onKeyPress={handleKeyPress}
                                maxLength={1}
                                className="status-input"
                                placeholder="п/у/б/н"
                              />
                            </div>
                          ) : isEditing && editingCell?.type === 'date' ? (
                            <div className="date-input-container">
                              <input
                                ref={inputRef}
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={handleSaveEdit}
                                onKeyPress={handleKeyPress}
                                maxLength={5}
                                className="date-input"
                                placeholder="дд.мм"
                              />
                            </div>
                          ) : (
                            <div className={`cell-status ${getStatusClass(record.status)}`}>
                              {record.status || '+'}
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  
                {/* Ячейка добавления даты */}
                <td className="column-add-date">
                  <div className="cell-add-date"></div>
                </td>
                
                {/* Фиксированная ячейка справа - процент посещаемости */}
                <td className="column-percentage sticky-col-right">
                  <div 
                    className="cell-percentage"
                    style={{ 
                      backgroundColor: getPercentColor(attendancePercentage),
                      color: 'white'
                    }}
                  >
                    {attendancePercentage.toFixed(1)}%
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

  return (
    <div className="teacher-attendance-section">
      {/* Заголовок */}
      <div className="attendance-header">
        <div className="attendance-title-container">
          <div className="attendance-title">
            <div className="group-title">
              Посещаемость {groupNumber}
            </div>
            <div className="subject-full-title">
              {subject}
            </div>
          </div>
          <div className="attendance-actions">
            {onBackToGroups && (
              <button className="back-button" onClick={onBackToGroups}>
                <img 
                  src="/th-icons/arrow_icon.svg" 
                  alt="Назад" 
                />
              </button>
            )}
            <button className="gradient-btn set-grades-btn" onClick={handleSetGrades}>
              Выставить оценки
            </button>
          </div>
        </div>
      </div>

      {/* Фильтры */}
      <div className="attendance-filters">
        <div className="date-range-filter">
          <div className="date-range-group">
            <span className="date-range-label">Посмотреть посещаемость с</span>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({...prev, start: e.target.value}))}
              className="date-range-input"
            />
          </div>
          <div className="date-range-group">
            <span className="date-range-label">по</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({...prev, end: e.target.value}))}
              className="date-range-input"
            />
          </div>
        </div>

        <div className="subgroup-filter">
          <div className="filter-group">
            <select 
              value={selectedSubgroup} 
              onChange={(e) => setSelectedSubgroup(e.target.value)}
              className="filter-select"
            >
              <option value="all">Все подгруппы</option>
              <option value="I">I подгруппа</option>
              <option value="II">II подгруппа</option>
            </select>
          </div>
        </div>
      </div>

      {/* Таблица посещаемости */}
      <div className="attendance-table-container">
        {renderTable()}
        
        {/* Общий процент посещаемости группы */}
        <div className="group-attendance-footer">
          <div className="group-attendance-percentage">
            <div className="percentage-label">Общая посещаемость группы</div>
            <div 
              className="percentage-circle"
              style={{
                '--percentage': `${calculateGroupAttendancePercentage()}%`,
                '--percentage-color': getPercentColor(calculateGroupAttendancePercentage())
              } as React.CSSProperties}
            >
              <div className="percentage-value">
                {calculateGroupAttendancePercentage().toFixed(0)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Модальные окна */}
      {showReasonModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Причина отсутствия</h3>
            <textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="Введите причину отсутствия..."
              rows={4}
            />
            <div className="modal-actions">
              <button className="gradient-btn" onClick={handleSaveReason}>
                Сохранить
              </button>
              <button className="cancel-btn" onClick={() => setShowReasonModal(null)}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {showSickModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Период больничного</h3>
            <div className="date-inputs">
              <div className="date-input-group">
                <label>Начало:</label>
                <input
                  type="date"
                  value={sickStartDate}
                  onChange={(e) => setSickStartDate(e.target.value)}
                />
              </div>
              <div className="date-input-group">
                <label>Конец:</label>
                <input
                  type="date"
                  value={sickEndDate}
                  onChange={(e) => setSickEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="gradient-btn" onClick={handleSaveSickPeriod}>
                Сохранить
              </button>
              <button className="cancel-btn" onClick={() => setShowSickModal(null)}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};