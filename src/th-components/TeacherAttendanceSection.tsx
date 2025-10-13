import React, { useState, useEffect, useRef } from 'react';
import './TeacherAttendanceSection.css';

// Типы данных
export interface Student {
  id: number;
  lastName: string;
  firstName: string;
  middleName: string;
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
  currentSemester: 1 | 2;
  onBackToGroups?: () => void;
}

export const TeacherAttendanceSection: React.FC<TeacherAttendanceSectionProps> = ({
  groupNumber,
  subject,
  students,
  currentSemester,
  onBackToGroups
}) => {
  const [selectedSemester, setSelectedSemester] = useState<1 | 2>(1);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [editingCell, setEditingCell] = useState<{studentId: number, date: string, type: 'date' | 'status'} | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showReasonModal, setShowReasonModal] = useState<{studentId: number, date: string} | null>(null);
  const [reasonText, setReasonText] = useState('');
  const [showSickModal, setShowSickModal] = useState<{studentId: number, date: string} | null>(null);
  const [sickStartDate, setSickStartDate] = useState('');
  const [sickEndDate, setSickEndDate] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  // Инициализация дат (пример)
  useEffect(() => {
    const initialDates = ['04.09'];
    setDates(initialDates);
    
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
  }, [students]);

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
        setDates(prev => {
          const newDates = [...prev];
          const index = newDates.indexOf(oldDate);
          if (index >= 0) {
            newDates[index] = editValue;
          }
          return newDates;
        });
      }
    } else if (editingCell.type === 'status') {
        const lowerCaseValue = editValue.toLowerCase();

        const isValidStatus = (value: string): value is 'п' | 'у' | 'б' | 'н' | '' => {
            return ['п', 'у', 'б', 'н', ''].includes(value);
        };
        
        if (isValidStatus(lowerCaseValue)) {
            const status = lowerCaseValue;
            const currentRecord = getAttendanceRecord(editingCell.studentId, editingCell.date);
            
            // Явно проверяем каждый возможный статус
            if (status === 'у') {
            setShowReasonModal({ studentId: editingCell.studentId, date: editingCell.date });
            setReasonText(currentRecord.reason || '');
            } else if (status === 'б') {
            setShowSickModal({ studentId: editingCell.studentId, date: editingCell.date });
            setSickStartDate(currentRecord.sickStartDate || '');
            setSickEndDate(currentRecord.sickEndDate || '');
            } else if (status === 'п' || status === 'н' || status === '') {
            // Для остальных статусов сразу обновляем
            updateAttendanceRecord(editingCell.studentId, editingCell.date, { 
                status,
                reason: undefined,
                sickStartDate: undefined,
                sickEndDate: undefined
            });
            }
        }
    }
        
    
    setEditingCell(null);
    setEditValue('');
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
      updateAttendanceRecord(showReasonModal.studentId, showReasonModal.date, { 
        status: 'у',
        reason: reasonText 
      });
      setShowReasonModal(null);
      setReasonText('');
    }
  };

  // Сохранение периода больничного
  const handleSaveSickPeriod = () => {
    if (showSickModal) {
      updateAttendanceRecord(showSickModal.studentId, showSickModal.date, { 
        status: 'б',
        sickStartDate,
        sickEndDate
      });
      setShowSickModal(null);
      setSickStartDate('');
      setSickEndDate('');
    }
  };

  // Получение цвета для статуса
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'п': return '#2cbb00ff';
      case 'у': return '#f59e0b';
      case 'б': return '#6b7280';
      case 'н': return '#ef4444';
      default: return 'transparent';
    }
  };

  // Добавление новой даты
  const handleAddDate = () => {
    const newDate = 'Новая дата';
    setDates(prev => [...prev, newDate]);
    
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
      setEditingCell({ studentId: students[0].id, date: newDate, type: 'date' });
      setEditValue(newDate);
    }
  };

  // Проверка, доступен ли семестр для редактирования
  const isSemesterAvailable = (semester: number) => {
    if (semester === 2) {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1; // 1-12
      return currentMonth >= 12 && currentMonth <= 7; // Январь-Июль для 2 семестра
    }
    return true; // 1 семестр всегда доступен
  };

  return (
    <div className="teacher-attendance-section">
      {/* Заголовок */}
      <div className="attendance-header">
        <div className="attendance-title-container">
          <div className="attendance-title">
            <div className="group-title">
              Посещаемость {groupNumber}
              <span className="subject-title">{subject}</span>
            </div>
          </div>
          <div className="attendance-actions">
            {onBackToGroups && (
              <button className="back-button" onClick={onBackToGroups}>
                <img 
                  src="th-icons/arrow_icon.svg" 
                  alt="Назад" 
                  className="nav-toggle-icon" 
                />
              </button>
            )}
            <button className="gradient-btn set-grades-btn">
              Выставить оценки
            </button>
          </div>
        </div>
      </div>

      {/* Фильтр семестров */}
      <div className="semester-filter">
        <button
          className={`semester-btn ${selectedSemester === 1 ? 'active' : ''}`}
          onClick={() => setSelectedSemester(1)}
        >
          1 семестр
        </button>
        <button
          className={`semester-btn ${selectedSemester === 2 ? 'active' : ''} ${
            !isSemesterAvailable(2) ? 'disabled' : ''
          }`}
          onClick={() => isSemesterAvailable(2) && setSelectedSemester(2)}
          disabled={!isSemesterAvailable(2)}
        >
          2 семестр
          {!isSemesterAvailable(2) && <span className="lock-icon"></span>}
        </button>
      </div>

       {/* Таблица посещаемости */}
      <div className="attendance-table-container">
        <div className="attendance-table-wrapper">
          <table className="attendance-table">
            {/* Остальное содержимое таблицы без изменений */}
            <thead>
              <tr>
                <th className="column-number">№</th>
                <th className="column-name">ФИО</th>
                {dates.map((date, index) => (
                  <th 
                    key={index}
                    className="column-date"
                    onDoubleClick={() => {
                      if (students.length > 0) {
                        setEditingCell({ studentId: students[0].id, date, type: 'date' });
                        setEditValue(date);
                      }
                    }}
                  >
                    {date}
                  </th>
                ))}
                <th className="column-add-date">
                  <button className="add-date-btn" onClick={handleAddDate}>
                    +
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, studentIndex) => (
                <tr key={student.id}>
                  <td className="cell-number">{studentIndex + 1}</td>
                  <td className="cell-name">
                    {student.lastName} {student.firstName} {student.middleName}
                  </td>
                  {dates.map((date, dateIndex) => {
                    const record = getAttendanceRecord(student.id, date);
                    const isEditing = editingCell?.studentId === student.id && 
                                    editingCell?.date === date;
                    
                    return (
                      <td 
                        key={dateIndex}
                        className={`cell-status ${isEditing ? 'editing' : ''}`}
                        style={{ 
                          backgroundColor: record.status ? getStatusColor(record.status) : 'transparent'
                        }}
                        onClick={() => handleCellClick(student.id, date, 'status', record.status)}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          handleCellClick(student.id, date, 'date', date);
                        }}
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
                          record.status
                        )}
                      </td>
                    );
                  })}
                  <td className="cell-add"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Модальное окно для причины отсутствия */}
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

      {/* Модальное окно для периода больничного */}
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