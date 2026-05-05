import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { HeaderDepartmentHead } from '../dh-components/HeaderDepartmentHead';
import { GroupDetailSection } from '../dh-components/GroupDetailSection';
import { AddGroupModal } from '../dh-components/AddGroupModal';
import { headApiService, StudentInfo } from '../services/headApiService';
import { SummaryStatementSection } from '../dh-components/SummaryStatementSection';
import './DepartmentHeadPageStyle.css';
import { ScholarshipSection } from '../dh-components/ScholarshipSection';
import { DepartmentGroupsList } from '../dh-components/DepartmentGroupsList';

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
  averageGrade?: number;
  attendance?: number;
}

type DetailTabType = 'group' | 'diploma' | 'scholarship' | 'session' | 'summary' | 'departmentGroups';
type LeftPanelView = 'department' | 'groups';

export const DepartmentHeadPage: React.FC = () => {
  const { user } = useUser();
  const [academicGroups, setAcademicGroups] = useState<GroupData[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<DetailTabType>('departmentGroups'); // Изменено на 'departmentGroups'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<number | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddGroupModalOpen, setIsAddGroupModalOpen] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(false);
  const [leftPanelView, setLeftPanelView] = useState<LeftPanelView>('department'); // Изменено на 'department'
  const [departmentInfo, setDepartmentInfo] = useState<any>(null);
  const [departmentLoading, setDepartmentLoading] = useState(false);
  const [departmentScholarships, setDepartmentScholarships] = useState<any>(null);
  const [showDepartmentGroups, setShowDepartmentGroups] = useState(true); // Изменено на true
  const [selectedDepartmentGroupId, setSelectedDepartmentGroupId] = useState<number | null>(null);
  const [activeDepartmentTab, setActiveDepartmentTab] = useState<'groups' | 'scholarship'>('groups'); // Новое состояние для активной вкладки в отделении

  useEffect(() => {
    loadGroups();
    loadDepartmentInfo();
    loadDepartmentScholarships();
  }, []);

  useEffect(() => {
    const checkTheme = () => {
      const savedTheme = localStorage.getItem('dh-theme');
      const isDark = savedTheme === 'dark' || (!savedTheme && document.body.classList.contains('dh-theme-dark'));
      setIsDarkTheme(isDark);
    };

    checkTheme();
    
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          checkTheme();
        }
      });
    });
    
    observer.observe(document.body, { attributes: true });
    
    return () => observer.disconnect();
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
          let groupAverageGrade = 0;
          let groupAttendance = 0;
          
          try {
            const students = await headApiService.getGroupStudents(group.id);
            studentsCount = students.length;
            
            let totalGrade = 0;
            let studentsWithGrades = 0;
            for (const student of students) {
              const avgGrade = await headApiService.getStudentOverallAverage(student.id);
              if (avgGrade > 0) {
                totalGrade += avgGrade;
                studentsWithGrades++;
              }
            }
            groupAverageGrade = studentsWithGrades > 0 ? totalGrade / studentsWithGrades : 0;
            
            groupAttendance = await headApiService.getGroupOverallAttendance(group.id);
            
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
            profile: group.profile,
            averageGrade: groupAverageGrade,
            attendance: groupAttendance
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

  const loadDepartmentInfo = async () => {
    try {
      setDepartmentLoading(true);
      const info = await headApiService.getDepartmentInfo();
      setDepartmentInfo(info);
    } catch (error) {
      console.error('Ошибка при загрузке информации об отделении:', error);
    } finally {
      setDepartmentLoading(false);
    }
  };

  const loadDepartmentScholarships = async () => {
    try {
      const groups = academicGroups;
      let totalStudents = 0;
      let excellentCount = 0;
      let goodExcellentCount = 0;
      let goodCount = 0;
      let noneCount = 0;
      let totalAmount = 0;

      for (const group of groups) {
        const students = await headApiService.getGroupStudents(group.id);
        totalStudents += students.length;
        
        for (const student of students) {
          const avgGrade = await headApiService.getStudentOverallAverage(student.id);
          
          if (avgGrade >= 4.8) {
            excellentCount++;
            totalAmount += 3500;
          } else if (avgGrade >= 4.0) {
            goodExcellentCount++;
            totalAmount += 2500;
          } else if (avgGrade >= 3.5) {
            goodCount++;
            totalAmount += 1800;
          } else {
            noneCount++;
          }
        }
      }

      setDepartmentScholarships({
        totalStudents,
        excellentCount,
        goodExcellentCount,
        goodCount,
        noneCount,
        totalAmount,
        averageAmount: totalStudents > 0 ? totalAmount / totalStudents : 0
      });
    } catch (error) {
      console.error('Ошибка при загрузке статистики стипендий:', error);
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
    setShowDepartmentGroups(false);
    setSelectedDepartmentGroupId(null);
  };

  const handleShowDepartmentGroups = () => {
    setActiveDepartmentTab('groups');
    setShowDepartmentGroups(true);
    setSelectedGroupId(null);
    setActiveDetailTab('departmentGroups');
    setSelectedDepartmentGroupId(null);
  };

  const handleShowDepartmentScholarship = () => {
    setActiveDepartmentTab('scholarship');
    setShowDepartmentGroups(false);
    setSelectedGroupId(null);
    setActiveDetailTab('scholarship');
    setSelectedDepartmentGroupId(null);
  };

  const handleBackToDepartmentGroups = () => {
    setActiveDepartmentTab('groups');
    setShowDepartmentGroups(true);
    setSelectedGroupId(null);
    setActiveDetailTab('departmentGroups');
    setSelectedDepartmentGroupId(null);
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

  const renderInfoView = () => (
    <div className="dhp-department-info-view">
      {departmentLoading ? (
        <div className="dhp-department-loading">
          <div className="dhp-loading-spinner-small"></div>
          <p>Загрузка информации...</p>
        </div>
      ) : departmentInfo ? (
        <>
          <div className="dhp-department-header-info">
            <h3 className="dhp-department-name">{departmentInfo.name}</h3>
            <div className="dhp-department-stats">
              <div className="dhp-department-stat">
                <span className="dhp-stat-number">{departmentInfo.totalGroups}</span>
                <span className="dhp-stat-label">Групп</span>
              </div>
              <div className="dhp-department-stat">
                <span className="dhp-stat-number">{departmentInfo.totalStudents}</span>
                <span className="dhp-stat-label">Студентов</span>
              </div>
              <div className="dhp-department-stat">
                <span className="dhp-stat-number">{departmentInfo.totalTeachers}</span>
                <span className="dhp-stat-label">Преподавателей</span>
              </div>
            </div>
          </div>
          
          <div className="dhp-department-specialities">
            <h4 className="dhp-specialities-title">Направления подготовки</h4>
            <div className="dhp-specialities-list">
              {departmentInfo.specialities?.map((spec: string, index: number) => (
                <div key={index} className="dhp-speciality-item">
                  <span className="dhp-speciality-name">{spec}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="dhp-department-metrics">
            <div className="dhp-metrics-grid">
              <div className="dhp-metric-card">
                <div className="dhp-metric-header">
                  <span className="dhp-metric-title">Средняя успеваемость</span>
                </div>
                <div className="dhp-metric-value">{departmentInfo.averagePerformance?.toFixed(2) || '—'}</div>
                <div className="dhp-metric-progress">
                  <div className="dhp-progress-bar">
                    <div 
                      className="dhp-progress-fill" 
                      style={{ width: `${(departmentInfo.averagePerformance / 5) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              <div className="dhp-metric-card">
                <div className="dhp-metric-header">
                  <span className="dhp-metric-title">Общая посещаемость</span>
                </div>
                <div className="dhp-metric-value">{departmentInfo.averageAttendance?.toFixed(1)}%</div>
                <div className="dhp-metric-progress">
                  <div className="dhp-progress-bar">
                    <div 
                      className="dhp-progress-fill" 
                      style={{ width: `${departmentInfo.averageAttendance}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="dhp-quick-links">
            <button 
              className={`dhp-quick-link-btn ${activeDepartmentTab === 'groups' ? 'active' : ''}`}
              onClick={handleShowDepartmentGroups}
            >
              <div className="dhp-quick-link-content">
                <span className="dhp-quick-link-title">Информация о группах</span>
                <span className="dhp-quick-link-description">Просмотр всех групп отделения</span>
              </div>
            </button>
            
            <button 
              className={`dhp-quick-link-btn ${activeDepartmentTab === 'scholarship' ? 'active' : ''}`}
              onClick={handleShowDepartmentScholarship}
            >
              <div className="dhp-quick-link-content">
                <span className="dhp-quick-link-title">Стипендия</span>
                <span className="dhp-quick-link-description">Статистика по стипендиям</span>
              </div>
            </button>
          </div>
        </>
      ) : (
        <div className="dhp-department-error">
          <p>Не удалось загрузить информацию об отделении</p>
          <button onClick={loadDepartmentInfo} className="dhp-retry-btn">Повторить</button>
        </div>
      )}
    </div>
  );

  const renderDepartmentView = () => (
    <div className="dhp-department-view">
      <div className="dhp-department-content">
        {renderInfoView()}
      </div>
    </div>
  );

  const renderGroupsView = () => (
    <>
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
    </>
  );

  const renderDetailContent = () => {
  // Показываем список групп отделения в правой панели (для представления "Отделение")
  if (leftPanelView === 'department' && (showDepartmentGroups || activeDetailTab === 'departmentGroups')) {
    return (
      <div className="dhp-department-groups-full">
        <DepartmentGroupsList 
          groups={academicGroups}
          onGroupSelect={(groupId) => {
            setSelectedGroupId(groupId);
            setActiveDetailTab('group');
            setShowDepartmentGroups(false);
            setSelectedDepartmentGroupId(null);
          }}
        />
      </div>
    );
  }
  
  // Если выбран просмотр стипендии на уровне отделения (для представления "Отделение")
  if (leftPanelView === 'department' && selectedGroupId === null && activeDetailTab === 'scholarship') {
    return (
      <div className="dhp-department-scholarship-full">
        <div className="dhp-detail-header-bar">
          <button 
            className="dhp-back-to-info-btn"
            onClick={handleBackToDepartmentGroups}
          >
            ← Назад к информации о группах
          </button>
        </div>
        <div className="dhp-scholarship-header">
          <h3>Статистика стипендий по отделению</h3>
        </div>
        {departmentScholarships && (
          <div className="dhp-department-scholarships-detail">
            <div className="dhp-scholarships-stats-grid">
              <div className="dhp-scholarship-stat-card">
                <div className="dhp-scholarship-stat-value">{departmentScholarships.totalStudents}</div>
                <div className="dhp-scholarship-stat-label">Всего студентов</div>
              </div>
              <div className="dhp-scholarship-stat-card">
                <div className="dhp-scholarship-stat-value">{departmentScholarships.excellentCount + departmentScholarships.goodExcellentCount + departmentScholarships.goodCount}</div>
                <div className="dhp-scholarship-stat-label">Получают стипендию</div>
              </div>
              <div className="dhp-scholarship-stat-card">
                <div className="dhp-scholarship-stat-value">{Math.round((departmentScholarships.excellentCount + departmentScholarships.goodExcellentCount + departmentScholarships.goodCount) / departmentScholarships.totalStudents * 100)}%</div>
                <div className="dhp-scholarship-stat-label">Охват стипендиями</div>
              </div>
              <div className="dhp-scholarship-stat-card">
                <div className="dhp-scholarship-stat-value">{Math.round(departmentScholarships.averageAmount)} ₽</div>
                <div className="dhp-scholarship-stat-label">Средняя стипендия</div>
              </div>
            </div>
            
            <div className="dhp-scholarship-distribution-detail">
              <h4>Распределение по категориям</h4>
              <div className="dhp-distribution-item">
                <div className="dhp-distribution-header">
                  <span className="dhp-distribution-label">Повышенная (5)</span>
                  <span className="dhp-distribution-count">{departmentScholarships.excellentCount}</span>
                </div>
                <div className="dhp-distribution-bar">
                  <div 
                    className="dhp-distribution-fill excellent" 
                    style={{ width: `${(departmentScholarships.excellentCount / departmentScholarships.totalStudents) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div className="dhp-distribution-item">
                <div className="dhp-distribution-header">
                  <span className="dhp-distribution-label">Обычная (4-5)</span>
                  <span className="dhp-distribution-count">{departmentScholarships.goodExcellentCount}</span>
                </div>
                <div className="dhp-distribution-bar">
                  <div 
                    className="dhp-distribution-fill good-excellent" 
                    style={{ width: `${(departmentScholarships.goodExcellentCount / departmentScholarships.totalStudents) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div className="dhp-distribution-item">
                <div className="dhp-distribution-header">
                  <span className="dhp-distribution-label">Пониженная (4)</span>
                  <span className="dhp-distribution-count">{departmentScholarships.goodCount}</span>
                </div>
                <div className="dhp-distribution-bar">
                  <div 
                    className="dhp-distribution-fill good" 
                    style={{ width: `${(departmentScholarships.goodCount / departmentScholarships.totalStudents) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div className="dhp-distribution-item">
                <div className="dhp-distribution-header">
                  <span className="dhp-distribution-label">Не получают</span>
                  <span className="dhp-distribution-count">{departmentScholarships.noneCount}</span>
                </div>
                <div className="dhp-distribution-bar">
                  <div 
                    className="dhp-distribution-fill none" 
                    style={{ width: `${(departmentScholarships.noneCount / departmentScholarships.totalStudents) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
  
  // Просмотр для выбранной группы (для представления "Группы")
  if (leftPanelView === 'groups' && selectedGroupId !== null) {
    switch (activeDetailTab) {
      case 'group':
        return (
          <GroupDetailSection 
            groupId={selectedGroupId}
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
          <ScholarshipSection
            groupId={selectedGroupId}
            onClose={() => {}}
          />
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
          <SummaryStatementSection
            groupId={selectedGroupId}
            onClose={() => {}}
          />
        );
      default:
        return null;
    }
  }
  
  if (leftPanelView === 'groups' && selectedGroupId === null) {
    return (
      <div className="dhp-info-placeholder">
        <h3>Выберите группу</h3>
        <p>Нажмите на карточку группы слева, чтобы просмотреть подробную информацию об успеваемости, посещаемости и студентах группы.</p>
      </div>
    );
  }
  
};

  const getDetailTabTitle = (tab: DetailTabType) => {
    const titles = {
      group: 'Группа',
      diploma: 'Диплом',
      scholarship: 'Стипендия',
      session: 'Сессия',
      summary: 'Сводная ведомость',
      departmentGroups: 'Группы отделения'
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
            <div className="dhp-groups-panel">
              <div className="dhp-left-panel-nav">
                <button
                  className={`dhp-nav-btn ${leftPanelView === 'department' ? 'active' : ''}`}
                  onClick={() => {
                    setLeftPanelView('department');
                    setShowDepartmentGroups(true);
                    setActiveDetailTab('departmentGroups');
                    setActiveDepartmentTab('groups');
                  }}
                >
                  Отделение
                </button>
                <button
                  className={`dhp-nav-btn ${leftPanelView === 'groups' ? 'active' : ''}`}
                  onClick={() => {
                    setLeftPanelView('groups');
                    setShowDepartmentGroups(false);
                  }}
                >
                  Группы
                </button>
              </div>

              <div className="dhp-left-panel-content">
                {leftPanelView === 'department' ? renderDepartmentView() : renderGroupsView()}
              </div>
            </div>

            <div className="dhp-detail-panel">
              {leftPanelView === 'groups' && selectedGroupId !== null && (
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
              )}
              
              <div className="dhp-detail-content">
                {renderDetailContent()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isAddGroupModalOpen && (
        <AddGroupModal
          onClose={() => setIsAddGroupModalOpen(false)}
          onAdd={handleAddGroup}
        />
      )}
    </>
  );
};