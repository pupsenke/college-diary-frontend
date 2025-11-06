import { apiService } from "../services/studentApiService";

global.fetch = jest.fn();

describe("apiService.getGroupData", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("возвращает корректные данные при успешном запросе", async () => {
    const mockGroup = { id: 1, numberGroup: 2991, idCurator: 1 };
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockGroup
    });

    const data = await apiService.getGroupData(1);
    expect(data).toEqual(mockGroup);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/groups/id/1")
    );
  });

  it("выбрасывает ошибку при неуспешном ответе", async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => "Not found"
    });

    await expect(apiService.getGroupData(9999)).rejects.toBeInstanceOf(Error);
  });
});
