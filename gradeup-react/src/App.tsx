import { useState } from 'react';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { AthleteDashboard } from './pages/AthleteDashboard';
import { BrandDashboard } from './pages/BrandDashboard';
import { DirectorDashboard } from './pages/DirectorDashboard';

type View = 'home' | 'athlete' | 'brand' | 'director';

function App() {
  const [currentView, setCurrentView] = useState<View>('home');

  const handleNavigate = (section: string) => {
    if (section === 'home') {
      setCurrentView('home');
    } else {
      // Scroll to section on landing page
      const element = document.getElementById(section);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleDashboard = (type: 'director' | 'athlete' | 'brand') => {
    setCurrentView(type);
  };

  const handleBack = () => {
    setCurrentView('home');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Only show Navbar on landing page */}
      {currentView === 'home' && (
        <Navbar onNavigate={handleNavigate} onDashboard={handleDashboard} />
      )}

      {/* Render current view */}
      {currentView === 'home' && (
        <LandingPage onNavigate={handleNavigate} onDashboard={handleDashboard} />
      )}
      {currentView === 'athlete' && (
        <AthleteDashboard onBack={handleBack} />
      )}
      {currentView === 'brand' && (
        <BrandDashboard onBack={handleBack} />
      )}
      {currentView === 'director' && (
        <DirectorDashboard onBack={handleBack} />
      )}
    </div>
  );
}

export default App;
