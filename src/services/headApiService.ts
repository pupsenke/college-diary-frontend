// headApiService.ts
import { API_BASE_URL } from '../constants/apiConstant';

// Интерфейс для данных сотрудника
interface StaffUpdateData {
  id: number;
  email?: string;
  telephone?: string;
  office?: string;
  workPhone?: string;
  employmentDate?: string;
  password?: string; // Для смены пароля
  currentPassword?: string; // Для проверки текущего пароля
}

// Интерфейс для изменения пароля
interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  userId: number;
}

export const headApiService = {
  // Обновление данных сотрудника
  async updateStaff(data: StaffUpdateData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/staffs/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка обновления данных: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Ошибка при обновлении данных сотрудника:', error);
      throw error;
    }
  },

  // Смена пароля через update endpoint
  async changePassword(data: ChangePasswordData) {
    try {
      const updateData: StaffUpdateData = {
        id: data.userId,
        currentPassword: data.currentPassword,
        password: data.newPassword,
      };

      const response = await fetch(`${API_BASE_URL}/api/v1/staffs/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка смены пароля: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Ошибка при смене пароля:', error);
      throw error;
    }
  },

};