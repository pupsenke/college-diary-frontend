import { cacheService } from './cacheService';
import { CACHE_TTL } from './cacheConstants';

const API_BASE_URL = 'http://localhost:8080/api/v1';

const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 8000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    clearTimeout(id);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    clearTimeout(id);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Превышено время ожидания ответа от сервера');
      }
    }
    
    throw error;
  }
};

// Базовые интерфейсы
export interface StaffApiResponse {
  id: number;
  patronymic: string;
  name: string;
  lastName: string;
  login: string;
  password: string;
  email: string | null;
  staffPosition: Array<{
    id: number;
    name: string;
  }>;
}

export interface TeacherSubject {
  idTeacher: number;
  idSubject: number;
  subjectName: string;
  idGroups: number[];
}

export interface TeacherData {
  firstName: string;
  lastName: string;
  middleName: string;
  email: string;
  position: string;
  disciplines: string[];
  teacherId?: number;
  login?: string;
}

export interface PasswordChangeData {
  newPassword: string;
  confirmPassword: string;
}

export interface LoginChangeData {
  currentPassword?: string;
  newLogin: string;
  confirmNewLogin: string;
}

interface Discipline {
  idTeacher: number;
  idSubject: number;
  subjectName: string;
  course: number;
  countGroup: number;
}

export interface Group {
  numberGroup: string;
  specialty: string;
  subjectName: string;
  countStudent: number;
  course?: number;
}

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

export interface StudentsResponse {
  students: Student[];
}

export interface LessonInfo {
  idSupplement?: number;
  value?: number;
  number: number;
  dateLesson: string;
  typeMark: string;
  lastNameTeacher: string;
  nameTeacher: string;
  patronymicTeacher: string;
  comment: string;
  files: Array<{
    id: number;
    name: string;
  }>;
  numberWeek: number;
  dayWeek: string;
  typeWeek: string;
  numPair: number;
  replacement: boolean;
  changes?: ChangeHistory[];
}

export interface LessonDate {
  number: number;
  date: string;
  lessonInfo?: Pick<LessonInfo, 'idSupplement' | 'numberWeek' | 'dayWeek' | 'typeWeek' | 'numPair' | 'replacement'>;
}

export interface SubjectTeacherData {
  id: number;
  teachers: number[];
  idSubject: number;
  groups: number[];
  subjectName?: string;
}

export interface Subject {
  id: number;
  subjectName: string;
}

export interface UpdateMarkRequest {
  idTeacher: number;
  idGroup: number;
  idStudent: number;
  idSt: number;
  number: number;
  idTypeMark: number;
}

export interface ApiLessonType {
  id: number;
  idSt: number;
  name: string;
  weight: number;
}

export interface StData {
  id: number;
  teachers: number[];
  idSubject: number;
  groups: number[];
}

export interface AddDateColumnRequest {
  idGroup: number;
  idSt: number;
  idLesson: number;
  idTeacher: number;
}

export interface DeleteDateColumnRequest {
  idGroup: number;
  idSt: number;
  idTeacher: number;
  number: number;
}

export interface CreateSupplementRequest {
  idTypeMark: number;
  comment: string;
  idStudent: number;
  idSt: number;
  number: number;
  idTeacher: number;
}

