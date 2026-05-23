import { cacheService } from './cacheService';
import { CACHE_TTL } from './cacheConstants';
import { API_BASE_URL } from '../constants/apiConstant';

function deduplicateByKey<T>(array: T[], key: keyof T): T[] {
  if (!array || !Array.isArray(array)) return [];
  return Array.from(new Map(array.map(item => [item[key], item])).values());
}

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
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  } catch (error) {
    clearTimeout(id);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Превышено время ожидания ответа от сервера');
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
  staffPosition: Array<{ id: number; name: string }>;
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

export interface Group {
  id: number;
  numberGroup: number;
  admissionYear: number;
  idCurator: number;
  course: number;
  formEducation: string;
  profile: string;
  specialty: string;
  departmentHead: number;
  currentSemester: number;
}

export interface GroupStats {
  groupNumber: number;
  course: number;
  specialty: string;
  studentsCount: number;
  totalSocialCategories: number;
  leadersFio: string;
  curatorFio: string;
  averageGrade: number;
  attendancePercentage: number;
}

export interface GeneralStats {
  totalGroups: number;
  totalStudents: number;
}

export interface CourseStatsApi {
  course: number;
  averageGrade: number;
  attendancePercentage: number;
}

export interface OverallStats {
  averageGrade: number;
  attendancePercentage: number;
}

export interface SocialCategoryStat {
  categoryName: string;
  studentsCount: number;
  percentage: number;
}

export interface StudentSocialCategoryDetail {
  categoryName: string;
  categoryData: string;
}

export interface StudentFullDetails {
  birthDate: string | null;
  telephone: string | null;
  email: string | null;
  address: string | null;
  educationBasis: string | null;
  socialCategories: StudentSocialCategoryDetail[];
}

export interface GroupCategoryStat {
  id: number;
  name: string;
  count: number;
}

export interface StudentPerformance {
  id: number;
  lastName: string;
  firstName: string;
  patronymic: string;
  averageGrade: number;
  attendanceCount: number;
}

export interface StudentDetail {
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
  isLeader: boolean;
  educationBasis: string | null;
}

export interface StudentInCategory {
  id: number;
  fio: string;
}

export interface SocialCategory {
  id: number;
  name: string;
}

export interface OrphanStudentApi {
  id: number;
  fio: string;
  numberGroup: number;
  specialty: string;
  birthDate: string | null;
  parentInfo: string | null;
  telephone: string | null;
  registrationAddress: string | null;
  guardian: string | null;
  educationForm: string | null;
  idGroup: number;
  idStudent: number;
  residenceAddressPhone?: string; // для PATCH, если API принимает
}

export interface DisabledStudentApi {
  id: number;
  fio: string;
  numberGroup: number;
  specialty: string;
  certificate: string | null;
  status: string | null;
  limitationType: string | null;
  birthDate: string | null;
  address: string | null;
  educationForm: string | null;
  idGroup: number;
  idStudent: number;
  telephone: string | null;
}

export interface CertificateFile {
  id: number;
  nameFile: string;
  pathToFile: string;
  idStudent: number;
  type: string;
}

const formatFioShort = (fullFio: string): string => {
  if (!fullFio) return '—';
  const parts = fullFio.trim().split(/\s+/);
  if (parts.length < 2) return fullFio;

  const lastName = parts[0];
  const firstInitial = parts[1]?.charAt(0)?.toUpperCase() || '';
  const patronymicInitial = parts[2]?.charAt(0)?.toUpperCase() || '';

  if (patronymicInitial) {
    return `${lastName} ${firstInitial}.${patronymicInitial}.`;
  }
  return `${lastName} ${firstInitial}.`;
};

const formatMultipleFio = (fioString: string): string[] => {
  if (!fioString) return ['—'];
  return fioString.split(',').map(f => formatFioShort(f.trim())).filter(f => f !== '—');
};

const calculateAge = (birthDate: string | null): number | null => {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

const formatDateRu = (dateStr: string | null): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('ru-RU');
};

const parseDateRuToIso = (dateStr: string | null): string | null => {
  if (!dateStr || dateStr === '—') return null;
  const parts = dateStr.split('.');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

export const socialApiService = {

  async getAllStaff(): Promise<StaffApiResponse[]> {
    const cacheKey = 'all_staff';
    const cached = cacheService.get<StaffApiResponse[]>(cacheKey, { ttl: CACHE_TTL.TEACHER_DATA });
    if (cached) return cached;

    const response = await fetch(`${API_BASE_URL}/api/v1/staffs`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка загрузки данных персонала: ${response.status}`);
    }

    const data: StaffApiResponse[] = await response.json();
    cacheService.set(cacheKey, data, { ttl: CACHE_TTL.TEACHER_DATA });
    return data;
  },

  async getStaffById(staffId: number): Promise<StaffApiResponse | null> {
    const cacheKey = `staff_${staffId}`;
    const cached = cacheService.get<StaffApiResponse>(cacheKey, { ttl: CACHE_TTL.TEACHER_DATA });
    if (cached) return cached;

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/staffs/id/${staffId}`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`HTTP ${response.status}`);
      }
      const data: StaffApiResponse = await response.json();
      cacheService.set(cacheKey, data, { ttl: CACHE_TTL.TEACHER_DATA });
      return data;
    } catch (error) {
      console.error(`Error fetching staff ${staffId}:`, error);
      return null;
    }
  },

  async getAllRooms(): Promise<Room[]> {
    const cacheKey = 'all_rooms';
    const cached = cacheService.get<Room[]>(cacheKey, { ttl: CACHE_TTL.GROUP_DATA });
    if (cached) return cached;

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/rooms`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: Room[] = await response.json();
      cacheService.set(cacheKey, data, { ttl: CACHE_TTL.GROUP_DATA });
      return data;
    } catch (error) {
      console.error('Error fetching rooms:', error);
      return [];
    }
  },

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

      if (!staffData) return null;

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

  async updateStaffData(staffId: number, data: BasicProfileUpdateData): Promise<{ success: boolean }> {
    const updatePayload: any = { id: staffId };
    if (data.email !== undefined) updatePayload.email = data.email;
    if (data.telephone !== undefined) updatePayload.telephone = data.telephone;

    const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/staffs/update`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка обновления данных: ${response.status} - ${errorText}`);
    }

    this.invalidateStaffCache(staffId);
    return { success: true };
  },

  async changePassword(staffId: number, passwordData: PasswordChangeData): Promise<{ success: boolean }> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/staffs/update`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: staffId, password: passwordData.newPassword }),
    });

    if (!response.ok) {
      throw new Error(`Ошибка смены пароля: ${response.status}`);
    }

    this.invalidateStaffCache(staffId);
    return { success: true };
  },

  invalidateStaffCache(staffId?: number): void {
    if (staffId) cacheService.remove(`staff_${staffId}`);
    cacheService.remove('all_staff');
  },

  invalidateRoomsCache(): void {
    cacheService.remove('all_rooms');
  },

  async refreshSocialWorkerData(staffId: number): Promise<SocialWorkerData | null> {
    this.invalidateStaffCache(staffId);
    this.invalidateRoomsCache();
    return this.getSocialWorkerData(staffId);
  },

  async getAllGroups(): Promise<Group[]> {
    return this._fetchWithCache<Group[]>(
      'all_groups',
      () => fetchWithTimeout(`${API_BASE_URL}/api/v1/groups`),
      CACHE_TTL.GROUP_DATA
    );
  },

  async getGroupStats(groupId: number): Promise<GroupStats> {
    return this._fetchWithCache<GroupStats>(
      `group_stats_${groupId}`,
      () => fetchWithTimeout(`${API_BASE_URL}/api/v1/groups/stats/${groupId}`),
      CACHE_TTL.GROUP_DATA
    );
  },

  async getGeneralStats(): Promise<GeneralStats> {
    return this._fetchWithCache<GeneralStats>(
      'groups_general_stats',
      () => fetchWithTimeout(`${API_BASE_URL}/api/v1/groups/general-stats`),
      CACHE_TTL.GROUP_DATA
    );
  },

  async getStatsByCourse(): Promise<CourseStatsApi[]> {
    return this._fetchWithCache<CourseStatsApi[]>(
      'students_stats_by_course',
      () => fetchWithTimeout(`${API_BASE_URL}/api/v1/students/stats/by-course`),
      CACHE_TTL.GROUP_DATA
    );
  },

  async getOverallStats(): Promise<OverallStats> {
    return this._fetchWithCache<OverallStats>(
      'students_overall_stats',
      () => fetchWithTimeout(`${API_BASE_URL}/api/v1/students/overall-stats`),
      CACHE_TTL.GROUP_DATA
    );
  },

  async getSocialCategoriesStats(): Promise<SocialCategoryStat[]> {
    return this._fetchWithCache<SocialCategoryStat[]>(
      'social_categories_stats',
      () => fetchWithTimeout(`${API_BASE_URL}/api/v1/social-categories/stats`),
      CACHE_TTL.GROUP_DATA
    );
  },

  async getGroupCategoryStats(groupId: number): Promise<GroupCategoryStat[]> {
    return this._fetchWithCache<GroupCategoryStat[]>(
      `group_category_stats_${groupId}`,
      () => fetchWithTimeout(`${API_BASE_URL}/api/v1/student-social-categories/group-stats/${groupId}`),
      CACHE_TTL.GROUP_DATA
    );
  },

  async getStudentFullDetails(studentId: number): Promise<StudentFullDetails | null> {
    const cacheKey = `student_details_${studentId}`;
    const cached = cacheService.get<StudentFullDetails>(cacheKey, { ttl: CACHE_TTL.STUDENT_DATA });
    if (cached) return cached;

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/students/details/${studentId}`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`HTTP ${response.status}`);
      }
      const data: StudentFullDetails = await response.json();
      cacheService.set(cacheKey, data, { ttl: CACHE_TTL.STUDENT_DATA });
      return data;
    } catch (error) {
      console.error(`Error fetching student details ${studentId}:`, error);
      return null;
    }
  },

  async getStudentsInCategory(groupId: number, categoryId: number): Promise<StudentInCategory[]> {
    const data = await this._fetchWithCache<StudentInCategory[]>(
      `students_in_category_${groupId}_${categoryId}`,
      () => fetchWithTimeout(`${API_BASE_URL}/api/v1/student-social-categories/students/${groupId}/${categoryId}`),
      CACHE_TTL.GROUP_DATA
    );

    const uniqueData = Array.from(
      new Map(data.map(s => [s.id, s])).values()
    );

    if (uniqueData.length !== data.length) {
      cacheService.set(`students_in_category_${groupId}_${categoryId}`, uniqueData, { ttl: CACHE_TTL.GROUP_DATA });
    }

    return uniqueData;
  },

  async getAllSocialCategories(): Promise<SocialCategory[]> {
    return this._fetchWithCache<SocialCategory[]>(
      'all_social_categories',
      () => fetchWithTimeout(`${API_BASE_URL}/api/v1/social-categories`),
      CACHE_TTL.GROUP_DATA
    );
  },

  async getStudentsPerformance(groupId: number): Promise<StudentPerformance[]> {
    return this._fetchWithCache<StudentPerformance[]>(
      `students_performance_${groupId}`,
      () => fetchWithTimeout(`${API_BASE_URL}/api/v1/students/group/${groupId}/performance`),
      CACHE_TTL.GROUP_DATA
    );
  },

  async getStudentById(studentId: number): Promise<StudentDetail> {
    return this._fetchWithCache<StudentDetail>(
      `student_${studentId}`,
      () => fetchWithTimeout(`${API_BASE_URL}/api/v1/students/id/${studentId}`),
      CACHE_TTL.STUDENT_DATA
    );
  },

  async getOrphans(): Promise<OrphanStudentApi[]> {
    const cacheKey = 'orphans_all';
    const cached = cacheService.get<OrphanStudentApi[]>(cacheKey, { ttl: CACHE_TTL.STUDENT_DATA });
    if (cached) return cached;

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/orphans/all`);
      if (!response.ok) {
        if (response.status === 404) return [];
        throw new Error(`HTTP ${response.status}`);
      }
      const data: OrphanStudentApi[] = await response.json();

      const formattedData = data.map(item => ({
        ...item,
        birthDate: formatDateRu(item.birthDate)
      }));

      cacheService.set(cacheKey, formattedData, { ttl: CACHE_TTL.STUDENT_DATA });
      return formattedData;
    } catch (error) {
      console.error('Error fetching orphans:', error);
      return [];
    }
  },

  async updateOrphan(id: number, data: Partial<OrphanStudentApi>): Promise<{ success: boolean }> {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/orphans/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка обновления: ${response.status} - ${errorText}`);
      }

      this.invalidateOrphansCache();
      return { success: true };
    } catch (error) {
      console.error('Error updating orphan:', error);
      throw error;
    }
  },

  async getInvalids(): Promise<DisabledStudentApi[]> {
    const cacheKey = 'invalids_all';
    const cached = cacheService.get<DisabledStudentApi[]>(cacheKey, { ttl: CACHE_TTL.STUDENT_DATA });
    if (cached) return cached;

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/invalids/all`);
      if (!response.ok) {
        if (response.status === 404) return [];
        throw new Error(`HTTP ${response.status}`);
      }
      const data: DisabledStudentApi[] = await response.json();

      const formattedData = data.map(item => ({
        ...item,
        birthDate: formatDateRu(item.birthDate)
      }));

      cacheService.set(cacheKey, formattedData, { ttl: CACHE_TTL.STUDENT_DATA });
      return formattedData;
    } catch (error) {
      console.error('Error fetching invalids:', error);
      return [];
    }
  },

  async updateInvalid(id: number, data: Partial<DisabledStudentApi>): Promise<{ success: boolean }> {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/invalids/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка обновления: ${response.status} - ${errorText}`);
      }

      this.invalidateInvalidsCache();
      return { success: true };
    } catch (error) {
      console.error('Error updating invalid:', error);
      throw error;
    }
  },

  async uploadCertificate(file: File, studentId: number): Promise<{ success: boolean; fileUrl?: string; fileId?: number }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('student', studentId.toString());
      formData.append('type', 'справка');

      const response = await fetch(`${API_BASE_URL}/api/v1/paths/upload`, {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка загрузки файла: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      this.invalidateCertificatesCache();
      
      return { 
        success: true, 
        fileUrl: result.fileUrl || result.pathToFile,
        fileId: result.id || result.fileId
      };
    } catch (error) {
      console.error('Error uploading certificate:', error);
      throw error;
    }
  },

  async getCertificates(): Promise<CertificateFile[]> {
    const cacheKey = 'certificates_all';
    const cached = cacheService.get<CertificateFile[]>(cacheKey, { ttl: CACHE_TTL.STUDENT_DATA });
    if (cached) return cached;

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/paths/type?type=справка`);
      if (!response.ok) {
        if (response.status === 404) return [];
        throw new Error(`HTTP ${response.status}`);
      }
      const data: CertificateFile[] = await response.json();
      cacheService.set(cacheKey, data, { ttl: CACHE_TTL.STUDENT_DATA });
      return data;
    } catch (error) {
      console.error('Error fetching certificates:', error);
      return [];
    }
  },

  async getStudentCertificates(studentId: number): Promise<CertificateFile[]> {
    const allCertificates = await this.getCertificates();
    return allCertificates.filter(cert => cert.idStudent === studentId);
  },

  async downloadFile(fileId: number): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/api/v1/paths/id/${fileId}`);
    if (!response.ok) {
      throw new Error(`Ошибка скачивания файла: ${response.status}`);
    }
    return response.blob();
  },

  async deleteCertificate(fileId: number): Promise<{ success: boolean }> {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/paths/delete/${fileId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      this.invalidateCertificatesCache();
      return { success: true };
    } catch (error) {
      console.error('Error deleting certificate:', error);
      throw error;
    }
  },

  getFileUrl(fileId: number): string {
    return `${API_BASE_URL}/api/v1/paths/id/${fileId}`;
  },

  invalidateOrphansCache(): void {
    cacheService.remove('orphans_all');
  },

  invalidateInvalidsCache(): void {
    cacheService.remove('invalids_all');
  },

  invalidateCertificatesCache(): void {
    cacheService.remove('certificates_all');
  },

  invalidateAllReportsCache(): void {
    this.invalidateOrphansCache();
    this.invalidateInvalidsCache();
    this.invalidateCertificatesCache();
  },

  // Загрузка отчета на сервер
  async uploadReport(file: File, studentId: number, type: 'сироты' | 'инвалиды'): Promise<{ success: boolean; fileId?: number; fileUrl?: string }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('student', studentId.toString());
      formData.append('type', type);

      const response = await fetch(`${API_BASE_URL}/api/v1/paths/upload`, {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка загрузки отчета: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      this.invalidateReportsCache();
      
      return { 
        success: true, 
        fileUrl: result.fileUrl || result.pathToFile,
        fileId: result.id || result.fileId
      };
    } catch (error) {
      console.error('Error uploading report:', error);
      throw error;
    }
  },

  // Получение всех отчетов по типу
  async getReportsByType(type: 'сироты' | 'инвалиды'): Promise<CertificateFile[]> {
    const cacheKey = `reports_${type}`;
    const cached = cacheService.get<CertificateFile[]>(cacheKey, { ttl: CACHE_TTL.STUDENT_DATA });
    if (cached) return cached;

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/paths/type?type=${encodeURIComponent(type)}`);
      if (!response.ok) {
        if (response.status === 404) return [];
        throw new Error(`HTTP ${response.status}`);
      }
      const data: CertificateFile[] = await response.json();
      cacheService.set(cacheKey, data, { ttl: CACHE_TTL.STUDENT_DATA });
      return data;
    } catch (error) {
      console.error(`Error fetching reports for type ${type}:`, error);
      return [];
    }
  },

  // Получение всех отчетов (объединяет оба типа)
  async getAllReports(): Promise<CertificateFile[]> {
    const [orphansReports, disabledReports] = await Promise.all([
      this.getReportsByType('сироты'),
      this.getReportsByType('инвалиды')
    ]);
    return [...orphansReports, ...disabledReports];
  },

  // Удаление отчета
  async deleteReport(fileId: number): Promise<{ success: boolean }> {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/paths/delete/${fileId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      this.invalidateReportsCache();
      return { success: true };
    } catch (error) {
      console.error('Error deleting report:', error);
      throw error;
    }
  },

  // Скачивание отчета
  async downloadReport(fileId: number): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/api/v1/paths/id/${fileId}`);
    if (!response.ok) {
      throw new Error(`Ошибка скачивания отчета: ${response.status}`);
    }
    return response.blob();
  },

  invalidateReportsCache(): void {
    cacheService.remove('reports_сироты');
    cacheService.remove('reports_инвалиды');
  },

  async _fetchWithCache<T>(
    cacheKey: string,
    fetchFn: () => Promise<Response>,
    ttl: number
  ): Promise<T> {
    const cached = cacheService.get<T>(cacheKey, { ttl });
    if (cached) return cached;

    try {
      const response = await fetchFn();
      const data: T = await response.json();
      cacheService.set(cacheKey, data, { ttl });
      return data;
    } catch (error) {
      const stale = cacheService.get<T>(cacheKey, { ttl: Infinity });
      if (stale) {
        console.warn(`[Cache] Using stale data for ${cacheKey}`);
        return stale;
      }
      throw error;
    }
  },

  invalidateGroupCache(groupId?: number): void {
    if (groupId) {
      cacheService.remove(`group_stats_${groupId}`);
      cacheService.remove(`group_category_stats_${groupId}`);
      cacheService.remove(`students_performance_${groupId}`);
    }
    cacheService.remove('all_groups');
    cacheService.remove('groups_general_stats');
    cacheService.remove('students_stats_by_course');
    cacheService.remove('students_overall_stats');
    cacheService.remove('social_categories_stats');
    cacheService.remove('all_social_categories');
  },

  formatFioShort,
  formatMultipleFio,
  calculateAge,
  formatDateRu,
  parseDateRuToIso
};