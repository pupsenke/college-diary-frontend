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

// Интерфейсы для успеваемости и посещаемости группы
export interface SubjectInfo {
  id: number;
  name: string;
  teacherId: number;
  teacherName?: string;
  assessmentForm?: string; // добавим
}

export interface GroupMark {
  studentId: number;
  mark: number;
  date: string;
  lessonNumber: number;
  typeMark?: string;
}

export interface GroupAttendance {
  studentId: number;
  present: boolean;
  date: string;
  lessonNumber: number;
  status: string;
  comment?: string;
}

export interface LessonDate {
  number: number;
  date: string;
  lessonId: number;
}

export interface SubjectTeacher {
  id: number;
  subjectId: number;
  subjectName: string;
  teacherId: number;
  teacherLastName: string;
  teacherName: string;
  teacherPatronymic: string;
}

// Интерфейс для сотрудника
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
  },

  // Добавление новой группы
  async addGroup(groupNumber: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/groups/add/${groupNumber}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка добавления группы: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Ошибка при добавлении группы:', error);
      throw error;
    }
  },

  // Удаление группы
  async deleteGroup(groupId: number): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/groups/delete/${groupId}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка удаления группы: ${response.status} - ${errorText}`);
      }

      // Проверяем, есть ли содержимое в ответе
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const text = await response.text();
        // Если текст не пустой, парсим JSON
        if (text && text.trim()) {
          return JSON.parse(text);
        }
      }
      
      // Возвращаем успешный результат без данных
      return { success: true, message: 'Группа успешно удалена' };
    } catch (error) {
      console.error('Ошибка при удалении группы:', error);
      throw error;
    }
  },

  // ============= НОВЫЕ МЕТОДЫ ДЛЯ УСПЕВАЕМОСТИ И ПОСЕЩАЕМОСТИ ГРУППЫ =============

  // Получение всех предметов и преподавателей для группы

  async getGroupSubjectsWithTeachers(groupId: number): Promise<SubjectTeacher[]> {
    try {
      // Получаем все распределения ST
      const response = await fetch(`${API_BASE_URL}/api/v1/st`);
      if (!response.ok) {
        throw new Error(`Ошибка получения данных ST: ${response.status}`);
      }
      
      const stData: any[] = await response.json();
      
      // Фильтруем по группе
      const groupStData = stData.filter(item => item.groups && item.groups.includes(groupId));
      
      // Получаем информацию о преподавателях
      const result: SubjectTeacher[] = [];
      
      for (const st of groupStData) {
        // Получаем информацию о предмете
        const subjectResponse = await fetch(`${API_BASE_URL}/api/v1/subjects/id/${st.idSubject}`);
        if (subjectResponse.ok) {
          const subject = await subjectResponse.json();
          
          // Для каждого преподавателя в ST
          for (const teacherId of st.teachers) {
            try {
              const teacher = await this.getTeacherById(teacherId);
              result.push({
                id: st.id,
                subjectId: st.idSubject,
                subjectName: subject.subjectName || subject.name || `Предмет ${st.idSubject}`,
                teacherId: teacherId,
                teacherLastName: teacher.lastName,
                teacherName: teacher.name,
                teacherPatronymic: teacher.patronymic
              });
            } catch (err) {
              console.error(`Ошибка загрузки преподавателя ${teacherId}:`, err);
              result.push({
                id: st.id,
                subjectId: st.idSubject,
                subjectName: subject.subjectName || subject.name || `Предмет ${st.idSubject}`,
                teacherId: teacherId,
                teacherLastName: 'Неизвестный',
                teacherName: 'преподаватель',
                teacherPatronymic: ''
              });
            }
          }
        }
      }
      
      return result;
    } catch (error) {
      console.error('Ошибка при получении предметов группы с преподавателями:', error);
      return [];
    }
  },

  // Получение дат занятий для группы по предмету и преподавателю

  // Получение дат занятий для группы по предмету и преподавателю
  async getLessonDatesBySubject(groupId: number, subjectId: number, teacherId: number): Promise<LessonDate[]> {
    try {
      // Сначала получаем stId
      const stResponse = await fetch(`${API_BASE_URL}/api/v1/st`);
      if (!stResponse.ok) {
        throw new Error(`Ошибка получения ST: ${stResponse.status}`);
      }
      
      const stData: any[] = await stResponse.json();
      const st = stData.find(item => 
        item.groups?.includes(groupId) && 
        item.idSubject === subjectId && 
        item.teachers?.includes(teacherId)
      );
      
      if (!st) {
        console.warn('ST не найден для группы, предмета и преподавателя');
        return [];
      }
      
      // Получаем даты занятий
      const response = await fetch(`${API_BASE_URL}/api/v1/lessons/date/st/${st.id}/group/${groupId}/teacher/${teacherId}`);
      if (!response.ok) {
        throw new Error(`Ошибка получения дат занятий: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Важно: используем idLesson из данных посещаемости для сопоставления
      // lessonId должен быть именно idLesson, а не номер урока
      return data.map((item: any) => ({
        number: item.number,
        date: item.date,
        lessonId: item.id || item.lessonId || item.idLesson
      }));
    } catch (error) {
      console.error('Ошибка при получении дат занятий:', error);
      return [];
    }
  },

  // Получение оценок группы по предмету и преподавателю

  async getGroupMarksWithTeachers(groupId: number, subjectId: number, teacherId: number): Promise<GroupMark[]> {
    try {
      // Получаем stId
      const stResponse = await fetch(`${API_BASE_URL}/api/v1/st`);
      if (!stResponse.ok) {
        throw new Error(`Ошибка получения ST: ${stResponse.status}`);
      }
      
      const stData: any[] = await stResponse.json();
      const st = stData.find(item => 
        item.groups?.includes(groupId) && 
        item.idSubject === subjectId && 
        item.teachers?.includes(teacherId)
      );
      
      if (!st) {
        console.warn('ST не найден для группы, предмета и преподавателя');
        return [];
      }
      
      // Получаем студентов группы с оценками
      const studentsResponse = await fetch(`${API_BASE_URL}/api/v1/groups/marks/group?idGroup=${groupId}&idSt=${st.id}&idTeacher=${teacherId}`);
      if (!studentsResponse.ok) {
        throw new Error(`Ошибка получения студентов с оценками: ${studentsResponse.status}`);
      }
      
      const studentsData = await studentsResponse.json();
      const marks: GroupMark[] = [];
      
      // Извлекаем оценки из данных студентов
      for (const student of studentsData) {
        if (student.marks && Array.isArray(student.marks)) {
          for (const mark of student.marks) {
            if (mark.value !== null && mark.value !== undefined && mark.number) {
              // Получаем дату занятия по номеру
              let dateStr = '';
              try {
                const lessonDate = await this.getLessonDateByNumber(groupId, st.id, teacherId, mark.number);
                dateStr = lessonDate || '';
              } catch (err) {
                console.error(`Ошибка получения даты для занятия ${mark.number}:`, err);
              }
              
              marks.push({
                studentId: student.idStudent,
                mark: mark.value,
                date: dateStr,
                lessonNumber: mark.number,
                typeMark: mark.typeMark
              });
            }
          }
        }
      }
      
      return marks;
    } catch (error) {
      console.error('Ошибка при получении оценок группы:', error);
      return [];
    }
  },

  //Получение даты занятия по номеру

  async getLessonDateByNumber(groupId: number, stId: number, teacherId: number, lessonNumber: number): Promise<string> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/lessons/date/st/${stId}/group/${groupId}/teacher/${teacherId}`);
      if (!response.ok) {
        return '';
      }
      
      const data = await response.json();
      const lesson = data.find((item: any) => item.number === lessonNumber);
      
      return lesson ? lesson.date : '';
    } catch (error) {
      console.error('Ошибка получения даты занятия:', error);
      return '';
    }
  },

  // Получение всех доступных предметов для группы

  async getAvailableSubjectsForGroup(groupId: number): Promise<SubjectInfo[]> {
    try {
      const subjectsWithTeachers = await this.getGroupSubjectsWithTeachers(groupId);
      
      // Группируем по предметам и выбираем уникальные
      const uniqueSubjects = new Map<number, SubjectInfo>();
      
      for (const item of subjectsWithTeachers) {
        if (!uniqueSubjects.has(item.subjectId)) {
          uniqueSubjects.set(item.subjectId, {
            id: item.subjectId,
            name: item.subjectName,
            teacherId: item.teacherId,
            teacherName: `${item.teacherLastName} ${item.teacherName.charAt(0)}.${item.teacherPatronymic ? item.teacherPatronymic.charAt(0) + '.' : ''}`
          });
        }
      }
      
      return Array.from(uniqueSubjects.values());
    } catch (error) {
      console.error('Ошибка при получении доступных предметов для группы:', error);
      return [];
    }
  },

  // Получение всех преподавателей для предмета в группе

  async getTeachersForSubject(groupId: number, subjectId: number): Promise<SubjectTeacher[]> {
    try {
      const subjectsWithTeachers = await this.getGroupSubjectsWithTeachers(groupId);
      
      return subjectsWithTeachers.filter(item => item.subjectId === subjectId);
    } catch (error) {
      console.error('Ошибка при получении преподавателей для предмета:', error);
      return [];
    }
  },

  // Получение полной информации об успеваемости группы с фильтрацией по предмету и преподавателю
  
  async getFullGroupPerformance(groupId: number, subjectId: number, teacherId: number): Promise<{
    students: StudentInfo[];
    marks: GroupMark[];
    lessonDates: LessonDate[];
    subjectInfo: SubjectTeacher | null;
  }> {
    try {
      const [students, marks, lessonDates, subjectTeachers] = await Promise.all([
        this.getGroupStudents(groupId),
        this.getGroupMarksWithTeachers(groupId, subjectId, teacherId),
        this.getLessonDatesBySubject(groupId, subjectId, teacherId),
        this.getTeachersForSubject(groupId, subjectId)
      ]);
      
      const subjectInfo = subjectTeachers.find(t => t.teacherId === teacherId) || null;
      
      return {
        students,
        marks,
        lessonDates,
        subjectInfo
      };
    } catch (error) {
      console.error('Ошибка при получении полной информации об успеваемости группы:', error);
      return {
        students: [],
        marks: [],
        lessonDates: [],
        subjectInfo: null
      };
    }
  },

  // Получение посещаемости группы по предмету и преподавателю
  
  async getGroupAttendanceWithTeachers(groupId: number, subjectId: number, teacherId: number): Promise<GroupAttendance[]> {
    try {
      // Получаем stId
      const stResponse = await fetch(`${API_BASE_URL}/api/v1/st`);
      if (!stResponse.ok) {
        throw new Error(`Ошибка получения ST: ${stResponse.status}`);
      }
      
      const stData: any[] = await stResponse.json();
      const st = stData.find(item => 
        item.groups?.includes(groupId) && 
        item.idSubject === subjectId && 
        item.teachers?.includes(teacherId)
      );
      
      if (!st) {
        console.warn('ST не найден для группы, предмета и преподавателя');
        return [];
      }
      
      // Получаем посещаемость группы
      const url = `${API_BASE_URL}/api/v1/attendances/group/${groupId}/st/${st.id}/teacher/${teacherId}`;
      console.log('Запрос посещаемости URL:', url);
      
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`Ошибка получения посещаемости группы: ${response.status}`);
        return [];
      }
      
      const data = await response.json();
      console.log('Сырые данные посещаемости от API:', data);
      
      const attendance: GroupAttendance[] = [];
      
      for (const student of data) {
        if (student.attendances && Array.isArray(student.attendances)) {
          for (const att of student.attendances) {
            // ВАЖНО: сохраняем оригинальный статус
            const statusValue = att.status || '';
            attendance.push({
              studentId: student.idStudent,
              present: statusValue === 'п',
              date: att.date,
              lessonNumber: att.idLesson,
              status: statusValue, // Сохраняем 'п', 'у', 'н' или ''
              comment: att.comment || undefined
            });
          }
        }
      }
      
      console.log('Преобразованные данные посещаемости:', attendance);
      return attendance;
    } catch (error) {
      console.error('Ошибка при получении посещаемости группы:', error);
      return [];
    }
  },

  // Получение полной информации о посещаемости группы с фильтрацией по предмету и преподавателю
  
  async getFullGroupAttendance(groupId: number, subjectId: number, teacherId: number): Promise<{
    students: StudentInfo[];
    attendance: GroupAttendance[];
    lessonDates: LessonDate[];
    subjectInfo: SubjectTeacher | null;
  }> {
    try {
      const [students, attendance, lessonDates, subjectTeachers] = await Promise.all([
        this.getGroupStudents(groupId),
        this.getGroupAttendanceWithTeachers(groupId, subjectId, teacherId),
        this.getLessonDatesBySubject(groupId, subjectId, teacherId),
        this.getTeachersForSubject(groupId, subjectId)
      ]);
      
      const subjectInfo = subjectTeachers.find(t => t.teacherId === teacherId) || null;
      
      return {
        students,
        attendance,
        lessonDates,
        subjectInfo
      };
    } catch (error) {
      console.error('Ошибка при получении полной информации о посещаемости группы:', error);
      return {
        students: [],
        attendance: [],
        lessonDates: [],
        subjectInfo: null
      };
    }
  },

  // Получение всех предметов и оценок для студента
  async getStudentMarksBySubjects(studentId: number): Promise<{ subjectId: number; subjectName: string; marks: GroupMark[] }[]> {
    try {
      const allMarks = await this.getStudentMarks(studentId);
      
      // Группируем оценки по предметам
      const marksBySubject = new Map<number, { subjectId: number; subjectName: string; marks: GroupMark[] }>();
      
      for (const mark of allMarks) {
        const subjectId = mark.subjectId || mark.idSubject;
        if (!subjectId) continue;
        
        if (!marksBySubject.has(subjectId)) {
          // Получаем название предмета
          let subjectName = `Предмет ${subjectId}`;
          try {
            const subjectResponse = await fetch(`${API_BASE_URL}/api/v1/subjects/id/${subjectId}`);
            if (subjectResponse.ok) {
              const subject = await subjectResponse.json();
              subjectName = subject.subjectName || subject.name || subjectName;
            }
          } catch (err) {
            console.error(`Ошибка получения названия предмета ${subjectId}:`, err);
          }
          
          marksBySubject.set(subjectId, {
            subjectId,
            subjectName,
            marks: []
          });
        }
        
        marksBySubject.get(subjectId)!.marks.push({
          studentId: mark.idStudent || studentId,
          mark: mark.value || mark.mark,
          date: mark.date,
          lessonNumber: mark.number || mark.lessonNumber,
          typeMark: mark.typeMark
        });
      }
      
      return Array.from(marksBySubject.values());
    } catch (error) {
      console.error('Ошибка при получении оценок студента по предметам:', error);
      return [];
    }
  },

  // Получение среднего балла группы по всем предметам
  async getGroupOverallAverage(groupId: number): Promise<number> {
    try {
      const students = await this.getGroupStudents(groupId);
      if (students.length === 0) return 0;
      
      let totalAverage = 0;
      let studentsWithMarks = 0;
      
      for (const student of students) {
        const avg = await this.getStudentOverallAverage(student.id);
        if (avg > 0) {
          totalAverage += avg;
          studentsWithMarks++;
        }
      }
      
      return studentsWithMarks > 0 ? totalAverage / studentsWithMarks : 0;
    } catch (error) {
      console.error('Ошибка расчета среднего балла группы:', error);
      return 0;
    }
  },

  // Получение общего среднего балла студента
  async getStudentOverallAverage(studentId: number): Promise<number> {
    try {
      const subjectsMarks = await this.getStudentMarksBySubjects(studentId);
      if (subjectsMarks.length === 0) return 0;
      
      let totalAverage = 0;
      let subjectsWithMarks = 0;
      
      subjectsMarks.forEach(subject => {
        const validMarks = subject.marks.filter(m => m.mark !== null && m.mark > 0);
        if (validMarks.length > 0) {
          const subjectAvg = validMarks.reduce((sum, m) => sum + m.mark, 0) / validMarks.length;
          totalAverage += subjectAvg;
          subjectsWithMarks++;
        }
      });
      
      return subjectsWithMarks > 0 ? totalAverage / subjectsWithMarks : 0;
    } catch (error) {
      console.error('Ошибка расчета среднего балла студента:', error);
      return 0;
    }
  },

  // Получение общего процента посещаемости группы
  async getGroupOverallAttendance(groupId: number): Promise<number> {
    try {
      // Получаем все предметы группы
      const subjectsWithTeachers = await this.getGroupSubjectsWithTeachers(groupId);
      if (subjectsWithTeachers.length === 0) return 0;
      
      const students = await this.getGroupStudents(groupId);
      if (students.length === 0) return 0;
      
      let totalPresent = 0;
      let totalLessons = 0;
      
      // Для каждого предмета собираем данные посещаемости
      for (const subject of subjectsWithTeachers) {
        const attendance = await this.getGroupAttendanceWithTeachers(
          groupId, 
          subject.subjectId, 
          subject.teacherId
        );
        const lessonDates = await this.getLessonDatesBySubject(
          groupId,
          subject.subjectId,
          subject.teacherId
        );
        
        students.forEach(student => {
          const studentAttendances = attendance.filter(a => a.studentId === student.id);
          const presentCount = studentAttendances.filter(a => a.status === 'п').length;
          totalPresent += presentCount;
          totalLessons += lessonDates.length;
        });
      }
      
      return totalLessons > 0 ? (totalPresent / totalLessons) * 100 : 0;
    } catch (error) {
      console.error('Ошибка расчета посещаемости группы:', error);
      return 0;
    }
  },
  // Получение преподавателей
  async getStaffs(): Promise<Staff[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/staffs`);
      if (!response.ok) {
        throw new Error(`Ошибка получения сотрудников: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Ошибка при получении списка сотрудников:', error);
      throw error;
    }
  },


  async updateGroupCurator(groupId: number, curatorId: number): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/groups/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          id: groupId,
          idCurator: curatorId
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка обновления куратора: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Ошибка при обновлении куратора группы:', error);
      throw error;
    }
  },



  // Получение предметов для группы (уникальные)
  async getGroupSubjects(groupId: number): Promise<SubjectInfo[]> {
    try {
      const subjectsWithTeachers = await this.getGroupSubjectsWithTeachers(groupId);
      const uniqueSubjects = new Map<number, SubjectInfo>();
      for (const item of subjectsWithTeachers) {
        if (!uniqueSubjects.has(item.subjectId)) {
          uniqueSubjects.set(item.subjectId, {
            id: item.subjectId,
            name: item.subjectName,
            teacherId: item.teacherId,
            teacherName: `${item.teacherLastName} ${item.teacherName.charAt(0)}.${item.teacherPatronymic ? item.teacherPatronymic.charAt(0) + '.' : ''}`
          });
        }
      }
      return Array.from(uniqueSubjects.values());
    } catch (error) {
      console.error('Ошибка при получении предметов группы:', error);
      return [];
    }
  },

  // Получение итоговых оценок студента по предмету (экзамен/дифф.зачёт/зачёт)
  // Здесь нужно знать, какое поле в API отвечает за итоговую оценку. 
  // Допустим, в объекте оценки есть поле certification.
  // Предположим, что getStudentMarks возвращает массив с полем certification.
  async getStudentFinalMark(studentId: number, subjectId: number): Promise<string | null> {
    try {
      const marks = await this.getStudentMarks(studentId);
      const subjectMarks = marks.find(m => m.subjectId === subjectId || m.idSubject === subjectId);
      if (subjectMarks && subjectMarks.certification) {
        // certification может быть числом 2-5 или строкой 'зач.'
        return subjectMarks.certification.toString();
      }
      return null;
    } catch (error) {
      console.error('Ошибка получения итоговой оценки:', error);
      return null;
    }
  },

  // Получение всех оценок студента по предмету (для среднего балла)
  async getStudentSubjectMarks(studentId: number, subjectId: number): Promise<number[]> {
    try {
      const marks = await this.getStudentMarks(studentId);
      const subjectMarks = marks.find(m => m.subjectId === subjectId || m.idSubject === subjectId);
      if (subjectMarks && subjectMarks.marksBySt && Array.isArray(subjectMarks.marksBySt)) {
        return subjectMarks.marksBySt
          .map((m: any) => m.value)
          .filter((v: number) => v !== null && v !== undefined && v > 0);
      }
      return [];
    } catch (error) {
      console.error('Ошибка получения оценок студента по предмету:', error);
      return [];
    }
  },

  // Получение статистики пропусков студента (всего и по неуважительным причинам)
  async getStudentAttendanceStats(studentId: number, groupId: number): Promise<{ total: number; unjustified: number }> {
    try {
      const attendanceData = await this.getStudentAttendance(studentId);
      // attendanceData – массив предметов с посещаемостью
      let total = 0;
      let unjustified = 0;
      for (const subject of attendanceData) {
        if (subject.attendances) {
          for (const att of subject.attendances) {
            total++;
            if (att.status === 'н') {
              unjustified++;
            }
          }
        }
      }
      return { total, unjustified };
    } catch (error) {
      console.error('Ошибка получения статистики посещаемости:', error);
      return { total: 0, unjustified: 0 };
    }
  },



    // Восстановление пароля - отправка кода на email
  async sendPasswordResetCode(email: string, userId: number): Promise<boolean> {
    try {
      // Сначала проверяем/обновляем email пользователя
      const userType = await this.getUserTypeById(userId);
      if (userType) {
        await this.updateUserEmail(userId, email, userType);
      }
      
      const response = await fetch(`${API_BASE_URL}/api/v1/email/code/active/${userId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      return response.ok;
    } catch (error) {
      console.error('Ошибка при отправке кода восстановления:', error);
      return false;
    }
  },

  // Проверка кода и смена пароля
  async resetPasswordWithCode(userId: number, code: string, newPassword: string): Promise<boolean> {
    try {
      // Проверяем код
      const verifyResponse = await fetch(`${API_BASE_URL}/api/v1/email/password/id/${userId}/change/${code}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!verifyResponse.ok) {
        return false;
      }
      
      // Обновляем пароль
      const updateData = { id: userId, password: newPassword };
      
      // Пробуем обновить как студента
      let updateResponse = await fetch(`${API_BASE_URL}/api/v1/students/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      
      // Если не студент, пробуем как сотрудника
      if (!updateResponse.ok) {
        updateResponse = await fetch(`${API_BASE_URL}/api/v1/staffs/update`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        });
      }
      
      return updateResponse.ok;
    } catch (error) {
      console.error('Ошибка при смене пароля через код:', error);
      return false;
    }
  },

  // Получение ID пользователя по email
  async getUserIdByEmail(email: string): Promise<number | null> {
    try {
      // Проверяем среди студентов
      const studentsResponse = await fetch(`${API_BASE_URL}/api/v1/students`);
      if (studentsResponse.ok) {
        const students = await studentsResponse.json();
        const student = students.find((s: any) => s.email === email);
        if (student) return student.id;
      }
      
      // Проверяем среди сотрудников
      const staffResponse = await fetch(`${API_BASE_URL}/api/v1/staffs`);
      if (staffResponse.ok) {
        const staff = await staffResponse.json();
        const staffMember = staff.find((s: any) => s.email === email);
        if (staffMember) return staffMember.id;
      }
      
      return null;
    } catch (error) {
      console.error('Ошибка при поиске пользователя по email:', error);
      return null;
    }
  },

  // Получение типа пользователя по ID
  async getUserTypeById(userId: number): Promise<'student' | 'staff' | null> {
    try {
      const studentResponse = await fetch(`${API_BASE_URL}/api/v1/students/id/${userId}`);
      if (studentResponse.ok) return 'student';
      
      const staffResponse = await fetch(`${API_BASE_URL}/api/v1/staffs/id/${userId}`);
      if (staffResponse.ok) return 'staff';
      
      return null;
    } catch (error) {
      console.error('Ошибка при определении типа пользователя:', error);
      return null;
    }
  },

  // Обновление email пользователя
  async updateUserEmail(userId: number, email: string, userType: 'student' | 'staff'): Promise<boolean> {
    try {
      if (userType === 'student') {
        const getResponse = await fetch(`${API_BASE_URL}/api/v1/students/id/${userId}`);
        if (!getResponse.ok) return false;
        
        const studentData = await getResponse.json();
        
        const updateData = {
          id: userId,
          lastName: studentData.lastName,
          name: studentData.name,
          patronymic: studentData.patronymic,
          lastNameGenitive: studentData.lastNameGenitive,
          nameGenitive: studentData.nameGenitive,
          patronymicGenitive: studentData.patronymicGenitive,
          idGroup: studentData.idGroup,
          login: studentData.login,
          password: studentData.password,
          telephone: studentData.telephone,
          birthDate: studentData.birthDate,
          address: studentData.address,
          email: email,
          code: studentData.code
        };
        
        const updateResponse = await fetch(`${API_BASE_URL}/api/v1/students/update`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        });
        
        return updateResponse.ok;
      } else {
        const getResponse = await fetch(`${API_BASE_URL}/api/v1/staffs/id/${userId}`);
        if (!getResponse.ok) return false;
        
        const staffData = await getResponse.json();
        
        const updateData = {
          id: userId,
          lastName: staffData.lastName,
          name: staffData.name,
          patronymic: staffData.patronymic,
          login: staffData.login,
          email: email,
          telephone: staffData.telephone,
          birthDate: staffData.birthDate,
          address: staffData.address
        };
        
        const updateResponse = await fetch(`${API_BASE_URL}/api/v1/staffs/update`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        });
        
        return updateResponse.ok;
      }
    } catch (error) {
      console.error('Ошибка при обновлении email:', error);
      return false;
    }
  }
};