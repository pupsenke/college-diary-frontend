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
  specialty: string;
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

  async changePassword(teacherId: number, passwordData: PasswordChangeData) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return { success: true };
  },

  async changeLogin(teacherId: number, loginData: LoginChangeData) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    this.invalidateTeacherCache(teacherId);
    
    return { success: true };
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
  }
};