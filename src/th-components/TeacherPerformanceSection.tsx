import React, { useState, useEffect, useRef } from 'react';
import './TeacherPerformanceSection.css';

// Типы данных
export interface Student {
  id: number;
  lastName: string;
  firstName: string;
  middleName: string;
  subgroup?: 'I' | 'II';
}

// Тип для lessonType
export type LessonType = 'Л' | 'ПР' | 'СР' | 'КР' | 'Т' | 'ДЗ' | '';

export interface GradeRecord {
  id: number;
  studentId: number;
  date: string;
  lessonType: LessonType;
  topic: string;
  grade: string;
  comment?: string;
  attachments?: string[];
}

export interface ExamRecord {
  id: number;
  studentId: number;
  examType: 'Э' | 'ДЗ' | 'З' | '';
  grade: string;
}

export interface TeacherPerformanceSectionProps {
  groupNumber: string;
  subject: string;
  students: Student[];
  onBackToGroups?: () => void;
  onSetAttendance?: () => void;
}

export const TeacherPerformanceSection: React.FC<TeacherPerformanceSectionProps> = ({
  groupNumber,
  subject,
  students,
  onBackToGroups,
  onSetAttendance
}) => {
  const [selectedSubgroup, setSelectedSubgroup] = useState<string>('all');
  const [selectedLessonType, setSelectedLessonType] = useState<string>('all');
  const [gradeRecords, setGradeRecords] = useState<GradeRecord[]>([]);
  const [examRecords, setExamRecords] = useState<ExamRecord[]>([]);
  const [allDates, setAllDates] = useState<string[]>([]);
  const [editingCell, setEditingCell] = useState<{
    studentId: number; 
    date: string; 
    field: 'grade' | 'lessonType' | 'topic' | 'exam'
  } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showCommentModal, setShowCommentModal] = useState<{studentId: number; date: string} | null>(null);
  const [commentText, setCommentText] = useState('');
  const [studentSubgroups, setStudentSubgroups] = useState<Record<number, 'I' | 'II' | undefined>>({});
  const [dateRange, setDateRange] = useState<{start: string; end: string}>({
    start: '',
    end: ''
  });
  const [globalLessonTypes, setGlobalLessonTypes] = useState<Record<string, LessonType>>({});
  const [globalExamType, setGlobalExamType] = useState<string>('');

  const inputRef = useRef<HTMLInputElement>(null);

  // Допустимые оценки
  const validGrades = [
    '5', '4.75', '4.5', '4.25', '4', '3.75', '3.5', '3.25', '3', 
    '2.75', '2.5', '2.25', '2', '1', '0', ''
  ];

  // Типы занятий для выпадающего списка под датой
  const lessonTypeOptions = [
    { value: 'Л', label: 'Л' },
    { value: 'ПР', label: 'ПР' },
    { value: 'СР', label: 'СР' },
    { value: 'КР', label: 'КР' },
    { value: 'Т', label: 'Т' },
    { value: 'ДЗ', label: 'ДЗ' }
  ];

  // Типы занятий для фильтра
  const lessonTypeFilters = [
    { value: 'Л', label: 'Лекция' },
    { value: 'ПР', label: 'Практическая работа' },
    { value: 'СР', label: 'Самостоятельная работа' },
    { value: 'КР', label: 'Контрольная работа' },
    { value: 'Т', label: 'Тест' },
    { value: 'ДЗ', label: 'Домашняя работа' }
  ];

  // Типы экзаменов
  const examTypes = [
    { value: 'Э', label: 'Э' },
    { value: 'ДЗ', label: 'ДЗ' },
    { value: 'З', label: 'З' }
  ];

  // Допустимые оценки для экзаменов
  const examGrades = {
    'Э': ['5', '4', '3', '2', ''],
    'ДЗ': ['5', '4', '3', '2', ''],
    'З': ['з', 'нз', '']
  };

  // Функция для получения цвета оценки
  const getGradeColor = (grade: string) => {
    if (!grade) return '';
    
    const numericGrade = parseFloat(grade);
    if (numericGrade >= 4.5) return '#2cbb00';
    if (numericGrade >= 3.5) return '#a5db28';
    if (numericGrade >= 2.5) return '#f59e0b';
    return '#ef4444';
  };

  // Функция для определения размера ячейки
  const getGradeSize = (grade: string): 'small' | 'medium' | 'large' => {
    const simpleGrades = ['5', '4', '3', '2', '1', '0', ''];
    if (simpleGrades.includes(grade)) {
      return 'small';
    } else if (grade && grade.length <= 4) {
      return 'medium';
    } else {
      return 'large';
    }
  };

  // Фильтрация студентов по подгруппе
  const filteredStudents = students.filter(student => {
    if (selectedSubgroup === 'all') return true;
    return studentSubgroups[student.id] === selectedSubgroup;
  });

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

  // Фильтрация дат по выбранному диапазону и типу занятия
  const filteredDates = allDates.filter(date => {
    // Фильтр по дате
    if (dateRange.start || dateRange.end) {
      const currentDate = parseDate(date);
      const startDate = parseDate(dateRange.start);
      const endDate = parseDate(dateRange.end);
      
      if (startDate && endDate) {
        if (currentDate < startDate || currentDate > endDate) {
          return false;
        }
      } else if (startDate && currentDate < startDate) {
        return false;
      } else if (endDate && currentDate > endDate) {
        return false;
      }
    }
    
    // Фильтр по типу занятия
    if (selectedLessonType !== 'all') {
      const hasLessonType = gradeRecords.some(record => 
        record.date === date && 
        record.lessonType === selectedLessonType
      );
      return hasLessonType;
    }
    
    return true;
  });

  // Инициализация данных
  useEffect(() => {
    // Примерные даты занятий (в реальном приложении будут из базы)
    const initialDates = [
      '04.09', '11.09', '18.09', '25.09', '02.10'
    ];
    
    setAllDates(initialDates);

    // Инициализация записей оценок
    const initialGradeRecords: GradeRecord[] = [];
    const initialExamRecords: ExamRecord[] = [];
    
    students.forEach(student => {
      initialDates.forEach(date => {
        initialGradeRecords.push({
          id: Date.now() + Math.random(),
          studentId: student.id,
          date: date,
          lessonType: '',
          topic: '',
          grade: ''
        });
      });

      // Инициализация экзаменационных записей
      initialExamRecords.push({
        id: Date.now() + Math.random(),
        studentId: student.id,
        examType: '',
        grade: ''
      });
    });
    
    setGradeRecords(initialGradeRecords);
    setExamRecords(initialExamRecords);

    // Инициализация подгрупп студентов
    const initialSubgroups: Record<number, 'I' | 'II' | undefined> = {};
    students.forEach(student => {
      initialSubgroups[student.id] = student.subgroup;
    });
    setStudentSubgroups(initialSubgroups);
  }, [students]);

  // Навигация по таблице с клавишами
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!editingCell || editingCell.field !== 'grade') return;

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
          const record = getGradeRecord(newStudent.id, newDate);
          setEditingCell({ 
            studentId: newStudent.id, 
            date: newDate, 
            field: 'grade'
          });
          setEditValue(record.grade);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editingCell, filteredStudents, filteredDates]);

  // Фокус на input при редактировании
  useEffect(() => {
    if (editingCell && editingCell.field === 'grade' && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  // Получение записи оценки для студента и даты
  const getGradeRecord = (studentId: number, date: string): GradeRecord => {
    const record = gradeRecords.find(record => 
      record.studentId === studentId && record.date === date
    );
    
    if (record) {
      return record;
    }
    
    // Если записи нет, создаем новую с глобальным типом занятия
    const globalLessonType = globalLessonTypes[date] || '';
    return {
      id: Date.now() + Math.random(),
      studentId,
      date,
      lessonType: globalLessonType as LessonType,
      topic: '',
      grade: ''
    };
  };

  // Получение экзаменационной записи для студента
  const getExamRecord = (studentId: number): ExamRecord => {
    return examRecords.find(record => record.studentId === studentId) || {
      id: Date.now() + Math.random(),
      studentId,
      examType: globalExamType as any,
      grade: ''
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
        newRecords[existingIndex] = { 
          ...newRecords[existingIndex], 
          ...updates 
        } as GradeRecord;
        return newRecords;
      } else {
        const globalLessonType = globalLessonTypes[date] || '';
        const newRecord: GradeRecord = {
          id: Date.now() + Math.random(),
          studentId,
          date,
          lessonType: globalLessonType as LessonType,
          topic: '',
          grade: '',
          ...updates
        };
        return [...prev, newRecord];
      }
    });
  };

  // Обновление экзаменационной записи
  const updateExamRecord = (studentId: number, updates: Partial<ExamRecord>) => {
    setExamRecords(prev => {
      const existingIndex = prev.findIndex(record => record.studentId === studentId);
      
      if (existingIndex >= 0) {
        const newRecords = [...prev];
        newRecords[existingIndex] = { ...newRecords[existingIndex], ...updates };
        return newRecords;
      } else {
        return [...prev, {
          id: Date.now() + Math.random(),
          studentId,
          examType: globalExamType as any,
          grade: '',
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
  const handleCellClick = (
    studentId: number, 
    date: string, 
    field: 'grade' | 'lessonType' | 'topic' | 'exam', 
    currentValue: string
  ) => {
    setEditingCell({ studentId, date, field });
    setEditValue(currentValue);
  };

  // Сохранение редактирования
  const handleSaveEdit = () => {
    if (!editingCell) return;

    if (editingCell.field === 'grade') {
      // Валидация оценки
      if (validGrades.includes(editValue) || editValue === '') {
        updateGradeRecord(editingCell.studentId, editingCell.date, { grade: editValue });
      }
    } else if (editingCell.field === 'lessonType') {
      // Приводим значение к типу LessonType
      const lessonTypeValue = editValue as LessonType;
      updateGradeRecord(editingCell.studentId, editingCell.date, { lessonType: lessonTypeValue });
    } else if (editingCell.field === 'topic') {
      updateGradeRecord(editingCell.studentId, editingCell.date, { topic: editValue });
    } else if (editingCell.field === 'exam') {
      // Исправлено: теперь экзамен сохраняется корректно
      if (editValue === '' || examGrades[globalExamType as keyof typeof examGrades]?.includes(editValue)) {
        updateExamRecord(editingCell.studentId, { grade: editValue });
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

  // Сохранение комментария
  const handleSaveComment = () => {
    if (showCommentModal) {
      updateGradeRecord(
        showCommentModal.studentId, 
        showCommentModal.date, 
        { comment: commentText }
      );
      setShowCommentModal(null);
      setCommentText('');
    }
  };

  // Расчет среднего балла для студента
  const calculateAverageGrade = (studentId: number): number => {
    const studentGrades = gradeRecords
      .filter(record => 
        record.studentId === studentId && 
        record.grade && 
        record.grade !== '' &&
        filteredDates.includes(record.date)
      )
      .map(record => parseFloat(record.grade));
    
    if (studentGrades.length === 0) return 0;
    
    const sum = studentGrades.reduce((total, grade) => total + grade, 0);
    return sum / studentGrades.length;
  };

  // Расчет среднего балла по группе
  const calculateGroupAverageGrade = (): number => {
    if (filteredStudents.length === 0) return 0;
    
    const totalAverage = filteredStudents.reduce((sum, student) => {
      return sum + calculateAverageGrade(student.id);
    }, 0);
    
    return totalAverage / filteredStudents.length;
  };

  // Получение класса для ячейки оценки
  const getGradeClass = (grade: string): string => {
    if (!grade) return 'grade-empty';
    
    const numericGrade = parseFloat(grade);
    if (numericGrade >= 4.5) return 'grade-excellent';
    if (numericGrade >= 3.5) return 'grade-good';
    if (numericGrade >= 2.5) return 'grade-satisfactory';
    return 'grade-unsatisfactory';
  };

  // Получение класса для экзаменационной оценки
  const getExamGradeClass = (grade: string, examType: string): string => {
    if (!grade) return 'exam-grade-empty';
    
    if (examType === 'З') {
      return grade === 'з' ? 'exam-grade-pass' : 'exam-grade-fail';
    } else {
      const numericGrade = parseFloat(grade);
      if (numericGrade >= 4.5) return 'exam-grade-excellent';
      if (numericGrade >= 3.5) return 'exam-grade-good';
      if (numericGrade >= 2.5) return 'exam-grade-satisfactory';
      return 'exam-grade-unsatisfactory';
    }
  };

  // Обработка изменения глобального типа занятия для даты
  const handleGlobalLessonTypeChange = (date: string, lessonType: string) => {
    const lessonTypeValue = lessonType as LessonType;
    setGlobalLessonTypes(prev => ({
      ...prev,
      [date]: lessonTypeValue
    }));
    
    // Автоматически применяем ко всем студентам для этой даты
    if (lessonTypeValue) {
      filteredStudents.forEach(student => {
        updateGradeRecord(student.id, date, { lessonType: lessonTypeValue });
      });
    }
  };

  // Обработка изменения глобального типа экзамена
  const handleGlobalExamTypeChange = (examType: string) => {
    setGlobalExamType(examType);
    
    // Автоматически применяем ко всем студентам
    if (examType) {
      filteredStudents.forEach(student => {
        updateExamRecord(student.id, { examType: examType as any });
      });
    }
  };

  // Обработчик клика по кнопке "Выставить посещаемость"
  const handleSetAttendance = () => {
    if (onSetAttendance) {
      onSetAttendance();
    }
  };

  // Рендер таблицы
  const renderTable = () => {
    return (
      <div className="performance-table-wrapper">
        <table className="performance-table">
          <thead>
            <tr>
              {/* Фиксированные колонки слева с rowspan */}
              <th className="column-number sticky-col table-header-rowspan" rowSpan={2}>№</th>
              <th className="column-name sticky-col table-header-rowspan" rowSpan={2}>ФИО</th>
              <th className="column-subgroup sticky-col table-header-rowspan" rowSpan={2}>Подгруппа</th>
              
              {/* Динамические колонки с датами - теперь каждая дата это одна колонка */}
              {filteredDates.map((date, index) => (
                <th key={index} className="column-date" rowSpan={2}>
                  <div className="date-header">
                    <div className="date-title">{date}</div>
                    <div className="lesson-type-select-under-date-container">
                      <select 
                        value={globalLessonTypes[date] || ''}
                        onChange={(e) => handleGlobalLessonTypeChange(date, e.target.value)}
                        className="lesson-type-select-under-date"
                      >
                        <option value=""></option>
                        {lessonTypeOptions.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </th>
              ))}
              
              {/* Фиксированные колонки справа с rowspan */}
              <th className="column-average sticky-col-right highlight-col table-header-rowspan" rowSpan={2}>Средний балл</th>
              <th className="column-exam sticky-col-right highlight-col table-header-rowspan" rowSpan={2}>
                <div className="global-exam-header">
                  <div>Экзамен</div>
                  <select 
                    value={globalExamType}
                    onChange={(e) => handleGlobalExamTypeChange(e.target.value)}
                    className="global-exam-select"
                  >
                    <option value=""></option>
                    {examTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student, studentIndex) => {
              const averageGrade = calculateAverageGrade(student.id);
              const examRecord = getExamRecord(student.id);
              
              return (
                <tr key={student.id}>
                  {/* Фиксированные ячейки слева */}
                  <td className="column-number sticky-col">
                    <div className="cell-number">{studentIndex + 1}.</div>
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
                        className="subgroup-select"
                      >
                        <option value="">-</option>
                        <option value="I">I</option>
                        <option value="II">II</option>
                      </select>
                    </div>
                  </td>
                  
                  {/* Ячейки с оценками по датам - теперь только оценка */}
                  {filteredDates.map((date, dateIndex) => {
                    const record = getGradeRecord(student.id, date);
                    const isEditing = editingCell?.studentId === student.id && 
                                    editingCell?.date === date;
                    
                    return (
                      <td key={dateIndex} className="column-date">
                        <div className="grade-cell-container">
                          {/* Оценка */}
                          <div 
                            className={`grade-cell ${getGradeClass(record.grade)} ${getGradeSize(record.grade)} ${record.comment ? 'has-comment' : ''}`}
                            onClick={() => handleCellClick(student.id, date, 'grade', record.grade)}
                            style={{
                              backgroundColor: getGradeColor(record.grade)
                            }}
                          >
                            {isEditing && editingCell?.field === 'grade' ? (
                              <input
                                ref={inputRef}
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={handleSaveEdit}
                                onKeyPress={handleKeyPress}
                                className="grade-input"
                                list="grades-list"
                                style={{
                                  backgroundColor: 'transparent',
                                  width: '100%',
                                  height: '100%',
                                  border: 'none',
                                  textAlign: 'center',
                                  fontSize: getGradeSize(editValue) === 'small' ? '14px' : 
                                           getGradeSize(editValue) === 'medium' ? '13px' : '12px'
                                }}
                              />
                            ) : (
                              <div className="grade-value">
                                {record.grade || '+'}
                              </div>
                            )}
                          </div>
                          
                          {/* Кнопка комментария */}
                          <button 
                            className="comment-btn"
                            onClick={() => {
                              setShowCommentModal({ studentId: student.id, date });
                              setCommentText(record.comment || '');
                            }}
                            title={record.comment ? 'Редактировать комментарий' : 'Добавить комментарий'}
                          >
                            💬
                          </button>
                        </div>
                      </td>
                    );
                  })}
                  
                  {/* Средний балл */}
                  <td className="column-average sticky-col-right highlight-col">
                    <div 
                      className={`average-grade ${getGradeClass(averageGrade.toFixed(2))}`}
                      style={{
                        backgroundColor: getGradeColor(averageGrade.toFixed(2))
                      }}
                    >
                      {averageGrade > 0 ? averageGrade.toFixed(2) : '-'}
                    </div>
                  </td>
                  
                  {/* Экзамен */}
                  <td className="column-exam sticky-col-right highlight-col">
                    <div className="exam-cell-container">
                      <div 
                        className={`exam-grade ${getExamGradeClass(examRecord.grade, examRecord.examType)}`}
                        onClick={() => handleCellClick(student.id, '', 'exam', examRecord.grade)}
                        style={{
                          backgroundColor: examRecord.grade ? getGradeColor(examRecord.grade === 'з' ? '5' : examRecord.grade === 'нз' ? '2' : examRecord.grade) : ''
                        }}
                      >
                        {editingCell?.studentId === student.id && editingCell?.field === 'exam' ? (
                          <select
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleSaveEdit}
                            className="exam-grade-select"
                            style={{
                              backgroundColor: 'transparent',
                              border: 'none',
                              textAlign: 'center',
                              width: '100%'
                            }}
                          >
                            <option value="">-</option>
                            {(examGrades[examRecord.examType as keyof typeof examGrades] || []).map(grade => (
                              <option key={grade} value={grade}>
                                {grade || '-'}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="exam-grade-value">
                            {examRecord.grade || '-'}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {/* Datalist для подсказки оценок */}
        <datalist id="grades-list">
          {validGrades.map(grade => (
            <option key={grade} value={grade} />
          ))}
        </datalist>
      </div>
    );
  };

  // Рендер модального окна комментария с поддержкой вложений
  const renderCommentModal = () => {
    if (!showCommentModal) return null;

    const record = getGradeRecord(showCommentModal.studentId, showCommentModal.date);
    const student = students.find(s => s.id === showCommentModal.studentId);

    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <h3>
            Комментарий к оценке {student && 
              `${student.lastName} ${student.firstName} ${student.middleName}`
            }
          </h3>
          
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Введите комментарий..."
            rows={4}
          />
          
          {/* Блок для вложений (заготовка для будущего функционала) */}
          <div className="comment-attachments">
            <div className="attachments-list">
              {/* Здесь будут отображаться прикрепленные файлы */}
              {record.attachments && record.attachments.length > 0 ? (
                record.attachments.map((attachment, index) => (
                  <div key={index} className="attachment-item">
                    <span className="attachment-icon">📎</span>
                    <span className="attachment-name">{attachment}</span>
                    <div className="attachment-actions">
                      <button className="attachment-btn" title="Просмотреть"></button>
                      <button className="attachment-btn" title="Удалить"></button>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '14px', color: '#64748b', textAlign: 'center', padding: '8px' }}>
                  Нет прикрепленных файлов
                </div>
              )}
            </div>
            
            <button className="add-attachment-btn">
              <span>+</span>
              <span>Прикрепить файл</span>
            </button>
          </div>
          
          <div className="modal-actions">
            <button className="gradient-btn" onClick={handleSaveComment}>
              Сохранить
            </button>
            <button className="cancel-btn" onClick={() => setShowCommentModal(null)}>
              Отмена
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="teacher-performance-section">
      {/* Заголовок */}
      <div className="performance-header">
        <div className="performance-title-container">
          <div className="performance-title">
            <div className="group-title">
              Успеваемость {groupNumber}
            </div>
            <div className="subject-full-title">
              {subject}
            </div>
          </div>
          <div className="performance-actions">
            {onBackToGroups && (
              <button className="back-button" onClick={onBackToGroups}>
                <img src="/th-icons/arrow_icon.svg" alt="Назад" />
              </button>
            )}
            <button className="gradient-btn" onClick={handleSetAttendance}>
              Выставить посещаемость
            </button>
          </div>
        </div>
      </div>

      {/* Фильтры */}
      <div className="performance-filters">
        <div className="date-range-filter">
          <div className="date-range-group">
            <span className="date-range-label">Период с</span>
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

        <div className="type-filters">
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
          
          <div className="filter-group">
            <select 
              value={selectedLessonType} 
              onChange={(e) => setSelectedLessonType(e.target.value)}
              className="filter-select"
            >
              <option value="all">Все типы занятий</option>
              {lessonTypeFilters.map(type => (
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
        {renderTable()}
        
        {/* Средний балл группы */}
        <div className="group-average-footer">
          <div className="group-average-percentage">
            <div className="average-label">Средний балл группы</div>
            <div 
              className="average-circle"
              style={{
                '--average': `${calculateGroupAverageGrade() * 20}%`,
                '--average-color': getGradeColor(calculateGroupAverageGrade().toFixed(2))
              } as React.CSSProperties}
            >
              <div className="average-value">
                {calculateGroupAverageGrade().toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Модальное окно комментария */}
      {renderCommentModal()}
    </div>
  );
};