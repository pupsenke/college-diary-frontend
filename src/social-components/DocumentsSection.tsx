import React, { useState, useMemo } from 'react';
import './DocumentsSection.css';

export const DocumentsSection: React.FC = () => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>('material');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [refreshing, setRefreshing] = useState(false);

  const toggleCategory = (category: string) => {
    if (expandedCategory === category) {
      setExpandedCategory(null);
    } else {
      setExpandedCategory(category);
    }
  };

  const documentCategories = [
    {
      id: 'material',
      title: 'Материальная помощь',
      iconPath: 'social-icons/money_icon.svg',
      items: [
        {
          category: '1 категория',
          description: 'Проживание в неполной семье',
          documents: [
            'СНИЛС',
            'Паспорт',
            'Свидетельство о расторжении брака',
            'ИНН',
            'Справка о составе семьи',
            'Заявление на материальную помощь'
          ]
        },
        {
          category: '2 категория',
          description: 'Проживание в многодетной семье',
          documents: [
            'СНИЛС',
            'Паспорт',
            'Удостоверение многодетной семьи',
            'ИНН',
            'Справка о составе семьи',
            'Справки о доходах всех членов семьи'
          ]
        },
        {
          category: '3 категория',
          description: 'Студент с ограниченными возможностями здоровья',
          documents: [
            'СНИЛС',
            'Паспорт',
            'Справка МСЭ',
            'ИНН',
            'Индивидуальная программа реабилитации',
            'Заявление на материальную помощь'
          ]
        },
        {
          category: '4 категория',
          description: 'Потеря кормильца',
          documents: [
            'СНИЛС',
            'Паспорт',
            'Свидетельство о смерти кормильца',
            'ИНН',
            'Справка о назначении пенсии по потере кормильца',
            'Заявление на материальную помощь'
          ]
        }
      ]
    },
    {
      id: 'social',
      title: 'Социальная стипендия',
      iconPath: 'social-icons/scholarship_icon.svg',
      items: [
        {
          category: '1 категория',
          description: 'Студенты из малоимущих семей',
          documents: [
            'СНИЛС',
            'Паспорт',
            'Справка о признании семьи малоимущей',
            'ИНН',
            'Справки о доходах всех членов семьи',
            'Заявление на социальную стипендию'
          ]
        },
        {
          category: '2 категория',
          description: 'Дети-сироты и дети, оставшиеся без попечения родителей',
          documents: [
            'СНИЛС',
            'Паспорт',
            'Документ о статусе ребенка-сироты',
            'ИНН',
            'Документы об опеке/попечительстве',
            'Заявление на социальную стипендию'
          ]
        },
        {
          category: '3 категория',
          description: 'Студенты с инвалидностью I и II группы',
          documents: [
            'СНИЛС',
            'Паспорт',
            'Справка МСЭ',
            'ИНН',
            'Индивидуальная программа реабилитации',
            'Заявление на социальную стипендию'
          ]
        }
      ]
    },
    {
      id: 'dorm',
      title: 'Проживание в общежитии',
      iconPath: 'social-icons/dorm_icon.svg',
      items: [
        {
          category: '1 категория',
          description: 'Льготная категория (вне очереди)',
          documents: [
            'СНИЛС',
            'Паспорт',
            'Документы, подтверждающие льготную категорию',
            'ИНН',
            'Медицинская справка формы 086-у',
            'Заявление на заселение в общежитие'
          ]
        },
        {
          category: '2 категория',
          description: 'Иногородние студенты',
          documents: [
            'СНИЛС',
            'Паспорт',
            'Справка о регистрации по месту жительства',
            'ИНН',
            'Медицинская справка формы 086-у',
            'Заявление на заселение в общежитие',
            'Фото 3x4 (2 шт.)'
          ]
        }
      ]
    },
    {
      id: 'benefits',
      title: 'Льготы и компенсации',
      iconPath: 'social-icons/benefits_icon.svg',
      items: [
        {
          category: '1 категория',
          description: 'Компенсация проезда',
          documents: [
            'СНИЛС',
            'Паспорт',
            'Студенческий билет',
            'Проездные билеты',
            'Заявление на компенсацию'
          ]
        },
        {
          category: '2 категория',
          description: 'Льготное питание',
          documents: [
            'СНИЛС',
            'Паспорт',
            'Документ, подтверждающий льготу',
            'Заявление на льготное питание'
          ]
        }
      ]
    }
  ];

  // Фильтрация по поисковому запросу
  const filteredCategories = useMemo(() => {
    if (!searchQuery) return documentCategories;
    
    return documentCategories.map(category => ({
      ...category,
      items: category.items.filter(item => 
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.documents.some(doc => doc.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    })).filter(category => category.items.length > 0);
  }, [searchQuery]);

  // Копирование списка документов
  const copyDocumentsList = (documents: string[]) => {
    const text = documents.join('\n');
    navigator.clipboard.writeText(text);
    // Здесь можно добавить уведомление об успешном копировании
  };

  // Обновление данных
  const handleRefresh = async () => {
    setRefreshing(true);
    // Имитация загрузки
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  // Информационная иконка
  const InfoIcon = () => (
    <div className="info-icon-btn" tabIndex={0}>
      <button className="header-btn" type="button">
        <span className="info-icon-text">i</span>
        <span>Информация</span>
      </button>
      <div className="info-tooltip small">
        <div className="info-tooltip-content">
          <div className="info-header">
            <div className="info-title">
              <h3>Документы и льготы</h3>
              <p>Здесь отображаются все категории социальной поддержки и необходимые документы для их получения.</p>
            </div>
          </div>
          
          <div className="info-section">
            <h4>Основные возможности</h4>
            <div className="features-grid">
              <div className="feature-item">
                <span className="feature-icon"></span>
                <span>Просмотр списков документов по категориям</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon"></span>
                <span>Поиск по категориям и документам</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon"></span>
                <span>Копирование списка документов</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon"></span>
                <span>Переключение между карточками и списком</span>
              </div>
            </div>
          </div>

          <div className="info-section">
            <h4>Как использовать</h4>
            <div className="usage-steps">
              <div className="step">
                <span className="step-number">1</span>
                <span>Выберите категорию поддержки из списка</span>
              </div>
              <div className="step">
                <span className="step-number">2</span>
                <span>Используйте поиск для быстрого нахождения нужных документов</span>
              </div>
              <div className="step">
                <span className="step-number">3</span>
                <span>Нажмите на иконку копирования, чтобы скопировать список документов</span>
              </div>
              <div className="step">
                <span className="step-number">4</span>
                <span>Переключайтесь между карточками и списком для удобного просмотра</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Кнопка обновления
  const RefreshButton = () => (
    <button 
      className={`header-btn pc-refresh-btn ${refreshing ? 'pc-refreshing' : ''}`}
      onClick={handleRefresh}
      disabled={refreshing}
    >
      <img 
        src="/st-icons/upload_icon.svg" 
        className={`pc-refresh-icon ${refreshing ? 'pc-refresh-spin' : ''}`}
        alt="Обновить"
      />
      <span>{refreshing ? 'Обновление...' : 'Обновить данные'}</span>
    </button>
  );

  // Рендер карточки категории
  const renderCategoryCard = (category: any) => {
    return (
      <div key={category.id} className="doc-category-card">
        <div 
          className="doc-category-header"
          onClick={() => toggleCategory(category.id)}
        >
          <div className="doc-category-title">
            <div className="doc-category-icon-wrapper">
              <img 
                src={category.iconPath} 
                alt={category.title} 
                className="doc-category-svg-icon" 
              />
            </div>
            <h3 className="doc-category-name">{category.title}</h3>
          </div>
          <span className={`doc-category-toggle ${expandedCategory === category.id ? 'expanded' : ''}`}>
            <img 
              src="social-icons/lower_icon.svg" 
              alt="Toggle" 
              className="doc-chevron-icon"
            />
          </span>
        </div>
        
        {expandedCategory === category.id && (
          <div className="doc-category-content">
            {viewMode === 'cards' ? (
              // Карточки видов поддержки
              <div className="doc-items-cards">
                {category.items.map((item: any, index: number) => (
                  <div key={index} className="doc-item-card">
                    <div className="doc-item-card-header">
                      <div className="doc-item-badges">
                        <span className="doc-item-badge-category">{item.category}</span>
                        <span className="doc-item-badge-count">
                          {item.documents.length} документов
                        </span>
                      </div>
                      <button 
                        className="doc-copy-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyDocumentsList(item.documents);
                        }}
                        title="Копировать список документов"
                      >
                        <img src="social-icons/copy_icon.svg" alt="Копировать" />
                      </button>
                    </div>
                    
                    <p className="doc-item-description">{item.description}</p>
                    
                    <div className="doc-documents-list">
                      <div className="doc-documents-list-header">
                        <span className="doc-documents-list-title">Необходимые документы:</span>
                      </div>
                      <div className="doc-documents-grid">
                        {item.documents.map((doc: string, docIndex: number) => (
                          <div key={docIndex} className="doc-document-tag">
                            <span className="doc-document-bullet">•</span>
                            <span className="doc-document-name">{doc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Список видов поддержки
              <div className="doc-items-list">
                {category.items.map((item: any, index: number) => (
                  <div key={index} className="doc-item-list-row">
                    <div className="doc-item-list-main">
                      <div className="doc-item-list-header">
                        <div className="doc-item-list-badges">
                          <span className="doc-item-badge-category">{item.category}</span>
                          <span className="doc-item-badge-count">
                            {item.documents.length} документов
                          </span>
                        </div>
                        <button 
                          className="doc-copy-btn-small"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyDocumentsList(item.documents);
                          }}
                          title="Копировать список документов"
                        >
                          <img src="social-icons/copy_icon.svg" alt="Копировать" />
                          <span>Копировать</span>
                        </button>
                      </div>
                      <p className="doc-item-list-description">{item.description}</p>
                      <div className="doc-documents-list-compact">
                        {item.documents.map((doc: string, docIndex: number) => (
                          <span key={docIndex} className="doc-document-chip">
                            {doc}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Рендер элемента списка категорий
  const renderCategoryListItem = (category: any) => {
    return (
      <div 
        key={category.id} 
        className="doc-category-list-item"
        onClick={() => toggleCategory(category.id)}
      >
        <div className="doc-category-list-main">
          <div className="doc-category-list-header">
            <div className="doc-category-list-info">
              <div className="doc-category-list-icon-wrapper">
                <img 
                  src={category.iconPath} 
                  alt={category.title} 
                  className="doc-category-list-icon" 
                />
              </div>
              <span className="doc-category-list-name">{category.title}</span>
            </div>
            <span className={`doc-category-list-toggle ${expandedCategory === category.id ? 'expanded' : ''}`}>
              <img 
                src="social-icons/lower_icon.svg" 
                alt="Toggle" 
                className="doc-chevron-icon" 
              />
            </span>
          </div>
        </div>
        
        {expandedCategory === category.id && (
          <div className="doc-category-list-expanded">
            {category.items.map((item: any, index: number) => (
              <div key={index} className="doc-category-list-subitem">
                <div className="doc-subitem-header">
                  <div className="doc-subitem-badges">
                    <span className="doc-subitem-category">{item.category}</span>
                    <span className="doc-subitem-count">{item.documents.length} документов</span>
                  </div>
                  <button 
                    className="doc-subitem-copy"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyDocumentsList(item.documents);
                    }}
                  >
                    <img src="social-icons/copy_icon.svg" alt="Копировать" />
                  </button>
                </div>
                <p className="doc-subitem-description">{item.description}</p>
                <div className="doc-subitem-documents">
                  {item.documents.map((doc: string, docIndex: number) => (
                    <span key={docIndex} className="doc-subitem-doc">
                      {doc}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Подсчет статистики
  const totalCategories = documentCategories.length;
  const totalSupportTypes = documentCategories.reduce((acc, cat) => acc + cat.items.length, 0);
  const totalDocuments = documentCategories.reduce((acc, cat) => 
    acc + cat.items.reduce((sum, item) => sum + item.documents.length, 0), 0
  );

  return (
    <div className="doc-documents-section">
      {/* Заголовок с кнопками */}
      <div className="doc-cabinet-header">
        <InfoIcon />
        <div className="doc-header-actions">
          <RefreshButton />
        </div>
      </div>

      {/* Панель управления */}
      <div className="doc-control-panel">
        <div className="doc-controls-top-row">
          <div className="doc-search-box">
            <input
              type="text"
              placeholder="Поиск по категориям, описаниям и документам..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="doc-search-input"
            />
            <div className="doc-search-icon">
              <img src="/social-icons/search_icon.svg" alt="Поиск" />
            </div>
            {searchQuery && (
              <button className="doc-search-clear" onClick={() => setSearchQuery('')}>
                ✕
              </button>
            )}
          </div>
          
          <div className="doc-view-toggle">
            <button 
              className={`doc-view-btn ${viewMode === 'cards' ? 'doc-view-active' : ''}`}
              onClick={() => setViewMode('cards')}
              title="Карточки"
            >
              <img src="/social-icons/cards_icon.svg" alt="Карточки" />
              <span>Карточки</span>
            </button>
            <button 
              className={`doc-view-btn ${viewMode === 'list' ? 'doc-view-active' : ''}`}
              onClick={() => setViewMode('list')}
              title="Список"
            >
              <img src="/social-icons/list_icon.svg" alt="Список" />
              <span>Список</span>
            </button>
          </div>
        </div>

        <div className="doc-controls-middle-row">
          <div className="doc-filters-grid">
            <div className="doc-filter-group">
              <label className="doc-filter-label">Категория поддержки</label>
              <select 
                className="doc-filter-select" 
                value={selectedCategory || 'all'} 
                onChange={(e) => setSelectedCategory(e.target.value === 'all' ? null : e.target.value)}
              >
                <option value="all">Все категории</option>
                {documentCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.title}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Карточки статистики */}
      <div className="doc-stats-cards">
        <div className="doc-stat-card">
          <div className="doc-stat-icon">
            <img src="/social-icons/all_categories_icon.svg" alt="Категории" />
          </div>
          <div className="doc-stat-info">
            <h3>{totalCategories}</h3>
            <p>Всего категорий</p>
          </div>
        </div>
        
        <div className="doc-stat-card">
          <div className="doc-stat-icon">
            <img src="/social-icons/support_types_icon.svg" alt="Виды поддержки" />
          </div>
          <div className="doc-stat-info">
            <h3>{totalSupportTypes}</h3>
            <p>Видов поддержки</p>
          </div>
        </div>
      </div>

      {/* Контент */}
      <div className="doc-content-section">
        <div className="doc-section-header">
          <h3>Категории социальной поддержки</h3>
          <div className="doc-items-count">
            <img src="/social-icons/all_categories_icon.svg" alt="Фильтр" />
            <span>
              Показано: <strong>
                {(searchQuery || selectedCategory ? filteredCategories : documentCategories)
                  .filter(cat => !selectedCategory || cat.id === selectedCategory)
                  .length
                }
              </strong> из <strong>{documentCategories.length}</strong>
            </span>
          </div>
        </div>

        {searchQuery && (
          <div className="doc-search-results-info">
            Найдено результатов: {
              filteredCategories
                .filter(cat => !selectedCategory || cat.id === selectedCategory)
                .reduce((acc, cat) => acc + cat.items.length, 0)
            }
          </div>
        )}

        <div className="doc-categories-container">
          {viewMode === 'cards' ? (
            <div className="doc-categories-cards">
              {(searchQuery ? filteredCategories : documentCategories)
                .filter(cat => !selectedCategory || cat.id === selectedCategory)
                .map(category => renderCategoryCard(category))
              }
            </div>
          ) : (
            <div className="doc-categories-list">
              {(searchQuery ? filteredCategories : documentCategories)
                .filter(cat => !selectedCategory || cat.id === selectedCategory)
                .map(category => renderCategoryListItem(category))
              }
            </div>
          )}

          {(searchQuery || selectedCategory) && 
            (searchQuery ? filteredCategories : documentCategories)
              .filter(cat => !selectedCategory || cat.id === selectedCategory)
              .length === 0 && (
            <div className="doc-empty-state">
              <p>Категории не найдены</p>
              <p className="doc-empty-subtitle">Попробуйте изменить параметры поиска или фильтры</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};