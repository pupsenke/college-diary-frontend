import { socialApiService } from '../services/socialApiService';
const API_BASE_URL = 'http://84.242.245.112:8080';

global.fetch = jest.fn();

describe('socialApiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('getGroupStats', () => {
    it('возвращает статистику группы', async () => {
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

      const stats = await socialApiService.getGroupStats(1);
      
      expect(stats).toEqual(mockStats);
      expect(fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/v1/groups/stats/1`,
        expect.any(Object)
      );
    });
  });

  describe('getGeneralStats', () => {
    it('возвращает общую статистику по группам', async () => {
      const mockStats = {
        totalGroups: 10,
        totalStudents: 250
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockStats
      });

      const stats = await socialApiService.getGeneralStats();
      
      expect(stats).toEqual(mockStats);
      expect(fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/v1/groups/general-stats`,
        expect.any(Object)
      );
    });
  });

  describe('getStatsByCourse', () => {
    it('возвращает статистику по курсам', async () => {
      const mockStats = [
        { course: 1, averageGrade: 4.1, attendancePercentage: 90.0 },
        { course: 2, averageGrade: 4.3, attendancePercentage: 87.5 },
        { course: 3, averageGrade: 4.0, attendancePercentage: 85.0 }
      ];

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockStats
      });

      const stats = await socialApiService.getStatsByCourse();
      
      expect(stats).toEqual(mockStats);
      expect(stats).toHaveLength(3);
    });
  });

  describe('getSocialCategoriesStats', () => {
    it('возвращает статистику по социальным категориям', async () => {
      const mockStats = [
        { categoryName: 'Сирота', studentsCount: 15, percentage: 6.0 },
        { categoryName: 'Инвалид', studentsCount: 10, percentage: 4.0 },
        { categoryName: 'Многодетная семья', studentsCount: 25, percentage: 10.0 }
      ];

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockStats
      });

      const stats = await socialApiService.getSocialCategoriesStats();
      
      expect(stats).toEqual(mockStats);
    });
  });
});