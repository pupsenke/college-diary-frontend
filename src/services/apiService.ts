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

// Интерфейсы для успеваемости
export interface StudentMark {
  stNameSubjectDTO: {
    idSt: number;
    idSubject: number;
    nameSubject: string;
    idTeacher: number;
    lastnameTeacher: string;
    nameTeacher: string;
    patronymicTeacher: string;
  };
  marksBySt: Array<{
    number: number;
    value: number;
  }>;
}

export interface SubjectMark {
  number: number;
  value: number;
  comment: string | null;
  typeMark: string;
  dateLesson: string | null;
}

export interface TeacherSubject {
  idTeacher: number;
  idSubject: number;
  subjectName: string;
  idGroups: number[];
}

export interface MarkChange {
  id: number;
  dateTime: string;
  action: string;
  idSupplement: number | null;
  teacherOrStudent: boolean;
  newValue: number | null;
}

export const apiService = {
  // Получение данных группы по ID
  async getGroupData(groupId: number): Promise<GroupData> {
    console.log(`Fetching group data for ID: ${groupId}`);
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
    const response = await fetch(`${API_BASE_URL}/staffs/id/${teacherId}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      throw new Error(`Ошибка загрузки данных преподавателя: ${response.status}`);
    }
    
    const data: TeacherData = await response.json();
    console.log('Teacher data received:', data);
    return data;
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
  },

  // Обновление данных студента через PATCH запрос
  async updateStudentData(studentId: number, data: Partial<StudentData>) {
    console.log('Sending PATCH request for student:', studentId, data);
    
    const response = await fetch(`${API_BASE_URL}/students/update`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: studentId,
        ...data
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('PATCH request failed:', response.status, errorText);
      throw new Error(`Ошибка обновления данных студента: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Student data updated successfully:', result);
    return result;
  },

  // Получение оценок студента
  async getStudentMarks(studentId: number): Promise<StudentMark[]> {
    console.log(`Fetching student marks for ID: ${studentId}`);
    const response = await fetch(`${API_BASE_URL}/students/marks/id/${studentId}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      throw new Error(`Ошибка загрузки оценок студента: ${response.status}`);
    }
    
    const data: StudentMark[] = await response.json();
    console.log('Student marks received:', data);
    return data;
  },

  // Получение оценок по предмету
  async getSubjectMarks(studentId: number, subjectId: number): Promise<SubjectMark[]> {
    console.log(`Fetching subject marks for student ${studentId}, subject ${subjectId}`);
    const response = await fetch(`${API_BASE_URL}/marks/student/${studentId}/subject/${subjectId}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      throw new Error(`Ошибка загрузки оценок по предмету: ${response.status}`);
    }
    
    const data: SubjectMark[] = await response.json();
    console.log('Subject marks received:', data);
    return data;
  },

  // Получение предметов преподавателя
  async getTeacherSubjects(teacherId: number): Promise<TeacherSubject[]> {
    console.log(`Fetching teacher subjects for ID: ${teacherId}`);
    const response = await fetch(`${API_BASE_URL}/st/teacherGroups/${teacherId}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      throw new Error(`Ошибка загрузки предметов преподавателя: ${response.status}`);
    }
    
    const data: TeacherSubject[] = await response.json();
    console.log('Teacher subjects received:', data);
    return data;
  },

  // Получение истории изменений оценки
  async getMarkChanges(studentId: number, stId: number, markNumber: number): Promise<MarkChange[]> {
    console.log(`Fetching mark changes for student ${studentId}, st ${stId}, mark ${markNumber}`);
    const response = await fetch(`${API_BASE_URL}/changes/mark/st/${stId}/student/${studentId}/number/${markNumber}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      throw new Error(`Ошибка загрузки истории оценки: ${response.status}`);
    }
    
    const data: MarkChange[] = await response.json();
    console.log('Mark changes received:', data);
    return data;
  }

};