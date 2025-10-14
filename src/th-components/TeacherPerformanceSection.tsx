import React, { useState, useEffect, useRef } from 'react';
import './TeacherPerformanceSection.css';

// Типы данных
export interface Student {
  id: number;
  lastName: string;
  firstName: string;
  middleName: string;
  subgroup?: 'I' | 'II';
  averageGrade?: number;
  examType?: string;
  examGrade?: string;
  finalGrade?: string;
}

export interface GradeRecord {
  id: number;
  studentId: number;
  date: string;
  grade: string;
  subjectType: string;
  comment?: string;
}

export interface TeacherPerformanceSectionProps {
  groupNumber: string;
  subject: string;
  students: Student[];
  currentSemester: 1 | 2;
  onBackToGroups?: () => void;
}

export const TeacherPerformanceSection: React.FC<TeacherPerformanceSectionProps> = ({
  groupNumber,
  subject,
  students,
  currentSemester,
  onBackToGroups
}) => {
  const [selectedSemester, setSelectedSemester] = useState<1 | 2>(currentSemester);
  const [selectedSubgroup, setSelectedSubgroup] = useState<string>('all');
  const [selectedSubjectType, setSelectedSubjectType] = useState<string>('lecture');
  const [gradeRecords, setGradeRecords] = useState<GradeRecord[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [editingCell, setEditingCell] = useState<{studentId: number, date: string, type: 'date' | 'grade'} | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showExamModal, setShowExamModal] = useState<{studentId: number} | null>(null);
  const [examType, setExamType] = useState<string>('');
  const [examGrade, setExamGrade] = useState<string>('');

  const inputRef = useRef<HTMLInputElement>(null);

  // Типы предметов
  const subjectTypes = [
    { value: 'lecture', label: 'Лекция' },
    { value: 'practice', label: 'Практика' },
    { value: 'independent', label: 'Самостоятельная работа' },
    { value: 'lab', label: 'Лабораторная работа' }
  ];
  
  // Типы экзаменов
  const examTypes = [
    { value: 'exam', label: 'Экзамен', grades: ['5', '4', '3', '2', 'н/а'] },
    { value: 'diff', label: 'Дифференциальный зачет', grades: ['5', '4', '3', '2', 'н/а'] },
    { value: 'pass', label: 'Зачет', grades: ['Зачет', 'Незачет'] }
  ];

  // Допустимые оценки
  const allowedGrades = ['5', '4', '3', '2', '1', '0', 'н/а'];

  // Инициализация данных
  useEffect(() => {
    const initialDates = ['04.09', '25.09', '02.10'];
    setDates(initialDates);
    
    // Инициализация записей оценок
    const initialRecords: GradeRecord[] = [];
    students.forEach(student => {
      initialDates.forEach(date => {
        initialRecords.push({
          id: Date.now() + Math.random(),
          studentId: student.id,
          date: date,
          grade: '',
          subjectType: 'Л'
        });
      });
    });
    setGradeRecords(initialRecords);
  }, [students]);

  // Фокус на input при редактировании
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingCell]);

  // Получение записи оценки для студента и даты
  const getGradeRecord = (studentId: number, date: string): GradeRecord => {
    return gradeRecords.find(record => 
      record.studentId === studentId && record.date === date
    ) || {
      id: Date.now() + Math.random(),
      studentId,
      date,
      grade: '',
      subjectType: 'Л'
    };
  };

  // Обновление записи оценки
  const updateGradeRecord = (studentId: number, date: string, updates: Partial<GradeRecord>) => {
    setGradeRecords(prev => {
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
          grade: '',
          subjectType: 'Л',
          ...updates
        }];
      }
    });
  };

  // Начало редактирования ячейки
  const handleCellClick = (studentId: number, date: string, type: 'date' | 'grade', currentValue: string) => {
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
        setGradeRecords(prev => 
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
    } else if (editingCell.type === 'grade') {
      if (allowedGrades.includes(editValue) || editValue === '') {
        updateGradeRecord(editingCell.studentId, editingCell.date, { 
          grade: editValue
        });
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

  // Сохранение экзамена
  const handleSaveExam = () => {
    if (showExamModal) {
      // Здесь логика сохранения экзаменационной оценки
      console.log('Сохранение экзамена:', { studentId: showExamModal.studentId, examType, examGrade });
      setShowExamModal(null);
      setExamType('');
      setExamGrade('');
    }
  };

  // Получение цвета для оценки
  const getGradeColor = (grade: string) => {
    if (grade === '5' || grade === 'Зачет') return '#2cbb00ff';
    if (grade === '4') return '#a5db28ff';
    if (grade === '3') return '#f59e0b';
    if (grade === '2' || grade === 'Незачет' || grade === 'н/а') return '#ef4444';
    return 'transparent';
  };

  // Добавление новой даты
  const handleAddDate = () => {
    const newDate = 'Новая дата';
    setDates(prev => [...prev, newDate]);
    
    // Добавляем записи для всех студентов
    const newRecords: GradeRecord[] = students.map(student => ({
      id: Date.now() + Math.random(),
      studentId: student.id,
      date: newDate,
      grade: '',
      subjectType: 'Л'
    }));
    
    setGradeRecords(prev => [...prev, ...newRecords]);
    
    // Начинаем редактирование первой ячейки новой даты
    if (students.length > 0) {
      setEditingCell({ studentId: students[0].id, date: newDate, type: 'date' });
      setEditValue(newDate);
    }
  };

  // Расчет среднего балла для студента
  const calculateAverageGrade = (studentId: number): string => {
    const studentGrades = gradeRecords
      .filter(record => record.studentId === studentId && record.grade && !isNaN(parseFloat(record.grade)))
      .map(record => parseFloat(record.grade));
    
    if (studentGrades.length === 0) return '-';
    
    const average = studentGrades.reduce((sum, grade) => sum + grade, 0) / studentGrades.length;
    return average.toFixed(1);
  };

  // Расчет итоговой оценки
  const calculateFinalGrade = (student: Student): string => {
    const average = student.averageGrade || 0;
    
    if (student.examType === 'pass') {
      return student.examGrade === 'Зачет' ? 'Зачет' : 'Незачет';
    } else if (student.examType === 'exam' || student.examType === 'diff') {
      if (!student.examGrade || student.examGrade === 'н/а') return 'н/а';
      
      const examGradeNum = parseFloat(student.examGrade);
      if (isNaN(examGradeNum)) return 'н/а';
      
      const final = (average + examGradeNum) / 2;
      return final.toFixed(1);
    }
    
    return '-';
  };

  // Фильтрация студентов по подгруппе
  const filteredStudents = students.filter(student => {
    if (selectedSubgroup === 'all') return true;
    return student.subgroup === selectedSubgroup;
  });

  return (
    <div className="teacher-performance-section">
      {/* Заголовок */}
      <div className="performance-header">
        <div className="performance-title-container">
          <div className="performance-title">
            <div className="group-title">
              Успеваемость {groupNumber}
              <span className="subject-title">{subject}</span>
            </div>
          </div>
          <div className="performance-actions">
            {onBackToGroups && (
              <button className="back-button" onClick={onBackToGroups}>
                <span>← Назад</span>
              </button>
            )}
            <button className="gradient-btn set-attendance-btn">
              Выставить посещаемость
            </button>
          </div>
        </div>
      </div>

      {/* Фильтры */}
      <div className="performance-filters">
        <div className="semester-filter">
          <span className="filter-label">Техместр</span>
          <button
            className={`semester-btn ${selectedSemester === 1 ? 'active' : ''}`}
            onClick={() => setSelectedSemester(1)}
          >
            1 семестр
          </button>
          <button
            className={`semester-btn ${selectedSemester === 2 ? 'active' : ''}`}
            onClick={() => setSelectedSemester(2)}
          >
            2 семестр
          </button>
        </div>

        <div className="additional-filters">
          <div className="filter-group">
            <label>Подгруппа:</label>
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

          <div className="filter-group">
            <label>Тип предмета:</label>
            <select 
              value={selectedSubjectType} 
              onChange={(e) => setSelectedSubjectType(e.target.value)}
              className="filter-select"
            >
              {subjectTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Таблица успеваемости */}
      <div className="performance-table-container">
        <div className="performance-table-wrapper">
          <table className="performance-table">
            <thead>
              <tr>
                {/* Фиксированные колонки слева */}
                <th className="column-number fixed-left">№</th>
                <th className="column-name fixed-left">ФИО</th>
                <th className="column-subgroup fixed-left">Подгруппа</th>
                
                {/* Динамические колонки с датами */}
                {dates.map((date, index) => (
                  <th key={index} className="column-date">
                    <div 
                      className="date-header"
                      onDoubleClick={() => {
                        if (students.length > 0) {
                          setEditingCell({ studentId: students[0].id, date, type: 'date' });
                          setEditValue(date);
                        }
                      }}
                    >
                      {date}
                      <span className="subject-type">/Л</span>
                    </div>
                  </th>
                ))}
                
                {/* Кнопка добавления даты */}
                <th className="column-add-date">
                  <button className="add-date-btn" onClick={handleAddDate}>
                    +
                  </button>
                </th>
                
                {/* Фиксированные колонки справа */}
                <th className="column-average fixed-right">Средний балл</th>
                <th className="column-exam fixed-right">Экзамен</th>
                <th className="column-final fixed-right">Итог</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student, studentIndex) => (
                <tr key={student.id}>
                  {/* Фиксированные ячейки слева */}
                  <td className="cell-number fixed-left">{studentIndex + 1}</td>
                  <td className="cell-name fixed-left">
                    {student.lastName} {student.firstName} {student.middleName}
                  </td>
                  <td className="cell-subgroup fixed-left">
                    {student.subgroup || '-'}
                  </td>
                  
                  {/* Ячейки с оценками по датам */}
                  {dates.map((date, dateIndex) => {
                    const record = getGradeRecord(student.id, date);
                    const isEditing = editingCell?.studentId === student.id && 
                                    editingCell?.date === date;
                    
                    return (
                      <td 
                        key={dateIndex}
                        className={`cell-grade ${isEditing ? 'editing' : ''}`}
                        style={{ 
                          backgroundColor: record.grade ? getGradeColor(record.grade) : 'transparent'
                        }}
                        onClick={() => handleCellClick(student.id, date, 'grade', record.grade)}
                      >
                        {isEditing && editingCell?.type === 'grade' ? (
                          <div className="grade-input-container">
                            <input
                              ref={inputRef}
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={handleSaveEdit}
                              onKeyPress={handleKeyPress}
                              className="grade-input"
                              placeholder="Оценка"
                              list="grades-list"
                            />
                            <datalist id="grades-list">
                              {allowedGrades.map(grade => (
                                <option key={grade} value={grade} />
                              ))}
                            </datalist>
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
                          record.grade || ''
                        )}
                      </td>
                    );
                  })}
                  
                  {/* Ячейка добавления даты */}
                  <td className="cell-add-date"></td>
                  
                  {/* Фиксированные ячейки справа */}
                  <td className="cell-average fixed-right">
                    {calculateAverageGrade(student.id)}
                  </td>
                  <td className="cell-exam fixed-right">
                    <button 
                      className="exam-btn"
                      onClick={() => setShowExamModal({ studentId: student.id })}
                    >
                      Выставить
                    </button>
                  </td>
                  <td className="cell-final fixed-right">
                    {calculateFinalGrade(student)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Модальное окно для экзамена */}
      {showExamModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Выставление экзаменационной оценки</h3>
            <div className="exam-inputs">
              <div className="input-group">
                <label>Тип экзамена:</label>
                <select 
                  value={examType}
                  onChange={(e) => setExamType(e.target.value)}
                  className="exam-type-select"
                >
                  <option value="">Выберите тип</option>
                  {examTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label>Оценка:</label>
                <select 
                  value={examGrade}
                  onChange={(e) => setExamGrade(e.target.value)}
                  className="exam-grade-select"
                  disabled={!examType}
                >
                  <option value="">Выберите оценку</option>
                  {examTypes.find(type => type.value === examType)?.grades.map(grade => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button className="gradient-btn" onClick={handleSaveExam}>
                Сохранить
              </button>
              <button className="cancel-btn" onClick={() => setShowExamModal(null)}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};