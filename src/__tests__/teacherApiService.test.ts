import { teacherApiService } from '../services/teacherApiService';
const API_BASE_URL = 'http://80.93.62.33:8080';

global.fetch = jest.fn();

describe('teacherApiService.getTeacherById', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('возвращает преподавателя при успешном ответе', async () => {
    const mockTeacher = { 
      id: 1, 
      name: 'Михаил', 
      lastName: 'Богданов', 
      patronymic: 'Михайлович' 
    };
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockTeacher
    });

    const data = await teacherApiService.getTeacherById(1);
    expect(data).toEqual(mockTeacher);
    expect(fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/v1/staffs/id/1`,
      expect.objectContaining({
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    );
  });

  it('выбрасывает ошибку при неуспешном ответе', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => 'Not found'
    });

    await expect(teacherApiService.getTeacherById(9999))
      .rejects.toBeInstanceOf(Error);
  });
});