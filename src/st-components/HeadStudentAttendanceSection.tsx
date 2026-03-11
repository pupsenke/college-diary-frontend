import React, { useState, useEffect, useRef, useCallback } from 'react';
import './HeadStudentAttendanceSectionStyle.css';
import { teacherApiService } from '../services/teacherApiService';
import { apiService } from '../services/studentApiService';

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

interface SubjectOption {
  idSt: number;
  subjectName: string;
  teacherId: number;
  teacherName: string;
  groupId: number;
}

interface HeadStudentAttendanceSectionProps {
  studentId: number;
  groupNumber: string;
  onBack?: () => void;
}

const InfoIcon = (): React.ReactElement => (
  <div className="st-info-icon-btn" tabIndex={0}>
    <button className="st-header-btn" type="button">
      <span className="st-info-icon-text">i</span>
      <span>Информация</span>
    </button>
    <div className="st-info-tooltip large">
      <div className="st-info-tooltip-content">
        <div className="st-info-header">
          <div className="st-info-title">
            <h3>Управление посещаемостью (староста)</h3>
            <p>Как староста, вы можете отмечать посещаемость своей группы</p>
          </div>
        </div>
        
        <div className="st-info-section">
          <h4>Статусы посещаемости</h4>
          <div className="st-statuses-grid">
            <div className="st-status-item">
              <div className="st-status-demo st-status-present">п</div>
              <div className="st-status-info">
                <span>Студент был на занятии</span>
              </div>
            </div>
            <div className="st-status-item">
              <div className="st-status-demo st-status-absent">у</div>
              <div className="st-status-info">
                <span>Отсутствие по уважительной причине</span>
              </div>
            </div>
            <div className="st-status-item">
              <div className="st-status-demo st-status-not">н</div>
              <div className="st-status-info">
                <span>Отсутствие без уважительной причины</span>
              </div>
            </div>
            <div className="st-status-item">
              <div className="st-status-demo st-status-empty">+</div>
              <div className="st-status-info">
                <span>Статус не установлен</span>
              </div>
            </div>
          </div>
        </div>

        <div className="st-info-section">
          <h4>Как использовать</h4>
          <div className="st-usage-steps">
            <div className="st-step">
              <span className="st-step-number">1</span>
              <span>Выберите предмет из списка</span>
            </div>
            <div className="st-step">
              <span className="st-step-number">2</span>
              <span>Нажмите на ячейку с посещаемостью</span>
            </div>
            <div className="st-step">
              <span className="st-step-number">3</span>
              <span>Введите статус: <code>п</code>, <code>у</code> или <code>н</code></span>
            </div>
            <div className="st-step">
              <span className="st-step-number">4</span>
              <span>Для статуса <code>у</code> укажите причину отсутствия</span>
            </div>
            <div className="st-step">
              <span className="st-step-number">5</span>
              <span>Нажмите Enter для сохранения</span>
            </div>
          </div>
        </div>

        <div className="st-info-tip">
          Все изменения сразу сохраняются в системе
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
    className={`st-header-btn st-refresh-btn ${refreshing ? 'st-refreshing' : ''}`}
    onClick={onRefresh}
    disabled={refreshing}
  >
    <img 
      src="/st-icons/upload_icon.svg" 
      className={`st-refresh-icon ${refreshing ? 'st-refresh-spin' : ''}`}
      alt="Обновить"
    />
  </button>
);

// Компонент предупреждения о кэше
const SimpleCacheWarning = () => {
  const [show, setShow] = useState(true);
  
  if (!show) return null;
  
  return (
    <div className="st-cache-warning">
      <span>Используются кэшированные данные. Некоторые данные могут быть устаревшими.</span>
      <button onClick={() => setShow(false)}>×</button>
    </div>
  );
};

