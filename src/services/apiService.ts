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
  // Получение данных группы по ID
  async getGroupData(groupId: number): Promise<GroupData> {
    console.log(`🔍 Fetching group data for ID: ${groupId}`);
    const response = await fetch(`${API_BASE_URL}/groups/id/${groupId}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      throw new Error(`Ошибка загрузки данных группы: ${response.status}`);
    }
    
    const data: GroupData = await response.json();
    console.log('Group data received:', data);
    return data;
  },

  // Получение данных преподавателя
  async getTeacherData(teacherId: number): Promise<TeacherData> {
    console.log(`Fetching teacher data for ID: ${teacherId}`);
    const response = await fetch(`${API_BASE_URL}/teachers/id/${teacherId}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      throw new Error(`Ошибка загрузки данных преподавателя: ${response.status}`);
    }
    
    const data: TeacherData = await response.json();
    console.log('Teacher data received:', data);
    return data;
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
  },

  // Авторизация студента
  async loginStudent(login: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/students/login/${login}/password/${password}`);
    if (!response.ok) throw new Error('Ошибка авторизации студента');
    const data: StudentData = await response.json();
    
    // Преобразуем данные студента в нужный формат
    return {
      ...data,
      userType: 'student' as const,
      numberGroup: 0 // Временное значение, будет обновлено после получения данных группы
    };
  }
};