import React, { useState, useEffect } from 'react';
import { headApiService } from '../services/headApiService';
import './SelectCuratorModalStyle.css'; 

interface Staff {
  id: number;
  lastName: string;
  name: string;
  patronymic: string;
  email: string;
}

interface SelectCuratorModalProps {
  onClose: () => void;
  onSelect: (staffId: number, staffFullName: string) => void;
  currentCuratorId?: number;
}

export const SelectCuratorModal: React.FC<SelectCuratorModalProps> = ({
  onClose,
  onSelect,
  currentCuratorId
}) => {
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [filteredStaffs, setFilteredStaffs] = useState<Staff[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStaffs();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredStaffs(staffs);
    } else {
      const lowerSearch = searchTerm.toLowerCase();
      const filtered = staffs.filter(staff =>
        `${staff.lastName} ${staff.name} ${staff.patronymic}`.toLowerCase().includes(lowerSearch) ||
        staff.email.toLowerCase().includes(lowerSearch)
      );
      setFilteredStaffs(filtered);
    }
  }, [searchTerm, staffs]);

  const loadStaffs = async () => {
    try {
      setLoading(true);
      const data = await headApiService.getStaffs();
      setStaffs(data);
      setFilteredStaffs(data);
    } catch (err) {
      console.error('Ошибка загрузки сотрудников:', err);
      setError('Не удалось загрузить список сотрудников');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (staff: Staff) => {
    const fullName = `${staff.lastName} ${staff.name} ${staff.patronymic}`.trim();
    onSelect(staff.id, fullName);
    onClose();
  };

  const getStaffFullName = (staff: Staff) => {
    return `${staff.lastName} ${staff.name} ${staff.patronymic}`.trim();
  };

  return (
    <div className="scm-modal-overlay" onClick={onClose}>
      <div className="scm-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="scm-modal-header">
          <h2 className="scm-modal-title">Выбор куратора</h2>
          <button className="scm-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="scm-modal-body">
          <div className="scm-search-container">
            <input
              type="text"
              className="scm-search-input"
              placeholder="Поиск по ФИО или email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {loading ? (
            <div className="scm-loading">Загрузка списка сотрудников...</div>
          ) : error ? (
            <div className="scm-error">{error}</div>
          ) : filteredStaffs.length === 0 ? (
            <div className="scm-empty">Сотрудники не найдены</div>
          ) : (
            <div className="scm-staffs-list">
              {filteredStaffs.map(staff => (
                <div
                  key={staff.id}
                  className={`scm-staff-item ${staff.id === currentCuratorId ? 'scm-staff-item-current' : ''}`}
                  onClick={() => handleSelect(staff)}
                >
                  <div className="scm-staff-name">{getStaffFullName(staff)}</div>
                  <div className="scm-staff-email">{staff.email}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};