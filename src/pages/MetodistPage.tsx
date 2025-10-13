import React, { useState } from 'react';
import { Header } from '../st-components/HeaderStudent';
import { useUser } from '../context/UserContext';
import './MetodistStyle.css';
import { useNavigate } from 'react-router-dom';

export const MetodistPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { user } = useUser();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="metodist-container">
        <div className="metodist-content">
          <div>Загрузка...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="metodist-container">
      <div className="metodist-background-animation">
        <div className="metodist-shape metodist-shape-1"></div>
        <div className="metodist-shape metodist-shape-2"></div>
        <div className="metodist-shape metodist-shape-3"></div>
      </div>

      <div className="metodist-content">
        <Header />

        <div className="metodist-main">
          <main className="metodist-content-area">

          </main>
        </div>
      </div>
    </div>
  );
};