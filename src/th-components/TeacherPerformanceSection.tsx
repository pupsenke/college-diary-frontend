import React, { useState, useEffect, useRef } from 'react';
import { teacherApiService } from '../services/teacherApiService';
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
  onBackToGroups?: () => void;
  onSetAttendance?: () => void;
}

export const TeacherPerformanceSection: React.FC<TeacherPerformanceSectionProps> = ({
  groupNumber,
  subject,
  onBackToGroups,
  onSetAttendance
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [idSt, setIdSt] = useState<number>(2);

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
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<boolean>(false);
  const [showTopicModal, setShowTopicModal] = useState<string | null>(null);
  const [topicText, setTopicText] = useState('');
  const [studentSubgroups, setStudentSubgroups] = useState<Record<number, 'I' | 'II' | undefined>>({});
  const [subgroupTeachers, setSubgroupTeachers] = useState<Record<string, string>>({
    'I': 'Иванов И.И.',
    'II': 'Петров П.П.'
  });

  const [editingTeacher, setEditingTeacher] = useState<string | null>(null);
  const [teacherEditValue, setTeacherEditValue] = useState('');
  const [dateRange, setDateRange] = useState<{start: string; end: string}>({
    start: '',
    end: ''
  });
  const [globalLessonTypes, setGlobalLessonTypes] = useState<Record<string, LessonType>>({});
  const [globalLessonTopics, setGlobalLessonTopics] = useState<Record<string, string>>({});
  const [globalExamType, setGlobalExamType] = useState<string>('');

  const inputRef = useRef<HTMLInputElement>(null);
  const teacherInputRef = useRef<HTMLInputElement>(null);
  const examInputRef = useRef<HTMLSelectElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    
    if (grade === 'з') return '#2cbb00';
    if (grade === 'нз') return '#ef4444';
    
    const numericGrade = parseFloat(grade);
    if (numericGrade >= 4.5) return '#2cbb00';
    if (numericGrade >= 3.5) return '#a5db28';
    if (numericGrade >= 2.5) return '#f59e0b';
    return '#ef4444';
  };

  // Функция для загрузки студентов из API
  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Преобразуем номер группы в idGroup
      const groupId = getGroupIdFromNumber(groupNumber);
      
      if (!groupId) {
        throw new Error('Не удалось определить ID группы');
      }

      const apiStudents = await teacherApiService.getGroupStudents(groupId, idSt);
      
      // Преобразуем данные из API в формат компонента
      const transformedStudents: Student[] = apiStudents.map((student: any) => ({
        id: student.idStudent,
        lastName: student.lastName,
        firstName: student.name,
        middleName: student.patronymic,
        subgroup: undefined
      }));

      // Сортируем студентов по фамилии от А до Я
      const sortedStudents = transformedStudents.sort((a, b) => 
        a.lastName.localeCompare(b.lastName)
      );

      setStudents(sortedStudents);
      
    } catch (err) {
      console.error('Ошибка при загрузке студентов:', err);
      setError('Не удалось загрузить список студентов');
    } finally {
      setLoading(false);
    }
  };

  // Функция для преобразования номера группы в ID
  const getGroupIdFromNumber = (groupNumber: string): number | null => {
    const groupMap: Record<string, number> = {
      '2991': 2,
      '2992': 3,
    };
    
    return groupMap[groupNumber] || null;
  };

  // Загружаем студентов при монтировании компонента
  useEffect(() => {
    fetchStudents();
  }, [groupNumber, idSt]);

  // Функция для определения размера ячейки
  const getGradeSize = (grade: string): 'small' | 'medium' | 'large' => {
    const simpleGrades = ['5', '4', '3', '2', '1', '0', '', 'з', 'нз'];
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
    if (students.length === 0) return;

    // Примерные даты занятий
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
      if (!editingCell) return;

      if (editingCell.field === 'grade') {
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
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editingCell, filteredStudents, filteredDates]);

  // Фокус на input при редактировании
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  // Фокус на input при редактировании преподавателя
  useEffect(() => {
    if (editingTeacher && teacherInputRef.current) {
      teacherInputRef.current.focus();
      teacherInputRef.current.select();
    }
  }, [editingTeacher]);

  // Фокус на select при редактировании экзамена
  useEffect(() => {
    if (editingCell && editingCell.field === 'exam' && examInputRef.current) {
      examInputRef.current.focus();
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
    const globalTopic = globalLessonTopics[date] || '';
    return {
      id: Date.now() + Math.random(),
      studentId,
      date,
      lessonType: globalLessonType as LessonType,
      topic: globalTopic,
      grade: ''
    };
  };

  // Получение экзаменационной записи для студента
  const getExamRecord = (studentId: number): ExamRecord => {
    const record = examRecords.find(record => record.studentId === studentId);
    if (record) {
      return record;
    }
    
    // Если записи нет, создаем новую
    return {
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
        const globalTopic = globalLessonTopics[date] || '';
        const newRecord: GradeRecord = {
          id: Date.now() + Math.random(),
          studentId,
          date,
          lessonType: globalLessonType as LessonType,
          topic: globalTopic,
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

  // Обновление преподавателя подгруппы
  const updateSubgroupTeacher = (subgroup: string, teacher: string) => {
    setSubgroupTeachers(prev => ({
      ...prev,
      [subgroup]: teacher
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
      // Сохранение экзаменационной оценки
      const examRecord = getExamRecord(editingCell.studentId);
      const allowedGrades = examGrades[examRecord.examType as keyof typeof examGrades] || [];
      
      if (editValue === '' || allowedGrades.includes(editValue)) {
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

  // Обработка вставки файлов через Ctrl+V в текстовое поле
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const newFiles: File[] = [];
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        // Фильтруем только изображения
        if (file && file.type.startsWith('image/')) {
          newFiles.push(file);
        }
      }
    }

    if (newFiles.length > 0) {
      e.preventDefault();
      setAttachedFiles(prev => [...prev, ...newFiles]);
      
      // Показываем уведомление о успешном добавлении
      console.log(`Добавлено изображений: ${newFiles.length}`);
    }
  };

  // Функция для загрузки файлов на сервер
  const uploadFiles = async (files: File[]): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    setUploadingFiles(true);
    
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        
        // Замените на ваш реальный endpoint для загрузки файлов
        const response = await fetch('http://localhost:8080/api/v1/upload/file', {
          method: 'POST',
          body: formData,
        });
        
        if (response.ok) {
          const result = await response.json();
          uploadedUrls.push(result.fileUrl);
        } else {
          console.error('Ошибка загрузки файла:', file.name);
        }
      }
    } catch (error) {
      console.error('Ошибка при загрузке файлов:', error);
    } finally {
      setUploadingFiles(false);
    }
    
    return uploadedUrls;
  };

  // Удаление прикрепленного файла
  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Обработчик выбора файлов через input
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setAttachedFiles(prev => [...prev, ...Array.from(files)]);
    }
    // Сбрасываем значение input, чтобы можно было выбрать те же файлы снова
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Сохранение комментария с прикрепленными файлами
  const handleSaveComment = async () => {
    if (!showCommentModal) return;

    try {
      let uploadedFileUrls: string[] = [];

      // Загружаем файлы, если они есть
      if (attachedFiles.length > 0) {
        uploadedFileUrls = await uploadFiles(attachedFiles);
      }

      // Обновляем запись с комментарием и ссылками на файлы
      updateGradeRecord(
        showCommentModal.studentId, 
        showCommentModal.date, 
        { 
          comment: commentText,
          attachments: uploadedFileUrls
        }
      );

      // Закрываем модальное окно и сбрасываем состояние
      setShowCommentModal(null);
      setCommentText('');
      setAttachedFiles([]);
      
    } catch (error) {
      console.error('Ошибка при сохранении комментария:', error);
    }
  };

  // Обработка двойного клика по теме
  const handleTopicDoubleClick = (date: string) => {
    setShowTopicModal(date);
    setTopicText(globalLessonTopics[date] || '');
  };

  // Сохранение темы занятия
  const handleSaveTopic = () => {
    if (showTopicModal) {
      setGlobalLessonTopics(prev => ({
        ...prev,
        [showTopicModal]: topicText
      }));
      
      // Обновляем тему у всех студентов для этой даты
      filteredStudents.forEach(student => {
        updateGradeRecord(student.id, showTopicModal, { topic: topicText });
      });
      
      setShowTopicModal(null);
      setTopicText('');
    }
  };

  // Начало редактирования преподавателя
  const handleTeacherEditStart = (subgroup: string) => {
    setEditingTeacher(subgroup);
    setTeacherEditValue(subgroupTeachers[subgroup]);
  };

  // Сохранение преподавателя
  const handleTeacherSave = () => {
    if (editingTeacher) {
      updateSubgroupTeacher(editingTeacher, teacherEditValue);
      setEditingTeacher(null);
      setTeacherEditValue('');
    }
  };

  // Отмена редактирования преподавателя
  const handleTeacherCancel = () => {
    setEditingTeacher(null);
    setTeacherEditValue('');
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
    filteredStudents.forEach(student => {
      updateExamRecord(student.id, { examType: examType as any });
    });
  };

  // Обработчик клика по кнопке "Выставить посещаемость"
  const handleSetAttendance = () => {
    if (onSetAttendance) {
      onSetAttendance();
    } else {
      // Если пропс не передан, показываем сообщение
      console.warn('Пропс не передан');
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
    
    if (grade === 'з') return 'grade-excellent';
    if (grade === 'нз') return 'grade-unsatisfactory';
    
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

  // Получение доступных оценок для текущего типа экзамена
  const getAvailableExamGrades = (examType: string) => {
    return examGrades[examType as keyof typeof examGrades] || [];
  };

  // Обработчик изменения оценки экзамена
  const handleExamGradeChange = (studentId: number, newGrade: string) => {
    updateExamRecord(studentId, { grade: newGrade });
  };

  // Обработчик клика по ячейке экзамена
  const handleExamCellClick = (studentId: number, currentGrade: string) => {
    if (globalExamType) {
      setEditingCell({ studentId, date: '', field: 'exam' });
      setEditValue(currentGrade);
    } else {
      alert('Сначала выберите тип экзамена в заголовке столбца');
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
              
              {/* Динамические колонки с датами */}
              {filteredDates.map((date, index) => (
                <th key={index} className="column-date" rowSpan={2}>
                  <div className="date-header">
                    {/* Тема занятия - редактируется по двойному клику через модальное окно */}
                    <div 
                      className={`topic-display ${globalLessonTopics[date] ? 'has-topic scrollable' : ''}`}
                      onDoubleClick={() => handleTopicDoubleClick(date)}
                      title={globalLessonTopics[date] 
                        ? `Тема: ${globalLessonTopics[date]}\nДвойное нажатие для редактирования` 
                        : 'Двойное нажатие для добавления темы'
                      }
                    >
                      <span className="topic-text">
                        {globalLessonTopics[date]}
                      </span>
                    </div>
                    
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
              const isEditingExam = editingCell?.studentId === student.id && editingCell?.field === 'exam';
              
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
                  
                  {/* Ячейки с оценками по датам */}
                  {filteredDates.map((date, dateIndex) => {
                    const record = getGradeRecord(student.id, date);
                    const isEditing = editingCell?.studentId === student.id && 
                                    editingCell?.date === date &&
                                    editingCell?.field === 'grade';
                    
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
                            {isEditing ? (
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
                              setAttachedFiles([]);
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
                        onClick={() => handleExamCellClick(student.id, examRecord.grade)}
                        style={{
                          backgroundColor: getGradeColor(examRecord.grade)
                        }}
                      >
                        {isEditingExam ? (
                          <select
                            ref={examInputRef}
                            value={editValue}
                            onChange={(e) => {
                              setEditValue(e.target.value);
                              handleExamGradeChange(student.id, e.target.value);
                            }}
                            onBlur={handleSaveEdit}
                            className="exam-grade-select"
                            style={{
                              backgroundColor: 'transparent',
                              border: 'none',
                              textAlign: 'center',
                              width: '100%',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="">-</option>
                            {getAvailableExamGrades(examRecord.examType).map(grade => (
                              <option key={grade} value={grade}>
                                {grade === 'з' ? 'з' : 
                                 grade === 'нз' ? 'нз' : 
                                 grade || '-'}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="exam-grade-value">
                            {examRecord.grade ? (
                              examRecord.grade === 'з' ? 'Зачет' : 
                              examRecord.grade === 'нз' ? 'Незачет' : 
                              examRecord.grade
                            ) : '-'}
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

  // Рендер модального окна комментария с прикреплением файлов
  const renderCommentModal = () => {
    if (!showCommentModal) return null;

    const record = getGradeRecord(showCommentModal.studentId, showCommentModal.date);
    const student = students.find(s => s.id === showCommentModal.studentId);

    // Функция для получения типа файла
    const getFileType = (file: File): string => {
      if (file.type.startsWith('image/')) {
        const type = file.type.split('/')[1]?.toUpperCase();
        return type || 'IMAGE';
      }
      return file.name.split('.').pop()?.toUpperCase() || 'FILE';
    };

    // Функция для создания превью изображения
    const createImagePreview = (file: File): string => {
      return URL.createObjectURL(file);
    };

    // Обработчик загрузки изображения для очистки URL
    const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
      const target = e.target as HTMLImageElement;
      URL.revokeObjectURL(target.src);
    };

    return (
      <div className="modal-overlay">
        <div className="modal-content comment-modal">
          <h3 style={{ marginBottom: '16px', color: '#002FA7' }}>
            Комментарий к оценке {student ? `${student.lastName} ${student.firstName[0]}.${student.middleName[0]}.` : ''}
          </h3>
          
          <div className="comment-textarea-container">
            <textarea
              ref={textareaRef}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onPaste={handlePaste}
              placeholder="Введите комментарий..."
              rows={4}
              className="comment-textarea"
            />
          </div>
          
          {/* Блок прикрепленных файлов */}
          <div className="attached-files-section">
            <div className="files-header">
              <span>Прикрепленные изображения ({attachedFiles.length})</span>
            </div>
            
            <div className="files-instruction">
              Используйте Ctrl+V в поле комментария для прикрепления изображений
            </div>
            
            {attachedFiles.length > 0 ? (
              <div className="files-list">
                {attachedFiles.map((file, index) => (
                  <div key={index} className="file-item">
                    <div className="image-preview-container">
                      {file.type.startsWith('image/') ? (
                        <>
                          <img 
                            src={createImagePreview(file)} 
                            alt="Превью" 
                            className="file-preview"
                            onLoad={handleImageLoad}
                          />
                          <div className="file-info">
                            <span className="file-name" title={file.name}>
                              {file.name}
                            </span>
                            <span className="file-type-badge">
                              {getFileType(file)}
                            </span>
                            <span className="file-size">
                              ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="file-info">
                          <span className="file-name" title={file.name}>
                            {file.name}
                          </span>
                          <span className="file-type-badge">
                            {getFileType(file)}
                          </span>
                          <span className="file-size">
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                      )}
                    </div>
                    <button 
                      type="button"
                      onClick={() => removeFile(index)}
                      className="remove-file-btn"
                      title="Удалить файл"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-files-placeholder">
                Изображения не прикреплены<br />
              </div>
            )}
          </div>
          
          <div className="modal-actions">
            <button 
              className="cancel-btn" 
              onClick={() => {
                setShowCommentModal(null);
                setCommentText('');
                setAttachedFiles([]);
              }}
              disabled={uploadingFiles}
              type="button"
            >
              Отмена
            </button>
            <button 
              className="gradient-btn" 
              onClick={handleSaveComment}
              disabled={uploadingFiles}
              type="button"
            >
              {uploadingFiles ? 'Загрузка...' : 'Сохранить'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Рендер модального окна темы занятия
  const renderTopicModal = () => {
    if (!showTopicModal) return null;

    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <h3>
            Тема занятия {showTopicModal}
          </h3>
          
          <textarea
            value={topicText}
            onChange={(e) => setTopicText(e.target.value)}
            placeholder="Введите тему занятия..."
            rows={4}
          />
          
          <div className="modal-actions">
            <button className="gradient-btn" onClick={handleSaveTopic}>
              Сохранить
            </button>
            <button className="cancel-btn" onClick={() => setShowTopicModal(null)}>
              Отмена
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Обработка состояния загрузки
  if (loading) {
    return (
      <div className="teacher-performance-section">
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
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          Загрузка списка студентов...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="teacher-performance-section">
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
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '40px', color: '#ef4444' }}>
          {error}
          <button 
            onClick={fetchStudents}
            style={{ marginTop: '10px', padding: '8px 16px' }}
          >
            Повторить попытку
          </button>
        </div>
      </div>
    );
  }

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
            <button className="gradient-btn set-attendance-btn" onClick={handleSetAttendance}>
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
          {/* Отображение преподавателя только при выборе конкретной подгруппы */}
          {selectedSubgroup !== 'all' && (
            <div className="filter-group teacher-display">
              {editingTeacher === selectedSubgroup ? (
                <div className="teacher-edit-container">
                  <input
                    ref={teacherInputRef}
                    type="text"
                    value={teacherEditValue}
                    onChange={(e) => setTeacherEditValue(e.target.value)}
                    onBlur={handleTeacherSave}
                    onKeyPress={(e) => e.key === 'Enter' && handleTeacherSave()}
                    className="teacher-edit-input"
                  />
                  <button 
                    className="teacher-save-btn"
                    onClick={handleTeacherSave}
                    title="Сохранить"
                  >
                    ✓
                  </button>
                  <button 
                    className="teacher-cancel-btn"
                    onClick={handleTeacherCancel}
                    title="Отмена"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div 
                  className="teacher-value"
                  onClick={() => handleTeacherEditStart(selectedSubgroup)}
                  title="Нажмите для редактирования"
                >
                  {subgroupTeachers[selectedSubgroup]}
                </div>
              )}
            </div>
          )}
          
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

      {/* Модальные окна */}
      {renderCommentModal()}
      {renderTopicModal()}
    </div>
  );
};