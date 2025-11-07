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
    idStudent: number;
    lastName: string;
    name: string;
    patronymic: string;
    marks?: Array<{
      number: number;
      value: number | null;
    } | null>;
  }

  export interface StudentsResponse {
    students: Student[];
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
    async getGroupStudents(groupId: number, idSt: number): Promise<Student[]> {
      const cacheKey = `group_students_${groupId}_${idSt}`;
      
      const cached = cacheService.get<Student[]>(cacheKey, { 
        ttl: CACHE_TTL.STUDENT_DATA 
      });
      
      if (cached) {
        console.log(`Group ${groupId} students loaded from cache`);
        return cached;
      }

      try {
        console.log(`Fetching group ${groupId} students from server`);
        const response = await fetch(`${API_BASE_URL}/groups/marks/group?idGroup=${groupId}&idSt=${idSt}`);
        
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

    // Функция для инвалидации кэша студентов
    invalidateStudentCache(groupId?: number, idSt?: number): void {
      if (groupId && idSt) {
        cacheService.remove(`group_students_${groupId}_${idSt}`);
      } else {
        // Удаляем все кэши студентов
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.includes('cache_group_students_')) {
            cacheService.remove(key.replace('cache_', ''));
          }
        }
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
  }
  };