import React, { useState, useEffect, useCallback } from 'react';
import { useUser, Student } from '../context/UserContext';
import { apiService, Document } from '../services/studentApiService';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import "./DocumentSectionStyle.css"

interface UserData {
  fullName: string;
  fullNameGenitive: string;
  group: string;
  course: string;
  phone: string;
  departmentHead: string;
}

interface FormData {
  documentTitle: string;
  startDate: string;
  endDate: string;
  phone: string;
  reason: string;
  institutionName: string;
  subject: string;
  teacher: string;
  month: string;
  hours: string;
  fullNameGenitive: string;
}

interface Subject {
  id: number;
  subjectName: string;
}

interface Teacher {
  id: number;
  name: string;
  lastName: string;
  patronymic: string;
}

interface StudentUpdateData {
  name?: string;
  lastName?: string;
  patronymic?: string;
  telephone?: string;
  lastNameGenitive?: string | null;
  nameGenitive?: string | null;
  patronymicGenitive?: string | null;
}

export const DocumentsSection: React.FC = () => {
  const { user, isStudent, setUser } = useUser();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState('Все документы');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isUsingCache, setIsUsingCache] = useState(false);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  
  const [teacherSubjects, setTeacherSubjects] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [availableTeachers, setAvailableTeachers] = useState<Teacher[]>([]);
  
  const [formData, setFormData] = useState<FormData>({
    documentTitle: '',
    startDate: '',
    endDate: '',
    phone: '',
    reason: '',
    institutionName: '',
    subject: '',
    teacher: '',
    month: '',
    hours: '',
    fullNameGenitive: ''
  });

  // Типы документов
  const documentTypes = [
    'Все документы',
    'Заявление на отчисление по собственному желанию',
    'Заявление на отчисление в связи с переводом',
    'Заявление на пропуск занятий',
    'Объяснительная записка о причинах опоздания',
    'Объяснительная записка о причинах пропусков занятия'
  ];

  // Месяцы для выбора
  const months = [
    'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
    'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'
  ];

  // Функция для проверки, требуется ли телефон для выбранного типа документа
  const isPhoneRequired = (): boolean => {
    return selectedDocumentType === 'Заявление на отчисление по собственному желанию' || 
           selectedDocumentType === 'Заявление на отчисление в связи с переводом';
  };

  // Функция сохранения данных студента в БД
  const saveStudentData = async (updateData: StudentUpdateData) => {
    if (!user || !isStudent) return;

    try {
      console.log('Saving student data:', updateData);
      await apiService.updateStudentData(user.id, updateData);
      
      // Приводим user к типу Student, так как мы уже проверили isStudent
      const studentUser = user as Student;
      
      // Обновляем данные в контексте и localStorage
      const updatedUser: Student = {
        ...studentUser,
        ...updateData,
        numberGroup: studentUser.numberGroup // Гарантируем, что numberGroup всегда есть
      };
      
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Обновляем локальные данные
      const savedFullNameGenitive = buildGenitiveName(
        updatedUser.lastNameGenitive,
        updatedUser.nameGenitive,
        updatedUser.patronymicGenitive
      );
      
      setUserData(prev => prev ? {
        ...prev,
        phone: updatedUser.telephone || '',
        fullNameGenitive: savedFullNameGenitive
      } : null);
      
      console.log('Student data saved successfully');
    } catch (error) {
      console.error('Error saving student data:', error);
      throw new Error('Не удалось сохранить данные в профиле');
    }
  };

  // Функция загрузки данных пользователя с сохраненными значениями
  const loadUserData = async () => {
    if (!user || !isStudent) {
      console.log('No user or not student, skipping user data load');
      return;
    }

    // Приводим user к типу Student, так как мы уже проверили isStudent
    const student = user as Student;

    try {
      console.log('Loading user data for student:', student.id);
      
      // Загружаем актуальные данные студента с сервера
      const studentData = await apiService.getStudentData(student.id);
      console.log('Student data from server:', studentData);
      
      const userPhone = studentData.telephone || '';
      
      // Ключевое исправление: ВСЕГДА используем данные из БД для ФИО в родительном падеже
      const savedFullNameGenitive = buildGenitiveName(
        studentData.lastNameGenitive,
        studentData.nameGenitive, 
        studentData.patronymicGenitive
      );
      
      console.log('Built genitive name from DB:', savedFullNameGenitive);
      
      const fullName = `${studentData.lastName} ${studentData.name} ${studentData.patronymic}`;
      
      let groupNumber = 'Неизвестно';
      let course = 'Неизвестно';
      
      try {
        const groupData = await apiService.getGroupData(studentData.idGroup);
        groupNumber = groupData.numberGroup?.toString() || 'Неизвестно';
        course = groupData.course?.toString() || 'Неизвестно';
        console.log('Group data loaded:', { groupNumber, course });
      } catch (groupError) {
        console.error('Ошибка загрузки данных группы:', groupError);
        // Используем numberGroup из studentData
        groupNumber = studentData.numberGroup?.toString() || 'Неизвестно';
        course = 'Неизвестно';
      }

      const userData: UserData = {
        fullName: fullName,
        fullNameGenitive: savedFullNameGenitive,
        group: groupNumber,
        course: course,
        phone: userPhone,
        departmentHead: 'Голубева Галина Анатольевна'
      };

      setUserData(userData);
      
      // ВСЕГДА заполняем форму данными из БД - как для телефона, так и для ФИО в родительном падеже
      setFormData(prev => ({
        ...prev,
        phone: userPhone,
        fullNameGenitive: savedFullNameGenitive // Это ключевое изменение!
      }));

      console.log('User data loaded successfully with genitive name from DB:', userData);

      // Обновляем контекст пользователя актуальными данными из БД
      const updatedUser: Student = {
        ...student,
        telephone: studentData.telephone,
        lastNameGenitive: studentData.lastNameGenitive,
        nameGenitive: studentData.nameGenitive,
        patronymicGenitive: studentData.patronymicGenitive
      };
      
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));

    } catch (error) {
      console.error('Ошибка загрузки данных пользователя:', error);
      
      // Fallback на данные из контекста
      const student = user as Student;
      const userPhone = student.telephone || '';
      
      // Используем данные из контекста как запасной вариант
      const savedFullNameGenitive = buildGenitiveName(
        student.lastNameGenitive,
        student.nameGenitive,
        student.patronymicGenitive
      );
      
      const fullName = `${student.lastName} ${student.name} ${student.patronymic}`;
      
      const fallbackUserData = {
        fullName: fullName,
        fullNameGenitive: savedFullNameGenitive,
        group: student.numberGroup.toString() || 'Неизвестно',
        course: 'Неизвестно', 
        phone: userPhone,
        departmentHead: 'Голубева Галина Анатольевна'
      };

      setUserData(fallbackUserData);

      setFormData(prev => ({
        ...prev,
        phone: userPhone,
        fullNameGenitive: savedFullNameGenitive
      }));
    }
  };

  // Функция для разделения ФИО в родительном падеже на отдельные компоненты
  const parseGenitiveName = (fullNameGenitive: string) => {
    const parts = fullNameGenitive.split(' ');
    return {
      lastNameGenitive: parts[0] || null,
      nameGenitive: parts[1] || null,
      patronymicGenitive: parts[2] || null
    };
  };

  // Функция для сборки ФИО в родительном падеже из отдельных компонентов
  const buildGenitiveName = (
    lastNameGenitive: string | null | undefined, 
    nameGenitive: string | null | undefined, 
    patronymicGenitive: string | null | undefined
  ): string => {
    return [lastNameGenitive, nameGenitive, patronymicGenitive]
      .filter(part => part && part.trim() !== '')
      .join(' ')
      .trim();
  };

  // Упрощенная функция загрузки документов с кэшированием как в успеваемости
  const loadDocuments = useCallback(async (forceRefresh = false) => {
    if (!user || !isStudent) return;
    
    const student = user as Student;
    setDocumentsLoading(true);
    setError(null);
    setIsUsingCache(false);

    try {
      // Сначала пытаемся загрузить из кэша (если не принудительное обновление)
      if (!forceRefresh) {
        const cacheKey = `documents_${student.id}_${selectedDocumentType}`;
        const cached = localStorage.getItem(`cache_${cacheKey}`);
        
        if (cached) {
          const cachedData = JSON.parse(cached);
          // Проверяем актуальность кэша (10 минут)
          if (Date.now() - cachedData.timestamp < 10 * 60 * 1000) {
            setDocuments(cachedData.data ?? []);
            setIsUsingCache(true);
            console.log('Документы загружены из кэша');
            setDocumentsLoading(false);
            return;
          }
        }
      }

      // Загрузка с API
      console.log('Загрузка документов с API...');
      let docs: Document[] = [];

      if (selectedDocumentType === 'Все документы') {
        docs = await apiService.fetchDocumentsByStudent(student.id);
      } else {
        docs = await apiService.getStudentDocumentsByType(student.id, selectedDocumentType);
      }

      setDocuments(docs);
      console.log(`Loaded ${docs.length} documents for type: ${selectedDocumentType}`);

      // Сохранение в кеш
      const cacheKey = `documents_${student.id}_${selectedDocumentType}`;
      const cacheData = {
        data: docs,
        timestamp: Date.now()
      };
      localStorage.setItem(`cache_${cacheKey}`, JSON.stringify(cacheData));

    } catch (err) {
      console.error('Error loading documents:', err);
      
      // Если ошибка API, пробуем загрузить из кэша как fallback
      try {
        const cacheKey = `documents_${student.id}_${selectedDocumentType}`;
        const cached = localStorage.getItem(`cache_${cacheKey}`);
        
        if (cached) {
          const cachedData = JSON.parse(cached);
          setDocuments(cachedData.data ?? []);
          setIsUsingCache(true);
          setError('Используются кэшированные данные. Нет соединения с сервером.');
          console.log('Документы загружены из кэша (fallback)');
        } else {
          setError('Не удалось загрузить документы. Проверьте подключение к интернету.');
          setDocuments([]);
        }
      } catch (cacheError) {
        setError('Не удалось загрузить документы');
        setDocuments([]);
      }
    } finally {
      setDocumentsLoading(false);
    }
  }, [user, isStudent, selectedDocumentType]);

  // Функция принудительного обновления
  const refreshDocuments = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    
    try {
      if (user && isStudent) {
        const student = user as Student;
        const cacheKey = `documents_${student.id}_${selectedDocumentType}`;
        localStorage.removeItem(`cache_${cacheKey}`);
      }
      
      await loadDocuments(true);
    } catch (error) {
      console.error('Error refreshing documents:', error);
      setError('Не удалось обновить документы');
    } finally {
      setIsRefreshing(false);
    }
  }, [user, isStudent, selectedDocumentType, loadDocuments]);

  // Загрузка данных пользователя 
  useEffect(() => {
    loadUserData();
  }, [user, isStudent]);

  // Загрузка документов при изменении типа или пользователя
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Загрузка данных о предметах и преподавателях
  useEffect(() => {
    const loadTeacherSubjects = async () => {
      if (!user || !isStudent) return;
      
      try {
        const student = user as Student;
        console.log('Loading teacher subjects for student:', student.id);
        
        const studentMarks = await apiService.getStudentMarks(student.id);
        console.log('Student marks:', studentMarks);
        
        const teacherIdsSet = new Set<number>();
        const subjectIdsSet = new Set<number>();
        
        studentMarks.forEach(mark => {
          if (mark.stNameSubjectDTO.idTeacher) {
            teacherIdsSet.add(mark.stNameSubjectDTO.idTeacher);
          }
          if (mark.stNameSubjectDTO.idSubject) {
            subjectIdsSet.add(mark.stNameSubjectDTO.idSubject);
          }
        });
        
        const teacherIds = Array.from(teacherIdsSet);
        const subjectIds = Array.from(subjectIdsSet);
        
        console.log('Found teacher IDs:', teacherIds);
        console.log('Found subject IDs:', subjectIds);
        
        const subjectsData: Subject[] = [];
        for (const subjectId of subjectIds) {
          try {
            const subject = await apiService.getSubjectById(subjectId);
            subjectsData.push({
              id: subjectId,
              subjectName: subject.subjectName 
            });
          } catch (error) {
            console.error(`Ошибка загрузки предмета ${subjectId}:`, error);
          }
        }
        setSubjects(subjectsData);
        console.log('Subjects loaded:', subjectsData);
        
        const teachersData: Teacher[] = [];
        for (const teacherId of teacherIds) {
          try {
            const teacher = await apiService.getTeacherData(teacherId);
            teachersData.push({
              id: teacherId,
              name: teacher.name,
              lastName: teacher.lastName,
              patronymic: teacher.patronymic
            });
          } catch (error) {
            console.error(`Ошибка загрузки преподавателя ${teacherId}:`, error);
          }
        }
        setTeachers(teachersData);
        console.log('Teachers loaded:', teachersData);
        
        const teacherSubjectsData = studentMarks.map(mark => ({
          idTeacher: mark.stNameSubjectDTO.idTeacher,
          idSubject: mark.stNameSubjectDTO.idSubject,
          subjectName: mark.stNameSubjectDTO.nameSubject
        }));
        setTeacherSubjects(teacherSubjectsData);
        console.log('Teacher subjects loaded:', teacherSubjectsData);
        
      } catch (error) {
        console.error('Ошибка загрузки данных о предметах и преподавателях:', error);
      }
    };

    loadTeacherSubjects();
  }, [user, isStudent]);

  // Обработчик изменения полей формы
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Обработка изменения предмета
    if (field === 'subject') {
      handleSubjectChange(value);
    }
  };

  // Обработчик изменения предмета - обновляет список доступных преподавателей
  const handleSubjectChange = (subjectId: string) => {
    setFormData(prev => ({
      ...prev,
      subject: subjectId,
      teacher: ''
    }));

    if (!subjectId) {
      setAvailableTeachers([]);
      return;
    }

    const selectedSubjectId = parseInt(subjectId);
    
    const subjectRelations = teacherSubjects.filter(ts => ts.idSubject === selectedSubjectId);
    
    const teacherIdsSet = new Set<number>();
    subjectRelations.forEach(ts => {
      if (ts.idTeacher) {
        teacherIdsSet.add(ts.idTeacher);
      }
    });
    const teacherIds = Array.from(teacherIdsSet);
    
    const filteredTeachers = teachers.filter(teacher => teacherIds.includes(teacher.id));
    
    setAvailableTeachers(filteredTeachers);
  };

  // Функции для работы с модальным окном
  const openModal = () => {
    // ВСЕГДА заполняем форму актуальными данными при открытии модального окна
    if (userData) {
      setFormData(prev => ({
        ...prev,
        phone: userData.phone,
        fullNameGenitive: userData.fullNameGenitive
      }));
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({
      documentTitle: '',
      startDate: '',
      endDate: '',
      phone: userData?.phone || '',
      reason: '',
      institutionName: '',
      subject: '',
      teacher: '',
      month: '',
      hours: '',
      fullNameGenitive: userData?.fullNameGenitive || ''
    });
    setAvailableTeachers([]);
  };

  // Функция для получения названия месяца по номеру
  const getMonthName = (monthNumber: number) => {
    const monthsGenitive = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];
    return monthsGenitive[monthNumber - 1];
  };

  // Функция для преобразования месяца из именительного в родительный падеж
  const getMonthGenitive = (monthNominative: string): string => {
    const monthMap: { [key: string]: string } = {
      'январь': 'января',
      'февраль': 'февраля',
      'март': 'марта',
      'апрель': 'апреля',
      'май': 'мая',
      'июнь': 'июня',
      'июль': 'июля',
      'август': 'августа',
      'сентябрь': 'сентября',
      'октябрь': 'октября',
      'ноябрь': 'ноября',
      'декабрь': 'декабря'
    };
    return monthMap[monthNominative] || monthNominative;
  };

  // Функция для преобразования месяца из именительного в предложный падеж
  const getMonthPrepositional = (monthNominative: string): string => {
    const monthMap: { [key: string]: string } = {
      'январь': 'январе',
      'февраль': 'феврале',
      'март': 'марте',
      'апрель': 'апреле',
      'май': 'мае',
      'июнь': 'июне',
      'июль': 'июле',
      'август': 'августе',
      'сентябрь': 'сентябре',
      'октябрь': 'октябре',
      'ноябрь': 'ноябре',
      'декабрь': 'декабре'
    };
    return monthMap[monthNominative] || monthNominative;
  };

  // Форматирование даты для документа
  const formatDateForDocument = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = getMonthName(date.getMonth() + 1);
    const year = date.getFullYear().toString();
    return { day, month, year };
  };

  // Форматирование даты в формат дд.мм.гг для заявления на пропуск
  const formatDateDDMMYY = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${day}.${month}.${year}`;
  };

  // Функция для преобразования причины пропуска (только первая буква строчная)
  const formatReason = (reason: string): string => {
    if (!reason) return '';
    return reason.charAt(0).toLowerCase() + reason.slice(1);
  };

  // Функция загрузки документа в компоненте
  const uploadDocumentToServer = async (blob: Blob, fileName: string) => {
    if (!user || !isStudent) return;

    try {
      const student = user as Student;
      const file = new File([blob], fileName, { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });

      await apiService.uploadDocument(file, student.id, selectedDocumentType);
      console.log('Document uploaded, cache will be invalidated');

      const cacheKey = `documents_${student.id}_${selectedDocumentType}`;
      localStorage.removeItem(`cache_${cacheKey}`);
      
      // Перезагружаем документы
      setTimeout(() => {
        loadDocuments(true);
      }, 1000);

    } catch (error) {
      console.error('Ошибка загрузки документа на сервер:', error);
      setError('Документ создан локально, но не загружен на сервер: ' + 
        (error instanceof Error ? error.message : 'Неизвестная ошибка'));
    }
  };

  // Основная функция для генерации docx
  const generateDocxFromTemplate = async (
    templateUrl: string,
    data: any,
    fileName: string
  ) => {
    setIsLoading(true);
    try {
      const response = await fetch(templateUrl);
      if (!response.ok) throw new Error('Ошибка загрузки шаблона ' + response.statusText);
      
      const arrayBuffer = await response.arrayBuffer();
      const zip = new PizZip(arrayBuffer);
      
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      doc.render(data);

      const blob = doc.getZip().generate({ 
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      saveAs(blob, fileName);
      await uploadDocumentToServer(blob, fileName);
      closeModal();
    } catch (error) {
      console.error('Ошибка генерации документа:', error);
      setError('Не удалось создать документ: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'));
    } finally {
      setIsLoading(false);
    }
  };

  // Обработчик создания документа
  const handleCreateDocument = async () => {
    if (!userData) {
      setError('Данные пользователя не загружены');
      return;
    }

    if (!formData.documentTitle.trim()) {
      setError('Пожалуйста, введите название документа');
      return;
    }

    if (isPhoneRequired() && !formData.phone.trim()) {
      setError('Пожалуйста, введите номер телефона');
      return;
    }

    // Сохранение телефона и ФИО в родительном падеже в БД перед созданием документа
    try {
      const updateData: StudentUpdateData = {};
      let hasChanges = false;

      // Сохранение телефона, если он изменился
      if (formData.phone !== userData.phone) {
        updateData.telephone = formData.phone;
        hasChanges = true;
      }

      // Сохранение ФИО в родительном падеже, если оно изменилось или отсутствует в профиле
      if (formData.fullNameGenitive !== userData.fullNameGenitive || !userData.fullNameGenitive) {
        // Парсинг ФИО в родительном падеже на отдельные компоненты для сохранения в БД
        const genitiveParts = parseGenitiveName(formData.fullNameGenitive);
        updateData.lastNameGenitive = genitiveParts.lastNameGenitive;
        updateData.nameGenitive = genitiveParts.nameGenitive;
        updateData.patronymicGenitive = genitiveParts.patronymicGenitive;
        hasChanges = true;
      }

      // Сохранение данных в БД, если есть изменения
      if (hasChanges) {
        console.log('Saving student data before creating document:', updateData);
        await saveStudentData(updateData);
        console.log('Student data saved successfully before document creation');
      }

    } catch (error) {
      console.error('Error saving student data before document creation:', error);
      setError('Не удалось сохранить данные в профиле. Документ не будет создан.');
      return;
    }

    let templateUrl = '';
    let fileName = '';
    let templateData = {};

    const currentDate = formatDateForDocument(new Date().toISOString().split('T')[0]);

    switch (selectedDocumentType) {
      case 'Заявление на отчисление по собственному желанию':
        if (!formData.startDate) {
          setError('Пожалуйста, выберите дату отчисления');
          return;
        }
        const dismissalDate1 = formatDateForDocument(formData.startDate);
        templateUrl = '/templates/dismissal_template.docx';
        fileName = `${formData.documentTitle.replace(/\s+/g, '_')}.docx`;
        templateData = {
          fullName: formData.fullNameGenitive,
          group: userData.group,
          phone: formData.phone,
          departmentHead: userData.departmentHead,
          dismissalDay: dismissalDate1.day,
          dismissalMonth: dismissalDate1.month,
          dismissalYear: dismissalDate1.year,
          currentDay: currentDate.day,
          currentMonth: currentDate.month,
          currentYear: currentDate.year
        };
        break;

      case 'Заявление на отчисление в связи с переводом':
        if (!formData.startDate || !formData.institutionName.trim()) {
          setError('Пожалуйста, заполните дату отчисления и название учебного заведения');
          return;
        }
        const dismissalDate2 = formatDateForDocument(formData.startDate);
        templateUrl = '/templates/transfer_template.docx';
        fileName = `${formData.documentTitle.replace(/\s+/g, '_')}.docx`;
        templateData = {
          fullName: formData.fullNameGenitive,
          group: userData.group,
          phone: formData.phone,
          institutionName: formData.institutionName,
          departmentHead: userData.departmentHead,
          dismissalDay: dismissalDate2.day,
          dismissalMonth: dismissalDate2.month,
          dismissalYear: dismissalDate2.year,
          currentDay: currentDate.day,
          currentMonth: currentDate.month,
          currentYear: currentDate.year
        };
        break;

      case 'Заявление на пропуск занятий':
        if (!formData.startDate || !formData.endDate || !formData.reason.trim()) {
          setError('Пожалуйста, заполните даты пропуска и причину');
          return;
        }
        const startDate = formatDateDDMMYY(formData.startDate);
        const endDate = formatDateDDMMYY(formData.endDate);
        
        const courseNumber = userData.course.match(/\d+/)?.[0] || '4';
        
        templateUrl = '/templates/absence_template.docx';
        fileName = `${formData.documentTitle.replace(/\s+/g, '_')}.docx`;
        templateData = {
          fullName: formData.fullNameGenitive,
          group: userData.group,
          course: courseNumber,
          dateStart: startDate,
          dateEnd: endDate,
          reason: formatReason(formData.reason),
          currentDay: currentDate.day,
          currentMonth: currentDate.month,
          currentYear: currentDate.year
        };
        break;

      case 'Объяснительная записка о причинах опоздания':
        if (!formData.subject || !formData.teacher || !formData.reason.trim()) {
          setError('Пожалуйста, заполните все обязательные поля');
          return;
        }
        const selectedSubject = subjects.find(s => s.id === parseInt(formData.subject));
        const selectedTeacher = teachers.find(t => t.id === parseInt(formData.teacher));
        
        if (!selectedSubject || !selectedTeacher) {
          setError('Не удалось найти выбранный предмет или преподавателя');
          return;
        }
        
        const teacherFullName = `${selectedTeacher.lastName} ${selectedTeacher.name} ${selectedTeacher.patronymic}`;
        
        templateUrl = '/templates/lateness_explanation_template.docx';
        fileName = `${formData.documentTitle.replace(/\s+/g, '_')}.docx`;
        templateData = {
          fullNameGenitive: formData.fullNameGenitive,
          fullName: userData.fullName,
          group: userData.group,
          course: userData.course,
          subject: selectedSubject.subjectName,
          teacher: teacherFullName, 
          reason: formatReason(formData.reason),
          currentDay: currentDate.day,
          currentMonth: currentDate.month,
          currentYear: currentDate.year
        };
        break;

      case 'Объяснительная записка о причинах пропусков занятия':
        if (!formData.month || !formData.hours || !formData.reason.trim()) {
          setError('Пожалуйста, заполните все обязательные поля');
          return;
        }
        templateUrl = '/templates/absence_explanation_template.docx';
        fileName = `${formData.documentTitle.replace(/\s+/g, '_')}.docx`;
        templateData = {
          fullNameGenitive: formData.fullNameGenitive,
          fullName: userData.fullName,
          group: userData.group,
          course: userData.course,
          month: getMonthPrepositional(formData.month), 
          quantityHours: formData.hours,
          reason: formatReason(formData.reason),
          currentDay: currentDate.day,
          currentMonth: currentDate.month,
          currentYear: currentDate.year
        };
        break;

      default:
        setError('Неизвестный тип документа');
        return;
    }

    setError(null);
    generateDocxFromTemplate(templateUrl, templateData, fileName);
  };

  // Обработчик скачивания документа
  const handleDownloadDocument = async (documentId: number) => {
    try {
      setIsLoading(true);
      setError(null);
      
      await apiService.downloadDocument(documentId);
      
      console.log('Документ успешно скачан');
      
    } catch (error) {
      console.error('Ошибка скачивания документа:', error);
      setError(`Не удалось скачать документ: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Обработчик удаления документа
  const handleDeleteDocument = async (id: number) => {
    if (window.confirm('Вы уверены, что хотите удалить этот документ?')) {
      try {
        await apiService.deleteDocument(id);
        console.log('Document deleted, cache invalidated');
        
        // Инвалидируем кэш после удаления
        if (user && isStudent) {
          const student = user as Student;
          const cacheKey = `documents_${student.id}_${selectedDocumentType}`;
          localStorage.removeItem(`cache_${cacheKey}`);
        }
        
        loadDocuments(true);
        
      } catch (error) {
        console.error('Ошибка удаления документа:', error);
        setError('Не удалось удалить документ с сервера');
      }
    }
  };

  // Рендер модального окна
  const renderModal = () => {
    if (!isModalOpen || !userData) return null;

    return (
      <div className="ds-modal-overlay" onClick={closeModal}>
        <div className="ds-modal-container" onClick={(e) => e.stopPropagation()}>
          <div className="ds-modal-header">
            <h3>Создание документа</h3>
            <button className="ds-modal-close" onClick={closeModal}>×</button>
          </div>

          <div className="ds-modal-content">
            <div className="ds-modal-type">
              <strong>Тип документа:</strong> {selectedDocumentType}
            </div>

            {error && <div className="ds-error-message">{error}</div>}

            <div className="ds-form-sections">
              <div className="ds-form-section">
                <h4>Общая информация</h4>
                <div className="ds-form-grid">
                  <div className="ds-form-field">
                    <label>Название документа *</label>
                    <input 
                      type="text" 
                      value={formData.documentTitle}
                      onChange={(e) => handleInputChange('documentTitle', e.target.value)}
                      className="ds-input"
                      placeholder="Введите название документа"
                      required
                    />
                  </div>
                  <div className="ds-form-field">
                    <label>ФИО студента (именительный падеж)</label>
                    <input type="text" value={userData.fullName} disabled className="ds-input disabled" />
                  </div>
                  <div className="ds-form-field">
                    <label>ФИО студента (родительный падеж) * 
                      {!userData.fullNameGenitive}
                    </label>
                    <input 
                      type="text" 
                      value={formData.fullNameGenitive}
                      onChange={(e) => handleInputChange('fullNameGenitive', e.target.value)}
                      className="ds-input"
                      placeholder="Введите ФИО в родительном падеже (например: Иванова Ивана Ивановича)"
                      required
                    />
                    <div style={{fontSize: '12px', color: '#666', marginTop: '4px'}}>
                      Пример: Иванова Ивана Ивановича
                    </div>
                  </div>
                </div>
              </div>

              {isPhoneRequired() && (
                <div className="ds-form-section">
                  <h4>Контактные данные</h4>
                  <div className="ds-form-grid">
                    <div className="ds-form-field full-width">
                      <label>Телефон * {!userData.phone && <span style={{color: 'red'}}>(не указан в профиле)</span>}</label>
                      <input 
                        type="tel" 
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="ds-input"
                        placeholder="Введите номер телефона"
                        required
                      />
                      {!userData.phone && (
                        <div style={{fontSize: '12px', color: '#666', marginTop: '5px'}}>
                          Телефон не указан в вашем профиле. Пожалуйста, введите его для создания документа.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {selectedDocumentType === 'Заявление на отчисление по собственному желанию' && (
                <div className="ds-form-section">
                  <h4>Данные для заявления</h4>
                  <div className="ds-form-grid">
                    <div className="ds-form-field">
                      <label>Дата отчисления *</label>
                      <input 
                        type="date" 
                        value={formData.startDate}
                        onChange={(e) => handleInputChange('startDate', e.target.value)}
                        className="ds-input"
                        required
                      />
                    </div>
                    <div className="ds-form-field">
                      <label>Заведующий отделением</label>
                      <input type="text" value={userData.departmentHead} disabled className="ds-input disabled" />
                    </div>
                  </div>
                </div>
              )}

              {selectedDocumentType === 'Заявление на отчисление в связи с переводом' && (
                <div className="ds-form-section">
                  <h4>Данные для заявления</h4>
                  <div className="ds-form-grid">
                    <div className="ds-form-field">
                      <label>Дата отчисления *</label>
                      <input 
                        type="date" 
                        value={formData.startDate}
                        onChange={(e) => handleInputChange('startDate', e.target.value)}
                        className="ds-input"
                        required
                      />
                    </div>
                    <div className="ds-form-field full-width">
                      <label>Название учебного заведения *</label>
                      <input 
                        type="text" 
                        value={formData.institutionName}
                        onChange={(e) => handleInputChange('institutionName', e.target.value)}
                        className="ds-input"
                        placeholder="Введите полное название учебного заведения"
                        required
                      />
                    </div>
                    <div className="ds-form-field">
                      <label>Заведующий отделением</label>
                      <input type="text" value={userData.departmentHead} disabled className="ds-input disabled" />
                    </div>
                  </div>
                </div>
              )}

              {selectedDocumentType === 'Заявление на пропуск занятий' && (
                <div className="ds-form-section">
                  <h4>Данные для заявления</h4>
                  <div className="ds-form-grid">
                    <div className="ds-form-field">
                      <label>Пропуск с *</label>
                      <input 
                        type="date" 
                        value={formData.startDate}
                        onChange={(e) => handleInputChange('startDate', e.target.value)}
                        className="ds-input"
                        required
                      />
                    </div>
                    <div className="ds-form-field">
                      <label>Пропуск по *</label>
                      <input 
                        type="date" 
                        value={formData.endDate}
                        onChange={(e) => handleInputChange('endDate', e.target.value)}
                        className="ds-input"
                        required
                      />
                    </div>
                  </div>
                  <div className="ds-form-field full-width">
                    <label>Причина пропуска *</label>
                    <textarea 
                      value={formData.reason}
                      onChange={(e) => handleInputChange('reason', e.target.value)}
                      className="ds-textarea"
                      placeholder="В связи с ..."
                      rows={3}
                      required
                    />
                  </div>
                </div>
              )}

              {selectedDocumentType === 'Объяснительная записка о причинах опоздания' && (
                <div className="ds-form-section">
                  <h4>Данные для объяснительной записки</h4>
                  <div className="ds-form-grid">
                    <div className="ds-form-field">
                      <label>Предмет *</label>
                      <select 
                        value={formData.subject}
                        onChange={(e) => handleInputChange('subject', e.target.value)}
                        className="ds-input"
                        required
                      >
                        <option value="">Выберите предмет</option>
                        {subjects.map(subject => (
                          <option key={subject.id} value={subject.id}>
                            {subject.subjectName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="ds-form-field">
                      <label>Преподаватель *</label>
                      <select 
                        value={formData.teacher}
                        onChange={(e) => handleInputChange('teacher', e.target.value)}
                        className="ds-input"
                        required
                        disabled={!formData.subject}
                      >
                        <option value="">Выберите преподавателя</option>
                        {availableTeachers.map(teacher => (
                          <option key={teacher.id} value={teacher.id}>
                            {teacher.lastName} {teacher.name} {teacher.patronymic}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="ds-form-field full-width">
                    <label>Причина опоздания *</label>
                    <textarea 
                      value={formData.reason}
                      onChange={(e) => handleInputChange('reason', e.target.value)}
                      className="ds-textarea"
                      placeholder="Опишите причину опоздания"
                      rows={3}
                      required
                    />
                  </div>
                </div>
              )}

              {selectedDocumentType === 'Объяснительная записка о причинах пропусков занятия' && (
                <div className="ds-form-section">
                  <h4>Данные для объяснительной записки</h4>
                  <div className="ds-form-grid">
                    <div className="ds-form-field">
                      <label>Месяц *</label>
                      <select 
                        value={formData.month}
                        onChange={(e) => handleInputChange('month', e.target.value)}
                        className="ds-input"
                        required
                      >
                        <option value="">Выберите месяц</option>
                        {months.map((month, index) => (
                          <option key={index} value={month}>
                            {month}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="ds-form-field">
                      <label>Количество пропущенных часов *</label>
                      <input 
                        type="number" 
                        value={formData.hours}
                        onChange={(e) => handleInputChange('hours', e.target.value)}
                        className="ds-input"
                        placeholder="Введите количество часов"
                        min="1"
                        required
                      />
                    </div>
                  </div>
                  <div className="ds-form-field full-width">
                    <label>Причина пропуска *</label>
                    <textarea 
                      value={formData.reason}
                      onChange={(e) => handleInputChange('reason', e.target.value)}
                      className="ds-textarea"
                      placeholder="Опишите причину пропуска"
                      rows={3}
                      required
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="ds-modal-footer">
              <button className="ds-cancel-btn" onClick={closeModal} disabled={isLoading}>
                Отмена
              </button>
              <button 
                className="ds-create-btn" 
                onClick={handleCreateDocument}
                disabled={isLoading || !formData.documentTitle.trim() || (isPhoneRequired() && !formData.phone.trim())}
              >
                {isLoading ? 'Создание...' : 'Создать документ'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!userData) {
    return (
      <div className="document-section">
        <div className="ds-content">
          <div className="ds-loading">
            <div className="ds-loading-spinner"></div>
            <p>Загрузка документов...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="document-section">
      <div className="ds-header">
        <div className="ds-controls">
          <div className="ds-controls-left">
            <div className="ds-filter-section">
              <label htmlFor="document-type" className="ds-filter-label">Тип документа:</label>
              <select 
                id="document-type"
                value={selectedDocumentType}
                onChange={(e) => {
                  console.log('Document type changed to:', e.target.value);
                  setSelectedDocumentType(e.target.value);
                }}
                className="ds-select"
              >
                {documentTypes.map((type, index) => (
                  <option key={index} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="ds-controls-right">
            <button 
              className="ds-create-main-btn"
              onClick={openModal}
              disabled={selectedDocumentType === 'Все документы'}
            >
              Создать документ
            </button>
            
            <button 
              className="ds-refresh-btn"
              onClick={refreshDocuments}
              disabled={isRefreshing || documentsLoading}
            >
              <img 
                src="/st-icons/upload_icon.svg" 
                className={`ds-refresh-icon ${isRefreshing ? 'ds-refresh-spin' : ''}`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="ds-content">
        {documentsLoading ? (
          <div className="ds-loading">
            <div className="ds-loading-spinner"></div>
            <p>Загрузка документов...</p>
          </div>
        ) : documents.length > 0 ? (
          <table className="ds-table">
            <thead>
              <tr>
                <th>№</th>
                <th>Название документа</th>
                <th>Тип</th>
                <th>Дата создания</th>
                <th>Действия</th>
              </tr>
            </thead>

            <tbody>
              {documents.map((document, index) => (
                <tr key={document.id}>
                  <td>{index + 1}.</td>
                  <td>{document.nameFile}</td>
                  <td>{document.type || 'Не указан'}</td>
                  <td>{document.creationDate || 'Не указана'}</td>
                  <td>
                    <div className="ds-action-buttons">
                      <button 
                        className="ds-download-btn"
                        onClick={() => handleDownloadDocument(document.id)}
                        disabled={isLoading}
                      >
                        Скачать
                      </button>
                      <button 
                        className="ds-delete-btn"
                        onClick={() => handleDeleteDocument(document.id)}
                        disabled={isLoading}
                      >
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="ds-empty-state">
            <p>
              {selectedDocumentType === 'Все документы' 
                ? 'У вас пока нет созданных документов' 
                : `Нет документов типа "${selectedDocumentType}"`
              }
            </p>
          </div>
        )}
      </div>

      {renderModal()}
    </div>
  );
};