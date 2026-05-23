import axios from 'axios';
import { API_BASE_URL } from '../constants/apiConstant';

// типы данных
export interface ApiGroup {
  id: number;
  numberGroup: number;
  specialty: string;
  course: number;
  admissionYear?: number;
  idCurator?: number;
  formEducation?: string;
  profile?: string;
}

export interface ApiSubject {
  id: number;
  subjectName: string;
}

export interface ApiStaff {
  id: number;
  name: string;
  lastName: string;
  patronymic?: string;
  staffPosition?: { id: number; name: string }[];
  login?: string;
  email?: string;
}

export interface ApiRoom {
  id: number;
  name: string;
  idStaffOwner: number | null;
}

export interface ApiSchedule {
  id: number;
  dayWeek: string;
  typeWeek: string;
  numPair: number;
  room: string | null;
  idSt: number;
  idGroup: number;
  subgroup: number | null;
  replacement: boolean;
  dateReplacement: string | null;
}

export interface ApiSubjectTeacher {
  id: number;
  teachers: number[];
  idSubject: number;
  groups: number[];
}

export interface TeacherGroupSubject {
  idSt: number;
  subjectName: string;
  idGroups: number[];
}

export interface TeacherOption {
  id: number;
  name: string;
}

export interface SubjectOption {
  id: number;
  name: string;
}

export interface SchedulePair {
  id: number;
  groupId: number;
  groupNumber: number;
  pairNumber: number;
  room: string;
  teacherId: number;
  teacherName: string;
  subjectId: number;
  subjectName: string;
  subgroup: number | null;
  dayWeek: string;
  typeWeek: string;
}

export interface ReplacementRecord {
  id: string;
  date: string;
  displayDate: string;
  groupNumber: number;
  pairNumber: number;
  subgroup: number | null;
  subject: string;
  teacher: string;
  room: string;
  type: 'notWillBe' | 'replacement';
  newSubject?: string;
  newTeacher?: string;
  newRoom?: string;
  createdAt: string;
}

export interface ApiScheduleItem {
  id: number;
  dayWeek: string;
  typeWeek: string;
  numPair: number;
  room: string | null;
  idSt: number;
  idSubject: number;
  nameSubject: string;
  idTeacher: number | null;
  lastnameTeacher: string | null;
  nameTeacher: string | null;
  patronymicTeacher: string | null;
  idGroup: number;
  numberGroup: number;
  subgroup: number | null;
  replacement: boolean;
  dateReplacement: string | null;
  isIgnored?: boolean;
}

export interface ApiSubjectWithTeachers {
  idSt: number;
  idSubject: number;
  nameSubject: string;
  teachers: {
    idTeacher: number;
    lastnameTeacher: string;
    nameTeacher: string;
    patronymicTeacher: string;
  }[];
}

export interface PathTypeResponse {
  id: number;
  nameFile: string;
  pathToFile: string;
  idStudent: number | null;
  accessTeacher: boolean | null;
}

export interface SaveSchedulePayload {
  dayWeek: string;
  typeWeek: string;
  numPair: number;
  room: string | null;
  idSt: number;
  idGroup: number;
  subgroup: number | null;
  replacement: boolean;
  dateReplacement?: string | null;
  isIgnored?: boolean;
}

