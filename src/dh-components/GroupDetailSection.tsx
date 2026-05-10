// GroupDetailSection.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import './GroupDetailSectionStyle.css';
import { 
  headApiService, 
  GroupInfo as ApiGroupInfo,
  CuratorInfo,
  StudentInfo,
  SubjectTeacher,
  GroupMark,
  GroupAttendance,
  LessonDate
} from '../services/headApiService';
import StudentProfile from './StudentProfile';
import { getGradeColor } from '../utils/groupCalculations';
import { SelectCuratorModal } from './SelectCuratorModal';
import { cacheService } from '../services/cacheService';
import { CACHE_TTL } from '../services/cacheConstants';

interface GroupDetailSectionProps {
  groupId: number;
  onClose?: () => void;
  onGroupDeleted?: () => void;
}

// Хук для кешированной загрузки данных группы
function useCachedGroupData(groupId: number) {
  const [groupInfo, setGroupInfo] = useState<ApiGroupInfo | null>(null);
  const [curatorInfo, setCuratorInfo] = useState<CuratorInfo | null>(null);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const loadData = useCallback(async (ignoreCache = false) => {
    setLoading(true);
    setError(null);

    try {
      const groupCacheKey = `group_info_${groupId}`;
      const studentsCacheKey = `group_students_${groupId}`;
      const curatorCacheKey = `curator_info_${groupId}`;

      // Попытка загрузить из кеша
      if (!ignoreCache && !cacheService.isNetworkOnline()) {
        const cachedGroup = cacheService.get<ApiGroupInfo>(groupCacheKey, { ttl: CACHE_TTL.GROUP_INFO });
        const cachedStudents = cacheService.get<StudentInfo[]>(studentsCacheKey, { ttl: CACHE_TTL.GROUP_STUDENTS });
        const cachedCurator = cacheService.get<CuratorInfo>(curatorCacheKey, { ttl: CACHE_TTL.TEACHER_DATA });

        if (cachedGroup && cachedStudents) {
          setGroupInfo(cachedGroup);
          setStudents(cachedStudents);
          setCuratorInfo(cachedCurator || null);
          setFromCache(true);
          setLoading(false);
          return;
        }
        throw new Error('Нет кешированных данных');
      }

      // Загрузка свежих данных
      const groups = await headApiService.getGroups();
      const group = groups.find(g => g.id === groupId);
      
      if (!group) {
        throw new Error('Группа не найдена');
      }

      const groupData: ApiGroupInfo = {
        id: group.id,
        name: group.numberGroup.toString(),
        numberGroup: group.numberGroup,
        admissionYear: group.admissionYear,
        course: group.course,
        formEducation: group.formEducation,
        profile: group.profile,
        specialty: group.specialty,
        curatorId: group.idCurator
      };

      let curatorData: CuratorInfo | null = null;
      try {
        const curator = await headApiService.getCurator(group.idCurator);
        curatorData = {
          lastName: curator.lastName,
          name: curator.name,
          patronymic: curator.patronymic,
          email: curator.email
        };
      } catch (curatorError) {
        console.error('Ошибка при загрузке куратора:', curatorError);
      }

      const studentsData = await headApiService.getGroupStudents(groupId);

      // Сохраняем в кеш
      cacheService.set(groupCacheKey, groupData, { ttl: CACHE_TTL.GROUP_INFO });
      cacheService.set(studentsCacheKey, studentsData, { ttl: CACHE_TTL.GROUP_STUDENTS });
      if (curatorData) {
        cacheService.set(curatorCacheKey, curatorData, { ttl: CACHE_TTL.TEACHER_DATA });
      }

      setGroupInfo(groupData);
      setCuratorInfo(curatorData);
      setStudents(studentsData);
      setFromCache(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных группы');
      
      // Последняя попытка - кеш
      const groupCacheKey = `group_info_${groupId}`;
      const studentsCacheKey = `group_students_${groupId}`;
      const cachedGroup = cacheService.get<ApiGroupInfo>(groupCacheKey, { ttl: CACHE_TTL.GROUP_INFO });
      const cachedStudents = cacheService.get<StudentInfo[]>(studentsCacheKey, { ttl: CACHE_TTL.GROUP_STUDENTS });
      
      if (cachedGroup && cachedStudents) {
        setGroupInfo(cachedGroup);
        setStudents(cachedStudents);
        setFromCache(true);
        setError('Используются кешированные данные');
      }
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { groupInfo, curatorInfo, students, loading, error, fromCache, refetch: () => loadData(true) };
}

// Хук для кешированной загрузки данных успеваемости
function useCachedPerformanceData(groupId: number, subjectTeacher: SubjectTeacher | null) {
  const [marks, setMarks] = useState<GroupMark[]>([]);
  const [lessonDates, setLessonDates] = useState<LessonDate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const loadedRef = useRef(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadData = useCallback(async (ignoreCache = false) => {
    if (!subjectTeacher) return;
    if (loadedRef.current && !ignoreCache) return;
    
    setLoading(true);
    setError(null);

    try {
      const marksCacheKey = `group_marks_${groupId}_${subjectTeacher.subjectId}_${subjectTeacher.teacherId}`;
      const datesCacheKey = `group_lesson_dates_${groupId}_${subjectTeacher.subjectId}_${subjectTeacher.teacherId}`;

      // Если нет интернета - грузим из кеша и НЕ делаем фоновое обновление
      if (!isOnline) {
        const cachedMarks = cacheService.get<GroupMark[]>(marksCacheKey, { ttl: CACHE_TTL.MARKS_DATA });
        const cachedDates = cacheService.get<LessonDate[]>(datesCacheKey, { ttl: CACHE_TTL.LESSON_DATES });
        
        if (cachedMarks && cachedDates) {
          console.log(`[Performance] Загружено из кеша (офлайн) для ${subjectTeacher.subjectName}`);
          setMarks(cachedMarks);
          setLessonDates(cachedDates);
          setFromCache(true);
          setLoading(false);
          loadedRef.current = true;
          return;
        }
        throw new Error('Нет кешированных данных');
      }

      // Если есть интернет - загружаем свежие данные
      if (isOnline) {
        // Сначала проверяем кеш для быстрого отображения
        if (!ignoreCache) {
          const cachedMarks = cacheService.get<GroupMark[]>(marksCacheKey, { ttl: CACHE_TTL.MARKS_DATA });
          const cachedDates = cacheService.get<LessonDate[]>(datesCacheKey, { ttl: CACHE_TTL.LESSON_DATES });
          
          if (cachedMarks && cachedDates) {
            console.log(`[Performance] Быстрая загрузка из кеша для ${subjectTeacher.subjectName}`);
            setMarks(cachedMarks);
            setLessonDates(cachedDates);
            setFromCache(true);
            loadedRef.current = true;
            // Не возвращаем, продолжаем загрузку свежих данных в фоне
          }
        }

        console.log(`[Performance] Загрузка свежих данных для ${subjectTeacher.subjectName}`);
        const [freshMarks, freshDates] = await Promise.all([
          headApiService.getGroupMarksWithTeachers(groupId, subjectTeacher.subjectId, subjectTeacher.teacherId),
          headApiService.getLessonDatesBySubject(groupId, subjectTeacher.subjectId, subjectTeacher.teacherId)
        ]);

        setMarks(freshMarks);
        setLessonDates(freshDates);
        setFromCache(false);
        
        // Сохраняем в кеш
        cacheService.set(marksCacheKey, freshMarks, { ttl: CACHE_TTL.MARKS_DATA });
        cacheService.set(datesCacheKey, freshDates, { ttl: CACHE_TTL.LESSON_DATES });
        console.log(`[Performance] Данные сохранены в кеш для ${subjectTeacher.subjectName}`);
        loadedRef.current = true;
      }
    } catch (err) {
      console.error('[Performance] Ошибка:', err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных успеваемости');
      
      // При ошибке пытаемся загрузить из кеша
      const marksCacheKey = `group_marks_${groupId}_${subjectTeacher.subjectId}_${subjectTeacher.teacherId}`;
      const datesCacheKey = `group_lesson_dates_${groupId}_${subjectTeacher.subjectId}_${subjectTeacher.teacherId}`;
      const cachedMarks = cacheService.get<GroupMark[]>(marksCacheKey, { ttl: CACHE_TTL.MARKS_DATA });
      const cachedDates = cacheService.get<LessonDate[]>(datesCacheKey, { ttl: CACHE_TTL.LESSON_DATES });
      
      if (cachedMarks && cachedDates && marks.length === 0) {
        console.log(`[Performance] Использован кеш при ошибке для ${subjectTeacher.subjectName}`);
        setMarks(cachedMarks);
        setLessonDates(cachedDates);
        setFromCache(true);
        setError('Используются кешированные данные');
        loadedRef.current = true;
      }
    } finally {
      setLoading(false);
    }
  }, [groupId, subjectTeacher, isOnline]);

  useEffect(() => {
    if (subjectTeacher) {
      loadedRef.current = false;
      loadData();
    }
  }, [subjectTeacher, loadData]);

  return { marks, lessonDates, loading, error, fromCache, refetch: () => {
    loadedRef.current = false;
    loadData(true);
  }};
}

// Хук для кешированной загрузки данных посещаемости
function useCachedAttendanceData(groupId: number, subjectTeacher: SubjectTeacher | null) {
  const [attendance, setAttendance] = useState<GroupAttendance[]>([]);
  const [lessonDates, setLessonDates] = useState<LessonDate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const loadedRef = useRef(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadData = useCallback(async (ignoreCache = false) => {
    if (!subjectTeacher) return;
    if (loadedRef.current && !ignoreCache) return;
    
    setLoading(true);
    setError(null);

    try {
      const attendanceCacheKey = `group_attendance_${groupId}_${subjectTeacher.subjectId}_${subjectTeacher.teacherId}`;
      const datesCacheKey = `group_lesson_dates_attendance_${groupId}_${subjectTeacher.subjectId}_${subjectTeacher.teacherId}`;

      // Если нет интернета - грузим из кеша и НЕ делаем фоновое обновление
      if (!isOnline) {
        const cachedAttendance = cacheService.get<GroupAttendance[]>(attendanceCacheKey, { ttl: CACHE_TTL.ATTENDANCE_DATA });
        const cachedDates = cacheService.get<LessonDate[]>(datesCacheKey, { ttl: CACHE_TTL.LESSON_DATES });
        
        if (cachedAttendance && cachedDates) {
          console.log(`[Attendance] Загружено из кеша (офлайн) для ${subjectTeacher.subjectName}`);
          setAttendance(cachedAttendance);
          setLessonDates(cachedDates);
          setFromCache(true);
          setLoading(false);
          loadedRef.current = true;
          return;
        }
        throw new Error('Нет кешированных данных');
      }

      // Если есть интернет - загружаем свежие данные
      if (isOnline) {
        // Сначала проверяем кеш для быстрого отображения
        if (!ignoreCache) {
          const cachedAttendance = cacheService.get<GroupAttendance[]>(attendanceCacheKey, { ttl: CACHE_TTL.ATTENDANCE_DATA });
          const cachedDates = cacheService.get<LessonDate[]>(datesCacheKey, { ttl: CACHE_TTL.LESSON_DATES });
          
          if (cachedAttendance && cachedDates) {
            console.log(`[Attendance] Быстрая загрузка из кеша для ${subjectTeacher.subjectName}`);
            setAttendance(cachedAttendance);
            setLessonDates(cachedDates);
            setFromCache(true);
            loadedRef.current = true;
            // Не возвращаем, продолжаем загрузку свежих данных в фоне
          }
        }

        console.log(`[Attendance] Загрузка свежих данных для ${subjectTeacher.subjectName}`);
        const [freshAttendance, freshDates] = await Promise.all([
          headApiService.getGroupAttendanceWithTeachers(groupId, subjectTeacher.subjectId, subjectTeacher.teacherId),
          headApiService.getLessonDatesBySubject(groupId, subjectTeacher.subjectId, subjectTeacher.teacherId)
        ]);

        setAttendance(freshAttendance);
        setLessonDates(freshDates);
        setFromCache(false);
        
        // Сохраняем в кеш
        cacheService.set(attendanceCacheKey, freshAttendance, { ttl: CACHE_TTL.ATTENDANCE_DATA });
        cacheService.set(datesCacheKey, freshDates, { ttl: CACHE_TTL.LESSON_DATES });
        console.log(`[Attendance] Данные сохранены в кеш для ${subjectTeacher.subjectName}`);
        loadedRef.current = true;
      }
    } catch (err) {
      console.error('[Attendance] Ошибка:', err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных посещаемости');
      
      // При ошибке пытаемся загрузить из кеша
      const attendanceCacheKey = `group_attendance_${groupId}_${subjectTeacher.subjectId}_${subjectTeacher.teacherId}`;
      const datesCacheKey = `group_lesson_dates_attendance_${groupId}_${subjectTeacher.subjectId}_${subjectTeacher.teacherId}`;
      const cachedAttendance = cacheService.get<GroupAttendance[]>(attendanceCacheKey, { ttl: CACHE_TTL.ATTENDANCE_DATA });
      const cachedDates = cacheService.get<LessonDate[]>(datesCacheKey, { ttl: CACHE_TTL.LESSON_DATES });
      
      if (cachedAttendance && cachedDates && attendance.length === 0) {
        console.log(`[Attendance] Использован кеш при ошибке для ${subjectTeacher.subjectName}`);
        setAttendance(cachedAttendance);
        setLessonDates(cachedDates);
        setFromCache(true);
        setError('Используются кешированные данные');
        loadedRef.current = true;
      }
    } finally {
      setLoading(false);
    }
  }, [groupId, subjectTeacher, isOnline]);

  useEffect(() => {
    if (subjectTeacher) {
      loadedRef.current = false;
      loadData();
    }
  }, [subjectTeacher, loadData]);

  return { attendance, lessonDates, loading, error, fromCache, refetch: () => {
    loadedRef.current = false;
    loadData(true);
  }};
}

// Также обновите useCachedSubjects для корректного кеширования
function useCachedSubjects(groupId: number) {
  const [subjects, setSubjects] = useState<SubjectTeacher[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const loadedRef = useRef(false);
  const isOnline = useRef(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => { isOnline.current = true; };
    const handleOffline = () => { isOnline.current = false; };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadSubjects = useCallback(async (ignoreCache = false) => {
    if (loadedRef.current && !ignoreCache) return;
    
    setLoading(true);
    setError(null);

    try {
      const cacheKey = `group_subjects_${groupId}`;

      if (!ignoreCache) {
        const cached = cacheService.get<SubjectTeacher[]>(cacheKey, { ttl: CACHE_TTL.SUBJECT_TEACHERS });
        if (cached) {
          console.log(`[Subjects] Загружено из кеша для группы ${groupId}`);
          setSubjects(cached);
          setFromCache(true);
          setLoading(false);
          loadedRef.current = true;
          
          if (isOnline.current && !ignoreCache) {
            setTimeout(() => {
              loadSubjects(true);
            }, 100);
          }
          return;
        }
      }

      if (!isOnline.current && !ignoreCache) {
        throw new Error('Нет подключения к интернету');
      }

      console.log(`[Subjects] Загрузка свежих данных для группы ${groupId}`);
      const freshSubjects = await headApiService.getGroupSubjectsWithTeachers(groupId);
      setSubjects(freshSubjects);
      setFromCache(false);
      cacheService.set(cacheKey, freshSubjects, { ttl: CACHE_TTL.SUBJECT_TEACHERS });
      loadedRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки предметов');
      
      const cacheKey = `group_subjects_${groupId}`;
      const cached = cacheService.get<SubjectTeacher[]>(cacheKey, { ttl: CACHE_TTL.SUBJECT_TEACHERS });
      if (cached && subjects.length === 0) {
        setSubjects(cached);
        setFromCache(true);
      }
    } finally {
      setLoading(false);
    }
  }, [groupId, subjects.length]);

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  return { subjects, loading, error, fromCache, refetch: () => {
    loadedRef.current = false;
    loadSubjects(true);
  }};
}


// Заглушка для среднего балла
const getDemoAverage = (studentId: number): number => {
  // Генерируем случайный средний балл от 3 до 5
  const seed = studentId * 12345;
  const random = ((seed % 100) / 100) * 2 + 3;
  return Math.round(random * 100) / 100;
};

// Заглушка для процента посещаемости
const getDemoAttendancePercent = (studentId: number): number => {
  // Генерируем случайный процент от 70 до 100
  const seed = studentId * 67890;
  const random = ((seed % 100) / 100) * 30 + 70;
  return Math.round(random * 10) / 10;
};

export const GroupDetailSection: React.FC<GroupDetailSectionProps> = ({ groupId, onClose, onGroupDeleted }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'performance' | 'attendance'>('info');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCuratorModalOpen, setIsCuratorModalOpen] = useState(false);
  const [showAllStudents, setShowAllStudents] = useState(false);
  const [searchStudentTerm, setSearchStudentTerm] = useState('');
  
  // Состояния для предметов и фильтрации
  const [selectedSubjectTeacher, setSelectedSubjectTeacher] = useState<SubjectTeacher | null>(null);
  
  // Состояния для профиля студента
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [isStudentProfileOpen, setIsStudentProfileOpen] = useState(false);
  
  // Кешированные данные
  const { 
    groupInfo, 
    curatorInfo, 
    students, 
    loading, 
    error, 
    fromCache: groupFromCache,
    refetch: refetchGroup 
  } = useCachedGroupData(groupId);
  
  const { 
    subjects: subjectsWithTeachers, 
    loading: subjectsLoading,
    fromCache: subjectsFromCache
  } = useCachedSubjects(groupId);
  
  const { 
    marks: marksData, 
    lessonDates: performanceDates,
    loading: performanceLoading,
    fromCache: performanceFromCache
  } = useCachedPerformanceData(groupId, selectedSubjectTeacher);
  
  const { 
    attendance: attendanceData, 
    lessonDates: attendanceDates,
    loading: attendanceLoading,
    fromCache: attendanceFromCache
  } = useCachedAttendanceData(groupId, selectedSubjectTeacher);

  // Загрузка предметов при переключении на вкладки успеваемости/посещаемости
  useEffect(() => {
    if ((activeTab === 'performance' || activeTab === 'attendance') && subjectsWithTeachers.length > 0 && !selectedSubjectTeacher) {
      setSelectedSubjectTeacher(subjectsWithTeachers[0]);
    }
  }, [activeTab, subjectsWithTeachers, selectedSubjectTeacher]);

  const handleDeleteGroup = async () => {
    if (!groupInfo) return;
    
    const confirmed = window.confirm(
      `Вы уверены, что хотите удалить группу ${groupInfo.name}?\n\n` +
      `Это действие нельзя отменить. Все данные о студентах и успеваемости группы будут удалены.`
    );
    
    if (!confirmed) return;
    
    try {
      setIsDeleting(true);
      await headApiService.deleteGroup(groupId);
      
      // Очищаем кеш группы
      cacheService.remove(`group_info_${groupId}`);
      cacheService.remove(`group_students_${groupId}`);
      cacheService.remove(`curator_info_${groupId}`);
      cacheService.remove(`group_subjects_${groupId}`);
      
      alert(`Группа ${groupInfo.name} успешно удалена`);
      
      if (onGroupDeleted) {
        onGroupDeleted();
      }
      
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Ошибка при удалении группы:', error);
      alert('Не удалось удалить группу. Пожалуйста, попробуйте позже.');
    } finally {
      setIsDeleting(false);
    }
  };

// Заглушка для среднего балла группы - всегда 0
const getGroupAverage = (): number => {
  return 0;
};

// Заглушка для общей посещаемости группы - всегда 0
const getGroupAttendancePercent = (): number => {
  return 0;
};

// Получение оценки для студента (из реальных данных или кеша)
const getMarkForStudent = (studentId: number, lessonNumber: number): number | null => {
  if (marksData.length > 0) {
    const mark = marksData.find(m => m.studentId === studentId && m.lessonNumber === lessonNumber);
    return mark ? mark.mark : null;
  }
  return null;
};

// Получение статуса посещаемости (из реальных данных или кеша)
const getAttendanceStatus = (studentId: number, lessonId: number): string => {
  if (attendanceData.length > 0) {
    const attendance = attendanceData.find(a => a.studentId === studentId && a.lessonNumber === lessonId);
    return attendance?.status || '';
  }
  return '';
};

// Реальный средний балл студента
const getStudentAverage = (studentId: number): number => {
  if (marksData.length > 0) {
    const studentMarks = marksData.filter(m => m.studentId === studentId && m.mark !== null);
    if (studentMarks.length === 0) return 0;
    const sum = studentMarks.reduce((acc, m) => acc + (m.mark || 0), 0);
    return sum / studentMarks.length;
  }
  return 0;
};

// Реальный процент посещаемости студента
const getStudentAttendancePercent = (studentId: number): number => {
  if (attendanceData.length > 0 && attendanceDates.length > 0) {
    const studentAttendances = attendanceData.filter(a => a.studentId === studentId);
    if (studentAttendances.length === 0) return -1;
    const presentCount = studentAttendances.filter(a => a.status === 'п').length;
    return (presentCount / studentAttendances.length) * 100;
  }
  return -1;
};

  const handleStudentClick = (studentId: number) => {
    setSelectedStudentId(studentId);
    setIsStudentProfileOpen(true);
  };

  const handleCloseStudentProfile = () => {
    setIsStudentProfileOpen(false);
    setSelectedStudentId(null);
  };

  const getCuratorInitials = () => {
    if (!curatorInfo) return 'Не указан';
    return `${curatorInfo.lastName} ${curatorInfo.name.charAt(0)}.${curatorInfo.patronymic ? curatorInfo.patronymic.charAt(0) + '.' : ''}`;
  };

  const getStudentFullName = (student: StudentInfo) => {
    return `${student.lastName} ${student.name} ${student.patronymic}`;
  };

  const getStudentInitials = (student: StudentInfo) => {
    const nameInitial = student.name.charAt(0);
    const patronymicInitial = student.patronymic ? student.patronymic.charAt(0) : '';
    return `${nameInitial}${patronymicInitial}`;
  };

  const toggleShowAllStudents = () => {
    setShowAllStudents(!showAllStudents);
  };

  const filteredStudents = students.filter(student => {
    const fullName = getStudentFullName(student).toLowerCase();
    const searchTerm = searchStudentTerm.toLowerCase();
    return fullName.includes(searchTerm) || 
           student.email?.toLowerCase().includes(searchTerm) ||
           student.telephone?.includes(searchTerm);
  });

  const displayedStudents = showAllStudents ? filteredStudents : filteredStudents.slice(0, 5);

  // Получаем уникальные предметы для выбора
  const uniqueSubjects = subjectsWithTeachers.reduce((acc: SubjectTeacher[], item: SubjectTeacher) => {
    if (!acc.find(s => s.subjectId === item.subjectId)) {
      acc.push(item);
    }
    return acc;
  }, []);

  // Получаем преподавателей для выбранного предмета
  const teachersForSubject = subjectsWithTeachers.filter(
    s => s.subjectId === selectedSubjectTeacher?.subjectId
  );

  const handleSubjectChange = (subjectTeacher: SubjectTeacher | null) => {
    setSelectedSubjectTeacher(subjectTeacher);
  };

  const handleOpenCuratorModal = () => {
    setIsCuratorModalOpen(true);
  };

  const handleSelectCurator = async (staffId: number, staffFullName: string) => {
    if (!groupInfo) return;
    try {
      await headApiService.updateGroupCurator(groupInfo.id, staffId);
      // Инвалидируем кеш
      cacheService.remove(`group_info_${groupId}`);
      cacheService.remove(`curator_info_${groupId}`);
      await refetchGroup();
    } catch (error) {
      console.error('Ошибка при назначении куратора:', error);
      alert('Не удалось назначить куратора. Попробуйте позже.');
    } finally {
      setIsCuratorModalOpen(false);
    }
  };

  const isLoading = loading || (activeTab === 'performance' && performanceLoading) || (activeTab === 'attendance' && attendanceLoading);
  const isUsingCache = groupFromCache || subjectsFromCache || performanceFromCache || attendanceFromCache;

  if (loading) {
    return (
      <div className="dhm-group-detail-container">
        <div className="dhm-group-detail-loading">
          <div className="dhm-loading-spinner"></div>
          <p>Загрузка данных группы...</p>
        </div>
      </div>
    );
  }

  if (error && !groupInfo) {
    return (
      <div className="dhm-group-detail-container">
        <div className="dhm-group-detail-error">
          <p className="dhm-error-message">{error || 'Группа не найдена'}</p>
          <button 
            className="dhm-retry-button"
            onClick={() => window.location.reload()}
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  if (!groupInfo) return null;

  const groupAverage = getGroupAverage();
  const groupAttendance = getGroupAttendancePercent();

  return (
    <>
      <div className="dhm-group-detail-container">
        

        {/* Шапка группы */}
        <div className="dhm-group-detail-header">
          <div className="dhm-group-badge-large">{groupInfo.name}</div>
          <div className="dhm-group-subtitle">
            {groupInfo.course} курс • {students.length} студентов • {groupInfo.formEducation}
          </div>
          <button 
            className="dhm-modal-delete-btn"
            onClick={handleDeleteGroup}
            disabled={isDeleting}
          >
            {isDeleting ? 'Удаление...' : 'Удалить группу'}
          </button>
        </div>

        {/* Табы */}
        <div className="dhm-group-tabs">
          <button 
            className={`dhm-group-tab ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            Информация о группе
          </button>
          <button 
            className={`dhm-group-tab ${activeTab === 'performance' ? 'active' : ''}`}
            onClick={() => setActiveTab('performance')}
          >
            Успеваемость
          </button>
          <button 
            className={`dhm-group-tab ${activeTab === 'attendance' ? 'active' : ''}`}
            onClick={() => setActiveTab('attendance')}
          >
            Посещаемость
          </button>
        </div>

        <div className="dhm-group-detail-body">
          {/* Информационная вкладка */}
          {activeTab === 'info' && (
            <>
              <div className="dhm-group-main-info">
                <div className="dhm-group-details-grid">
                  <div className="dhm-detail-item">
                    <div className="dhm-detail-label">Куратор</div>
                    <div className="dhm-detail-value">{getCuratorInitials()}</div>
                    {curatorInfo?.email && (
                      <div className="dhm-detail-email">{curatorInfo.email}</div>
                    )}
                    <button 
                      className="dhm-choose-curator-btn"
                      onClick={handleOpenCuratorModal}
                    >
                      {curatorInfo ? 'Изменить куратора' : 'Выбрать куратора'}
                    </button>
                  </div>
                  <div className="dhm-detail-item">
                    <div className="dhm-detail-label">Специальность</div>
                    <div className="dhm-detail-value">{groupInfo.specialty}</div>
                  </div>
                  <div className="dhm-detail-item">
                    <div className="dhm-detail-label">Профиль</div>
                    <div className="dhm-detail-value">{groupInfo.profile}</div>
                  </div>
                  <div className="dhm-detail-item">
                    <div className="dhm-detail-label">Год поступления</div>
                    <div className="dhm-detail-value">{groupInfo.admissionYear}</div>
                  </div>
                </div>
              </div>

              {/* Метрики с заглушками 0 */}
              <div className="dhm-group-metrics">
                <div className="dhm-metric-card-small">
                  <div className="dhm-metric-label">Средний балл группы</div>
                  <div className="dhm-metric-value">0.00</div>
                  <div className="dhm-metric-note">ЗАГЛУШКА</div>
                </div>
                <div className="dhm-metric-card-small">
                  <div className="dhm-metric-label">Посещаемость группы</div>
                  <div className="dhm-metric-value">0.0%</div>
                  <div className="dhm-metric-note">ЗАГЛУШКА</div>
                </div>
              </div>

              <div className="dhm-group-section">
                <div className="dhm-section-header-small">
                  <h3 className="dhm-section-title">Список студентов</h3>
                </div>
                
                {showAllStudents && (
                  <div className="dhm-student-search-container">
                    <input
                      type="text"
                      className="dhm-search-input"
                      placeholder="Поиск по имени, фамилии, email или телефону..."
                      value={searchStudentTerm}
                      onChange={(e) => setSearchStudentTerm(e.target.value)}
                    />
                  </div>
                )}
                
                <div className="dhm-group-section-content">
                  {students.length > 0 ? (
                    <div className={`dhm-students-preview ${showAllStudents ? 'dhm-all-students' : ''}`}>
                      {displayedStudents.map((student) => (
                        <div 
                          key={student.id} 
                          className="dhm-student-item dhm-student-clickable"
                          onClick={() => handleStudentClick(student.id)}
                        >
                          <div className="dhm-student-avatar">
                            {getStudentInitials(student)}
                          </div>
                          <div className="dhm-student-info">
                            <div className="dhm-student-name">
                              {getStudentFullName(student)}
                            </div>
                            <div className="dhm-student-contact">
                              {student.email && (
                                <div className="dhm-student-email">
                                  <span className="dhm-contact-label">Email:</span> {student.email}
                                </div>
                              )}
                              {student.telephone && (
                                <div className="dhm-student-phone">
                                  <span className="dhm-contact-label">Тел:</span> {student.telephone}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {students.length > 5 && (
                        <button 
                          className="dhm-view-all-btn"
                          onClick={toggleShowAllStudents}
                        >
                          {showAllStudents ? 'Скрыть' : `Показать всех (${students.length})`}
                        </button>
                      )}
                      
                      {showAllStudents && filteredStudents.length === 0 && (
                        <div className="dhm-no-results">
                          <p>Студенты не найдены. Попробуйте другой поисковый запрос.</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="dhm-no-students">
                      <p>В группе нет студентов</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Вкладка успеваемости */}
          {activeTab === 'performance' && (
            <div className="dhm-performance-tab">
              {subjectsLoading ? (
                <div className="dhm-loading-small">
                  <div className="dhm-loading-spinner"></div>
                  <p>Загрузка списка предметов...</p>
                </div>
              ) : uniqueSubjects.length === 0 ? (
                <div className="dhm-no-data">
                  <p>Нет предметов для отображения</p>
                </div>
              ) : (
                <>
                  <div className="dhm-subject-selector">
                    <div className="dhm-select-group">
                      <label className="dhm-select-label">Предмет:</label>
                      <select
                        className="dhm-subject-select"
                        value={selectedSubjectTeacher?.subjectId || ''}
                        onChange={(e) => {
                          const subject = uniqueSubjects.find(s => s.subjectId === Number(e.target.value));
                          if (subject) {
                            const firstTeacher = subjectsWithTeachers.find(
                              s => s.subjectId === subject.subjectId
                            );
                            handleSubjectChange(firstTeacher || subject);
                          }
                        }}
                      >
                        {uniqueSubjects.map(subject => (
                          <option key={subject.subjectId} value={subject.subjectId}>
                            {subject.subjectName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="dhm-select-group">
                      <label className="dhm-select-label">Преподаватель:</label>
                      {teachersForSubject.length > 1 ? (
                        <select
                          className="dhm-subject-select"
                          value={selectedSubjectTeacher?.teacherId || ''}
                          onChange={(e) => {
                            const teacher = teachersForSubject.find(t => t.teacherId === Number(e.target.value));
                            handleSubjectChange(teacher || null);
                          }}
                        >
                          {teachersForSubject.map(teacher => (
                            <option key={teacher.teacherId} value={teacher.teacherId}>
                              {teacher.teacherLastName} {teacher.teacherName.charAt(0)}.
                              {teacher.teacherPatronymic ? teacher.teacherPatronymic.charAt(0) + '.' : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="dhm-teacher-display">
                          {teachersForSubject.length === 1 ? (
                            <span className="dhm-teacher-name">
                              {teachersForSubject[0].teacherLastName} {teachersForSubject[0].teacherName.charAt(0)}.
                              {teachersForSubject[0].teacherPatronymic ? teachersForSubject[0].teacherPatronymic.charAt(0) + '.' : ''}
                            </span>
                          ) : (
                            <span className="dhm-teacher-name">Преподаватель не назначен</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {isLoading ? (
                    <div className="dhm-loading-small">
                      <div className="dhm-loading-spinner"></div>
                      <p>Загрузка данных...</p>
                    </div>
                  ) : performanceDates.length === 0 ? (
                    <div className="dhm-no-data">
                      <p>Нет данных об оценках</p>
                    </div>
                  ) : (
                    <>
                      <div className="dhm-table-container">
                        <table className="dhm-data-table">
                          <thead>
                            <tr>
                              <th className="dhm-student-col">Студент</th>
                              <th className="dhm-average-col">Средний балл</th>
                              {performanceDates.map(lesson => (
                                <th key={lesson.number} className="dhm-date-col">
                                  {new Date(lesson.date).toLocaleDateString('ru-RU')}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {students.map(student => {
                              const studentAvg = getStudentAverage(student.id);
                              
                              return (
                                <tr key={student.id}>
                                  <td className="dhm-student-name">
                                    {getStudentFullName(student)}
                                  </td>
                                  <td className="dhm-average-cell">
                                    <div
                                      className="dhm-average-badge demo"
                                      style={{ backgroundColor: getGradeColor(studentAvg || null) }}
                                    >
                                      {studentAvg > 0 ? studentAvg.toFixed(2) : '-'}
                                    </div>
                                   </td>
                                  {performanceDates.map(lesson => {
                                    const mark = getMarkForStudent(student.id, lesson.number);
                                    
                                    return (
                                      <td key={lesson.number} className="dhm-mark-cell">
                                        <div
                                          className="dhm-mark demo"
                                          style={{ backgroundColor: getGradeColor(mark) }}
                                        >
                                          {mark !== null ? mark : '-'}
                                        </div>
                                       </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="dhm-group-average-footer">
                        <div className="dhm-group-average">
                          <div className="dhm-average-label">Средний балл группы</div>
                          <div
                            className="dhm-average-value demo"
                            style={{
                              backgroundColor: getGradeColor(groupAverage || null)
                            }}
                          >
                            {groupAverage > 0 ? groupAverage.toFixed(2) : '—'}
                            <span className="dhm-demo-badge">ЗАГЛУШКА</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* Вкладка посещаемости */}
          {activeTab === 'attendance' && (
            <div className="dhm-performance-tab">
              {subjectsLoading ? (
                <div className="dhm-loading-small">
                  <div className="dhm-loading-spinner"></div>
                  <p>Загрузка списка предметов...</p>
                </div>
              ) : uniqueSubjects.length === 0 ? (
                <div className="dhm-no-data">
                  <p>Нет предметов для отображения</p>
                </div>
              ) : (
                <>
                  <div className="dhm-subject-selector">
                    <div className="dhm-select-group">
                      <label className="dhm-select-label">Предмет:</label>
                      <select
                        className="dhm-subject-select"
                        value={selectedSubjectTeacher?.subjectId || ''}
                        onChange={(e) => {
                          const subject = uniqueSubjects.find(s => s.subjectId === Number(e.target.value));
                          if (subject) {
                            const firstTeacher = subjectsWithTeachers.find(
                              s => s.subjectId === subject.subjectId
                            );
                            handleSubjectChange(firstTeacher || subject);
                          }
                        }}
                      >
                        {uniqueSubjects.map(subject => (
                          <option key={subject.subjectId} value={subject.subjectId}>
                            {subject.subjectName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="dhm-select-group">
                      <label className="dhm-select-label">Преподаватель:</label>
                      {teachersForSubject.length > 1 ? (
                        <select
                          className="dhm-subject-select"
                          value={selectedSubjectTeacher?.teacherId || ''}
                          onChange={(e) => {
                            const teacher = teachersForSubject.find(t => t.teacherId === Number(e.target.value));
                            handleSubjectChange(teacher || null);
                          }}
                        >
                          {teachersForSubject.map(teacher => (
                            <option key={teacher.teacherId} value={teacher.teacherId}>
                              {teacher.teacherLastName} {teacher.teacherName.charAt(0)}.
                              {teacher.teacherPatronymic ? teacher.teacherPatronymic.charAt(0) + '.' : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="dhm-teacher-display">
                          {teachersForSubject.length === 1 ? (
                            <span className="dhm-teacher-name">
                              {teachersForSubject[0].teacherLastName} {teachersForSubject[0].teacherName.charAt(0)}.
                              {teachersForSubject[0].teacherPatronymic ? teachersForSubject[0].teacherPatronymic.charAt(0) + '.' : ''}
                            </span>
                          ) : (
                            <span className="dhm-teacher-name">Преподаватель не назначен</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {isLoading ? (
                    <div className="dhm-loading-small">
                      <div className="dhm-loading-spinner"></div>
                      <p>Загрузка данных...</p>
                    </div>
                  ) : attendanceDates.length === 0 ? (
                    <div className="dhm-no-data">
                      <p>Нет данных о посещаемости</p>
                    </div>
                  ) : (
                    <>
                      <div className="dhm-table-container">
                        <table className="dhm-data-table">
                          <thead>
                            <tr>
                              <th className="dhm-student-col">Студент</th>
                              <th className="dhm-average-col">% посещаемости</th>
                              {(() => {
                                const existingLessonIds = new Set<number>();
                                if (attendanceData.length > 0 && !attendanceFromCache) {
                                  attendanceData.forEach(att => {
                                    existingLessonIds.add(att.lessonNumber);
                                  });
                                }
                                
                                const filteredLessons = attendanceDates.filter(lesson => 
                                  existingLessonIds.size === 0 || existingLessonIds.has(lesson.lessonId)
                                );
                                
                                const uniqueLessons = filteredLessons.reduce((acc, current) => {
                                  const exists = acc.find(item => item.lessonId === current.lessonId);
                                  if (!exists) {
                                    acc.push(current);
                                  }
                                  return acc;
                                }, [] as LessonDate[]);
                                
                                return uniqueLessons.map(lesson => {
                                  const dateObj = new Date(lesson.date);
                                  const day = dateObj.getDate().toString().padStart(2, '0');
                                  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
                                  const year = (dateObj.getFullYear()).toString().slice(-2);
                                  const displayDate = `${day}.${month}.${year}`;
                                  
                                  return (
                                    <th key={lesson.lessonId} className="dhm-date-col">
                                      {displayDate}
                                    </th>
                                  );
                                });
                              })()}
                             </tr>
                          </thead>

                          <tbody>
                            {students.map(student => {
                              const studentAttendancePercent = getStudentAttendancePercent(student.id);
                              const hasData = studentAttendancePercent !== -1;
                              const displayPercent = hasData ? studentAttendancePercent.toFixed(1) + '%' : '-';
                              
                              const getPercentColor = (percent: number, hasData: boolean): string => {
                                if (!hasData) return '#9ca3af';
                                if (percent === 0) return '#ef4444';
                                if (percent >= 90) return '#2cbb00';
                                if (percent >= 75) return '#a5db28';
                                if (percent >= 60) return '#f59e0b';
                                return '#ef4444';
                              };
                              
                              const bgColor = hasData ? getPercentColor(studentAttendancePercent, true) : '#d1d5db';
                              
                              return (
                                <tr key={student.id}>
                                  <td className="dhm-student-name">
                                    {getStudentFullName(student)}
                                   </td>
                                  <td className="dhm-average-cell">
                                    <div
                                      className="dhm-average-badge demo"
                                      style={{ backgroundColor: bgColor, color: 'white' }}
                                    >
                                      {displayPercent}
                                    </div>
                                   </td>
                                  {(() => {
                                    const existingLessonIds = new Set<number>();
                                    if (attendanceData.length > 0 && !attendanceFromCache) {
                                      attendanceData.forEach(att => {
                                        existingLessonIds.add(att.lessonNumber);
                                      });
                                    }
                                    
                                    const filteredLessons = attendanceDates.filter(lesson => 
                                      existingLessonIds.size === 0 || existingLessonIds.has(lesson.lessonId)
                                    );
                                    
                                    const uniqueLessons = filteredLessons.reduce((acc, current) => {
                                      const exists = acc.find(item => item.lessonId === current.lessonId);
                                      if (!exists) {
                                        acc.push(current);
                                      }
                                      return acc;
                                    }, [] as LessonDate[]);
                                    
                                    return uniqueLessons.map(lesson => {
                                      const status = getAttendanceStatus(student.id, lesson.lessonId);
                                      
                                      const getStatusClass = (status: string): string => {
                                        switch (status) {
                                          case 'п': return 'dhm-status-present';
                                          case 'у': return 'dhm-status-absent';
                                          case 'н': return 'dhm-status-not';
                                          default: return 'dhm-status-empty';
                                        }
                                      };
                                      
                                      return (
                                        <td key={lesson.lessonId} className="dhm-mark-cell">
                                          <div className={`dhm-cell-status ${getStatusClass(status)} demo`}>
                                            {status || '-'}
                                          </div>
                                        </td>
                                      );
                                    });
                                  })()}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      
                      <div className="dhm-group-average-footer">
                        <div className="dhm-group-average">
                          <div className="dhm-average-label">Общая посещаемость группы</div>
                          <div
                            className="dhm-average-value demo"
                            style={{
                              backgroundColor: (() => {
                                const percent = getGroupAttendancePercent();
                                if (percent === 0) return '#ef4444';
                                if (percent >= 90) return '#2cbb00';
                                if (percent >= 75) return '#a5db28';
                                if (percent >= 60) return '#f59e0b';
                                return '#ef4444';
                              })(),
                              color: 'white'
                            }}
                          >
                            {getGroupAttendancePercent().toFixed(1)}%
                            <span className="dhm-demo-badge">ЗАГЛУШКА</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Модальное окно профиля студента */}
      {isStudentProfileOpen && selectedStudentId && (
        <div className="sp-modal-overlay" onClick={handleCloseStudentProfile}>
          <div className="sp-modal-content" onClick={(e) => e.stopPropagation()}>
            <StudentProfile 
              studentId={selectedStudentId}
              onClose={handleCloseStudentProfile}
              groupName={groupInfo?.name}
            />
          </div>
        </div>
      )}

      {isCuratorModalOpen && (
        <SelectCuratorModal
          onClose={() => setIsCuratorModalOpen(false)}
          onSelect={handleSelectCurator}
          currentCuratorId={groupInfo?.curatorId}
        />
      )}
    </>
  );
};