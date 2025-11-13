import React, { useState, useEffect } from 'react';
import { useCache } from '../context/CacheContext';
import './CacheWarning.css';

interface CacheWarningProps {
  title?: string;
  description?: string;
  showRefreshButton?: boolean;
  forceShow?: boolean;
}

export const CacheWarning: React.FC<CacheWarningProps> = ({ 
  title = "Используются кэшированные данные",
  description = "Отсутствует подключение к интернету. Для получения актуальной информации восстановите соединение.",
  forceShow = false
}) => {
  const { forceCacheCheck } = useCache();
  const [showWarning, setShowWarning] = useState(false);

  const { showCacheWarning } = useCache();
  const shouldShow = forceShow || showCacheWarning;

  useEffect(() => {
    if (shouldShow) {
      setShowWarning(true);
    } else {
      const timer = setTimeout(() => {
        setShowWarning(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [shouldShow]);

  if (!showWarning) return null;

  return (
    <div className={`cache-warning ${!shouldShow ? 'cache-warning-fadeout' : ''}`}>
      <div className="cache-warning-content">
        <div className="cache-warning-icon"></div>
        <div className="cache-warning-text">
          <div className="cache-warning-title">{title}</div>
          <div className="cache-warning-description">
            {description}
          </div>
        </div>
      </div>
    </div>
  );
};