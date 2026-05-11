import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../constants/apiConstant';
import { useUser } from '../context/UserContext';
import './PersonalCabinetMetodist.css';

interface Staff {
  id: number;
  lastName: string;
  name: string;
  patronymic: string;
  login: string;
  email: string;
  staffPosition: Array<{ id: number; name: string }>;
}

interface Group {
  id: number;
  numberGroup: number;
  course: number;
}

export const PersonalCabinet: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [staff, setStaff] = useState<Staff | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    loadStaffData(user.id);
    loadGroups();
  }, [user]);

  const loadStaffData = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/staffs/id/${id}`);
      if (res.ok) {
        const data = await res.json();
        setStaff(data);
        setNewEmail(data.email || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/groups`);
      if (res.ok) {
        const data = await res.json();
        setGroups(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateEmail = async () => {
    if (!staff || !newEmail.trim()) return;
    setSaving(true);
    try {
        const res = await fetch(`${API_BASE_URL}/api/v1/staffs/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: staff.id, email: newEmail })
        });

        if (res.ok) {
        setStaff(prev => prev ? { ...prev, email: newEmail } : null);
        setIsEditingEmail(false);
        }
    } catch (err) {
        console.error(err);
    } finally {
        setSaving(false);
    }
    };

  const groupsByCourse = groups.reduce((acc, group) => {
    if (!acc[group.course]) acc[group.course] = [];
    acc[group.course].push(group);
    return acc;
  }, {} as Record<number, Group[]>);

  if (loading) return <div className="cs-loading">Загрузка...</div>;

  return (
    <div className="personal-cabinet-container">
      <div className="cabinet-content">
        {/* Информация о методисте */}
        <div className="info-card">
          <div className="card-header">
            <button className="back-button" onClick={() => navigate('/metodist')}>← Назад</button>
          </div>
          
          {staff && (
            <div className="staff-info-wrapper">
              <div className="info-column">
                <div className="info-field">
                  <label>Фамилия</label>
                  <div className="field-value">{staff.lastName}</div>
                </div>
                <div className="info-field">
                  <label>Имя</label>
                  <div className="field-value">{staff.name}</div>
                </div>
                <div className="info-field">
                  <label>Отчество</label>
                  <div className="field-value">{staff.patronymic || '—'}</div>
                </div>
                <div className="info-field">
                  <label>Должность</label>
                  <div className="field-value">{staff.staffPosition.map(p => p.name).join(', ')}</div>
                </div>
              </div>

              <div className="info-column">
                <div className="info-field">
                  <label>Логин</label>
                  <div className="field-value">{staff.login}</div>
                </div>
                <div className="info-field">
                  <label>Электронная почта</label>
                  <div className="email-display">
                    <div className="field-value email-value">
                      {staff.email || 'Не заполнено'}
                    </div>
                    {!isEditingEmail && (
                      <button 
                        onClick={() => setIsEditingEmail(true)}
                        className="edit-email-btn">
                        Изменить
                      </button>
                    )}
                  </div>
                  {isEditingEmail && (
                    <div className="email-edit">
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="Введите email"
                        className="email-input"
                        autoFocus/>
                      <div className="email-edit-actions">
                        <button 
                          onClick={updateEmail} 
                          disabled={saving}
                          className="save-email-btn">
                          {saving ? 'Сохранение...' : 'Сохранить'}
                        </button>
                        <button 
                          onClick={() => {
                            setIsEditingEmail(false);
                            setNewEmail(staff.email || '');
                          }}
                          className="cancel-email-btn">
                          Отмена
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="groups-section">
          <div className="courses-grid">
            {Object.keys(groupsByCourse)
              .sort((a, b) => Number(a) - Number(b))
              .map(course => (
                <div key={course} className="course-column">
                  <h3>{course} курс</h3>
                  <div className="groups-list">
                    {groupsByCourse[Number(course)]
                      .sort((a, b) => a.numberGroup - b.numberGroup)
                      .map(group => (
                        <div key={group.id} className="group-item">
                          {group.numberGroup}
                        </div>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};