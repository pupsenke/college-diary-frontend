import { teacherApiService } from '../services/teacherApiService';
const API_BASE_URL = 'http://80.93.62.33:8080';

global.fetch = jest.fn();
describe('teacherApiService groups methods', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('getTeacherGroups', () => {
    it('возвращает список групп преподавателя', async () => {
      const mockGroups = [
        { 
            numberGroup: '2991', 
            specialty: '09.02.07 Информационные системы и программирование', 
            subjectName: 'Разработка программных модулей', 
            countStudent: 25 }
      ];
      
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockGroups
      });

      const data = await teacherApiService.getTeacherGroups(1);
      expect(data).toEqual(mockGroups);
      expect(fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/v1/staffs/subjects/group/1`,
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('выбрасывает ошибку при неудачном запросе групп', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500
      });

      await expect(teacherApiService.getTeacherGroups(999))
        .rejects.toThrow('HTTP error! status: 500');
    });
  });
});


