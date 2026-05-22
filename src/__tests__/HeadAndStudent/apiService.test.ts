import { headApiService } from '../../services/headApiService';
import { API_BASE_URL } from '../../constants/apiConstant';

global.fetch = jest.fn();

describe('apiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getGroups', () => {
    test('должен возвращать список групп при успешном запросе', async () => {
      const mockGroups = [
        { id: 1, numberGroup: 2991, course: 4, specialty: '09.02.07' },
        { id: 2, numberGroup: 2992, course: 3, specialty: '09.02.07' },
      ];
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockGroups,
      });
      
      const result = await headApiService.getGroups();
      expect(result).toEqual(mockGroups);
      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/api/v1/groups`);
    });

    test('должен фильтровать группы по профилю', async () => {
      const mockGroups = [
        { id: 1, numberGroup: 2991, profile: 'Информационные системы' },
        { id: 2, numberGroup: 2992, profile: 'Программирование' },
      ];
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockGroups,
      });
      
      const result = await headApiService.getGroups('информационные');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    test('должен выбрасывать ошибку при неуспешном запросе', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });
      
      await expect(headApiService.getGroups()).rejects.toThrow();
    });
  });

  describe('getGroupStudents', () => {
    test('должен возвращать список студентов группы', async () => {
      const mockStudents = [
        { id: 1, lastName: 'Иванов', name: 'Иван', patronymic: 'Иванович' },
        { id: 2, lastName: 'Петров', name: 'Петр', patronymic: 'Петрович' },
      ];
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockStudents,
      });
      
      const result = await headApiService.getGroupStudents(1);
      expect(result).toHaveLength(2);
      expect(result[0].lastName).toBe('Иванов');
      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/api/v1/students/group/1`);
    });
  });

  describe('updateGroupCurator', () => {
    test('должен успешно обновлять куратора группы', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });
      
      const result = await headApiService.updateGroupCurator(1, 10);
      expect(result).toEqual({ success: true });
      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/api/v1/groups/update`, expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ id: 1, idCurator: 10 }),
      }));
    });
  });
});