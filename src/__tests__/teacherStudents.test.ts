import { teacherApiService } from '../services/teacherApiService';
global.fetch = jest.fn();

describe('teacherApiService students methods', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('teacher_id', '1');
  });

  describe('getGroupStudents', () => {
    it('возвращает отсортированный список студентов', async () => {
      const mockStudents = [
        { id: 2, lastName: 'Шкиперова', firstName: 'Валерия', middleName: 'Анатольевна' },
        { id: 1, lastName: 'Темнева', firstName: 'Альбина', middleName: 'Руслановна' }
      ];
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockStudents
      });
      const data = await teacherApiService.getGroupStudents(1, 2, 1);
      expect(data[0].lastName).toBe('Темнева');
      expect(data[1].lastName).toBe('Шкиперова');
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/groups/marks/group?idGroup=1&idSt=2&idTeacher=1'
      );
    });

    it('обрабатывает ошибку при загрузке студентов', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404
      });

      await expect(teacherApiService.getGroupStudents(999, 2, 1))
        .rejects.toThrow('HTTP error! status: 404');
    });

    it('выбрасывает ошибку когда teacherId не найден в localStorage', async () => {
      localStorage.removeItem('teacher_id');
      
      await expect(teacherApiService.getGroupStudents(1, 2, 0))
        .rejects.toThrow('Teacher ID not found in localStorage');
    });
  });
});

