import { cacheService } from './cacheService';
import { CACHE_TTL } from './cacheConstants';
const API_BASE_URL = 'http://localhost:8080/api/v1';

export interface GroupData {
  id: number;
  numberGroup: number;
  admissionYear: number;
  idCurator: number;
  course: number;
  formEducation: string;
  profile: string;
  specialty: string;
}

export interface TeacherData {
  id: number;
  name: string;
  patronymic: string;
  lastName: string;
  login: string;
  password: string;
  email?: string;
}

export interface StudentData {
  id: number;
  lastName: string;
  name: string;
  patronymic: string;
  lastNameGenitive?: string | null;
  nameGenitive?: string | null;
  patronymicGenitive?: string | null;
  idGroup: number;
  login: string;
  password: string;
  telephone?: string;
  birthDate?: string;
  address?: string;
  email?: string;
  numberGroup?: number;
}

// Интерфейсы для успеваемости
export interface StudentMark {
  nameSubjectTeachersDTO: {
    idSt: number;
    idSubject: number;
    nameSubject: string;
    teachers: Array<{
      idTeacher: number;
      lastnameTeacher: string;
      nameTeacher: string;
      patronymicTeacher: string;
    }>;
  };
  marksBySt: Array<{
    number: number | null;
    value: number | null;
  }> | null;
  certification: number | null; 
}

export interface Grade {
  id: number;
  subject: string;
  grades: number[];
  average: number;
  examGrade: number | null;
  gradeDetails?: GradeDetail[];
  teacher: string;
}

export interface GradeDetail {
  id: number;
  date: string;
  topic: string;
  grade: number;
  teacher: string;
  type: string;
  hasValue: boolean;
}

export interface SubjectMark {
  number: number;
  value: number;
  comment: string | null;
  typeMark: string;
  dateLesson: string | null;
}

export interface TeacherSubject {
  idTeacher: number;
  idSubject: number;
  subjectName: string;
  idGroups: number[];
}

export interface MarkInfo {
  value: number | null;
  dateLesson: string;
  typeMark: string; 
  lastNameTeacher: string;
  nameTeacher: string;
  patronymicTeacher: string;
  idSupplement: number | null;
  comment: string | null;
  files: Array<{
    id: number;
    name: string;
  }> | null;
  numberWeek: number;
  dayWeek: string;
  typeWeek: string;
  numPair: number;
  replacement: boolean;
  changes: MarkChange[];
}

export interface Lesson {
  id: number;
  idSchedule: number;
  numberWeek: number;
  idSupplement: number | null;
  date: string;
}

export interface Supplement {
  id: number;
  comment: string | null;
  files: Array<{
    id: number;
    name: string;
  }> | null;
}

export interface MarkChange {
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
  newValue: number | null;
  isPending?: boolean;
}


export interface Document {
  id: number;
  nameFile: string;
  pathToFile: string;
  idStudent: number | null;
  accessTeacher: any;
  staffs: any[];
  title?: string;
  type?: string;
  creationDate?: string;
  studentId?: number;
}

export interface UploadDocumentResponse {
  id: number;
  nameFile: string;
  pathToFile: string;
  message: string;
}

export interface MarkColumnInfo {
  dateLesson: string;
  typeMark: string;
  numberWeek: number;
  dayWeek: string;
  typeWeek: string;
  numPair: number;
  replacement: boolean;
  idSupplement: number | null;
  comment: string | null;
  files: Array<{
    id: number;
    name: string;
  }> | null;
  lastNameTeacher?: string;
  nameTeacher?: string;
  patronymicTeacher?: string;
}


export interface SubjectAttendance {
  nameSubjectTeachersDTO: {
    idSt: number;
    idSubject: number;
    nameSubject: string;
    teachers: Array<{
      idTeacher: number;
      lastnameTeacher: string;
      nameTeacher: string;
      patronymicTeacher: string;
    }>;
  };
  attendances: Array<{
    idLesson: number;
    date: string;
    status: 'п' | 'у' | 'н' | null;
    comment: string | null;
  }>;
}

