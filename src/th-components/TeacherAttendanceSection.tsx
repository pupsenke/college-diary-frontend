import React, { useState, useEffect, useRef, useCallback } from 'react';
import './TeacherAttendanceSection.css';
import { teacherApiService } from '../services/teacherApiService';

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
  status: 'п' | 'у' | 'н' | '';
  reason?: string;
  lessonId?: number;
}

export interface TeacherAttendanceSectionProps {
  groupNumber: string;
  subject: string;
  students?: Student[];
  idSt: number;
  teacherId: number;
  onBackToGroups?: () => void;
  onSetGrades?: () => void;
  onAttendanceUpdate?: (attendanceData: {
    records: AttendanceRecord[];
    percentage: number;
  }) => void;
}

interface AddDateModalData {
  isOpen: boolean;
  availableLessons: any[];
  selectedLesson: any | null;
}

interface DeleteDateModalData {
  isOpen: boolean;
  dateToDelete: string;
  lessonNumber: number;
}

interface LessonInfoModalData {
  isOpen: boolean;
  date: string;
  lessonNumber: number;
  lessonInfo: {
    numberWeek: number;
    dayWeek: string;
    typeWeek: string;
    numPair: number;
  } | null;
}

export const TeacherAttendanceSection: React.FC<TeacherAttendanceSectionProps> = ({
  groupNumber,
  subject,
  students: initialStudents = [],
  idSt,
  teacherId,
  onBackToGroups,
  onSetGrades,
  onAttendanceUpdate 
}) => {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [allDates, setAllDates] = useState<string[]>([]);
  const [lessonsData, setLessonsData] = useState<Array<{date: string, lessonId: number}>>([]);
  const [editingCell, setEditingCell] = useState<{studentId: number, date: string, type: 'status'} | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showReasonModal, setShowReasonModal] = useState<{studentId: number, date: string} | null>(null);
  const [reasonText, setReasonText] = useState('');
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [dateRange, setDateRange] = useState<{start: string; end: string}>({
    start: '',
    end: ''
  });
  const [refreshing, setRefreshing] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const [managingDate, setManagingDate] = useState(false);
  const [addDateModal, setAddDateModal] = useState<AddDateModalData>({
    isOpen: false,
    availableLessons: [],
    selectedLesson: null
  });

  const [deleteDateModal, setDeleteDateModal] = useState<DeleteDateModalData>({
    isOpen: false,
    dateToDelete: '',
    lessonNumber: 0
  });

  const [lessonInfoModal, setLessonInfoModal] = useState<LessonInfoModalData>({
    isOpen: false,
    date: '',
    lessonNumber: 0,
    lessonInfo: null
  });

  const [loadingLessonInfo, setLoadingLessonInfo] = useState(false);

  const filteredStudents = students;

  // Функция для извлечения чистой даты из формата "10.11 (539725)"
  const extractDateFromTableFormat = (tableDate: string): string => {
    if (tableDate.includes('.')) {
      return tableDate.split(' (')[0];
    }
    return tableDate;
  };

  // Вспомогательная функция для парсинга дат
  const parseDate = (dateStr: string): number => {
    if (!dateStr) return 0;
    
    // Для формата "10.11" (день.месяц)
    if (dateStr.includes('.')) {
      const [day, month] = dateStr.split('.');
      const currentYear = new Date().getFullYear();
      return new Date(currentYear, parseInt(month) - 1, parseInt(day)).getTime();
    } 
    // Для формата "2025-11-10"
    else if (dateStr.includes('-')) {
      return new Date(dateStr).getTime();
    }
    // Для других форматов
    else {
      return new Date(dateStr).getTime();
    }
  };

  // Фильтрация дат по выбранному диапазону
  const filteredDates = allDates.filter(date => {
    if (!dateRange.start && !dateRange.end) return true;
    
    const cleanDate = extractDateFromTableFormat(date);
    const currentDate = parseDate(cleanDate);
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

    // Компонент информационной иконки
    const InfoIcon = (): React.ReactElement => (
      <div className="info-icon-btn" tabIndex={0}>
        <button className="header-btn" type="button">
          <span className="info-icon-text">i</span>
          <span>Информация</span>
        </button>
        <div className="info-tooltip">
          <div className="info-tooltip-content">
            <p><strong>Управление посещаемостью</strong></p>
            <p>В этом разделе вы можете отмечать посещаемость студентов.</p>
            <p><strong>Статусы:</strong></p>
            <ul>
              <li><strong>п</strong> - присутствовал</li>
              <li><strong>у</strong> - отсутствовал по уважительной причине</li>
              <li><strong>н</strong> - отсутствовал</li>
            </ul>
            <p>Нажмите на ячейку для изменения статуса.</p>
            <p>Используйте кнопку "Обновить данные" для синхронизации с сервером.</p>
          </div>
        </div>
      </div>
    );
  
    // Компонент кнопки обновления
    const RefreshButton = (): React.ReactElement => (
      <button 
        className={`header-btn pc-refresh-btn ${refreshing ? 'pc-refreshing' : ''}`}
        onClick={handleRefresh}
        disabled={refreshing}
      >
        <img 
          src="/st-icons/upload_icon.svg" 
          className={`pc-refresh-icon ${refreshing ? 'pc-refresh-spin' : ''}`}
          alt="Обновить"
        />
        <span>{refreshing ? 'Обновление...' : 'Обновить данные'}</span>
      </button>
    );

  // Функция для получения номера занятия из даты
  const getLessonNumber = (date: string): number => {
    const match = date.match(/\((\d+)\)$/);
    if (match) {
      return parseInt(match[1]); // Это вернет idLesson (539725, 539726)
    }
    console.warn(`Could not extract lesson number from date: ${date}`);
    return 0;
  };

  // Функция для получения информации о занятии
  const fetchLessonInfo = async (lessonId: number): Promise<{
    numberWeek: number;
    dayWeek: string;
    typeWeek: string;
    numPair: number;
    replacement: boolean;
  } | null> => {
    try {
      setLoadingLessonInfo(true);

      // СПОСОБ 1: Получаем информацию из эндпоинта lessons
      const allLessons = await teacherApiService.getAllLessons();

      // Ищем занятие по ID
      const lesson = allLessons.find((l: any) => l.id === lessonId);

      if (lesson) {
        // Теперь используем idSchedule для получения информации из расписания
        const scheduleId = lesson.idSchedule;

        if (scheduleId) {
          // Получаем информацию из расписания
          const scheduleResponse = await fetch(`http://localhost:8080/api/v1/schedule`);
          if (scheduleResponse.ok) {
            const scheduleData = await scheduleResponse.json();
            
            const scheduleItem = scheduleData.find((item: any) => item.id === scheduleId);

            if (scheduleItem) {
              const lessonInfo = {
                numberWeek: lesson.numberWeek || 0,
                dayWeek: scheduleItem.dayWeek || 'Не указано',
                typeWeek: scheduleItem.typeWeek || 'Не указано',
                numPair: scheduleItem.numPair || 0,
                replacement: scheduleItem.replacement || false
              };
              return lessonInfo;
            }
          }
        }

        // Если не нашли в расписании, возвращаем базовую информацию из lessons
        const basicInfo = {
          numberWeek: lesson.numberWeek || 0,
          dayWeek: 'Не указано',
          typeWeek: 'Не указано', 
          numPair: 0,
          replacement: false
        };
        return basicInfo;
      }

      return null;

    } catch (error) {
      return null;
    } finally {
      setLoadingLessonInfo(false);
    }
  };

  // Функция для открытия модального окна с информацией о занятии
  const handleOpenLessonInfoModal = async (date: string): Promise<void> => {
    const lessonNumber = getLessonNumber(date);
    if (lessonNumber === 0) return;

    try {
      setLessonInfoModal({
        isOpen: true,
        date,
        lessonNumber,
        lessonInfo: null
      });

      // Загружаем информацию о занятии
      const lessonInfo = await fetchLessonInfo(lessonNumber);
      
      setLessonInfoModal(prev => ({
        ...prev,
        lessonInfo
      }));
    } catch (error) {
      console.error('Error opening lesson info modal:', error);
      setLessonInfoModal(prev => ({
        ...prev,
        lessonInfo: null
      }));
    }
  };

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
      case 'н': return 'status-not';
      default: return 'status-empty';
    }
  };

  // Функция для открытия модального окна добавления даты
  const handleOpenAddDateModal = async (): Promise<void> => {
    if (!idSt || !teacherId) {
      alert('Недостаточно данных для добавления даты');
      return;
    }

    setLoading(true);
    try {
      const groupId = teacherApiService.getGroupIdFromNumber(groupNumber);
      if (!groupId) {
        throw new Error('Не удалось определить ID группы');
      }

      const availableLessons = await teacherApiService.getLessonsForDateAddition(idSt, groupId, teacherId);
      
      setAddDateModal({
        isOpen: true,
        availableLessons: availableLessons || [],
        selectedLesson: null
      });
    } catch (error) {
      console.error('Error fetching available lessons:', error);
      alert('Не удалось загрузить доступные занятия для добавления');
    } finally {
      setLoading(false);
    }
  };

  // Функция для добавления столбца с датой
  const handleAddDateColumn = async (): Promise<void> => {
    if (!addDateModal.selectedLesson || !idSt || !teacherId) {
      alert('Выберите занятие для добавления');
      return;
    }

    setManagingDate(true);
    try {
      const groupId = teacherApiService.getGroupIdFromNumber(groupNumber);
      if (!groupId) {
        throw new Error('Не удалось определить ID группы');
      }

      const addRequest = {
        idGroup: groupId,
        idSt: idSt,
        idLesson: addDateModal.selectedLesson.id,
        idTeacher: teacherId
      };
      
      const result = await teacherApiService.addDateColumn(addRequest);
      
      if (result.success) {
        alert('Столбец с датой успешно добавлен');
        setAddDateModal({ isOpen: false, availableLessons: [], selectedLesson: null });
        
        teacherApiService.invalidateAttendanceCache();
        teacherApiService.invalidateLessonDatesCache();
        
        await loadAttendanceData();
      }
    } catch (error: any) {
      console.error('Error adding date column:', error);
      alert(`Ошибка при добавлении столбца: ${error.message}`);
    } finally {
      setManagingDate(false);
    }
  };

  // Функция для открытия модального окна удаления даты
  const handleOpenDeleteDateModal = (date: string, lessonNumber: number): void => {
    setDeleteDateModal({
      isOpen: true,
      dateToDelete: date,
      lessonNumber: lessonNumber
    });
  };

  // Функция для удаления столбца с датой
  const handleDeleteDateColumn = async (): Promise<void> => {
    if (!idSt || !teacherId) {
      alert('Недостаточно данных для удаления даты');
      return;
    }

    setManagingDate(true);
    try {
      const groupId = teacherApiService.getGroupIdFromNumber(groupNumber);
      if (!groupId) {
        throw new Error('Не удалось определить ID группы');
      }

      const deleteRequest = {
        idGroup: groupId,
        idSt: idSt,
        idTeacher: teacherId,
        number: deleteDateModal.lessonNumber
      };
      
      const result = await teacherApiService.deleteDateColumn(deleteRequest);
      
      if (result.success) {
        alert('Столбец с датой успешно удален');
        setDeleteDateModal({ isOpen: false, dateToDelete: '', lessonNumber: 0 });
        
        teacherApiService.invalidateAttendanceCache();
        teacherApiService.invalidateLessonDatesCache();
        
        await loadAttendanceData();
      }
    } catch (error: any) {
      console.error('Error deleting date column:', error);
      alert(`Ошибка при удалении столбца: ${error.message}`);
    } finally {
      setManagingDate(false);
    }
  };

  // Загрузка данных посещаемости
  const loadAttendanceData = async () => {
    try {
      setLoading(true);
      console.log('Loading attendance data for:', {
        groupNumber,
        idSt, 
        teacherId
      });
              
      // Получаем данные посещаемости
      const attendanceData = await teacherApiService.getGroupAttendance(groupNumber, idSt, teacherId);
      
      if (attendanceData && Array.isArray(attendanceData)) {
        if (attendanceData[0]) {
        }
      }
      
      // ПРОВЕРКА: Если данных нет
      if (!attendanceData || attendanceData.length === 0) {
        setAllDates([]);
        setAttendanceRecords([]);
        setStudents([]);
        return;
      }
      
      // ПРЕОБРАЗУЕМ ДАННЫЕ
      const transformedStudents: Student[] = attendanceData.map((studentData: any) => ({
        id: studentData.idStudent,
        lastName: studentData.lastName || '',
        firstName: studentData.name || '',
        middleName: studentData.patronymic || '',
      }));
      
      // Преобразуем данные API в формат записей посещаемости
      const records: AttendanceRecord[] = [];
      const datesSet = new Set<string>();
      const lessonsMap = new Map<string, number>();
      
      attendanceData.forEach((studentData: any) => {
        
        // ПРОВЕРКА: Есть ли attendances у студента
        if (!studentData.attendances || !Array.isArray(studentData.attendances)) {
          return;
        }
                
        studentData.attendances.forEach((attendance: any) => {

          // ПРОВЕРКА: Есть ли необходимые поля
          if (!attendance.date || !attendance.idLesson) {
            return;
          }
          
          // ПРАВИЛЬНОЕ ПРЕОБРАЗОВАНИЕ ДАТЫ
          let dateKey: string;
          
          try {
            // Пробуем разные форматы дат
            const dateObj = new Date(attendance.date);
            
            if (isNaN(dateObj.getTime())) {
              // Если Date не распарсил, пробуем ручной парсинг
              const dateParts = attendance.date.split('-');
              if (dateParts.length === 3) {
                dateKey = `${dateParts[2]}.${dateParts[1]} (${attendance.idLesson})`;
              } else {
                dateKey = `${attendance.date} (${attendance.idLesson})`;
              }
            } else {
              // Стандартный формат
              dateKey = dateObj.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit'
              }) + ` (${attendance.idLesson})`;
            }
          } catch (error) {
            dateKey = `${attendance.date} (${attendance.idLesson})`;
          }
                    
          datesSet.add(dateKey);
          lessonsMap.set(dateKey, attendance.idLesson);
          
          // Преобразуем null в пустую строку
          const status = (attendance.status === null ? '' : attendance.status) as 'п' | 'у' | 'н' | '';
          
          records.push({
            id: Date.now() + Math.random(),
            studentId: studentData.idStudent,
            date: dateKey,
            status: status,
            reason: attendance.comment || undefined,
            lessonId: attendance.idLesson
          });
        });
      });
      
      setAllDates(Array.from(datesSet).sort());
      setLessonsData(Array.from(lessonsMap, ([date, lessonId]) => ({ date, lessonId })));
      setAttendanceRecords(records);
      setStudents(transformedStudents);
              
    } catch (error) {
      setAllDates([]);
      setAttendanceRecords([]);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  // Функция принудительного обновления данных
  const handleRefresh = async (): Promise<void> => {
      console.log('Refresh button clicked');
    setRefreshing(true);
    try {
      console.log('Начало принудительного обновления данных...');
      
      // ИНВАЛИДИРУЕМ КЭШ ПЕРЕД ЗАГРУЗКОЙ
      teacherApiService.invalidateAttendanceCache();
      teacherApiService.invalidateStudentCache();
      teacherApiService.invalidateLessonDatesCache();
      
      // Добавляем небольшую задержку для гарантии инвалидации кэша
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await loadAttendanceData();
      console.log('Данные посещаемости успешно обновлены');
      
      // Показываем временное сообщение об успехе
      const refreshBtn = document.querySelector('.pc-refresh-btn');
      if (refreshBtn) {
        const originalText = refreshBtn.querySelector('span')?.textContent;
        const span = refreshBtn.querySelector('span');
        if (span) {
          span.textContent = 'Данные обновлены!';
          setTimeout(() => {
            if (span) {
              span.textContent = originalText || 'Обновить данные';
            }
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Ошибка при обновлении данных:', error);
      alert('Не удалось обновить данные. Пожалуйста, попробуйте еще раз.');
    } finally {
      setRefreshing(false);
    }
  };

  // Обработчик обновления данных посещаемости
  const handleAttendanceUpdate = useCallback((attendanceData: {
    records: AttendanceRecord[];
    percentage: number;
  }) => {
    if (onAttendanceUpdate) {
      onAttendanceUpdate(attendanceData);
    }
  }, [onAttendanceUpdate]);

  // В useEffect при обновлении записей посещаемости
  useEffect(() => {
    handleAttendanceUpdate({
      records: attendanceRecords,
      percentage: calculateGroupAttendancePercentage()
    });
  }, [attendanceRecords, filteredStudents, filteredDates, handleAttendanceUpdate]);

  // Загрузка данных при монтировании
  useEffect(() => {
    loadAttendanceData();
  }, [groupNumber, idSt, teacherId]);

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
            if (currentDateIndex > 0) {
              newDateIndex = currentDateIndex - 1;
            } else if (currentStudentIndex > 0) {
              newStudentIndex = currentStudentIndex - 1;
              newDateIndex = filteredDates.length - 1;
            }
          } else {
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
      status: '',
      lessonId: lessonsData.find(lesson => lesson.date === date)?.lessonId
    };
  };

  // Получение ID занятия для даты
  const getLessonIdForDate = (date: string): number | undefined => {
    return lessonsData.find(lesson => lesson.date === date)?.lessonId;
  };

  // Обновление записи посещаемости с сохранением в API
  const updateAttendanceRecord = async (studentId: number, date: string, updates: Partial<AttendanceRecord>) => {
    const lessonId = getLessonIdForDate(date);
    if (!lessonId) {
      console.error('Lesson ID not found for date:', date);
      return;
    }

    try {
      console.log('Updating attendance record:', {
        studentId,
        date,
        lessonId,
        updates,
        teacherId
      });

      // Формируем полный запрос с studentId
      const updateRequest = {
        idLesson: lessonId,
        idTeacher: teacherId,
        idStudent: studentId,
        status: updates.status || '',
        comment: updates.reason || ''
      };

      console.log('Sending update request:', updateRequest);

      // Отправляем запрос на обновление
      await teacherApiService.updateAttendance(updateRequest);

      // Обновляем локальное состояние только после успешного запроса
      setAttendanceRecords(prev => {
        const existingIndex = prev.findIndex(record => 
          record.studentId === studentId && record.date === date
        );
        
        if (existingIndex >= 0) {
          const newRecords = [...prev];
          newRecords[existingIndex] = { 
            ...newRecords[existingIndex], 
            ...updates,
            lessonId
          };
          console.log('Updated existing record:', newRecords[existingIndex]);
          return newRecords;
        } else {
          // Создаем новую запись
          const status = (updates.status || '') as 'п' | 'у' | 'н' | '';
          
          const newRecord: AttendanceRecord = {
            id: Date.now() + Math.random(),
            studentId,
            date,
            status: status,
            reason: updates.reason,
            lessonId
          };
          console.log('Created new record:', newRecord);
          return [...prev, newRecord];
        }
      });

      console.log('Attendance record successfully updated');

    } catch (error) {
      console.error('Error updating attendance in API:', error);
      
      // Показываем пользователю ошибку
      alert(`Ошибка при сохранении посещаемости: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      
      throw error;
    }
  };

  // Начало редактирования ячейки
  const handleCellClick = (studentId: number, date: string, type: 'status', currentValue: string) => {
    setEditingCell({ studentId, date, type });
    setEditValue(currentValue);
  };

  // Сохранение редактирования
  const handleSaveEdit = async () => {
    if (!editingCell) return;

    if (editingCell.type === 'status') {
      const lowerCaseValue = editValue.toLowerCase();

      const isValidStatus = (value: string): value is 'п' | 'у' | 'н' | '' => {
        return ['п', 'у', 'н', ''].includes(value);
      };
      
      if (isValidStatus(lowerCaseValue)) {
        const status = lowerCaseValue;
        const currentRecord = getAttendanceRecord(editingCell.studentId, editingCell.date);
        
        try {
          if (status === 'у') {
            setShowReasonModal({ 
              studentId: editingCell.studentId, 
              date: editingCell.date
            });
            setReasonText(currentRecord.reason || '');
          } else {
            // НЕМЕДЛЕННО обновляем статус
            await updateAttendanceRecord(
              editingCell.studentId, 
              editingCell.date, 
              { 
                status,
                reason: undefined
              }
            );
          }
          
          setEditingCell(null);
          setEditValue('');
          
        } catch (error) {
          console.error('Error saving attendance:', error);
        }
      } else {
        alert('Неверный статус. Допустимые значения: п, у, н');
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
  const handleSaveReason = async () => {
    if (showReasonModal) {
      try {
        await updateAttendanceRecord(
          showReasonModal.studentId, 
          showReasonModal.date, 
          { 
            status: 'у',
            reason: reasonText 
          }
        );
        setShowReasonModal(null);
        setReasonText('');
      } catch (error) {
        console.error('Error saving reason:', error);
        // Оставляем модальное окно открытым при ошибке
      }
    }
  };

  // Расчет процента посещаемости для студента
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

  // Расчет общего процента посещаемости группы
  const calculateGroupAttendancePercentage = (): number => {
    if (filteredStudents.length === 0) return 0;
    
    const totalPercentage = filteredStudents.reduce((sum, student) => {
      return sum + calculateAttendancePercentage(student.id);
    }, 0);
    
    return totalPercentage / filteredStudents.length;
  };

  // Вызываем колбэк при обновлении данных посещаемости
  useEffect(() => {
    const percentage = calculateGroupAttendancePercentage();
    if (onAttendanceUpdate) {
      onAttendanceUpdate({
        records: attendanceRecords,
        percentage: percentage
      });
    }
  }, [attendanceRecords, filteredStudents, filteredDates, onAttendanceUpdate]);

  // Обработчик клика по кнопке "Выставить оценки"
  const handleSetGrades = () => {
    if (onSetGrades) {
      onSetGrades();
    }
  };

  // Рендер модального окна информации о занятии
  const renderLessonInfoModal = (): React.ReactElement | null => {
    if (!lessonInfoModal.isOpen) return null;

    const { date, lessonNumber, lessonInfo } = lessonInfoModal;
    const displayDate = date.split(' (')[0];

    // Статистика посещаемости для этого занятия
    const getAttendanceStats = () => {
      const recordsForThisLesson = attendanceRecords.filter(record => 
        record.date === date
      );
      
      const totalStudents = recordsForThisLesson.length;
      const presentCount = recordsForThisLesson.filter(record => record.status === 'п').length;
      const absentWithReasonCount = recordsForThisLesson.filter(record => record.status === 'у').length;
      const absentWithoutReasonCount = recordsForThisLesson.filter(record => record.status === 'н').length;
      
      return {
        total: totalStudents,
        present: presentCount,
        absentWithReason: absentWithReasonCount,
        absentWithoutReason: absentWithoutReasonCount,
        percentage: totalStudents > 0 ? (presentCount / totalStudents) * 100 : 0
      };
    };

    const attendanceStats = getAttendanceStats();

    const handleCloseModal = (): void => {
      setLessonInfoModal({
        isOpen: false,
        date: '',
        lessonNumber: 0,
        lessonInfo: null
      });
    };

    return (
      <div className="lesson-info-modal-overlay" onClick={handleCloseModal}>
        <div className="lesson-info-modal" onClick={(e) => e.stopPropagation()}>
          <div className="lesson-info-modal-header">
            <h3>Информация о занятии</h3>
            <button 
              className="lesson-info-modal-close"
              onClick={handleCloseModal}
            >
              ×
            </button>
          </div>

          <div className="lesson-info-modal-content">
            {loadingLessonInfo ? (
              <div className="lesson-info-loading">
                <div className="lesson-info-loading-spinner"></div>
                <div className="lesson-info-loading-text">Загрузка информации о занятии...</div>
              </div>
            ) : lessonInfo ? (
              <>
                {/* Детальная информация - 4 одинаковых блока */}
                <div className="lesson-details-info">
                  <div className="info-section-header">
                    Детали расписания
                  </div>
                  <div className="info-section-content">
                    <div className="info-grid-4">
                      <div className="info-grid-item">
                        <span className="info-grid-label">Номер недели</span>
                        <span className="info-grid-value">{lessonInfo.numberWeek || '—'}</span>
                      </div>
                      <div className="info-grid-item">
                        <span className="info-grid-label">День недели</span>
                        <span className="info-grid-value">{lessonInfo.dayWeek || '—'}</span>
                      </div>
                      <div className="info-grid-item">
                        <span className="info-grid-label">Тип недели</span>
                        <span className="info-grid-value">{lessonInfo.typeWeek || '—'}</span>
                      </div>
                      <div className="info-grid-item">
                        <span className="info-grid-label">Номер пары</span>
                        <span className="info-grid-value">{lessonInfo.numPair || '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Статистика посещаемости - 4 одинаковых блока */}
                <div className="attendance-stats-section">
                  <div className="attendance-stats-header">
                    Статистика посещаемости
                  </div>
                  <div className="attendance-stats-content">
                    <div className="info-grid-4">
                      <div className="info-grid-item">
                        <span className="info-grid-label">Студентов</span>
                        <span className="info-grid-value">{attendanceStats.total}</span>
                      </div>
                      <div className="info-grid-item">
                        <span className="info-grid-label">Присутствовало</span>
                        <span className="info-grid-value">{attendanceStats.present}</span>
                      </div>
                      <div className="info-grid-item">
                        <span className="info-grid-label">Уважительно</span>
                        <span className="info-grid-value">{attendanceStats.absentWithReason}</span>
                      </div>
                      <div className="info-grid-item">
                        <span className="info-grid-label">Отсутствовало</span>
                        <span className="info-grid-value">{attendanceStats.absentWithoutReason}</span>
                      </div>
                    </div>
                    
                    {/* Процент посещаемости - отдельный блок снизу */}
                    <div 
                      className="attendance-percentage"
                      style={{
                        '--percentage': `${attendanceStats.percentage}%`
                      } as React.CSSProperties}
                    >
                      <div className="percentage-circle">
                        <div className="percentage-value">
                          {attendanceStats.percentage.toFixed(0)}%
                        </div>
                      </div>
                      <div className="percentage-label">
                        Общая посещаемость
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="lesson-info-no-data">
                <div className="lesson-info-no-data-icon"></div>
                <h4>Информация недоступна</h4>
                <p>Детальная информация о данном занятии не найдена в системе.</p>
              </div>
            )}

            <div className="lesson-info-actions">
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Рендер заголовка даты с кнопками управления
  const renderDateHeader = (date: string, index: number): React.ReactElement => {
    const lessonId = getLessonNumber(date);
    
    // Извлекаем дату и номер занятия для отображения
    const dateParts = date.split(' (');
    const displayDate = dateParts[0]; // Основная дата "10.11"
    const lessonNumber = dateParts[1] ? dateParts[1].replace(')', '') : '';
    
    return (
      <th key={index} className="column-date">
        <div className="date-header-actions">
        {/* Кнопка информации о занятии */}
        <button 
          className="date-infos-btn"
          onClick={() => handleOpenLessonInfoModal(date)}
          title="Информация о занятии"
        >
          ⋯
        </button>

          {/* Кнопка удаления даты */}
          <button 
            className="date-delete-btn"
            onClick={() => handleOpenDeleteDateModal(date, lessonId)}
            title="Удалить столбец с датой"
          >
            ×
          </button>
        </div>
          
        {/* ДАТА С ИНФОРМАЦИЕЙ О ЗАНЯТИИ */}
        <div className="dates-content">
          <div className="dates-title-new">
            {displayDate}
          </div>
          <div className="tas-lesson-id">
            №{lessonId}
          </div>
        </div>
      </th>
    );
  };

  // Рендер пустого столбца с "+" для добавления даты
  const renderAddDateColumn = (): React.ReactElement => {
    return (
      <th className="column-add-date">
        <div 
          className="add-date-column"
          onClick={handleOpenAddDateModal}
          title="Добавить столбец с датой"
        >
          <div className="add-date-plus">+</div>
        </div>
      </th>
    );
  };

  // Рендер модального окна добавления даты
  const renderAddDateModal = (): React.ReactElement | null => {
    if (!addDateModal.isOpen) return null;

    return (
      <div className="modal-overlay">
        <div className="modal-content add-date-modal">
          <h3>Добавить столбец с датой</h3>
          
          <div className="available-lessons-list">
            <h4>Доступные занятия:</h4>
            
            {addDateModal.availableLessons.length === 0 ? (
              <div className="no-lessons-message">
                Нет доступных занятий для добавления
              </div>
            ) : (
              <div className="lessons-grid">
                {addDateModal.availableLessons.map((lesson) => (
                  <div 
                    key={lesson.id}
                    className={`lesson-item ${addDateModal.selectedLesson?.id === lesson.id ? 'selected' : ''}`}
                    onClick={() => setAddDateModal(prev => ({
                      ...prev,
                      selectedLesson: lesson
                    }))}
                  >
                    <div className="lesson-date">
                      {new Date(lesson.date).toLocaleDateString('ru-RU')}
                    </div>
                    <div className="lesson-details">
                      <div className="lesson-day">{lesson.dayWeek}</div>
                      <div className="lesson-type">{lesson.typeWeek}</div>
                      <div className="lesson-pair">Пара: {lesson.numPair}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button 
              className="cancel-btn" 
              onClick={() => setAddDateModal({ isOpen: false, availableLessons: [], selectedLesson: null })}
              disabled={managingDate}
            >
              Отмена
            </button>
            <button 
              className="gradient-btn" 
              onClick={handleAddDateColumn}
              disabled={!addDateModal.selectedLesson || managingDate || addDateModal.availableLessons.length === 0}
            >
              {managingDate ? 'Добавление...' : 'Добавить столбец'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Рендер модального окна удаления даты
  const renderDeleteDateModal = (): React.ReactElement | null => {
    if (!deleteDateModal.isOpen) return null;

    return (
      <div className="modal-overlay">
        <div className="modal-content delete-date-modal">
          <h3>Удалить столбец с датой</h3>
          
          <div className="delete-confirmation">
            <p>Вы уверены, что хотите удалить столбец с датой?</p>
            <div className="date-to-delete">
              <strong>{deleteDateModal.dateToDelete}</strong>
            </div>
            <p className="warning-text">
              Внимание: Это действие нельзя отменить. Все данные посещаемости для этой даты будут удалены.
            </p>
          </div>

          <div className="modal-actions">
            <button 
              className="cancel-btn" 
              onClick={() => setDeleteDateModal({ isOpen: false, dateToDelete: '', lessonNumber: 0 })}
              disabled={managingDate}
            >
              Отмена
            </button>
            <button 
              className="delete-confirm-btn" 
              onClick={handleDeleteDateColumn}
              disabled={managingDate}
            >
              {managingDate ? 'Удаление...' : 'Удалить'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Рендер таблицы
  const renderTable = () => {
    if (loading) {
      return <div className="loading-message">Загрузка данных посещаемости...</div>;
    }

    if (filteredDates.length === 0) {
      return <div className="no-data-message">Нет данных о занятиях для отображения</div>;
    }

    return (
      <div className="attendance-table-wrapper">
        <table className="attendance-table">
          <thead>
            <tr>
              <th className="column-number sticky-col">№</th>
              <th className="column-name sticky-col">ФИО</th>
              
              {filteredDates.map((date: string, index: number) => renderDateHeader(date, index))}

              {/* Пустой столбец для добавления даты */}
              {renderAddDateColumn()}
              
              <th className="column-percentage sticky-col-right"></th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student, studentIndex) => {
              const attendancePercentage = calculateAttendancePercentage(student.id);
              
              return (
                <tr key={student.id}>
                  <td className="column-number sticky-col">
                    <div className="cell-number">{studentIndex + 1}</div>
                  </td>
                  <td className="column-name sticky-col">
                    <div className="cell-name">
                      {student.lastName} {student.firstName} {student.middleName}
                    </div>
                  </td>
                  
                  {filteredDates.map((date: string, dateIndex: number) => {
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
                                placeholder="п/у/н"
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

                  {/* Пустая ячейка для добавления даты */}
                  <td className="column-add-date">
                    <div className="add-date-cell-plus"></div>
                  </td>
                  
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
      {/* Заголовок с кнопками информации и обновления */}
      <div className="attendance-cabinet-header">
        <div className="header-left-actions">
          {onBackToGroups && (
            <button className="back-button" onClick={onBackToGroups}>
              <img src="/th-icons/arrow_icon.svg" alt="Назад" />
            </button>
          )}
          <InfoIcon />
        </div>
        <RefreshButton />
      </div>

      {/* Основной заголовок */}
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

      {/* Модальные окна */}
      {renderLessonInfoModal()}
      {renderAddDateModal()}
      {renderDeleteDateModal()}
    </div>
  );
};