import React, { useState, useEffect, useRef } from 'react';
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
  files: string[] | null;
  teacherOrStudent: boolean; // true - преподаватель, false - студент
  newValue: string | null;
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
  const [error, setError] = useState<string | null>(null);
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

  const [editingTeacher, setEditingTeacher] = useState<string | null>(null);
  const [teacherEditValue, setTeacherEditValue] = useState('');
  const [dateRange, setDateRange] = useState<{start: string; end: string}>({
    start: '',
    end: ''
  });
  const [lessonTypesData, setLessonTypesData] = useState<Record<string, LessonTypeInfo>>({});
  const [globalExamType, setGlobalExamType] = useState<string>('');

  const [loadingLessonTypes, setLoadingLessonTypes] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isUsingCache, setIsUsingCache] = useState(false);

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
  const teacherInputRef = useRef<HTMLInputElement>(null);
  const examInputRef = useRef<HTMLSelectElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const [imageModal, setImageModal] = useState<{
    isOpen: boolean;
    imageUrl: string;
    fileName: string;
  }>({
    isOpen: false,
    imageUrl: '',
    fileName: ''
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
      'Контрольная работа': 'КР',
      'Домашнее задание': 'ДЗ',
      'Тест': 'Т'
    };
    
    return typeMap[fullName] || '';
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

  // Компонент информационной иконки
  const InfoIcon = (): React.ReactElement => (
    <div className="info-icon-btn" tabIndex={0}>
      <button className="header-btn" type="button">
        <span className="info-icon-text">i</span>
        <span>Информация</span>
      </button>
      <div className="info-tooltip">
        <div className="info-tooltip-content">
          <p><strong>Управление успеваемостью</strong></p>
          <p>В этом разделе вы можете выставлять оценки студентам, управлять подгруппами и отслеживать успеваемость.</p>
          <p><strong>Основные возможности:</strong></p>
          <ul>
            <li>Выставление оценок по датам занятий</li>
            <li>Фильтрация по подгруппам и типам занятий</li>
            <li>Добавление комментариев и прикрепление файлов</li>
            <li>Управление распределением по подгруппам</li>
            <li>Выставление экзаменационных оценок</li>
            <li>Добавление и удаление столбцов с датами</li>
          </ul>
          <p>Для редактирования оценки нажмите на ячейку с оценкой.</p>
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

  // Обновленная функция загрузки всех данных
  const loadAllData = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

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

      // 6. Загружаем типы занятий
      console.log('Loading lesson types...');
      await refreshLessonTypes();

      console.log('All data loaded successfully');

    } catch (err: any) {
      console.error('Ошибка при загрузке данных:', err);
      setError(`Не удалось загрузить данные: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

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
              subgroup: subgroup, // Назначаем подгруппу на основе порядка преподавателя
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

  // Функция для загрузки типов занятий
  const loadLessonTypes = async (): Promise<void> => {
    if (!idSt) return;

    try {
      console.log('Loading lesson types...');
      const types = await teacherApiService.getLessonTypes(idSt);
      setLessonTypes(types);
      console.log('Lesson types loaded:', types);
    } catch (error) {
      console.error('Error loading lesson types:', error);
    }
  };

  // Функция для загрузки типов занятий из API
  const loadLessonTypesFromAPI = async (): Promise<Record<string, LessonTypeInfo>> => {
    if (!students.length || !lessonDates.length || !idSt) {
      console.log('Недостаточно данных для загрузки типов занятий');
      return {};
    }

    const newLessonTypes: Record<string, LessonTypeInfo> = {};
    const firstStudent = students[0];

    try {
      for (const lesson of lessonDates) {
        try {
          console.log(`Загрузка типа занятия для урока ${lesson.number}...`);
          const lessonInfo = await teacherApiService.getLessonInfo(firstStudent.id, idSt, lesson.number);
          
          if (lessonInfo) {
            const dateObj = new Date(lesson.date);
            const day = dateObj.getDate().toString().padStart(2, '0');
            const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
            const numPair = lesson.lessonInfo?.numPair || lesson.number;
            const displayDate = `${day}.${month} (${numPair})`;
            
            const lessonType = lessonInfo.typeMark as LessonType;
            
            newLessonTypes[displayDate] = {
              type: lessonType || '',
              topic: lessonInfo.comment || '',
              comment: lessonInfo.comment || ''
            };
            
            console.log(`Загружен тип для ${displayDate}: ${lessonType}`);
          }
          
          await new Promise(resolve => setTimeout(resolve, 50));
        } catch (error) {
          console.error(`Ошибка загрузки типа для занятия ${lesson.number}:`, error);
        }
      }
    } catch (error) {
      console.error('Ошибка при загрузке типов занятий:', error);
    }

    return newLessonTypes;
  };

  // Функция для принудительного обновления типов занятий
  const refreshLessonTypes = async (): Promise<void> => {
    try {
      setLoadingLessonTypes(true);
      console.log('Обновление типов занятий...');
      
      const apiLessonTypes = await loadLessonTypesFromAPI();
      
      // ОБНОВЛЯЕМ ВСЕ ДАННЫЕ ИЗ API
      setLessonTypesData(apiLessonTypes);
      
      // ОБНОВЛЯЕМ ЗАПИСИ ОЦЕНОК С НОВЫМИ ТИПАМИ
      setGradeRecords(prev => 
        prev.map(record => {
          const newTypeData = apiLessonTypes[record.date];
          return newTypeData ? { ...record, lessonType: newTypeData.type } : record;
        })
      );
      
      console.log('Типы занятий успешно обновлены:', apiLessonTypes);
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

  // Функция для сохранения информации о занятии
  const saveLessonInfo = async (lessonData: {
    studentId: number;
    lessonNumber: number;
    typeMark: string;
    comment: string;
  }): Promise<boolean> => {
    try {
      if (!idSt) {
        console.log('Semester not available, skipping save');
        return false;
      }
      
      const result = await teacherApiService.saveLessonInfo({
        ...lessonData,
        idSt: idSt
      });
      
      if (result.success) {
        const lessonType = getLessonTypeFromFullName(lessonData.typeMark);
        
        // НАХОДИМ ДАТУ ДЛЯ ЭТОГО НОМЕРА ЗАНЯТИЯ
        const lesson = lessonDates.find(l => l.number === lessonData.lessonNumber);
        if (lesson) {
          const dateObj = new Date(lesson.date);
          const day = dateObj.getDate().toString().padStart(2, '0');
          const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
          const numPair = lesson.lessonInfo?.numPair || lesson.number;
          const displayDate = `${day}.${month} (${numPair})`;
          
          // ОБНОВЛЯЕМ ДАННЫЕ ТИПА ЗАНЯТИЯ
          setLessonTypesData(prev => ({
            ...prev,
            [displayDate]: {
              type: lessonType || '',
              topic: lessonData.comment || '',
              comment: lessonData.comment || ''
            }
          }));
          
          // ОБНОВЛЯЕМ ЗАПИСИ ОЦЕНОК
          setGradeRecords(prev => 
            prev.map(record => 
              record.date === displayDate 
                ? { ...record, lessonType: lessonType || '' }
                : record
            )
          );
        }
      }
      
      return result.success;
    } catch (err) {
      console.error('Ошибка при сохранении информации о занятии:', err);
      return false;
    }
  };

  // функция для распределения подгрупп
  const fetchSubjectTeachersData = async (teacherId: number): Promise<void> => {
    try {
      const data = await teacherApiService.getTeacherSubjects(teacherId);
      setSubjectTeachersData(data);
      
      // Загружаем преподавателей подгрупп
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
      
      // Заполняем преподавателей для подгрупп на основе порядка в массиве
      subjectData.teachers.forEach((teacherId, index) => {
        const teacher = allStaff.find(staff => staff.id === teacherId);
        if (teacher) {
          const teacherFullName = `${teacher.lastName} ${teacher.name.charAt(0)}.${teacher.patronymic.charAt(0)}.`;
          
          if (index === 0) {
            teachers['I'] = teacherFullName;
          } else if (index === 1) {
            teachers['II'] = teacherFullName;
          }
          // Если преподавателей больше 2, игнорируем остальных
        }
      });
      
      setSubgroupTeachers(teachers);
      
      // Определяем, показывать ли подгруппы (показываем если есть хотя бы 2 преподавателя)
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

    // Инициализация подгрупп студентов
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
    try {
      // Инвалидируем все кэши перед обновлением
      teacherApiService.invalidateStudentCache();
      teacherApiService.invalidateLessonDatesCache();
      teacherApiService.invalidateLessonInfoCache();
      teacherApiService.invalidateSubgroupsCache();
      
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

    // Загружаем типы занятий если еще не загружены
    if (lessonTypes.length === 0 && idSt) {
      await loadLessonTypes();
    }

    const firstStudent = filteredStudents[0];
    if (!firstStudent || !idSt || !idTeacher) return;

    try {
      console.log(`Открытие модального окна для даты: ${date}, номер занятия: ${lessonNumber}`);

      // 1. Получаем информацию о занятии
      const lessonInfo = await fetchLessonInfo(firstStudent.id, lessonNumber);
      
      // 2. Получаем дополнительные данные о занятии
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

      // Получаем первого студента для обновления
      const firstStudent = filteredStudents[0];
      if (!firstStudent) {
        throw new Error('Не найден студент для обновления');
      }

      // Получаем ID типа занятия по названию
      const lessonTypeId = teacherApiService.getLessonTypeIdByName(lessonTypes, dateModalData.typeMark);
      
      if (!lessonTypeId) {
        throw new Error(`Тип занятия "${dateModalData.typeMark}" не найден`);
      }

      // Формируем запрос на обновление типа занятия
      const updateRequest: UpdateLessonTypeRequest = {
        idTeacher: idTeacher,
        idGroup: groupId,
        idStudent: firstStudent.id,
        idSt: idSt,
        number: showDateModal.lessonNumber,
        idTypeMark: lessonTypeId
      };

      console.log('Updating lesson type with request:', updateRequest);

      // Отправляем запрос на обновление типа занятия
      const result = await teacherApiService.updateLessonType(updateRequest);
      
      if (result.success) {
        // Если есть комментарий, сохраняем его отдельно
        if (dateModalData.comment && dateModalData.comment.trim() !== '') {
          try {
            // Получаем информацию о занятии для получения idSupplement
            const lessonInfo = await teacherApiService.getLessonInfo(firstStudent.id, idSt, showDateModal.lessonNumber);
            
            if (lessonInfo && lessonInfo.idSupplement) {
              await teacherApiService.updateLessonComment(lessonInfo.idSupplement, dateModalData.comment);
            }
          } catch (commentError) {
            console.warn('Не удалось сохранить комментарий:', commentError);
          }
        }

        // Обновляем локальное состояние
        const lessonType = getLessonTypeFromFullName(dateModalData.typeMark);
        const dateObj = new Date(showDateModal.date);
        const day = dateObj.getDate().toString().padStart(2, '0');
        const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
        const displayDate = `${day}.${month} (${showDateModal.lessonNumber})`;
        
        setLessonTypesData(prev => ({
          ...prev,
          [displayDate]: {
            type: lessonType || '',
            topic: dateModalData.comment || '',
            comment: dateModalData.comment || ''
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

        alert('Данные занятия успешно обновлены');
        setShowDateModal(null);
        setDateModalData({ typeMark: '', comment: '' });
      }
    } catch (error: any) {
      console.error('Error updating lesson data:', error);
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

  // Фильтрация дат по выбранному диапазону
  const filteredDates = allDates.filter(date => {
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
    
    return true;
  });

  // Функция для автоматического распределения студентов по подгруппам
  const autoDistributeSubgroups = (): void => {
    const newDistribution: Record<number, 'I' | 'II'> = {};
    
    // Сортируем студентов по фамилии для равномерного распределения
    const sortedStudents = [...students].sort((a, b) => 
      a.lastName.localeCompare(b.lastName)
    );
    
    sortedStudents.forEach((student, index) => {
      // Распределяем поочередно - четные в I, нечетные в II
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

      // Сохраняем подгруппы
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
        
        // === НЕМЕДЛЕННОЕ ОБНОВЛЕНИЕ ИНТЕРФЕЙСА ===
        console.log('Немедленное обновление интерфейса...');
        
        // 1. Очищаем кэш
        teacherApiService.invalidateStudentCache();
        teacherApiService.invalidateSubgroupsCache();
        teacherApiService.invalidateSubjectTeachersCache();
        
        // 2. НЕМЕДЛЕННО перезагружаем студентов с сервера
        console.log('Немедленная перезагрузка студентов...');
        await loadStudentsFromAllSubgroups(idTeacher, idSt);
        
        // 3. Обновляем состояние интерфейса
        console.log('Обновление состояния интерфейса...');
        
        // Принудительно обновляем отображение подгрупп
        setSelectedSubgroup('all'); // Сбрасываем фильтр чтобы показать всех студентов
        
        // Обновляем данные о преподавателях подгрупп
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
    const lessonNumber = getLessonNumber(date);
    const student = students.find(s => s.id === studentId);
    
    // Сначала ищем в локальных записях
    const existingRecord = gradeRecords.find(record => 
      record.studentId === studentId && record.date === date // используем полную дату с номером
    );
    
    if (existingRecord) {
      return existingRecord;
    }
    
    // Если записи нет в локальных данных, проверяем API данные
    if (student && student.marks) {
      // Ищем оценку по номеру занятия ИЗ API
      const apiMark = student.marks.find(mark => mark.number === lessonNumber);
      if (apiMark && apiMark.value !== null) {
        console.log(`Found API grade for student ${studentId}, date ${date}, lesson ${lessonNumber}: ${apiMark.value}`);
        
        // Создаем запись на основе данных из API
        return {
          id: Date.now() + Math.random(),
          studentId,
          date, // сохраняем полную дату с номером
          lessonType: '',
          topic: '',
          grade: apiMark.value.toString()
        };
      }
    }
    
    // Если записи нет нигде, создаем новую с пустыми значениями
    return {
      id: Date.now() + Math.random(),
      studentId,
      date, // сохраняем полную дату с номером
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
    
    // Если записи нет, создаем новую
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
        // Создаем новую запись с ПУСТЫМИ значениями по умолчанию
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

  // Обновление преподавателя подгруппы
  const updateSubgroupTeacher = (subgroup: string, teacher: string): void => {
    setSubgroupTeachers(prev => ({
      ...prev,
      [subgroup]: teacher
    }));
  };

  // Начало редактирования ячейки
  const handleCellClick = (
    studentId: number, 
    date: string, // Должен быть в формате "06.11 (1)"
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
            
            // ЗАМЕНА: используем updateMark вместо updateMarkGrade
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

  // Функция для загрузки истории изменений студента
  const loadStudentChangeHistory = async (studentId: number, lessonNumber: number): Promise<void> => {
    if (!idSt) return;
    
    setLoadingStudentHistory(true);
    try {
      console.log(`Loading change history for student ${studentId}, lesson ${lessonNumber}`);
      
      const history = await teacherApiService.getStudentChangeHistory(studentId, idSt, lessonNumber);
      setStudentChangeHistory(history);
      updateStudentCommentsMap(studentId, lessonNumber, history);
      console.log('Student change history loaded:', history);
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

  const handleOpenImageModal = (imageUrl: string, fileName: string): void => {
    setImageModal({
      isOpen: true,
      imageUrl,
      fileName
    });
  };

  // Рендер модального окна изображения
  const renderImageModal = (): React.ReactElement | null => {
    if (!imageModal.isOpen) return null;

    return (
      <div className="modal-overlay image-modal-overlay" onClick={() => setImageModal({ isOpen: false, imageUrl: '', fileName: '' })}>
        <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="image-modal-header">
            <h3>{imageModal.fileName}</h3>
            <button 
              className="image-modal-close"
              onClick={() => setImageModal({ isOpen: false, imageUrl: '', fileName: '' })}
            >
              ×
            </button>
          </div>
          <div className="image-modal-body">
            <img 
              src={imageModal.imageUrl} 
              alt={imageModal.fileName}
              className="modal-image"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                // Показываем сообщение об ошибке
                const errorDiv = document.createElement('div');
                errorDiv.className = 'image-error-message';
                errorDiv.textContent = 'Не удалось загрузить изображение';
                target.parentNode?.appendChild(errorDiv);
              }}
            />
          </div>
          <div className="image-modal-actions">
            <a 
              href={imageModal.imageUrl} 
              download={imageModal.fileName}
              className="download-image-btn"
            >
              Скачать изображение
            </a>
          </div>
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
    
    // Загружаем историю изменений студента
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
      
      if (!groupId) {
        throw new Error('Не удалось определить ID группы');
      }

      let idSupplement: number | undefined;

      // Сохраняем комментарий преподавателя
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
          
          // Сохраняем файлы преподавателя если есть
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

      // Обновляем локальное состояние
      updateGradeRecord(
        commentModalData.studentId, 
        commentModalData.date, 
        { 
          comment: teacherCommentText.trim() || undefined
        }
      );

      // Перезагружаем историю изменений
      await loadStudentChangeHistory(commentModalData.studentId, lessonNumber);

      // Очищаем форму
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
          Для прикрепления файлов перетащите их в область комментария или используйте Ctrl+V для изображений
        </div>
        <div className="files-list">
          {files.map((file, index) => {
            const isImage = file.type.startsWith('image/');
            const previewUrl = isImage ? createImagePreview(file) : '';
            
            return (
              <div key={index} className="file-item">
                {isImage ? (
                  <div className="image-preview-container">
                    <img 
                      src={previewUrl} 
                      alt="Превью" 
                      className="file-preview"
                      onClick={() => handleImagePreviewClick(file)}
                    />
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
                <button 
                  className="remove-file-btn"
                  onClick={() => removeFile(index)}
                  title="Удалить файл"
                >
                  ×
                </button>
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

    // Функция для создания предпросмотра файлов
    const renderFilePreview = (fileUrl: any, fileName: string) => {
      const urlString = typeof fileUrl === 'string' ? fileUrl : '';
      const isImage = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(fileName);
      
      if (isImage && urlString) {
        return (
          <div className="image-preview-modal">
            <img 
              src={fileUrl} 
              alt="Превью" 
              className="comment-image-preview"
              onClick={() => handleOpenImageModal(fileUrl, fileName)}
              style={{ cursor: 'pointer' }}
            />
            <div className="image-preview-actions">
              <button 
                className="view-full-btn"
                onClick={() => handleOpenImageModal(fileUrl, fileName)}
              >
                Открыть в полном размере
              </button>
            </div>
          </div>
        );
      }
      
      return (
        <div className="file-preview">
          <div className="file-icon">📄</div>
          <a 
            href={fileUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="file-link"
          >
            {fileName || `Файл`}
          </a>
        </div>
      );
    };

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
                </span>
              </div>
              
              {comment.comment && (
                <div className="comment-text">
                  {comment.comment}
                </div>
              )}
              
              {comment.files && comment.files.length > 0 && (
                <div className="comment-files">
                  <div className="files-header">
                    <span>Прикрепленные файлы ({comment.files.length})</span>
                  </div>
                  <div className="files-grid">
                    {comment.files.map((fileUrl, fileIndex) => {
                      // Безопасное извлечение имени файла
                      let fileName = `Файл ${fileIndex + 1}`;
                      if (typeof fileUrl === 'string') {
                        fileName = fileUrl.split('/').pop() || fileName;
                      }

                      return (
                        <div key={fileIndex} className="file-item-preview">
                          {renderFilePreview(fileUrl, fileName)}
                        </div>
                      );
                    })}
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

    const record = getGradeRecord(commentModalData.studentId, commentModalData.date);
    const student = students.find(s => s.id === commentModalData.studentId);
    const studentComments = getStudentComments();
    const teacherComments = getTeacherComments();

    return (
      <div className="modal-overlay">
        <div className="modal-content comment-modal expanded">
          <h3 style={{ marginBottom: '16px', color: '#002FA7' }}>
            Комментарии к оценке {student ? `${student.lastName} ${student.firstName[0]}.${student.middleName[0]}.` : ''}
          </h3>
          
          {/* Вкладки */}
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

          {/* Содержимое вкладки преподавателя */}
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
                </div>
                
                {renderTeacherFilesSection(teacherAttachedFiles, removeTeacherFile)}
              </div>
              
              {/* История комментариев преподавателя */}
              {renderCommentHistory(
                teacherComments, 
                'Комментарии преподавателя', 
                'Нет комментариев преподавателя'
              )}
            </div>
          )}

          {/* Содержимое вкладки студента */}
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
            
            {/* Кнопка сохранения только для вкладки преподавателя */}
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
          
          // Для изображений создаем предпросмотр
          if (file.type.startsWith('image/')) {
            console.log(`Изображение загружено: ${result.fileUrl}`);
          }
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

  // Сохранение комментария с прикрепленными файлами
  const handleSaveComment = async (): Promise<void> => {
    if (!commentModalData) return;

    try {
      let uploadedFileUrls: string[] = [];

      // Загружаем файлы, если они есть
      if (attachedFiles.length > 0) {
        uploadedFileUrls = await uploadFiles(attachedFiles);
      }

      // Обновляем запись с комментарием и ссылками на файлы
      updateGradeRecord(
        commentModalData.studentId, 
        commentModalData.date, 
        { 
          comment: commentText,
          attachments: uploadedFileUrls
        }
      );

      // Инвалидируем кэш информации о занятиях
      teacherApiService.invalidateLessonInfoCache();

      // Закрываем модальное окно и сбрасываем состояние
      setCommentModalData(null);
      setCommentText('');
      setAttachedFiles([]);
      
    } catch (error) {
      console.error('Ошибка при сохранении комментария:', error);
    }
  };

  // Начало редактирования преподавателя
  const handleTeacherEditStart = (subgroup: string): void => {
    setEditingTeacher(subgroup);
    setTeacherEditValue(subgroupTeachers[selectedSubgroup as 'I' | 'II']);
  };

  // Сохранение преподавателя
  const handleTeacherSave = (): void => {
    if (editingTeacher) {
      updateSubgroupTeacher(editingTeacher, teacherEditValue);
      setEditingTeacher(null);
      setTeacherEditValue('');
    }
  };

  // Отмена редактирования преподавателя
  const handleTeacherCancel = (): void => {
    setEditingTeacher(null);
    setTeacherEditValue('');
  };

  // Обработка изменения глобального типа экзамена
  const handleGlobalExamTypeChange = (examType: string): void => {
    setGlobalExamType(examType);
    
    // Автоматически применяем ко всем студентам
    filteredStudents.forEach(student => {
      updateExamRecord(student.id, { examType: examType as any });
    });
  };

  // Обработчик клика по кнопке "Выставить посещаемость"
  const handleSetAttendance = (): void => {
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
    
    // Извлекаем только дату для отображения (без номера)
    const displayDate = date.split(' (')[0];
    const typeData = lessonTypesData[date];
    const lessonType = typeData?.type;
    
    return (
      <th key={index} className="column-date" rowSpan={2}>
        <div className="date-header-actions">
          {/* Кнопка с "..." для информации */}
          <button 
            className="date-infos-btn"
            onClick={() => handleDateButtonClick(date)}
            title="Информация о занятии"
          >
            ⋯
          </button>
          
          {/* Кнопка удаления даты */}
          <button 
            className="date-delete-btn"
            onClick={() => handleOpenDeleteDateModal(date, lessonNumber)}
            title="Удалить столбец с датой"
          >
            ×
          </button>
        </div>
          
          {/* ТОЛЬКО ДАТА БЕЗ НОМЕРА */}
        <div className="date-content">
          <div className="date-title-new">
            {displayDate}
          </div>
          
          {/* Индикатор типа занятия */}
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
              {/* Фиксированные колонки слева с rowspan */}
              <th className="column-number sticky-col table-header-rowspan" rowSpan={2}>№</th>
              <th className="column-name sticky-col table-header-rowspan" rowSpan={2}>ФИО</th>
              {hasMultipleTeachers && (
                <th className="column-subgroup sticky-col table-header-rowspan" rowSpan={2}>Подгруппа</th>
              )}
              
              {/* Динамические колонки с датами */}
              {filteredDates.map((date, index) => renderDateHeader(date, index))}

              {/* Пустой столбец для добавления даты - ВСЕГДА ПОСЛЕДНИЙ */}
              {renderAddDateColumn()}
              
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
                            className={`comment-btn ${
                              getTeacherCommentsForCell(student.id, date).length > 0 ? 'has-teacher-comment' : ''
                            } ${
                              getStudentCommentsForCell(student.id, date).length > 0 ? 'has-student-comment' : ''
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
                            }`}
                          >
                            💬
                          </button>
                        </div>
                      </td>
                    );
                  })}

                  {/* Пустая ячейка для добавления даты */}
                  <td className="column-add-date">
                    <div className="add-date-cell-plus"></div>
                  </td>
                  
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
            {/* БЛОК 1: Информация о занятии (только чтение) */}
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

            {/* БЛОК 2: Управление занятием (редактируемые поля) */}
            <div className="attendance-stats-section">
              <div className="attendance-stats-header">
                Управление занятием
              </div>
              <div className="attendance-stats-content">
                {/* Поле типа занятия */}
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

                {/* Поле темы занятия */}
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

                {/* Кнопка сохранения */}
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
          {/* Отображение преподавателя только при выборе конкретной подгруппы */}
          {hasMultipleTeachers && (
            <>
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
                      {subgroupTeachers[selectedSubgroup as 'I' | 'II']}
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
      {/* Заголовок с кнопками информации и обновления */}
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

      {/* Индикация использования кэша */}
      {isUsingCache && (
        <div className="performance-cache-warning">
          Используются кэшированные данные. Для актуальной информации обновите данные.
        </div>
      )}

      {/* Основной заголовок */}
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

      {/* Фильтры с кнопкой добавления даты */}
      {renderFilters()}

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
      {renderDateModal()}
      {renderSubgroupModal()}
      {renderAddDateModal()}
      {renderDeleteDateModal()}
      {renderImageModal()}
    </div>
  );
};

export default TeacherPerformanceSection;