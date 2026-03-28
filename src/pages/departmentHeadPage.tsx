import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { HeaderDepartmentHead } from '../dh-components/HeaderDepartmentHead';
import { GroupDetailView } from '../dh-components/GroupDetailSection';
import { AddGroupModal } from '../dh-components/AddGroupModal';
import { headApiService } from '../services/headApiService';
import { SummaryStatementView } from '../dh-components/SummaryStatementSection';
import './DepartmentHeadPageStyle.css';

interface GroupData {
  id: number;
  name: string;
  numberGroup: number;
  course: number;
  students: number;
  curator: string;
  curatorId: number;
  leader: string;
  speciality: string;
  profile: string;
}

type DetailTabType = 'group' | 'diploma' | 'scholarship' | 'session' | 'summary';

export const DepartmentHeadPage: React.FC = () => {
  const { user } = useUser();
  const [academicGroups, setAcademicGroups] = useState<GroupData[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<DetailTabType>('group');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<number | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddGroupModalOpen, setIsAddGroupModalOpen] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      
      const groups = await headApiService.getGroups();
      
      const filteredGroups = groups.filter(group => 
        group.specialty === "09.02.07 Информационные системы и программирование"
      );
      
      const formattedGroups: GroupData[] = [];
      
      for (const group of filteredGroups) {
        try {
          let curatorName = 'Не указан';
          try {
            const curator = await headApiService.getCurator(group.idCurator);
            curatorName = `${curator.lastName} ${curator.name.charAt(0)}.${curator.patronymic ? curator.patronymic.charAt(0) + '.' : ''}`;
          } catch (curatorError) {
            console.error(`Ошибка при загрузке куратора для группы ${group.id}:`, curatorError);
          }
          
          let studentsCount = 0;
          try {
            const students = await headApiService.getGroupStudents(group.id);
            studentsCount = students.length;
          } catch (studentsError) {
            console.error(`Ошибка при загрузке студентов для группы ${group.id}:`, studentsError);
          }
          
          formattedGroups.push({
            id: group.id,
            name: group.numberGroup.toString(),
            numberGroup: group.numberGroup,
            course: group.course,
            students: studentsCount,
            curator: curatorName,
            curatorId: group.idCurator,
            leader: 'Не указан',
            speciality: group.specialty,
            profile: group.profile
          });
        } catch (error) {
          console.error(`Ошибка при обработке группы ${group.id}:`, error);
        }
      }
      
      formattedGroups.sort((a, b) => {
        if (a.course !== b.course) {
          return a.course - b.course;
        }
        return a.numberGroup - b.numberGroup;
      });
      
      setAcademicGroups(formattedGroups);
      setError(null);
    } catch (error) {
      console.error('Ошибка при загрузке групп:', error);
      setError('Не удалось загрузить данные. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddGroup = async (groupNumber: string) => {
    try {
      await headApiService.addGroup(groupNumber);
      await loadGroups();
      return Promise.resolve();
    } catch (error) {
      console.error('Ошибка при добавлении группы:', error);
      return Promise.reject(error);
    }
  };

  const filteredGroups = academicGroups.filter(group => {
    const matchesSearch = 
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.curator.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.speciality.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.profile.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCourse = selectedCourse === 'all' || group.course === selectedCourse;
    
    return matchesSearch && matchesCourse;
  });

  const groupsByCourse = {
    1: filteredGroups.filter(g => g.course === 1),
    2: filteredGroups.filter(g => g.course === 2),
    3: filteredGroups.filter(g => g.course === 3),
    4: filteredGroups.filter(g => g.course === 4)
  };

  const handleGroupClick = (groupId: number) => {
    setSelectedGroupId(groupId);
    setActiveDetailTab('group');
  };

  const handleCloseDetail = () => {
    setSelectedGroupId(null);
    setActiveDetailTab('group');
    loadGroups();
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleCourseFilterChange = (course: number | 'all') => {
    setSelectedCourse(course);
  };

  const renderGroupCard = (group: GroupData) => (
    <div 
      key={group.id} 
      className={`dhp-group-card ${selectedGroupId === group.id ? 'active' : ''}`}
      onClick={() => handleGroupClick(group.id)}
    >
      <div className="dhp-group-header">
        <div className="dhp-group-badge">{group.name}</div>
      </div>
      <div className="dhp-group-body">
        <div className="dhp-group-info-compact">
          <div className="dhp-info-compact">
            <span className="dhp-info-label-compact">Куратор:</span>
            <span className="dhp-info-value-compact">{group.curator}</span>
          </div>
          <div className="dhp-info-compact">
            <span className="dhp-info-label-compact">{group.course} курс</span>
            <span className="dhp-info-value-compact">{group.profile}</span>
          </div>
          <div className="dhp-info-compact">
            <span className="dhp-info-label-compact">Студентов:</span>
            <span className="dhp-info-value-compact">{group.students}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDetailContent = () => {
    switch (activeDetailTab) {
      case 'group':
        return (
          <GroupDetailView  
            groupId={selectedGroupId!}
            onClose={() => {}}
            onGroupDeleted={() => {
              loadGroups();
              setSelectedGroupId(null);
            }}
          />
        );
      case 'diploma':
        return (
          <div className="dhp-detail-panel-content">
            <h3>Дипломные работы</h3>
            <p>Информация о дипломных работах будет доступна в ближайшее время.</p>
          </div>
        );
      case 'scholarship':
        return (
          <div className="dhp-detail-panel-content">
            <h3>Стипендии</h3>
            <p>Информация о стипендиях будет доступна в ближайшее время.</p>
          </div>
        );
      case 'session':
        return (
          <div className="dhp-detail-panel-content">
            <h3>Сессия</h3>
            <p>Информация о сессии будет доступна в ближайшее время.</p>
          </div>
        );
      case 'summary':
        return (
          <SummaryStatementView
            groupId={selectedGroupId!}
            onClose={() => {}}
          />
        );
      default:
        return null;
    }
  };

  const getDetailTabTitle = (tab: DetailTabType) => {
    const titles = {
      group: 'Группа',
      diploma: 'Диплом',
      scholarship: 'Стипендия',
      session: 'Сессия',
      summary: 'Сводная ведомость'
    };
    return titles[tab];
  };

  if (loading) {
    return (
      <div className="dhp-container">
        <div className="dhp-background-animation">
          <div className="dhp-shape dhp-shape-1"></div>
          <div className="dhp-shape dhp-shape-2"></div>
          <div className="dhp-shape dhp-shape-3"></div>
        </div>
        <div className="dhp-content">
          <HeaderDepartmentHead />
          <div className="dhp-loading-container">
            <div className="dhp-loading-spinner"></div>
            <p>Загрузка данных...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dhp-container">
        <div className="dhp-background-animation">
          <div className="dhp-shape dhp-shape-1"></div>
          <div className="dhp-shape dhp-shape-2"></div>
          <div className="dhp-shape dhp-shape-3"></div>
        </div>
        <div className="dhp-content">
          <HeaderDepartmentHead />
          <div className="dhp-error-container">
            <p className="dhp-error-message">{error}</p>
            <button className="dhp-retry-button" onClick={loadGroups}>
              Попробовать снова
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="dhp-container">
        <div className="dhp-background-animation">
          <div className="dhp-shape dhp-shape-1"></div>
          <div className="dhp-shape dhp-shape-2"></div>
          <div className="dhp-shape dhp-shape-3"></div>
        </div>

        <div className="dhp-content">
          <HeaderDepartmentHead />

          <div className="dhp-main-layout">
            {/* Левая панель - список групп */}
            <div className="dhp-groups-panel">
              <div className="dhp-groups-header">
                <div className="dhp-groups-title-wrapper">
                  <h2 className="dhp-groups-title">
                    Учебные группы 
                    <span className="dhp-groups-count">{filteredGroups.length}</span>
                  </h2>
                  <button 
                    className="dhp-add-group-icon-btn"
                    onClick={() => setIsAddGroupModalOpen(true)}
                    title="Добавить группу"
                  >
                    +
                  </button>
                </div>
                <div className="dhp-groups-controls">
                  <div className="dhp-search-container">
                    <input
                      type="text"
                      className="dhp-search-input"
                      placeholder="Поиск по группам..."
                      value={searchTerm}
                      onChange={handleSearchChange}
                    />
                  </div>
                </div>
              </div>

              {/* Фильтр по курсам */}
              <div className="dhp-course-filter">
                <button 
                  className={`dhp-course-filter-btn ${selectedCourse === 'all' ? 'active' : ''}`}
                  onClick={() => handleCourseFilterChange('all')}
                >
                  Все
                </button>
                {[1, 2, 3, 4].map(course => (
                  <button
                    key={course}
                    className={`dhp-course-filter-btn ${selectedCourse === course ? 'active' : ''}`}
                    onClick={() => handleCourseFilterChange(course)}
                  >
                    {course} курс
                  </button>
                ))}
              </div>

              {/* Список групп */}
              <div className="dhp-groups-list">
                {selectedCourse === 'all' ? (
                  [1, 2, 3, 4].map(course => (
                    groupsByCourse[course as keyof typeof groupsByCourse].length > 0 && (
                      <div key={course} className="dhp-course-group">
                        <h3 className="dhp-course-title">{course} курс</h3>
                        <div className="dhp-groups-grid">
                          {groupsByCourse[course as keyof typeof groupsByCourse].map(group => renderGroupCard(group))}
                        </div>
                      </div>
                    )
                  ))
                ) : (
                  <div className="dhp-course-group">
                    <h3 className="dhp-course-title">{selectedCourse} курс</h3>
                    <div className="dhp-groups-grid">
                      {groupsByCourse[selectedCourse as keyof typeof groupsByCourse].map(group => renderGroupCard(group))}
                    </div>
                  </div>
                )}

                {filteredGroups.length === 0 && (
                  <div className="dhp-no-groups">
                    <p>Группы не найдены</p>
                  </div>
                )}
              </div>
            </div>

            {/* Правая панель - детальная информация */}
            <div className="dhp-detail-panel">
              {selectedGroupId ? (
                <>
                  {/* Вкладки внутри правой панели */}
                  <div className="dhp-detail-tabs">
                    {(['group', 'diploma', 'scholarship', 'session', 'summary'] as DetailTabType[]).map((tab) => (
                      <button
                        key={tab}
                        className={`dhp-detail-tab ${activeDetailTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveDetailTab(tab)}
                      >
                        {getDetailTabTitle(tab)}
                      </button>
                    ))}
                  </div>
                  
                  {/* Контент выбранной вкладки */}
                  <div className="dhp-detail-content">
                    {renderDetailContent()}
                  </div>
                </>
              ) : (
                <div className="dhp-info-placeholder">
                  <h3>Выберите группу</h3>
                  <p>Нажмите на карточку группы слева, чтобы просмотреть подробную информацию об успеваемости, посещаемости и студентах группы.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Модальное окно добавления группы */}
      {isAddGroupModalOpen && (
        <AddGroupModal
          onClose={() => setIsAddGroupModalOpen(false)}
          onAdd={handleAddGroup}
        />
      )}
    </>
  );
};