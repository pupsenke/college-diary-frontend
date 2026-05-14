import { cacheService } from './cacheService';
import { CACHE_TTL } from './cacheConstants';
import { API_BASE_URL } from '../constants/apiConstant';

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
  telephone: string | null;
  staffPosition: Array<{
    id: number;
    name: string;
  }>;
}

export interface Room {
  id: number;
  name: string;
  idStaffOwner: number | null;
}

export interface SocialWorkerData {
  id: number;
  lastName: string;
  firstName: string;
  middleName: string;
  email: string;
  telephone: string;
  position: string;
  offices: string[];
  officesDisplay: string;
  department: string;
}

export interface PasswordChangeData {
  newPassword: string;
  confirmPassword: string;
}

export interface BasicProfileUpdateData {
  email: string;
  telephone: string;
}

export const socialApiService = {
  async getAllStaff(): Promise<StaffApiResponse[]> {
    const cacheKey = 'all_staff';
    
    const cached = cacheService.get<StaffApiResponse[]>(cacheKey, { 
      ttl: CACHE_TTL.TEACHER_DATA 
    });
    
    if (cached) {
      return cached;
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/staffs`, {
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

  async getStaffById(staffId: number): Promise<StaffApiResponse | null> {
    const cacheKey = `staff_${staffId}`;
    
    const cached = cacheService.get<StaffApiResponse>(cacheKey, { 
      ttl: CACHE_TTL.TEACHER_DATA 
    });
    
    if (cached) {
      return cached;
    }

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/staffs/id/${staffId}`, {
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

      const data: StaffApiResponse = await response.json();
      
      cacheService.set(cacheKey, data, { 
        ttl: CACHE_TTL.TEACHER_DATA 
      });
      
      return data;
    } catch (error) {
      console.error(`Error fetching staff ${staffId}:`, error);
      return null;
    }
  },

  // Получение всех кабинетов
  async getAllRooms(): Promise<Room[]> {
    const cacheKey = 'all_rooms';
    
    const cached = cacheService.get<Room[]>(cacheKey, { 
      ttl: CACHE_TTL.GROUP_DATA 
    });
    
    if (cached) {
      return cached;
    }

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/rooms`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: Room[] = await response.json();
      
      cacheService.set(cacheKey, data, { 
        ttl: CACHE_TTL.GROUP_DATA 
      });
      
      return data;
    } catch (error) {
      console.error('Error fetching rooms:', error);
      return [];
    }
  },

  // Получение свободных кабинетов (не закрепленных ни за кем)
  async getFreeRooms(): Promise<Room[]> {
    const cacheKey = 'free_rooms';
    
    const cached = cacheService.get<Room[]>(cacheKey, { 
      ttl: CACHE_TTL.GROUP_DATA 
    });
    
    if (cached) {
      return cached;
    }

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/rooms/free`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: Room[] = await response.json();
      
      cacheService.set(cacheKey, data, { 
        ttl: CACHE_TTL.GROUP_DATA 
      });
      
      return data;
    } catch (error) {
      console.error('Error fetching free rooms:', error);
      return [];
    }
  },

  // Получение кабинетов, закрепленных за сотрудником
  async getStaffRooms(staffId: number): Promise<Room[]> {
    const allRooms = await this.getAllRooms();
    return allRooms.filter(room => room.idStaffOwner === staffId);
  },

  async getSocialWorkerData(staffId: number): Promise<SocialWorkerData | null> {
    try {
      const [staffData, staffRooms] = await Promise.all([
        this.getStaffById(staffId),
        this.getStaffRooms(staffId)
      ]);

      if (!staffData) {
        return null;
      }

      const socialPosition = staffData.staffPosition.find(pos => pos.name === 'соц. педагог');
      const positionName = socialPosition ? 'Социальный педагог' : staffData.staffPosition[0]?.name || '';

      const offices = staffRooms.map(room => room.name);
      const officesDisplay = offices.length > 0 ? offices.join(', ') : 'Не назначен';

      return {
        id: staffData.id,
        lastName: staffData.lastName,
        firstName: staffData.name,
        middleName: staffData.patronymic,
        email: staffData.email || '',
        telephone: staffData.telephone || '',
        position: positionName,
        offices: offices,
        officesDisplay: officesDisplay,
        department: 'Отдел социальной работы'
      };
    } catch (error) {
      console.error('Error fetching social worker data:', error);
      return null;
    }
  },

  // Обновление базовых данных сотрудника (email, telephone)
  async updateStaffData(staffId: number, data: BasicProfileUpdateData): Promise<{ success: boolean }> {
    try {
      const updatePayload: any = { id: staffId };
      
      if (data.email !== undefined) {
        updatePayload.email = data.email;
      }
      if (data.telephone !== undefined) {
        updatePayload.telephone = data.telephone;
      }

      const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/staffs/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });
      
      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
          console.error('Update staff error text:', errorText);
        } catch (e) {
          errorText = 'Не удалось прочитать текст ошибки';
        }
        
        throw new Error(`Ошибка обновления данных: ${response.status} - ${errorText}`);
      }

      this.invalidateStaffCache(staffId);
      
      return { success: true };
    } catch (error) {
      console.error('Error updating staff data:', error);
      throw error;
    }
  },

  // Обновление списка кабинетов сотрудника
  async updateStaffRooms(staffId: number, officeNames: string[]): Promise<{ success: boolean }> {
    try {
      // Получаем все существующие кабинеты
      const allRooms = await this.getAllRooms();
      
      // Находим ID кабинетов по их названиям
      const officeIdsToAssign: number[] = [];
      for (const officeName of officeNames) {
        const trimmedName = officeName.trim();
        if (!trimmedName) continue;
        
        const room = allRooms.find(r => r.name === trimmedName);
        if (room) {
          officeIdsToAssign.push(room.id);
        } else {
          console.warn(`Кабинет с названием "${trimmedName}" не найден`);
        }
      }

      // Получаем текущие кабинеты сотрудника
      const currentRooms = await this.getStaffRooms(staffId);
      const currentRoomIds = currentRooms.map(r => r.id);
      
      // Кабинеты для удаления (есть у сотрудника, но нет в новом списке)
      const roomsToRemove = currentRoomIds.filter(id => !officeIdsToAssign.includes(id));
      
      // Кабинеты для добавления (есть в новом списке, но нет у сотрудника)
      const roomsToAdd = officeIdsToAssign.filter(id => !currentRoomIds.includes(id));
      
      // Удаляем кабинеты (назначаем idStaffOwner = null)
      for (const roomId of roomsToRemove) {
        await fetchWithTimeout(`${API_BASE_URL}/api/v1/rooms/assign/${roomId}/null`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }).catch(err => console.error(`Error removing room ${roomId}:`, err));
      }
      
      // Добавляем новые кабинеты
      for (const roomId of roomsToAdd) {
        await fetchWithTimeout(`${API_BASE_URL}/api/v1/rooms/assign/${roomId}/${staffId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }).catch(err => console.error(`Error adding room ${roomId}:`, err));
      }

      this.invalidateRoomsCache();
      this.invalidateStaffCache(staffId);
      
      return { success: true };
    } catch (error) {
      console.error('Error updating staff rooms:', error);
      throw error;
    }
  },

  async changePassword(staffId: number, passwordData: PasswordChangeData): Promise<{ success: boolean }> {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/staffs/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: staffId,
          password: passwordData.newPassword
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Password change failed: ${response.status}`, errorText);
        throw new Error(`Ошибка смены пароля: ${response.status}`);
      }
      
      this.invalidateStaffCache(staffId);
      
      return { success: true };
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  },

  // Получение доступных для выбора кабинетов (свободные + уже закрепленные за сотрудником)
  async getAvailableRoomsForStaff(staffId: number): Promise<Room[]> {
    const [freeRooms, staffRooms] = await Promise.all([
      this.getFreeRooms(),
      this.getStaffRooms(staffId)
    ]);
    
    // Объединяем свободные кабинеты и уже закрепленные за сотрудником
    const allAvailable = [...freeRooms];
    for (const room of staffRooms) {
      if (!allAvailable.some(r => r.id === room.id)) {
        allAvailable.push(room);
      }
    }
    
    return allAvailable;
  },

  invalidateStaffCache(staffId?: number): void {
    if (staffId) {
      cacheService.remove(`staff_${staffId}`);
    }
    cacheService.remove('all_staff');
  },

  invalidateRoomsCache(): void {
    cacheService.remove('all_rooms');
    cacheService.remove('free_rooms');
  },

  async refreshSocialWorkerData(staffId: number): Promise<SocialWorkerData | null> {
    this.invalidateStaffCache(staffId);
    this.invalidateRoomsCache();
    return this.getSocialWorkerData(staffId);
  }
};