import { teacherApiService } from '../services/teacherApiService';
const API_BASE_URL = 'http://84.242.245.112:8080';

global.fetch = jest.fn();

describe('teacherApiService curator methods', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('getCuratorGroupStats', () => {
    it('возвращает статистику группы куратора', async () => {
      const mockStats = {
        groupNumber: 2991,
        course: 3,
        specialty: 'Информационные системы',
        studentsCount: 25,
        totalSocialCategories: 5,
        leadersFio: 'Иванов И.И.',
        curatorFio: 'Петров П.П.',
        averageGrade: 4.2,
        attendancePercentage: 88.5
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockStats
      });

      const stats = await teacherApiService.getCuratorGroupStats(1);
      
      expect(stats).toEqual(mockStats);
      expect(fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/v1/groups/stats/1`,
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });
  });

  describe('getGroupLeader', () => {
    it('возвращает данные старосты группы', async () => {
      const mockLeader = [
        { fio: 'Иванов Иван Иванович', telephone: '+7(999)123-45-67', email: 'ivanov@example.com' }
      ];

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockLeader
      });

      const leader = await teacherApiService.getGroupLeader(1);
      
      expect(leader).toEqual(mockLeader[0]);
      expect(fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/v1/students/group/1/leaders`,
        expect.any(Object)
      );
    });
  });
});