import React, { useState, useRef, useEffect } from 'react';
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

  const { user } = useUser();

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

      console.log('Загрузка данных с API...');
      const marksData = await apiService.getStudentMarks(studentId);
      setStudentMarks(marksData ?? []);
      
    } catch (error) {
      console.error('Ошибка при загрузке данных с API:', error);
      
      // Если ошибка сети, пробуем загрузить из кэша
      try {
        console.log('Попытка загрузки из кэша...');
        const cacheKey = `marks_${studentId}`;
        const cached = localStorage.getItem(`cache_${cacheKey}`);
        
        if (cached) {
          const cachedData = JSON.parse(cached);
          // Проверяем актуальность кэша (10 минут)
          if (Date.now() - cachedData.timestamp < 10 * 60 * 1000) {
            setStudentMarks(cachedData.data ?? []);
            setIsUsingCache(true);
            setError('Используются кэшированные данные. Нет соединения с сервером.');
            console.log('Данные загружены из кэша');
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

  // Функция для предпросмотра файла
  const handlePreviewFile = async (fileId: number, fileName: string, documentInfo?: Document) => {
    try {
      const fileInfo = documentInfo || await apiService.getFileInfo(fileId);
      
      const fileUrl = `${API_BASE_URL}/paths/id/${fileId}`;
      
      if (fileName.toLowerCase().endsWith('.pdf') || 
          fileName.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/)) {
        window.open(fileUrl, '_blank');
      } else {
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

    } catch (error) {
      console.error('Ошибка предпросмотра файла:', error);
      setError('Не удалось открыть файл');
    }
  };


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
    fetchStudentData();
    fetchStudentCourse();
    loadAllFiles();
  }, [studentId]);



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

  // Функция для добавления комментария
  const handleAddSupplement = async () => {
    if (!selectedGrade || !newComment.trim()) return;
    
    try {
      if (selectedGrade.stId) {
        await apiService.addMarkChange(
          studentId, 
          selectedGrade.stId, 
          selectedGrade.number, 
          newComment
        );
        
        await loadMarkInfo(selectedGrade.stId, selectedGrade.number);
        
        if (markInfo) {
          const newChange = markInfo.changes.find(change => 
            change.comment === newComment && 
            change.teacherOrStudent === false
          );
          
          if (newChange && newChange.idSupplement) {
            try {
              await apiService.updateSupplementComment(newChange.idSupplement, newComment);
            } catch (supplementError) {
              console.warn('Не удалось обновить supplement, но комментарий уже добавлен:', supplementError);
            }
          }
        }
        
        setAddCommentMode(false);
        setNewComment('');
        setUploadingFiles([]);
        
        console.log('Комментарий успешно добавлен');
      }
    } catch (error) {
      console.error('Ошибка добавления комментария:', error);
      setError('Не удалось добавить комментарий');
    }
  };

  const handleUpdateComment = async () => {
    if (!editingComment || !newComment.trim()) return;
    
    try {
      if (editingComment.supplementId) {
        await apiService.updateSupplementComment(editingComment.supplementId, newComment);
      } else {
        if (selectedGrade?.stId) {
          await apiService.addMarkChange(
            studentId, 
            selectedGrade.stId, 
            selectedGrade.number, 
            newComment
          );
        }
      }
      
      if (selectedGrade?.stId) {
        await loadMarkInfo(selectedGrade.stId, selectedGrade.number);
      }
      
      setEditingComment(null);
      setAddCommentMode(false);
      setNewComment('');
      setUploadingFiles([]);
      
      console.log('Комментарий успешно обновлен');
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
    setAddCommentMode(true);
  };

  // Функция для скачивания файла по ID
  const handleDownloadFileById = async (fileId: number, fileName: string) => {
    try {
      await apiService.downloadFileById(fileId, fileName);
    } catch (error) {
      console.error('Ошибка скачивания файла:', error);
      setError('Не удалось скачать файл');
    }
  };

  // Функция для скачивания документа
  const handleDownloadDocument = async (documentId: number) => {
    try {
      await apiService.downloadDocument(documentId);
    } catch (error) {
      console.error('Ошибка скачивания документа:', error);
      setError('Не удалось скачать документ');
    }
  };

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
  const transformStudentMarksToGrades = (semesterType: 'first' | 'second'): Grade[] => {
    if (!studentMarks) return [];

    return studentMarks
      .filter(studentMark => studentMark && studentMark.stNameSubjectDTO)
      .map((studentMark) => {
        const subjectId = studentMark.stNameSubjectDTO?.idSubject;
        
        if (!subjectId) return null;

        const gradeDetails: GradeDetail[] = [];
        const validGrades: number[] = [];
        
        if (studentMark.marksBySt && Array.isArray(studentMark.marksBySt)) {
          studentMark.marksBySt.forEach((mark) => {
            if (mark && mark.number !== null && mark.number !== undefined) {
              if (getSemesterByWorkNumber(mark.number) === semesterType) {
                const lessonDate = getLessonDate(mark.number);
                const lessonTopic = getLessonTopic(mark.number);

                gradeDetails.push({
                  id: mark.number,
                  date: lessonDate,
                  topic: lessonTopic,
                  grade: mark.value || 0,
                  teacher: `${studentMark.stNameSubjectDTO.lastnameTeacher} ${studentMark.stNameSubjectDTO.nameTeacher.charAt(0)}.${studentMark.stNameSubjectDTO.patronymicTeacher.charAt(0)}.`,
                  type: 'Работа',
                  hasValue: mark.value !== null && mark.value !== undefined,
                  stId: studentMark.stNameSubjectDTO.idSt
                });

                if (mark.value !== null && mark.value !== undefined) {
                  validGrades.push(mark.value);
                }
              }
            }
          });
        }

        gradeDetails.sort((a, b) => a.id - b.id);

        const average = validGrades.length > 0 
          ? validGrades.reduce((sum, grade) => sum + grade, 0) / validGrades.length 
          : 0;

        return {
          id: subjectId,
          subject: studentMark.stNameSubjectDTO.nameSubject || 'Неизвестный предмет',
          grades: validGrades,
          average: parseFloat(average.toFixed(1)),
          examGrade: studentMark.certification,
          gradeDetails: gradeDetails,
          teacher: `${studentMark.stNameSubjectDTO.lastnameTeacher} ${studentMark.stNameSubjectDTO.nameTeacher.charAt(0)}.${studentMark.stNameSubjectDTO.patronymicTeacher.charAt(0)}.`
        };
      })
      .filter(grade => grade !== null) as Grade[];
  };

  const getSemesterByWorkNumber = (workNumber: number): 'first' | 'second' => {
    if (workNumber === null || workNumber === undefined || isNaN(workNumber)) {
      return 'first';
    }
    return workNumber <= 24 ? 'first' : 'second';
  };

  const getLessonTopic = (markNumber: number): string => {
    // Проверяем корректность markNumber
    if (markNumber === null || markNumber === undefined || isNaN(markNumber)) {
      return 'Тема не определена';
    }
    return `Работа ${markNumber}`;
  };

  const getLessonDate = (markNumber: number): string => {
    // Проверяем корректность markNumber
    if (markNumber === null || markNumber === undefined || isNaN(markNumber)) {
      return 'Дата не определена';
    }
    
    const currentDate = new Date();
    const semesterStart = selectedSemester === 'first' 
      ? new Date(currentDate.getFullYear(), 8, 1)
      : new Date(currentDate.getFullYear(), 0, 1);
    
    const gradeDate = new Date(semesterStart);
    gradeDate.setDate(semesterStart.getDate() + (markNumber - 1) * 7);
    
    return gradeDate.toLocaleDateString('ru-RU');
  };

  const gradesData = transformStudentMarksToGrades(selectedSemester);
  const subjects = gradesData.map(grade => grade.subject);

  // Статистика
  const calculatePerformanceStatistics = () => {
    let totalGrades = 0;
    let grade5 = 0;
    let grade4 = 0;
    let grade3 = 0;
    let grade2 = 0;
    let totalAverage = 0;
    let subjectsWithGrades = 0;

    gradesData.forEach(subject => {
      if (subject.grades.length > 0) {
        subjectsWithGrades++;
        subject.grades.forEach(grade => {
          totalGrades++;
          if (grade >= 4) grade5++;
          else if (grade >= 3.5) grade4++;
          else if (grade >= 2.5) grade3++;
          else grade2++;
        });
        totalAverage += subject.average;
      }
    });

    const overallAverage = subjectsWithGrades > 0 ? totalAverage / subjectsWithGrades : 0;
    const excellentPercentage = totalGrades > 0 ? (grade5 / totalGrades) * 100 : 0;

    return {
      totalGrades,
      grade5,
      grade4,
      grade3,
      grade2,
      overallAverage: parseFloat(overallAverage.toFixed(1)),
      excellentPercentage: parseFloat(excellentPercentage.toFixed(1)),
      totalSubjects: gradesData.length,
      subjectsWithGrades
    };
  };

  const getGradeColor = (grade: number | null) => {
    if (grade === null) return '#d1d5db';
    if (grade >= 4) return '#2cbb00';
    if (grade >= 3) return '#f59e0b';
    if (grade >= 2) return '#ef4444';
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
                ) : markInfo ? (
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
                            <span className="pf-info-label">Замена:</span>
                            <span className="pf-info-value">
                              {markInfo.replacement ? 'Да' : 'Нет'}
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
                                        className="pf-preview-file-btn"
                                        onClick={() => handlePreviewFile(file.id, file.name)}
                                        title="Просмотреть"
                                      >
                                        Посмотреть
                                      </button>
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
                            {markInfo.changes
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
                                      <span className="pf-comment-author">
                                        {change.teacherOrStudent ? 'Преподаватель' : 'Студент'}
                                      </span>
                                      <span className="pf-comment-date">
                                        {formatDateTime(change.dateTime)}
                                      </span>
                                    </div>
                                    <span className="pf-comment-action">
                                        {getActionType(change.action)}
                                      </span>
                                    
                                    {/* Комментарий (только если есть комментарий) */}
                                    {hasComment && (
                                      <div className="pf-comment-section">
                                        <div className="pf-comment-header">
                                          <div className="pf-comment-label">Комментарий:</div>
                                          {/* Показывать кнопку редактирования только для комментариев студента */}
                                          {change.teacherOrStudent === false && (
                                            <button 
                                              className="pf-edit-comment-btn"
                                              onClick={() => handleEditComment(change.id, change.idSupplement, change.comment || '')}
                                              title="Редактировать комментарий"
                                            >
                                              ✏️ Изменить
                                            </button>
                                          )}
                                        </div>
                                        <div className="pf-comment-content">
                                          {change.comment || (supplement && supplement.comment)}
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
                                                  className="pf-preview-file-btn"
                                                  onClick={() => handlePreviewFile(file.id, file.name)}
                                                  title="Просмотреть"
                                                >
                                                  Посмотреть
                                                </button>
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
                                                  className="pf-preview-file-btn"
                                                  onClick={() => handlePreviewFile(file.id, file.name)}
                                                  title="Просмотреть"
                                                >
                                                  Посмотреть
                                                </button>
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

                        {/* Кнопка добавления комментария */}
                        {!addCommentMode ? (
                          <button 
                            className="pf-add-comment-btn"
                            onClick={() => setAddCommentMode(true)}
                          >
                            Добавить комментарий
                          </button>
                        ) : (
                          <div className="pf-add-comment-form">
                            <h4>
                              {editingComment ? 'Редактировать комментарий' : 'Добавить комментарий и файлы'}
                            </h4>
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
                                onClick={() => {
                                  setAddCommentMode(false);
                                  setEditingComment(null);
                                  setNewComment('');
                                  setUploadingFiles([]);
                                }}
                              >
                                Отмена
                              </button>
                              <button 
                                className="pf-submit-comment-btn"
                                onClick={editingComment ? handleUpdateComment : handleAddSupplement}
                                disabled={!newComment.trim()}
                              >
                                {editingComment ? 'Обновить' : 'Отправить'}
                              </button>
                            </div>
                          </div>
                        )}
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
            <div className="pf-grades-count">
              {subject.grades.length} оценок
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
  const renderAnalytics = () => (
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
        <div className="pf-chart-card pf-large">
          <h3>Распределение оценок</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="subject" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {performanceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="pf-chart-card pf-large">
          <h3>Прогресс обучения</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="week" />
              <YAxis domain={[3, 5]} />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="average" 
                stroke="#2cbb00" 
                strokeWidth={3}
                dot={{ fill: '#2cbb00', strokeWidth: 2, r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

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
        >
          По семестрам
        </button>
        <button
          className={`pf-nav-btn ${activeTab === 'subjects' ? 'pf-active' : ''}`}
          onClick={() => setActiveTab('subjects')}
        >
          По предметам
        </button>
        <button
          className={`pf-nav-btn ${activeTab === 'analytics' ? 'pf-active' : ''}`}
          onClick={() => setActiveTab('analytics')}
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
                    {selectedSubjectData.gradeDetails?.map((detail) => (
                      <div key={detail.id} className="pf-timeline-item">
                        <div className="pf-timeline-content">
                          <div className="pf-grade-header">
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
                                detail.topic,
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