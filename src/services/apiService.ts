// src/services/apiService.ts
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
  idGroup: number;
  login: string;
  password: string;
  telephone?: string;
  birthDate?: string;
  address?: string;
  email?: string;
}

export const apiService = {
  // Авторизация
  async loginStudent(login: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/students/login/${login}/password/${password}`);
    if (!response.ok) throw new Error('Ошибка авторизации студента');
    const data: StudentData = await response.json();
    return {
      ...data,
      userType: 'student' as const,
      numberGroup: data.idGroup
    };
  },

  async loginStaff(login: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/staffs/login/${login}/password/${password}`);
    if (!response.ok) throw new Error('Ошибка авторизации сотрудника');
    const data = await response.json();
    
    // Определяем тип пользователя на основе должности
    const positions = data.staffPosition.map((pos: any) => pos.name.toLowerCase());
    let userType: 'teacher' | 'metodist' = 'teacher';
    
    if (positions.includes('методист')) {
      userType = 'metodist';
    }
    
    return {
      ...data,
      userType
    };
  },

  // Получение данных группы
  async getGroupData(groupNumber: number): Promise<GroupData> {
    const response = await fetch(`${API_BASE_URL}/groups/number/${groupNumber}`);
    if (!response.ok) throw new Error('Ошибка загрузки данных группы');
    const data: GroupData[] = await response.json();
    return data[0]; // API возвращает массив, берем первый элемент
  },

  // Получение данных преподавателя
  async getTeacherData(teacherId: number): Promise<TeacherData> {
    const response = await fetch(`${API_BASE_URL}/teachers/id/${teacherId}`);
    if (!response.ok) throw new Error('Ошибка загрузки данных преподавателя');
    return await response.json();
  },

  // Обновление данных студента
  async updateStudentData(studentId: number, data: Partial<StudentData>) {
    const response = await fetch(`${API_BASE_URL}/students/${studentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Ошибка обновления данных студента');
    return await response.json();
  }
};