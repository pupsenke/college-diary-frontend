import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserProvider, useUser } from '../../context/UserContext';

const TestComponent = () => {
  const { user, setUser, logout, isLoading, isStudent } = useUser();
  return (
    <div>
      <div data-testid="is-loading">{String(isLoading)}</div>
      <div data-testid="user-id">{user?.id || 'null'}</div>
      <div data-testid="is-student">{String(isStudent)}</div>
      <button 
        onClick={() => setUser({ id: 1, userType: 'student', name: 'Иван', lastName: 'Иванов', patronymic: 'Иванович', login: 'ivan' } as any)}
        data-testid="set-user"
      >
        Set User
      </button>
      <button onClick={logout} data-testid="logout">Logout</button>
    </div>
  );
};

describe('userContext', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('должен восстанавливать сессию из localStorage при загрузке', async () => {
    const mockSession = {
      user: { id: 1, userType: 'student', name: 'Иван', lastName: 'Иванов', patronymic: 'Иванович', login: 'ivan' },
      timestamp: Date.now(),
      expiresAt: Date.now() + 60 * 60 * 1000,
    };
    localStorage.setItem('user_session', JSON.stringify(mockSession));
    
    render(
      <UserProvider>
        <TestComponent />
      </UserProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('is-loading').textContent).toBe('false');
      expect(screen.getByTestId('user-id').textContent).toBe('1');
      expect(screen.getByTestId('is-student').textContent).toBe('true');
    });
  });

  test('не должен восстанавливать просроченную сессию', async () => {
    const expiredSession = {
      user: { id: 1, userType: 'student', name: 'Иван', lastName: 'Иванов', patronymic: 'Иванович', login: 'ivan' },
      timestamp: Date.now() - 2 * 60 * 60 * 1000,
      expiresAt: Date.now() - 1 * 60 * 60 * 1000,
    };
    localStorage.setItem('user_session', JSON.stringify(expiredSession));
    
    render(
      <UserProvider>
        <TestComponent />
      </UserProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('is-loading').textContent).toBe('false');
      expect(screen.getByTestId('user-id').textContent).toBe('null');
      expect(localStorage.getItem('user_session')).toBeNull();
    });
  });

  test('setUser должен сохранять пользователя в localStorage', async () => {
    render(
      <UserProvider>
        <TestComponent />
      </UserProvider>
    );
    
    await waitFor(() => expect(screen.getByTestId('is-loading').textContent).toBe('false'));
    
    await act(async () => {
      const button = screen.getByTestId('set-user');
      await userEvent.click(button);
    });
    expect(screen.getByTestId('user-id').textContent).toBe('1');
    expect(localStorage.getItem('user_session')).not.toBeNull();
    
    const saved = JSON.parse(localStorage.getItem('user_session')!);
    expect(saved.user.id).toBe(1);
    expect(saved.expiresAt).toBeGreaterThan(Date.now());
  });

  test('logout должен очищать пользователя и localStorage', async () => {
    // Сначала устанавливаем пользователя
    localStorage.setItem('user_session', JSON.stringify({
      user: { id: 1, userType: 'student' },
      timestamp: Date.now(),
      expiresAt: Date.now() + 3600000,
    }));
    render(
      <UserProvider>
        <TestComponent />
      </UserProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('user-id').textContent).toBe('1');
    });
    await act(async () => {
      const logoutBtn = screen.getByTestId('logout');
      await userEvent.click(logoutBtn);
    });
    expect(screen.getByTestId('user-id').textContent).toBe('null');
    expect(localStorage.getItem('user_session')).toBeNull();
  });
});