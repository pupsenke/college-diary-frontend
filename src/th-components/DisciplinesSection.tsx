import React, { useState } from 'react';
import './DisciplinesSectionStyle.css';

export interface Discipline {
  id: number;
  name: string;
  course: number;
  groupCount: number;
  attendancePercent: number;
  semester: number;
}

interface Props {
  onDisciplineSelect?: (disciplineName: string) => void;
  selectedDiscipline?: string;
}

export const DisciplinesSection: React.FC<Props> = ({ onDisciplineSelect, selectedDiscipline }) => {
  const [activeTab, setActiveTab] = useState<'semesters' | 'course'>('semesters');
  const [selectedSemester, setSelectedSemester] = useState<'first' | 'second'>('first');
  const [selectedCourse, setSelectedCourse] = useState<'all' | '1' | '2' | '3' | '4'>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Данные по дисциплинам
  const disciplinesData: Discipline[] = [
    {
      id: 1,
      name: 'Разработка программных модулей',
      course: 4,
      groupCount: 2,
      attendancePercent: 79,
      semester: 2
    },
    {
      id: 2,
      name: 'Дипломное проектирование',
      course: 4,
      groupCount: 1,
      attendancePercent: 66,
      semester: 2
    },
    {
      id: 3,
      name: 'Операционные системы и среды',
      course: 3,
      groupCount: 1,
      attendancePercent: 78,
      semester: 1
    },
    {
      id: 4,
      name: 'Основы разработки программного обеспечения',
      course: 3,
      groupCount: 1,
      attendancePercent: 91,
      semester: 1
    },
    {
      id: 5,
      name: 'Технология разработки и защиты баз данных',
      course: 2,
      groupCount: 1,
      attendancePercent: 82,
      semester: 2
    },
    {
      id: 6,
      name: 'Системное программирование',
      course: 2,
      groupCount: 1,
      attendancePercent: 88,
      semester: 2
    },
    {
      id: 7,
      name: 'Компьютерные сети',
      course: 3,
      groupCount: 1,
      attendancePercent: 79,
      semester: 2
    }
  ];

  // Фильтрация данных
  const filteredDisciplines = disciplinesData.filter(discipline => {
    const semesterFilter = selectedSemester === 'first' ? discipline.semester === 1 : discipline.semester === 2;
    const courseFilter = selectedCourse === 'all' || discipline.course.toString() === selectedCourse;
    
    return semesterFilter && courseFilter;
  });

  // Сортировка по названию
  const sortedDisciplines = [...filteredDisciplines].sort((a, b) => {
    if (sortOrder === 'asc') {
      return a.name.localeCompare(b.name);
    } else {
      return b.name.localeCompare(a.name);
    }
  });

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const getPercentColor = (percent: number) => {
    if (percent >= 90) return '#2cbb00ff';
    if (percent >= 75) return '#a5db28ff';
    if (percent >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const handleDisciplineClick = (disciplineName: string) => {
    if (onDisciplineSelect) {
      onDisciplineSelect(disciplineName);
    }
  };

  return (
    <div className="ds-disciplines-section">
      <div className="ds-disciplines-header">
        <div className="ds-view-tabs">
          <button
            className={`ds-view-tab ${activeTab === 'semesters' ? 'ds-active' : ''}`}
            onClick={() => setActiveTab('semesters')}
          >
            По семестрам
          </button>
          <button
            className={`ds-view-tab ${activeTab === 'course' ? 'ds-active' : ''}`}
            onClick={() => setActiveTab('course')}
          >
            По курсу
          </button>
        </div>
      </div>

      <div className="ds-disciplines-content">
        {activeTab === 'semesters' ? (
          <>
            <div className="ds-semester-controls">
              <div className="ds-semester-tabs">
                <button
                  className={`ds-semester-tab ${selectedSemester === 'first' ? 'ds-active' : ''}`}
                  onClick={() => setSelectedSemester('first')}
                >
                  1-ый семестр
                </button>
                <button
                  className={`ds-semester-tab ${selectedSemester === 'second' ? 'ds-active' : ''}`}
                  onClick={() => setSelectedSemester('second')}
                >
                  2-ой семестр
                </button>
              </div>
            </div>

            <div className="ds-disciplines-table-container">
              <table className="ds-disciplines-table">
                <thead>
                  <tr>
                    <th className="ds-number-column">№</th>
                    <th className="ds-subject-column">
                      <div className="ds-column-header">
                        <span>Предмет</span>
                        <button 
                          className="ds-sort-button"
                          onClick={toggleSortOrder}
                        >
                          <img 
                            src="/th-icons/sort_icon.svg" 
                            alt="Сортировка" 
                            className={`ds-sort-icon ${sortOrder === 'desc' ? 'ds-sort-desc' : ''}`}
                          />
                        </button>
                      </div>
                    </th>
                    <th className="ds-course-column">
                      <div className="ds-header-text">Курс</div>
                    </th>
                    <th className="ds-groups-column">
                      <div className="ds-header-text">
                        Количество<br />групп
                      </div>
                    </th>
                    <th className="ds-attendance-column">
                      <div className="ds-header-text">
                        Процент<br />посещаемости
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDisciplines.map((discipline, index) => (
                    <tr 
                      key={discipline.id} 
                      className={`ds-discipline-row ${selectedDiscipline === discipline.name ? 'ds-selected' : ''}`}
                      onClick={() => handleDisciplineClick(discipline.name)}
                    >
                      <td className="ds-number-cell">{index + 1}.</td>
                      <td className="ds-subject-name">{discipline.name}</td>
                      <td className="ds-course-cell">{discipline.course}</td>
                      <td className="ds-groups-cell">{discipline.groupCount}</td>
                      <td className="ds-attendance-percent">
                        <span 
                          className="ds-percent-bubble"
                          style={{ backgroundColor: getPercentColor(discipline.attendancePercent) }}
                        >
                          {discipline.attendancePercent}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            <div className="ds-course-controls">
              <div className="ds-course-tabs">
                <button
                  className={`ds-course-tab ${selectedCourse === 'all' ? 'ds-active' : ''}`}
                  onClick={() => setSelectedCourse('all')}
                >
                  Все курсы
                </button>
                <button
                  className={`ds-course-tab ${selectedCourse === '1' ? 'ds-active' : ''}`}
                  onClick={() => setSelectedCourse('1')}
                >
                  1 курс
                </button>
                <button
                  className={`ds-course-tab ${selectedCourse === '2' ? 'ds-active' : ''}`}
                  onClick={() => setSelectedCourse('2')}
                >
                  2 курс
                </button>
                <button
                  className={`ds-course-tab ${selectedCourse === '3' ? 'ds-active' : ''}`}
                  onClick={() => setSelectedCourse('3')}
                >
                  3 курс
                </button>
                <button
                  className={`ds-course-tab ${selectedCourse === '4' ? 'ds-active' : ''}`}
                  onClick={() => setSelectedCourse('4')}
                >
                  4 курс
                </button>
              </div>
            </div>

            <div className="ds-disciplines-table-container">
              <table className="ds-disciplines-table">
                <thead>
                  <tr>
                    <th className="ds-number-column">№</th>
                    <th className="ds-subject-column">
                      <div className="ds-column-header">
                        <span>Предмет</span>
                        <button 
                          className="ds-sort-button"
                          onClick={toggleSortOrder}
                        >
                          <img 
                            src="/th-icons/sort_icon.svg" 
                            alt="Сортировка" 
                            className={`ds-sort-icon ${sortOrder === 'desc' ? 'ds-sort-desc' : ''}`}
                          />
                        </button>
                      </div>
                    </th>
                    <th className="ds-course-column">
                      <div className="ds-header-text">Курс</div>
                    </th>
                    <th className="ds-groups-column">
                      <div className="ds-header-text">
                        Количество<br />групп
                      </div>
                    </th>
                    <th className="ds-attendance-column">
                      <div className="ds-header-text">
                        Процент<br />посещаемости
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDisciplines.map((discipline, index) => (
                    <tr 
                      key={discipline.id} 
                      className={`ds-discipline-row ${selectedDiscipline === discipline.name ? 'ds-selected' : ''}`}
                      onClick={() => handleDisciplineClick(discipline.name)}
                    >
                      <td className="ds-number-cell">{index + 1}.</td>
                      <td className="ds-subject-name">{discipline.name}</td>
                      <td className="ds-course-cell">{discipline.course}</td>
                      <td className="ds-groups-cell">{discipline.groupCount}</td>
                      <td className="ds-attendance-percent">
                        <span 
                          className="ds-percent-bubble"
                          style={{ backgroundColor: getPercentColor(discipline.attendancePercent) }}
                        >
                          {discipline.attendancePercent}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};