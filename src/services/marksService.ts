// сервис для работы с оценками (пока что не трогаю, позже с успеваемостью разберусь)
import { cacheService } from './cacheService';
import { CACHE_TTL } from './cacheConstants';

const API_BASE_URL = 'http://localhost:8080/api/v1';

export interface Mark {
  id?: number;
  idStudent: number;
  idSt: number;
  idTeacher?: number;
  mark?: number | null;
  number: number;
  certification?: number | null;
}

export interface MarkInfo {
  id: number;
  date: string;
  typeMark: string;
  weight: number;
}

export interface TypeMark {
  id?: number;
  idSt: number;
  name: string;
  weight: number;
}

export interface GroupMarksResponse {
  studentId: number;
  studentName: string;
  marks: Mark[];
  certification?: number | null;
}

export const marksApiService = {
  // Добавление оценки группе
  async addGroupMark(markData: {
    idGroup: number;
    idSt: number;
    idTeacher?: number;
  }): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/marks/save/group`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(markData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка добавления оценки: ${response.status} - ${errorText}`);
    }

    // Инвалидируем кэш оценок для этой группы
    this.invalidateGroupMarksCache(markData.idGroup, markData.idSt);
  },

  // Удаление оценки группы
  async deleteGroupMark(markData: {
    idGroup: number;
    idSt: number;
    idTeacher?: number;
    number: number;
  }): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/marks/delete/group`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(markData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка удаления оценки: ${response.status} - ${errorText}`);
    }

    // Инвалидируем кэш оценок для этой группы
    this.invalidateGroupMarksCache(markData.idGroup, markData.idSt);
  },

  // Получение оценок группы
  async getGroupMarks(idGroup: number, idSt: number): Promise<GroupMarksResponse[]> {
    const cacheKey = `group_marks_${idGroup}_${idSt}`;
    
    const cached = cacheService.get<GroupMarksResponse[]>(cacheKey, {
      ttl: CACHE_TTL.MARKS_DATA,
    });

    if (cached) {
      console.log(`Group ${idGroup} marks loaded from cache`);
      return cached;
    }

    const response = await fetch(`${API_BASE_URL}/groups/marks/group?idGroup=${idGroup}&idSt=${idSt}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка загрузки оценок: ${response.status} - ${errorText}`);
    }

    const data: GroupMarksResponse[] = await response.json();
    
    cacheService.set(cacheKey, data, {
      ttl: CACHE_TTL.MARKS_DATA,
    });

    return data;
  },

  // Получение информации о столбце оценок
  async getMarkColumnInfo(idStudent: number, idSt: number, number: number): Promise<MarkInfo> {
    const cacheKey = `mark_info_${idStudent}_${idSt}_${number}`;
    
    const cached = cacheService.get<MarkInfo>(cacheKey, {
      ttl: CACHE_TTL.MARKS_DATA,
    });

    if (cached) {
      console.log('Mark info loaded from cache');
      return cached;
    }

    const response = await fetch(
      `${API_BASE_URL}/marks/info/column/student/${idStudent}/st/${idSt}/number/${number}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка загрузки информации об оценке: ${response.status} - ${errorText}`);
    }

    const data: MarkInfo = await response.json();
    
    cacheService.set(cacheKey, data, {
      ttl: CACHE_TTL.MARKS_DATA,
    });

    return data;
  },

  // Обновление одной оценки
  async updateSingleMark(markData: {
    idStudent: number;
    idSt: number;
    mark: number | null;
    number: number;
  }): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/marks/updateOneMark`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(markData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка обновления оценки: ${response.status} - ${errorText}`);
    }

    // Инвалидируем кэш оценок
    this.invalidateStudentMarksCache(markData.idStudent, markData.idSt);
  },

  // Обновление итоговой оценки
  async updateCertification(certificationData: {
    id: {
      idSt: number;
      idStudent: number;
    };
    certification: number;
  }): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/marks/update/certification`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(certificationData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка обновления итоговой оценки: ${response.status} - ${errorText}`);
    }

    // Инвалидируем кэш оценок
    this.invalidateStudentMarksCache(certificationData.id.idStudent, certificationData.id.idSt);
  },

  // Работа с типами оценок
  async addTypeMark(typeMarkData: TypeMark): Promise<TypeMark> {
    const response = await fetch(`${API_BASE_URL}/typeMarks/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(typeMarkData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка добавления типа оценки: ${response.status} - ${errorText}`);
    }

    return await response.json();
  },

  async deleteTypeMark(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/typeMarks/id/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка удаления типа оценки: ${response.status} - ${errorText}`);
    }
  },

  async updateTypeMark(typeMarkData: { id: number; weight: number; name?: string }): Promise<TypeMark> {
    const response = await fetch(`${API_BASE_URL}/typeMarks/update`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(typeMarkData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка обновления типа оценки: ${response.status} - ${errorText}`);
    }

    return await response.json();
  },

  // Инвалидация кэша
  invalidateGroupMarksCache(idGroup?: number, idSt?: number): void {
    if (idGroup && idSt) {
      cacheService.remove(`group_marks_${idGroup}_${idSt}`);
    }
    
    // Удаляем все связанные с оценками ключи
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('group_marks_') || key.includes('mark_info_'))) {
        cacheService.remove(key.replace('cache_', ''));
      }
    }
  },

  invalidateStudentMarksCache(idStudent?: number, idSt?: number): void {
    if (idStudent && idSt) {
      // Удаляем все связанные с студентом ключи оценок
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes(`mark_info_${idStudent}_${idSt}`)) {
          cacheService.remove(key.replace('cache_', ''));
        }
      }
    }
  },
};