export interface UpdateMarkGradeRequest {
  idStudent: number;
  idSt: number;
  mark: number;
  number: number;
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

export interface FileUploadResponse {
  success: boolean;
  fileUrls?: string[];
  fileIds?: number[];
  message?: string;
}

export interface SubgroupTeacherInfo {
  subgroup: 'I' | 'II';
  teacherId: number;
  teacherName: string;
  teacherFullName: string;
}

export interface GroupSubgroupTeachers {
  groupId: number;
  subjectId: number;
  subgroups: SubgroupTeacherInfo[];
}

export interface SubgroupData {
  id: number;
  idSt: number;
  idTeacher: number;
  students: number[];
}

export interface SubgroupAddStudentsRequest {
  id: number;
  students: number[];
}

export interface SubgroupDeleteStudentsRequest {
  idTeacher: number;
  idSt: number;
  students: number[];
}

export interface AttendanceRecord {
  idStudent: number;
  lastName: string;
  name: string;
  patronymic: string;
  subgroup?: 'I' | 'II';
  attendances: Array<{
    idLesson: number;
    date: string;
    status: string | null;
    comment: string | null;
  }>;
}

export interface AttendanceStatus {
  idLesson: number;
  idTeacher: number;
  status: string;
  comment: string | null;
}

export interface UpdateAttendanceRequest {
  idLesson: number;
  idTeacher: number;
  status: string;
  comment: string;
  idStudent: number;
}

// НОВЫЙ МЕТОД ДЛЯ ПОЛУЧЕНИЯ ТИПОВ ЗАНЯТИЙ ПО SUPPLEMENT ID
export interface SupplementInfo {
  id: number;
  comment: string;
  typeMark?: string;
  // другие поля если нужны
}

export const teacherApiService = {
  // Получение всех сотрудников с кэшированием
  async getAllStaff(): Promise<StaffApiResponse[]> {
    const cacheKey = 'all_staff';
    
    const cached = cacheService.get<StaffApiResponse[]>(cacheKey, { 
      ttl: CACHE_TTL.TEACHER_DATA 
    });
    
    if (cached) {
      return cached;
    }

    const response = await fetch(`${API_BASE_URL}/staffs`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      throw new Error(`Ошибка загрузки данных персонала: ${response.status}`);
    }

    const data: StaffApiResponse[] = await response.json();
    
    cacheService.set(cacheKey, data, { 
      ttl: CACHE_TTL.TEACHER_DATA 
    });
    
    return data;
  },

  async refreshAllTeacherData(teacherId: number) {
    const keysToRemove = [
      `teacher_${teacherId}`,
      `teacher_disciplines_${teacherId}`,
      `teacher_disciplines_full_${teacherId}`,
      `teacher_groups_${teacherId}`
    ];
    
    keysToRemove.forEach(key => {
      cacheService.remove(key);
    });

    const [teacherData, disciplines, groups] = await Promise.all([
      this.getTeacherById(teacherId),
      this.getTeacherDisciplines(teacherId),
      this.getTeacherGroups(teacherId)
    ]);

    return {
      teacherData,
      disciplines,
      groups
    };
  },

  // Получение данных преподавателя по ID с кэшированием
  async getTeacherById(teacherId: number): Promise<StaffApiResponse> {
    const cacheKey = `teacher_${teacherId}`;
    
    const cached = cacheService.get<StaffApiResponse>(cacheKey, { 
      ttl: CACHE_TTL.TEACHER_DATA 
    });
    
    if (cached) {
      return cached;
    }

    const response = await fetch(`${API_BASE_URL}/staffs/id/${teacherId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      throw new Error(`Ошибка загрузки данных преподавателя: ${response.status}`);
    }

    const data: StaffApiResponse = await response.json();
    
    cacheService.set(cacheKey, data, { 
      ttl: CACHE_TTL.TEACHER_DATA 
    });
    
    return data;
  },

  // Получение дисциплин преподавателя с кэшированием
  async getTeacherDisciplines(teacherId: number): Promise<string[]> {
    const cacheKey = `teacher_disciplines_${teacherId}`;
    
    const cached = cacheService.get<string[]>(cacheKey, { 
      ttl: CACHE_TTL.TEACHER_DISCIPLINES
    });
    
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/st/teacherGroups/${teacherId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Ошибка при получении дисциплин: ${response.status}`);
      }

      const disciplinesData: TeacherSubject[] = await response.json();

      const allDisciplineNames = disciplinesData.map(item => item.subjectName);
      const uniqueDisciplineNames = Array.from(new Set(allDisciplineNames));
            
      cacheService.set(cacheKey, uniqueDisciplineNames, { 
        ttl: CACHE_TTL.TEACHER_DISCIPLINES 
      });
      
      return uniqueDisciplineNames;
    } catch (err) {
      console.error('Ошибка при загрузке дисциплин преподавателя:', err);
      throw err;
    }
  },

  // Получение полных данных дисциплин преподавателя
  async getTeacherDisciplinesFull(teacherId: number): Promise<Discipline[]> {
    const cacheKey = `teacher_disciplines_full_${teacherId}`;
    
    const cached = cacheService.get<Discipline[]>(cacheKey, { 
      ttl: CACHE_TTL.TEACHER_DISCIPLINES 
    });
    
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(`http://localhost:8080/api/v1/staffs/subjects/course/${teacherId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      cacheService.set(cacheKey, data, { 
        ttl: CACHE_TTL.TEACHER_DISCIPLINES 
      });
      
      return data;
    } catch (error) {
      console.error('Error fetching teacher disciplines:', error);
      throw error;
    }
  },

  // Получение групп преподавателя
  async getTeacherGroups(teacherId: number): Promise<Group[]> {
    const cacheKey = `teacher_groups_${teacherId}`;
    
    const cached = cacheService.get<Group[]>(cacheKey, { 
      ttl: CACHE_TTL.GROUP_DATA 
    });
    
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(`http://localhost:8080/api/v1/staffs/subjects/group/${teacherId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      cacheService.set(cacheKey, data, { 
        ttl: CACHE_TTL.GROUP_DATA 
      });
      
      return data;
    } catch (error) {
      console.error('Error fetching teacher groups:', error);
      throw error;
    }
  },

  async getGroupByNumber(groupNumber: string): Promise<any> {
    const cacheKey = `group_info_${groupNumber}`;
    
    const cached = cacheService.get<any>(cacheKey, { 
      ttl: CACHE_TTL.GROUP_DATA 
    });
    
    if (cached) {
      return cached;
    }

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/groups/number/${groupNumber}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // API возвращает массив, берем первый элемент
      const groupInfo = Array.isArray(data) ? data[0] : data;
      
      cacheService.set(cacheKey, groupInfo, { 
        ttl: CACHE_TTL.GROUP_DATA 
      });
      
      return groupInfo;
    } catch (error) {
      console.error(`Error fetching group ${groupNumber} info:`, error);
      return null;
    }
  },

  async getGroupById(groupId: number): Promise<any> {
    const cacheKey = `group_info_id_${groupId}`;
    
    const cached = cacheService.get<any>(cacheKey, { 
      ttl: CACHE_TTL.GROUP_DATA 
    });
    
    if (cached) {
      return cached;
    }

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/groups/id/${groupId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const groupInfo = await response.json();
      
      cacheService.set(cacheKey, groupInfo, { 
        ttl: CACHE_TTL.GROUP_DATA 
      });
      
      return groupInfo;
    } catch (error) {
      console.error(`Error fetching group ID ${groupId} info:`, error);
      return null;
    }
  },

  // Получение дисциплин по курсам
  async getTeacherDisciplinesByCourse(teacherId: number): Promise<Discipline[]> {
    const cacheKey = `teacher_disciplines_course_${teacherId}`;
    
    const cached = cacheService.get<Discipline[]>(cacheKey, { 
      ttl: CACHE_TTL.TEACHER_DISCIPLINES 
    });
    
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(`http://localhost:8080/api/v1/staffs/subjects/course/${teacherId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      cacheService.set(cacheKey, data, { 
        ttl: CACHE_TTL.TEACHER_DISCIPLINES 
      });
      
      return data;
    } catch (error) {
      throw error;
    }
  },

  // Получение дисциплин по семестрам
  async getTeacherDisciplinesBySemester(teacherId: number, semester: number): Promise<Discipline[]> {
    const cacheKey = `teacher_disciplines_semester_${teacherId}_${semester}`;
    
    const cached = cacheService.get<Discipline[]>(cacheKey, { 
      ttl: CACHE_TTL.TEACHER_DISCIPLINES 
    });
    
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(`http://localhost:8080/api/v1/staffs/subjects/course/${teacherId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      const filteredData = data.filter((discipline: Discipline) => {
        return semester === 1; // Пока возвращаем все данные для первого семестра
      });
      
      cacheService.set(cacheKey, filteredData, { 
        ttl: CACHE_TTL.TEACHER_DISCIPLINES 
      });
      
      return filteredData;
    } catch (error) {
      console.error('Error fetching teacher disciplines by semester:', error);
      throw error;
    }
  },

  // Поиск преподавателя по ФИО
  async findTeacherByName(name: string, lastName: string, patronymic: string): Promise<StaffApiResponse | null> {
    const cacheKey = `teacher_search_${lastName}_${name}_${patronymic}`.toLowerCase();
    
    const cached = cacheService.get<StaffApiResponse>(cacheKey, { 
      ttl: CACHE_TTL.TEACHER_DATA 
    });
    
    if (cached) {
      return cached;
    }

    const allStaff = await this.getAllStaff();
    
    const teacher = allStaff.find(staff => 
      staff.name === name && 
      staff.lastName === lastName &&
      staff.patronymic === patronymic
    );

    if (teacher) {
      cacheService.set(cacheKey, teacher, { 
        ttl: CACHE_TTL.TEACHER_DATA 
      });
    }
    
    return teacher || null;
  },

  async updateTeacherData(teacherId: number, data: Partial<StaffApiResponse>) {
    const response = await fetchWithTimeout(`${API_BASE_URL}/staffs/update`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: teacherId,
        ...data
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Ошибка обновления данных преподавателя: ${response.status}`);
    }
    
    const result = await response.json();
    
    this.invalidateTeacherCache(teacherId);
    
    return result;
  },

  invalidateTeacherCache(teacherId?: number): void {
    const keysToRemove: string[] = ['all_staff'];
    
    if (teacherId) {
      keysToRemove.push(
        `teacher_${teacherId}`,
        `teacher_disciplines_${teacherId}`,
        `teacher_disciplines_full_${teacherId}`,
        `teacher_groups_${teacherId}`,
        `teacher_disciplines_course_${teacherId}`
      );
      
      // Удаляем все связанные ключи поиска и семестров
      for (let i = 1; i <= 2; i++) {
        keysToRemove.push(`teacher_disciplines_semester_${teacherId}_${i}`);
      }
      
      // Удаляем ключи поиска по имени
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('cache_teacher_search_')) {
          keysToRemove.push(key.replace('cache_', ''));
        }
      }
    }
    
    keysToRemove.forEach(key => {
      cacheService.remove(key);
    });
  },

  // Принудительное обновление данных с инвалидацией кэша
  async refreshTeacherData(teacherId: number) {
    this.invalidateTeacherCache(teacherId);
    
    // Загружаем свежие данные
    const [teacherData, disciplines] = await Promise.all([
      this.getTeacherById(teacherId),
      this.getTeacherDisciplines(teacherId)
    ]);
    
    return {
      teacherData,
      disciplines
    };
  },

  // Метод для получения студентов группы с кэшированием
  async getGroupStudents(groupId: number, idSt: number, idTeacher: number): Promise<Student[]> {
    if (!idTeacher) {
      throw new Error('Teacher ID not found in localStorage');
    }

    const cacheKey = `group_students_${groupId}_${idSt}_${idTeacher}`;

    // Попробуем сначала получить из кэша
    const cached = cacheService.get<Student[]>(cacheKey, { 
      ttl: CACHE_TTL.STUDENT_DATA 
    });
    
    if (cached) {
      return cached;
    }

    try {
      
      // Формируем URL с правильными параметрами как в Postman
      const url = `${API_BASE_URL}/groups/marks/group?idGroup=${groupId}&idSt=${idSt}&idTeacher=${idTeacher}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const students = await response.json();
      
      // Сортируем студентов по фамилии от А до Я
      const sortedStudents = students.sort((a: Student, b: Student) => 
        a.lastName.localeCompare(b.lastName)
      );
            
      cacheService.set(cacheKey, sortedStudents, { 
        ttl: CACHE_TTL.STUDENT_DATA 
      });
      
      return sortedStudents;
    } catch (error) {
      console.error('Error fetching group students:', error);
      throw error;
    }
  },

  // Метод для получения студентов группы без использования кэша
  async getGroupStudentsWithoutCache(groupId: number, idSt: number, idTeacher: number): Promise<Student[]> {
    try {
      // Формируем URL с правильными параметрами как в Postman
      const url = `${API_BASE_URL}/groups/marks/group?idGroup=${groupId}&idSt=${idSt}&idTeacher=${idTeacher}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const students = await response.json();
      
      // Сортируем студентов по фамилии от А до Я
      const sortedStudents = students.sort((a: Student, b: Student) => 
        a.lastName.localeCompare(b.lastName)
      );
            
      return sortedStudents;
    } catch (error) {
      console.error('Error fetching group students:', error);
      throw error;
    }
  },

  // Функция для инвалидации кэша студентов
  invalidateStudentCache(groupId?: number, idSt?: number, idTeacher?: number): void {
    if (groupId && idSt && idTeacher) {
      // Удаляем конкретный ключ
      cacheService.remove(`group_students_${groupId}_${idSt}_${idTeacher}`);
    } else {
      // Удаляем все кэши студентов
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('cache_group_students_')) {
          keysToRemove.push(key.replace('cache_', ''));
        }
      }
      
      keysToRemove.forEach(key => {
        cacheService.remove(key);
      });
    }
  },

  // Смена пароля - без проверки текущего пароля
  async changePassword(teacherId: number, passwordData: PasswordChangeData): Promise<{ success: boolean }> {
    try {      
      const response = await fetchWithTimeout(`${API_BASE_URL}/staffs/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: teacherId,
          password: passwordData.newPassword
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Password change failed: ${response.status}`, errorText);
        throw new Error(`Ошибка смены пароля: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Инвалидируем кэш
      this.invalidateTeacherCache(teacherId);
      
      return { success: true };
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  },

  // метод для проверки логинов
  async checkExistingLogins(): Promise<string[]> {
    try {
      const allStaff = await this.getAllStaff();
      return allStaff.map(staff => staff.login).filter(login => login);
    } catch (error) {
      console.error('Error fetching existing logins:', error);
      return [];
    }
  },

  // И метод проверки доступности логина
  async isLoginAvailable(newLogin: string): Promise<{ available: boolean; message?: string }> {
    try {
      
      if (!newLogin || newLogin.trim().length < 3) {
        return { 
          available: false, 
          message: 'Логин должен содержать минимум 3 символа' 
        };
      }
      
      const loginRegex = /^[a-zA-Z0-9._-]+$/;
      if (!loginRegex.test(newLogin)) {
        return { 
          available: false, 
          message: 'Логин может содержать только латинские буквы, цифры и символы ._-' 
        };
      }
      
      const existingLogins = await this.checkExistingLogins();
      const isAvailable = !existingLogins.includes(newLogin.trim());
            
      return {
        available: isAvailable,
        message: isAvailable ? undefined : 'Этот логин уже занят. Выберите другой логин.'
      };
    } catch (error) {
      console.error('Error checking login availability:', error);
      return { 
        available: false, 
        message: 'Не удалось проверить доступность логина. Попробуйте позже.' 
      };
    }
  },

  // Смена логина без проверки пароля
  async changeLogin(teacherId: number, loginData: LoginChangeData): Promise<{ success: boolean }> {
    try {
      
      // Дополнительная валидация логина
      if (!loginData.newLogin || loginData.newLogin.trim().length < 3) {
        throw new Error('Логин должен содержать минимум 3 символа');
      }
      
      const loginRegex = /^[a-zA-Z0-9._-]+$/;
      if (!loginRegex.test(loginData.newLogin)) {
        throw new Error('Логин может содержать только латинские буквы, цифры и символы ._-');
      }
      
      // Проверяем доступность логина более тщательно
      const availability = await this.isLoginAvailable(loginData.newLogin);
      if (!availability.available) {
        throw new Error(availability.message || 'Этот логин уже занят');
      }
      
      const requestBody = {
        id: teacherId,
        login: loginData.newLogin.trim()
      };
            
      const response = await fetchWithTimeout(`${API_BASE_URL}/staffs/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
            
      if (!response.ok) {
        let errorMessage = 'Не удалось изменить логин';
        
        try {
          const errorText = await response.text();
          console.error('Server error response:', errorText);
          
          // Парсим JSON ошибки если возможно
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: errorText };
          }
          
          switch (response.status) {
            case 400:
              errorMessage = errorData.message || 'Неверный формат данных';
              break;
            case 409:
              errorMessage = errorData.message || 'Этот логин уже занят';
              break;
            case 500:
              errorMessage = errorData.message || 'Внутренняя ошибка сервера. Попробуйте другой логин или обратитесь к администратору.';
              break;
            default:
              errorMessage = errorData.message || `Ошибка сервера: ${response.status}`;
          }
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
          errorMessage = `Ошибка соединения: ${response.status}`;
        }
        
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      
      // Инвалидируем кэш
      this.invalidateTeacherCache(teacherId);
      
      return { success: true };
      
    } catch (error) {
      console.error('Login change process failed:', error);
      
      // Преобразуем AbortError в понятное сообщение
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Превышено время ожидания ответа от сервера. Проверьте подключение к интернету.');
      }
      
      throw error;
    }
  },

  /* Успеваемость */
  // Получение дат занятий - ОПТИМИЗИРОВАННАЯ ВЕРСИЯ
  async getLessonDates(groupId: number, idSt: number): Promise<LessonDate[]> {
    // Получаем teacherId из localStorage
    const teacherId = localStorage.getItem('teacher_id');
    if (!teacherId) {
      throw new Error('Teacher ID not found in localStorage');
    }

    const cacheKey = `lesson_dates_${groupId}_${idSt}_${teacherId}`;
    
    const cached = cacheService.get<LessonDate[]>(cacheKey, { 
      ttl: CACHE_TTL.LESSON_DATES 
    });
    
    if (cached) {
      return cached;
    }

    try {
      
      // Используем правильный endpoint для получения дат
      const response = await fetch(`${API_BASE_URL}/lessons/date/st/${idSt}/group/${groupId}/teacher/${teacherId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const datesData = await response.json();
      
      // не делаем лишних запросов для каждой даты
      const datesWithInfo: LessonDate[] = datesData.map((item: any) => ({
        number: item.number,
        date: item.date,
        lessonInfo: undefined
      }));
            
      cacheService.set(cacheKey, datesWithInfo, { 
        ttl: CACHE_TTL.LESSON_DATES 
      });
      
      return datesWithInfo;
    } catch (error) {
      console.error('Error fetching lesson dates:', error);
      throw error;
    }
  },

  /**
   * Получение информации об оценке с типом занятия
   * ОБЪЕДИНЕННЫЙ МЕТОД - заменяет getMarkInfo и getLessonInfo
   */
  async getLessonInfo(studentId: number, idSt: number, lessonNumber: number): Promise<LessonInfo | null> {
    const cacheKey = `lesson_info_${studentId}_${idSt}_${lessonNumber}`;
    
    const cached = cacheService.get<LessonInfo>(cacheKey, { 
      ttl: CACHE_TTL.LESSON_INFO 
    });
    
    if (cached) {
      return cached;
    }

    try {
      
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/marks/info/mark/student/${studentId}/st/${idSt}/number/${lessonNumber}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const lessonInfo: LessonInfo = await response.json();
      
      cacheService.set(cacheKey, lessonInfo, { 
        ttl: CACHE_TTL.LESSON_INFO 
      });
      
      return lessonInfo;
    } catch (error) {
      console.error('Error fetching lesson info:', error);
      return null;
    }
  },


  // Функция для инвалидации кэша дат занятий
  invalidateLessonDatesCache(groupId?: number, idSt?: number, teacherId?: number): void {
    if (groupId && idSt && teacherId) {
      cacheService.remove(`lesson_dates_${groupId}_${idSt}_${teacherId}`);
    } else {
      // Удаляем все кэши дат занятий
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('cache_lesson_dates_')) {
          cacheService.remove(key.replace('cache_', ''));
        }
      }
    }
  },

  // Функция для инвалидации кэша информации о занятиях
  invalidateLessonInfoCache(studentId?: number, idSt?: number, lessonNumber?: number): void {
    if (studentId && idSt && lessonNumber) {
      cacheService.remove(`lesson_info_${studentId}_${idSt}_${lessonNumber}`);
    } else {
      // Удаляем все кэши информации о занятиях
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('cache_lesson_info_')) {
          cacheService.remove(key.replace('cache_', ''));
        }
      }
    }
  },

  /**
   * Получение информации о занятиях для конкретного ST, группы и преподавателя
   */
  async getLessonsInfo(idSt: number, groupId: number, teacherId: number): Promise<any[]> {
    const cacheKey = `lessons_info_${idSt}_${groupId}_${teacherId}`;
    
    const cached = cacheService.get<any[]>(cacheKey, { 
      ttl: CACHE_TTL.LESSON_DATES 
    });
    
    if (cached) {
      return cached;
    }

    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/lessons/info/st/${idSt}/group/${groupId}/teacher/${teacherId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      cacheService.set(cacheKey, data, { 
        ttl: CACHE_TTL.LESSON_DATES 
      });
      
      return data;
    } catch (error) {
      console.error('Error fetching lessons info:', error);
      throw error;
    }
  },

  /**
   * Создание новой записи supplement
   */
  async createSupplement(
    idTypeMark: number, 
    comment: string,
    studentId: number,
    idSt: number,
    lessonNumber: number
  ): Promise<{ success: boolean; idSupplement?: number }> {
    try {
      console.log({ 
        idTypeMark, 
        comment, 
        studentId, 
        idSt, 
        lessonNumber 
      });

      // Получаем teacherId из localStorage
      const teacherId = localStorage.getItem('teacher_id');
      if (!teacherId) {
        throw new Error('Teacher ID not found in localStorage');
      }

      // Формируем запрос на создание supplement
      const createRequest = {
        idTypeMark: idTypeMark,
        comment: comment,
        idStudent: studentId,
        idSt: idSt,
        number: lessonNumber,
        idTeacher: parseInt(teacherId)
      };

      const response = await fetchWithTimeout(`${API_BASE_URL}/changes/add/supplement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createRequest),
      });
      
      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
          console.error('Create supplement error text:', errorText);
        } catch (e) {
          errorText = 'Не удалось прочитать текст ошибки';
        }
        
        throw new Error(`Ошибка создания записи занятия: ${response.status} - ${errorText}`);
      }

      const responseData = await response.json();

      const idSupplement = responseData.id || responseData.idSupplement;
      
      // Инвалидируем кэш
      this.invalidateLessonInfoCache();
      
      return { 
        success: true, 
        idSupplement: idSupplement
      };
    } catch (error) {
      console.error('Error creating supplement:', error);
      throw error;
    }
  },

  /**
   * Обновление типа занятия в supplement
   */
  async updateSupplementType(idSupplement: number, idTypeMark: number): Promise<{ success: boolean }> {
    try {      
      // Обновляем supplement с новым типом занятия
      const updateData = {
        id: idSupplement,
        idTypeMark: idTypeMark
      };

      const response = await fetchWithTimeout(`${API_BASE_URL}/supplements/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
          console.error('Update supplement error text:', errorText);
        } catch (e) {
          errorText = 'Не удалось прочитать текст ошибки';
        }
        
        throw new Error(`Ошибка обновления типа занятия: ${response.status} - ${errorText}`);
      }

      const responseText = await response.text();
      
      // Инвалидируем кэш информации о занятиях
      this.invalidateLessonInfoCache();
      
      return { success: true };
    } catch (error) {
      console.error('Error updating supplement type:', error);
      throw error;
    }
  },

  /**
   * Обновление комментария/темы занятия
   */
  async updateLessonComment(idSupplement: number, comment: string): Promise<{ success: boolean }> {
    try {
      
      const response = await fetchWithTimeout(`${API_BASE_URL}/supplements/update?id=${idSupplement}&comment=${encodeURIComponent(comment)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
          console.error('Update lesson comment error text:', errorText);
        } catch (e) {
          errorText = 'Не удалось прочитать текст ошибки';
        }
        
        throw new Error(`Ошибка обновления комментария: ${response.status} - ${errorText}`);
      }

      const responseText = await response.text();
      
      // Инвалидируем кэш информации о занятиях
      this.invalidateLessonInfoCache();
      
      return { success: true };
    } catch (error) {
      console.error('Error updating lesson comment:', error);
      throw error;
    }
  },

  /**
   * Получение ID занятия по номеру и другим параметрам
   */
  async getLessonId(idSt: number, groupId: number, teacherId: number, lessonNumber: number): Promise<number | null> {
    try {
      
      const lessonsInfo = await this.getLessonsInfo(idSt, groupId, teacherId);
      
      // Ищем занятие с нужным номером
      const lesson = lessonsInfo.find((lesson: any) => lesson.number === lessonNumber);
      
      if (lesson) {
        return lesson.id;
      }
      
      console.warn(`Lesson not found for number ${lessonNumber}`);
      return null;
    } catch (error) {
      console.error('Error getting lesson ID:', error);
      return null;
    }
  },

  // Получение данных о предметах и преподавателях
  async getSubjectTeachersData(): Promise<SubjectTeacherData[]> {
    const cacheKey = 'subject_teachers_data';
    
    const cached = cacheService.get<SubjectTeacherData[]>(cacheKey, { 
      ttl: CACHE_TTL.SUBJECT_TEACHERS 
    });
    
    if (cached) {
      return cached;
    }

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/st`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: SubjectTeacherData[] = await response.json();
      
      cacheService.set(cacheKey, data, { 
        ttl: CACHE_TTL.SUBJECT_TEACHERS 
      });
      
      return data;
    } catch (error) {
      console.error('Error fetching subject teachers data:', error);
      throw error;
    }
  },

  // Получение данных о предметах конкретного преподавателя
  async getTeacherSubjects(teacherId: number): Promise<SubjectTeacherData[]> {
    const cacheKey = `teacher_subjects_${teacherId}`;
    
    const cached = cacheService.get<SubjectTeacherData[]>(cacheKey, { 
      ttl: CACHE_TTL.SUBJECT_TEACHERS 
    });
    
    if (cached) {
      return cached;
    }

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/st/teacher/${teacherId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: SubjectTeacherData[] = await response.json();
      
      cacheService.set(cacheKey, data, { 
        ttl: CACHE_TTL.SUBJECT_TEACHERS 
      });
      
      return data;
    } catch (error) {
      console.error('Error fetching teacher subjects:', error);
      throw error;
    }
  },

  // Получение всех предметов с кэшированием
  async getAllSubjects(): Promise<Subject[]> {
    const cacheKey = 'all_subjects';
    
    const cached = cacheService.get<Subject[]>(cacheKey, { 
      ttl: CACHE_TTL.SUBJECT_DATA 
    });
    
    if (cached) {
      return cached;
    }

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/subjects`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: Subject[] = await response.json();
      
      cacheService.set(cacheKey, data, { 
        ttl: CACHE_TTL.SUBJECT_DATA 
      });
      
      return data;
    } catch (error) {
      console.error('Error fetching all subjects:', error);
      throw error;
    }
  },

  invalidateSubjectsCache(): void {
    const keysToRemove = [
      'all_subjects'
    ];
    
    // Удаляем все кэши предметов
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('cache_subject_')) {
        keysToRemove.push(key.replace('cache_', ''));
      }
    }
    
    keysToRemove.forEach(key => {
      cacheService.remove(key);
    });
  },

  // Получение ID предмета по названию
  async getSubjectIdByName(subjectName: string): Promise<number> {
    const cacheKey = `subject_id_${subjectName}`;
    
    const cached = cacheService.get<number>(cacheKey, { 
      ttl: CACHE_TTL.SUBJECT_DATA 
    });
    
    if (cached) {
      return cached;
    }

    try {
      
      // Получаем все предметы из API
      const allSubjects = await this.getAllSubjects();
      
      // Ищем предмет по названию
      const subject = allSubjects.find(item =>
        item.subjectName.toLowerCase().trim() === subjectName.toLowerCase().trim()
      );
      
      if (subject) {
        cacheService.set(cacheKey, subject.id, { 
          ttl: CACHE_TTL.SUBJECT_DATA 
        });
        return subject.id;
      } else {
        const defaultId = 0;
        cacheService.set(cacheKey, defaultId, { 
          ttl: CACHE_TTL.SUBJECT_DATA 
        });
        return defaultId;
      }
    } catch (error) {
      console.error('Error fetching subject ID:', error);
      const defaultId = 0;
      cacheService.set(cacheKey, defaultId, { 
        ttl: CACHE_TTL.SUBJECT_DATA 
      });
      return defaultId;
    }
  },

  // Инвалидация кэша данных о предметах
  invalidateSubjectTeachersCache(): void {
    const keysToRemove = [
      'subject_teachers_data'
    ];
    
    // Удаляем все кэши связанные с предметами
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('cache_subject_')) {
        keysToRemove.push(key.replace('cache_', ''));
      }
    }
    
    keysToRemove.forEach(key => {
      cacheService.remove(key);
    });
  },

  // функция для получения названий предметов
  async getSubjectNameById(subjectId: number): Promise<string> {
    const cacheKey = `subject_name_${subjectId}`;
    
    const cached = cacheService.get<string>(cacheKey, { 
      ttl: CACHE_TTL.SUBJECT_DATA 
    });
    
    if (cached) {
      return cached;
    }

    try {
      
      const allSubjectsData = await this.getSubjectTeachersData();
      const subject = allSubjectsData.find(item => item.idSubject === subjectId);
      
      if (subject && (subject as any).subjectName) {
        const subjectName = (subject as any).subjectName;
        cacheService.set(cacheKey, subjectName, { 
          ttl: CACHE_TTL.SUBJECT_DATA 
        });
        return subjectName;
      }
      
      // Если не нашли, вернем заглушку
      const defaultName = `Предмет ${subjectId}`;
      cacheService.set(cacheKey, defaultName, { 
        ttl: CACHE_TTL.SUBJECT_DATA 
      });
      return defaultName;
      
    } catch (error) {
      console.error('Error fetching subject name:', error);
      return `Предмет ${subjectId}`;
    }
  },

  // Получение idSt для преподавателя, предмета и группы
  async getStId(teacherId: number, subjectName: string, groupNumber: string): Promise<number | null> {
    try {
      const cacheKey = `st_id_${teacherId}_${subjectName}_${groupNumber}`;
      
      const cached = cacheService.get<number>(cacheKey, { 
        ttl: CACHE_TTL.SUBJECT_TEACHERS 
      });
      
      if (cached) {
        return cached;
      }
      
      // Получаем все распределения
      const subjectTeachersData = await this.getSubjectTeachersData();
      
      // Получаем ID предмета
      const subjectId = await this.getSubjectIdByName(subjectName);
      if (!subjectId || subjectId === 0) {
        console.warn('Subject ID not found for:', subjectName);
        return null;
      }

      // Получаем ID группы
      const groupId = this.getGroupIdFromNumber(groupNumber);
      if (!groupId) {
        console.warn('Group ID not found for:', groupNumber);
        return null;
      }

      // Ищем запись где teacherId, subjectId и groupId совпадают
      const stRecord = subjectTeachersData.find(item => 
        item.teachers.includes(teacherId) &&
        item.idSubject === subjectId &&
        item.groups.includes(groupId)
      );

      if (stRecord) {
        cacheService.set(cacheKey, stRecord.id, { 
          ttl: CACHE_TTL.SUBJECT_TEACHERS 
        });
        return stRecord.id;
      }

      console.warn('St record not found for:', { teacherId, subjectId, groupId });
      return null;
      
    } catch (error) {
      console.error('Error getting stId:', error);
      return null;
    }
  },

  // Вспомогательная функция для преобразования номера группы в ID
  getGroupIdFromNumber(groupNumber: string): number | null {
    const groupMap: Record<string, number> = {
      '2991': 2,
      '2992': 3,
    };
    return groupMap[groupNumber] || null;
  },

  /* Столбцы с датами */

  // Получение информации о занятиях для добавления даты
  async getLessonsForDateAddition(idSt: number, groupId: number, teacherId: number): Promise<any[]> {
    const cacheKey = `lessons_for_date_${groupId}_${idSt}_${teacherId}`;
    
    const cached = cacheService.get<any[]>(cacheKey, { 
      ttl: CACHE_TTL.LESSON_DATES 
    });
    
    if (cached) {
      return cached;
    }

    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/lessons/info/st/${idSt}/group/${groupId}/teacher/${teacherId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      cacheService.set(cacheKey, data, { 
        ttl: CACHE_TTL.LESSON_DATES 
      });
      
      return data;
    } catch (error) {
      console.error('Error fetching lessons for date addition:', error);
      throw error;
    }
  },

  // Добавление столбца с датой
  async addDateColumn(addRequest: AddDateColumnRequest): Promise<{ success: boolean }> {
    try {
      
      const response = await fetchWithTimeout(`${API_BASE_URL}/marks/save/group`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(addRequest),
      });
      
      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
          console.error('Add date column error text:', errorText);
        } catch (e) {
          errorText = 'Не удалось прочитать текст ошибки';
        }
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
          console.error('Add date column error JSON:', errorData);
        } catch (e) {
          errorData = { message: errorText };
        }
        
        throw new Error(`Ошибка добавления столбца: ${response.status} - ${errorData.message || errorText}`);
      }

      const responseText = await response.text();
      
      // Инвалидируем кэш дат занятий и студентов
      this.invalidateLessonDatesCache(addRequest.idGroup, addRequest.idSt, addRequest.idTeacher);
      this.invalidateStudentCache(addRequest.idGroup, addRequest.idSt, addRequest.idTeacher);
      
      return { success: true };
    } catch (error) {
      console.error('Error adding date column:', error);
      throw error;
    }
  },

  // Удаление столбца с датой
  async deleteDateColumn(deleteRequest: DeleteDateColumnRequest): Promise<{ success: boolean }> {
    try {      
      const response = await fetchWithTimeout(`${API_BASE_URL}/marks/delete/group`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deleteRequest),
      });
      
      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
          console.error('Delete date column error text:', errorText);
        } catch (e) {
          errorText = 'Не удалось прочитать текст ошибки';
        }
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
          console.error('Delete date column error JSON:', errorData);
        } catch (e) {
          errorData = { message: errorText };
        }
        
        throw new Error(`Ошибка удаления столбца: ${response.status} - ${errorData.message || errorText}`);
      }

      const responseText = await response.text();
      
      // Инвалидируем кэш дат занятий и студентов
      this.invalidateLessonDatesCache(deleteRequest.idGroup, deleteRequest.idSt, deleteRequest.idTeacher);
      this.invalidateStudentCache(deleteRequest.idGroup, deleteRequest.idSt, deleteRequest.idTeacher);
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting date column:', error);
      throw error;
    }
  },

  /* Тип занятия */

  /**
   * Получение данных о занятии (ST)
   */
  async getStData(idSt: number): Promise<StData | null> {
    const cacheKey = `st_data_${idSt}`;
    
    const cached = cacheService.get<StData>(cacheKey, { 
      ttl: CACHE_TTL.SUBJECT_TEACHERS 
    });
    
    if (cached) {
      return cached;
    }

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/st`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const allStData: StData[] = await response.json();
      const stData = allStData.find(item => item.id === idSt);
      
      if (stData) {
        cacheService.set(cacheKey, stData, { 
          ttl: CACHE_TTL.SUBJECT_TEACHERS 
        });
      }
      
      return stData || null;
    } catch (error) {
      console.error('Error fetching ST data:', error);
      return null;
    }
  },

  /**
   * Получение типов занятий для конкретного ST
   */
  async getLessonTypes(stId: number): Promise<ApiLessonType[]> {
    const cacheKey = `lesson_types_${stId}`;
    
    const cached = cacheService.get<ApiLessonType[]>(cacheKey, { 
      ttl: CACHE_TTL.LESSON_TYPES 
    });
    
    if (cached) {
      return cached;
    }

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/typeMarks/st/${stId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const lessonTypes: ApiLessonType[] = await response.json();
      
      cacheService.set(cacheKey, lessonTypes, { 
        ttl: CACHE_TTL.LESSON_TYPES 
      });
      
      return lessonTypes;
    } catch (error) {
      console.error('Error fetching lesson types:', error);
      return [];
    }
  },

  /**
   * Обновление типа занятия для оценки
   */
  async updateLessonType(updateRequest: UpdateMarkRequest): Promise<{ success: boolean }> {
    try {

      const response = await fetchWithTimeout(`${API_BASE_URL}/marks/updateOneMark`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateRequest),
      });
      
      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
          console.error('Update lesson type error text:', errorText);
        } catch (e) {
          errorText = 'Не удалось прочитать текст ошибки';
        }
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
          console.error('Update lesson type error JSON:', errorData);
        } catch (e) {
          errorData = { message: errorText };
        }
        
        throw new Error(`Ошибка обновления типа занятия: ${response.status} - ${errorData.message || errorText}`);
      }

      // Читаем ответ как текст сначала
      const responseText = await response.text();
      
      let result;
      try {
        // Пытаемся распарсить JSON, если ответ не пустой
        result = responseText ? JSON.parse(responseText) : { success: true };
      } catch (e) {
        // Если не JSON, считаем успешным
        result = { success: true };
      }
      
      // Инвалидируем кэш оценок и информации о занятиях
      this.invalidateStudentCache(updateRequest.idGroup, updateRequest.idSt, updateRequest.idTeacher);
      this.invalidateLessonInfoCache();
      this.invalidateLessonDatesCache(updateRequest.idGroup, updateRequest.idSt, updateRequest.idTeacher);
      
      return { success: true };
    } catch (error) {
      console.error('Error updating lesson type:', error);
      throw error;
    }
  },

  /**
   * Получение ID типа занятия по названию
   */
  getLessonTypeIdByName(lessonTypes: ApiLessonType[], typeName: string): number | null {
    if (!lessonTypes || lessonTypes.length === 0) {
      console.error('Lesson types array is empty');
      return null;
    }

    // Карта для корректного сопоставления названий (учитывая опечатки в API)
    const typeMap: Record<string, string> = {
      'Лекция': 'Лекция',
      'Практическая работа': 'Практическая работа', 
      'Самостоятельная работа': 'Самостоятелья работа', // опечатка в API
      'Контрольная работа': 'Контрольная работа',
      'Домашняя работа': 'Домашняя работа',
      'Тест': 'Тест',
      'Л': 'Лекция',
      'ПР': 'Практическая работа',
      'СР': 'Самостоятелья работа',
      'КР': 'Контрольная работа',
      'ДЗ': 'Домашняя работа',
      'Т': 'Тест'
    };

    // Нормализуем название типа
    const normalizedTypeName = typeMap[typeName] || typeName;
    
    // Ищем точное совпадение
    let lessonType = lessonTypes.find(lt => 
      lt.name.toLowerCase() === normalizedTypeName.toLowerCase()
    );
    
    // Если не нашли, ищем частичное совпадение
    if (!lessonType) {
      lessonType = lessonTypes.find(lt => 
        lt.name.toLowerCase().includes(normalizedTypeName.toLowerCase()) || 
        normalizedTypeName.toLowerCase().includes(lt.name.toLowerCase())
      );
    }
    
    if (lessonType) {
      return lessonType.id;
    }
    
    console.error(`Тип занятия не найден: "${typeName}". Доступные типы:`, lessonTypes.map(lt => lt.name));
    return null;
  },

  // инвалидация кэша для типов занятий
  invalidateLessonTypesCache(stId?: number): void {
    if (stId) {
      cacheService.remove(`lesson_types_${stId}`);
      cacheService.remove(`st_data_${stId}`);
    } else {
      // Удаляем все кэши типов занятий
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('cache_lesson_types_') || key.includes('cache_st_data_'))) {
          cacheService.remove(key.replace('cache_', ''));
        }
      }
    }
  },

  // Оценки - обновление

  async updateMark(updateRequest: UpdateMarkGradeRequest): Promise<{ success: boolean }> {
    try {
      
      const response = await fetchWithTimeout(`${API_BASE_URL}/marks/updateOneMark`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateRequest),
      });
      
      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
          console.error('Update mark error text:', errorText);
        } catch (e) {
          errorText = 'Не удалось прочитать текст ошибки';
        }
        
        throw new Error(`Ошибка обновления оценки: ${response.status} - ${errorText}`);
      }

      const responseText = await response.text();
      
      // Инвалидируем кэш студентов
      this.invalidateStudentCache();
      
      return { success: true };
    } catch (error) {
      console.error('Error updating mark:', error);
      throw error;
    }
  },

  /**
   * Получение истории изменений для студента
   */
  async getStudentChangeHistory(studentId: number, idSt: number, lessonNumber: number): Promise<ChangeHistory[]> {
    try {      
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/changes/mark/st/${idSt}/student/${studentId}/number/${lessonNumber}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const history: ChangeHistory[] = await response.json();
      
      return history;
    } catch (error) {
      console.error('Error fetching change history:', error);
      return [];
    }
  },

  /**
   * Добавление комментария преподавателя к оценке
   */
  async addTeacherComment(request: {
    idTeacher: number;
    idGroup: number;
    idStudent: number;
    idSt: number;
    number: number;
    comment: string;
  }): Promise<{ success: boolean; idSupplement?: number }> {
    try {

      // Сначала создаем запись изменения
      const addResponse = await fetchWithTimeout(
        `${API_BASE_URL}/changes/add/teacher/st/${request.idSt}/student/${request.idStudent}/number/${request.number}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            idTeacher: request.idTeacher,
            idGroup: request.idGroup,
            idStudent: request.idStudent,
            idSt: request.idSt,
            number: request.number
          }),
        }
      );
      
      if (!addResponse.ok) {
        let errorText = '';
        try {
          errorText = await addResponse.text();
          console.error('Add teacher comment error text:', errorText);
        } catch (e) {
          errorText = 'Не удалось прочитать текст ошибки';
        }
        
        throw new Error(`Ошибка при создании записи: ${addResponse.status} - ${errorText}`);
      }

      const addResult = await addResponse.json();
      const idSupplement = addResult.idSupplement || addResult.id;

      // Если есть комментарий и idSupplement, обновляем его
      if (idSupplement && request.comment) {
        await this.updateLessonComment(idSupplement, request.comment);
      }

      return { success: true, idSupplement };
    } catch (error) {
      console.error('Error adding teacher comment:', error);
      throw error;
    }
  },

  /**
   * Добавление файлов к комментарию преподавателя
   */
  async addTeacherCommentFiles(idSupplement: number, files: File[]): Promise<{ success: boolean; fileUrls?: string[] }> {
    try {      
      const uploadedUrls: string[] = [];
      
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
                
        const response = await fetch(
          `${API_BASE_URL}/supplements/add/files/id/${idSupplement}`,
          {
            method: 'POST',
            body: formData,
          }
        );

        
        if (!response.ok) {
          let errorText = '';
          try {
            errorText = await response.text();
            console.error('File upload error text:', errorText);
          } catch (e) {
            errorText = 'Не удалось прочитать текст ошибки';
          }
          
          throw new Error(`Ошибка загрузки файла ${file.name}: ${response.status} - ${errorText}`);
        }

        // Пытаемся получить ответ как текст или JSON
        let result;
        try {
          const responseText = await response.text();
          
          if (responseText) {
            result = JSON.parse(responseText);
          } else {
            result = { success: true };
          }
        } catch (parseError) {
          result = { success: true };
        }
        
        if (result.fileUrl) {
          uploadedUrls.push(result.fileUrl);
        } else {
          uploadedUrls.push(`uploaded://${file.name}`);
        }
      }
      
      return { success: true, fileUrls: uploadedUrls };
    } catch (error) {
      console.error('Error adding teacher comment files:', error);
      throw error;
    }
  },

  /**
   * Загрузка файлов через проводник с использованием form-data
   */
  async uploadFilesFromExplorer(files: File[]): Promise<{ success: boolean; fileUrls?: string[]; fileIds?: number[] }> {
    try {
      
      const uploadedUrls: string[] = [];
      const uploadedIds: number[] = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        

        const response = await fetch(`${API_BASE_URL}/paths/upload`, {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          let errorText = '';
          try {
            errorText = await response.text();
            console.error('File upload error text:', errorText);
          } catch (e) {
            errorText = 'Не удалось прочитать текст ошибки';
          }
          
          throw new Error(`Ошибка загрузки файла ${file.name}: ${response.status} - ${errorText}`);
        }

        // Пытаемся получить ответ как JSON
        let result;
        try {
          const responseText = await response.text();
          
          if (responseText) {
            result = JSON.parse(responseText);
          } else {
            result = { success: true };
          }
        } catch (parseError) {
          result = { success: true };
        }
        
        if (result.fileUrl) {
          uploadedUrls.push(result.fileUrl);
        }
        if (result.fileId) {
          uploadedIds.push(result.fileId);
        } else if (result.id) {
          uploadedIds.push(result.id);
        }
        
      }
      
      console.log({
        urls: uploadedUrls,
        ids: uploadedIds
      });
      
      return { 
        success: true, 
        fileUrls: uploadedUrls.length > 0 ? uploadedUrls : undefined,
        fileIds: uploadedIds.length > 0 ? uploadedIds : undefined
      };
    } catch (error) {
      console.error('Error uploading files from explorer:', error);
      throw error;
    }
  },

  /**
   * Универсальный метод загрузки файлов (объединяет оба способа)
   */
  async uploadFilesUniversal(files: File[], options?: {
    idSupplement?: number;
    useExplorerEndpoint?: boolean;
  }): Promise<{ success: boolean; fileUrls?: string[]; fileIds?: number[] }> {
    const useExplorer = options?.useExplorerEndpoint ?? true;
    
    if (useExplorer) {
      return this.uploadFilesFromExplorer(files);
    } else {
      // Используем старый метод для supplement
      if (!options?.idSupplement) {
        throw new Error('idSupplement required for supplement file upload');
      }
      return this.addTeacherCommentFiles(options.idSupplement, files);
    }
  },

  // Получение списка всех файлов
  async getAllFiles(): Promise<any[]> {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/paths`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const files = await response.json();
      return files;
    } catch (error) {
      console.error('Error fetching all files:', error);
      return [];
    }
  },

  // Получение информации о конкретном файле по ID
  async getFileById(fileId: number): Promise<any> {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/paths/id/${fileId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const fileInfo = await response.json();
      return fileInfo;
    } catch (error) {
      console.error('Error fetching file info:', error);
      return null;
    }
  },

  // Получение файлов для конкретного supplement
  async getSupplementFiles(supplementId: number): Promise<any[]> {
    try {
      
      // Сначала получаем все файлы
      const allFiles = await this.getAllFiles();
      const supplementFiles = allFiles.filter(file => 
        file.idSupplement === supplementId || 
        file.supplementId === supplementId
      );
      
      return supplementFiles;
    } catch (error) {
      console.error('Error fetching supplement files:', error);
      return [];
    }
  },

  /**
   * Скачивание файла по ID файла (из paths)
   */
  async downloadFileById(fileId: number, fileName?: string): Promise<void> {
    try {
      
      // Получаем информацию о файле
      const fileInfo = await this.getFileById(fileId);
      if (!fileInfo) {
        throw new Error('Файл не найден');
      }

      // Используем pathToFile для скачивания
      const downloadUrl = `${API_BASE_URL}/paths/id/${fileId}`;
      const actualFileName = fileName || fileInfo.nameFile || `file_${fileId}`;

      // Создаем скрытую ссылку для скачивания
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = actualFileName;
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
      
      // Добавляем в DOM и кликаем
      document.body.appendChild(link);
      link.click();
      
      // Очистка
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);
            
    } catch (error) {
      console.error('Error downloading file by ID:', error);
      
      // Альтернативный метод через fetch
      try {
        await this.downloadFileByIdWithFetch(fileId, fileName);
      } catch (fetchError) {
        console.error('Alternative download method also failed:', fetchError);
        throw new Error('Не удалось скачать файл. Попробуйте позже.');
      }
    }
  },

  /**
   * Альтернативный метод скачивания через fetch для fileId
   */
  async downloadFileByIdWithFetch(fileId: number, fileName?: string): Promise<void> {
    try {      
      const downloadUrl = `${API_BASE_URL}/paths/id/${fileId}`;
      
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Accept': '*/*',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Получаем информацию о файле для имени
      const fileInfo = await this.getFileById(fileId);
      const actualFileName = fileName || fileInfo?.nameFile || `file_${fileId}`;

      // Получаем blob
      const blob = await response.blob();
      
      // Проверяем размер файла
      if (blob.size === 0) {
        throw new Error('Получен пустой файл');
      }

      // Создаем URL для blob
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Создаем ссылку для скачивания
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = actualFileName;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      
      // Очистка
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      }, 100);
            
    } catch (error) {
      console.error('Alternative download by ID failed:', error);
      throw error;
    }
  },

  /* Подгруппы */

  // Получение подгрупп для конкретного преподавателя
  async getSubgroupsForTeacher(idTeacher: number): Promise<SubgroupData[]> {
    const cacheKey = `subgroups_teacher_${idTeacher}`;
    
    const cached = cacheService.get<SubgroupData[]>(cacheKey, { 
      ttl: CACHE_TTL.SUBGROUP_DATA 
    });
    
    if (cached) {
      return cached;
    }

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/subgroups`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const allSubgroups: SubgroupData[] = await response.json();
      
      // Фильтруем подгруппы по преподавателю
      const teacherSubgroups = allSubgroups.filter(subgroup => 
        subgroup.idTeacher === idTeacher
      );
            
      cacheService.set(cacheKey, teacherSubgroups, { 
        ttl: CACHE_TTL.SUBGROUP_DATA 
      });
      
      return teacherSubgroups;
    } catch (error) {
      console.error('Error fetching subgroups for teacher:', error);
      return [];
    }
  },
  
  // Получение ID подгрупп преподавателя
  async getTeacherSubgroupIds(
    idTeacher: number, 
    idSt: number, 
    groupNumber: string,
    subjectName: string
  ): Promise<{ subgroupIId: number; subgroupIIId: number }> {
    try {
      
      const groupId = this.getGroupIdFromNumber(groupNumber);
      if (!groupId) {
        throw new Error('Не удалось определить ID группы');
      }

      // Получаем всех преподавателей для этой группы и предмета
      const subjectTeachersData = await this.getSubjectTeachersData();
      const subjectId = await this.getSubjectIdByName(subjectName);
      
      const subjectData = subjectTeachersData.find(item => 
        item.groups.includes(groupId) && item.idSubject === subjectId
      );

      if (!subjectData || subjectData.teachers.length === 0) {
        throw new Error(`Не найдены преподаватели для группы ${groupId} и предмета ${subjectName}`);
      }

      // Для двух преподавателей просто возвращаем их ID в порядке из массива
      if (subjectData.teachers.length >= 2) {
        return {
          subgroupIId: subjectData.teachers[0],
          subgroupIIId: subjectData.teachers[1]
        };
      } else {
        // Если только один преподаватель, используем его для обеих подгрупп
        return {
          subgroupIId: subjectData.teachers[0],
          subgroupIIId: subjectData.teachers[0]
        };
      }
      
    } catch (error) {
      console.error('Ошибка получения ID подгрупп:', error);
      throw error;
    }
  },

  // Удаление студентов из подгрупп преподавателя
  async deleteStudentsFromSubgroups(deleteRequest: {
    idTeacher: number;
    idSt: number;
    students: number[];
  }): Promise<{ success: boolean }> {
    try {
      
      const response = await fetchWithTimeout(`${API_BASE_URL}/subgroups/delete/students`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deleteRequest),
      });
      
      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
          console.error('DELETE ошибка текст:', errorText);
        } catch (e) {
          errorText = 'Не удалось прочитать текст ошибки';
        }
        
        // Пробуем распарсить JSON ошибки
        let errorData;
        try {
          errorData = JSON.parse(errorText);
          console.error('DELETE ошибка JSON:', errorData);
        } catch (e) {
          errorData = { message: errorText };
        }
        
        throw new Error(`Ошибка удаления студентов: ${response.status} - ${errorData.message || errorText}`);
      }

      return { success: true };
    } catch (error) {
      console.error('DELETE исключение:', error);
      throw error;
    }
  },

  // Добавление студентов в подгруппу
  async addStudentsToSubgroup(addRequest: {
    idSt: number;
    idTeacher: number;
    students: number[];
  }): Promise<{ success: boolean }> {
    try {
      
      const response = await fetchWithTimeout(`${API_BASE_URL}/subgroups/add/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(addRequest),
      });
      
      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
          console.error('POST ошибка текст:', errorText);
        } catch (e) {
          errorText = 'Не удалось прочитать текст ошибки';
        }
        
        // Пробуем распарсить JSON ошибки
        let errorData;
        try {
          errorData = JSON.parse(errorText);
          console.error('POST ошибка JSON:', errorData);
        } catch (e) {
          errorData = { message: errorText };
        }
        
        throw new Error(`Ошибка добавления студентов: ${response.status} - ${errorData.message || errorText}`);
      }

      const responseText = await response.text();
      
      return { success: true };
    } catch (error) {
      console.error('POST исключение:', error);
      throw error;
    }
  },

  // Основной метод сохранения распределения по подгруппам
  async saveSubgroupsDistribution(
    idSt: number, 
    idTeacher: number, 
    studentSubgroups: Record<number, 'I' | 'II'>,
    groupNumber: string,
    subjectName: string
  ): Promise<{ success: boolean }> {
    try {

      // 1. Получаем ID преподавателей для подгрупп
      const { subgroupIId, subgroupIIId } = await this.getTeacherSubgroupIds(
        idTeacher, 
        idSt, 
        groupNumber,
        subjectName
      );

      // 2. Группируем студентов по подгруппам
      const subgroupIStudents: number[] = [];
      const subgroupIIStudents: number[] = [];
      
      Object.entries(studentSubgroups).forEach(([studentId, subgroup]) => {
        const numericStudentId = Number(studentId);
        if (isNaN(numericStudentId)) {
          console.error('Неверный ID студента:', studentId);
          return;
        }
        
        if (subgroup === 'I') {
          subgroupIStudents.push(numericStudentId);
        } else if (subgroup === 'II') {
          subgroupIIStudents.push(numericStudentId);
        }
      });

      // 3. Получаем текущее состояние подгрупп ОБОИХ преподавателей
      const currentSubgroupsTeacherI = await this.getSubgroupsForTeacher(subgroupIId);
      const currentSubgroupsTeacherII = await this.getSubgroupsForTeacher(subgroupIIId);
      
      // 4. Собираем ВСЕХ студентов для удаления ИЗ ОБОИХ ПОДГРУПП
      const allStudentsToRemove: number[] = [];
      
      // Собираем студентов из подгрупп первого преподавателя
      currentSubgroupsTeacherI.forEach(subgroup => {
        allStudentsToRemove.push(...subgroup.students);
      });
      
      // Собираем студентов из подгрупп второго преподавателя
      currentSubgroupsTeacherII.forEach(subgroup => {
        allStudentsToRemove.push(...subgroup.students);
      });
      
      const uniqueStudentsToRemove = allStudentsToRemove.filter((studentId, index, array) => 
        array.indexOf(studentId) === index
      );

      // 5. УДАЛЯЕМ всех студентов из подгрупп ОБОИХ ПРЕПОДАВАТЕЛЕЙ
      if (uniqueStudentsToRemove.length > 0) {
        
        // Удаляем из подгрупп первого преподавателя
        console.log({
          idTeacher: subgroupIId,
          idSt: idSt,
          students: uniqueStudentsToRemove
        });
        
        const deleteResultI = await this.deleteStudentsFromSubgroups({
          idTeacher: subgroupIId,
          idSt: idSt,
          students: uniqueStudentsToRemove
        });
        
        // Удаляем из подгрупп второго преподавателя (если это разные преподаватели)
        if (subgroupIIId !== subgroupIId) {
          console.log({
            idTeacher: subgroupIIId,
            idSt: idSt,
            students: uniqueStudentsToRemove
          });
          
          const deleteResultII = await this.deleteStudentsFromSubgroups({
            idTeacher: subgroupIIId,
            idSt: idSt,
            students: uniqueStudentsToRemove
          });
        }
      } else {
      }

      // 6. ДОБАВЛЯЕМ студентов к соответствующим преподавателям
      
      // Для I подгруппы (первый преподаватель)
      if (subgroupIStudents.length > 0) {
        console.log({
          idSt: idSt,
          idTeacher: subgroupIId,
          students: subgroupIStudents
        });
        
        const addResultI = await this.addStudentsToSubgroup({
          idSt: idSt,
          idTeacher: subgroupIId,
          students: subgroupIStudents
        });
      }
      
      // Для II подгруппы (второй преподаватель)
      if (subgroupIIStudents.length > 0) {
        console.log({
          idSt: idSt,
          idTeacher: subgroupIIId,
          students: subgroupIIStudents
        });
        
        const addResultII = await this.addStudentsToSubgroup({
          idSt: idSt,
          idTeacher: subgroupIIId,
          students: subgroupIIStudents
        });
      }

      // 7. Инвалидируем кэш
      this.invalidateSubgroupsCache();
      this.invalidateStudentCache();

      return { success: true };
      
    } catch (error: any) {
      console.error('=== ОШИБКА СОХРАНЕНИЯ ===', error);
      
      // Детальный анализ ошибки
      if (error.message) {
        console.error('Текст ошибки:', error.message);
      }
      
      if (error.response) {
        console.error('Response error:', error.response);
      }
      
      throw error;
    }
  },

  // Инвалидация кэша подгрупп
  invalidateSubgroupsCache(): void {
    const keysToRemove = [
      'all_subgroups'
    ];
    
    // Удаляем все кэши подгрупп
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('cache_subgroups_')) {
        keysToRemove.push(key.replace('cache_', ''));
      }
    }
    
    keysToRemove.forEach(key => {
      cacheService.remove(key);
    });
  },

  // Метод для проверки и создания подгрупп если их нет
  async ensureSubgroupsExist(idTeacher: number, idSt: number): Promise<{ subgroupIId: number; subgroupIIId: number }> {
    try {
      
      // Получаем текущие подгруппы
      const currentSubgroups = await this.getSubgroupsForTeacher(idTeacher);
      
      if (currentSubgroups.length >= 2) {
        // Подгруппы уже существуют
        return {
          subgroupIId: currentSubgroups[0].id,
          subgroupIIId: currentSubgroups[1].id
        };
      }
      
      // Если подгрупп меньше 2, пытаемся найти ID из данных о предметах
      const subjectTeachersData = await this.getSubjectTeachersData();
      const teacherSubject = subjectTeachersData.find(item => 
        item.teachers.includes(idTeacher)
      );
      
      if (!teacherSubject) {
        throw new Error(`Преподаватель ${idTeacher} не найден в данных о предметах`);
      }
      
      throw new Error(`Недостаточно подгрупп для преподавателя. Найдено: ${currentSubgroups.length}, требуется: 2`);
      
    } catch (error) {
      console.error('Ошибка проверки подгрупп:', error);
      throw error;
    }
  },

  /* Посещаемость */

  /**
   * Получение всех занятий (lessons)
   */
  async getAllLessons(): Promise<any[]> {
    const cacheKey = 'all_lessons';
    
    const cached = cacheService.get<any[]>(cacheKey, { 
      ttl: CACHE_TTL.LESSON_DATES 
    });
    
    if (cached) {
      return cached;
    }

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/lessons`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      cacheService.set(cacheKey, data, { 
        ttl: CACHE_TTL.LESSON_DATES 
      });
      
      return data;
    } catch (error) {
      console.error('Error fetching all lessons:', error);
      return [];
    }
  },

  /**
   * Получение списка студентов с посещаемостью для группы через новый endpoint
   */

  async getGroupAttendance(groupNumber: string, idSt: number, teacherId: number): Promise<any[]> {
    const cacheKey = `group_attendance_${groupNumber}_${idSt}_${teacherId}`;
    
    const cached = cacheService.get<any[]>(cacheKey, { 
      ttl: CACHE_TTL.STUDENT_DATA 
    });
    
    if (cached) {
      return cached;
    }

    try {
      
      // ПРЕОБРАЗУЕМ НОМЕР ГРУППЫ В ID
      const groupId = this.getGroupIdFromNumber(groupNumber);
      if (!groupId) {
        return [];
      }
      
      
      // ИСПОЛЬЗУЕМ ID ГРУППЫ В ЗАПРОСЕ
      const url = `${API_BASE_URL}/attendances/group/${groupId}/st/${idSt}/teacher/${teacherId}`;
      
      const response = await fetchWithTimeout(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!Array.isArray(data)) {
        return [];
      }
            
      cacheService.set(cacheKey, data, { 
        ttl: CACHE_TTL.STUDENT_DATA 
      });
      
      return data;
    } catch (error) {

      return [];
    }
  },

  /**
   * Преобразование данных посещаемости в формат студентов
   */
  transformAttendanceToStudents(attendanceData: AttendanceRecord[]): Student[] {
    return attendanceData.map(studentData => ({
      id: studentData.idStudent,
      lastName: studentData.lastName,
      firstName: studentData.name, // name -> firstName
      middleName: studentData.patronymic,
      subgroup: studentData.subgroup
    }));
  },

  /**
   * Получение статуса посещаемости для конкретного студента и занятия
   */
  async getStudentAttendance(lessonId: number, studentId: number): Promise<AttendanceStatus> {
    const cacheKey = `student_attendance_${lessonId}_${studentId}`;
    
    const cached = cacheService.get<AttendanceStatus>(cacheKey, { 
      ttl: CACHE_TTL.ATTENDANCE_DATA 
    });
    
    if (cached) {
      return cached;
    }

    try {
      const url = `${API_BASE_URL}/attendances/lesson/${lessonId}/student/${studentId}`;
      
      const response = await fetchWithTimeout(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Если запись не найдена, возвращаем пустой статус
          return {
            idLesson: lessonId,
            idTeacher: 0,
            status: '',
            comment: null
          };
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: AttendanceStatus = await response.json();
      
      cacheService.set(cacheKey, data, { 
        ttl: CACHE_TTL.ATTENDANCE_DATA 
      });
      
      return data;
    } catch (error) {
      console.error('Error fetching student attendance:', error);
      // В случае ошибки возвращаем пустой статус
      return {
        idLesson: lessonId,
        idTeacher: 0,
        status: '',
        comment: null
      };
    }
  },

  /**
   * Обновление статуса посещаемости с комментарием
   */
  async updateAttendance(updateRequest: UpdateAttendanceRequest): Promise<{ success: boolean }> {
    try {
      const url = `${API_BASE_URL}/attendances/student/${updateRequest.idStudent}`;
      
      const response = await fetchWithTimeout(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idLesson: updateRequest.idLesson,
          idTeacher: updateRequest.idTeacher,
          status: updateRequest.status,
          comment: updateRequest.comment
        }),
      });
      
      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
          console.error('Update attendance error text:', errorText);
        } catch (e) {
          errorText = 'Не удалось прочитать текст ошибки';
        }
        
        let errorMessage = `Ошибка обновления посещаемости: ${response.status}`;
        if (errorText) {
          errorMessage += ` - ${errorText}`;
        }
        
        throw new Error(errorMessage);
      }

      // Обработка успешного ответа
      const responseText = await response.text();
      
      // Инвалидируем кэш посещаемости
      this.invalidateAttendanceCache();
      
      return { success: true };
    } catch (error) {
      console.error('Error updating attendance:', error);
      throw error;
    }
  },

  /**
   * Инвалидация кэша посещаемости
   */
  invalidateAttendanceCache(): void {
    // Удаляем все кэши связанные с посещаемостью
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('cache_group_attendance_') || key.includes('cache_student_attendance_'))) {
        cacheService.remove(key.replace('cache_', ''));
      }
    }
  },

  // Получение информации о supplement по ID
  async getSupplementInfo(supplementId: number): Promise<SupplementInfo | null> {
    try {      
      const response = await fetchWithTimeout(`${API_BASE_URL}/supplements/${supplementId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const supplementInfo: SupplementInfo = await response.json();
      
      return supplementInfo;
    } catch (error) {
      console.error('Error fetching supplement info:', error);
      return null;
    }
  },

  //Получение типов занятий для списка supplement IDs
  async getSupplementTypes(supplementIds: number[]): Promise<Map<number, string>> {
    const typesMap = new Map<number, string>();
    
    if (supplementIds.length === 0) {
      return typesMap;
    }

    try {      
      for (const id of supplementIds) {
        try {
          const supplementInfo = await this.getSupplementInfo(id);
          if (supplementInfo && supplementInfo.typeMark) {
            typesMap.set(id, supplementInfo.typeMark);
          }
        } catch (error) {
          console.error(`Error fetching supplement ${id}:`, error);
        }
      }
      
      return typesMap;
    } catch (error) {
      console.error('Error fetching supplement types:', error);
      return typesMap;
    }
  }
};