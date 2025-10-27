import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { apiService, Document, TeacherSubject } from '../services/studentApiService';
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

export const DocumentsSection: React.FC = () => {
  const { user, isStudent } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState('Все документы');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Новые состояния для предметов и преподавателей
  const [teacherSubjects, setTeacherSubjects] = useState<TeacherSubject[]>([]);
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

  // Загрузка документов студента
  // Загрузка документов студента с фильтрацией по типу
  useEffect(() => {
    const loadDocuments = async () => {
      if (!user || !isStudent) return;
      
      try {
        setLoading(true)
        const student = user as any;
        let studentDocuments: Document[] = [];

        if (selectedDocumentType === 'Все документы') {
          // Загружаем все документы студента
          studentDocuments = await apiService.fetchDocumentsByStudent(student.id);
        } else {
          // Загружаем документы только определенного типа
          studentDocuments = await apiService.getStudentDocumentsByType(student.id, selectedDocumentType);
        }
        
        setDocuments(studentDocuments);
        setError(null);
      } catch (error) {
        console.error('Ошибка загрузки документов:', error);
        setError('Не удалось загрузить документы');
      }finally {
        setLoading(false);
      }
    };

    loadDocuments();
  }, [user, isStudent, selectedDocumentType]);

  // Загрузка данных о предметах и преподавателях
  useEffect(() => {
    const loadTeacherSubjects = async () => {
      if (!user || !isStudent) return;
      
      try {
        const student = user as any;
        
        // Загружаем связи преподавателей и предметов
        const teacherSubjectsData = await apiService.getTeacherSubjects(student.id);
        setTeacherSubjects(teacherSubjectsData);
        
        // Получаем уникальные ID предметов (исправленная версия)
        const subjectIdsSet = new Set<number>();
        teacherSubjectsData.forEach(ts => subjectIdsSet.add(ts.idSubject));
        const subjectIds = Array.from(subjectIdsSet);
        
        // Загружаем информацию о предметах
        const subjectsData: Subject[] = [];
        for (const subjectId of subjectIds) {
          try {
            const subject = await apiService.getSubjectById(subjectId);
            subjectsData.push(subject);
          } catch (error) {
            console.error(`Ошибка загрузки предмета ${subjectId}:`, error);
          }
        }
        setSubjects(subjectsData);
        
        // Загружаем информацию о преподавателях (исправленная версия)
        const teacherIdsSet = new Set<number>();
        teacherSubjectsData.forEach(ts => {
          if (ts.idTeacher) {
            teacherIdsSet.add(ts.idTeacher);
          }
        });
        const teacherIds = Array.from(teacherIdsSet);
        
        const teachersData: Teacher[] = [];
        for (const teacherId of teacherIds) {
          try {
            const teacher = await apiService.getTeacherData(teacherId);
            teachersData.push(teacher);
          } catch (error) {
            console.error(`Ошибка загрузки преподавателя ${teacherId}:`, error);
          }
        }
        setTeachers(teachersData);
        
      } catch (error) {
        console.error('Ошибка загрузки данных о предметах и преподавателях:', error);
      }
    };

    loadTeacherSubjects();
  }, [user, isStudent]);

  // Функция для преобразования ФИО в родительный падеж
  const getGenitiveCase = (fullName: string): string => {
    if (!fullName || typeof fullName !== 'string') return fullName;
    
    const parts = fullName.trim().split(/\s+/).filter(part => part.trim() !== '');
    if (parts.length < 3) return fullName;
    
    let [lastName, firstName, patronymic] = parts;

    // Функция для исправления опечаток
    const fixTypos = (name: string): string => {
      // Приводим к нижнему регистру для сравнения
      const lowerName = name.toLowerCase();
      
      // Исправляем опечатки
      if (lowerName === 'шкипероваа') return 'Шкиперова';
      if (lowerName === 'анытольевна') return 'Анатольевна';
      if (lowerName === 'александравна') return 'Александровна';
      if (lowerName === 'сергеевнаа') return 'Сергеевна';
      if (lowerName === 'ивановнаа') return 'Ивановна';
      if (lowerName === 'петровнаа') return 'Петровна';
      if (lowerName === 'сидоровнаа') return 'Сидоровна';
      if (lowerName === 'валерьевич') return 'Валерьевич';
      if (lowerName === 'сергеевичч') return 'Сергеевич';
      if (lowerName === 'ивановичч') return 'Иванович';
      if (lowerName === 'петровичч') return 'Петрович';
      
      // Если нет опечаток, возвращаем оригинал с правильной капитализацией
      return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    };

    // Применяем исправление опечаток
    lastName = fixTypos(lastName);
    firstName = fixTypos(firstName);
    patronymic = fixTypos(patronymic);

    console.log('После исправления опечаток:', { lastName, firstName, patronymic });

    // Склонение фамилий
    const declineLastName = (name: string): string => {
      const lowerName = name.toLowerCase();
      
      // Женские фамилии
      if (lowerName.endsWith('ая')) return name.slice(0, -2) + 'ой';
      if (lowerName.endsWith('кая')) return name.slice(0, -3) + 'кой';
      if (lowerName.endsWith('ская')) return name.slice(0, -3) + 'ской';
      if (lowerName.endsWith('цкая')) return name.slice(0, -3) + 'цкой';
      
      // Фамилии на -ова, -ева, -ина, -ына
      if (lowerName.endsWith('ова') || lowerName.endsWith('ева') || 
          lowerName.endsWith('ина') || lowerName.endsWith('ына')) {
        return name.slice(0, -1) + 'ой';
      }
      
      // Фамилии на -а (женские)
      if (lowerName.endsWith('а') && !lowerName.endsWith('ова') && 
          !lowerName.endsWith('ева') && !lowerName.endsWith('ина') && !lowerName.endsWith('ына')) {
        return name.slice(0, -1) + 'ой';
      }
      
      // Мужские фамилии
      if (lowerName.endsWith('ов') || lowerName.endsWith('ев') || 
          lowerName.endsWith('ин') || lowerName.endsWith('ын')) {
        return name + 'а';
      }
      if (lowerName.endsWith('ский') || lowerName.endsWith('цкий') || 
          lowerName.endsWith('ой') || lowerName.endsWith('ий') || lowerName.endsWith('ый')) {
        return name.slice(0, -2) + 'ого';
      }
      
      // Общие случаи
      if (lowerName.endsWith('я')) return name.slice(0, -1) + 'и';
      if (lowerName.endsWith('ь')) return name.slice(0, -1) + 'я';
      
      return name + 'а';
    };

    // Склонение имен
    const declineFirstName = (name: string): string => {
      const lowerName = name.toLowerCase();
      
      // Специальные случаи
      const specialCases: { [key: string]: string } = {
        'павел': 'Павла',
        'лев': 'Льва', 
        'пётр': 'Петра',
        'николай': 'Николая',
        'георгий': 'Георгия',
        'дмитрий': 'Дмитрия',
        'евгений': 'Евгения',
        'валерий': 'Валерия',
        'валерия': 'Валерии',
        'юрий': 'Юрия',
        'григорий': 'Григория',
        'вячеслав': 'Вячеслава',
        'яков': 'Якова',
        'макар': 'Макара',
        'прокофий': 'Прокофия',
        'любовь': 'Любови',
        'нелли': 'Нелли',
        'николь': 'Николь',
        'рашель': 'Рашели',
        'софья': 'Софьи',
        'ольга': 'Ольги',
        'елена': 'Елены',
        'светлана': 'Светланы',
        'марина': 'Марины',
        'алёна': 'Алёны',
        'анна': 'Анны',
        'мария': 'Марии',
        'екатерина': 'Екатерины',
        'наталья': 'Натальи',
        'ирина': 'Ирины',
        'татьяна': 'Татьяны'
      };
      
      if (specialCases[lowerName]) {
        return specialCases[lowerName];
      }
      
      // Женские имена
      if (lowerName.endsWith('ия')) return name.slice(0, -1) + 'и';
      if (lowerName.endsWith('ья')) return name.slice(0, -2) + 'ьи';
      if (lowerName.endsWith('а')) return name.slice(0, -1) + 'ы';
      if (lowerName.endsWith('я')) return name.slice(0, -1) + 'и';
      
      // Мужские имена  
      if (lowerName.endsWith('й')) return name.slice(0, -1) + 'я';
      if (lowerName.endsWith('ь')) return name.slice(0, -1) + 'я';
      if (lowerName.endsWith('ей') || lowerName.endsWith('ий')) {
        return name.slice(0, -2) + 'ея';
      }
      if (lowerName.endsWith('ел') || lowerName.endsWith('ил')) return name + 'а';
      
      return name + 'а';
    };

    // Склонение отчеств
    const declinePatronymic = (name: string): string => {
      const lowerName = name.toLowerCase();
      
      // Мужские отчества
      if (lowerName.endsWith('ич')) return name + 'а';
      
      // Женские отчества
      if (lowerName.endsWith('на')) {
        if (lowerName.endsWith('вна') || lowerName.endsWith('чна')) {
          return name.slice(0, -2) + 'ы';
        }
        return name.slice(0, -1) + 'ы';
      }
      
      return name + 'а';
    };

    try {
      const lastNameGenitive = declineLastName(lastName);
      const firstNameGenitive = declineFirstName(firstName);
      const patronymicGenitive = declinePatronymic(patronymic);

      const result = `${lastNameGenitive} ${firstNameGenitive} ${patronymicGenitive}`;
      
      console.log('Результат склонения:', {
        original: fullName,
        fixed: `${lastName} ${firstName} ${patronymic}`,
        result: result
      });

      return result;
    } catch (error) {
      console.error('Ошибка при склонении ФИО:', error, fullName);
      return fullName;
    }
  };

  // Функция для получения курса студента из данных группы
  const getStudentCourse = async (student: any): Promise<string> => {
    try {
      const groupData = await apiService.getGroupData(student.idGroup);
      return groupData.course.toString();
    } catch (error) {
      console.error('Ошибка получения данных группы:', error);
      return student.course?.toString() || 'Неизвестно';
    }
  };

  // Загрузка данных пользователя
  useEffect(() => {
    const loadUserData = async () => {
      if (!user || !isStudent) return;

      try {
        const student = user as any;
        const userPhone = student.telephone || '';
        const fullName = `${student.lastName} ${student.name} ${student.patronymic}`;
        const course = await getStudentCourse(student);
        
        const userData: UserData = {
          fullName: fullName,
          fullNameGenitive: '',
          group: student.numberGroup.toString(),
          course: course,
          phone: userPhone,
          departmentHead: 'Голубева Галина Анатольевна'
        };

        setUserData(userData);
        
        if (userPhone) {
          setFormData(prev => ({
            ...prev,
            phone: userPhone
          }));
        }

      } catch (error) {
        console.error('Ошибка загрузки данных пользователя:', error);
        const student = user as any;
        const fullName = `${student.lastName} ${student.name} ${student.patronymic}`;
        const fullNameGenitive = getGenitiveCase(fullName);
        
        setUserData({
          fullName: fullName,
          fullNameGenitive: fullNameGenitive,
          group: student.numberGroup?.toString() || 'Неизвестно',
          course: 'Неизвестно',
          phone: student.telephone || '',
          departmentHead: 'Голубева Галина Анатольевна'
        });
      }
    };

    loadUserData();
  }, [user, isStudent]);

  // Обработчик изменения предмета - обновляет список доступных преподавателей
  const handleSubjectChange = (subjectId: string) => {
    setFormData(prev => ({
      ...prev,
      subject: subjectId,
      teacher: '' // Сбрасываем выбор преподавателя
    }));

    if (!subjectId) {
      setAvailableTeachers([]);
      return;
    }

    const selectedSubjectId = parseInt(subjectId);
    
    // Находим связи для выбранного предмета
    const subjectRelations = teacherSubjects.filter(ts => ts.idSubject === selectedSubjectId);
    
    // Получаем ID преподавателей для этого предмета (исправленная версия)
    const teacherIdsSet = new Set<number>();
    subjectRelations.forEach(ts => {
      if (ts.idTeacher) {
        teacherIdsSet.add(ts.idTeacher);
      }
    });
    const teacherIds = Array.from(teacherIdsSet);
    
    // Фильтруем преподавателей
    const filteredTeachers = teachers.filter(teacher => teacherIds.includes(teacher.id));
    
    setAvailableTeachers(filteredTeachers);
  };

  // Функции для работы с модальным окном
  const openModal = () => setIsModalOpen(true);
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
      fullNameGenitive: ''
    });
    setAvailableTeachers([]);
  };

  // Обработчик изменения полей формы
  const handleInputChange = (field: keyof FormData, value: string) => {
    if (field === 'subject') {
      handleSubjectChange(value);
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
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

  // Исправленная функция загрузки документа в компоненте
  const uploadDocumentToServer = async (blob: Blob, fileName: string) => {
    if (!user || !isStudent) return;

    try {
      const student = user as any;
      const file = new File([blob], fileName, { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });

      // Загружаем документ и получаем ответ
      const uploadResponse = await apiService.uploadDocument(file, student.id, selectedDocumentType);
      console.log('Upload response:', uploadResponse);

      // Ждем немного перед обновлением списка (серверу нужно время на обработку)
      setTimeout(async () => {
        try {
          let studentDocuments: Document[] = [];

          if (selectedDocumentType === 'Все документы') {
            studentDocuments = await apiService.fetchDocumentsByStudent(student.id);
          } else {
            studentDocuments = await apiService.getStudentDocumentsByType(student.id, selectedDocumentType);
          }
          
          setDocuments(studentDocuments);
          setError(null);
          console.log('Documents list updated after upload');
          
        } catch (refreshError) {
          console.error('Error refreshing documents:', refreshError);
          setError('Документ создан, но не удалось обновить список');
        }
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
  const handleCreateDocument = () => {
    if (!userData) {
      setError('Данные пользователя не загружены');
      return;
    }

    // Проверка обязательных полей
    if (!formData.documentTitle.trim()) {
      setError('Пожалуйста, введите название документа');
      return;
    }

    // Проверка телефона только для определенных типов документов
    if (isPhoneRequired() && !formData.phone.trim()) {
      setError('Пожалуйста, введите номер телефона');
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
        // Находим выбранный предмет и преподавателя
        const selectedSubject = subjects.find(s => s.id === parseInt(formData.subject));
        const selectedTeacher = teachers.find(t => t.id === parseInt(formData.teacher));
        
        if (!selectedSubject || !selectedTeacher) {
          setError('Не удалось найти выбранный предмет или преподавателя');
          return;
        }
        
        // Преобразуем ФИО преподавателя в родительный падеж
        const teacherFullName = `${selectedTeacher.lastName} ${selectedTeacher.name} ${selectedTeacher.patronymic}`;
        const teacherGenitive = getGenitiveCase(teacherFullName);
        
        templateUrl = '/templates/lateness_explanation_template.docx';
        fileName = `${formData.documentTitle.replace(/\s+/g, '_')}.docx`;
        templateData = {
          fullNameGenitive: formData.fullNameGenitive,
          fullName: userData.fullName,
          group: userData.group,
          course: userData.course,
          subject: selectedSubject.subjectName,
          teacher: teacherGenitive, // Используем ФИО в родительном падеже
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
      
      // Можно добавить уведомление об успешном скачивании
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
        setDocuments(prev => prev.filter(doc => doc.id !== id));
        setError(null);
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
              {/* Общая информация */}
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
                    <label>ФИО студента (родительный падеж) *</label>
                    <input 
                      type="text" 
                      value={formData.fullNameGenitive}
                      onChange={(e) => handleInputChange('fullNameGenitive', e.target.value)}
                      className="ds-input"
                      placeholder="Введите ФИО в родительном падеже"
                      required
                    />
                    <div style={{fontSize: '12px', color: '#666', marginTop: '4px'}}>
                      Пример: Иванова Ивана Ивановича
                    </div>
                  </div>
                  <div className="ds-form-field">
                    <label>Группа</label>
                    <input type="text" value={userData.group} disabled className="ds-input disabled" />
                  </div>
                  <div className="ds-form-field">
                    <label>Курс</label>
                    <input type="text" value={userData.course} disabled className="ds-input disabled" />
                  </div>
                </div>
              </div>

              {/* Телефон - обязательное поле только для первых двух документов */}
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

              {/* Специфичные поля для разных типов документов */}
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

              {/* Поля для объяснительной записки о причинах опоздания */}
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

              {/* Поля для объяснительной записки о причинах пропусков занятия */}
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

  const filteredDocuments = selectedDocumentType === 'Все документы' 
    ? documents 
    : documents.filter(doc => doc.type === selectedDocumentType);

  if (!userData) {
    return (
      <div className="ds-loading">
        <div className="ds-loading-spinner"></div>
        <p>Загрузка документов...</p>
      </div>
    );
  }
  return (
    <div className="document-section">
      <div className="ds-header">
        <div className="ds-controls">
          <div className="ds-filter-section">
            <label htmlFor="document-type" className="ds-filter-label">Тип документа:</label>
            <select 
              id="document-type"
              value={selectedDocumentType}
              onChange={(e) => setSelectedDocumentType(e.target.value)}
              className="ds-select"
            >
              {documentTypes.map((type, index) => (
                <option key={index} value={type}>{type}</option>
              ))}
            </select>
          </div>
          
          <button 
            className="ds-create-main-btn"
            onClick={openModal}
            disabled={selectedDocumentType === 'Все документы'}
          >
            Создать документ
          </button>
        </div>
      </div>

      {error && <div className="ds-error-message">{error}</div>}

      <div className="ds-content">
        {filteredDocuments.length > 0 ? (
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
              {filteredDocuments.map((document, index) => (
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
                      >
                        Скачать
                      </button>
                      <button 
                        className="ds-delete-btn"
                        onClick={() => handleDeleteDocument(document.id)}
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