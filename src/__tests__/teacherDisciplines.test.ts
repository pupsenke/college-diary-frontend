import { teacherApiService } from '../services/teacherApiService';

global.fetch = jest.fn();

describe('teacherApiService.getTeacherDisciplines', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('возвращает уникальные дисциплины', async () => {
    const mockDisciplines = [
      { idTeacher: 1, idSubject: 1, subjectName: 'Разработка программных модулей', idGroups: [1] },
      { idTeacher: 1, idSubject: 2, subjectName: 'Разработка программных модулей', idGroups: [2] }
    ];
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockDisciplines
    });

    const data = await teacherApiService.getTeacherDisciplines(1);
    expect(data).toEqual(['Разработка программных модулей']);
  });
});

