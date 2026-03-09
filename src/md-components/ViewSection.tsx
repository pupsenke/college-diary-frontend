import './ViewSection.css';
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../constants/apiConstant';

interface ApiGroup {
  id: number;
  numberGroup: number;
  admissionYear: number;
  idCurator: number;
  course: number;
  formEducation: string;
  profile: string;
  specialty: string;
}

export const ViewSectionPage: React.FC = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<ApiGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string>('');
  const [selectedCourse, setSelectedCourse] = useState<number | 'all'>('all');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');

  // загрузка групп из API
  useEffect(() => {
    const loadGroups = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/groups`);
        if (!res.ok) {
          throw new Error(`Ошибка загрузки групп: ${res.status}`);
        }
        const data: ApiGroup[] = await res.json();
        setGroups(data);
      } catch (e: any) {
        console.error(e);
        setLoadError(e.message || 'Не удалось загрузить группы');
      } finally {
        setLoading(false);
      }
    };
    loadGroups();
  }, []);

  // список курсов
  const courses = useMemo(() => {
    const set = new Set<number>();
    groups.forEach(g => set.add(g.course));
    return Array.from(set).sort((a, b) => a - b);
  }, [groups]);

  // список специальностей
  const specialties = useMemo(() => {
    const set = new Set<string>();
    groups.forEach(g => {
      if (g.specialty) set.add(g.specialty);
    });
    return Array.from(set).sort();
  }, [groups]);

  // фильтрация по курсу и специальности
  const filteredGroups = useMemo(() => {
    return groups.filter(g => {
      const byCourse = selectedCourse === 'all' ? true : g.course === selectedCourse;
      const bySpecialty = selectedSpecialty === 'all' ? true : g.specialty === selectedSpecialty;
      return byCourse && bySpecialty;
    });
  }, [groups, selectedCourse, selectedSpecialty]);

  // группировка по курсу
  const groupedByCourse = useMemo(() => {
    return filteredGroups.reduce((acc, group) => {
      if (!acc[group.course]) {
        acc[group.course] = [];
      }
      acc[group.course].push(group);
      return acc;
    }, {} as Record<number, ApiGroup[]>);
  }, [filteredGroups]);

  const handleBackClick = () => {
    navigate('/metodist');
  };

  const handleEditClick = (groupId: number) => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      localStorage.setItem('selectedGroupForEdit', String(group.id)); // сохранение id группы и переход на редактирование
      navigate('/metodist/edit-schedule');
    }
  };

  const handleViewScheduleClick = (groupId: number) => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      localStorage.setItem('selectedGroupForEdit', String(group.id));
      navigate('/metodist/view-groups/view-schedule');
    }
  };

  const handleExportClick = (groupId: number) => {
    console.log('Экспорт группы:', groupId);
  };

  return (
    <div className="md-white-background-vs">
      <main className="view-section-main">
        <div className="header-controls">
          <button className="back-button" onClick={handleBackClick}>
            Назад
          </button>

          <div className="filter-section">
            <select
              id="course-filter"
              value={selectedCourse}
              onChange={(e) =>
                setSelectedCourse(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))
              }
              className="course-filter">
              <option value="all">Все курсы</option>
              {courses.map(course => (
                <option key={course} value={course}>
                  {course} курс
                </option>
              ))}
            </select>

            <select
              id="specialty-filter"
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
              className="course-filter">
              <option value="all">Все специальности</option>
              {specialties.map(spec => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading && (
          <div className="status-banner">
            Загрузка групп...
          </div>
        )}

        {loadError && (
          <div className="status-banner error">
            {loadError}
          </div>
        )}

        {!loading && !loadError && (
          <div className="groups-container">
            {Object.entries(groupedByCourse)
              .sort(([courseA], [courseB]) => parseInt(courseA, 10) - parseInt(courseB, 10))
              .map(([course, courseGroups]) => (
                <div key={course} className="course-section">
                  <h2 className="course-title">{course} курс</h2>
                  <ul className="groups-list">
                    {courseGroups.map(group => (
                      <li key={group.id} className="group-item">
                        <div className="group-info">
                          <span className="group-code">{group.numberGroup}</span>
                          <span className="group-name">{group.specialty}</span>
                        </div>
                        <div className="group-actions">
                          <button
                            className="action-btn edit-btn"
                            onClick={() => handleEditClick(group.id)}
                            title="Редактировать расписание">
                            <img
                              src="/md-icons/edit_icon.svg"
                              alt="Редактировать"
                              className="action-icon"/>
                          </button>
                          <button
                            className="action-btn view-btn"
                            onClick={() => handleViewScheduleClick(group.id)}
                            title="Просмотр расписания">
                            <img
                              src="/md-icons/eye_icon.svg"
                              alt="Просмотреть"
                              className="action-icon"/>
                          </button>
                          <button
                            className="action-btn export-btn"
                            onClick={() => handleExportClick(group.id)}
                            title="Экспорт расписания">
                            <img
                              src="/md-icons/download_icon.svg"
                              alt="Экспорт"
                              className="action-icon"/>
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

            {filteredGroups.length === 0 && (
              <div className="no-groups">
                <p>По выбранным фильтрам нет групп</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
