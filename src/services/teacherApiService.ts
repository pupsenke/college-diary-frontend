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

export interface LessonDate {
  number: number;  // Это номер из API (1, 3, 5, 6)
  date: string;    // Это дата из API
  lessonInfo?: { 
    id: number;
    numberWeek: number;
    dayWeek: string;
    typeWeek: string;
    numPair: number;
    replacement: boolean;
  };
}

export interface LessonInfo {
  dateLesson: string;
  typeMark: string;
  numberWeek: number;
  dayWeek: string;
  typeWeek: string;
  numPair: number;
  replacement: boolean;
  idSupplement: number;
  comment: string;
  files: Array<{
    id: number;
    name: string;
  }>;
}

export interface LessonDateModalData {
  date: string;
  lessonNumber: number;      // number из LessonDate
  typeMark: string;          // для редактирования
  comment: string;           // для редактирования
  numberWeek: number;        // только для чтения
  dayWeek: string;           // только для чтения
  typeWeek: string;          // только для чтения
  numPair: number;           // только для чтения
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

/* Для столбцов с датами */

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

/* Для подгрупп */

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

  export const teacherApiService = {
    // Получение всех сотрудников с кэшированием
    async getAllStaff(): Promise<StaffApiResponse[]> {
      const cacheKey = 'all_staff';
      
      const cached = cacheService.get<StaffApiResponse[]>(cacheKey, { 
        ttl: CACHE_TTL.TEACHER_DATA 
      });
      
      if (cached) {
        console.log('Staff data loaded from cache');
        return cached;
      }

      console.log('Fetching staff data from server');
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
      console.log('Staff data received from server:', data.length);
      
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
        console.log(`Teacher ${teacherId} data loaded from cache`);
        return cached;
      }

      console.log(`Fetching teacher ${teacherId} data from server`);
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
      console.log('Teacher data received from server:', data);
      
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
        console.log(`Teacher ${teacherId} disciplines loaded from cache:`, cached.length);
        return cached;
      }

      try {
        console.log(`Fetching teacher ${teacherId} disciplines from server`);
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
        console.log('Преподавательских дисциплин получено:', disciplinesData);

        const allDisciplineNames = disciplinesData.map(item => item.subjectName);
        const uniqueDisciplineNames = Array.from(new Set(allDisciplineNames));
        
        console.log('Все названия дисциплин:', allDisciplineNames);
        console.log('Уникальные названия для отображения:', uniqueDisciplineNames);
        
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
        console.log('Полные данные дисциплин загружены из кэша');
        return cached;
      }

      try {
        console.log(`Fetching full teacher ${teacherId} disciplines from server`);
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
        console.log('Группы преподавателя загружены из кэша');
        return cached;
      }

