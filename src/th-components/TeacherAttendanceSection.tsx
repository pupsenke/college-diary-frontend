import React, { useState, useEffect, useRef, useCallback } from 'react';
import './TeacherAttendanceSection.css';
import { useCache } from '../context/CacheContext';
import { teacherApiService } from '../services/teacherApiService';
import { CacheWarning } from '../th-components/CacheWarning';

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

interface FilePreview {
  id: number;
  name: string;
  url: string;
  isImage: boolean;
}

const InfoIcon = (): React.ReactElement => (
  <div className="info-icon-btn" tabIndex={0}>
    <button className="header-btn" type="button">
      <span className="info-icon-text">i</span>
      <span>Информация</span>
    </button>
    <div className="info-tooltip large">
      <div className="info-tooltip-content">
        <div className="info-header">
          <div className="info-title">
            <h3>Управление посещаемостью</h3>
            <p>В этом разделе вы можете отмечать посещаемость студентов, указывать причины отсутствия и отслеживать статистику.</p>
          </div>
        </div>
        
        <div className="info-section">
          <h4>Основные возможности</h4>
          <div className="features-grid">
            <div className="feature-item">
              <span className="feature-icon"></span>
              <span>Отметка присутствия или отсутствия студента</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon"></span>
              <span>Указание причин отсутствия</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon"></span>
              <span>Фильтрация по периоду дат</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon"></span>
              <span>Просмотр статистики</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon"></span>
              <span>Информация о занятиях</span>
            </div>
          </div>
        </div>

        <div className="info-section">
          <h4>Статусы посещаемости</h4>
          <div className="statuses-grid">
            <div className="status-item">
              <div className="status-demo status-present">п</div>
              <div className="status-info">
                <span>Студент был на занятии</span>
              </div>
            </div>
            <div className="status-item">
              <div className="status-demo status-absent">у</div>
              <div className="status-info">
                <span>Отсутствие по уважительной причине</span>
              </div>
            </div>
            <div className="status-item">
              <div className="status-demo status-not">н</div>
              <div className="status-info">
                <span>Отсутствие без уважительной причины</span>
              </div>
            </div>
            <div className="status-item">
              <div className="status-demo status-empty">+</div>
              <div className="status-info">
                <span>Статус не установлен</span>
              </div>
            </div>
          </div>
        </div>

        <div className="info-section">
          <h4>Как использовать</h4>
          <div className="usage-steps">
            <div className="step">
              <span className="step-number">1</span>
              <span>Нажмите на ячейку с посещаемостью</span>
            </div>
            <div className="step">
              <span className="step-number">2</span>
              <span>Введите статус: <code>п</code>, <code>у</code> или <code>н</code></span>
            </div>
            <div className="step">
              <span className="step-number">3</span>
              <span>Для статуса <code>у</code> укажите причину отсутствия</span>
            </div>
            <div className="step">
              <span className="step-number">4</span>
              <span>Нажмите "Сохранить"</span>
            </div>
          </div>
        </div>

        <div className="info-tip">
          Используйте клавиши со стрелками для быстрой навигации по таблице
        </div>
      </div>
    </div>
  </div>
);

  const RefreshButton = ({ refreshing, onRefresh }: { 
    refreshing: boolean; 
    onRefresh: () => void; 
  }): React.ReactElement => (
    <button 
      className={`header-btn pc-refresh-btn ${refreshing ? 'pc-refreshing' : ''}`}
      onClick={onRefresh}
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

  const inputRef = useRef<HTMLInputElement>(null);

  const [lessonInfoModal, setLessonInfoModal] = useState<LessonInfoModalData>({
    isOpen: false,
    date: '',
    lessonNumber: 0,
    lessonInfo: null
  });

  const [loadingLessonInfo, setLoadingLessonInfo] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  const { isUsingCache, showCacheWarning, setShowCacheWarning, forceCacheCheck } = useCache();

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

      // СПОСОБ 1: Получаем информацию из эндпоинта lessons через teacherApiService
      const allLessons = await teacherApiService.getAllLessons();

      // Ищем занятие по ID
      const lesson = allLessons.find((l: any) => l.id === lessonId);

      if (lesson) {
        // Теперь используем idSchedule для получения информации из расписания
        const scheduleId = lesson.idSchedule;

        if (scheduleId) {
          // Получаем информацию из расписания через teacherApiService
          try {
            const allSchedules = await teacherApiService.getAllSchedules();
            
            const scheduleItem = allSchedules.find((item: any) => item.id === scheduleId);

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
          } catch (scheduleError) {
            console.error('Error fetching schedule info:', scheduleError);
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
      console.error('Error fetching lesson info:', error);
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
      console.error('Ошибка при загрузке данных посещаемости:', error);
      
      // Проверяем, является ли ошибка сетевой
      const isNetworkError = 
        error instanceof Error && (
          error.message?.includes('Failed to fetch') ||
          error.message?.includes('NetworkError') ||
          error.message?.includes('Network request failed') ||
          error.message?.includes('Превышено время ожидания') ||
          error.name === 'TypeError'
        );
      
      if (isNetworkError) {
        // Проверяем, есть ли кэшированные данные
        forceCacheCheck();
        
        setShowCacheWarning(true);
        
          setShowCacheWarning(true);
          console.log('Используются кэшированные данные посещаемости');
          
          // Пытаемся загрузить данные из кэша
          try {
            const cachedAttendance = localStorage.getItem(`cache_group_attendance_${groupNumber}_${idSt}_${teacherId}`);
            if (cachedAttendance) {
              const parsedData = JSON.parse(cachedAttendance);
            }
          } catch (cacheError) {
            console.error('Error loading cached attendance data:', cacheError);
          }
      }
      
      setAllDates([]);
      setAttendanceRecords([]);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  // Функция принудительного обновления данных
  const handleRefresh = async () => {
    await loadAttendanceData();
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
    <div className="teacher-performance-section">
      {/* Заголовок с кнопками управления */}
      <div className="attendance-cabinet-header">
        <div className="header-left-actions">
          {onBackToGroups && (
            <button className="back-button" onClick={onBackToGroups}>
              <img src="/th-icons/arrow_icon.svg" alt="Назад" />
            </button>
          )}
          <InfoIcon />
        </div>
        <RefreshButton 
          refreshing={refreshing} 
          onRefresh={handleRefresh} 
        />
      </div>

      {showCacheWarning && <CacheWarning />}

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
    </div>
  );
};