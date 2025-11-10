export const CACHE_TTL = {
  GROUP_DATA: 30 * 60 * 1000,      // 30 минут - редко меняются
  TEACHER_DATA: 60 * 60 * 1000,    // 1 час - редко меняются
  SUBJECT_DATA: 60 * 60 * 1000,    // 1 час - редко меняются
  STUDENT_MARKS: 5 * 60 * 1000,   // 5 минут - часто обновляться
  DOCUMENTS: 5 * 60 * 1000,        // 5 минут - часто добавляются/удаляются
  USER_DATA: 24 * 60 * 60 * 1000,  // 24 часа - редко меняются

  TEACHER_DISCIPLINES: 24 * 60 * 60 * 1000,  // 24 часа - редко меняются дисциплины преподавателя
  MARKS_DATA: 2 * 60 * 1000,
  STUDENT_DATA: 10 * 60 * 1000,
  LESSON_DATES: 30 * 60 * 1000,
  LESSON_INFO: 10 * 60 * 1000,
  SUBJECT_TEACHERS: 30 * 60 * 1000, 
  SUBGROUP_TEACHERS: 5 * 60 * 1000,
  SUBGROUP_DATA: 2 * 60 * 1000,
};

export {};