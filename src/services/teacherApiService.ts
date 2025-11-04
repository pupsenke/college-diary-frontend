import { cacheService } from './cacheService';
import { CACHE_TTL } from './cacheConstants';

const API_BASE_URL = 'http://localhost:8080/api/v1';

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
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface LoginChangeData {
  currentPassword: string;
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
  speciality: string;
  subjectName: string;
  countStudent: number;
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
      ttl: CACHE_TTL.STUDENT_MARKS // 5 минут, так как могут меняться
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

      // Извлекаем названия дисциплин
      const disciplineNames = disciplinesData.map(item => item.subjectName);
      console.log('Извлеченные названия дисциплин:', disciplineNames);
      
      cacheService.set(cacheKey, disciplineNames, { 
        ttl: CACHE_TTL.STUDENT_MARKS 
      });
      
      return disciplineNames;
    } catch (err) {
      console.error('Ошибка при загрузке дисциплин преподавателя:', err);
      throw err;
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

  // Обновление данных преподавателя
  async updateTeacherData(teacherId: number, data: Partial<StaffApiResponse>) {
    console.log('Sending PATCH request for teacher:', teacherId, data);
    
    const response = await fetch(`${API_BASE_URL}/staffs/update`, {
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
      const errorText = await response.text();
      console.error('PATCH request failed:', response.status, errorText);
      throw new Error(`Ошибка обновления данных преподавателя: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Teacher data updated successfully:', result);
    
    // Инвалидируем кэш после обновления
    this.invalidateTeacherCache(teacherId);
    
    return result;
  },

  // Смена пароля преподавателя
  async changePassword(teacherId: number, passwordData: PasswordChangeData) {
    console.log('Changing password for teacher:', teacherId);
    
    // Здесь должен быть реальный вызов API для смены пароля
    // const response = await fetch(`${API_BASE_URL}/staffs/change-password`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     teacherId,
    //     ...passwordData
    //   }),
    // });
    
    // if (!response.ok) {
    //   throw new Error('Ошибка смены пароля');
    // }
    
    // Имитация успешной смены пароля
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Password changed successfully');
    
    return { success: true };
  },

  // Смена логина преподавателя
  async changeLogin(teacherId: number, loginData: LoginChangeData) {
    console.log('Changing login for teacher:', teacherId);
    
    // Здесь должен быть реальный вызов API для смены логина
    // const response = await fetch(`${API_BASE_URL}/staffs/change-login`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     teacherId,
    //     ...loginData
    //   }),
    // });
    
    // if (!response.ok) {
    //   throw new Error('Ошибка смены логина');
    // }
    
    // Имитация успешной смены логина
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Login changed successfully');
    
    // Инвалидируем кэш после смены логина
    this.invalidateTeacherCache(teacherId);
    
    return { success: true };
  },

  // Инвалидация кэша преподавателя
  invalidateTeacherCache(teacherId?: number): void {
    const keysToRemove: string[] = ['all_staff'];
    
    if (teacherId) {
      keysToRemove.push(
        `teacher_${teacherId}`,
        `teacher_disciplines_${teacherId}`
      );
      
      // Удаляем ключи поиска по имени (можем не знать точные ключи, поэтому очищаем все связанные)
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

    // Получение дисциплин преподавателя по курсу
  async getTeacherDisciplinesByCourse(teacherId: number, course: number): Promise<Discipline[]> {
    const cacheKey = `teacher_disciplines_course_${teacherId}_${course}`;
    
    try {
      // Проверяем кэш
      const cached = localStorage.getItem(`cache_${cacheKey}`);
      if (cached) {
        const cachedData = JSON.parse(cached);
        // Проверяем актуальность кэша (5 минут)
        if (Date.now() - cachedData.timestamp < 5 * 60 * 1000) {
          console.log('Дисциплины загружены из кэша');
          return cachedData.data;
        }
      }

      // Запрос к API
      const response = await fetch(`http://localhost:8080/api/v1/staffs/subjects/course/${course}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Сохраняем в кэш
      const cacheData = {
        data: data,
        timestamp: Date.now()
      };
      localStorage.setItem(`cache_${cacheKey}`, JSON.stringify(cacheData));
      
      return data;
    } catch (error) {
      console.error('Error fetching teacher disciplines by course:', error);
      throw error;
    }
  },

  // Инвалидация кэша дисциплин
  invalidateDisciplinesCache(teacherId: number, course: number) {
    const cacheKey = `teacher_disciplines_course_${teacherId}_${course}`;
    localStorage.removeItem(`cache_${cacheKey}`);
  },

  // Получение групп преподавателя
  async getTeacherGroups(teacherId: number, course: number): Promise<Group[]> {
    const cacheKey = `teacher_groups_${teacherId}_${course}`;
    
    try {
      // Проверяем кэш
      const cached = localStorage.getItem(`cache_${cacheKey}`);
      if (cached) {
        const cachedData = JSON.parse(cached);
        // Проверяем актуальность кэша (5 минут)
        if (Date.now() - cachedData.timestamp < 5 * 60 * 1000) {
          console.log('Группы загружены из кэша');
          return cachedData.data;
        }
      }

      // Запрос к API
      const response = await fetch(`http://localhost:8080/api/v1/staffs/subjects/group/${course}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Сохраняем в кэш
      const cacheData = {
        data: data,
        timestamp: Date.now()
      };
      localStorage.setItem(`cache_${cacheKey}`, JSON.stringify(cacheData));
      
      return data;
    } catch (error) {
      console.error('Error fetching teacher groups:', error);
      throw error;
    }
  },

  // Инвалидация кэша групп
  invalidateGroupsCache(teacherId: number, course: number) {
    const cacheKey = `teacher_groups_${teacherId}_${course}`;
    localStorage.removeItem(`cache_${cacheKey}`);
  }
};