export const HeadStudentAttendanceSection: React.FC<HeadStudentAttendanceSectionProps> = ({
  studentId,
  groupNumber,
  onBack
}) => {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [allDates, setAllDates] = useState<string[]>([]);
  const [lessonsData, setLessonsData] = useState<Array<{date: string, lessonId: number}>>([]);
  const [editingCell, setEditingCell] = useState<{studentId: number, date: string, type: 'status'} | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showReasonModal, setShowReasonModal] = useState<{studentId: number, date: string} | null>(null);
  const [reasonText, setReasonText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [dateRange, setDateRange] = useState<{start: string; end: string}>({
    start: '',
    end: ''
  });
  const [showCacheWarning, setShowCacheWarning] = useState(false);
  const [isAlertShowing, setIsAlertShowing] = useState(false);
  
  // Состояния для выбора предмета
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<SubjectOption | null>(null);
  const [groupId, setGroupId] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const [lessonInfoModal, setLessonInfoModal] = useState<LessonInfoModalData>({
    isOpen: false,
    date: '',
    lessonNumber: 0,
    lessonInfo: null
  });

  const [loadingLessonInfo, setLoadingLessonInfo] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Функция для получения ID группы по номеру группы
  const fetchGroupId = async (): Promise<number | null> => {
    try {
      const groupData = await teacherApiService.getGroupByNumber(groupNumber);
      if (groupData && groupData.id) {
        setGroupId(groupData.id);
        return groupData.id;
      }
      return null;
    } catch (error) {
      console.error('Ошибка получения ID группы:', error);
      return null;
    }
  };

  // Функция для получения списка предметов группы
  const fetchSubjects = async (groupId: number) => {
    try {
      setLoadingSubjects(true);
      
      const studentMarks = await apiService.getStudentMarks(studentId);
      
      if (!studentMarks || studentMarks.length === 0) {
        setSubjects([]);
        return;
      }
      
      const subjectsList: SubjectOption[] = [];
      
      studentMarks.forEach((mark: any) => {
        const subjectDTO = mark.nameSubjectTeachersDTO || mark.stteachersDTO;
        
        if (subjectDTO && subjectDTO.idSt && subjectDTO.nameSubject) {
          const teachers = subjectDTO.teachers || [];
          let teacherId = 0;
          let teacherName = 'Не указан';
          
          if (teachers.length > 0) {
            const teacher = teachers[0];
            teacherId = teacher.idTeacher;
            
            const lastName = teacher.lastnameTeacher || '';
            const firstName = teacher.nameTeacher || '';
            const patronymic = teacher.patronymicTeacher || '';
            
            if (lastName && firstName) {
              const firstInitial = firstName.charAt(0);
              const patronymicInitial = patronymic ? patronymic.charAt(0) + '.' : '';
              teacherName = `${lastName} ${firstInitial}.${patronymicInitial}`.trim();
            } else {
              teacherName = lastName || 'Не указан';
            }
          }
          
          const exists = subjectsList.some(s => s.idSt === subjectDTO.idSt);
          
          if (!exists) {
            subjectsList.push({
              idSt: subjectDTO.idSt,
              subjectName: subjectDTO.nameSubject,
              teacherId: teacherId,
              teacherName: teacherName,
              groupId: groupId
            });
          }
        }
      });
      
      subjectsList.sort((a, b) => a.subjectName.localeCompare(b.subjectName, 'ru'));
      setSubjects(subjectsList);
      
      if (subjectsList.length > 0) {
        setSelectedSubject(subjectsList[0]);
      }
      
    } catch (error) {
      console.error('Ошибка получения списка предметов:', error);
      setSubjects([]);
    } finally {
      setLoadingSubjects(false);
    }
  };

  // Загрузка данных посещаемости для выбранного предмета
  const loadAttendanceData = async () => {
    if (!selectedSubject) return;
    
    try {
      setLoading(true);
      
      const { idSt, teacherId } = selectedSubject;
      
      const attendanceData = await teacherApiService.getGroupAttendance(groupNumber, idSt, teacherId);
      
      if (!attendanceData || attendanceData.length === 0) {
        setAllDates([]);
        setAttendanceRecords([]);
        setStudents([]);
        return;
      }
      
      const transformedStudents: Student[] = attendanceData.map((studentData: any) => ({
        id: studentData.idStudent,
        lastName: studentData.lastName || '',
        firstName: studentData.name || '',
        middleName: studentData.patronymic || '',
      }));
      
      const records: AttendanceRecord[] = [];
      const datesSet = new Set<string>();
      const lessonsMap = new Map<string, number>();
      
      attendanceData.forEach((studentData: any) => {
        if (!studentData.attendances || !Array.isArray(studentData.attendances)) {
          return;
        }
        
        studentData.attendances.forEach((attendance: any) => {
          if (!attendance.date || !attendance.idLesson) {
            return;
          }
          
          let dateKey: string;
          
          try {
            const dateObj = new Date(attendance.date);
            
            if (isNaN(dateObj.getTime())) {
              const dateParts = attendance.date.split('-');
              if (dateParts.length === 3) {
                dateKey = `${dateParts[2]}.${dateParts[1]} (${attendance.idLesson})`;
              } else {
                dateKey = `${attendance.date} (${attendance.idLesson})`;
              }
            } else {
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
      
      const isNetworkError = 
        error instanceof Error && (
          error.message?.includes('Failed to fetch') ||
          error.message?.includes('NetworkError') ||
          error.message?.includes('Network request failed') ||
          error.message?.includes('Превышено время ожидания') ||
          error.name === 'TypeError'
        );
      
      if (isNetworkError) {
        setShowCacheWarning(true);
      }
      
      setAllDates([]);
      setAttendanceRecords([]);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  // Загрузка данных при монтировании
  useEffect(() => {
    const initialize = async () => {
      const gid = await fetchGroupId();
      if (gid) {
        await fetchSubjects(gid);
      }
    };
    
    initialize();
  }, [groupNumber, studentId]);

  // Загрузка данных посещаемости при выборе предмета
  useEffect(() => {
    if (selectedSubject) {
      loadAttendanceData();
    }
  }, [selectedSubject]);

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
    
    if (dateStr.includes('.')) {
      const [day, month] = dateStr.split('.');
      const currentYear = new Date().getFullYear();
      return new Date(currentYear, parseInt(month) - 1, parseInt(day)).getTime();
    } else if (dateStr.includes('-')) {
      return new Date(dateStr).getTime();
    } else {
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
      return parseInt(match[1]);
    }
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

      const allLessons = await teacherApiService.getAllLessons();
      const lesson = allLessons.find((l: any) => l.id === lessonId);

      if (lesson) {
        const scheduleId = lesson.idSchedule;

        if (scheduleId) {
          try {
            const allSchedules = await teacherApiService.getAllSchedules();
            const scheduleItem = allSchedules.find((item: any) => item.id === scheduleId);

            if (scheduleItem) {
              return {
                numberWeek: lesson.numberWeek || 0,
                dayWeek: scheduleItem.dayWeek || 'Не указано',
                typeWeek: scheduleItem.typeWeek || 'Не указано',
                numPair: scheduleItem.numPair || 0,
                replacement: scheduleItem.replacement || false
              };
            }
          } catch (scheduleError) {
            console.error('Error fetching schedule info:', scheduleError);
          }
        }

        return {
          numberWeek: lesson.numberWeek || 0,
          dayWeek: 'Не указано',
          typeWeek: 'Не указано', 
          numPair: 0,
          replacement: false
        };
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

      const lessonInfo = await fetchLessonInfo(lessonNumber);
      
      setLessonInfoModal(prev => ({
        ...prev,
        lessonInfo
      }));
    } catch (error) {
      console.error('Error opening lesson info modal:', error);
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
      case 'п': return 'st-status-present';
      case 'у': return 'st-status-absent';
      case 'н': return 'st-status-not';
      default: return 'st-status-empty';
    }
  };

  // Функция принудительного обновления данных
  const handleRefresh = async () => {
    setRefreshing(true);
    if (selectedSubject) {
      await loadAttendanceData();
    }
    setRefreshing(false);
  };

  // Обработчик изменения предмета
  const handleSubjectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = parseInt(event.target.value);
    const subject = subjects.find(s => s.idSt === selectedId);
    if (subject) {
      setSelectedSubject(subject);
    }
  };

  // Обработка нажатий клавиш для навигации по таблице
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!editingCell || editingCell.type !== 'status') return;

      const currentStudentIndex = students.findIndex(s => s.id === editingCell.studentId);
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
          newStudentIndex = Math.min(students.length - 1, currentStudentIndex + 1);
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
            } else if (currentStudentIndex < students.length - 1) {
              newStudentIndex = currentStudentIndex + 1;
              newDateIndex = 0;
            }
          }
          break;
        default:
          return;
      }

      if (newStudentIndex !== currentStudentIndex || newDateIndex !== currentDateIndex) {
        const newStudent = students[newStudentIndex];
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
  }, [editingCell, students, filteredDates]);

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
    if (!selectedSubject) return;
    
    const lessonId = getLessonIdForDate(date);
    if (!lessonId) {
      console.error('Lesson ID not found for date:', date);
      return;
    }

    try {
      const updateRequest = {
        idLesson: lessonId,
        idTeacher: selectedSubject.teacherId,
        idStudent: studentId,
        status: updates.status || '',
        comment: updates.reason || ''
      };

      await teacherApiService.updateAttendance(updateRequest);

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
          return newRecords;
        } else {
          const status = (updates.status || '') as 'п' | 'у' | 'н' | '';
          
          const newRecord: AttendanceRecord = {
            id: Date.now() + Math.random(),
            studentId,
            date,
            status: status,
            reason: updates.reason,
            lessonId
          };
          return [...prev, newRecord];
        }
      });

    } catch (error) {
      console.error('Error updating attendance in API:', error);
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
    if (!editingCell || isAlertShowing) return;

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
            setEditingCell(null);
            setEditValue('');
            } else {
            await updateAttendanceRecord(
                editingCell.studentId, 
                editingCell.date, 
                { 
                status,
                reason: undefined
                }
            );
            setEditingCell(null);
            setEditValue('');
            }
            
        } catch (error) {
            console.error('Error saving attendance:', error);
            setEditingCell(null);
            setEditValue('');
        }
        } else {
        setEditingCell(null);
        setEditValue('');
        
        setIsAlertShowing(true);
        
        setTimeout(() => {
            alert('Неверный статус. Допустимые значения: п, у, н');
            setIsAlertShowing(false);
        }, 50);
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
        e.preventDefault(); 
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
    if (students.length === 0) return 0;
    
    const totalPercentage = students.reduce((sum, student) => {
      return sum + calculateAttendancePercentage(student.id);
    }, 0);
    
    return totalPercentage / students.length;
  };

  // Рендер модального окна информации о занятии
  const renderLessonInfoModal = (): React.ReactElement | null => {
    if (!lessonInfoModal.isOpen) return null;

    const { date, lessonNumber, lessonInfo } = lessonInfoModal;
    const displayDate = date.split(' (')[0];

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
      <div className="st-lesson-info-modal-overlay" onClick={handleCloseModal}>
        <div className="st-lesson-info-modal" onClick={(e) => e.stopPropagation()}>
          <div className="st-lesson-info-modal-header">
            <h3>Информация о занятии</h3>
            <button 
              className="st-lesson-info-modal-close"
              onClick={handleCloseModal}
            >
              ×
            </button>
          </div>

          <div className="st-lesson-info-modal-content">
            {loadingLessonInfo ? (
              <div className="st-lesson-info-loading">
                <div className="st-lesson-info-loading-spinner"></div>
                <div className="st-lesson-info-loading-text">Загрузка информации о занятии...</div>
              </div>
            ) : lessonInfo ? (
              <>
                <div className="st-lesson-details-info">
                  <div className="st-info-section-header">
                    Детали расписания
                  </div>
                  <div className="st-info-section-content">
                    <div className="st-info-grid-4">
                      <div className="st-info-grid-item">
                        <span className="st-info-grid-label">Номер недели</span>
                        <span className="st-info-grid-value">{lessonInfo.numberWeek || '—'}</span>
                      </div>
                      <div className="st-info-grid-item">
                        <span className="st-info-grid-label">День недели</span>
                        <span className="st-info-grid-value">{lessonInfo.dayWeek || '—'}</span>
                      </div>
                      <div className="st-info-grid-item">
                        <span className="st-info-grid-label">Тип недели</span>
                        <span className="st-info-grid-value">{lessonInfo.typeWeek || '—'}</span>
                      </div>
                      <div className="st-info-grid-item">
                        <span className="st-info-grid-label">Номер пары</span>
                        <span className="st-info-grid-value">{lessonInfo.numPair || '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="st-attendance-stats-section">
                  <div className="st-attendance-stats-header">
                    Статистика посещаемости
                  </div>
                  <div className="st-attendance-stats-content">
                    <div className="st-info-grid-4">
                      <div className="st-info-grid-item">
                        <span className="st-info-grid-label">Студентов</span>
                        <span className="st-info-grid-value">{attendanceStats.total}</span>
                      </div>
                      <div className="st-info-grid-item">
                        <span className="st-info-grid-label">Присутствовало</span>
                        <span className="st-info-grid-value">{attendanceStats.present}</span>
                      </div>
                      <div className="st-info-grid-item">
                        <span className="st-info-grid-label">Уважительно</span>
                        <span className="st-info-grid-value">{attendanceStats.absentWithReason}</span>
                      </div>
                      <div className="st-info-grid-item">
                        <span className="st-info-grid-label">Отсутствовало</span>
                        <span className="st-info-grid-value">{attendanceStats.absentWithoutReason}</span>
                      </div>
                    </div>
                    
                    <div 
                      className="st-attendance-percentage"
                      style={{
                        '--percentage': `${attendanceStats.percentage}%`
                      } as React.CSSProperties}
                    >
                      <div className="st-percentage-circle">
                        <div className="st-percentage-value">
                          {attendanceStats.percentage.toFixed(0)}%
                        </div>
                      </div>
                      <div className="st-percentage-label">
                        Общая посещаемость
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="st-lesson-info-no-data">
                <div className="st-lesson-info-no-data-icon"></div>
                <h4>Информация недоступна</h4>
                <p>Детальная информация о данном занятии не найдена в системе.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Рендер заголовка даты с кнопками управления
  const renderDateHeader = (date: string, index: number): React.ReactElement => {
    const lessonId = getLessonNumber(date);
    
    const dateParts = date.split(' (');
    const displayDate = dateParts[0];
    
    return (
      <th key={index} className="st-column-date">
        <div className="st-date-header-actions">
          <button 
            className="st-date-info-btn"
            onClick={() => handleOpenLessonInfoModal(date)}
            title="Информация о занятии"
          >
            ⋯
          </button>
        </div>
          
        <div className="st-dates-content">
          <div className="st-dates-title">
            {displayDate}
          </div>
          <div className="st-lesson-id">
            №{lessonId}
          </div>
        </div>
      </th>
    );
  };

  // Рендер таблицы
  const renderTable = () => {
    if (loading) {
      return <div className="st-loading-message">Загрузка данных посещаемости...</div>;
    }

    if (filteredDates.length === 0) {
      return <div className="st-no-data-message">Нет данных о занятиях для отображения</div>;
    }

    return (
      <div className="st-attendance-table-wrapper">
        <table className="st-attendance-table">
          <thead>
            <tr>
              <th className="st-column-number st-sticky-col">№</th>
              <th className="st-column-name st-sticky-col">ФИО</th>
              
              {filteredDates.map((date: string, index: number) => renderDateHeader(date, index))}
              
              <th className="st-column-percentage st-sticky-col-right"></th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, studentIndex) => {
              const attendancePercentage = calculateAttendancePercentage(student.id);
              
              return (
                <tr key={student.id}>
                  <td className="st-column-number st-sticky-col">
                    <div className="st-cell-number">{studentIndex + 1}</div>
                  </td>
                  <td className="st-column-name st-sticky-col">
                    <div className="st-cell-name">
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
                        className="st-column-date"
                      >
                        <div 
                          className={`st-cell-status-container ${isEditing ? 'st-editing' : ''}`}
                          onClick={() => handleCellClick(student.id, date, 'status', record.status)}
                        >
                          {isEditing && editingCell?.type === 'status' ? (
                            <div className="st-status-input-container">
                              <input
                                ref={inputRef}
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={handleSaveEdit}
                                onKeyPress={handleKeyPress}
                                maxLength={1}
                                className="st-status-input"
                                placeholder="п/у/н"
                              />
                            </div>
                          ) : (
                            <div className={`st-cell-status ${getStatusClass(record.status)}`}>
                              {record.status || '+'}
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  
                  <td className="st-column-percentage st-sticky-col-right">
                    <div 
                      className="st-cell-percentage"
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
    <div className="st-attendance-section">
      {/* Заголовок с кнопками управления */}
      <div className="st-attendance-cabinet-header">
        <div className="st-header-left-actions">
          {onBack && (
            <button className="st-back-button" onClick={onBack}>
              <img src="/th-icons/arrow_icon.svg" alt="Назад" />
            </button>
          )}
        </div>
        <div className="st-header-right-actions">
          <InfoIcon />
          <RefreshButton 
            refreshing={refreshing} 
            onRefresh={handleRefresh} 
          />
        </div>
      </div>

      {showCacheWarning && <SimpleCacheWarning />}

      {/* Основной заголовок */}
      <div className="st-attendance-header">
        <div className="st-attendance-title-container">
          <div className="st-attendance-title">
            <div className="st-group-title">
              Посещаемость {groupNumber}
            </div>
          </div>
        </div>
      </div>

      {/* Выбор предмета */}
      <div className="st-subject-selector-container">
        <div className="st-subject-selector">
          <label htmlFor="st-subject-select" className="st-subject-label">
            Предмет:
          </label>
          <select
            id="st-subject-select"
            value={selectedSubject?.idSt || ''}
            onChange={handleSubjectChange}
            disabled={loadingSubjects || subjects.length === 0}
            className="st-subject-select"
          >
            {loadingSubjects ? (
              <option value="">Загрузка предметов...</option>
            ) : subjects.length === 0 ? (
              <option value="">Нет доступных предметов</option>
            ) : (
              subjects.map(subject => (
                <option key={subject.idSt} value={subject.idSt}>
                  {subject.subjectName} ({subject.teacherName})
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Информация о выбранном предмете */}
      {selectedSubject && (
        <div className="st-subject-info">
          <div className="st-teacher-info">
            Преподаватель: <span className="st-teacher-name">{selectedSubject.teacherName}</span>
          </div>
        </div>
      )}

      {/* Фильтры */}
      <div className="st-attendance-filters">
        <div className="st-date-range-filter">
          <div className="st-date-range-group">
            <span className="st-date-range-label">Период с</span>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({...prev, start: e.target.value}))}
              className="st-date-range-input"
            />
          </div>
          <div className="st-date-range-group">
            <span className="st-date-range-label">по</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({...prev, end: e.target.value}))}
              className="st-date-range-input"
            />
          </div>
        </div>
      </div>

      {/* Таблица посещаемости */}
      <div className="st-attendance-table-container">
        {!selectedSubject ? (
          <div className="st-no-data-message">Выберите предмет для отображения посещаемости</div>
        ) : (
          renderTable()
        )}
        
        {/* Общий процент посещаемости группы */}
        {selectedSubject && students.length > 0 && (
          <div className="st-group-attendance-footer">
            <div className="st-group-attendance-percentage">
              <div className="st-percentage-label">Общая посещаемость группы</div>
              <div 
                className="st-percentage-circle"
                style={{
                  '--percentage': `${calculateGroupAttendancePercentage()}%`,
                  '--percentage-color': getPercentColor(calculateGroupAttendancePercentage())
                } as React.CSSProperties}
              >
                <div className="st-percentage-value">
                  {calculateGroupAttendancePercentage().toFixed(0)}%
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Модальное окно для причины отсутствия */}
      {showReasonModal && (
        <div className="st-modal-overlay">
          <div className="st-modal-content">
            <h3>Причина отсутствия</h3>
            <textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="Введите причину отсутствия..."
              rows={4}
              className="st-reason-textarea"
            />
            <div className="st-modal-actions">
              <button className="st-gradient-btn" onClick={handleSaveReason}>
                Сохранить
              </button>
              <button className="st-cancel-btn" onClick={() => setShowReasonModal(null)}>
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