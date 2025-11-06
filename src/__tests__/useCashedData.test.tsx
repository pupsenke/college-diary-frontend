// Unit тест для проверки асинхронного получения и кэширования данных через useCachedData

import { renderHook } from "@testing-library/react";
import { waitFor } from "@testing-library/react";
import { useCachedData } from "../hooks/useCachedData";

test("useCachedData возвращает результат fetch", async () => {
  const fetchFn = jest.fn().mockResolvedValue("данные");
  const { result } = renderHook(() =>
    useCachedData("testKey", fetchFn)
  );
  await waitFor(() => {
    expect(result.current.data).toBe("данные");
  });
});
