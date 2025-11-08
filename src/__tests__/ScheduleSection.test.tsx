import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ScheduleSection } from '../st-components/ScheduleSectionST';
import { useUser } from '../context/UserContext';

jest.mock('../context/UserContext');
global.fetch = jest.fn();
const mockUser = { user: { id: 1, idGroup: 1 }, isStudent: true };
const mockSchedule = [
  {
    id: 1,
    dayWeek: 'Понедельник',
    nameSubject: 'Математика',
    numPair: 1,
    typeWeek: 'Общая',
    room: 101,
    idSt: 1,
    idGroup: 1,
    subgroup: null,
    replacement: false,
    idSubject: 1,
    idTeacher: 1,
    lastnameTeacher: 'Иванов',
    nameTeacher: 'Иван',
    patronymicTeacher: 'Иванович',
    numberGroup: 101
  }
];
describe('ScheduleSection', () => {
  beforeEach(() => {
    (useUser as jest.Mock).mockReturnValue(mockUser);
  });
  test('отображает загрузку, затем расписание', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockSchedule,
    });

    render(<ScheduleSection />);

    expect(await screen.findByText('Загрузка расписания')).toBeInTheDocument();
    const monTab = await screen.findByText('Понедельник');
    fireEvent.click(monTab);
    expect(await screen.findByText('Математика')).toBeInTheDocument();
        console.log('Расписание загружено');
  });

  test('переключает недели', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<ScheduleSection />);
    
    const lowerTab = await screen.findByText('Нижняя неделя');
    fireEvent.click(lowerTab);
    await waitFor(() => expect(lowerTab).toHaveClass('active'));
    console.log('Неделя переключена. Тест пройдет');
  });
});


