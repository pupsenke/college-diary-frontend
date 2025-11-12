import { teacherApiService } from '../services/teacherApiService';

global.fetch = jest.fn();

describe('teacherApiService students methods', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('getGroupStudents', () => {
    it('возвращает отсортированный список студентов', async () => {
      const mockStudents = [
        { idStudent: 2, lastName: 'Шкиперова', name: 'Валерия', patronymic: 'Анатольевна' },
        { idStudent: 1, lastName: 'Темнева', name: 'Альбина', patronymic: 'Руслановна' }
      ];
      
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockStudents
      });

      const data = await teacherApiService.getGroupStudents(1, 2);
      expect(data[0].lastName).toBe('Темнева');
      expect(data[1].lastName).toBe('Шкиперова');
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/groups/marks/group?idGroup=1&idSt=2'
      );
    });

    it('обрабатывает ошибку при загрузке студентов', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404
      });

      await expect(teacherApiService.getGroupStudents(999, 2))
        .rejects.toThrow('HTTP error! status: 404');
    });
  });
});

