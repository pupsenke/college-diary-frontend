import {
  getCurrentWeekType,
  timeToMinutes,
  groupLessonsByTime,
  transformApiData,
} from '../st-components/ScheduleSectionST';
import { methodistApiService } from '../services/methodistApiService';

describe('Schedule Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('определяет тип недели', () => {
    // Исправлено: используем реальную дату, где верхняя неделя
    // 1 сентября 2025 года - начало учебного года (верхняя неделя)
    const testDate = new Date('2025-09-01');
    jest.useFakeTimers().setSystemTime(testDate);
    const weekType = getCurrentWeekType();
    expect(weekType).toBe('upper');
    console.log('Тест пройден: тип недели корректно определен как "upper"');
    jest.useRealTimers();
  });

  test('конвертирует время в минуты', () => {
    const testTime = '10:30';
    const minutes = timeToMinutes(testTime);
    expect(minutes).toBe(630);
    console.log('Тест пройден: время корректно конвертировано в минуты');
  });

  test('конвертирует время в минуты - полночь', () => {
    const testTime = '00:00';
    const minutes = timeToMinutes(testTime);
    expect(minutes).toBe(0);
  });

  test('конвертирует время в минуты - полдень', () => {
    const testTime = '12:00';
    const minutes = timeToMinutes(testTime);
    expect(minutes).toBe(720);
  });

  test('группирует уроки по времени', () => {
    const lessons = [
      {
        id: 1,
        startTime: '10:20',
        endTime: '12:00',
        subject: 'Математика',
        numPair: 2,
        dayWeek: 'Понедельник',
        typeWeek: 'Общая',
      },
      {
        id: 2,
        startTime: '10:20',
        endTime: '12:00',
        subject: 'Физика',
        numPair: 2,
        dayWeek: 'Понедельник',
        typeWeek: 'Общая',
      },
    ];
    const grouped = groupLessonsByTime(lessons as any);
    expect(grouped).toHaveLength(1);
    expect(grouped[0].lessons).toHaveLength(2);
    console.log('Тест пройден: уроки корректно сгруппированы по времени');
  });

  test('группирует уроки по времени - разные временные слоты', () => {
    const lessons = [
      {
        id: 1,
        startTime: '8:30',
        endTime: '10:10',
        subject: 'Математика',
        numPair: 1,
        dayWeek: 'Понедельник',
        typeWeek: 'Общая',
      },
      {
        id: 2,
        startTime: '10:20',
        endTime: '12:00',
        subject: 'Физика',
        numPair: 2,
        dayWeek: 'Понедельник',
        typeWeek: 'Общая',
      },
    ];
    const grouped = groupLessonsByTime(lessons as any);
    expect(grouped).toHaveLength(2);
    expect(grouped[0].lessons).toHaveLength(1);
    expect(grouped[1].lessons).toHaveLength(1);
  });

  test('transformApiData корректно преобразует данные', () => {
    const mockApiData = [
      {
        id: 1,
        dayWeek: 'Понедельник',
        typeWeek: 'Общая',
        numPair: 1,
        room: '101',
        idSt: 1,
        idGroup: 1,
        subgroup: null,
        replacement: false,
        idSubject: 1,
        nameSubject: 'Математика',
        idTeacher: 1,
        lastnameTeacher: 'Иванов',
        nameTeacher: 'Иван',
        patronymicTeacher: 'Иванович',
        numberGroup: 101,
      },
    ];
    const mockWeekDates = [
      {
        weekday: 'Понедельник',
        date: '01.01',
        isCurrentWeek: true,
      },
    ];
    const result = transformApiData(mockApiData as any, mockWeekDates as any);
    expect(result).toHaveLength(1);
    expect(result[0].lessons[0].subject).toBe('Математика');
    expect(result[0].lessons[0].startTime).toBeDefined();
    expect(typeof result[0].lessons[0].startTime).toBe('string');
    console.log('Тест пройден: данные корректно преобразованы');
  });
});