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

export interface Document {
  id: number;
  nameFile: string;
  pathToFile: string;
  accessStudent: number | null;
  accessTeacher: any;
  staffs: any[];
  title?: string;
  type?: string;
  creationDate?: string;
  studentId?: number;
}

export interface UploadDocumentResponse {
  id: number;
  nameFile: string;
  pathToFile: string;
  message: string;
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

  // Получение предмета по ID
  async getSubjectById(subjectId: number): Promise<any> {
    console.log(`Fetching subject data for ID: ${subjectId}`);
    const response = await fetch(`${API_BASE_URL}/subjects/id/${subjectId}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      throw new Error(`Ошибка загрузки данных предмета: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Subject data received:', data);
    return data;
  },

  // Авторизация студента
  async loginStudent(login: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/students/login/${login}/password/${password}`);
    if (!response.ok) throw new Error('Ошибка авторизации студента');
    const data: StudentData = await response.json();
    
    return {
      ...data,
      userType: 'student' as const,
      numberGroup: 0 // Временное значение, обновляется после получения данных группы
    };
  },

  // Обновление данных студента 
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


  // === УСПЕВАЕМОСТЬ ===

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
  },


  // === ДОКУМЕНТЫ ===

  // Получение всех документов
  async getAllDocuments(): Promise<Document[]> {
    console.log('Fetching all documents');
    const response = await fetch(`${API_BASE_URL}/paths`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      throw new Error(`Ошибка загрузки документов: ${response.status}`);
    }
    
    const data: Document[] = await response.json();
    console.log('All documents received:', data);
    return data;
  },

  // Список документов по id студента
  async fetchDocumentsByStudent(studentId: number): Promise<Document[]> {
    console.log(`Fetching documents for student ID: ${studentId}`);
    const response = await fetch(`${API_BASE_URL}/paths`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      throw new Error(`Ошибка получения списка документов: ${response.status}`);
    }
    
    const data: Document[] = await response.json();
    // Фильтрация документов, где accessStudent совпадает с studentId
    const studentDocuments = data.filter(doc => doc.accessStudent === studentId);
    console.log(`Student documents received: ${studentDocuments.length} documents`);
    return studentDocuments;
  },

  // Загрузка документа на сервер (PUT запрос)
  async uploadDocument(file: File): Promise<void> {
    console.log('Uploading document:', { fileName: file.name });
    
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/paths/upload`, {
      method: 'PUT',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Upload failed:', response.status, errorText);
      throw new Error(`Ошибка загрузки документа: ${response.status} - ${errorText}`);
    }

    console.log('Document uploaded successfully');
  },

  // Исправленная функция скачивания документа
  async downloadDocument(id: number): Promise<void> {
    console.log(`Downloading document with ID: ${id}`);
    
    try {
      // 1. Получаем информацию о документе
      const docsResponse = await fetch(`${API_BASE_URL}/paths`);
      if (!docsResponse.ok) {
        throw new Error('Не удалось получить список документов');
      }
      
      const allDocuments = await docsResponse.json();
      const documentInfo = allDocuments.find((doc: Document) => doc.id === id);
      
      if (!documentInfo) {
        throw new Error(`Документ с ID ${id} не найден`);
      }

      console.log('Found document:', documentInfo);

      // 2. Скачиваем файл - важно указать правильные заголовки
      const fileResponse = await fetch(`${API_BASE_URL}/paths/id/${id}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/octet-stream', // Важно для бинарных данных
        },
      });

      if (!fileResponse.ok) {
        throw new Error(`HTTP error! status: ${fileResponse.status}`);
      }

      // 3. Получаем blob с правильным типом
      const blob = await fileResponse.blob();
      
      // 4. Определяем MIME тип и имя файла
      let filename = documentInfo.nameFile;
      let mimeType = 'application/octet-stream'; // тип по умолчанию

      // Определяем MIME тип по расширению файла
      if (filename) {
        const extension = filename.split('.').pop()?.toLowerCase();
        const mimeTypes: { [key: string]: string } = {
          'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'doc': 'application/msword',
          'pdf': 'application/pdf',
          'png': 'image/png',
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'txt': 'text/plain',
        };
        mimeType = mimeTypes[extension] || 'application/octet-stream';
      }

      // 5. Создаем blob с правильным типом
      const typedBlob = new Blob([blob], { type: mimeType });

      // 6. Создаем ссылку для скачивания
      const url = window.URL.createObjectURL(typedBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `document_${id}`;
      
      // 7. Добавляем в DOM и кликаем
      document.body.appendChild(link);
      link.click();
      
      // 8. Очистка
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log(`Document downloaded successfully: ${filename}`);

    } catch (error) {
      console.error('Download error:', error);
      throw new Error(`Не удалось скачать документ: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  },

  // Удаление документа
  async deleteDocument(id: number): Promise<void> {
    console.log(`Deleting document with ID: ${id}`);
    const response = await fetch(`${API_BASE_URL}/paths/delete/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      throw new Error(`Ошибка удаления документа: ${response.status}`);
    }

    console.log('Document deleted successfully');
  },
}