export interface LessonAttendance {
  idLesson: number;
  idTeacher: number;
  status: 'п' | 'у' | 'н';
  comment: string;
}

export interface UpdatePasswordRequest {
  id: number;
  login: string;
  password: string;
}


export const apiService = {

  // Смена пароля студента
  async updateStudentPassword(
    studentId: number, 
    login: string, 
    newPassword: string
  ): Promise<void> {
    const requestBody: UpdatePasswordRequest = {
      id: studentId,
      login: login,
      password: newPassword
    };

    const response = await fetch(`${API_BASE_URL}/students/update`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PATCH request failed:', response.status, errorText);
      throw new Error(`Ошибка смены пароля: ${response.status}`);
    }

    // Инвалидируем кэш данных студента после смены пароля
    const studentCacheKey = `student_${studentId}`;
    cacheService.remove(studentCacheKey);
    
    console.log('Пароль успешно обновлен');
  }, 
  
  
// Получение данных группы по ID с кэшированием
  async getGroupData(groupId: number): Promise<GroupData> {
    const cacheKey = `group_${groupId}`;
    
    const cached = cacheService.get<GroupData>(cacheKey, { ttl: CACHE_TTL.GROUP_DATA });
    if (cached) {
      return cached;
    }
    const response = await fetch(`${API_BASE_URL}/groups/id/${groupId}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      throw new Error(`Ошибка загрузки данных группы: ${response.status}`);
    }
    
    const data: GroupData = await response.json();
    
    cacheService.set(cacheKey, data, { ttl: CACHE_TTL.GROUP_DATA });
    
    return data;
  },

  // Получение данных преподавателя с кэшированием
  async getTeacherData(teacherId: number): Promise<TeacherData> {
    const cacheKey = `teacher_${teacherId}`;
    
    const cached = cacheService.get<TeacherData>(cacheKey, { ttl: 60 * 60 * 1000 }); // 1 час
    if (cached) {
      return cached;
    }
    const response = await fetch(`${API_BASE_URL}/staffs/id/${teacherId}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      throw new Error(`Ошибка загрузки данных преподавателя: ${response.status}`);
    }
    
    const data: TeacherData = await response.json();
    
    cacheService.set(cacheKey, data, { ttl: 60 * 60 * 1000 });
    
    return data;
  },

  // Получение предмета по ID с кэшированием
  async getSubjectById(subjectId: number): Promise<any> {
    const cacheKey = `subject_${subjectId}`;
    
    const cached = cacheService.get<any>(cacheKey, { ttl: 60 * 60 * 1000 }); // 1 час
    if (cached) {
      return cached;
    }
    const response = await fetch(`${API_BASE_URL}/subjects/id/${subjectId}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      throw new Error(`Ошибка загрузки данных предмета: ${response.status}`);
    }
    
    const data = await response.json();
    
    cacheService.set(cacheKey, data, { ttl: 60 * 60 * 1000 });
    
    return data;
  },

  // Авторизация студента
  async loginStudent(login: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/students/login/${login}/password/${password}`);
    if (!response.ok) throw new Error('Ошибка авторизации студента');
    const data: StudentData = await response.json();
    
    return {
      ...data,
      userType: 'student' as const,
      numberGroup: 0 // Временное значение, обновляется после получения данных группы
    };
  },

  // Обновление данных студента 
  async updateStudentData(studentId: number, data: Partial<StudentData>) {
    
    const response = await fetch(`${API_BASE_URL}/students/update`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: studentId,
        ...data
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('PATCH request failed:', response.status, errorText);
      throw new Error(`Ошибка обновления данных студента: ${response.status}`);
    }
    
    const result = await response.json();
    return result;
  },


  // === УСПЕВАЕМОСТЬ ===
  // Получение детальной информации об оценке
  async getMarkInfo(studentId: number, stId: number, markNumber: number): Promise<MarkInfo> {
    const response = await fetch(`${API_BASE_URL}/marks/info/mark/student/${studentId}/st/${stId}/number/${markNumber}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      throw new Error(`Ошибка загрузки информации об оценке: ${response.status}`);
    }
    
    const data: MarkInfo = await response.json();
    
    // Если в ответе нет typeMark, попробуем получить его из информации о колонке
    if (!data.typeMark) {
      try {
        const columnInfo = await this.getMarkColumnInfo(studentId, stId, markNumber);
        data.typeMark = columnInfo.typeMark;
      } catch (error) {
        console.warn('Не удалось получить тип работы из информации о колонке:', error);
        data.typeMark = 'Работа'; // Значение по умолчанию
      }
    }
    
    return data;
  },

  // Получение списка уроков
  async getLessons(): Promise<Lesson[]> {
    const response = await fetch(`${API_BASE_URL}/lessons`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      throw new Error(`Ошибка загрузки списка уроков: ${response.status}`);
    }
    
    const data: Lesson[] = await response.json();
    return data;
  },

  // Добавление supplement к уроку
  async addSupplementToLesson(lessonId: number, comment: string, files?: File[]): Promise<void> {
    
    const formData = new FormData();
    formData.append('comment', comment);
    
    if (files) {
      files.forEach(file => {
        formData.append('files', file);
      });
    }

    const response = await fetch(`${API_BASE_URL}/lessons/add/supplement/id/${lessonId}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка добавления supplement: ${response.status} - ${errorText}`);
    }
  },

  // Получение детальной информации об оценке (колонке)
  async getMarkColumnInfo(studentId: number, stId: number, markNumber: number): Promise<MarkColumnInfo> {
    const response = await fetch(`${API_BASE_URL}/marks/info/column/student/${studentId}/st/${stId}/number/${markNumber}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      throw new Error(`Ошибка загрузки информации о колонке оценок: ${response.status}`);
    }
    
    const data: MarkColumnInfo = await response.json();
    return data;
  },

  // Получение информации о supplement
  async getSupplement(supplementId: number): Promise<Supplement> {
    
    // Получаем все supplements и находим нужный по ID
    const response = await fetch(`${API_BASE_URL}/supplements`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      throw new Error(`Ошибка загрузки supplements: ${response.status}`);
    }
    
    const supplements: Supplement[] = await response.json();
    
    // Находим supplement по ID
    const supplement = supplements.find(s => s.id === supplementId);
    
    if (!supplement) {
      console.error(`Supplement with ID ${supplementId} not found`);
      throw new Error(`Supplement с ID ${supplementId} не найден`);
    }
    return supplement;
  },

  // Добавление изменения и получение ID supplement
  async addMarkChangeAndGetSupplementId(
    studentId: number, 
    stId: number, 
    markNumber: number
  ): Promise<number> {
    
    const url = `${API_BASE_URL}/changes/add/student/st/${stId}/student/${studentId}/number/${markNumber}`;
    
    console.log('Making POST request to:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Response error:', response.status, errorText);
      throw new Error(`Ошибка добавления изменения: ${response.status} - ${errorText}`);
    }

    // Получаем ID созданного supplement из ответа
    try {
      const responseData = await response.json();
      console.log('Response data:', responseData);
      
      if (responseData.idSupplement) {
        return responseData.idSupplement;
      }
    } catch (jsonError) {
      console.error('Error parsing JSON response:', jsonError);
    }
    
    // Альтернативный способ - получаем информацию об оценке
    try {
      const markInfoResponse = await fetch(`${API_BASE_URL}/marks/info/column/student/${studentId}/st/${stId}/number/${markNumber}`);
      if (markInfoResponse.ok) {
        const markInfo: MarkInfo = await markInfoResponse.json();
        
        if (markInfo.changes && markInfo.changes.length > 0) {
          const latestChange = markInfo.changes[markInfo.changes.length - 1];
          if (latestChange.idSupplement) {
            return latestChange.idSupplement;
          }
        }
      }
    } catch (error) {
      console.error('Error getting mark info:', error);
    }
    
    throw new Error('Supplement ID не получен после создания изменения');
  },

  // Удаление supplement
  async deleteSupplement(supplementId: number): Promise<void> {
    
    const response = await fetch(`${API_BASE_URL}/supplements/delete/id/${supplementId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка удаления supplement: ${response.status} - ${errorText}`);
    }
  },

  // Скачивание файла supplement
  async downloadSupplementFile(fileId: number, fileName: string): Promise<void> {
    
    try {
      const response = await fetch(`${API_BASE_URL}/supplements/files/id/${fileId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/octet-stream',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Download error:', error);
      throw new Error(`Не удалось скачать файл: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  },

  // Добавление комментария к оценке
  async addMarkComment(
    studentId: number, 
    stId: number, 
    markNumber: number, 
    comment: string, 
    supplementId?: number
  ): Promise<void> {
    
    let url = `${API_BASE_URL}/changes/add/st/${stId}/student/${studentId}/number/${markNumber}?comment=${encodeURIComponent(comment)}`;
    
    if (supplementId) {
      url += `&idSupplement=${supplementId}`;
    }

    const response = await fetch(url, {
      method: 'POST',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка добавления комментария: ${response.status} - ${errorText}`);
    }
  },

  // Загрузка файлов к supplement
  async uploadSupplementFiles(supplementId: number, files: File[]): Promise<void> {
    
    const formData = new FormData();
    files.forEach(file => {
      formData.append('file', file);
    });

    const response = await fetch(`${API_BASE_URL}/supplements/add/files/id/${supplementId}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка загрузки файлов: ${response.status} - ${errorText}`);
    }
  },


  // Создание supplement с комментарием
  async createSupplementWithComment(comment: string, files?: File[]): Promise<number> {
    
    const formData = new FormData();
    formData.append('comment', comment);
    
    if (files) {
      files.forEach(file => {
        formData.append('files', file);
      });
    }

    const response = await fetch(`${API_BASE_URL}/supplements/add`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка создания supplement: ${response.status} - ${errorText}`);
    }

    const supplement = await response.json();
    return supplement.id;
  },
  
  // Добавление изменения (change) с комментарием
  async addMarkChange(
    studentId: number, 
    stId: number, 
    markNumber: number, 
    comment: string
  ): Promise<void> {
    
    const url = `${API_BASE_URL}/changes/add/st/${stId}/student/${studentId}/number/${markNumber}?comment=${encodeURIComponent(comment)}`;

    const response = await fetch(url, {
      method: 'POST',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка добавления изменения: ${response.status} - ${errorText}`);
    }

  },

  // Обновление комментария supplement
  async updateSupplementComment(supplementId: number, comment: string): Promise<void> {
    
    const response = await fetch(`${API_BASE_URL}/supplements/update?id=${supplementId}&comment=${encodeURIComponent(comment)}`, {
      method: 'PATCH',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка обновления комментария: ${response.status} - ${errorText}`);
    }
  },

  // Получение оценок студента с кэшированием
  async getStudentMarks(studentId: number): Promise<StudentMark[]> {
    const cacheKey = `marks_${studentId}`;
    
    const cached = cacheService.get<StudentMark[]>(cacheKey, { ttl: 10 * 60 * 1000 }); // 10 минут
    if (cached) {
      return cached;
    }
    const response = await fetch(`${API_BASE_URL}/students/marks/id/${studentId}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      throw new Error(`Ошибка загрузки оценок студента: ${response.status}`);
    }
    
    const data: StudentMark[] = await response.json();
    
    cacheService.set(cacheKey, data, { ttl: 10 * 60 * 1000 });
    
    return data;
  },

  // Получение оценок по предмету
  async getSubjectMarks(studentId: number, subjectId: number): Promise<SubjectMark[]> {
    const response = await fetch(`${API_BASE_URL}/marks/student/${studentId}/subject/${subjectId}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      throw new Error(`Ошибка загрузки оценок по предмету: ${response.status}`);
    }
    
    const data: SubjectMark[] = await response.json();
    return data;
  },

  // Получение предметов преподавателя
  async getTeacherSubjects(teacherId: number): Promise<TeacherSubject[]> {
    const response = await fetch(`${API_BASE_URL}/st/teacherGroups/${teacherId}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      throw new Error(`Ошибка загрузки предметов преподавателя: ${response.status}`);
    }
    
    const data: TeacherSubject[] = await response.json();
    return data;
  },

  // === ПОСЕЩАЕМОСТЬ ===

  // Получение посещаемости студента
  async getStudentAttendance(studentId: number, forceRefresh = false): Promise<SubjectAttendance[]> {
    const cacheKey = `attendance_${studentId}`;
    
    // Если принудительное обновление, инвалидируем кэш
    if (forceRefresh) {
      cacheService.remove(cacheKey);
    }
    
    const cached = cacheService.get<SubjectAttendance[]>(cacheKey, { 
      ttl: 10 * 60 * 1000 // 10 минут
    });
    
    if (cached && !forceRefresh) {
      return cached;
    }

    const response = await fetch(`${API_BASE_URL}/attendances/student/${studentId}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      throw new Error(`Ошибка загрузки посещаемости студента: ${response.status}`);
    }
    
    const data: SubjectAttendance[] = await response.json();
    
    cacheService.set(cacheKey, data, { 
      ttl: 10 * 60 * 1000 
    });
    
    return data;
  },
  // Получение посещаемости конкретного урока
  async getLessonAttendance(lessonId: number, studentId: number): Promise<LessonAttendance> {
    const cacheKey = `lesson_attendance_${lessonId}_${studentId}`;
    
    const cached = cacheService.get<LessonAttendance>(cacheKey, { 
      ttl: 10 * 60 * 1000 // 10 минут
    });
    
    if (cached) {
      return cached;
    }

    const response = await fetch(`${API_BASE_URL}/attendances/lesson/${lessonId}/student/${studentId}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      throw new Error(`Ошибка загрузки посещаемости урока: ${response.status}`);
    }
    
    const data: LessonAttendance = await response.json();
    
    cacheService.set(cacheKey, data, { 
      ttl: 10 * 60 * 1000 
    });
    
    return data;
  },

  invalidateAttendanceCache(studentId: number): void {
    const cacheKey = `attendance_${studentId}`;
    cacheService.remove(cacheKey);
    
    // Также инвалидируем кэш уроков
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes(`cache_lesson_attendance_`) && key.includes(`_${studentId}`)) {
        cacheService.remove(key.replace('cache_', ''));
      }
    }
  },

  // === ДОКУМЕНТЫ ===

  // Получение всех документов с кэшированием
  async getAllDocuments(): Promise<Document[]> {
    const cacheKey = 'all_documents';
    
    const cached = cacheService.get<Document[]>(cacheKey, { 
      ttl: CACHE_TTL.DOCUMENTS
    });
    
    if (cached) {
      return cached;
    }

    const response = await fetch(`${API_BASE_URL}/paths`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка загрузки документов: ${response.status}`);
    }
    
    const data: Document[] = await response.json();
    
    cacheService.set(cacheKey, data, { 
      ttl: CACHE_TTL.DOCUMENTS
    });
    
    return data;
  },

  // Получение документов студента с кэшированием
  async fetchDocumentsByStudent(studentId: number): Promise<Document[]> {
    const cacheKey = `student_documents_${studentId}`;
    
    const cached = cacheService.get<Document[]>(cacheKey, { 
      ttl: CACHE_TTL.DOCUMENTS
    });
    
    if (cached) {
      return cached;
    }

    const allDocuments = await this.getAllDocuments();
    
    // Фильтрование документов студента
    const studentDocuments = allDocuments.filter(doc => 
      doc.idStudent === studentId || doc.studentId === studentId
    );
    
    cacheService.set(cacheKey, studentDocuments, { 
      ttl: CACHE_TTL.DOCUMENTS
    });
    
    return studentDocuments;
  },

  // Получение документов студента по типу с кэшированием
  async getStudentDocumentsByType(studentId: number, type: string): Promise<Document[]> {
    const cacheKey = `student_documents_${studentId}_${type.toLowerCase().replace(/\s+/g, '_')}`;
    
    const cached = cacheService.get<Document[]>(cacheKey, { 
      ttl: CACHE_TTL.DOCUMENTS
    });
    
    if (cached) {
      return cached;
    }
    
    try {
      const allStudentDocs = await this.fetchDocumentsByStudent(studentId);
      
      const filteredDocs = allStudentDocs.filter(doc => 
        doc.type?.toLowerCase() === type.toLowerCase()
      );
      
      cacheService.set(cacheKey, filteredDocs, { 
        ttl: CACHE_TTL.DOCUMENTS
      });
      
      return filteredDocs;
      
    } catch (error) {
      console.error(`Error fetching student documents by type:`, error);
      throw error;
    }
  },

  // Функция скачивания документа
  async downloadDocument(id: number): Promise<void> {
    
    try {
      // Получаем информацию о документе
      const allDocuments = await this.getAllDocuments();
      const documentInfo = allDocuments.find((doc: Document) => doc.id === id);
      
      if (!documentInfo) {
        throw new Error(`Документ с ID ${id} не найден`);
      }

      // Скачиваем файл
      const fileResponse = await fetch(`${API_BASE_URL}/paths/id/${id}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/octet-stream',
        },
      });

      if (!fileResponse.ok) {
        throw new Error(`HTTP error! status: ${fileResponse.status}`);
      }

      // Получаем blob
      const blob = await fileResponse.blob();
      
      // Определяем MIME тип и имя файла
      let filename = documentInfo.nameFile;
      let mimeType = 'application/octet-stream';

      // Определяем MIME тип по расширению файла
      if (filename) {
        const extension = filename.split('.').pop()?.toLowerCase();
        const mimeTypes: { [key: string]: string } = {
          'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'doc': 'application/msword',
          'pdf': 'application/pdf',
          'png': 'image/png',
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'txt': 'text/plain',
        };
        
        // проверяем что extension не undefined
        if (extension && mimeTypes[extension]) {
          mimeType = mimeTypes[extension];
        } else {
          mimeType = 'application/octet-stream';
        }
      }

      // Создаем blob с правильным типом
      const typedBlob = new Blob([blob], { type: mimeType });

      // Создаем ссылку для скачивания
      const url = window.URL.createObjectURL(typedBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `document_${id}`;
      
      // Добавляем в DOM и кликаем
      document.body.appendChild(link);
      link.click();
      
      // Очистка
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Download error:', error);
      throw new Error(`Не удалось скачать документ: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  },

  // Загрузка документа на сервер с инвалидацией кэша
  async uploadDocument(file: File, studentId: number, documentType?: string): Promise<void> {
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('student', studentId.toString());
    
    if (documentType) {
      formData.append('type', documentType);
    }

    const response = await fetch(`${API_BASE_URL}/paths/upload`, {
      method: 'PUT',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка загрузки документа: ${response.status} - ${errorText}`);
    }
    
    // Инвалидируем кэш после загрузки
    this.invalidateDocumentCache(studentId, documentType);
  },
  async getStudentData(studentId: number): Promise<StudentData> {
    const response = await fetch(`${API_BASE_URL}/students/id/${studentId}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка загрузки данных студента: ${response.status}`);
    }
    
    const data: StudentData = await response.json();
    return data;
  },

  // Удаление документа с инвалидацией кэша
  async deleteDocument(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/paths/delete/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка удаления документа: ${response.status}`);
    }
    
    // Инвалидируем весь кэш документов, так как не знаем studentId
    this.invalidateAllDocumentCache();
  },

  // Получение файла по ID
  async getFileById(fileId: number): Promise<Blob> {
    
    const response = await fetch(`${API_BASE_URL}/paths/id/${fileId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/octet-stream',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      throw new Error(`Ошибка загрузки файла: ${response.status}`);
    }

    const blob = await response.blob();
    return blob;
  },

  // Скачивание файла по ID с именем
  async downloadFileById(fileId: number, fileName: string): Promise<void> {
    try {
      const blob = await this.getFileById(fileId);
      
      // Определяем MIME тип по расширению файла
      let mimeType = 'application/octet-stream';
      if (fileName) {
        const extension = fileName.split('.').pop()?.toLowerCase();
        const mimeTypes: { [key: string]: string } = {
          'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'doc': 'application/msword',
          'pdf': 'application/pdf',
          'png': 'image/png',
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'txt': 'text/plain',
        };
        
        if (extension && mimeTypes[extension]) {
          mimeType = mimeTypes[extension];
        }
      }

      // Создаем blob с правильным типом
      const typedBlob = new Blob([blob], { type: mimeType });

      // Создаем ссылку для скачивания
      const url = window.URL.createObjectURL(typedBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || `file_${fileId}`;
      
      // Добавляем в DOM и кликаем
      document.body.appendChild(link);
      link.click();
      
      // Очистка
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Download error:', error);
      throw new Error(`Не удалось скачать файл: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  },

  // Получение информации о файле по ID
  async getFileInfo(fileId: number): Promise<Document> {
    
    const allDocuments = await this.getAllDocuments();
    const fileInfo = allDocuments.find(doc => doc.id === fileId);
    
    if (!fileInfo) {
      throw new Error(`Файл с ID ${fileId} не найден`);
    }
    
    return fileInfo;
  },

  // Методы для инвалидации кэша
  invalidateDocumentCache(studentId?: number, documentType?: string): void {
    // Удаляем все связанные ключи кэша
    const keysToRemove: string[] = [];
    
    if (studentId && documentType) {
      keysToRemove.push(`student_documents_${studentId}_${documentType.toLowerCase().replace(/\s+/g, '_')}`);
    }
    
    if (studentId) {
      keysToRemove.push(`student_documents_${studentId}`);
    }
    
    // Всегда инвалидируем общий кэш документов
    keysToRemove.push('all_documents');
    
    keysToRemove.forEach(key => {
      cacheService.remove(key);
    });
  },

  invalidateAllDocumentCache(): void {
    // Удаляем все ключи, связанные с документами
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.includes('cache_all_documents') ||
        key.includes('cache_student_documents_')
      )) {
        keysToRemove.push(key.replace('cache_', ''));
      }
    }
    
    keysToRemove.forEach(key => {
      cacheService.remove(key);
    });
  },

  
  
}
export const calculateOverallAttendancePercentage = (attendanceData: SubjectAttendance[]): number => {
  if (!attendanceData || attendanceData.length === 0) {
    return 0;
  }

  let totalPresent = 0;
  let totalLessons = 0;

  attendanceData.forEach(subject => {
    // Учитываем только занятия с выставленными статусами (не null)
    const validAttendances = subject.attendances.filter(a => a.status !== null);
    
    validAttendances.forEach(attendance => {
      totalLessons++;
      if (attendance.status === 'п') {
        totalPresent++;
      }
    });
  });

  return totalLessons > 0 ? parseFloat(((totalPresent / totalLessons) * 100).toFixed(1)) : 0;
};