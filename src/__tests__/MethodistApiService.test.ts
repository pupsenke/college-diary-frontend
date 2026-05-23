import { methodistApiService } from '../services/methodistApiService';

describe('MethodistApiService', () => {
  describe('formatTeacherName', () => {
    test('форматирует ФИО преподавателя', () => {
      expect(
        methodistApiService.formatTeacherName('Иванов', 'Иван', 'Иванович')
      ).toBe('Иванов И.И.');
    });

    test('возвращает пустую строку без обязательных данных', () => {
      expect(methodistApiService.formatTeacherName(null, 'Иван', 'Иванович')).toBe('');
    });
  });

  describe('formatRoom', () => {
    test('форматирует обычную аудиторию', () => {
      expect(methodistApiService.formatRoom('101')).toBe('ауд.101');
    });

    test('не меняет аудиторию НовГУ', () => {
      expect(methodistApiService.formatRoom('НовГУ 101')).toBe('НовГУ 101');
    });
  });

  describe('getPairTime', () => {
    test('возвращает время для пары', () => {
      expect(methodistApiService.getPairTime(1)).toEqual({ start: '8:30', end: '10:10' });
    });

    test('возвращает пустые строки для неизвестной пары', () => {
      expect(methodistApiService.getPairTime(99)).toEqual({ start: '', end: '' });
    });
  });

  describe('getWeekDays', () => {
    test('возвращает 6 дней недели', () => {
      expect(methodistApiService.getWeekDays()).toEqual([
        'Понедельник',
        'Вторник',
        'Среда',
        'Четверг',
        'Пятница',
        'Суббота',
      ]);
    });
  });

  describe('normalizeWeekType', () => {
    test.each([
      ['Нижняя', 'lower'],
      ['Верхняя', 'upper'],
      ['Общая', 'common'],
      [undefined, 'common'],
    ])('преобразует %p в %p', (input, expected) => {
      expect(methodistApiService.normalizeWeekType(input as any)).toBe(expected);
    });
  });

  describe('getDayWeekForApi', () => {
    test('возвращает день недели для даты', () => {
      expect(methodistApiService.getDayWeekForApi(new Date('2024-01-01'))).toBe('Понедельник');
    });

    test('возвращает воскресенье', () => {
      expect(methodistApiService.getDayWeekForApi(new Date('2024-01-07'))).toBe('Воскресенье');
    });
  });

  describe('getWeekType', () => {
    test('определяет тип недели', () => {
      expect(methodistApiService.getWeekType(new Date('2025-09-01'))).toBe('Верхняя');
      expect(methodistApiService.getWeekType(new Date('2025-09-08'))).toBe('Нижняя');
    });
  });

  describe('replacements', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => localStorage.clear());

    test('сохраняет и получает замену', () => {
      const replacement = {
        id: '1',
        date: '2024-01-01',
        displayDate: '01.01.2024',
        groupNumber: 101,
        pairNumber: 1,
        subgroup: null,
        subject: 'Математика',
        teacher: 'Иванов И.',
        room: '101',
        type: 'replacement' as const,
        createdAt: '2024-01-01T10:00:00Z',
      };

      methodistApiService.saveReplacement(replacement);
      expect(methodistApiService.getReplacements()).toHaveLength(1);
    });

    test('удаляет замену', () => {
      const replacement = {
        id: '1',
        date: '2024-01-01',
        displayDate: '01.01.2024',
        groupNumber: 101,
        pairNumber: 1,
        subgroup: null,
        subject: 'Математика',
        teacher: 'Иванов И.',
        room: '101',
        type: 'replacement' as const,
        createdAt: '2024-01-01T10:00:00Z',
      };

      methodistApiService.saveReplacement(replacement);
      methodistApiService.deleteReplacement('1');
      expect(methodistApiService.getReplacements()).toHaveLength(0);
    });
  });
});