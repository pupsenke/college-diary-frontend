import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useCache } from '../context/CacheContext';
import { CacheWarning } from '../th-components/CacheWarning';
import { 
  teacherApiService, 
  type LessonDate, 
  type LessonInfo, 
  type SubjectTeacherData, 
  type AddDateColumnRequest, 
  type DeleteDateColumnRequest,
  type UpdateMarkGradeRequest,
  type UpdateMarkRequest,
  type ApiLessonType,
  type StData
} from '../services/teacherApiService';
import './TeacherPerformanceSection.css';

// Типы данных
export interface Student {
  id: number;
  lastName: string;
  firstName: string;
  middleName: string;
  subgroup?: 'I' | 'II';
  marks?: Array<{
    number: number;
    value: number | null;
  }>;
}

// Тип для lessonType
export type LessonType = 'Л' | 'ПР' | 'СР' | 'КР' | 'Т' | 'ДЗ' | '';

interface LessonTypeInfo {
  type: LessonType;
  topic: string;
  comment: string;
  fullType?: string;
}

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
  idTeacher?: number;
  onBackToGroups?: () => void;
  onSetAttendance?: () => void;
}

export interface LessonDateModalData {
  date: string;
  lessonNumber: number;
  typeMark: string;
  comment: string;
  numberWeek: number;
  dayWeek: string;
  typeWeek: string;
  numPair: number;
  number: number;
}

interface SubgroupTeachersState {
  'I': string;
  'II': string;
}

