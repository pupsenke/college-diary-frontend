export interface Lesson {
  id: number;
  startTime: string;
  endTime: string;
  subject: string;
  group: number;
  room?: string;
}

export interface DaySchedule {
  date: { weekday: string; date: string };
  lessons: Lesson[];
  noClassesText?: string;
}

// Функция для преобразования времени в минуты
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Функция для получения текущего дня недели (0 - воскресенье, 1 - понедельник, и т.д.)
export function getCurrentDayIndex(): number {
  const today = new Date().getDay();
  // Преобразуем воскресенье (0) в 6 для соответствия нашему формату
  return today === 0 ? 6 : today - 1;
}

// Функция для получения следующей пары
export function getNextLesson(scheduleData: DaySchedule[]): Lesson | null {
  const currentDayIndex = getCurrentDayIndex();
  const currentTime = new Date();
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  
  // Ищем в расписании текущего дня
  const todaySchedule = scheduleData[currentDayIndex];
  
  if (!todaySchedule || todaySchedule.lessons.length === 0) {
    return null;
  }
  
  // Находим следующую пару (которая начинается после текущего времени)
  const nextLesson = todaySchedule.lessons.find(lesson => 
    timeToMinutes(lesson.startTime) > currentMinutes
  );
  
  return nextLesson || null;
}

// Функция для получения данных расписания (в реальном приложении это будет API запрос)
export function getScheduleData(): { upper: DaySchedule[]; lower: DaySchedule[] } {
  // Используем данные из ScheduleSection
  const upperWeekData: DaySchedule[] = [
    {
      date: { weekday: 'Понедельник', date: '22.09.2025' },
      lessons: [],
      noClassesText: "Нет пар"
    },
    {
      date: { weekday: 'Вторник', date: '23.09.2025' },
      lessons: [
        { id: 1, startTime: '10:20', endTime: '12:00', subject: 'Технология разработки и защиты баз данных', group: 3992, room: 'ауд. 124' },
        { id: 2, startTime: '12:45', endTime: '14:25', subject: 'Технология разработки и защиты баз данных', group: 3991, room: 'ауд. 124' },
        { id: 3, startTime: '14:35', endTime: '16:15', subject: 'Технология разработки и защиты баз данных', group: 3992, room: 'ауд. 124' },
      ],
    },
    {
      date: { weekday: 'Среда', date: '24.09.2025' },
      lessons: [
        { id: 3, startTime: '8:30', endTime: '10:10', subject: 'Технология разработки и защиты баз данных', group: 3991, room: 'ауд. 124' },
        { id: 4, startTime: '10:20', endTime: '12:00', subject: 'Оформление технической документации', group: 3991, room: 'ауд. 124' },
        { id: 5, startTime: '12:45', endTime: '14:25', subject: 'Технология разработки и защиты баз данных', group: 4996, room: 'ауд. 124' },
        { id: 6, startTime: '14:35', endTime: '16:15', subject: 'Технология разработки и защиты баз данных', group: 3992, room: 'ауд. 124' },
      ],
    },
    {
      date: { weekday: 'Четверг', date: '25.09.2025' },
      lessons: [
        { id: 7, startTime: '10:20', endTime: '12:00', subject: 'Технология разработки и защиты баз данных', group: 3992, room: 'ауд. 124' },
        { id: 8, startTime: '12:45', endTime: '14:25', subject: 'Технология разработки и защиты баз данных', group: 3991, room: 'ауд. 124' },
        { id: 9, startTime: '14:35', endTime: '16:15', subject: 'Технология разработки и защиты баз данных', group: 3992, room: 'ауд. 124' },
      ],
    },
    {
      date: { weekday: 'Пятница', date: '26.09.2025' },
      lessons: [],
      noClassesText: "Нет пар"
    },
    {
      date: { weekday: 'Суббота', date: '27.09.2025' },
      lessons: [],
      noClassesText: "Нет пар"
    },
  ];

  const lowerWeekData: DaySchedule[] = [
    {
      date: { weekday: 'Понедельник', date: '29.09.2025' },
      lessons: [],
      noClassesText: "Нет пар"
    },
    {
      date: { weekday: 'Вторник', date: '30.09.2025' },
      lessons: [
        { id: 1, startTime: '10:20', endTime: '12:00', subject: 'Технология разработки и защиты баз данных', group: 3992, room: 'ауд. 124' },
        { id: 2, startTime: '12:45', endTime: '14:25', subject: 'Технология разработки и защиты баз данных', group: 3991, room: 'ауд. 124' },
        { id: 3, startTime: '14:35', endTime: '16:15', subject: 'Технология разработки и защиты баз данных', group: 3992, room: 'ауд. 124' },
      ],
    },
    {
      date: { weekday: 'Среда', date: '01.10.2025' },
      lessons: [
        { id: 3, startTime: '8:30', endTime: '10:10', subject: 'Технология разработки и защиты баз данных', group: 3991, room: 'ауд. 124' },
        { id: 4, startTime: '10:20', endTime: '12:00', subject: 'Оформление технической документации', group: 3991, room: 'ауд. 124' },
        { id: 5, startTime: '12:45', endTime: '14:25', subject: 'Технология разработки и защиты баз данных', group: 4996, room: 'ауд. 124' },
        { id: 6, startTime: '14:35', endTime: '16:15', subject: 'Технология разработки и защиты баз данных', group: 3992, room: 'ауд. 124' },
      ],
    },
    {
      date: { weekday: 'Четверг', date: '02.10.2025' },
      lessons: [
        { id: 7, startTime: '10:20', endTime: '12:00', subject: 'Технология разработки и защиты баз данных', group: 3992, room: 'ауд. 124' },
        { id: 8, startTime: '12:45', endTime: '14:25', subject: 'Технология разработки и защиты баз данных', group: 3991, room: 'ауд. 124' },
        { id: 9, startTime: '14:35', endTime: '16:15', subject: 'Технология разработки и защиты баз данных', group: 3992, room: 'ауд. 124' },
      ],
    },
    {
      date: { weekday: 'Пятница', date: '03.10.2025' },
      lessons: [],
      noClassesText: "Нет пар"
    },
    {
      date: { weekday: 'Суббота', date: '04.10.2025' },
      lessons: [],
      noClassesText: "Нет пар"
    },
  ];

  return { upper: upperWeekData, lower: lowerWeekData };
}