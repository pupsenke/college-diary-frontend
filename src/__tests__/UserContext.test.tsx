import React from "react";
import { render, screen } from "@testing-library/react";
import { UserProvider, useUser } from "../context/UserContext";

const TestRoleComponent = () => {
  const { isStudent, setUser } = useUser();
  React.useEffect(() => {
    setUser({ id: 1, userType: "student", name: "Иван" } as any);
  }, []);
  return <span>{isStudent ? "student" : "not student"}</span>;
};

test("проверка роли студента", () => {
  render(
    <UserProvider>
      <TestRoleComponent />
    </UserProvider>
  );
  expect(screen.getByText("student")).toBeInTheDocument();
});
