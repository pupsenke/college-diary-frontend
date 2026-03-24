import React, { useState, useEffect } from 'react';
import './DepartmentManagementSectionStyle.css';
import { GroupDetail } from './GroupDetail';
import { AddGroupModal } from './AddGroupModal';
import { 
  headApiService, 
  GroupInfo as ApiGroupInfo,
} from '../services/headApiService';

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

export const DepartmentManagementSection: React.FC = () => {
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddGroupModalOpen, setIsAddGroupModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<number | 'all'>('all');
  const [academicGroups, setAcademicGroups] = useState<GroupData[]>([]);
  const [departmentInfo, setDepartmentInfo] = useState({
    name: 'Отделение информационных технологий',
    specialities: ['09.02.07 Информационные системы и программирование'],
    totalGroups: 0,
    totalStudents: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingGroupId, setDeletingGroupId] = useState<number | null>(null);

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
      let totalStudentsCount = 0;
      
      for (const group of filteredGroups) {
        try {
          // Получаем куратора
          let curatorName = 'Не указан';
          try {
            const curator = await headApiService.getCurator(group.idCurator);
            curatorName = `${curator.lastName} ${curator.name.charAt(0)}.${curator.patronymic ? curator.patronymic.charAt(0) + '.' : ''}`;
          } catch (curatorError) {
            console.error(`Ошибка при загрузке куратора для группы ${group.id}:`, curatorError);
          }
          
          // Получаем студентов группы
          let studentsCount = 0;
          try {
            const students = await headApiService.getGroupStudents(group.id);
            studentsCount = students.length;
            totalStudentsCount += studentsCount;
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

  // Функция для добавления новой группы
  const handleAddGroup = async (groupNumber: string) => {
    try {
      await headApiService.addGroup(groupNumber);
      // После успешного добавления перезагружаем список групп
      await loadGroups();
      return Promise.resolve();
    } catch (error) {
      console.error('Ошибка при добавлении группы:', error);
      return Promise.reject(error);
    }
  };

  // Функция для поиска и фильтрации групп
  const filteredGroups = academicGroups.filter(group => {
    // Фильтр по поисковому запросу
    const matchesSearch = 
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.curator.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.speciality.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.profile.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Фильтр по курсу
    const matchesCourse = selectedCourse === 'all' || group.course === selectedCourse;
    
    return matchesSearch && matchesCourse;
  });

  // Группировка групп по курсам
  const groupsByCourse = {
    1: filteredGroups.filter(g => g.course === 1),
    2: filteredGroups.filter(g => g.course === 2),
    3: filteredGroups.filter(g => g.course === 3),
    4: filteredGroups.filter(g => g.course === 4)
  };

  const handleGroupClick = (groupId: number) => {
    setSelectedGroupId(groupId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedGroupId(null);
  };

  const handleCloseAddGroupModal = () => {
    setIsAddGroupModalOpen(false);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleCourseFilterChange = (course: number | 'all') => {
    setSelectedCourse(course);
  };

  if (loading) {
    return (
      <div className="dhm-department-container">
        <div className="dhm-loading">
          <p>Загрузка данных...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dhm-department-container">
        <div className="dhm-error">
          <p className="dhm-error-message">{error}</p>
          <button 
            className="dhm-retry-button"
            onClick={loadGroups}
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  const renderGroupCard = (group: GroupData) => (
    <div key={group.id} className="dhm-group-card" onClick={() => handleGroupClick(group.id)}>
      <div className="dhm-group-header">
        <div className="dhm-group-badge">{group.name}</div>
      </div>
      <div className="dhm-group-body">
        <div className="dhm-group-info-compact">
          <div className="dhm-info-compact">
            <span className="dhm-info-label-compact">Куратор:</span>
            <span className="dhm-info-value-compact">{group.curator}</span>
          </div>
          <div className="dhm-info-compact">
            <span className="dhm-info-label-compact">{group.course} курс</span>
            <span className="dhm-info-value-compact">{group.profile}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="dhm-department-container">
        {/* Шапка с названием отделения */}
        <div className="dhm-department-header dhm-department-header-white">
          <div className="dhm-header-content">
            <h1 className="dhm-department-title dhm-department-title-blue">Информация об отделении</h1>
          </div>
        </div>

        {/* Основной контент в сетке */}
        <div className="dhm-department-grid">
          {/* Левая колонка - основная информация */}
          <div className="dhm-main-column-full">
            {/* Блок общей информации */}
            <div className="dhm-info-section">
              <div className="dhm-section-header">
                <h2 className="dhm-section-title">Специальности отделения</h2>
              </div>
              <div className="dhm-info-content">
                <div className="dhm-info-card">
                  <div className="dhm-specialities-list">
                    {departmentInfo.specialities.map((speciality, index) => (
                      <div key={index} className="dhm-speciality-item">
                        <span>{speciality}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Блок учебных групп */}
            <div className="dhm-groups-section">
              <div className="dhm-section-header">
                <h2 className="dhm-section-title">Учебные группы ({filteredGroups.length})</h2>
                <div className="dhm-groups-actions">
                  <button 
                    className="dhm-add-group-btn"
                    onClick={() => setIsAddGroupModalOpen(true)}
                  >
                    Добавить группу
                  </button>
                  <div className="dhm-search-container">
                    <input
                      type="text"
                      className="dhm-search-input"
                      placeholder="Поиск по группам"
                      value={searchTerm}
                      onChange={handleSearchChange}
                    />
                  </div>
                </div>
              </div>

              {/* Фильтр по курсам */}
              <div className="dhm-course-filter">
                <button 
                  className={`dhm-course-filter-btn ${selectedCourse === 'all' ? 'active' : ''}`}
                  onClick={() => handleCourseFilterChange('all')}
                >
                  Все курсы
                </button>
                {[1, 2, 3, 4].map(course => (
                  <button
                    key={course}
                    className={`dhm-course-filter-btn ${selectedCourse === course ? 'active' : ''}`}
                    onClick={() => handleCourseFilterChange(course)}
                  >
                    {course} курс
                  </button>
                ))}
              </div>

              {/* Отображение групп по курсам */}
              <div className="dhm-courses-container">
                {selectedCourse === 'all' ? (
                  // Показываем все курсы
                  [1, 2, 3, 4].map(course => (
                    groupsByCourse[course as keyof typeof groupsByCourse].length > 0 && (
                      <div key={course} className="dhm-course-section">
                        <h3 className="dhm-course-title">{course} курс</h3>
                        <div className="dhm-groups-grid">
                          {groupsByCourse[course as keyof typeof groupsByCourse].map(group => renderGroupCard(group))}
                        </div>
                      </div>
                    )
                  ))
                ) : (
                  // Показываем только выбранный курс
                  <div className="dhm-course-section">
                    <h3 className="dhm-course-title">{selectedCourse} курс</h3>
                    <div className="dhm-groups-grid">
                      {groupsByCourse[selectedCourse as keyof typeof groupsByCourse].map(group => renderGroupCard(group))}
                    </div>
                  </div>
                )}

                {filteredGroups.length === 0 && (
                  <div className="dhm-no-groups">
                    <p>Группы не найдены</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Модальное окно с информацией о группе */}
      {isModalOpen && selectedGroupId && (
        <div className="dhm-modal-overlay" onClick={handleCloseModal}>
          <div className="dhm-modal-content" onClick={(e) => e.stopPropagation()}>
            <GroupDetail 
              groupId={selectedGroupId} 
              onClose={handleCloseModal}
              onGroupDeleted={loadGroups} 
            />
          </div>
        </div>
      )}

      {/* Модальное окно добавления группы */}
      {isAddGroupModalOpen && (
        <AddGroupModal
          onClose={handleCloseAddGroupModal}
          onAdd={handleAddGroup}
        />
      )}
    </>
  );
};