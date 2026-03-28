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

interface DepartmentManagementSectionProps {
  initialGroupId?: number | null;
  embedded?: boolean;
  onBack?: () => void;
  onGroupSelect?: (groupId: number | null) => void;
}

export const DepartmentManagementSection: React.FC<DepartmentManagementSectionProps> = ({ 
  initialGroupId = null, 
  embedded = false,
  onBack,
  onGroupSelect 
}) => {
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(initialGroupId);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddGroupModalOpen, setIsAddGroupModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<number | 'all'>('all');
  const [academicGroups, setAcademicGroups] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (initialGroupId) {
      setSelectedGroupId(initialGroupId);
      setIsModalOpen(true);
    }
  }, [initialGroupId]);

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
    setIsModalOpen(true);
    if (onGroupSelect) {
      onGroupSelect(groupId);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedGroupId(null);
    if (onBack) {
      onBack();
    }
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
      className={`dhm-group-card ${selectedGroupId === group.id ? 'active' : ''}`}
      onClick={() => handleGroupClick(group.id)}
    >
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
          <div className="dhm-info-compact">
            <span className="dhm-info-label-compact">Студентов:</span>
            <span className="dhm-info-value-compact">{group.students}</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="dhm-embedded-loading">
        <div className="dhm-loading-spinner-small"></div>
        <p>Загрузка групп...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dhm-embedded-error">
        <p className="dhm-error-message">{error}</p>
        <button className="dhm-retry-button-small" onClick={loadGroups}>
          Повторить
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="dhm-embedded-container">
        {/* Поиск и фильтры */}
        <div className="dhm-embedded-controls">
          <div className="dhm-embedded-search">
            <input
              type="text"
              className="dhm-embedded-search-input"
              placeholder="Поиск по группам..."
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
          <div className="dhm-embedded-filters">
            <button 
              className={`dhm-filter-btn ${selectedCourse === 'all' ? 'active' : ''}`}
              onClick={() => handleCourseFilterChange('all')}
            >
              Все
            </button>
            {[1, 2, 3, 4].map(course => (
              <button
                key={course}
                className={`dhm-filter-btn ${selectedCourse === course ? 'active' : ''}`}
                onClick={() => handleCourseFilterChange(course)}
              >
                {course} курс
              </button>
            ))}
          </div>
        </div>

        {/* Список групп */}
        <div className="dhm-embedded-groups">
          {selectedCourse === 'all' ? (
            [1, 2, 3, 4].map(course => (
              groupsByCourse[course as keyof typeof groupsByCourse].length > 0 && (
                <div key={course} className="dhm-embedded-course-group">
                  <h4 className="dhm-embedded-course-title">{course} курс</h4>
                  <div className="dhm-embedded-groups-grid">
                    {groupsByCourse[course as keyof typeof groupsByCourse].map(group => renderGroupCard(group))}
                  </div>
                </div>
              )
            ))
          ) : (
            <div className="dhm-embedded-course-group">
              <h4 className="dhm-embedded-course-title">{selectedCourse} курс</h4>
              <div className="dhm-embedded-groups-grid">
                {groupsByCourse[selectedCourse as keyof typeof groupsByCourse].map(group => renderGroupCard(group))}
              </div>
            </div>
          )}

          {filteredGroups.length === 0 && (
            <div className="dhm-embedded-no-groups">
              <p>Группы не найдены</p>
            </div>
          )}
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
    </>
  );
};