interface SubgroupStudents {
  'I': Student[];
  'II': Student[];
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

interface UpdateLessonTypeRequest {
  idTeacher: number;
  idGroup: number;
  idStudent: number;
  idSt: number;
  number: number;
  idTypeMark: number;
}

export interface ChangeHistory {
  id: number;
  dateTime: string;
  action: string;
  idSupplement: number | null;
  comment: string | null;
  files: Array<{
    id: number;
    name: string;
  }> | null;
  teacherOrStudent: boolean;
  newValue: string | null;
}

interface FilePreview {
  id: number;
  name: string;
  url: string;
  isImage: boolean;
}

export const TeacherPerformanceSection: React.FC<TeacherPerformanceSectionProps> = ({
  groupNumber,
  subject,
  onBackToGroups,
  onSetAttendance
}): React.ReactElement => {
  const [idTeacher, setIdTeacher] = useState<number | null>(null);
  const [idSt, setIdSt] = useState<number | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [lessonDates, setLessonDates] = useState<LessonDate[]>([]);
  const [showDateModal, setShowDateModal] = useState<LessonDateModalData | null>(null);
  const [dateModalData, setDateModalData] = useState<{
    typeMark: string;
    comment: string;
  }>({
    typeMark: '',
    comment: ''
  });
  const [subjectTeachersData, setSubjectTeachersData] = useState<SubjectTeacherData[]>([]);
  const [hasMultipleTeachers, setHasMultipleTeachers] = useState<boolean>(true);

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
  const [commentText, setCommentText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<boolean>(false);
  const [showTopicModal, setShowTopicModal] = useState<string | null>(null);
  const [topicText, setTopicText] = useState('');
  const [subgroupTeachers, setSubgroupTeachers] = useState<SubgroupTeachersState>({
    'I': 'Загрузка...',
    'II': 'Загрузка...'
  });
  const [subgroupStudents, setSubgroupStudents] = useState<SubgroupStudents>({
    'I': [],
    'II': []
  });
  const [studentSubgroups, setStudentSubgroups] = useState<Record<number, 'I' | 'II'>>({});
  const [savingSubgroups, setSavingSubgroups] = useState<boolean>(false);
  const [showSubgroupModal, setShowSubgroupModal] = useState<boolean>(false);

  const [updatingLessonType, setUpdatingLessonType] = useState(false);
  const [lessonTypes, setLessonTypes] = useState<ApiLessonType[]>([]);
  const [stData, setStData] = useState<StData | null>(null);

  const [dateRange, setDateRange] = useState<{start: string; end: string}>({
    start: '',
    end: ''
  });
  const [lessonTypesData, setLessonTypesData] = useState<Record<string, LessonTypeInfo>>({});
  const [globalExamType, setGlobalExamType] = useState<string>('');

  const [loadingLessonTypes, setLoadingLessonTypes] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { isUsingCache, showCacheWarning, setShowCacheWarning, forceCacheCheck } = useCache();
  const [error, setError] = useState<string | null>(null);

  // Новые состояния для управления датами
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

  const [managingDate, setManagingDate] = useState(false);
  
  const [loadingLessons, setLoadingLessons] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const examInputRef = useRef<HTMLSelectElement>(null);

  const [commentModalData, setCommentModalData] = useState<{studentId: number; date: string} | null>(null);
  const [teacherCommentText, setTeacherCommentText] = useState('');
  const [teacherAttachedFiles, setTeacherAttachedFiles] = useState<File[]>([]);
  const [studentChangeHistory, setStudentChangeHistory] = useState<ChangeHistory[]>([]);
  const [loadingStudentHistory, setLoadingStudentHistory] = useState(false);
  const [activeCommentTab, setActiveCommentTab] = useState<'teacher' | 'student'>('teacher');

  const [studentCommentsMap, setStudentCommentsMap] = useState<Record<string, {
    teacher: ChangeHistory[];
    student: ChangeHistory[];
  }>>({});

  // Состояние для предпросмотра файлов
  const [filePreview, setFilePreview] = useState<{
    isOpen: boolean;
    files: FilePreview[];
    currentIndex: number;
  }>({
    isOpen: false,
    files: [],
    currentIndex: 0
  });

  // Допустимые оценки
  const validGrades = [
    '5', '4.75', '4.5', '4.25', '4', '3.75', '3.5', '3.25', '3', 
    '2.75', '2.5', '2.25', '2', '1', '0', ''
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
  const getGradeColor = (grade: string): string => {
    if (!grade) return '';
    
    if (grade === 'з') return '#2cbb00';
    if (grade === 'нз') return '#ef4444';
    
    const numericGrade = parseFloat(grade);
    if (numericGrade >= 4.5) return '#2cbb00';
    if (numericGrade >= 3.5) return '#a5db28';
    if (numericGrade >= 2.5) return '#f59e0b';
    return '#ef4444';
  };

  // Функция для сопоставления полного названия типа занятия с сокращением
  const getLessonTypeFromFullName = (fullName: string): LessonType => {
    const typeMap: Record<string, LessonType> = {
      'Лекция': 'Л',
      'Практика': 'ПР',
      'Практическая работа': 'ПР',
      'Самостоятельная работа': 'СР',
      'Самостоятелья работа': 'СР', // исправление опечатки из API
      'Контрольная работа': 'КР',
      'Домашнее задание': 'ДЗ',
      'Домашняя работа': 'ДЗ',
      'Тест': 'Т'
    };
    
    return typeMap[fullName] || '';
  };

  const getLessonTypeForDate = (date: string): string => {
    const typeData = lessonTypesData[date];
    const lessonType = typeData?.type || '';
    
    // Для отладки
    if (selectedLessonType !== 'all') {
      console.log(`Фильтр: дата "${date}", тип: "${lessonType}", выбран: "${selectedLessonType}"`);
    }
    
    return lessonType;
  };

  // Функция для получения номера занятия по дате
  const getLessonNumber = (date: string): number => {
    const match = date.match(/\((\d+)\)$/);
    if (match) {
      return parseInt(match[1]);
    }
    console.warn(`Could not extract lesson number from date: ${date}`);
    return 0;
  };

  // Вспомогательная функция для парсинга дат
  const parseDate = (dateStr: string): number => {
    if (!dateStr) return 0;
    
    if (dateStr.includes('.')) {
      const [day, month] = dateStr.split('.');
      return new Date(new Date().getFullYear(), parseInt(month) - 1, parseInt(day)).getTime();
    } else {
      return new Date(dateStr).getTime();
    }
  };


  const handlePrevFile = (): void => {
    setFilePreview(prev => ({
      ...prev,
      currentIndex: (prev.currentIndex - 1 + prev.files.length) % prev.files.length
    }));
  };

  // Компонент информационной иконки
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
              <h3>Управление успеваемостью</h3>
              <p>В этом разделе вы можете выставлять оценки студентам, управлять подгруппами и отслеживать успеваемость.</p>
            </div>
          </div>
          
          <div className="info-section">
            <h4>Основные возможности</h4>
            <div className="features-grid">
              <div className="feature-item">
                <span className="feature-icon"></span>
                <span>Выставление оценок по датам занятий</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon"></span>
                <span>Фильтрация по датам, подгруппам и типам занятий</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon"></span>
                <span>Добавление и просмотр комментариев, прикрепление и скачивание файлов</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon"></span>
                <span>Управление распределением по подгруппам, если они есть</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon"></span>
                <span>Выставление экзаменационных оценок</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon"></span>
                <span>Добавление и удаление столбцов с датами</span>
              </div>
              <div className="feature-item">
              <span className="feature-icon"></span>
              <span>Информация о занятиях</span>
            </div>
            </div>
          </div>

          <div className="info-section">
            <h4>Допустимые оценки</h4>
            <div className="grades-grid">
              <div className="grades-row">
                <div className="grade-demo grade-excellent">5</div>
                <div className="grade-demo grade-excellent">4.75</div>
                <div className="grade-demo grade-excellent">4.5</div>
                <div className="grade-demo grade-excellent">4.25</div>
                <div className="grade-demo grade-good">4</div>
              </div>
              <div className="grades-row">
                <div className="grade-demo grade-good">3.75</div>
                <div className="grade-demo grade-good">3.5</div>
                <div className="grade-demo grade-satisfactory">3.25</div>
                <div className="grade-demo grade-satisfactory">3</div>
                <div className="grade-demo grade-unsatisfactory">2.75</div>
              </div>
              <div className="grades-row">
                <div className="grade-demo grade-unsatisfactory">2.5</div>
                <div className="grade-demo grade-unsatisfactory">2.25</div>
                <div className="grade-demo grade-unsatisfactory">2</div>
                <div className="grade-demo grade-unsatisfactory">1</div>
                <div className="grade-demo grade-unsatisfactory">0</div>
              </div>
            </div>
            <div className="grades-note">
              <code>з</code> (зачет), <code>нз</code> (незачет)
            </div>
          </div>

          <div className="info-section">
            <h4>Как использовать</h4>
            <div className="usage-steps">
              <div className="step">
                <span className="step-number">1</span>
                <span>Нажмите на ячейку с оценкой</span>
              </div>
              <div className="step">
                <span className="step-number">2</span>
                <span>Введите оценку из списка допустимых</span>
              </div>
              <div className="step">
                <span className="step-number">3</span>
                <span>Для комментария нажмите кнопку 💬</span>
              </div>
              <div className="step">
                <span className="step-number">4</span>
                <span>Нажмите "Сохранить комментарий"</span>
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

  // Компонент кнопки обновления
  const RefreshButton = (): React.ReactElement => (
    <button 
      className={`header-btn pc-refresh-btn ${refreshing ? 'pc-refreshing' : ''}`}
      onClick={handleRefresh}
      disabled={refreshing || loading}
    >
      <img 
        src="/st-icons/upload_icon.svg" 
        className={`pc-refresh-icon ${refreshing ? 'pc-refresh-spin' : ''}`}
        alt="Обновить"
      />
      <span>{refreshing ? 'Обновление...' : loading ? 'Загрузка...' : 'Обновить данные'}</span>
    </button>
  );

  const loadAllData = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      setShowCacheWarning(false);

      console.log('Starting to load all data...');

      // 1. Загружаем ID преподавателя
      const teacherId = localStorage.getItem('teacher_id');
      if (!teacherId) {
        throw new Error('ID преподавателя не найден в системе');
      }
      const teacherIdNum = parseInt(teacherId);
      setIdTeacher(teacherIdNum);

      // 2. Загружаем idSt
      console.log('Fetching stId...');
      const stId = await teacherApiService.getStId(teacherIdNum, subject, groupNumber);
      if (!stId) {
        throw new Error('Не удалось найти распределение для преподавателя, предмета и группы');
      }
      setIdSt(stId);

      // 3. Загружаем данные о преподавателях подгрупп
      console.log('Loading subgroup teachers data...');
      await fetchSubjectTeachersData(teacherIdNum);

      // 4. Загружаем студентов из обеих подгрупп
      console.log('Loading students from both subgroups...');
      await loadStudentsFromAllSubgroups(teacherIdNum, stId);

      // 5. Загружаем даты занятий
      console.log('Fetching lesson dates...');
      const groupId = teacherApiService.getGroupIdFromNumber(groupNumber);
      if (!groupId) {
        throw new Error(`Не удалось определить ID группы для номера: ${groupNumber}`);
      }

      const dates = await teacherApiService.getLessonDates(groupId, stId);
      const formattedDates: string[] = dates.map(lesson => {
        const dateObj = new Date(lesson.date);
        const day = dateObj.getDate().toString().padStart(2, '0');
        const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
        return `${day}.${month} (${lesson.number})`;
      });

      setLessonDates(dates);
      setAllDates(formattedDates);

      // 6. Загружаем доступные типы занятий для этого предмета
      console.log('Loading lesson types from API...');
      const lessonTypesFromApi = await teacherApiService.getLessonTypes(stId);
      setLessonTypes(lessonTypesFromApi);

      // 7. Инициализируем данные о типах занятий для дат
      console.log('Initializing lesson types data for dates...');
      const lessonTypesData = await loadLessonTypes();
      setLessonTypesData(lessonTypesData);

      console.log('All data loaded successfully');
      await loadAllComments();

    } catch (err: any) {
      console.error('Ошибка при загрузке данных:', err);
      
      // Проверяем, является ли ошибка сетевой
      const isNetworkError = 
        err.message?.includes('Failed to fetch') ||
        err.message?.includes('NetworkError') ||
        err.message?.includes('Network request failed') ||
        err.message?.includes('Превышено время ожидания') ||
        err.name === 'TypeError';
      
      if (isNetworkError) {
        // Проверяем, есть ли кэшированные данные
        forceCacheCheck();
        
        setShowCacheWarning(true);

          // Пытаемся загрузить данные из кэша
          try {
            const teacherId = localStorage.getItem('teacher_id');
            if (teacherId) {
              // Определяем groupId для кэша
              const cachedGroupId = teacherApiService.getGroupIdFromNumber(groupNumber);
              
              // Пытаемся загрузить студентов из кэша
              const cachedStudents = localStorage.getItem(`cache_group_students_${cachedGroupId}_${idSt}_${teacherId}`);
              if (cachedStudents) {
                const parsedStudents = JSON.parse(cachedStudents);
                console.log('Loaded cached students data');
              }
              
              // Пытаемся загрузить даты занятий из кэша
              const cachedDates = localStorage.getItem(`cache_lesson_dates_${cachedGroupId}_${idSt}_${teacherId}`);
              if (cachedDates) {
                const parsedDates = JSON.parse(cachedDates);
                console.log('Loaded cached lesson dates');
              }
            }
          } catch (cacheError) {
            console.error('Error loading cached performance data:', cacheError);
          }
      } else {
        setError(`Не удалось загрузить данные: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Загружаем типы занятий когда есть idSt и даты занятий
    if (idSt && lessonDates.length > 0 && lessonTypes.length === 0) {
      const loadTypes = async () => {
        try {
          const lessonTypesFromApi = await teacherApiService.getLessonTypes(idSt);
          setLessonTypes(lessonTypesFromApi);
          
          const lessonTypesData = await loadLessonTypes();
          setLessonTypesData(lessonTypesData);
        } catch (error) {
          console.error('Ошибка при автоматической загрузке типов занятий:', error);
        }
      };
      loadTypes();
    }
  }, [idSt, lessonDates, lessonTypes.length]);

  // Новая функция для загрузки студентов из всех подгрупп
  const loadStudentsFromAllSubgroups = async (currentTeacherId: number, stId: number): Promise<void> => {
    try {
      const groupId = teacherApiService.getGroupIdFromNumber(groupNumber);
      if (!groupId) {
        throw new Error('Не удалось определить ID группы');
      }

      // Получаем данные о преподавателях предмета
      const subjectTeachersData = await teacherApiService.getSubjectTeachersData();
      const currentSubjectId = await teacherApiService.getSubjectIdByName(subject);
      
      const subjectData = subjectTeachersData.find(item => 
        item.groups.includes(groupId) && item.idSubject === currentSubjectId
      );

      if (!subjectData || subjectData.teachers.length === 0) {
        throw new Error('Не найдены преподаватели для предмета');
      }

      const subgroupStudentsData: SubgroupStudents = {
        'I': [],
        'II': []
      };

      // Инвалидируем кэш студентов перед загрузкой новых данных
      teacherApiService.invalidateStudentCache();

      // Создаем Set для отслеживания уже загруженных студентов
      const loadedStudentIds = new Set<number>();

      console.log('Преподаватели для предмета:', subjectData.teachers);
      
      // Загружаем студентов для каждого преподавателя в правильном порядке
      for (let i = 0; i < subjectData.teachers.length; i++) {
        const teacherId = subjectData.teachers[i];
        const subgroup = i === 0 ? 'I' : 'II';
        
        console.log(`Loading students for ${subgroup} subgroup, teacher ${teacherId}`);
        
        try {
          // Загружаем студентов без использования кэша
          const apiStudents = await teacherApiService.getGroupStudentsWithoutCache(groupId, stId, teacherId);
          
          if (apiStudents && apiStudents.length > 0) {
            // Фильтруем студентов, исключая уже загруженных
            const uniqueStudents = apiStudents.filter((student: any) => {
              if (loadedStudentIds.has(student.idStudent)) {
                console.log(`Студент ${student.idStudent} ${student.lastName} уже загружен, пропускаем`);
                return false;
              }
              loadedStudentIds.add(student.idStudent);
              return true;
            });

            const transformedStudents: Student[] = uniqueStudents.map((student: any) => ({
              id: student.idStudent,
              lastName: student.lastName,
              firstName: student.name,
              middleName: student.patronymic,
              subgroup: subgroup,
              marks: student.marks || []
            }));

            // Сортируем студентов по фамилии
            const sortedStudents = transformedStudents.sort((a, b) => 
              a.lastName.localeCompare(b.lastName)
            );

            subgroupStudentsData[subgroup] = sortedStudents;
            
            console.log(`Loaded ${sortedStudents.length} unique students for ${subgroup} subgroup`);
            console.log(`Students in ${subgroup}:`, sortedStudents.map(s => `${s.lastName} ${s.id}`));
          }
        } catch (error) {
          console.error(`Error loading students for ${subgroup} subgroup:`, error);
        }
      }

      setSubgroupStudents(subgroupStudentsData);

      // Объединяем всех студентов для отображения (уже без дубликатов)
      const allStudents = [
        ...subgroupStudentsData['I'],
        ...subgroupStudentsData['II']
      ].sort((a, b) => a.lastName.localeCompare(b.lastName));

      setStudents(allStudents);
      
      // Обновляем распределение по подгруппам
      const updatedStudentSubgroups: Record<number, 'I' | 'II'> = {};
      allStudents.forEach(student => {
        if (student.subgroup) {
          updatedStudentSubgroups[student.id] = student.subgroup;
        }
      });
      setStudentSubgroups(updatedStudentSubgroups);

      console.log('Total unique students loaded:', allStudents.length);
      console.log('Subgroup distribution:', updatedStudentSubgroups);
      console.log('Students in I subgroup:', subgroupStudentsData['I'].length);
      console.log('Students in II subgroup:', subgroupStudentsData['II'].length);

    } catch (error) {
      console.error('Error loading students from subgroups:', error);
      throw error;
    }
  };

  // Функция для загрузки данных о занятии (ST)
  const loadStData = async (): Promise<void> => {
    if (!idSt) return;

    try {
      console.log('Loading ST data...');
      const stData = await teacherApiService.getStData(idSt);
      setStData(stData);
      console.log('ST data loaded:', stData);
    } catch (error) {
      console.error('Error loading ST data:', error);
    }
  };

  // функция загрузки типов занятий
  const loadLessonTypes = async (): Promise<Record<string, LessonTypeInfo>> => {
    if (!idSt) {
      return {};
    }

    try {
      
      // Загружаем типы занятий через API
      const apiLessonTypes = await teacherApiService.getLessonTypes(idSt);

      // Создаем объект lessonTypesData на основе загруженных типов
      const newLessonTypes: Record<string, LessonTypeInfo> = {};
      
      // Для каждой даты занятия устанавливаем тип из API если доступен
      if (lessonDates && lessonDates.length > 0) {
        for (const lesson of lessonDates) {
          const dateObj = new Date(lesson.date);
          const day = dateObj.getDate().toString().padStart(2, '0');
          const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
          const displayDate = `${day}.${month} (${lesson.number})`;
          
          // Получаем информацию о занятии для определения типа
          try {
            const firstStudent = students[0];
            if (firstStudent) {
              const lessonInfo = await fetchLessonInfo(firstStudent.id, lesson.number);
              if (lessonInfo && lessonInfo.typeMark) {
                const lessonType = getLessonTypeFromFullName(lessonInfo.typeMark);
                newLessonTypes[displayDate] = {
                  type: lessonType,
                  topic: lessonInfo.comment || '',
                  comment: lessonInfo.comment || '',
                  fullType: lessonInfo.typeMark
                };
              } else {
                newLessonTypes[displayDate] = {
                  type: '', // Пока пустой
                  topic: '',
                  comment: ''
                };
              }
            } else {
              newLessonTypes[displayDate] = {
                type: '', // Пока пустой
                topic: '',
                comment: ''
              };
            }
          } catch (error) {
            console.error(`Ошибка при загрузке типа занятия для даты ${displayDate}:`, error);
            newLessonTypes[displayDate] = {
              type: '',
              topic: '',
              comment: ''
            };
          }
        }
      } else {
      }

      return newLessonTypes;
      
    } catch (error) {
      return {};
    }
  };

  // Функция для принудительного обновления типов занятий
  const refreshLessonTypes = async (): Promise<void> => {
    try {
      setLoadingLessonTypes(true);
      console.log('Обновление типов занятий...');
      
      const apiLessonTypes = await loadLessonTypes();
      
      setLessonTypesData(apiLessonTypes);
      
      setGradeRecords(prev => 
        prev.map(record => {
          const newTypeData = apiLessonTypes[record.date];
          return newTypeData ? { ...record, lessonType: newTypeData.type } : record;
        })
      );
      
      console.log('Типы занятий успешно обновлены:', Object.keys(apiLessonTypes).length, 'занятий');
      console.log('Детали типов:', apiLessonTypes);
      
    } catch (error) {
      console.error('Ошибка при обновлении типов занятий:', error);
    } finally {
      setLoadingLessonTypes(false);
    }
  };

  // Функция для получения информации о занятии
  const fetchLessonInfo = async (studentId: number, lessonNumber: number): Promise<LessonInfo | null> => {
    try {
      if (!idSt) {
        console.log('Semester not available, skipping lesson info fetch');
        return null;
      }
      const lessonInfo = await teacherApiService.getLessonInfo(studentId, idSt, lessonNumber);
      return lessonInfo;
    } catch (err) {
      console.error('Ошибка при загрузке информации о занятии:', err);
      return null;
    }
  };

  // функция для распределения подгрупп
  const fetchSubjectTeachersData = async (teacherId: number): Promise<void> => {
    try {
      const data = await teacherApiService.getTeacherSubjects(teacherId);
      setSubjectTeachersData(data);
      
      await fetchSubgroupTeachers(teacherId);
      
    } catch (error) {
      console.error('Error loading teacher subjects data:', error);
      setHasMultipleTeachers(false);
    }
  };

  // Функция для загрузки преподавателей подгрупп
  const fetchSubgroupTeachers = async (teacherId: number): Promise<void> => {
    try {
      const groupId = teacherApiService.getGroupIdFromNumber(groupNumber);
      if (!groupId) return;

      const subjectId = await teacherApiService.getSubjectIdByName(subject);
      if (!subjectId || subjectId === 0) return;

      const subjectTeachersData = await teacherApiService.getSubjectTeachersData();
      const allStaff = await teacherApiService.getAllStaff();
      
      const subjectData = subjectTeachersData.find(item => 
        item.groups.includes(groupId) && item.idSubject === subjectId
      );
      
      if (!subjectData) return;

      const teachers: SubgroupTeachersState = {
        'I': 'Преподаватель не назначен',
        'II': 'Преподаватель не назначен'
      };
      
      subjectData.teachers.forEach((teacherId, index) => {
        const teacher = allStaff.find(staff => staff.id === teacherId);
        if (teacher) {
          const teacherFullName = `${teacher.lastName} ${teacher.name.charAt(0)}.${teacher.patronymic.charAt(0)}.`;
          
          if (index === 0) {
            teachers['I'] = teacherFullName;
          } else if (index === 1) {
            teachers['II'] = teacherFullName;
          }
        }
      });
      
      setSubgroupTeachers(teachers);
      
      const hasMultiple = subjectData.teachers.length > 1;
      setHasMultipleTeachers(hasMultiple);
      
    } catch (error) {
      console.error('Error loading subgroup teachers:', error);
    }
  };

  // Загрузка данных о подгруппах
  const fetchSubgroupsData = async (teacherId: number, studentsList: Student[]): Promise<void> => {
    try {
      const subgroups = await teacherApiService.getSubgroupsForTeacher(teacherId);
      const updatedStudentSubgroups: Record<number, 'I' | 'II'> = {};

      if (subgroups.length > 0) {
        const studentToSubgroup: Record<number, 'I' | 'II'> = {};
        
        subgroups.forEach((subgroup, index) => {
          const subgroupLabel = index === 0 ? 'I' : 'II';
          subgroup.students.forEach(studentId => {
            studentToSubgroup[studentId] = subgroupLabel;
          });
        });

        studentsList.forEach(student => {
          updatedStudentSubgroups[student.id] = studentToSubgroup[student.id] || 'I';
        });
      } else {
        studentsList.forEach(student => {
          updatedStudentSubgroups[student.id] = 'I';
        });
      }

      setStudentSubgroups(updatedStudentSubgroups);
    } catch (error) {
      console.error('Ошибка загрузки данных подгрупп:', error);
      const defaultSubgroups: Record<number, 'I' | 'II'> = {};
      studentsList.forEach(student => {
        defaultSubgroups[student.id] = 'I';
      });
      setStudentSubgroups(defaultSubgroups);
    }
  };

  // Инициализация данных при монтировании
  useEffect(() => {
    loadAllData();
  }, [groupNumber, subject]);

  // Инициализация записей оценок когда студенты и даты загружены
  useEffect(() => {
    if (students.length === 0 || allDates.length === 0) return;
    
    console.log('Initializing grade records...');
    
    const initialGradeRecords: GradeRecord[] = [];
    const initialExamRecords: ExamRecord[] = [];
    
    students.forEach(student => {
      allDates.forEach(date => { 
        const lessonNumber = getLessonNumber(date);
        const existingMark = student.marks?.find(mark => mark.number === lessonNumber);
        
        const initialGrade = existingMark && existingMark.value !== null 
          ? existingMark.value.toString() 
          : '';
        
        initialGradeRecords.push({
          id: Date.now() + Math.random(),
          studentId: student.id,
          date: date,
          lessonType: '',
          topic: '',
          grade: initialGrade
        });
      });

      initialExamRecords.push({
        id: Date.now() + Math.random(),
        studentId: student.id,
        examType: '',
        grade: ''
      });
    });
    
    setGradeRecords(initialGradeRecords);
    setExamRecords(initialExamRecords);

    setStudentSubgroups(prev => {
      const hasExistingSubgroups = Object.keys(prev).length > 0;
      if (hasExistingSubgroups) {
        return prev;
      }
      
      const initialSubgroups: Record<number, 'I' | 'II'> = {};
      students.forEach(student => {
        initialSubgroups[student.id] = 'I';
      });
      return initialSubgroups;
    });
  }, [students, allDates]);


  // Функция для принудительного обновления данных
  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    setError(null);
    setShowCacheWarning(false);
    
    try {
      teacherApiService.invalidateStudentCache();
      teacherApiService.invalidateLessonDatesCache();
      teacherApiService.invalidateLessonInfoCache();
      teacherApiService.invalidateSubgroupsCache();
      teacherApiService.invalidateLessonTypesCache();
      
      await loadAllData();
      console.log('Данные успешно обновлены');
    } catch (error) {
      console.error('Ошибка при обновлении данных:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Функция для открытия модального окна добавления даты
  const handleOpenAddDateModal = async (): Promise<void> => {
    if (!idSt || !idTeacher) {
      alert('Недостаточно данных для добавления даты');
      return;
    }

    setLoadingLessons(true);
    try {
      const groupId = teacherApiService.getGroupIdFromNumber(groupNumber);
      if (!groupId) {
        throw new Error('Не удалось определить ID группы');
      }

      const availableLessons = await teacherApiService.getLessonsForDateAddition(idSt, groupId, idTeacher);
      
      setAddDateModal({
        isOpen: true,
        availableLessons: availableLessons || [],
        selectedLesson: null
      });
    } catch (error) {
      console.error('Error fetching available lessons:', error);
      alert('Не удалось загрузить доступные занятия для добавления');
    } finally {
      setLoadingLessons(false);
    }
  };

  // Функция для добавления столбца с датой
  const handleAddDateColumn = async (): Promise<void> => {
    if (!addDateModal.selectedLesson || !idSt || !idTeacher) {
      alert('Выберите занятие для добавления');
      return;
    }

    setManagingDate(true);
    try {
      const groupId = teacherApiService.getGroupIdFromNumber(groupNumber);
      if (!groupId) {
        throw new Error('Не удалось определить ID группы');
      }

      const addRequest: AddDateColumnRequest = {
        idGroup: groupId,
        idSt: idSt,
        idLesson: addDateModal.selectedLesson.id,
        idTeacher: idTeacher
      };
      
      const result = await teacherApiService.addDateColumn(addRequest);
      
      if (result.success) {
        alert('Столбец с датой успешно добавлен');
        setAddDateModal({ isOpen: false, availableLessons: [], selectedLesson: null });
        
        teacherApiService.invalidateStudentCache();
        teacherApiService.invalidateLessonDatesCache();
        
        await loadAllData();
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
    if (!idSt || !idTeacher) {
      alert('Недостаточно данных для удаления даты');
      return;
    }

    setManagingDate(true);
    try {
      const groupId = teacherApiService.getGroupIdFromNumber(groupNumber);
      if (!groupId) {
        throw new Error('Не удалось определить ID группы');
      }

      const deleteRequest: DeleteDateColumnRequest = {
        idGroup: groupId,
        idSt: idSt,
        idTeacher: idTeacher,
        number: deleteDateModal.lessonNumber
      };
      
      const result = await teacherApiService.deleteDateColumn(deleteRequest);
      
      if (result.success) {
        alert('Столбец с датой успешно удален');
        setDeleteDateModal({ isOpen: false, dateToDelete: '', lessonNumber: 0 });
        
        teacherApiService.invalidateStudentCache();
        teacherApiService.invalidateLessonDatesCache();
        
        await loadAllData();
      }
    } catch (error: any) {
      console.error('Error deleting date column:', error);
      alert(`Ошибка при удалении столбца: ${error.message}`);
    } finally {
      setManagingDate(false);
    }
  };

  const handleDateButtonClick = async (date: string): Promise<void> => {
    const lessonNumber = getLessonNumber(date);
    if (lessonNumber === 0) return;

    if (lessonTypes.length === 0 && idSt) {
      await loadLessonTypes();
    }

    const firstStudent = filteredStudents[0];
    if (!firstStudent || !idSt || !idTeacher) return;

    try {
      console.log(`Открытие модального окна для даты: ${date}, номер занятия: ${lessonNumber}`);

      const lessonInfo = await fetchLessonInfo(firstStudent.id, lessonNumber);
      
      const groupId = teacherApiService.getGroupIdFromNumber(groupNumber);
      if (!groupId) {
        throw new Error('Не удалось определить ID группы');
      }

      const lessonsInfo = await teacherApiService.getLessonsInfo(idSt, groupId, idTeacher);
      const lessonFromInfo = lessonsInfo.find((lesson: any) => lesson.number === lessonNumber);

      console.log('Найденные данные о занятии:', { lessonInfo, lessonFromInfo });

      const lessonFromDates = lessonDates.find(l => {
        const dateObj = new Date(l.date);
        const day = dateObj.getDate().toString().padStart(2, '0');
        const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
        const formattedDate = `${day}.${month}`;
        return date.startsWith(formattedDate) && l.number === lessonNumber;
      });

      const correctNumPair = lessonFromInfo?.numPair || lessonFromDates?.lessonInfo?.numPair || lessonInfo?.numPair || lessonNumber;

      const modalData: LessonDateModalData = {
        date,
        lessonNumber,
        typeMark: lessonInfo?.typeMark || '',
        comment: lessonInfo?.comment || '',
        numberWeek: lessonFromInfo?.numberWeek || lessonInfo?.numberWeek || 0,
        dayWeek: lessonFromInfo?.dayWeek || lessonInfo?.dayWeek || '',
        typeWeek: lessonFromInfo?.typeWeek || lessonInfo?.typeWeek || '',
        numPair: correctNumPair,
        number: lessonNumber
      };

      setShowDateModal(modalData);
      setDateModalData({
        typeMark: lessonInfo?.typeMark || '',
        comment: lessonInfo?.comment || ''
      });

      console.log('Модальное окно открыто с данными:', modalData);

    } catch (error) {
      console.error('Ошибка при открытии модального окна:', error);
      alert('Не удалось загрузить данные о занятии');
    }
  };

  const handleSaveDateInfo = async (): Promise<void> => {
    if (!showDateModal || !idSt || !idTeacher) return;

    setUpdatingLessonType(true);
    
    try {
      const groupId = teacherApiService.getGroupIdFromNumber(groupNumber);
      if (!groupId) {
        throw new Error('Не удалось определить ID группы');
      }

      console.log('Начало сохранения данных занятия:');
      console.log('- Номер занятия:', showDateModal.lessonNumber);
      console.log('- Тип занятия:', dateModalData.typeMark);
      console.log('- Тема занятия:', dateModalData.comment);

      // 1. Получаем ID типа занятия
      const lessonTypeId = teacherApiService.getLessonTypeIdByName(lessonTypes, dateModalData.typeMark);
      
      if (!lessonTypeId) {
        throw new Error(`Тип занятия "${dateModalData.typeMark}" не найден. Доступные типы: ${lessonTypes.map(lt => lt.name).join(', ')}`);
      }

      console.log('ID типа занятия:', lessonTypeId);

      let idSupplement: number | null = null;

      // 2. Проверяем, есть ли уже supplement для этого занятия
      // Берем первого студента для проверки существующего supplement
      const firstStudent = filteredStudents[0];
      if (firstStudent) {
        const existingLessonInfo = await fetchLessonInfo(firstStudent.id, showDateModal.lessonNumber);
        if (existingLessonInfo && existingLessonInfo.idSupplement) {
          idSupplement = existingLessonInfo.idSupplement;
          console.log('Найден существующий supplement:', idSupplement);
        }
      }

      // 3. Если supplement не существует и есть тема занятия - создаем новый
      if (!idSupplement && dateModalData.comment && dateModalData.comment.trim() !== '') {
        try {
          console.log('Создание нового supplement...');
          
          if (!firstStudent) {
            throw new Error('Нет студентов для создания supplement');
          }

          const supplementResult = await teacherApiService.createSupplement(
            lessonTypeId,
            dateModalData.comment.trim(),
            firstStudent.id,
            idSt,
            showDateModal.lessonNumber
          );
          
          if (supplementResult.success && supplementResult.idSupplement) {
            idSupplement = supplementResult.idSupplement;
            console.log('Supplement создан с ID:', idSupplement);
          } else {
            console.warn('Supplement создан, но ID не получен');
          }
        } catch (supplementError) {
          console.error('Ошибка при создании supplement:', supplementError);
        }
      }
      
      // 4. Если supplement существует и есть новая тема - обновляем комментарий
      if (idSupplement && dateModalData.comment && dateModalData.comment.trim() !== '') {
        try {
          console.log('Обновление комментария supplement:', idSupplement);
          await teacherApiService.updateLessonComment(idSupplement, dateModalData.comment.trim());
          console.log('Комментарий supplement обновлен');
        } catch (commentError) {
          console.error('Ошибка при обновлении комментария supplement:', commentError);
        }
      }

      // 5. Обновляем тип занятия для всех студентов
      console.log('Обновление типа занятия для студентов...');
      
      const updatePromises = filteredStudents.map(async (student, index) => {
        try {
          // Небольшая задержка чтобы не перегружать сервер
          if (index > 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          const updateRequest: UpdateLessonTypeRequest = {
            idTeacher: idTeacher,
            idGroup: groupId,
            idStudent: student.id,
            idSt: idSt,
            number: showDateModal.lessonNumber,
            idTypeMark: lessonTypeId
          };

          console.log(`Обновление для студента ${student.id} (${student.lastName}):`, updateRequest);
          
          const result = await teacherApiService.updateLessonType(updateRequest);
          
          if (result.success) {
            console.log(`Тип занятия обновлен для студента ${student.id}`);
          } else {
            console.warn(`Не удалось обновить тип занятия для студента ${student.id}`);
          }
          
          return result;
        } catch (error) {
          console.error(`Ошибка обновления типа занятия для студента ${student.id}:`, error);
          return { success: false };
        }
      });

      // Ждем завершения всех обновлений
      const results = await Promise.all(updatePromises);
      const successfulUpdates = results.filter(result => result.success).length;
      
      console.log(`Результаты обновления: ${successfulUpdates}/${filteredStudents.length} успешно`);

      // 6. Обновляем UI
      const lessonType = getLessonTypeFromFullName(dateModalData.typeMark);
      const dateObj = new Date(showDateModal.date);
      const day = dateObj.getDate().toString().padStart(2, '0');
      const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
      const displayDate = `${day}.${month} (${showDateModal.lessonNumber})`;
      
      // Обновляем данные о типе занятия
      setLessonTypesData(prev => ({
        ...prev,
        [displayDate]: {
          type: lessonType || '',
          topic: dateModalData.comment || '',
          comment: dateModalData.comment || '',
          fullType: dateModalData.typeMark
        }
      }));

      // Обновляем записи оценок
      setGradeRecords(prev => 
        prev.map(record => 
          record.date === displayDate 
            ? { ...record, lessonType: lessonType || '' }
            : record
        )
      );

      // Инвалидируем кэш
      teacherApiService.invalidateLessonInfoCache();
      teacherApiService.invalidateStudentCache();

      console.log('Все операции завершены успешно');
      
      let successMessage = `Данные занятия успешно обновлены\nТип: ${dateModalData.typeMark}\nТема: ${dateModalData.comment || 'не указана'}\nОбновлено студентов: ${successfulUpdates}/${filteredStudents.length}`;
      
      if (idSupplement) {
        successMessage += `\nSupplement ID: ${idSupplement}`;
      }
      
      alert(successMessage);
      
      setShowDateModal(null);
      setDateModalData({ typeMark: '', comment: '' });
      
    } catch (error: any) {
      console.error('Критическая ошибка при обновлении данных занятия:', error);
      alert(`Ошибка при обновлении данных занятия: ${error.message}`);
    } finally {
      setUpdatingLessonType(false);
    }
  };

  useEffect(() => {
    if (idSt) {
      loadStData();
      loadLessonTypes();
    }
  }, [idSt]);

  // Фильтрация студентов по подгруппе
  const filteredStudents = students.filter(student => {
    if (selectedSubgroup === 'all') return true;
    return studentSubgroups[student.id] === selectedSubgroup;
  });

  // Фильтрация дат по выбранному диапазону и типу занятия
  const filteredDates = allDates.filter(date => {
    // Фильтр по диапазону дат
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
      const lessonType = getLessonTypeForDate(date);
      return lessonType === selectedLessonType;
    }
    
    return true;
  });

    useEffect(() => {
    console.log('Отладка фильтрации:', {
      selectedLessonType,
      lessonTypesData: Object.entries(lessonTypesData).map(([date, data]) => ({
        date,
        type: data.type,
        fullType: data.fullType
      })),
      allDatesCount: allDates.length,
      filteredDatesCount: filteredDates.length,
      lessonTypes: lessonTypes.map(lt => lt.name)
    });
  }, [selectedLessonType, lessonTypesData, filteredDates]);

  // Функция для автоматического распределения студентов по подгруппам
  const autoDistributeSubgroups = (): void => {
    const newDistribution: Record<number, 'I' | 'II'> = {};
    
    const sortedStudents = [...students].sort((a, b) => 
      a.lastName.localeCompare(b.lastName)
    );
    
    sortedStudents.forEach((student, index) => {
      newDistribution[student.id] = index % 2 === 0 ? 'I' : 'II';
    });
    
    setStudentSubgroups(newDistribution);
    console.log('Автораспределение выполнено');
  };

  // Функция для сохранения распределения по подгруппам
  const saveSubgroupsDistribution = async (): Promise<void> => {
    if (!idTeacher || !idSt) {
      alert('ID преподавателя не найден');
      return;
    }

    setSavingSubgroups(true);
    try {
      console.log('=== СОХРАНЕНИЕ ПОДГРУПП ===');

      const result = await teacherApiService.saveSubgroupsDistribution(
        idSt, 
        idTeacher, 
        studentSubgroups, 
        groupNumber, 
        subject
      );
      
      if (result.success) {
        alert('Распределение по подгруппам успешно сохранено');
        setShowSubgroupModal(false);
        
        console.log('Немедленное обновление интерфейса...');
        
        teacherApiService.invalidateStudentCache();
        teacherApiService.invalidateSubgroupsCache();
        teacherApiService.invalidateSubjectTeachersCache();
        
        console.log('Немедленная перезагрузка студентов...');
        await loadStudentsFromAllSubgroups(idTeacher, idSt);
        
        console.log('Обновление состояния интерфейса...');
        
        setSelectedSubgroup('all');
        
        await fetchSubjectTeachersData(idTeacher);
        
        console.log('Интерфейс успешно обновлен после сохранения подгрупп');
        
      } else {
        throw new Error('Сервер вернул ошибку');
      }
      
    } catch (error: any) {
      console.error('Ошибка при сохранении подгрупп:', error);
      
      let errorMessage = 'Неизвестная ошибка';
      
      if (error.message.includes('500')) {
        errorMessage = `Внутренняя ошибка сервера: ${error.message}`;
      } else if (error.message.includes('404')) {
        errorMessage = `Ресурс не найден: ${error.message}`;
      } else if (error.message.includes('Failed to fetch') || error.message.includes('Network Error')) {
        errorMessage = 'Ошибка соединения с сервером. Проверьте подключение к интернету.';
      } else {
        errorMessage = error.message || 'Неизвестная ошибка';
      }
      
      alert(`Ошибка при сохранении распределения по подгруппам:\n\n${errorMessage}`);
    } finally {
      setSavingSubgroups(false);
    }
  };

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

  // Фокус на select при редактировании экзамена
  useEffect(() => {
    if (editingCell && editingCell.field === 'exam' && examInputRef.current) {
      examInputRef.current.focus();
    }
  }, [editingCell]);

  // Получение записи оценки для студента и даты
  const getGradeRecord = (studentId: number, date: string): GradeRecord => {
    const lessonNumber = getLessonNumber(date);
    const student = students.find(s => s.id === studentId);
    
    const existingRecord = gradeRecords.find(record => 
      record.studentId === studentId && record.date === date
    );
    
    if (existingRecord) {
      return existingRecord;
    }
    
    if (student && student.marks) {
      const apiMark = student.marks.find(mark => mark.number === lessonNumber);
      if (apiMark && apiMark.value !== null) {
        console.log(`Found API grade for student ${studentId}, date ${date}, lesson ${lessonNumber}: ${apiMark.value}`);
        
        return {
          id: Date.now() + Math.random(),
          studentId,
          date,
          lessonType: '',
          topic: '',
          grade: apiMark.value.toString()
        };
      }
    }
    
    return {
      id: Date.now() + Math.random(),
      studentId,
      date,
      lessonType: '',
      topic: '',
      grade: ''
    };
  };

  // Получение экзаменационной записи для студента
  const getExamRecord = (studentId: number): ExamRecord => {
    const record = examRecords.find(record => record.studentId === studentId);
    if (record) {
      return record;
    }
    
    return {
      id: Date.now() + Math.random(),
      studentId,
      examType: globalExamType as any,
      grade: ''
    };
  };

  // Обновление записи оценки
  const updateGradeRecord = (studentId: number, date: string, updates: Partial<GradeRecord>): void => {
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
        const newRecord: GradeRecord = {
          id: Date.now() + Math.random(),
          studentId,
          date,
          lessonType: '',
          topic: '',
          grade: '',
          ...updates
        };
        return [...prev, newRecord];
      }
    });
  };

  // Обновление экзаменационной записи
  const updateExamRecord = (studentId: number, updates: Partial<ExamRecord>): void => {
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
  const updateStudentSubgroup = (studentId: number, subgroup: 'I' | 'II'): void => {
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
  ): void => {
    const record = getGradeRecord(studentId, date);
    console.log(`Редактирование: студент ${studentId}, дата ${date}, поле ${field}, значение ${currentValue}`);
    
    setEditingCell({ studentId, date, field });
    setEditValue(currentValue);
  };

  // Сохранение редактирования оценки
  const handleSaveEdit = async (): Promise<void> => {
    if (!editingCell) return;

    try {
      if (editingCell.field === 'grade') {
        if (validGrades.includes(editValue) || editValue === '') {
          updateGradeRecord(editingCell.studentId, editingCell.date, { grade: editValue });
          
          if (editValue !== '' && idSt) {
            const lessonNumber = getLessonNumber(editingCell.date);
            
            const updateRequest: UpdateMarkGradeRequest = {
              idStudent: editingCell.studentId,
              idSt: idSt,
              mark: parseFloat(editValue),
              number: lessonNumber
            };
            
            console.log('Sending mark update request:', updateRequest);
            
            const result = await teacherApiService.updateMark(updateRequest);
            
            if (result.success) {
              console.log('Mark successfully updated on server');
            }
          }
        }
      } else if (editingCell.field === 'lessonType') {
        const lessonTypeValue = editValue as LessonType;
        updateGradeRecord(editingCell.studentId, editingCell.date, { lessonType: lessonTypeValue });
      } else if (editingCell.field === 'topic') {
        updateGradeRecord(editingCell.studentId, editingCell.date, { topic: editValue });
      } else if (editingCell.field === 'exam') {
        const examRecord = getExamRecord(editingCell.studentId);
        const allowedGrades = examGrades[examRecord.examType as keyof typeof examGrades] || [];
        
        if (editValue === '' || allowedGrades.includes(editValue)) {
          updateExamRecord(editingCell.studentId, { grade: editValue });
        }
      }
    } catch (error) {
      console.error('Error saving mark:', error);
      alert('Ошибка при сохранении оценки. Попробуйте еще раз.');
    } finally {
      setEditingCell(null);
      setEditValue('');
    }
  };

  // Отмена редактирования
  const handleCancelEdit = (): void => {
    setEditingCell(null);
    setEditValue('');
  };

  // Обработка нажатия клавиш
  const handleKeyPress = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  // Функция для обновления карты комментариев
  const updateStudentCommentsMap = (studentId: number, lessonNumber: number, history: ChangeHistory[]) => {
    const key = `${studentId}_${lessonNumber}`;
    setStudentCommentsMap(prev => ({
      ...prev,
      [key]: {
        teacher: history.filter(change => change.teacherOrStudent && (change.comment || change.files)),
        student: history.filter(change => !change.teacherOrStudent && (change.comment || change.files))
      }
    }));
  };

  // Функция для загрузки комментариев для всех студентов и дат
  const loadAllComments = async (): Promise<void> => {
    if (!idSt || students.length === 0 || allDates.length === 0) return;

    setLoadingStudentHistory(true);
    try {
      console.log('Загрузка комментариев для всех студентов и дат...');
      
      const newStudentCommentsMap: Record<string, {
        teacher: ChangeHistory[];
        student: ChangeHistory[];
      }> = {};

      // Загружаем комментарии для каждой комбинации студент-дата
      for (const student of students) {
        for (const date of allDates) {
          const lessonNumber = getLessonNumber(date);
          const key = `${student.id}_${lessonNumber}`;
          
          try {
            const history = await teacherApiService.getStudentChangeHistory(student.id, idSt, lessonNumber);
            const transformedHistory = transformChangeHistory(history);
            
            newStudentCommentsMap[key] = {
              teacher: transformedHistory.filter(change => 
                change.teacherOrStudent && (change.comment || change.files)
              ),
              student: transformedHistory.filter(change => 
                !change.teacherOrStudent && (change.comment || change.files)
              )
            };
            
            // Небольшая задержка чтобы не перегружать сервер
            await new Promise(resolve => setTimeout(resolve, 50));
          } catch (error) {
            console.error(`Ошибка загрузки комментариев для студента ${student.id}, занятие ${lessonNumber}:`, error);
            newStudentCommentsMap[key] = { teacher: [], student: [] };
          }
        }
      }
      
      setStudentCommentsMap(newStudentCommentsMap);
      console.log('Все комментарии загружены:', Object.keys(newStudentCommentsMap).length);
      
    } catch (error) {
      console.error('Ошибка при загрузке всех комментариев:', error);
    } finally {
      setLoadingStudentHistory(false);
    }
  };

  // Функцию для преобразования типов
  const transformChangeHistory = (history: any[]): ChangeHistory[] => {
    return history.map(item => ({
      ...item,
      idSupplement: item.idSupplement || item.id,
      files: item.files ? (Array.isArray(item.files) ? item.files.map((file: any, index: number) => {
        if (typeof file === 'object' && file !== null && file.id && file.name) {
          return {
            ...file,
            fileId: file.id, // Используем id файла из paths
            supplementId: item.idSupplement || item.id
          };
        } else if (typeof file === 'string') {
          return {
            id: index + 1,
            name: file.split('/').pop() || `Файл ${index + 1}`,
            fileId: index + 1, // Запасной вариант
            supplementId: item.idSupplement || item.id
          };
        } else {
          return {
            id: index + 1,
            name: `Файл ${index + 1}`,
            fileId: index + 1, // Запасной вариант
            supplementId: item.idSupplement || item.id
          };
        }
      }) : []) : null
    }));
  };

  // Функция для загрузки истории изменений студента
  const loadStudentChangeHistory = async (studentId: number, lessonNumber: number): Promise<void> => {
    if (!idSt) return;
    
    setLoadingStudentHistory(true);
    try {
      console.log(`Loading change history for student ${studentId}, lesson ${lessonNumber}`);
      
      const history = await teacherApiService.getStudentChangeHistory(studentId, idSt, lessonNumber);
      const transformedHistory = transformChangeHistory(history);
      setStudentChangeHistory(transformedHistory);
      updateStudentCommentsMap(studentId, lessonNumber, transformedHistory);
      console.log('Student change history loaded:', transformedHistory);
    } catch (error) {
      console.error('Error loading student change history:', error);
      setStudentChangeHistory([]);
    } finally {
      setLoadingStudentHistory(false);
    }
  };

  // Функции для получения комментариев
  const getStudentCommentsForCell = (studentId: number, date: string): ChangeHistory[] => {
    const lessonNumber = getLessonNumber(date);
    const key = `${studentId}_${lessonNumber}`;
    return studentCommentsMap[key]?.student || [];
  };

  const getTeacherCommentsForCell = (studentId: number, date: string): ChangeHistory[] => {
    const lessonNumber = getLessonNumber(date);
    const key = `${studentId}_${lessonNumber}`;
    return studentCommentsMap[key]?.teacher || [];
  };

  const handleDownloadFile = async (fileId: number, fileName: string): Promise<void> => {
    try {
      console.log(`Attempting to download file: ${fileName} (File ID: ${fileId})`);
      
      // Используем новый метод скачивания по fileId
      await teacherApiService.downloadFileById(fileId, fileName);
    } catch (error: any) {
      console.error('Ошибка при скачивании файла:', error);
      
      let errorMessage = 'Не удалось скачать файл';
      
      if (error.message.includes('404')) {
        errorMessage = 'Файл не найден на сервере';
      } else if (error.message.includes('403')) {
        errorMessage = 'Нет доступа к файлу';
      } else if (error.message.includes('network') || error.message.includes('Network')) {
        errorMessage = 'Проблемы с подключением к серверу';
      }
      
      alert(`${errorMessage}: ${fileName}`);
    }
  };

  const FileItemSimple: React.FC<{ 
    file: { 
      id: number; 
      name: string;
      supplementId?: number; // ID supplement для скачивания
      fileId?: number; // ID файла из paths
    }; 
    onDownload: (fileId: number, fileName: string) => Promise<void>;
  }> = ({ file, onDownload }) => {
    const [downloading, setDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState<string | null>(null);

    const handleDownload = async (): Promise<void> => {
      setDownloading(true);
      setDownloadError(null);
      
      try {
        // Приоритет: fileId (из paths) > supplementId (старый метод)
        const fileIdToDownload = file.fileId || file.supplementId || file.id;
        console.log(`Starting download for file: ${file.name} (File ID: ${fileIdToDownload})`);
        
        await onDownload(fileIdToDownload, file.name);
        console.log(`Download completed for file: ${file.name}`);
      } catch (error: any) {
        console.error('Download error:', error);
        setDownloadError(error.message || 'Не удалось скачать файл');
        
        setTimeout(() => {
          alert(`Ошибка скачивания файла: ${error.message || 'Неизвестная ошибка'}`);
        }, 100);
      } finally {
        setDownloading(false);
      }
    };

    return (
      <div className="file-item-simple">
        <div className="file-icon">📄</div>
        <div className="file-info-simple">
          <span 
            className="file-name-simple" 
            title={file.name}
          >
            {file.name.length > 30 ? `${file.name.substring(0, 30)}...` : file.name}
          </span>
          {downloadError && (
            <div className="download-error">
              Ошибка
            </div>
          )}
          <button 
            className={`download-btn-simple ${downloading ? 'downloading' : ''}`}
            onClick={handleDownload}
            disabled={downloading}
            title={`Скачать ${file.name}`}
          >
            {downloading ? 'Скачивание...' : 'Скачать'}
          </button>
        </div>
      </div>
    );
  };

  // Функция для открытия модального окна комментария
  const handleOpenCommentModal = async (studentId: number, date: string): Promise<void> => {
    const record = getGradeRecord(studentId, date);
    const lessonNumber = getLessonNumber(date);
    
    setCommentModalData({ studentId, date });
    setTeacherCommentText(record.comment || '');
    setTeacherAttachedFiles([]);
    setActiveCommentTab('teacher');
    
    await loadStudentChangeHistory(studentId, lessonNumber);
  };

  // Функция для получения комментариев студента из истории
  const getStudentComments = (): ChangeHistory[] => {
    return studentChangeHistory.filter(change => 
      !change.teacherOrStudent && (change.comment || change.files)
    );
  };

  // Функция для получения комментариев преподавателя из истории
  const getTeacherComments = (): ChangeHistory[] => {
    return studentChangeHistory.filter(change => 
      change.teacherOrStudent && (change.comment || change.files)
    );
  };

  // Функция для сохранения комментария преподавателя
  const handleSaveTeacherComment = async (): Promise<void> => {
    if (!commentModalData || !idTeacher || !idSt) return;

    setUploadingFiles(true);
    try {
      const lessonNumber = getLessonNumber(commentModalData.date);
      const groupId = teacherApiService.getGroupIdFromNumber(groupNumber);
      const key = `${commentModalData.studentId}_${lessonNumber}`;

      if (!groupId) {
        throw new Error('Не удалось определить ID группы');
      }

      let idSupplement: number | undefined;

      if (teacherCommentText.trim() || teacherAttachedFiles.length > 0) {
        const commentResult = await teacherApiService.addTeacherComment({
          idTeacher: idTeacher,
          idGroup: groupId,
          idStudent: commentModalData.studentId,
          idSt: idSt,
          number: lessonNumber,
          comment: teacherCommentText.trim()
        });

        if (commentResult.idSupplement) {
          idSupplement = commentResult.idSupplement;
          
          if (teacherAttachedFiles.length > 0) {
            console.log('Starting file upload for supplement:', idSupplement);
            const fileResult = await teacherApiService.addTeacherCommentFiles(
              idSupplement, 
              teacherAttachedFiles
            );
            console.log('File upload result:', fileResult);
          }
        }
      }

      updateGradeRecord(
        commentModalData.studentId, 
        commentModalData.date, 
        { 
          comment: teacherCommentText.trim() || undefined
        }
      );

      await loadStudentChangeHistory(commentModalData.studentId, lessonNumber);

      setTeacherCommentText('');
      setTeacherAttachedFiles([]);

      console.log('Комментарий преподавателя успешно сохранен');
      
    } catch (error) {
      console.error('Ошибка при сохранении комментария преподавателя:', error);
      alert('Ошибка при сохранении комментария. Попробуйте еще раз.');
    } finally {
      setUploadingFiles(false);
    }
  };

  // Функция для удаления файла преподавателя
  const removeTeacherFile = (index: number): void => {
    setTeacherAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Функция для рендера секции файлов преподавателя
  const renderTeacherFilesSection = (files: File[], removeFile: (index: number) => void) => {
    if (!files || files.length === 0) {
      return null;
    }

    const createImagePreview = (file: File): string => {
      return URL.createObjectURL(file);
    };

    const handleImagePreviewClick = (file: File) => {
      const imageUrl = URL.createObjectURL(file);
      window.open(imageUrl, '_blank');
    };

    return (
      <div className="attached-files-section">
        <div className="files-header">
          <span>Прикрепленные файлы ({files.length})</span>
        </div>
        <div className="files-instruction">
          Для прикрепления изображений можете использовать комбинацию Ctrl+V в поле комментария
        </div>
        <div className="files-list">
          {files.map((file, index) => {
            const isImage = file.type.startsWith('image/');
            const previewUrl = isImage ? createImagePreview(file) : '';
            
            return (
              <div key={index} className="file-item">
                {isImage ? (
                  <div className="image-preview-container">
                    <div className="file-info">
                      <span className="file-name">{file.name}</span>
                      <span className="file-size">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="file-info">
                    <div className="file-icon">📄</div>
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Функция для рендера истории комментариев
  const renderCommentHistory = (comments: ChangeHistory[], title: string, emptyMessage: string) => {
    if (loadingStudentHistory) {
      return (
        <div className="loading-section">
          <div className="loading-spinner"></div>
          <span>Загрузка {title.toLowerCase()}...</span>
        </div>
      );
    }

    if (comments.length === 0) {
      return (
        <div className="no-comments-section">
          {emptyMessage}
        </div>
      );
    }

    return (
      <div className="comment-history-section">
        <div className="comment-history-list">
          {comments.map((comment, index) => (
            <div key={comment.id} className="comment-history-item">
              <div className="comment-header">
                <span className="comment-date">
                  {new Date(comment.dateTime).toLocaleDateString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
                <span className={`comment-author-badge ${comment.teacherOrStudent ? 'teacher-badge' : 'student-badge'}`}>
                  {comment.teacherOrStudent ? 'Преподаватель' : 'Студент'}
                </span>
              </div>
              
              {comment.comment && (
                <div className="comment-text">
                  {comment.comment}
                </div>
              )}
              
                {comment.files && comment.files.length > 0 && (
                  <div className="comment-files-simple">
                    <div className="files-header-simple">
                      <span>Прикрепленные файлы ({comment.files.length})</span>
                    </div>
                    <div className="files-list-simple">
                      {comment.files.map((file, fileIndex) => (
                        <FileItemSimple 
                          key={file.id} 
                          file={file}
                          onDownload={handleDownloadFile}
                        />
                      ))}
                    </div>
                  </div>
                )}
            
              {index < comments.length - 1 && <div className="comment-divider"></div>}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Рендер модального окна комментария с вкладками
  const renderCommentModal = (): React.ReactElement | null => {
    if (!commentModalData) return null;

    const student = students.find(s => s.id === commentModalData.studentId);
    const studentComments = getStudentComments();
    const teacherComments = getTeacherComments();

    return (
      <div className="modal-overlay">
        <div className="modal-content comment-modal expanded">
          <h3 style={{ marginBottom: '16px', color: '#002FA7' }}>
            Комментарии к оценке {student ? `${student.lastName} ${student.firstName[0]}.${student.middleName[0]}.` : ''}
          </h3>
          
          <div className="comment-tabs-fullwidth">
            <button 
              className={`comment-tab-fullwidth ${activeCommentTab === 'teacher' ? 'active' : ''}`}
              onClick={() => setActiveCommentTab('teacher')}
            >
              <span className="tab-title">Комментарий преподавателя</span>
              {teacherComments.length > 0 && (
                <span className="tab-badge-fullwidth">{teacherComments.length}</span>
              )}
            </button>
            <button 
              className={`comment-tab-fullwidth ${activeCommentTab === 'student' ? 'active' : ''}`}
              onClick={() => setActiveCommentTab('student')}
            >
              <span className="tab-title">Комментарий студента</span>
              {studentComments.length > 0 && (
                <span className="tab-badge-fullwidth">{studentComments.length}</span>
              )}
            </button>
          </div>

          {activeCommentTab === 'teacher' && (
            <div className="tab-content-fullwidth">
              <div className="comment-input-section">
                <div className="comment-textarea-container">
                  <textarea
                    value={teacherCommentText}
                    onChange={(e) => setTeacherCommentText(e.target.value)}
                    onPaste={(e) => {
                      const items = e.clipboardData?.items;
                      if (!items) return;

                      const newFiles: File[] = [];
                      for (let i = 0; i < items.length; i++) {
                        const item = items[i];
                        if (item.kind === 'file') {
                          const file = item.getAsFile();
                          if (file && file.type.startsWith('image/')) {
                            newFiles.push(file);
                            e.preventDefault();
                          }
                        }
                      }
                      if (newFiles.length > 0) {
                        setTeacherAttachedFiles(prev => [...prev, ...newFiles]);
                      }
                    }}
                    placeholder="Введите комментарий преподавателя..."
                    rows={4}
                    className="comment-textarea"
                  />
                  <div className="file-upload-section">
                    <div className="file-upload-actions">
                      <button
                        type="button"
                        className="explorer-upload-btn"
                        onClick={() => document.getElementById('file-explorer-input')?.click()}
                        disabled={uploadingFiles}
                      >
                        {uploadingFiles ? 'Загрузка...' : 'Прикрепить файлы'}
                      </button>
                      <div className="file-formats-info">
                        Допустимые форматы: JPG, PNG, GIF, BMP, WEBP, TXT, PDF, DOC, DOCX, XLS, XLSX
                      </div>
                    </div>
                    
                    <input
                      type="file"
                      id="file-explorer-input"
                      multiple
                      accept=".jpg,.jpeg,.png,.gif,.bmp,.webp,.txt,.pdf,.doc,.docx,.xls,.xlsx"
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>
                
                {renderTeacherFilesSection(teacherAttachedFiles, removeTeacherFile)}
              </div>
              
              {renderCommentHistory(
                teacherComments, 
                'Комментарии преподавателя', 
                'Нет комментариев преподавателя'
              )}
            </div>
          )}

          {activeCommentTab === 'student' && (
            <div className="tab-content-fullwidth">
              {renderCommentHistory(
                studentComments, 
                'Комментарии студента', 
                'Нет комментариев студента'
              )}
            </div>
          )}
          
          <div className="modal-actions">
            <button 
              className="cancel-btn" 
              onClick={() => {
                setCommentModalData(null);
                setTeacherCommentText('');
                setTeacherAttachedFiles([]);
                setStudentChangeHistory([]);
              }}
              disabled={uploadingFiles}
              type="button"
            >
              Отмена
            </button>
            
            {activeCommentTab === 'teacher' && (
              <button 
                className="gradient-btn" 
                onClick={handleSaveTeacherComment}
                disabled={uploadingFiles || (!teacherCommentText && teacherAttachedFiles.length === 0)}
                type="button"
              >
                {uploadingFiles ? 'Сохранение...' : 'Сохранить комментарий'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Обработка вставки файлов через Ctrl+V в текстовое поле
  const handlePaste = (e: React.ClipboardEvent): void => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const newFiles: File[] = [];
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file && file.type.startsWith('image/')) {
          newFiles.push(file);
        }
      }
    }

    if (newFiles.length > 0) {
      e.preventDefault();
      setAttachedFiles(prev => [...prev, ...newFiles]);
      console.log(`Добавлено изображений: ${newFiles.length}`);
    }
  };

  // Функция для загрузки файлов на сервер
  const uploadFiles = async (files: File[]): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    setUploadingFiles(true);
    
    try {
      // Используем новый метод для загрузки через проводник
      const result = await teacherApiService.uploadFilesFromExplorer(files);
      
      if (result.success && result.fileUrls) {
        uploadedUrls.push(...result.fileUrls);
        
        files.forEach((file, index) => {
          if (file.type.startsWith('image/')) {
            console.log(`Изображение загружено: ${result.fileUrls?.[index]}`);
          } else {
            console.log(`Файл загружен: ${result.fileUrls?.[index]}`);
          }
        });
      } else {
        console.log('Файлы загружены, но URL не возвращены');
        // Создаем заглушки для URL
        files.forEach(file => {
          uploadedUrls.push(`uploaded://${file.name}`);
        });
      }
    } catch (error) {
      console.error('Ошибка при загрузке файлов:', error);
      // Создаем заглушки в случае ошибки
      files.forEach(file => {
        uploadedUrls.push(`error://${file.name}`);
      });
    } finally {
      setUploadingFiles(false);
    }
    
    return uploadedUrls;
  };

