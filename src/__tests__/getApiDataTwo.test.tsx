import { apiService } from "../services/studentApiService";

global.fetch = jest.fn();

describe("apiService.getStudentData", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("возвращает студента при успешном ответе", async () => {
    const mockStudent = { id: 123, name: "Иван", idGroup: 101 };
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockStudent
    });

    const data = await apiService.getStudentData(123);
    expect(data).toEqual(mockStudent);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/students/id/123")
    );
  });

  it("выбрасывает ошибку при неуспешном ответе", async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "Server error"
    });

    await expect(apiService.getStudentData(9999)).rejects.toBeInstanceOf(Error);
  });
});
