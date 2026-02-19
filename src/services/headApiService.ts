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

interface Group {
  id: number;
  numberGroup: number;
  admissionYear: number;
  idCurator: number;
  course: number;
  formEducation: string;
  profile: string;
  specialty: string;
}

interface Staff {
  id: number;
  lastName: string;
  name: string;
  patronymic: string;
  login: string;
  email: string;
  staffPosition: Array<{
    id: number;
    name: string;
  }>;
}

interface Student {
  id: number;
  lastName: string;
  name: string;
  patronymic: string;
  lastNameGenitive: string | null;
  nameGenitive: string | null;
  patronymicGenitive: string | null;
  idGroup: number;
  login: string;
  password: string;
  telephone: string | null;
  birthDate: string | null;
  address: string | null;
  email: string | null;
  code: string | null;
}

// Интерфейс для GroupDetail компонента
export interface StudentInfo {
  id: number;
  lastName: string;
  name: string;
  patronymic: string;
  lastNameGenitive: string | null;
  nameGenitive: string | null;
  patronymicGenitive: string | null;
  email: string | null;
  telephone: string | null;
}

export interface GroupInfo {
  id: number;
  name: string;
  numberGroup: number;
  admissionYear: number;
  course: number;
  formEducation: string;
  profile: string;
  specialty: string;
  curatorId: number;
}

export interface CuratorInfo {
  lastName: string;
  name: string;
  patronymic: string;
  email: string;
}

export interface FullStudentInfo extends StudentInfo {
  birthDate: string | null;
  address: string | null;
  login: string;
  password?: string;
  idGroup: number;
  code: string | null;
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

  // Получение всех групп с фильтрацией по профилю
  async getGroups(profileFilter?: string): Promise<Group[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/groups`);
      if (!response.ok) {
        throw new Error(`Ошибка получения групп: ${response.status}`);
      }
      const groups: Group[] = await response.json();
      
      // Фильтрация по профилю, если указан
      if (profileFilter) {
        return groups.filter(group => 
          group.profile.toLowerCase().includes(profileFilter.toLowerCase())
        );
      }
      
      return groups;
    } catch (error) {
      console.error('Ошибка при получении групп:', error);
      throw error;
    }
  },

  // Получение данных куратора
  async getCurator(curatorId: number): Promise<Staff> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/staffs/id/${curatorId}`);
      if (!response.ok) {
        throw new Error(`Ошибка получения куратора: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Ошибка при получении куратора:', error);
      throw error;
    }
  },

  // Получение студентов группы - исправленный метод
  async getGroupStudents(groupId: number): Promise<StudentInfo[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/students/group/${groupId}`);
      if (!response.ok) {
        throw new Error(`Ошибка получения студентов: ${response.status}`);
      }
      const students: Student[] = await response.json();
      
      // Преобразуем Student[] в StudentInfo[]
      return students.map(student => ({
        id: student.id,
        lastName: student.lastName,
        name: student.name,
        patronymic: student.patronymic,
        lastNameGenitive: student.lastNameGenitive,
        nameGenitive: student.nameGenitive,
        patronymicGenitive: student.patronymicGenitive,
        email: student.email,
        telephone: student.telephone
      }));
    } catch (error) {
      console.error('Ошибка при получении студентов:', error);
      throw error;
    }
  },

  // Получение информации об отделении
  async getDepartmentInfo() {
    try {
      // Получаем все группы для статистики
      const groups = await this.getGroups();
      
      // Фильтруем группы по нужному профилю
      const filteredGroups = groups.filter(group => 
        group.profile === "Информационные системы и программирование"
      );
      
      // Получаем всех студентов для подсчета
      let totalStudents = 0;
      for (const group of filteredGroups) {
        const students = await this.getGroupStudents(group.id);
        totalStudents += students.length;
      }
      
      return {
        totalGroups: filteredGroups.length,
        totalStudents: totalStudents,
        // Остальные данные пока статические
        name: 'Отделение информационных технологий',
        specialities: ['09.02.07 Информационные системы и программирование'],
        totalTeachers: 24,
        averagePerformance: 4.1,
        averageAttendance: 86.0
      };
    } catch (error) {
      console.error('Ошибка при получении информации об отделении:', error);
      throw error;
    }
  },

  // ПОЛУЧЕНИЕ ДАННЫХ СТУДЕНТА ПО ID
  async getStudentById(studentId: number): Promise<FullStudentInfo> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/students/id/${studentId}`);
      if (!response.ok) {
        throw new Error(`Ошибка получения данных студента: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Ошибка при получении данных студента:', error);
      throw error;
    }
  },

  // ПОЛУЧЕНИЕ ОЦЕНОК СТУДЕНТА
  async getStudentMarks(studentId: number): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/students/marks/id/${studentId}`);
      if (!response.ok) {
        throw new Error(`Ошибка получения оценок студента: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Ошибка при получении оценок студента:', error);
      throw error;
    }
  },

  // ПОЛУЧЕНИЕ ПОСЕЩАЕМОСТИ СТУДЕНТА
  async getStudentAttendance(studentId: number): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/attendances/student/${studentId}`);
      if (!response.ok) {
        throw new Error(`Ошибка получения посещаемости студента: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Ошибка при получении посещаемости студента:', error);
      throw error;
    }
  },

  // ПОЛУЧЕНИЕ ДОКУМЕНТОВ СТУДЕНТА
  async getStudentDocuments(studentId: number): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/paths`);
      if (!response.ok) {
        throw new Error(`Ошибка получения документов: ${response.status}`);
      }
      const allDocuments = await response.json();
      return allDocuments.filter((doc: any) => doc.idStudent === studentId || doc.studentId === studentId);
    } catch (error) {
      console.error('Ошибка при получении документов студента:', error);
      throw error;
    }
  },

  // ПОЛУЧЕНИЕ ИНФОРМАЦИИ О ГРУППЕ (уже есть, но добавлю для полноты)
  async getGroupById(groupId: number): Promise<Group> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/groups/id/${groupId}`);
      if (!response.ok) {
        throw new Error(`Ошибка получения данных группы: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Ошибка при получении данных группы:', error);
      throw error;
    }
  },

  // ПОЛУЧЕНИЕ ДАННЫХ ПРЕПОДАВАТЕЛЯ
  async getTeacherById(teacherId: number): Promise<Staff> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/staffs/id/${teacherId}`);
      if (!response.ok) {
        throw new Error(`Ошибка получения данных преподавателя: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Ошибка при получении данных преподавателя:', error);
      throw error;
    }
  }
};