  // для обработки выбора файлов через input:
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Проверяем допустимые форматы
      const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
      const allowedDocumentTypes = [
        'text/plain', 
        'application/pdf', 
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      
      const isImage = file.type.startsWith('image/');
      const isAllowedImage = isImage && allowedImageTypes.includes(file.type);
      const isAllowedDocument = allowedDocumentTypes.includes(file.type);
      
      if (isAllowedImage || isAllowedDocument) {
        newFiles.push(file);
      } else {
        console.warn(`Недопустимый формат файла: ${file.name} (${file.type})`);
        alert(`Файл "${file.name}" имеет недопустимый формат. Допустимы: изображения, текстовые документы, docx, файлы Excel.`);
      }
    }

    if (newFiles.length > 0) {
      if (commentModalData && activeCommentTab === 'teacher') {
        setTeacherAttachedFiles(prev => [...prev, ...newFiles]);
      } else {
        setAttachedFiles(prev => [...prev, ...newFiles]);
      }
    }

    // Сбрасываем input
    event.target.value = '';
  };

  // Сохранение комментария с прикрепленными файлами
  const handleSaveComment = async (): Promise<void> => {
    if (!commentModalData) return;

    try {
      let uploadedFileUrls: string[] = [];

      if (attachedFiles.length > 0) {
        uploadedFileUrls = await uploadFiles(attachedFiles);
      }

      updateGradeRecord(
        commentModalData.studentId, 
        commentModalData.date, 
        { 
          comment: commentText,
          attachments: uploadedFileUrls
        }
      );

      teacherApiService.invalidateLessonInfoCache();

      setCommentModalData(null);
      setCommentText('');
      setAttachedFiles([]);
      
    } catch (error) {
      console.error('Ошибка при сохранении комментария:', error);
    }
  };

  // Обработка изменения глобального типа экзамена
  const handleGlobalExamTypeChange = (examType: string): void => {
    setGlobalExamType(examType);
    
    filteredStudents.forEach(student => {
      updateExamRecord(student.id, { examType: examType as any });
    });
  };

  // Обработчик клика по кнопке "Выставить посещаемость"
  const handleSetAttendance = (): void => {
    if (onSetAttendance) {
      onSetAttendance();
    } else {
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
  const getAvailableExamGrades = (examType: string): string[] => {
    return examGrades[examType as keyof typeof examGrades] || [];
  };

  // Обработчик изменения оценки экзамена
  const handleExamGradeChange = (studentId: number, newGrade: string): void => {
    updateExamRecord(studentId, { grade: newGrade });
  };

  // Обработчик клика по ячейке экзамена
  const handleExamCellClick = (studentId: number, currentGrade: string): void => {
    if (globalExamType) {
      setEditingCell({ studentId, date: '', field: 'exam' });
      setEditValue(currentGrade);
    } else {
      alert('Сначала выберите тип экзамена в заголовке столбца');
    }
  };

  // Рендер заголовка даты с кнопками управления
  const renderDateHeader = (date: string, index: number): React.ReactElement => {
    const lessonNumber = getLessonNumber(date);
    const lesson = lessonDates.find(l => {
      const dateObj = new Date(l.date);
      const day = dateObj.getDate().toString().padStart(2, '0');
      const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
      const formattedDate = `${day}.${month}`;
      return date.startsWith(formattedDate) && l.number === lessonNumber;
    });
    
    const displayDate = date.split(' (')[0];
    const typeData = lessonTypesData[date];
    const lessonType = typeData?.type;
    
    return (
      <th key={index} className="column-date" rowSpan={2}>
        <div className="date-header-actions">
          <button 
            className="date-infos-btn"
            onClick={() => handleDateButtonClick(date)}
            title="Информация о занятии"
          >
            ⋯
          </button>
          
          <button 
            className="date-delete-btn"
            onClick={() => handleOpenDeleteDateModal(date, lessonNumber)}
            title="Удалить столбец с датой"
          >
            ×
          </button>
        </div>
          
        <div className="date-content">
          <div className="date-title-new">
            {displayDate}
          </div>
          
          {lessonType && (
            <div className="lesson-type-indicator">
              {lessonType}
            </div>
          )}
        </div>
      </th>
    );
  };

  // Рендер пустого столбца с "+" для добавления даты
  const renderAddDateColumn = (): React.ReactElement => {
    return (
      <th className="column-add-date" rowSpan={2}>
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

  // Рендер таблицы
  const renderTable = (): React.ReactElement => {
    return (
      <div className="performance-table-wrapper">
        <table className="performance-table">
          <thead>
            <tr>
              <th className="column-number sticky-col table-header-rowspan" rowSpan={2}>№</th>
              <th className="column-name sticky-col table-header-rowspan" rowSpan={2}>ФИО</th>
              {hasMultipleTeachers && (
                <th className="column-subgroup sticky-col table-header-rowspan" rowSpan={2}>Подгруппа</th>
              )}
              
              {filteredDates.map((date, index) => renderDateHeader(date, index))}

              {renderAddDateColumn()}
              
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
                  <td className="column-number sticky-col">
                    <div className="cell-number">{studentIndex + 1}.</div>
                  </td>
                  <td className="column-name sticky-col">
                    <div className="cell-name">
                      {student.lastName} {student.firstName} {student.middleName}
                    </div>
                  </td>

                  {hasMultipleTeachers && (
                    <td className="column-subgroup sticky-col">
                      <div className="cell-subgroup">
                        <select 
                          value={studentSubgroups[student.id] || ''}
                          onChange={(e) => updateStudentSubgroup(student.id, e.target.value as 'I' | 'II')}
                          className="subgroup-select"
                        >
                          <option value="">-</option>
                          <option value="I">I</option>
                          <option value="II">II</option>
                        </select>
                      </div>
                    </td>
                  )}
                  
                  {filteredDates.map((date, dateIndex) => {
                    const record = getGradeRecord(student.id, date);
                    const isEditing = editingCell?.studentId === student.id && 
                                    editingCell?.date === date &&
                                    editingCell?.field === 'grade';
                    
                    return (
                      <td key={dateIndex} className="column-date">
                        <div className="grade-cell-container">
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
                          
                          <button 
                            className={`comment-btn ${
                              getTeacherCommentsForCell(student.id, date).length > 0 ? 'has-teacher-comment' : ''
                            } ${
                              getStudentCommentsForCell(student.id, date).length > 0 ? 'has-student-comment' : ''
                            } ${
                              (getTeacherCommentsForCell(student.id, date).some(c => c.files && c.files.length > 0) ||
                              getStudentCommentsForCell(student.id, date).some(c => c.files && c.files.length > 0)) 
                              ? 'has-files' : ''
                            }`}
                            onClick={() => handleOpenCommentModal(student.id, date)}
                            title={`Комментарии: ${
                              getTeacherCommentsForCell(student.id, date).length > 0 ? 
                              `Преподаватель (${getTeacherCommentsForCell(student.id, date).length})` : ''
                            }${
                              getTeacherCommentsForCell(student.id, date).length > 0 && 
                              getStudentCommentsForCell(student.id, date).length > 0 ? ', ' : ''
                            }${
                              getStudentCommentsForCell(student.id, date).length > 0 ? 
                              `Студент (${getStudentCommentsForCell(student.id, date).length})` : ''
                            }${
                              (getTeacherCommentsForCell(student.id, date).some(c => c.files && c.files.length > 0) ||
                              getStudentCommentsForCell(student.id, date).some(c => c.files && c.files.length > 0)) 
                              ? ' 📎' : ''
                            }`}
                          >
                            💬
                            {(getTeacherCommentsForCell(student.id, date).some(c => c.files && c.files.length > 0) ||
                            getStudentCommentsForCell(student.id, date).some(c => c.files && c.files.length > 0))
                            }
                          </button>
                        </div>
                      </td>
                    );
                  })}

                  <td className="column-add-date">
                    <div className="add-date-cell-plus"></div>
                  </td>
                  
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
        
        <datalist id="grades-list">
          {validGrades.map(grade => (
            <option key={grade} value={grade} />
          ))}
        </datalist>
      </div>
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
              Внимание: Это действие нельзя отменить. Все оценки для этой даты будут удалены.
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

  // Рендер модального окна темы занятия
  const renderTopicModal = (): React.ReactElement | null => {
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
            <button className="gradient-btn" onClick={() => setShowTopicModal(null)}>
              Сохранить
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Рендер модального окна информации о занятии
  const renderDateModal = (): React.ReactElement | null => {
    if (!showDateModal) return null;

    const availableLessonTypes = lessonTypes.map(lt => 
      typeof lt === 'string' ? lt : (lt as any).name
    ).filter(Boolean);

    const handleSaveDateInfoInternal = async (): Promise<void> => {
      if (!showDateModal) return;

      try {
        await handleSaveDateInfo();
      } catch (error) {
        console.error('Ошибка при сохранении:', error);
      }
    };

    const handleCloseModal = (): void => {
      setShowDateModal(null);
      setDateModalData({ typeMark: '', comment: '' });
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
            <div className="lesson-details-info">
              <div className="info-section-header">
                Детали расписания
              </div>
              <div className="info-section-content">
                <div className="info-grid-4">
                  <div className="info-grid-item">
                    <span className="info-grid-label">Номер недели</span>
                    <span className="info-grid-value">{showDateModal.numberWeek || '—'}</span>
                  </div>
                  <div className="info-grid-item">
                    <span className="info-grid-label">День недели</span>
                    <span className="info-grid-value">{showDateModal.dayWeek || '—'}</span>
                  </div>
                  <div className="info-grid-item">
                    <span className="info-grid-label">Тип недели</span>
                    <span className="info-grid-value">{showDateModal.typeWeek || '—'}</span>
                  </div>
                  <div className="info-grid-item">
                    <span className="info-grid-label">Номер пары</span>
                    <span className="info-grid-value">{showDateModal.numPair || '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="attendance-stats-section">
              <div className="attendance-stats-header">
                Управление занятием
              </div>
              <div className="attendance-stats-content">
                <div className="form-group-full-width">
                  <label className="form-label">Тип занятия *</label>
                  <select 
                    value={dateModalData.typeMark}
                    onChange={(e) => setDateModalData(prev => ({...prev, typeMark: e.target.value}))}
                    className="form-input"
                    disabled={updatingLessonType}
                  >
                    <option value="">Выберите тип занятия</option>
                    {lessonTypes.map(type => (
                      <option key={type.id} value={type.name}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                  {lessonTypes.length === 0 && (
                    <div className="form-help-text">
                      Загрузка типов занятий...
                    </div>
                  )}
                </div>

                <div className="form-group-full-width">
                  <label className="form-label">Тема занятия *</label>
                  <textarea
                    value={dateModalData.comment}
                    onChange={(e) => setDateModalData(prev => ({...prev, comment: e.target.value}))}
                    className="form-textarea"
                    placeholder="Введите тему занятия..."
                    rows={3}
                    disabled={updatingLessonType}
                  />
                </div>

                <div className="lesson-info-actions">
                  <button
                      className="gradient-btn"
                      onClick={handleSaveDateInfo}
                      disabled={!dateModalData.typeMark || updatingLessonType}
                  >
                    {updatingLessonType ? 'Сохранение...' : 'Сохранить изменения'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Рендер модального окна подгрупп
  const renderSubgroupModal = (): React.ReactElement | null => {
    if (!showSubgroupModal) return null;

    const studentsInSubgroupI = students.filter(student => studentSubgroups[student.id] === 'I');
    const studentsInSubgroupII = students.filter(student => studentSubgroups[student.id] === 'II');

    return (
      <div className="modal-overlay">
        <div className="modal-content subgroup-modal expanded">
          <h3>Управление подгруппами</h3>
          
          <div className="subgroup-modal-content">
            <div className="subgroup-stats-centered">
              <div className="subgroup-stat-centered">
                <div className="stat-value-centered">{studentsInSubgroupI.length}</div>
                <div className="stat-label-centered">I подгруппа</div>
              </div>
              <div className="subgroup-stat-centered">
                <div className="stat-value-centered">{studentsInSubgroupII.length}</div>
                <div className="stat-label-centered">II подгруппа</div>
              </div>
              <div className="subgroup-stat-centered">
                <div className="stat-value-centered">{students.length}</div>
                <div className="stat-label-centered">Всего студентов</div>
              </div>
            </div>

            <div className="subgroup-actions">
              <button 
                className="gradient-btn auto-distribute-btn"
                onClick={autoDistributeSubgroups}
                disabled={savingSubgroups}
              >
                Автораспределение
              </button>
            </div>

            <div className="students-list">
              <div className="students-grid">
                {students.map((student) => (
                  <div key={student.id} className="student-subgroup-item">
                    <span className="student-name">
                      {student.lastName} {student.firstName} {student.middleName}
                    </span>
                    <select 
                      value={studentSubgroups[student.id] || 'I'}
                      onChange={(e) => updateStudentSubgroup(student.id, e.target.value as 'I' | 'II')}
                      className="subgroup-select-modal"
                    >
                      <option value="I">I подгруппа</option>
                      <option value="II">II подгруппа</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button 
              className="cancel-btn" 
              onClick={() => setShowSubgroupModal(false)}
              disabled={savingSubgroups}
            >
              Отмена
            </button>
            <button 
              className="gradient-btn" 
              onClick={saveSubgroupsDistribution}
              disabled={savingSubgroups}
            >
              {savingSubgroups ? 'Сохранение...' : 'Сохранить распределение'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Рендер фильтров с кнопкой добавления даты
  const renderFilters = (): React.ReactElement => {
    return (
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
          {/* Фильтр по типу занятия с кнопкой обновления */}
          <div className="filter-group-with-button">
            <div className="filter-select-wrapper">
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
              <button 
                className={`refresh-types-btn ${loadingLessonTypes ? 'refreshing' : ''}`}
                onClick={refreshLessonTypes}
                disabled={loadingLessonTypes}
                title="Обновить типы занятий"
              >
                <img 
                  src="/st-icons/upload_icon.svg" 
                  className={`refresh-icon ${loadingLessonTypes ? 'spin' : ''}`}
                  alt="Обновить типы занятий"
                />
              </button>
            </div>
          </div>

          {hasMultipleTeachers && (
            <>
              {selectedSubgroup !== 'all' && (
                <div className="filter-group teacher-display">
                  <div className="teacher-value-readonly">
                    {subgroupTeachers[selectedSubgroup as 'I' | 'II']}
                  </div>
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
            </>
          )}
        </div>
      </div>
    );
  };

  // Обработка состояния загрузки
  if (loading && !idTeacher) {
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
        
        <div className="error-state">
          <div className="error-message">
            <strong>Ошибка загрузки</strong>
            <br />
            {error}
          </div>
          <button 
            className="retry-button"
            onClick={loadAllData}
            disabled={!idTeacher}
          >
            <svg className="retry-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Повторить попытку
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`teacher-performance-section ${hasMultipleTeachers ? 'has-subgroups' : 'no-subgroups'}`}>
      <div className="performance-cabinet-header">
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

      {showCacheWarning && <CacheWarning />}

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
            {hasMultipleTeachers && (
              <button 
                className="gradient-btn subgroup-management-btn"
                onClick={() => setShowSubgroupModal(true)}
                title="Управление подгруппами"
              >
                Управление подгруппами
              </button>
            )}
            <button className="gradient-btn set-attendance-btn" onClick={handleSetAttendance}>
              Выставить посещаемость
            </button>
          </div>
        </div>
      </div>

      {renderFilters()}

      <div className="performance-table-container">
        {renderTable()}
        
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

      {renderCommentModal()}
      {renderTopicModal()}
      {renderDateModal()}
      {renderSubgroupModal()}
      {renderAddDateModal()}
      {renderDeleteDateModal()}
    </div>
  );
};

export default TeacherPerformanceSection;