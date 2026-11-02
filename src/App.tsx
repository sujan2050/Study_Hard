import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout, Screen } from './components/Layout';
import { WelcomePage } from './components/WelcomePage';
import { ReviewInbox } from './components/ReviewInbox';
import { Library } from './components/Library';
import { Study } from './components/Study';
import { Progress } from './components/Progress';
import { AddNotes } from './components/AddNotes';
import { AuthModal } from './components/AuthModal';
import { api } from './lib/api';

const MainApp: React.FC = () => {
  const { user } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>('welcome');
  const [draftCount, setDraftCount] = useState<number>(0);

  // Fetch count of drafts awaiting review
  const refreshDraftCount = useCallback(async () => {
    try {
      const res = await api.getCards('draft');
      setDraftCount(res.cards.length);
    } catch (err) {
      console.warn('Could not refresh draft count:', err);
    }
  }, []);

  useEffect(() => {
    refreshDraftCount();
  }, [refreshDraftCount, user]);

  return (
    <>
      <Layout
        currentScreen={currentScreen}
        onNavigate={(screen) => {
          setCurrentScreen(screen);
          refreshDraftCount();
        }}
        draftCount={draftCount}
      >
        {currentScreen === 'welcome' && (
          <WelcomePage
            onNavigateToAdd={() => {
              setCurrentScreen('add');
              refreshDraftCount();
            }}
            onNavigateToInbox={() => {
              setCurrentScreen('inbox');
              refreshDraftCount();
            }}
            onNavigateToLibrary={() => {
              setCurrentScreen('library');
              refreshDraftCount();
            }}
          />
        )}

        {currentScreen === 'inbox' && (
          <ReviewInbox
            onCardStatusChanged={refreshDraftCount}
            onNavigateToAdd={() => setCurrentScreen('add')}
          />
        )}

        {currentScreen === 'library' && (
          <Library
            onNavigateToStudy={() => setCurrentScreen('study')}
            onNavigateToAdd={() => setCurrentScreen('add')}
          />
        )}

        {currentScreen === 'study' && (
          <Study
            onNavigateToInbox={() => setCurrentScreen('inbox')}
            onNavigateToAdd={() => setCurrentScreen('add')}
          />
        )}

        {currentScreen === 'progress' && (
          <Progress
            onNavigateToStudy={() => setCurrentScreen('study')}
            onNavigateToInbox={() => setCurrentScreen('inbox')}
          />
        )}

        {currentScreen === 'add' && (
          <AddNotes
            onCardsGenerated={(count) => {
              refreshDraftCount();
            }}
            onNavigateToInbox={() => {
              setCurrentScreen('inbox');
              refreshDraftCount();
            }}
          />
        )}
      </Layout>

      {/* Auth Modal */}
      <AuthModal />
    </>
  );
};


export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
};

export default App;