      try {
        console.log(`Fetching teacher ${teacherId} groups from server`);
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

    // Получение дисциплин по курсам
    async getTeacherDisciplinesByCourse(teacherId: number): Promise<Discipline[]> {
      const cacheKey = `teacher_disciplines_course_${teacherId}`;
      
      const cached = cacheService.get<Discipline[]>(cacheKey, { 
        ttl: CACHE_TTL.TEACHER_DISCIPLINES 
      });
      
      if (cached) {
        console.log('Дисциплины по курсам загружены из кэша');
        return cached;
      }

      try {
        console.log(`Fetching teacher ${teacherId} disciplines by course from server`);
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
        console.error('Error fetching teacher disciplines by course:', error);
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
        console.log('Дисциплины по семестрам загружены из кэша');
        return cached;
      }

      try {
        console.log(`Fetching teacher ${teacherId} disciplines by semester ${semester} from server`);
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
        
        // Фильтруем данные для семестра (временная логика)
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
        console.log('Teacher search result loaded from cache');
        return cached;
      }

      console.log('Searching teacher in staff data');
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
        console.log(`Invalidated teacher cache: ${key}`);
      });
    },

    // Принудительное обновление данных с инвалидацией кэша
    async refreshTeacherData(teacherId: number) {
      console.log('Refreshing teacher data with cache invalidation');
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
      console.log(`Group ${groupId} students loaded from cache`);
      return cached;
    }

    try {
      console.log(`Fetching group ${groupId} students from server`);
      
      // Формируем URL с правильными параметрами как в Postman
      const url = `${API_BASE_URL}/groups/marks/group?idGroup=${groupId}&idSt=${idSt}&idTeacher=${idTeacher}`;
      console.log('Request URL:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const students = await response.json();
      console.log('Raw API response:', students);
      
      // Сортируем студентов по фамилии от А до Я
      const sortedStudents = students.sort((a: Student, b: Student) => 
        a.lastName.localeCompare(b.lastName)
      );
      
      console.log('Sorted students:', sortedStudents);
      
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
      console.log(`Fetching group ${groupId} students from server (without cache)`);
      
      // Формируем URL с правильными параметрами как в Postman
      const url = `${API_BASE_URL}/groups/marks/group?idGroup=${groupId}&idSt=${idSt}&idTeacher=${idTeacher}`;
      console.log('Request URL:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const students = await response.json();
      console.log('Raw API response:', students);
      
      // Сортируем студентов по фамилии от А до Я
      const sortedStudents = students.sort((a: Student, b: Student) => 
        a.lastName.localeCompare(b.lastName)
      );
      
      console.log('Sorted students:', sortedStudents);
      
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
        console.log(`Invalidated student cache: ${key}`);
      });
    }
  },

    // Смена пароля - без проверки текущего пароля
    async changePassword(teacherId: number, passwordData: PasswordChangeData): Promise<{ success: boolean }> {
      try {
        console.log(`Changing password for teacher ${teacherId}`);
        
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
        console.log('Password change successful:', result);
        
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
        console.log('Checking login availability for:', newLogin);
        
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
        
        console.log('Login availability result:', isAvailable);
        
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
      console.log('Starting login change process for teacher:', teacherId);
      console.log('New login requested:', loginData.newLogin);
      
      // Дополнительная валидация логина
      if (!loginData.newLogin || loginData.newLogin.trim().length < 3) {
        throw new Error('Логин должен содержать минимум 3 символа');
      }
      
      const loginRegex = /^[a-zA-Z0-9._-]+$/;
      if (!loginRegex.test(loginData.newLogin)) {
        throw new Error('Логин может содержать только латинские буквы, цифры и символы ._-');
      }
      
      // Проверяем доступность логина более тщательно
      console.log('Checking login availability...');
      const availability = await this.isLoginAvailable(loginData.newLogin);
      if (!availability.available) {
        throw new Error(availability.message || 'Этот логин уже занят');
      }
      
      const requestBody = {
        id: teacherId,
        login: loginData.newLogin.trim()
      };
      
      console.log('Sending login change request:', requestBody);
      
      const response = await fetchWithTimeout(`${API_BASE_URL}/staffs/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      console.log('Response status:', response.status);
      
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
      console.log('Login change successful!', result);
      
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
   // Получение дат занятий
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
      console.log(`Lesson dates for group ${groupId} loaded from cache`);
      return cached;
    }

    try {
      console.log(`Fetching lesson dates for group ${groupId} from server`);
      
      // Используем правильный endpoint для получения дат
      const response = await fetch(`${API_BASE_URL}/lessons/date/st/${idSt}/group/${groupId}/teacher/${teacherId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const datesData = await response.json();
      console.log('Lesson dates received:', datesData);
      
      // Для каждой даты получаем дополнительную информацию
      const datesWithInfo: LessonDate[] = await Promise.all(
        datesData.map(async (item: any) => {
          try {
            // Получаем информацию о занятии для первого студента (можно использовать любого)
            const lessonInfo = await this.getLessonInfo(1, idSt, item.number);
            
            return {
              number: item.number,
              date: item.date,
              lessonInfo: lessonInfo ? {
                id: lessonInfo.idSupplement,
                numberWeek: lessonInfo.numberWeek,
                dayWeek: lessonInfo.dayWeek,
                typeWeek: lessonInfo.typeWeek,
                numPair: lessonInfo.numPair,
                replacement: lessonInfo.replacement
              } : undefined
            };
          } catch (error) {
            console.error(`Error fetching lesson info for number ${item.number}:`, error);
            return {
              number: item.number,
              date: item.date
            };
          }
        })
      );
      
      console.log('Processed lesson dates with info:', datesWithInfo);
      
      cacheService.set(cacheKey, datesWithInfo, { 
        ttl: CACHE_TTL.LESSON_DATES 
      });
      
      return datesWithInfo;
    } catch (error) {
      console.error('Error fetching lesson dates:', error);
      throw error;
    }
  },

  // Получение информации о занятии
  async getLessonInfo(studentId: number, idSt: number, lessonNumber: number): Promise<LessonInfo | null> {
    const cacheKey = `lesson_info_${studentId}_${idSt}_${lessonNumber}`;
    
    const cached = cacheService.get<LessonInfo>(cacheKey, { 
      ttl: CACHE_TTL.LESSON_INFO 
    });
    
    if (cached) {
      console.log(`Lesson info for student ${studentId}, lesson ${lessonNumber} loaded from cache`);
      return cached;
    }

    try {
      console.log(`Fetching lesson info for student ${studentId}, lesson ${lessonNumber} from server`);
      
      const response = await fetch(`${API_BASE_URL}/marks/info/column/student/${studentId}/st/${idSt}/number/${lessonNumber}`);

      if (!response.ok) {
        if (response.status === 404) {
          console.log('Lesson info not found, returning empty data');
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const lessonInfo: LessonInfo = await response.json();
      console.log('Lesson info received:', lessonInfo);
      
      cacheService.set(cacheKey, lessonInfo, { 
        ttl: CACHE_TTL.LESSON_INFO 
      });
      
      return lessonInfo;
    } catch (error) {
      console.error('Error fetching lesson info:', error);
      return null;
    }
  },

  // Сохранение информации о занятии
  async saveLessonInfo(lessonData: {
    studentId: number;
    idSt: number;
    lessonNumber: number;
    typeMark: string;
    comment: string;
  }): Promise<{ success: boolean }> {
    try {
      console.log('Saving lesson info:', lessonData);
      
      // Здесь будет запрос для сохранения данных
      // Пока просто возвращаем успех
      // const response = await fetch(`${API_BASE_URL}/marks/info/column`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(lessonData),
      // });
      
      // if (!response.ok) {
      //   throw new Error(`HTTP error! status: ${response.status}`);
      // }
      
      // Инвалидируем кэш
      this.invalidateLessonInfoCache(lessonData.studentId, lessonData.idSt, lessonData.lessonNumber);
      
      return { success: true };
    } catch (error) {
      console.error('Error saving lesson info:', error);
      throw error;
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

   // Получение данных о предметах и преподавателях
  async getSubjectTeachersData(): Promise<SubjectTeacherData[]> {
    const cacheKey = 'subject_teachers_data';
    
    const cached = cacheService.get<SubjectTeacherData[]>(cacheKey, { 
      ttl: CACHE_TTL.SUBJECT_TEACHERS 
    });
    
    if (cached) {
      console.log('Subject teachers data loaded from cache');
      return cached;
    }

    try {
      console.log('Fetching subject teachers data from server');
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
      console.log('Subject teachers data received:', data.length);
      
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
      console.log(`Teacher ${teacherId} subjects loaded from cache`);
      return cached;
    }

    try {
      console.log(`Fetching teacher ${teacherId} subjects from server`);
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
      console.log(`Teacher ${teacherId} subjects received:`, data.length);
      
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
      console.log('All subjects loaded from cache');
      return cached;
    }

    try {
      console.log('Fetching all subjects from server');
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
      console.log('All subjects received:', data.length);
      
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
      console.log(`Invalidated subject cache: ${key}`);
    });
  },


  // Получение ID предмета по названию
  async getSubjectIdByName(subjectName: string): Promise<number> {
    const cacheKey = `subject_id_${subjectName}`;
    
    const cached = cacheService.get<number>(cacheKey, { 
      ttl: CACHE_TTL.SUBJECT_DATA 
    });
    
    if (cached) {
      console.log(`Subject ID for ${subjectName} loaded from cache:`, cached);
      return cached;
    }

    try {
      console.log(`Fetching subject ID for: ${subjectName}`);
      
      // Получаем все предметы из API
      const allSubjects = await this.getAllSubjects();
      
      // Ищем предмет по названию
      const subject = allSubjects.find(item =>
        item.subjectName.toLowerCase().trim() === subjectName.toLowerCase().trim()
      );
      
      if (subject) {
        console.log(`Found subject ID for "${subjectName}":`, subject.id);
        cacheService.set(cacheKey, subject.id, { 
          ttl: CACHE_TTL.SUBJECT_DATA 
        });
        return subject.id;
      } else {
        console.log(`Subject "${subjectName}" not found, returning 0`);
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
      console.log(`Invalidated subject cache: ${key}`);
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
      console.log(`Fetching subject name for ID: ${subjectId}`);
      
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

      console.log(`Fetching stId for teacher ${teacherId}, subject ${subjectName}, group ${groupNumber}`);
      
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
        console.log(`Found stId: ${stRecord.id} for teacher ${teacherId}, subject ${subjectName}, group ${groupNumber}`);
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
      console.log(`Lessons for date addition loaded from cache`);
      return cached;
    }

    try {
      console.log(`Fetching lessons for date addition from server`);
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
      console.log('Lessons for date addition received:', data);
      
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
      console.log('Adding date column:', addRequest);
      
      const response = await fetchWithTimeout(`${API_BASE_URL}/marks/save/group`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(addRequest),
      });

      console.log('Add date column response status:', response.status);
      
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
      console.log('Add date column response:', responseText);
      
      // Инвалидируем кэш дат занятий и студентов
      this.invalidateLessonDatesCache(addRequest.idGroup, addRequest.idSt, addRequest.idTeacher);
      this.invalidateStudentCache(addRequest.idGroup, addRequest.idSt, addRequest.idTeacher);
      
      console.log('Date column added successfully');
      return { success: true };
    } catch (error) {
      console.error('Error adding date column:', error);
      throw error;
    }
  },

  // Удаление столбца с датой
  async deleteDateColumn(deleteRequest: DeleteDateColumnRequest): Promise<{ success: boolean }> {
    try {
      console.log('Deleting date column:', deleteRequest);
      
      const response = await fetchWithTimeout(`${API_BASE_URL}/marks/delete/group`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deleteRequest),
      });

      console.log('Delete date column response status:', response.status);
      
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
      console.log('Delete date column response:', responseText);
      
      // Инвалидируем кэш дат занятий и студентов
      this.invalidateLessonDatesCache(deleteRequest.idGroup, deleteRequest.idSt, deleteRequest.idTeacher);
      this.invalidateStudentCache(deleteRequest.idGroup, deleteRequest.idSt, deleteRequest.idTeacher);
      
      console.log('Date column deleted successfully');
      return { success: true };
    } catch (error) {
      console.error('Error deleting date column:', error);
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
      console.log(`Subgroups for teacher ${idTeacher} loaded from cache`);
      return cached;
    }

    try {
      console.log(`Fetching subgroups for teacher ${idTeacher}`);
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
      
      console.log(`Найдено подгрупп для преподавателя ${idTeacher}:`, teacherSubgroups);
      
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
    subjectName: string  // Добавляем параметр с названием предмета
  ): Promise<{ subgroupIId: number; subgroupIIId: number }> {
    try {
      console.log(`Упрощенное получение ID подгрупп для преподавателя ${idTeacher}, группа ${groupNumber}, предмет ${subjectName}`);
      
      const groupId = this.getGroupIdFromNumber(groupNumber);
      if (!groupId) {
        throw new Error('Не удалось определить ID группы');
      }

      // Получаем всех преподавателей для этой группы и предмета
      const subjectTeachersData = await this.getSubjectTeachersData();
      const subjectId = await this.getSubjectIdByName(subjectName);  // Используем переданное название
      
      const subjectData = subjectTeachersData.find(item => 
        item.groups.includes(groupId) && item.idSubject === subjectId
      );

      if (!subjectData || subjectData.teachers.length === 0) {
        throw new Error(`Не найдены преподаватели для группы ${groupId} и предмета ${subjectName}`);
      }

      console.log('Все преподаватели для предмета:', subjectData.teachers);

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
      console.log('DELETE запрос на удаление студентов:', deleteRequest);
      
      const response = await fetchWithTimeout(`${API_BASE_URL}/subgroups/delete/students`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deleteRequest),
      });

      console.log('DELETE статус:', response.status);
      
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

      console.log('DELETE успешно');
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
      console.log('POST запрос на добавление студентов:', addRequest);
      
      const response = await fetchWithTimeout(`${API_BASE_URL}/subgroups/add/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(addRequest),
      });

      console.log('POST статус:', response.status);
      
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
      console.log('POST ответ:', responseText);
      
      console.log('POST успешно');
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
      console.log('=== НАЧАЛО СОХРАНЕНИЯ ПОДГРУПП ===');
      console.log('Параметры:', { idSt, idTeacher, studentSubgroups, groupNumber, subjectName });

      // 1. Получаем ID преподавателей для подгрупп
      console.log('1. Получение ID преподавателей для подгрупп...');
      const { subgroupIId, subgroupIIId } = await this.getTeacherSubgroupIds(
        idTeacher, 
        idSt, 
        groupNumber,
        subjectName
      );
      console.log('ID преподавателей для подгрупп получены:', { subgroupIId, subgroupIIId });

      // 2. Группируем студентов по подгруппам
      console.log('2. Группировка студентов...');
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
      
      console.log('Студенты для I подгруппы:', subgroupIStudents);
      console.log('Студенты для II подгруппы:', subgroupIIStudents);

      // 3. Получаем текущее состояние подгрупп ОБОИХ преподавателей
      console.log('3. Получение текущего состояния подгрупп обоих преподавателей...');
      const currentSubgroupsTeacherI = await this.getSubgroupsForTeacher(subgroupIId);
      const currentSubgroupsTeacherII = await this.getSubgroupsForTeacher(subgroupIIId);
      
      console.log('Текущие подгруппы преподавателя I:', currentSubgroupsTeacherI);
      console.log('Текущие подгруппы преподавателя II:', currentSubgroupsTeacherII);

      // 4. Собираем ВСЕХ студентов для удаления ИЗ ОБОИХ ПОДГРУПП
      console.log('4. Сбор студентов для удаления из обеих подгрупп...');
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
      console.log('Все студенты для удаления из обеих подгрупп:', uniqueStudentsToRemove);

      // 5. УДАЛЯЕМ всех студентов из подгрупп ОБОИХ ПРЕПОДАВАТЕЛЕЙ
      if (uniqueStudentsToRemove.length > 0) {
        console.log('5. Удаление студентов из всех подгрупп обоих преподавателей...');
        
        // Удаляем из подгрупп первого преподавателя
        console.log('DELETE запрос для преподавателя I:', {
          idTeacher: subgroupIId,
          idSt: idSt,
          students: uniqueStudentsToRemove
        });
        
        const deleteResultI = await this.deleteStudentsFromSubgroups({
          idTeacher: subgroupIId,
          idSt: idSt,
          students: uniqueStudentsToRemove
        });
        console.log('Результат удаления из подгрупп преподавателя I:', deleteResultI);
        
        // Удаляем из подгрупп второго преподавателя (если это разные преподаватели)
        if (subgroupIIId !== subgroupIId) {
          console.log('DELETE запрос для преподавателя II:', {
            idTeacher: subgroupIIId,
            idSt: idSt,
            students: uniqueStudentsToRemove
          });
          
          const deleteResultII = await this.deleteStudentsFromSubgroups({
            idTeacher: subgroupIIId,
            idSt: idSt,
            students: uniqueStudentsToRemove
          });
          console.log('Результат удаления из подгрупп преподавателя II:', deleteResultII);
        }
      } else {
        console.log('5. Нет студентов для удаления');
      }

      // 6. ДОБАВЛЯЕМ студентов к соответствующим преподавателям
      console.log('6. Добавление студентов к преподавателям...');
      
      // Для I подгруппы (первый преподаватель)
      if (subgroupIStudents.length > 0) {
        console.log('Добавление студентов к преподавателю I подгруппы:', {
          idSt: idSt,
          idTeacher: subgroupIId,
          students: subgroupIStudents
        });
        
        const addResultI = await this.addStudentsToSubgroup({
          idSt: idSt,
          idTeacher: subgroupIId,
          students: subgroupIStudents
        });
        console.log('Результат добавления к I подгруппе:', addResultI);
      }
      
      // Для II подгруппы (второй преподаватель)
      if (subgroupIIStudents.length > 0) {
        console.log('Добавление студентов к преподавателю II подгруппы:', {
          idSt: idSt,
          idTeacher: subgroupIIId,
          students: subgroupIIStudents
        });
        
        const addResultII = await this.addStudentsToSubgroup({
          idSt: idSt,
          idTeacher: subgroupIIId,
          students: subgroupIIStudents
        });
        console.log('Результат добавления к II подгруппе:', addResultII);
      }

      // 7. Инвалидируем кэш
      console.log('7. Инвалидация кэша...');
      this.invalidateSubgroupsCache();
      this.invalidateStudentCache();

      console.log('=== СОХРАНЕНИЕ УСПЕШНО ЗАВЕРШЕНО ===');
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
      console.log(`Invalidated subgroups cache: ${key}`);
    });
  },

  // Метод для проверки и создания подгрупп если их нет
  async ensureSubgroupsExist(idTeacher: number, idSt: number): Promise<{ subgroupIId: number; subgroupIIId: number }> {
    try {
      console.log(`Проверка подгрупп для преподавателя ${idTeacher}`);
      
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
      
      // Здесь должна быть логика создания подгрупп, но по условиям задачи мы не можем создавать подгруппы
      // Поэтому просто выбрасываем ошибку
      throw new Error(`Недостаточно подгрупп для преподавателя. Найдено: ${currentSubgroups.length}, требуется: 2`);
      
    } catch (error) {
      console.error('Ошибка проверки подгрупп:', error);
      throw error;
    }
  },
};