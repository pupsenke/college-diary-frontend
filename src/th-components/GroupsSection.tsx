import React, { useState } from 'react';
import { TeacherAttendanceSection } from './TeacherAttendanceSection';
import { TeacherPerformanceSection } from './TeacherPerformanceSection';
import './GroupsSectionStyle.css';

export interface Group {
  id: number;
  name: string;
  specialty: string;
  subject: string;
  studentCount: number;
  attendancePercent: number;
  semester: number;
  course: number;
}

interface Props {
  selectedDiscipline?: string;
  onDisciplineClear?: () => void;
}

export const GroupsSection: React.FC<Props> = ({ selectedDiscipline, onDisciplineClear }) => {
  const [activeTab, setActiveTab] = useState<'semesters' | 'course'>('semesters');
  const [selectedSemester, setSelectedSemester] = useState<'first' | 'second'>('first');
  const [selectedCourse, setSelectedCourse] = useState<'all' | '1' | '2' | '3' | '4'>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [subjectSortOrder, setSubjectSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedGroupRow, setSelectedGroupRow] = useState<number | null>(null);
  const [showAttendance, setShowAttendance] = useState<boolean>(false);
  const [showPerformance, setShowPerformance] = useState<boolean>(false);
  const [selectedGroupData, setSelectedGroupData] = useState<Group | null>(null);

  // Данные по группам - логически связаны с дисциплинами
  const groupsData: Group[] = [
    {
      id: 1,
      name: '2992',
      specialty: '09.02.07 Информационные системы и программирование',
      subject: 'Разработка программных модулей',
      studentCount: 28,
      attendancePercent: 85,
      semester: 2,
      course: 4
    },
    {
      id: 2,
      name: '2991',
      specialty: '09.02.07 Информационные системы и программирование',
      subject: 'Разработка программных модулей',
      studentCount: 27,
      attendancePercent: 72,
      semester: 2,
      course: 4
    },
    {
      id: 3,
      name: '2992',
      specialty: '09.02.07 Информационные системы и программирование',
      subject: 'Дипломное проектирование',
      studentCount: 28,
      attendancePercent: 66,
      semester: 2,
      course: 4
    },
    {
      id: 4,
      name: '3991',
      specialty: '09.02.07 Информационные системы и программирование',
      subject: 'Операционные системы и среды',
      studentCount: 25,
      attendancePercent: 78,
      semester: 1,
      course: 3
    },
    {
      id: 5,
      name: '3992',
      specialty: '09.02.07 Информационные системы и программирование',
      subject: 'Основы разработки программного обеспечения',
      studentCount: 26,
      attendancePercent: 91,
      semester: 1,
      course: 3
    },
    {
      id: 6,
      name: '4991',
      specialty: '09.02.07 Информационные системы и программирование',
      subject: 'Технология разработки и защиты баз данных',
      studentCount: 24,
      attendancePercent: 82,
      semester: 2,
      course: 2
    },
    {
      id: 7,
      name: '4992',
      specialty: '09.02.07 Информационные системы и программирование',
      subject: 'Системное программирование',
      studentCount: 23,
      attendancePercent: 88,
      semester: 2,
      course: 2
    },
    {
      id: 8,
      name: '3991',
      specialty: '09.02.07 Информационные системы и программирование',
      subject: 'Компьютерные сети',
      studentCount: 26,
      attendancePercent: 79,
      semester: 2,
      course: 3
    }
  ];

  // Получение уникальных групп для выпадающего списка
  const uniqueGroups = Array.from(new Set(groupsData.map(group => group.name)));

  // Фильтрация данных с учетом выбранной дисциплины
  const filteredGroups = groupsData.filter(group => {
    const semesterFilter = selectedSemester === 'first' ? group.semester === 1 : group.semester === 2;
    const courseFilter = selectedCourse === 'all' || group.course.toString() === selectedCourse;
    const groupFilter = selectedGroup === 'all' || group.name === selectedGroup;
    const disciplineFilter = !selectedDiscipline || group.subject === selectedDiscipline;
    
    return semesterFilter && courseFilter && groupFilter && disciplineFilter;
  });

  // Сортировка по предмету
  const sortedGroups = [...filteredGroups].sort((a, b) => {
    if (subjectSortOrder === 'asc') {
      return a.subject.localeCompare(b.subject);
    } else {
      return b.subject.localeCompare(a.subject);
    }
  });

  const toggleSubjectSortOrder = () => {
    setSubjectSortOrder(subjectSortOrder === 'asc' ? 'desc' : 'asc');
  };

  const getPercentColor = (percent: number) => {
    if (percent >= 90) return '#2cbb00ff';
    if (percent >= 75) return '#a5db28ff';
    if (percent >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const handleRowClick = (groupId: number) => {
    setSelectedGroupRow(groupId === selectedGroupRow ? null : groupId);
  };

  const handleSetAttendance = () => {
    if (!selectedGroupRow) return;
    
    const groupData = groupsData.find(group => group.id === selectedGroupRow);
    if (groupData) {
      setSelectedGroupData(groupData);
      setShowAttendance(true);
    }
  };

  const handleSetGrades = () => {
    if (!selectedGroupRow) return;
      
    const groupData = groupsData.find(group => group.id === selectedGroupRow);
    if (groupData) {
      setSelectedGroupData(groupData);
      setShowPerformance(true);
    }
  };

  const handleClearDiscipline = () => {
    if (onDisciplineClear) {
      onDisciplineClear();
    }
  };

  const handleBackToGroups = () => {
    setShowAttendance(false);
    setShowPerformance(false);
    setSelectedGroupData(null);
  };

  // от успеваемости к посещаемости
  const handleSetAttendanceFromPerformance = () => {
    setShowPerformance(false);
    setShowAttendance(true);
  };

  // от посещаемости к успеваемости
  const handleSetGradesFromAttendance = () => {
    setShowAttendance(false);
    setShowPerformance(true);
  };

  // Моковые данные студентов для демонстрации
  const mockStudents = [
    { id: 1, lastName: 'Абрамов', firstName: 'Кирилл', middleName: 'Денисович' },
    { id: 2, lastName: 'Андреев', firstName: 'Никита', middleName: 'Игоревич' },
    { id: 3, lastName: 'Васильев', firstName: 'Алексей', middleName: 'Валерьевич' },
    { id: 4, lastName: 'Васильев', firstName: 'Дмитрий', middleName: 'Романович' },
    { id: 5, lastName: 'Васильев', firstName: 'Макар', middleName: 'Александрович' },
    { id: 6, lastName: 'Давтян', firstName: 'Егор', middleName: 'Каренович' },
    { id: 7, lastName: 'Загайный', firstName: 'Семен', middleName: 'Олегович' },
    { id: 8, lastName: 'Загоскин', firstName: 'Александр', middleName: 'Иванович' },
    { id: 9, lastName: 'Капустинская', firstName: 'Софья', middleName: 'Алексеевна' },
    { id: 10, lastName: 'Крючков', firstName: 'Захар', middleName: 'Владимирович' },
    { id: 11, lastName: 'Лунёв', firstName: 'Александр', middleName: 'Иванович' },
    { id: 12, lastName: 'Орлов', firstName: 'Алексей', middleName: 'Александрович' },
    { id: 13, lastName: 'Павлов', firstName: 'Михаил', middleName: 'Александрович' },
    { id: 14, lastName: 'Перлова', firstName: 'Екатерина', middleName: 'Андреевна' },
  ];

  // Условия отображения компонентов
  if (showPerformance && selectedGroupData) {
    return (
      <div className="teacher-performance-page">
        <TeacherPerformanceSection
          groupNumber={selectedGroupData.name}
          subject={selectedGroupData.subject}
          students={mockStudents}
          onBackToGroups={handleBackToGroups}
          onSetAttendance={handleSetAttendanceFromPerformance}
        />
      </div>
    );
  }

  if (showAttendance && selectedGroupData) {
    return (
      <div className="teacher-attendance-page">
        <TeacherAttendanceSection
          groupNumber={selectedGroupData.name}
          subject={selectedGroupData.subject}
          students={mockStudents}
          onBackToGroups={handleBackToGroups}
          onSetGrades={handleSetGradesFromAttendance}
        />
      </div>
    );
  }
  return (
    <div className="gs-groups-section">
      {/* Блок выбранной дисциплины с кнопкой сброса фильтра */}
      {selectedDiscipline && (
        <div className="gs-discipline-filter">
          <div className="gs-discipline-info">
            <strong className="gs-discipline-name">{selectedDiscipline}</strong>
          </div>
          <button className="gs-clear-discipline" onClick={handleClearDiscipline}>
            Сбросить фильтр
          </button>
        </div>
      )}

      <div className="gs-groups-header">
        <div className="gs-view-tabs">
          <button
            className={`gs-view-tab ${activeTab === 'semesters' ? 'gs-active' : ''}`}
            onClick={() => setActiveTab('semesters')}
          >
            По семестрам
          </button>
          <button
            className={`gs-view-tab ${activeTab === 'course' ? 'gs-active' : ''}`}
            onClick={() => setActiveTab('course')}
          >
            По курсу
          </button>
        </div>
      </div>

      <div className="gs-groups-content">
        {activeTab === 'semesters' ? (
          <>
            <div className="gs-controls-row">
              <div className="gs-semester-controls">
                <div className="gs-semester-tabs">
                  <button
                    className={`gs-semester-tab ${selectedSemester === 'first' ? 'gs-active' : ''}`}
                    onClick={() => setSelectedSemester('first')}
                  >
                    1-ый семестр
                  </button>
                  <button
                    className={`gs-semester-tab ${selectedSemester === 'second' ? 'gs-active' : ''}`}
                    onClick={() => setSelectedSemester('second')}
                  >
                    2-ой семестр
                  </button>
                </div>
              </div>
              
              <div className="gs-group-selector">
                <select
                  id="gs-group-select"
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="gs-group-select"
                >
                  <option value="all">Все группы</option>
                  {uniqueGroups.map(group => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="gs-groups-table-container">
              <table className="gs-groups-table">
                <thead>
                  <tr>
                    <th className="gs-number-column">№</th>
                    <th className="gs-group-column">Группа</th>
                    <th className="gs-specialty-column">Специальность</th>
                    <th className="gs-subject-column">
                      <div className="gs-column-header">
                        <span>Предмет</span>
                        <button 
                          className="gs-sort-button"
                          onClick={toggleSubjectSortOrder}
                        >
                          <img 
                            src="/th-icons/sort_icon.svg" 
                            alt="Сортировка" 
                            className={`gs-sort-icon ${subjectSortOrder === 'desc' ? 'gs-sort-desc' : ''}`}
                          />
                        </button>
                      </div>
                    </th>
                    <th className="gs-students-column">
                      <div className="gs-header-text">
                        Количество<br />студентов
                      </div>
                    </th>
                    <th className="gs-attendance-column">
                      <div className="gs-header-text">
                        Процент<br />посещаемости
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedGroups.map((group, index) => (
                    <tr 
                      key={group.id} 
                      className={`gs-group-row ${selectedGroupRow === group.id ? 'gs-selected' : ''}`}
                      onClick={() => handleRowClick(group.id)}
                    >
                      <td className="gs-number-cell">{index + 1}.</td>
                      <td className="gs-group-name">{group.name}</td>
                      <td className="gs-specialty-cell">{group.specialty}</td>
                      <td className="gs-subject-cell">{group.subject}</td>
                      <td className="gs-students-cell">{group.studentCount}</td>
                      <td className="gs-attendance-percent">
                        <span 
                          className="gs-percent-bubble"
                          style={{ backgroundColor: getPercentColor(group.attendancePercent) }}
                        >
                          {group.attendancePercent}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {sortedGroups.length === 0 && (
                <div className="gs-no-data">
                  {selectedDiscipline 
                    ? `Нет групп по дисциплине "${selectedDiscipline}" для выбранных фильтров`
                    : 'Нет данных для отображения'
                  }
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="gs-controls-row">
              <div className="gs-course-controls">
                <div className="gs-course-tabs">
                  <button
                    className={`gs-course-tab ${selectedCourse === 'all' ? 'gs-active' : ''}`}
                    onClick={() => setSelectedCourse('all')}
                  >
                    Все курсы
                  </button>
                  <button
                    className={`gs-course-tab ${selectedCourse === '1' ? 'gs-active' : ''}`}
                    onClick={() => setSelectedCourse('1')}
                  >
                    1 курс
                  </button>
                  <button
                    className={`gs-course-tab ${selectedCourse === '2' ? 'gs-active' : ''}`}
                    onClick={() => setSelectedCourse('2')}
                  >
                    2 курс
                  </button>
                  <button
                    className={`gs-course-tab ${selectedCourse === '3' ? 'gs-active' : ''}`}
                    onClick={() => setSelectedCourse('3')}
                  >
                    3 курс
                  </button>
                  <button
                    className={`gs-course-tab ${selectedCourse === '4' ? 'gs-active' : ''}`}
                    onClick={() => setSelectedCourse('4')}
                  >
                    4 курс
                  </button>
                </div>
              </div>
              
              <div className="gs-group-selector">
                <label htmlFor="gs-group-select"></label>
                <select
                  id="gs-group-select"
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="gs-group-select"
                >
                  <option value="all">Все группы</option>
                  {uniqueGroups.map(group => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="gs-groups-table-container">
              <table className="gs-groups-table">
                <thead>
                  <tr>
                    <th className="gs-number-column">№</th>
                    <th className="gs-group-column">Группа</th>
                    <th className="gs-specialty-column">Специальность</th>
                    <th className="gs-subject-column">
                      <div className="gs-column-header">
                        <span>Предмет</span>
                        <button 
                          className="gs-sort-button"
                          onClick={toggleSubjectSortOrder}
                        >
                          <img 
                            src="/th-icons/sort_icon.svg" 
                            alt="Сортировка" 
                            className={`gs-sort-icon ${subjectSortOrder === 'desc' ? 'gs-sort-desc' : ''}`}
                          />
                        </button>
                      </div>
                    </th>
                    <th className="gs-students-column">
                      <div className="gs-header-text">
                        Количество<br />студентов
                      </div>
                    </th>
                    <th className="gs-attendance-column">
                      <div className="gs-header-text">
                        Процент<br />посещаемости
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedGroups.map((group, index) => (
                    <tr 
                      key={group.id} 
                      className={`gs-group-row ${selectedGroupRow === group.id ? 'gs-selected' : ''}`}
                      onClick={() => handleRowClick(group.id)}
                    >
                      <td className="gs-number-cell">{index + 1}.</td>
                      <td className="gs-group-name">{group.name}</td>
                      <td className="gs-specialty-cell">{group.specialty}</td>
                      <td className="gs-subject-cell">{group.subject}</td>
                      <td className="gs-students-cell">{group.studentCount}</td>
                      <td className="gs-attendance-percent">
                        <span 
                          className="gs-percent-bubble"
                          style={{ backgroundColor: getPercentColor(group.attendancePercent) }}
                        >
                          {group.attendancePercent}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {sortedGroups.length === 0 && (
                <div className="gs-no-data">
                  {selectedDiscipline 
                    ? `Нет групп по дисциплине "${selectedDiscipline}" для выбранных фильтров`
                    : 'Нет данных для отображения'
                  }
                </div>
              )}
            </div>
          </>
        )}

        <div className="gs-action-buttons">
          <button 
            className={`gs-attendance-btn ${!selectedGroupRow ? 'gs-disabled' : ''}`}
            onClick={handleSetAttendance}
            disabled={!selectedGroupRow}
          >
            Выставить посещаемость
          </button>
          <button 
            className={`gs-grades-btn ${!selectedGroupRow ? 'gs-disabled' : ''}`}
            onClick={handleSetGrades}
            disabled={!selectedGroupRow}
          >
            Выставить оценки
          </button>
        </div>
      </div>
    </div>
  );
};