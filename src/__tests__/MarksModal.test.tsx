import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MarksModal } from '../st-components/ScheduleSectionST';

test('открывается и закрывается', () => {
  const onClose = jest.fn();

  render(
    <MarksModal
      isOpen={true}
      onClose={onClose}
      subjectName="Математика"
      marks={[]}
    />
  );

  expect(screen.getByText('Математика')).toBeInTheDocument();
  console.log('Модальное окно открыто и отображает предмет');

  fireEvent.click(screen.getByText('×'));
  console.log('Проверка вызова обработчика закрытия');

  expect(onClose).toHaveBeenCalled();
  console.log('Обработчик закрытия вызван успешно. Тест пройден');
});

