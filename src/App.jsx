import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import NewsStream from './pages/NewsStream';
import NewsAnalysis from './pages/NewsAnalysis';
import ThinkingProcess from './pages/ThinkingProcess';
import './styles/App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('news-stream');

  return (
    <div className="app">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <main className="main-content">
        {currentPage === 'news-stream' && <NewsStream />}
        {currentPage === 'news-analysis' && <NewsAnalysis />}
        {currentPage === 'thinking-process' && <ThinkingProcess />}
      </main>
    </div>
  );
}

export default App;

