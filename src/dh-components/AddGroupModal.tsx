import React, { useState } from 'react';
import './AddGroupModalStyle.css';

interface AddGroupModalProps {
  onClose: () => void;
  onAdd: (groupNumber: string) => Promise<void>;
}

export const AddGroupModal: React.FC<AddGroupModalProps> = ({ onClose, onAdd }) => {
  const [groupNumber, setGroupNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!groupNumber.trim()) {
      setError('Введите номер группы');
      return;
    }

    // Проверка, что введены только цифры
    if (!/^\d+$/.test(groupNumber.trim())) {
      setError('Номер группы должен содержать только цифры');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onAdd(groupNumber.trim());
      onClose();
    } catch (err) {
      setError('Ошибка при добавлении группы. Попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="agm-modal-overlay" onClick={onClose}>
      <div className="agm-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="agm-modal-header">
          <h2 className="agm-modal-title">Добавление новой группы</h2>
          <button className="agm-modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="agm-modal-form">
          <div className="agm-form-group">
            <label htmlFor="groupNumber" className="agm-form-label">
              Номер группы
            </label>
            <input
              type="text"
              id="groupNumber"
              className="agm-form-input"
              value={groupNumber}
              onChange={(e) => setGroupNumber(e.target.value)}
              placeholder="Введите номер группы (например: 2993)"
              disabled={loading}
              autoFocus
            />
            {error && <div className="agm-error-message">{error}</div>}
          </div>

          <div className="agm-modal-footer">
            <button
              type="button"
              className="agm-btn agm-btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="agm-btn agm-btn-primary"
              disabled={loading}
            >
              {loading ? 'Добавление...' : 'Добавить группу'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};