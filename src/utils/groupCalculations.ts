import { StudentInfo, GroupMark, GroupAttendance, LessonDate, SubjectTeacher } from '../services/headApiService';

// Расчет среднего балла студента по оценкам
export const calculateStudentAverage = (marks: GroupMark[], studentId: number): number => {
  const studentMarks = marks.filter(m => m.studentId === studentId && m.mark !== null && m.mark > 0);
  if (studentMarks.length === 0) return 0;
  const sum = studentMarks.reduce((total, m) => total + m.mark, 0);
  return sum / studentMarks.length;
};

// Расчет среднего балла группы по выбранному предмету
export const calculateGroupAverage = (students: StudentInfo[], marks: GroupMark[]): number => {
  if (students.length === 0) return 0;
  
  let totalSum = 0;
  let studentsWithMarks = 0;
  
  students.forEach(student => {
    const avg = calculateStudentAverage(marks, student.id);
    if (avg > 0) {
      totalSum += avg;
      studentsWithMarks++;
    }
  });
  
  return studentsWithMarks > 0 ? totalSum / studentsWithMarks : 0;
};

// Расчет процента посещаемости студента
export const calculateStudentAttendancePercent = (
  attendance: GroupAttendance[], 
  studentId: number, 
  lessonDates: LessonDate[]
): number => {
  const studentAttendances = attendance.filter(a => a.studentId === studentId);
  
  // Используем количество занятий из lessonDates как общее количество уроков
  const totalLessons = lessonDates.length;
  if (totalLessons === 0) return 0;
  
  const presentCount = studentAttendances.filter(a => a.status === 'п').length;
  return (presentCount / totalLessons) * 100;
};

// Расчет общего процента посещаемости группы по выбранному предмету
export const calculateGroupAttendancePercent = (
  students: StudentInfo[], 
  attendance: GroupAttendance[], 
  lessonDates: LessonDate[]
): number => {
  if (students.length === 0 || lessonDates.length === 0) return 0;
  
  let totalPresent = 0;
  let totalPossible = 0;
  
  students.forEach(student => {
    const studentAttendances = attendance.filter(a => a.studentId === student.id);
    const presentCount = studentAttendances.filter(a => a.status === 'п').length;
    totalPresent += presentCount;
    totalPossible += lessonDates.length;
  });
  
  return totalPossible > 0 ? (totalPresent / totalPossible) * 100 : 0;
};

// Получение всех оценок студента для расчета общего среднего балла
export interface StudentAllMarks {
  studentId: number;
  subjectMarks: {
    subjectId: number;
    subjectName: string;
    marks: GroupMark[];
    average: number;
  }[];
  overallAverage: number;
}

// Расчет общего среднего балла студента по всем предметам
export const calculateStudentOverallAverage = async (
  studentId: number,
  getStudentMarksForAllSubjects: (studentId: number) => Promise<{ subjectId: number; subjectName: string; marks: GroupMark[] }[]>
): Promise<number> => {
  try {
    const subjectsMarks = await getStudentMarksForAllSubjects(studentId);
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
    console.error('Ошибка расчета общего среднего балла студента:', error);
    return 0;
  }
};

// Расчет общего среднего балла группы по всем предметам
export const calculateGroupOverallAverage = async (
  students: StudentInfo[],
  getStudentOverallAverage: (studentId: number) => Promise<number>
): Promise<number> => {
  if (students.length === 0) return 0;
  
  let totalAverage = 0;
  let studentsWithMarks = 0;
  
  for (const student of students) {
    const avg = await getStudentOverallAverage(student.id);
    if (avg > 0) {
      totalAverage += avg;
      studentsWithMarks++;
    }
  }
  
  return studentsWithMarks > 0 ? totalAverage / studentsWithMarks : 0;
};

// Получение цветов для разных значений
export const getGradeColor = (grade: number | null): string => {
  if (grade === null) return '#d1d5db';
  if (grade === 0) return '#d1d5db';
  if (grade >= 4) return '#2cbb00';
  if (grade >= 3) return '#f59e0b';
  if (grade >= 1) return '#ef4444';
  return '#d1d5db';
};

export const getAttendancePercentColor = (percent: number): string => {
  if (percent >= 90) return '#2cbb00';
  if (percent >= 5) return '#a5db28';
  if (percent >= 20) return '#f59e0b';
  if (percent > 0) return '#ef4444';
  return '#d1d5db';
};

export const getStatusColor = (status: 'п' | 'у' | 'н' | null): string => {
  switch (status) {
    case 'п': return '#2cbb00';
    case 'у': return '#f59e0b';
    case 'н': return '#ef4444';
    default: return '#d1d5db';
  }
};

// Форматирование даты
export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('ru-RU');
  } catch {
    return dateStr;
  }
};

// Нормализация даты
export const normalizeDate = (date: string): string => {
  if (!date) return '';
  if (date.includes('-')) {
    return date.split('T')[0];
  }
  if (date.includes('.')) {
    const parts = date.split('.');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    if (parts.length === 2) {
      const currentYear = new Date().getFullYear();
      return `${currentYear}-${parts[1]}-${parts[0]}`;
    }
  }
  return date;
};