// сервис
class MethodistApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  // группы
  async getGroups(): Promise<ApiGroup[]> {
    const response = await axios.get<ApiGroup[]>(`${this.baseUrl}/api/v1/groups`);
    return response.data;
  }

  // преподаватели (Staff)
  async getStaffMembers(): Promise<ApiStaff[]> {
    const response = await axios.get<ApiStaff[]>(`${this.baseUrl}/api/v1/staffs`);
    return response.data;
  }

  async getStaffById(id: number): Promise<ApiStaff> {
    const response = await axios.get<ApiStaff>(`${this.baseUrl}/api/v1/staffs/id/${id}`);
    return response.data;
  }

  async updateStaffEmail(id: number, email: string): Promise<ApiStaff> {
    const response = await axios.patch<ApiStaff>(`${this.baseUrl}/api/v1/staffs/update`, {
      id,
      email
    });
    return response.data;
  }

  async getTeachers(): Promise<TeacherOption[]> {
    const staff = await this.getStaffMembers();
    return staff
      .filter(st => st.staffPosition?.some(pos => pos.id === 9))
      .map(st => ({
        id: st.id,
        name: `${st.lastName} ${st.name} ${st.patronymic || ''}`.trim()
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // предметы 
  async getSubjects(): Promise<ApiSubject[]> {
    const response = await axios.get<ApiSubject[]>(`${this.baseUrl}/api/v1/subjects`);
    return response.data;
  }

  async getSubjectTeachers(): Promise<ApiSubjectTeacher[]> {
    const response = await axios.get<ApiSubjectTeacher[]>(`${this.baseUrl}/api/v1/st`);
    return response.data;
  }

  async getTeacherGroups(teacherId: number): Promise<TeacherGroupSubject[]> {
    const response = await axios.get<TeacherGroupSubject[]>(`${this.baseUrl}/api/v1/st/teacherGroups/${teacherId}`);
    return response.data;
  }

  async getGroupSubjects(groupId: number): Promise<ApiSubjectWithTeachers[]> {
    const response = await axios.get<ApiSubjectWithTeachers[]>(
      `${this.baseUrl}/api/v1/groups/subjects/group/${groupId}`
    );
    return response.data;
  }

  // аудитории 
  async getRooms(): Promise<ApiRoom[]> {
    const response = await axios.get<ApiRoom[]>(`${this.baseUrl}/api/v1/rooms`);
    return response.data;
  }

  async getRoomOptions(): Promise<{ id: number; name: string }[]> {
    const rooms = await this.getRooms();
    return rooms.map(room => ({ id: room.id, name: room.name }));
  }

  // расписание
  async getSchedule(): Promise<ApiSchedule[]> {
    const response = await axios.get<ApiSchedule[]>(`${this.baseUrl}/api/v1/schedule`);
    return response.data;
  }

  async getScheduleByGroup(groupId: number): Promise<ApiScheduleItem[]> {
    const response = await axios.get<ApiScheduleItem[]>(
      `${this.baseUrl}/api/v1/schedule/group/${groupId}`
    );
    return response.data;
  }

  async saveSchedule(payload: SaveSchedulePayload): Promise<ApiSchedule> {
    const response = await axios.post<ApiSchedule>(`${this.baseUrl}/api/v1/schedule/save`, {
      ...payload,
      dateReplacement: payload.dateReplacement || null,
      isIgnored: payload.isIgnored !== undefined ? payload.isIgnored : false // ✅ По умолчанию isIgnored: false
    });
    return response.data;
  }

  // удаление занятия
  async deleteSchedule(scheduleId: number): Promise<void> {
    try {
      await axios.delete(`${this.baseUrl}/api/v1/schedule/delete/${scheduleId}`);
    } catch (error) {
      console.error(`Ошибка при удалении занятия с ID ${scheduleId}:`, error);
      throw error;
    }
  }

  // обновление флага isIgnored
  async updateScheduleIgnored(scheduleId: number, isIgnored: boolean): Promise<any> {
    try {
      const response = await axios.patch(`${this.baseUrl}/api/v1/schedule/update-ignored/${scheduleId}`, {
        isIgnored
      });
      return response.data;
    } catch (error) {
      console.error(`Ошибка при обновлении флага ignored для занятия с ID ${scheduleId}:`, error);
      throw error;
    }
  }

  // получение расписания группы с фильтрацией по isIgnored
  async getScheduleByGroupWithIgnored(groupId: number): Promise<ApiScheduleItem[]> {
    const response = await axios.get<ApiScheduleItem[]>(
      `${this.baseUrl}/api/v1/schedule/group/${groupId}`
    );
    // фильтруем занятия, оставляем только те, у которых isIgnored: false
    return response.data.filter(item => item.isIgnored === false);
  }

  // файлы (Path) 
  async uploadFile(file: File, type: string, studentId?: number): Promise<PathTypeResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    if (studentId) {
      formData.append('student', studentId.toString());
    }

    const response = await axios.put<PathTypeResponse>(
      `${this.baseUrl}/api/v1/paths/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  }

  async getFilesByType(type: string): Promise<PathTypeResponse[]> {
    const response = await axios.get<PathTypeResponse[] | PathTypeResponse>(
      `${this.baseUrl}/api/v1/paths/type?type=${encodeURIComponent(type)}`
    );
    return Array.isArray(response.data) ? response.data : [response.data];
  }

  async downloadFile(fileId: number): Promise<Blob> {
    const response = await axios.get(`${this.baseUrl}/api/v1/paths/id/${fileId}`, {
      responseType: 'blob',
    });
    return response.data;
  }

  async deleteFile(fileId: number): Promise<void> {
    try {
      await axios.delete(`${this.baseUrl}/api/v1/paths/delete/${fileId}`);
    } catch (error) {
      console.error(`Ошибка при удалении файла с ID ${fileId}:`, error);
      throw error;
    }
  }

  // замены (LocalStorage)
  private getStorageKey(): string {
    return 'scheduleReplacements';
  }

  getReplacements(): ReplacementRecord[] {
    const existingData = localStorage.getItem(this.getStorageKey());
    return existingData ? JSON.parse(existingData) : [];
  }

  saveReplacement(record: ReplacementRecord): void {
    const replacements = this.getReplacements();
    replacements.push(record);
    localStorage.setItem(this.getStorageKey(), JSON.stringify(replacements));
  }

  updateReplacements(replacements: ReplacementRecord[]): void {
    localStorage.setItem(this.getStorageKey(), JSON.stringify(replacements));
  }

  deleteReplacement(id: string): void {
    const replacements = this.getReplacements();
    const filtered = replacements.filter(r => r.id !== id);
    localStorage.setItem(this.getStorageKey(), JSON.stringify(filtered));
  }

  // удаление замен по массиву ID
  deleteReplacementsByIds(ids: string[]): void {
    const replacements = this.getReplacements();
    const filtered = replacements.filter(r => !ids.includes(r.id));
    localStorage.setItem(this.getStorageKey(), JSON.stringify(filtered));
  }

  // очистка замен по дате
  clearReplacementsByDate(date: string): void {
    const replacements = this.getReplacements();
    const filtered = replacements.filter(r => r.date !== date);
    localStorage.setItem(this.getStorageKey(), JSON.stringify(filtered));
  }

  clearReplacements(): void {
    localStorage.removeItem(this.getStorageKey());
  }

  // вспомогательные методы
  getDayWeekForApi(date: Date): string {
    const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    return days[date.getDay()];
  }

  getWeekType(date: Date): 'Верхняя' | 'Нижняя' {
    const weekNumber = Math.ceil(
      (date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)
    );
    return weekNumber % 2 === 0 ? 'Нижняя' : 'Верхняя';
  }

  getCurrentWeekType(): 'upper' | 'lower' {
    const today = new Date();
    const startOfAcademicYear = new Date(2025, 8, 1);
    const diffTime = today.getTime() - startOfAcademicYear.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const weekNumber = Math.floor(diffDays / 7) + 1;
    return weekNumber % 2 === 1 ? 'upper' : 'lower';
  }

  formatTeacherName(lastname: string | null, name: string | null, patronymic: string | null): string {
    if (!lastname || !name) return '';
    const firstName = name.charAt(0) + '.';
    const patronymicInitial = patronymic && patronymic.length > 0 ? patronymic.charAt(0) + '.' : '';
    return `${lastname} ${firstName}${patronymicInitial}`.trim();
  }

  formatRoom(room: string | null): string {
    if (!room) return '';
    if (room.includes('НовГУ') || room.includes('НовГу')) {
      return room;
    }
    return `ауд.${room}`;
  }

  getPairTime(pairNumber: number): { start: string; end: string } {
    const pairTimes: Record<number, { start: string; end: string }> = {
      1: { start: '8:30', end: '10:10' },
      2: { start: '10:20', end: '12:00' },
      3: { start: '12:45', end: '14:25' },
      4: { start: '14:35', end: '16:15' },
      5: { start: '16:25', end: '18:05' },
      6: { start: '18:15', end: '19:55' },
      7: { start: '20:05', end: '21:45' },
      8: { start: '21:55', end: '23:35' },
    };
    return pairTimes[pairNumber] || { start: '', end: '' };
  }

  getWeekDays(): string[] {
    return ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  }

  normalizeWeekType(typeWeek: string | undefined): 'upper' | 'lower' | 'common' {
    if (!typeWeek) return 'common';
    const lowerType = typeWeek.toLowerCase();
    if (lowerType === 'нижняя') return 'lower';
    if (lowerType === 'верхняя') return 'upper';
    return 'common';
  }
}

export const methodistApiService = new MethodistApiService();
export default methodistApiService;