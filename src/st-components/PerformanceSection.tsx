import React, { useState, useRef, useEffect, useCallback } from 'react';
import './PerformanceSectionStyle.css';
import { apiService, StudentMark, MarkInfo, Lesson, Supplement, MarkChange, Document } from '../services/studentApiService'; 
import { useUser, Student } from '../context/UserContext';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

interface PerformanceSectionProps {
  studentId: number;
}

interface SemesterInfo {
  number: number;
  name: string;
  value: 'first' | 'second';
}

interface GradeDetail {
  id: number;
  date: string;
  topic: string;
  grade: number;
  teacher: string;
  type: string;
  hasValue: boolean;
  stId?: number;
  realDate?: string;
}

interface Grade {
  id: number;
  subject: string;
  grades: number[];
  average: number;
  examGrade: number | null;
  gradeDetails?: GradeDetail[];
  teacher: string;
}
  const useBodyOverflow = (isHidden: boolean) => {
    useEffect(() => {
      if (isHidden) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'unset';
      }

      return () => {
        document.body.style.overflow = 'unset';
      };
    }, [isHidden]);
  };

export const PerformanceSection: React.FC<PerformanceSectionProps> = ({ 
  studentId
}) => {

  
  const [activeTab, setActiveTab] = useState<'semesters' | 'subjects' | 'analytics'>('semesters');
  const [selectedSemester, setSelectedSemester] = useState<'first' | 'second'>('first');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<{
    subject: string, 
    grade: number | null, 
    number: number, 
    topic: string, 
    teacher: string,
    stId?: number
  } | null>(null);
  const [studentMarks, setStudentMarks] = useState<StudentMark[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [error, setError] = useState<string | null>(null);
  const [isUsingCache, setIsUsingCache] = useState(false);
  const [semesters, setSemesters] = useState<SemesterInfo[]>([]);
  const [studentCourse, setStudentCourse] = useState<number>(1);
  const [markInfo, setMarkInfo] = useState<MarkInfo | null>(null);
  const [markInfoLoading, setMarkInfoLoading] = useState(false);
  const [activeMarkTab, setActiveMarkTab] = useState<'info' | 'history' | 'comments' | 'files'>('info');
  const [supplements, setSupplements] = useState<{ [key: number]: Supplement }>({});
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [addCommentMode, setAddCommentMode] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [allFiles, setAllFiles] = useState<Document[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [markFiles, setMarkFiles] = useState<Array<{
    id: number;
    name: string;
    date: string;
    author: string;
    type: string;
    documentInfo?: Document;
  }>>([]);
  const [editingComment, setEditingComment] = useState<{
    changeId: number;
    supplementId: number | null;
    currentComment: string;
  } | null>(null);
  const [newSupplementId, setNewSupplementId] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const [deletingComment, setDeletingComment] = useState<number | null>(null);
  const [markTypes, setMarkTypes] = useState<{[key: string]: string}>({});
  const [gradesData, setGradesData] = useState<Grade[]>([]);
  const [marksWithDates, setMarksWithDates] = useState<{[key: string]: string}>({});

  const { user } = useUser();
  useBodyOverflow(!!selectedGrade);

  // Функция загрузки данных с приоритетом API
  const fetchStudentData = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      setIsUsingCache(false);

      const marksData = await apiService.getStudentMarks(studentId);
      setStudentMarks(marksData ?? []);
      
    } catch (error) {
      console.error('Ошибка при загрузке данных с API:', error);
      
      try {
        const cacheKey = `marks_${studentId}`;
        const cached = localStorage.getItem(`cache_${cacheKey}`);
        
        if (cached) {
          const cachedData = JSON.parse(cached);
          // Проверяем актуальность кэша (10 минут)
          if (Date.now() - cachedData.timestamp < 10 * 60 * 1000) {
            setStudentMarks(cachedData.data ?? []);
            setIsUsingCache(true);
            setError('Используются кэшированные данные. Нет соединения с сервером.');
          } else {
            throw new Error('Кэш устарел');
          }
        } else {
          throw new Error('Нет данных в кэше');
        }
      } catch (cacheError) {
        console.error('Ошибка при загрузке из кэша:', cacheError);
        setError('Не удалось загрузить данные. Проверьте подключение к интернету.');
        setStudentMarks([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ДОБАВИТЬ функцию загрузки реальных дат
  const loadMarksRealDates = async () => {
    if (!studentMarks) return;

    const datesMap: {[key: string]: string} = {};
    const promises: Promise<void>[] = [];

    studentMarks.forEach(studentMark => {
      if (studentMark.marksBySt && studentMark.nameSubjectTeachersDTO) {
        const stId = studentMark.nameSubjectTeachersDTO.idSt;
        
        studentMark.marksBySt.forEach(mark => {
          if (mark && mark.number !== null && mark.number !== undefined && mark.value !== null) {
            const promise = apiService.getMarkColumnInfo(studentId, stId, mark.number)
              .then(columnInfo => {
                if (columnInfo.dateLesson) {
                  const markKey = `${stId}_${mark.number}`;
                  datesMap[markKey] = columnInfo.dateLesson;
                }
              })
              .catch(error => {
                console.warn(`Не удалось загрузить дату для оценки ${stId}_${mark.number}:`, error);
              });
            
            promises.push(promise);
          }
        });
      }
    });

    try {
      await Promise.all(promises);
      setMarksWithDates(datesMap);
    } catch (error) {
      console.error('Ошибка загрузки дат оценок:', error);
    }
  };

  // Функция для получения иконки файла
  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const icons: { [key: string]: string } = {
      'pdf': '📄',
      'doc': '📝',
      'docx': '📝',
      'xls': '📊',
      'xlsx': '📊',
      'jpg': '🖼️',
      'jpeg': '🖼️',
      'png': '🖼️',
      'zip': '📦',
      'rar': '📦'
    };
    return icons[extension || ''] || '📎';
  };

  const API_BASE_URL = 'http://localhost:8080/api/v1';

  // Функция для скачивания файла
  const handleDownloadFile = async (fileId: number, fileName: string, documentInfo?: Document) => {
    try {
      await apiService.downloadFileById(fileId, fileName);
    } catch (error) {
      console.error('Ошибка скачивания файла:', error);
      setError('Не удалось скачать файл');
    }
  };

  // Функция принудительного обновления
  const handleRefresh = async () => {
    const cacheKey = `marks_${studentId}`;
    localStorage.removeItem(`cache_${cacheKey}`);
    await fetchStudentData(true);
  };

  // Функция для загрузки детальной информации об оценке
  const loadMarkInfo = async (stId: number, markNumber: number) => {
    if (!stId) return;
    
    setMarkInfoLoading(true);
    try {
      const info = await apiService.getMarkInfo(studentId, stId, markNumber);
      
      // Если typeMark все еще отсутствует, попробуем получить информацию о колонке
      if (!info.typeMark) {
        try {
          const columnInfo = await apiService.getMarkColumnInfo(studentId, stId, markNumber);
          info.typeMark = columnInfo.typeMark;
        } catch (columnError) {
          console.warn('Не удалось получить тип работы:', columnError);
          info.typeMark = 'Работа'; // Значение по умолчанию
        }
      }
      
      setMarkInfo(info);
      
      // Загружаем supplements для изменений
      const supplementPromises = info.changes
        .filter(change => change.idSupplement)
        .map(async (change) => {
          try {
            const supplement = await apiService.getSupplement(change.idSupplement!);
            return { id: change.idSupplement!, data: supplement };
          } catch (error) {
            console.error(`Ошибка загрузки supplement ${change.idSupplement}:`, error);
            return null;
          }
        });
      
      const supplementsResults = await Promise.all(supplementPromises);
      const supplementsMap: { [key: number]: Supplement } = {};
      
      supplementsResults.forEach(result => {
        if (result && result.data) {
          supplementsMap[result.id] = result.data;
        }
      });
      
      setSupplements(supplementsMap);
      
    } catch (error) {
      console.error('Ошибка загрузки информации об оценке:', error);
      setMarkInfo(null);
    } finally {
      setMarkInfoLoading(false);
    }
  };

  // Функция для загрузки списка уроков
  const loadLessons = async () => {
    try {
      const lessonsData = await apiService.getLessons();
      setLessons(lessonsData);
    } catch (error) {
      console.error('Ошибка загрузки уроков:', error);
    }
  };

  // Функция для загрузки всех файлов
  const loadAllFiles = async () => {
    try {
      const filesData = await apiService.getAllDocuments();
      setAllFiles(filesData);
    } catch (error) {
      console.error('Ошибка загрузки файлов:', error);
    }
  };

  // Загрузка данных при монтировании
  useEffect(() => {
    const loadData = async () => {
      await fetchStudentData();
      await fetchStudentCourse();
      await loadAllFiles();
      await loadMarksRealDates(); 
    };
    
    loadData();
  }, [studentId]);

  // Загрузка типов работ после загрузки оценок
  useEffect(() => {
    if (studentMarks.length > 0) {
      loadMarkTypes();
    }
  }, [studentMarks]);

  useEffect(() => {
    if (selectedGrade && markInfo && activeMarkTab === 'comments') {
      loadFilesForMark();
    }
  }, [selectedGrade, markInfo, activeMarkTab]);

  const loadFilesForMark = async () => {
    const files = await getFilesForMark();
    setMarkFiles(files);
  };

  // Обновленный обработчик клика по оценке
  const handleGradeClick = async (
    subject: string, 
    grade: number | null, 
    gradeNumber: number, 
    topic: string, 
    teacher: string,
    stId?: number
  ) => {
    setSelectedGrade({ subject, grade, number: gradeNumber, topic, teacher, stId });
    setActiveMarkTab('info');
    setAddCommentMode(false);
    setNewComment('');
    setUploadingFiles([]);
    
    if (stId) {
      await loadMarkInfo(stId, gradeNumber);
    }
    
    // Загружаем уроки при открытии попапа
    await loadLessons();
  };

  const handleAddSupplement = async () => {
    if (!selectedGrade || !selectedGrade.stId) {
      console.error('Не выбрана оценка или отсутствует stId');
      setError('Не выбрана оценка для комментария');
      return;
    }
    
    try {
      
      // Сразу переключаем режим для мгновенного отклика UI
      setAddCommentMode(true);
      setNewComment('');
      setUploadingFiles([]);
      
      // Пробуем создать изменение
      let supplementId: number;
      
      try {
        supplementId = await apiService.addMarkChangeAndGetSupplementId(
          studentId, 
          selectedGrade.stId, 
          selectedGrade.number
        );
        console.log('Supplement создан с ID:', supplementId);
      } catch (apiError) {
        console.warn('API error, using fallback:', apiError);
        // Используем fallback - создаем временный ID для тестирования UI
        supplementId = Date.now();
        setError('Режим тестирования: комментарий не будет сохранен на сервере');
      }
      
      setNewSupplementId(supplementId);
      
    } catch (error) {
      console.error('Ошибка создания комментария:', error);
      setError('Не удалось начать добавление комментария');
      // В случае ошибки сбрасываем режим
      setAddCommentMode(false);
      setNewSupplementId(null);
    }
  };

  // Функция для загрузки типов работ для всех оценок
  const loadMarkTypes = async () => {
    if (!studentMarks || studentMarks.length === 0) return;

    try {
      const markTypesMap: {[key: string]: string} = {};
      const promises: Promise<void>[] = [];

      studentMarks.forEach(studentMark => {
        if (studentMark.marksBySt && studentMark.nameSubjectTeachersDTO) {
          const stId = studentMark.nameSubjectTeachersDTO.idSt;
          
          studentMark.marksBySt.forEach(mark => {
            if (mark && mark.number !== null && mark.number !== undefined) {
              const promise = apiService.getMarkColumnInfo(studentId, stId, mark.number)
                .then(columnInfo => {
                  const key = `${stId}_${mark.number}`;
                  markTypesMap[key] = columnInfo.typeMark || 'Работа';
                })
                .catch(error => {
                  console.warn(`Не удалось загрузить тип работы для stId ${stId}, markNumber ${mark.number}:`, error);
                  const key = `${stId}_${mark.number}`;
                  markTypesMap[key] = 'Работа';
                });
              
              promises.push(promise);
            }
          });
        }
      });

      await Promise.all(promises);
      setMarkTypes(markTypesMap);
      
    } catch (error) {
      console.error('Ошибка загрузки типов работ:', error);
    }
  };

  const handleSaveComment = async () => {
    if (!newSupplementId || !selectedGrade?.stId) {
      setError('Не удалось создать комментарий');
      return;
    }
    
    try {
      // Сохраняем комментарий если он есть
      if (newComment.trim()) {
        await apiService.updateSupplementComment(newSupplementId, newComment);
      }
      
      // Загружаем файлы если они есть
      if (uploadingFiles.length > 0) {
        await apiService.uploadSupplementFiles(newSupplementId, uploadingFiles);
      }
      
      // Обновляем информацию об оценке
      if (selectedGrade.stId) {
        await loadMarkInfo(selectedGrade.stId, selectedGrade.number);
      }
      
      // Сбрасываем состояние
      setNewSupplementId(null);
      setAddCommentMode(false);
      setNewComment('');
      setUploadingFiles([]);
      setError('');
      
    } catch (error) {
      console.error('Ошибка сохранения комментария:', error);
      setError('Не удалось сохранить комментарий');
    }
  };

  const handleCancelComment = async () => {
    if (!newSupplementId) {
      setAddCommentMode(false);
      setNewComment('');
      setUploadingFiles([]);
      return;
    }
    
    try {
      // Удаляем созданный supplement
      await apiService.deleteSupplement(newSupplementId);
      
      // Сбрасываем состояние
      setNewSupplementId(null);
      setAddCommentMode(false);
      setNewComment('');
      setUploadingFiles([]);
      
    } catch (error) {
      console.error('Ошибка удаления supplement:', error);
      setError('Не удалось отменить добавление комментария');
    }
  };

// Функция для обновления комментария
  const handleUpdateComment = async (changeId: number, supplementId: number | null) => {
    if (!selectedGrade?.stId) return;
    
    try {
      // Обновляем комментарий
      if (supplementId) {
        await apiService.updateSupplementComment(supplementId, newComment);
      }
      
      // Загружаем файлы если они есть
      if (uploadingFiles.length > 0 && supplementId) {
        await apiService.uploadSupplementFiles(supplementId, uploadingFiles);
      }
      
      // Перезагружаем информацию
      await loadMarkInfo(selectedGrade.stId, selectedGrade.number);
      
      setEditingComment(null);
      setNewComment('');
      setUploadingFiles([]);

    } catch (error) {
      console.error('Ошибка обновления комментария:', error);
      setError('Не удалось обновить комментарий');
    }
  };

  // Функция для начала редактирования комментария
  const handleEditComment = (changeId: number, supplementId: number | null, currentComment: string) => {
    setEditingComment({ 
      changeId, 
      supplementId, 
      currentComment 
    });
    setNewComment(currentComment);
    setUploadingFiles([]);
    setAddCommentMode(false);
    setMenuOpen(null);
  };

  const handleCancelEdit = () => {
    setEditingComment(null);
    setNewComment('');
    setUploadingFiles([]);
  };

  // Функция для удаления комментария
  const handleDeleteComment = async (changeId: number, supplementId: number | null) => {
    if (!selectedGrade?.stId) return;
    
    try {
      setDeletingComment(changeId);
      
      // Если есть supplement, удаляем его
      if (supplementId) {
        await apiService.deleteSupplement(supplementId);
      }
      
      // Перезагружаем информацию об оценке
      await loadMarkInfo(selectedGrade.stId, selectedGrade.number);
      
      // Закрываем меню
      setMenuOpen(null);
      
    } catch (error) {
      console.error('Ошибка удаления комментария:', error);
      setError('Не удалось удалить комментарий');
    } finally {
      setDeletingComment(null);
    }
  };

  // Функция для подтверждения удаления
  const confirmDeleteComment = (changeId: number, supplementId: number | null) => {
    if (window.confirm('Вы уверены, что хотите удалить этот комментарий?')) {
      handleDeleteComment(changeId, supplementId);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Проверяем, что клик был вне меню
      const target = event.target as HTMLElement;
      if (!target.closest('.pf-comment-menu')) {
        setMenuOpen(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);


  // Функция для обработки выбора файлов
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const filesArray = Array.from(event.target.files);
      setUploadingFiles(prev => [...prev, ...filesArray]);
    }
  };

  // Функция для удаления файла из списка загрузки
  const handleRemoveFile = (index: number) => {
    setUploadingFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Функция для форматирования даты
  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Функция для получения типа недели на русском
  const getWeekType = (typeWeek: string) => {
    const weekTypes: { [key: string]: string } = {
      'Верхняя': 'Верхняя',
      'Нижняя': 'Нижняя'
    };
    return weekTypes[typeWeek] || typeWeek;
  };

  // Функция для получения типа действия на русском
  const getActionType = (action: string) => {
    if (!action || typeof action !== 'string') return '';
    
    const trimmedAction = action.trim();
    if (trimmedAction.length === 0) return '';
    
    return trimmedAction.charAt(0).toUpperCase() + trimmedAction.slice(1);
  };

  const closeGradePopup = () => {
    setSelectedGrade(null);
    setMarkInfo(null);
    setSupplements({});
    setAddCommentMode(false);
    setNewComment('');
    setUploadingFiles([]);
  };

  // Обработчик клика по предмету - переключает на вкладку предметов
  const handleSubjectClick = (subjectName: string) => {
    setSelectedSubject(subjectName);
    setActiveTab('subjects');
  };

  // Преобразование данных из API
  const transformStudentMarksToGrades = useCallback((semesterType: 'first' | 'second'): Grade[] => {
    if (!studentMarks) return [];

    return studentMarks
      .filter(studentMark => studentMark && studentMark.nameSubjectTeachersDTO)
      .map((studentMark) => {
        const subjectId = studentMark.nameSubjectTeachersDTO?.idSubject;
        
        if (!subjectId) return null;

        const gradeDetails: GradeDetail[] = [];
        const validGrades: number[] = [];
        
        const teachers = studentMark.nameSubjectTeachersDTO?.teachers || [];
        const mainTeacher = teachers[0] || { 
          lastnameTeacher: 'Неизвестно', 
          nameTeacher: 'Н', 
          patronymicTeacher: 'П' 
        };
        
        const teacherString = `${mainTeacher.lastnameTeacher} ${mainTeacher.nameTeacher.charAt(0)}.${mainTeacher.patronymicTeacher.charAt(0)}.`;
        
        if (studentMark.marksBySt && Array.isArray(studentMark.marksBySt)) {
          studentMark.marksBySt.forEach((mark) => {
            if (mark && mark.number !== null && mark.number !== undefined) {
              if (getSemesterByWorkNumber(mark.number) === semesterType) {
                // Используем реальные даты из marksWithDates или генерируем
                const stId = studentMark.nameSubjectTeachersDTO.idSt;
                const markKey = `${stId}_${mark.number}`;
                const realDate = marksWithDates[markKey];
                
                const lessonDate = realDate ? new Date(realDate).toLocaleDateString('ru-RU') : getLessonDate(mark.number);
                
                // Получаем тип работы
                const markTypeKey = `${stId}_${mark.number}`;
                const markType = markTypes[markTypeKey] || getLessonTopic(mark.number);

                gradeDetails.push({
                  id: mark.number,
                  date: lessonDate,
                  topic: markType,
                  grade: mark.value || 0,
                  teacher: teacherString,
                  type: 'Работа',
                  hasValue: mark.value !== null && mark.value !== undefined,
                  stId: stId,
                  realDate: realDate
                });

                if (mark.value !== null && mark.value !== undefined) {
                  validGrades.push(mark.value);
                }
              }
            }
          });
        }

        gradeDetails.sort((a, b) => {
          // Сортируем по реальным датам если есть
          if (a.realDate && b.realDate) {
            return new Date(a.realDate).getTime() - new Date(b.realDate).getTime();
          }
          return a.id - b.id;
        });

        const average = validGrades.length > 0 
          ? validGrades.reduce((sum, grade) => sum + grade, 0) / validGrades.length 
          : 0;

        return {
          id: subjectId,
          subject: studentMark.nameSubjectTeachersDTO.nameSubject || 'Неизвестный предмет',
          grades: validGrades,
          average: parseFloat(average.toFixed(1)),
          examGrade: studentMark.certification,
          gradeDetails: gradeDetails,
          teacher: teacherString
        };
      })
      .filter(grade => grade !== null) as Grade[];
  }, [studentMarks, markTypes, marksWithDates]);

  useEffect(() => {
    if (studentMarks) {
      const transformed = transformStudentMarksToGrades(selectedSemester);
      setGradesData(transformed);
    }
  }, [studentMarks, selectedSemester, transformStudentMarksToGrades]);


  const getSemesterByWorkNumber = (workNumber: number): 'first' | 'second' => {
    if (workNumber === null || workNumber === undefined || isNaN(workNumber)) {
      return 'first';
    }
    return workNumber <= 24 ? 'first' : 'second';
  };

  const getLessonTopic = (markNumber: number, typeMark?: string): string => {
    if (markNumber === null || markNumber === undefined || isNaN(markNumber)) {
      return 'Тема не определена';
    }
    if (typeMark && typeMark.trim() !== '') {
      return typeMark;
    }
    return `Работа ${markNumber}`;
  };

  // ОБНОВИТЬ функцию getLessonDate
  const getLessonDate = (markNumber: number): string => {
    if (markNumber === null || markNumber === undefined || isNaN(markNumber)) {
      return '01.09.2024';
    }
    
    // Создаем реалистичные даты на основе текущего учебного года
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    
    // Определяем учебный год
    const academicYear = currentMonth >= 8 ? currentYear : currentYear - 1;
    
    if (selectedSemester === 'first') {
      // Первый семестр: сентябрь-декабрь
      const semesterStart = new Date(academicYear, 8, 1); // 1 сентября
      const lessonDate = new Date(semesterStart);
      lessonDate.setDate(semesterStart.getDate() + (markNumber - 1) * 7);
      
      // Не выходим за пределы декабря
      if (lessonDate.getMonth() > 11) {
        lessonDate.setMonth(11);
        lessonDate.setDate(31);
      }
      
      return lessonDate.toLocaleDateString('ru-RU');
    } else {
      // Второй семестр: январь-май следующего года
      const semesterStart = new Date(academicYear + 1, 0, 9); // 9 января
      const lessonDate = new Date(semesterStart);
      lessonDate.setDate(semesterStart.getDate() + (markNumber - 25) * 7);
      
      // Не выходим за пределы мая
      if (lessonDate.getMonth() > 4) {
        lessonDate.setMonth(4);
        lessonDate.setDate(31);
      }
      
      return lessonDate.toLocaleDateString('ru-RU');
    }
  };

  const subjects = gradesData.map(grade => grade.subject);

  // Обновляем gradesData при изменении markTypes
  useEffect(() => {
    // Принудительно обновляем данные при изменении типов работ
    if (Object.keys(markTypes).length > 0) {
      const updatedGrades = transformStudentMarksToGrades(selectedSemester);
      // Здесь можно обновить состояние, если нужно
    }
  }, [markTypes, selectedSemester]);

  // Статистика
  const calculatePerformanceStatistics = () => {
    let totalGrades = 0;
    let grade5 = 0;
    let grade4 = 0;
    let grade3 = 0;
    let grade2 = 0;
    let totalAverage = 0;
    let subjectsWithGrades = 0;

    // Проверяем что gradesData загружена
    if (!gradesData || gradesData.length === 0) {
      return {
        totalGrades: 0,
        grade5: 0,
        grade4: 0,
        grade3: 0,
        grade2: 0,
        overallAverage: 0,
        excellentPercentage: 0,
        totalSubjects: 0,
        subjectsWithGrades: 0
      };
    }

    gradesData.forEach(subject => {
      if (subject.grades.length > 0) {
        subjectsWithGrades++;
        subject.grades.forEach(grade => {
          totalGrades++;
          if (grade >= 5) grade5++;
          else if (grade >= 4) grade4++;
          else if (grade >= 3) grade3++;
          else grade2++;
        });
        totalAverage += subject.average;
      }
    });

    const overallAverage = subjectsWithGrades > 0 ? totalAverage / subjectsWithGrades : 0;
    
    // ИСПРАВЛЕННЫЙ РАСЧЕТ: процент оценок 4 и 5 от общего количества
    const excellentPercentage = totalGrades > 0 ? ((grade5 + grade4) / totalGrades) * 100 : 0;

    return {
      totalGrades,
      grade5,
      grade4,
      grade3,
      grade2,
      overallAverage: parseFloat(overallAverage.toFixed(1)),
      excellentPercentage: parseFloat(excellentPercentage.toFixed(1)), // Теперь будет корректный процент
      totalSubjects: gradesData.length,
      subjectsWithGrades
    };
  };

  const getGradeColor = (grade: number | null) => {
    if (grade === null) return '#d1d5db';
    if (grade >= 4) return '#2cbb00';
    if (grade >= 3) return '#f59e0b';
    if (grade >= 1) return '#ef4444';
    return '#d1d5db';
  };

  const getPerformanceColor = (average: number) => {
    if (average >= 4) return '#2cbb00';
    if (average >= 3) return '#f59e0b';
    return '#ef4444';
  };

  const statistics = calculatePerformanceStatistics();
  const selectedSubjectData = gradesData.find(grade => grade.subject === selectedSubject);

  // Данные для графиков
  const performanceData = [
    { subject: 'Отлично', count: statistics.grade5, color: '#2cbb00' },
    { subject: 'Хорошо', count: statistics.grade4, color: 'rgba(233, 245, 11, 1)' },
    { subject: 'Удовл.', count: statistics.grade3, color: '#f59e0b' },
    { subject: 'Неудовл.', count: statistics.grade2, color: '#ef4444' }
  ];

  const progressData = [
    { week: 'Нед. 1', average: 4.2 },
    { week: 'Нед. 2', average: 4.5 },
    { week: 'Нед. 3', average: 4.1 },
    { week: 'Нед. 4', average: 4.7 },
    { week: 'Нед. 5', average: 4.8 },
    { week: 'Нед. 6', average: 4.9 }
  ];

  // Функция для получения информации о курсе студента
  const fetchStudentCourse = async () => {
  // Приводим тип пользователя к Student для доступа к idGroup
  const student = user as Student;
  
  if (student?.idGroup) {
    try {
      const groupData = await apiService.getGroupData(student.idGroup);
      const course = groupData.course || 1;
      setStudentCourse(course);
      setSemesters(getSemestersByCourse(course));
    } catch (error) {
      console.error('Ошибка при загрузке данных группы:', error);
      setStudentCourse(1);
      setSemesters(getSemestersByCourse(1));
    }
  } else {
    // Если нет idGroup, используем курс по умолчанию
    setStudentCourse(1);
    setSemesters(getSemestersByCourse(1));
  }
  };

  // Функция для определения семестров по курсу
  const getSemestersByCourse = (course: number): SemesterInfo[] => {
    const semesterPairs = [
      { course: 1, semesters: [1, 2] },
      { course: 2, semesters: [3, 4] },
      { course: 3, semesters: [5, 6] },
      { course: 4, semesters: [7, 8] }
    ];
    
    const pair = semesterPairs.find(p => p.course === course) || semesterPairs[0];
    
    return pair.semesters.map(semesterNumber => ({
      number: semesterNumber,
      name: `${semesterNumber} семестр`,
      value: semesterNumber % 2 === 1 ? 'first' : 'second'
    }));
  };

  // Функция для получения всех файлов связанных с оценкой
  const getFilesForMark = async (): Promise<Array<{
    id: number;
    name: string;
    date: string;
    author: string;
    type: string;
    documentInfo?: Document;
    changeId?: number;
  }>> => {
    if (!markInfo) return [];

    try {
      // Получаем все документы для получения pathToFile
      const allDocuments = await apiService.getAllDocuments();
      const files: Array<{
        id: number;
        name: string;
        date: string;
        author: string;
        type: string;
        documentInfo?: Document;
        changeId?: number;
      }> = [];
      
      // Файлы из основной информации об оценке (уроке)
      if (markInfo.files) {
        markInfo.files.forEach(file => {
          const documentInfo = allDocuments.find(doc => doc.id === file.id);
          files.push({
            id: file.id,
            name: file.name,
            date: markInfo.dateLesson,
            author: `${markInfo.lastNameTeacher} ${markInfo.nameTeacher} ${markInfo.patronymicTeacher}`,
            type: 'lesson',
            documentInfo,
            changeId: undefined
          });
        });
      }
      
      // Файлы из истории изменений
      markInfo.changes.forEach(change => {
        // Файлы напрямую из changes
        if (change.files && Array.isArray(change.files)) {
          change.files.forEach((file: { id: number; name: string }) => {
            const documentInfo = allDocuments.find(doc => doc.id === file.id);
            files.push({
              id: file.id,
              name: file.name,
              date: change.dateTime,
              author: change.teacherOrStudent ? 'Преподаватель' : 'Студент',
              type: 'change',
              documentInfo,
              changeId: change.id
            });
          });
        }
        
        // Файлы из supplement (если есть)
        if (change.idSupplement && supplements[change.idSupplement]) {
          const supplement = supplements[change.idSupplement];
          if (supplement.files) {
            supplement.files.forEach(file => {
              const documentInfo = allDocuments.find(doc => doc.id === file.id);
              files.push({
                id: file.id,
                name: file.name,
                date: change.dateTime,
                author: change.teacherOrStudent ? 'Преподаватель' : 'Студент',
                type: 'supplement',
                documentInfo,
                changeId: change.id
              });
            });
          }
        }
      });

      return files;
    } catch (error) {
      console.error('Ошибка загрузки файлов:', error);
      return [];
    }
  };

  // Функция для расчета данных по типам оценок
  const calculateGradeTypesData = () => {
    const typeCount: { [key: string]: number } = {};
    
    gradesData.forEach(subject => {
      subject.gradeDetails?.forEach(detail => {
        if (detail.hasValue && detail.grade) {
          const type = detail.topic || 'Работа';
          typeCount[type] = (typeCount[type] || 0) + 1;
        }
      });
    });

    // Берем топ-5 типов оценок
    const topTypes = Object.entries(typeCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, value]) => ({
        name: name.length > 15 ? name.substring(0, 15) + '...' : name,
        value
      }));

    // Цвета для типов оценок
    const colors = ['#1e40af', '#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe'];
    
    return topTypes.map((item, index) => ({
      ...item,
      color: colors[index] || '#6b7280'
    }));
  };


  // Вспомогательная функция для получения номера недели (должна быть у вас уже)
  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNumber = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNumber;
  };


  // Рендер попапа с детальной информацией об оценке
  const renderGradePopup = () => {
    if (!selectedGrade) return null;


    return (
      <div className="pf-popup-overlay" onClick={closeGradePopup}>
        <div className="pf-popup pf-popup-large" onClick={(e) => e.stopPropagation()}>
          <div className="pf-popup-header">
            <h3>Детальная информация об оценке</h3>
            <button className="pf-popup-close" onClick={closeGradePopup}>
              <span>×</span>
            </button>
          </div>
          
          <div className="pf-popup-content">
            {/* Основная информация */}
            <div className="pf-grade-info-detailed">
              <div className="pf-grade-main-info">
                <div 
                  className="pf-grade-circle-large"
                  style={{ 
                    backgroundColor: getGradeColor(selectedGrade.grade),
                    borderColor: getGradeColor(selectedGrade.grade)
                  }}
                >
                  <span className="pf-grade-number-large">
                    {selectedGrade.grade || '-'}
                  </span>
                </div>
                <div className="pf-grade-basic-details">
                  <div className="pf-detail-item">
                    <span className="pf-detail-label">Предмет</span>
                    <span className="pf-detail-value">{selectedGrade.subject}</span>
                  </div>
                  <div className="pf-detail-item">
                    <span className="pf-detail-label">Преподаватель</span>
                    <span className="pf-detail-value pf-teacher">{selectedGrade.teacher}</span>
                  </div>
                </div>
              </div>

              {/* Навигация по вкладкам */}
              <div className="pf-mark-tabs">
                <button 
                  className={`pf-mark-tab ${activeMarkTab === 'info' ? 'pf-active' : ''}`}
                  onClick={() => setActiveMarkTab('info')}
                >
                  Информация
                </button>
                <button 
                  className={`pf-mark-tab ${activeMarkTab === 'comments' ? 'pf-active' : ''}`}
                  onClick={() => setActiveMarkTab('comments')}
                >
                  Комментарии и изменения
                </button>
              </div>

              {/* Контент вкладок */}
              <div className="pf-mark-tab-content">
                {markInfoLoading ? (
                  <div className="pf-loading-small">
                    <div className="pf-loading-spinner"></div>
                    <p>Загрузка информации...</p>
                  </div>
                ) : markInfo  ? (
                  <>
                    {/* Вкладка информации */}
                    {activeMarkTab === 'info' && (
                      <div className="pf-mark-info">
                        <div className="pf-info-grid">
                          <div className="pf-info-item">
                            <span className="pf-info-label">Дата занятия:</span>
                            <span className="pf-info-value">
                              {new Date(markInfo.dateLesson).toLocaleDateString('ru-RU')}
                            </span>
                          </div>
                          <div className="pf-info-item">
                            <span className="pf-info-label">Преподаватель:</span>
                            <span className="pf-info-value">
                              {markInfo.lastNameTeacher} {markInfo.nameTeacher} {markInfo.patronymicTeacher}
                            </span>
                          </div>
                          <div className="pf-info-item">
                            <span className="pf-info-label">Неделя:</span>
                            <span className="pf-info-value">{markInfo.numberWeek} ({getWeekType(markInfo.typeWeek)})</span>
                          </div>
                          <div className="pf-info-item">
                            <span className="pf-info-label">День недели:</span>
                            <span className="pf-info-value">{markInfo.dayWeek}</span>
                          </div>
                          <div className="pf-info-item">
                            <span className="pf-info-label">Пара:</span>
                            <span className="pf-info-value">{markInfo.numPair}</span>
                          </div>
                          <div className="pf-info-item">
                            <span className="pf-info-label">Тип работы:</span>
                            <span className="pf-info-value">
                              {markInfo?.typeMark || selectedSubjectData?.gradeDetails?.find(detail => 
                                detail.id === selectedGrade?.number
                              )?.topic || 'Работа'}
                            </span>
                          </div>
                          
                          {/* Комментарий к уроку */}
                          {markInfo.comment && (
                            <div className="pf-info-item pf-info-fullwidth">
                              <span className="pf-info-label">Комментарий к уроку:</span>
                              <span className="pf-info-value pf-info-comment">{markInfo.comment}</span>
                            </div>
                          )}
                          
                          {/* Файлы урока */}
                          {markInfo.files && markInfo.files.length > 0 && (
                            <div className="pf-info-item pf-info-fullwidth">
                              <span className="pf-info-label">Файлы урока:</span>
                              <div className="pf-lesson-files">
                                {markInfo.files.map((file) => (
                                  <div key={file.id} className="pf-lesson-file-item">
                                    <div className="pf-lesson-file-info">
                                      <span className="pf-lesson-file-icon">
                                        {getFileIcon(file.name)}
                                      </span>
                                      <span className="pf-lesson-file-name">{file.name}</span>
                                    </div>
                                    <div className="pf-lesson-file-actions">
                                      <button 
                                        className="pf-download-file-btn"
                                        onClick={() => handleDownloadFile(file.id, file.name)}
                                        title="Скачать"
                                      >
                                        Скачать
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {activeMarkTab === 'comments' && (
                      <div className="pf-mark-comments">
                        {/* Секция комментариев с файлами из истории изменений */}
                        <div className="pf-comments-section">
                          <div className="pf-comments-list">
                            {markInfo?.changes
                              ?.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
                              .map((change) => {
                                const supplement = change.idSupplement ? supplements[change.idSupplement] : null;
                                const hasComment = change.comment || (supplement && supplement.comment);
                                const hasFiles = (change.files && change.files.length > 0) || (supplement && supplement.files && supplement.files.length > 0);
                                const hasNewValue = change.newValue !== null;
                                const hasMeaningfulAction = change.action && 
                                  !change.action.includes('null') && 
                                  change.action !== 'добавление оценки' && 
                                  change.action !== 'изменение оценки';
                                
                                const shouldShow = hasComment || hasFiles || hasNewValue || hasMeaningfulAction;
                                
                                if (!shouldShow) return null;
                                
                                return (
                                  <div key={change.id} className="pf-comment-item">
                                    <div className="pf-comment-header">
                                      <div className="pf-comment-header-info">
                                        <span className="pf-comment-author">
                                          {change.teacherOrStudent ? 'Преподаватель' : 'Студент'}
                                        </span>
                                        <span className="pf-comment-date">
                                          {formatDateTime(change.dateTime)}
                                        </span>
                                      </div>
                                      
                                      {/* Меню с троеточием (только для комментариев студента) */}
                                      {change.teacherOrStudent === false && (
                                        <div className="pf-comment-menu">
                                          <button 
                                            className="pf-comment-menu-btn"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setMenuOpen(menuOpen === change.id ? null : change.id);
                                            }}
                                          >
                                            <span className="pf-comment-menu-dots">...</span>
                                          </button>
                                          
                                          {menuOpen === change.id && (
                                            <div className="pf-comment-dropdown">
                                              <button 
                                                className="pf-comment-dropdown-item"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleEditComment(change.id, change.idSupplement, change.comment || (supplement?.comment || ''));
                                                }}
                                              >
                                                Изменить
                                              </button>
                                              <button 
                                                className="pf-comment-dropdown-item pf-delete-item"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  confirmDeleteComment(change.id, change.idSupplement);
                                                }}
                                                disabled={deletingComment === change.id}
                                              >
                                                {deletingComment === change.id ? 'Удаление...' : 'Удалить'}
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    
                                    <span className="pf-comment-action">
                                      {getActionType(change.action)}
                                    </span>
                                    
                                    {/* Комментарий (только если есть комментарий) */}
                                    {hasComment && (
                                      <div className="pf-comment-section">
                                        <div className="pf-comment-content">
                                          {change.comment || (supplement && supplement.comment)}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Форма редактирования под комментарием */}
                                    {editingComment && editingComment.changeId === change.id && (
                                      <div className="pf-edit-comment-form">
                                        <h4>Редактировать комментарий</h4>
                                        
                                        <textarea
                                          value={newComment}
                                          onChange={(e) => setNewComment(e.target.value)}
                                          placeholder="Введите ваш комментарий..."
                                          className="pf-comment-textarea"
                                          rows={4}
                                        />
                                        
                                        <div className="pf-file-upload-section">
                                          <button 
                                            className="pf-upload-file-btn"
                                            onClick={() => fileInputRef.current?.click()}
                                          >
                                            Прикрепить файлы
                                          </button>
                                          <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileSelect}
                                            multiple
                                            style={{ display: 'none' }}
                                          />
                                          
                                          {uploadingFiles.length > 0 && (
                                            <div className="pf-uploaded-files">
                                              <h5>Файлы для загрузки:</h5>
                                              {uploadingFiles.map((file, index) => (
                                                <div key={index} className="pf-uploaded-file">
                                                  <span>{file.name}</span>
                                                  <button 
                                                    onClick={() => handleRemoveFile(index)}
                                                    className="pf-remove-file-btn"
                                                  >
                                                    ×
                                                  </button>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                        
                                        <div className="pf-comment-actions">
                                          <button 
                                            className="pf-cancel-comment-btn"
                                            onClick={handleCancelEdit}
                                          >
                                            Отмена
                                          </button>
                                          <button 
                                            className="pf-submit-comment-btn"
                                            onClick={() => handleUpdateComment(change.id, change.idSupplement)}
                                            disabled={!newComment.trim() && uploadingFiles.length === 0}
                                          >
                                            Обновить
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Файлы прикрепленные к изменению */}
                                    {hasFiles && (
                                      <div className="pf-comment-files">
                                        <div className="pf-comment-files-title">Прикрепленные файлы:</div>
                                        <div className="pf-comment-files-list">
                                          {/* Файлы напрямую из changes */}
                                          {change.files && change.files.map((file: { id: number; name: string }) => (
                                            <div key={file.id} className="pf-comment-file-item">
                                              <div className="pf-comment-file-info">
                                                <span className="pf-comment-file-icon">
                                                  {getFileIcon(file.name)}
                                                </span>
                                                <span className="pf-comment-file-name">{file.name}</span>
                                              </div>
                                              <div className="pf-comment-file-actions">
                                                <button 
                                                  className="pf-download-file-btn"
                                                  onClick={() => handleDownloadFile(file.id, file.name)}
                                                  title="Скачать"
                                                >
                                                  Скачать
                                                </button>
                                              </div>
                                            </div>
                                          ))}
                                          
                                          {/* Файлы из supplement */}
                                          {supplement && supplement.files && supplement.files.map((file) => (
                                            <div key={file.id} className="pf-comment-file-item">
                                              <div className="pf-comment-file-info">
                                                <span className="pf-comment-file-icon">
                                                  {getFileIcon(file.name)}
                                                </span>
                                                <span className="pf-comment-file-name">{file.name}</span>
                                              </div>
                                              <div className="pf-comment-file-actions">
                                                <button 
                                                  className="pf-download-file-btn"
                                                  onClick={() => handleDownloadFile(file.id, file.name)}
                                                  title="Скачать"
                                                >
                                                  Скачать
                                                </button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Информация об изменении оценки */}
                                    {hasNewValue && (
                                      <div className="pf-comment-grade-change">
                                        <span className="pf-grade-change-label">Оценка изменена на:</span>
                                        <span 
                                          className="pf-grade-change-value"
                                          style={{ backgroundColor: getGradeColor(change.newValue) }}
                                        >
                                          {change.newValue}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                          
                          {/* Форма добавления нового комментария */}
                          {addCommentMode ? (
                            <div className="pf-add-comment-form">
                              <h4>
                                {newSupplementId ? 'Добавить комментарий и файлы' : 'Создание комментария...'}
                              </h4>
                              
                              <textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Введите ваш комментарий..."
                                className="pf-comment-textarea"
                                rows={4}
                                disabled={!newSupplementId}
                              />
                              
                              <div className="pf-file-upload-section">
                                <button 
                                  className="pf-upload-file-btn"
                                  onClick={() => fileInputRef.current?.click()}
                                  disabled={!newSupplementId}
                                >
                                  Прикрепить файлы
                                </button>
                                <input
                                  type="file"
                                  ref={fileInputRef}
                                  onChange={handleFileSelect}
                                  multiple
                                  style={{ display: 'none' }}
                                  disabled={!newSupplementId}
                                />
                                
                                {uploadingFiles.length > 0 && (
                                  <div className="pf-uploaded-files">
                                    <h5>Файлы для загрузки:</h5>
                                    {uploadingFiles.map((file, index) => (
                                      <div key={index} className="pf-uploaded-file">
                                        <span>{file.name}</span>
                                        <button 
                                          onClick={() => handleRemoveFile(index)}
                                          className="pf-remove-file-btn"
                                        >
                                          ×
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              
                              <div className="pf-comment-actions">
                                <button 
                                  className="pf-cancel-comment-btn"
                                  onClick={handleCancelComment}
                                  disabled={!newSupplementId}
                                >
                                  Отмена
                                </button>
                                <button 
                                  className="pf-submit-comment-btn"
                                  onClick={handleSaveComment}
                                  disabled={(!newComment.trim() && uploadingFiles.length === 0) || !newSupplementId}
                                >
                                  {!newSupplementId ? 'Создание...' : 'Сохранить'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button 
                              className="pf-add-comment-btn"
                              onClick={handleAddSupplement}
                            >
                              Добавить комментарий
                            </button>
                          )}
                          
                          {markInfo.changes.filter(change => {
                            const supplement = change.idSupplement ? supplements[change.idSupplement] : null;
                            const hasComment = change.comment || (supplement && supplement.comment);
                            const hasFiles = (change.files && change.files.length > 0) || (supplement && supplement.files && supplement.files.length > 0);
                            const hasNewValue = change.newValue !== null;
                            const hasMeaningfulAction = change.action && 
                              !change.action.includes('null') && 
                              change.action !== 'добавление оценки' && 
                              change.action !== 'изменение оценки';
                            
                            return hasComment || hasFiles || hasNewValue || hasMeaningfulAction;
                          }).length === 0 && (
                            <div className="pf-no-comments">
                              <div className="pf-empty-title">Нет истории изменений</div>
                              <div className="pf-empty-description">
                                Здесь будет отображаться история изменений оценки с комментариями и файлами
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="pf-no-mark-info">
                    <p>Информация об оценке недоступна</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Компоненты
  const RefreshButton = () => (
    <button 
      className={`pf-refresh-btn ${refreshing ? 'pf-refreshing' : ''}`}
      onClick={handleRefresh}
      disabled={refreshing}
    >
      <img 
        src="/st-icons/upload_icon.svg" 
        className={`pf-refresh-icon ${refreshing ? 'pf-refresh-spin' : ''}`}
      />
    </button>
  );

  const SemesterSelector = () => (
  <div className="pf-semester-selector">
    <div className="pf-semester-buttons">
      {semesters.map((semester) => (
        <button
          key={semester.number}
          className={`pf-semester-btn ${selectedSemester === semester.value ? 'pf-active' : ''}`}
          onClick={() => setSelectedSemester(semester.value)}
        >
          {semester.name}
        </button>
      ))}
    </div>
  </div>
  );

  const ViewToggle = () => (
  activeTab === 'semesters' ? (
    <div className="pf-view-toggle">
      <button
        className={`pf-toggle-btn ${viewMode === 'grid' ? 'pf-active' : ''}`}
        onClick={() => setViewMode('grid')}
      >
        Сетка
      </button>
      <button
        className={`pf-toggle-btn ${viewMode === 'list' ? 'pf-active' : ''}`}
        onClick={() => setViewMode('list')}
      >
        Список
      </button>
    </div>
  ) : null
);

  // Рендер карточек предметов
  const renderSubjectCards = () => (
    <div className="pf-subjects-grid">
      {gradesData.map((subject, index) => (
        <div 
          key={subject.id} 
          className="pf-subject-card"
          onClick={() => handleSubjectClick(subject.subject)}
          style={{ cursor: 'pointer' }}
        >
          <div className="pf-card-header">
            <h3 className="pf-subject-title">{subject.subject}</h3>
            <div className="at-teacher-badge">
              {subject.teacher}
            </div>
          </div>
          
          <div className="pf-grades-preview">
            {subject.gradeDetails?.slice(0, 8).map((detail, gradeIndex) => (
              <div
                key={detail.id}
                className={`pf-preview-grade ${!detail.hasValue ? 'pf-no-data' : ''}`}
                style={{ backgroundColor: getGradeColor(detail.hasValue ? detail.grade : null) }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleGradeClick(
                    subject.subject,
                    detail.hasValue ? detail.grade : null,
                    detail.id,
                    detail.topic,
                    subject.teacher,
                    detail.stId
                  );
                }}
              >
                {detail.hasValue ? detail.grade : '-'}
              </div>
            ))}
            {subject.gradeDetails && subject.gradeDetails.length > 8 && (
              <div className="pf-more-grades">+{subject.gradeDetails.length - 8}</div>
            )}
            {(!subject.gradeDetails || subject.gradeDetails.length === 0) && (
              <div className="pf-no-grades">Нет оценок</div>
            )}
          </div>

          <div className="pf-card-footer">
            <div className="pf-average-score">
              <span className="pf-average-label">Средний балл:</span>
              <span 
                className="pf-average-value"
                style={{ color: getPerformanceColor(subject.average) }}
              >
                {subject.average > 0 ? subject.average.toFixed(1) : '-'}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // Рендер таблицы предметов
  const renderSubjectsTable = () => (
    <div className="pf-subjects-table-container">
      <table className="pf-subjects-table">
        <thead>
          <tr>
            <th>Предмет</th>
            <th>Оценки</th>
            <th>Средний балл</th>
            <th>Сессия</th>
          </tr>
        </thead>
        <tbody>
          {gradesData.map((subject) => (
            <tr 
              key={subject.id}
              className="pf-subject-row"
              onClick={() => handleSubjectClick(subject.subject)}
              style={{ cursor: 'pointer' }}
            >
              <td className="pf-subject-cell">
                <div className="pf-subject-info">
                  <span className="pf-subject-name">{subject.subject}</span>
                </div>
              </td>
              <td className="pf-grades-cell">
                <div className="pf-grades-stack">
                  {subject.gradeDetails?.slice(0, 24).map((detail) => (
                    <span
                      key={detail.id}
                      className={`pf-stack-grade ${!detail.hasValue ? 'pf-no-data' : ''}`}
                      style={{ backgroundColor: getGradeColor(detail.hasValue ? detail.grade : null) }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGradeClick(
                          subject.subject,
                          detail.hasValue ? detail.grade : null,
                          detail.id,
                          detail.topic,
                          subject.teacher,
                          detail.stId
                        );
                      }}
                    >
                      {detail.hasValue ? detail.grade : '-'}
                    </span>
                  ))}
                  {(!subject.gradeDetails || subject.gradeDetails.length === 0) && (
                    <span className="pf-no-data-text">Нет оценок</span>
                  )}
                </div>
              </td>
              <td className="pf-average-cell">
                <div 
                  className="pf-average-badge"
                  style={{ 
                    backgroundColor: subject.average > 0 ? getPerformanceColor(subject.average) + '20' : '#f8fafc',
                    color: subject.average > 0 ? getPerformanceColor(subject.average) : '#64748b'
                  }}
                >
                  {subject.average > 0 ? subject.average.toFixed(1) : '-'}
                </div>
              </td>
              <td className="pf-session-cell">
                <div 
                  className="pf-session-grade"
                  style={{ 
                    backgroundColor: subject.examGrade !== null ? getGradeColor(subject.examGrade) : '#f8fafc',
                    color: subject.examGrade !== null ? 'white' : '#64748b'
                  }}
                >
                  {subject.examGrade !== null ? subject.examGrade : '-'}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Рендер аналитики
  const renderAnalytics = () => {  
    return (
      <div className="pf-analytics-container">
        <div className="pf-stats-cards">
          <div className="pf-stat-card">
            <div className="pf-stat-content">
              <div className="pf-stat-value">{statistics.overallAverage}</div>
              <div className="pf-stat-label">Средний балл</div>
            </div>
          </div>

          <div className="pf-stat-card">
            <div className="pf-stat-content">
              <div className="pf-stat-value">{statistics.excellentPercentage}%</div>
              <div className="pf-stat-label">Оценок 4+</div>
            </div>
          </div>

          <div className="pf-stat-card">
            <div className="pf-stat-content">
              <div className="pf-stat-value">{statistics.totalGrades}</div>
              <div className="pf-stat-label">Всего оценок</div>
            </div>
          </div>
        </div>

        <div className="pf-charts-grid">
          {/* Распределение оценок - оставляем */}
          <div className="pf-chart-card">
            <h3>Распределение оценок</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="subject" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`${value}`, 'Количество']}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Количество">
                  {performanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Новый график: Количество оценок по типам */}
          <div className="pf-chart-card">
            <h3>Типы оценок</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={calculateGradeTypesData()}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                >
                  {calculateGradeTypesData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="pf-full-width-chart">
          <div className="pf-chart-card">
            <h3>Средние баллы по предметам</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart 
                data={gradesData
                  .filter(subject => subject.average > 0)
                  .sort((a, b) => b.average - a.average)
                  .slice(0, 8)
                }
                layout="vertical"
                margin={{ left: 100 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 5]} />
                <YAxis 
                  type="category" 
                  dataKey="subject" 
                  tick={{ fontSize: 12 }}
                  width={90}
                />
                <Tooltip 
                  formatter={(value) => [`${value}`, 'Средний балл']}
                />
                <Bar 
                  dataKey="average" 
                  name="Средний балл"
                  radius={[0, 4, 4, 0]}
                >
                  {gradesData
                    .filter(subject => subject.average > 0)
                    .sort((a, b) => b.average - a.average)
                    .slice(0, 8)
                    .map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={getPerformanceColor(entry.average)} 
                      />
                    ))
                  }
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="pf-loading">
        <div className="pf-loading-spinner"></div>
        <p>Загрузка данных об успеваемости...</p>
      </div>
    );
  }

  return (
    <div className="pf-performance-section">
      {/* Навигация */}
      <div className="pf-nav">
        <button
          className={`pf-nav-btn ${activeTab === 'semesters' ? 'pf-active' : ''}`}
          onClick={() => setActiveTab('semesters')}
          data-tab="semesters"
        >
          По семестрам
        </button>
        <button
          className={`pf-nav-btn ${activeTab === 'subjects' ? 'pf-active' : ''}`}
          onClick={() => setActiveTab('subjects')}
          data-tab="subjects"
        >
          По предметам
        </button>
        <button
          className={`pf-nav-btn ${activeTab === 'analytics' ? 'pf-active' : ''}`}
          onClick={() => setActiveTab('analytics')}
          data-tab="analytics"
        >
          Аналитика
        </button>
      </div>
      {/* Контролы */}
      <div className="pf-controls-section">
        <SemesterSelector />
        <div className="pf-controls-section-left"><ViewToggle /><RefreshButton /></div>
      </div>

      {/* Контент */}
      <div className="pf-content">
        {activeTab === 'semesters' && (
          <div className="pf-tab-content">
            {viewMode === 'grid' ? renderSubjectCards() : renderSubjectsTable()}
          </div>
        )}

        {activeTab === 'subjects' && (
          <div className="pf-tab-content">
            <div className="pf-subject-detail-container">
              <div className="pf-subject-selector">
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="pf-select"
                >
                  <option value="">Выберите предмет</option>
                  {subjects.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>

              {selectedSubjectData ? (
                <div className="pf-subject-detail">
                  <div className="pf-detail-header">
                    <h2>{selectedSubjectData.subject}</h2>
                    <div className="pf-subject-meta">
                      <span className="pf-meta-item">Преподаватель: {selectedSubjectData.teacher}</span>
                      <span className="pf-meta-item">Средний балл: {selectedSubjectData.average.toFixed(1)}</span>
                    </div>
                  </div>

                 <div className="pf-grades-timeline">
                    {selectedSubjectData?.gradeDetails?.map((detail) => (
                      <div key={detail.id} className="pf-timeline-item">
                        <div className="pf-timeline-content">
                          <div className="pf-grade-header">
                            {/* Здесь будет отображаться реальный тип работы */}
                            <span className="pf-grade-topic">{detail.topic}</span>
                            <span className="pf-grade-date">{detail.date}</span>
                          </div>
                          <div className="pf-grade-details">
                            <span 
                              className={`pf-grade-value ${!detail.hasValue ? 'pf-no-data' : ''}`}
                              style={{ 
                                backgroundColor: detail.hasValue ? getGradeColor(detail.grade) : '#d1d5db'
                              }}
                              onClick={() => handleGradeClick(
                                selectedSubjectData.subject,
                                detail.hasValue ? detail.grade : null,
                                detail.id,
                                detail.topic, // Передаем актуальный topic
                                selectedSubjectData.teacher,
                                detail.stId
                              )}
                            >
                              {detail.hasValue ? detail.grade : '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="pf-no-subject-selected">
                  <div className="pf-empty-state">
                    <h3>Выберите предмет</h3>
                    <p>Для просмотра детальной информации выберите предмет из списка или кликните на предмет в семестре</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && renderAnalytics()}
      </div>

      {/* Попап с детальной информацией об оценке */}
      {renderGradePopup()}
    </div>
  );
};