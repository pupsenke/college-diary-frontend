import React, { useState } from 'react';
import { Header } from '../components/Header';
import './HeadStyle.css';

export const HeadPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('stats');

  return (
    <div className="head-page">
      {/* <Header title="Панель заведующего" /> */}
      
      <div className="page-content">
        <nav className="navigation-tabs">
          <button 
            className={activeTab === 'stats' ? 'active' : ''}
            onClick={() => setActiveTab('stats')}
          >
            📈 Статистика
          </button>
          <button 
            className={activeTab === 'reports' ? 'active' : ''}
            onClick={() => setActiveTab('reports')}
          >
            📋 Отчеты
          </button>
          <button
            className={activeTab === 'management' ? 'active' : ''}
            onClick={() => setActiveTab('management')}
          >
            ⚙️ Управление
          </button>
        </nav>

        <main className="main-content">
          <h2>Добро пожаловать в панель заведующего</h2>
          {/* Контент для каждой вкладки */}
        </main>
      </div>
    </div>
  );
};

export {};