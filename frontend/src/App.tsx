import { useState } from 'react';
import SubtitleMode from './features/subtitle';
import ScriptMode from './features/script';
import SystemInfo from './components/SystemInfo';
import SystemFooter from './components/SystemFooter';
import AppHeader from './components/AppHeader';
import AppModeToggle from './components/AppModeToggle';
import AppAudioResult from './components/AppAudioResult';
import LoadingOverlay from './components/ui/LoadingOverlay';
import { VoicesManagementModal } from './components/VoicesManagement';
import { useGlobalContext } from './context/GlobalContext';

function App() {
  const { appMode, setAppMode, systemInfo, isProcessing, audioUrl, isBackendReady } = useGlobalContext();
  const [showSystemInfo, setShowSystemInfo] = useState(false);
  const [showVoicesModal, setShowVoicesModal] = useState(false);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 flex flex-col items-center py-12 px-4 selection:bg-blue-500/30">
      {/* Loading Overlay when backend is not ready */}
      {!isBackendReady && <LoadingOverlay />}

      {/* System Info Modal */}
      <SystemInfo isOpen={showSystemInfo} onClose={() => setShowSystemInfo(false)} />

      {/* Voices Manager Modal */}
      <VoicesManagementModal isOpen={showVoicesModal} onClose={() => setShowVoicesModal(false)} />

      {/* Header Container */}
      <AppHeader 
        onShowSystemInfo={() => setShowSystemInfo(true)} 
        onShowVoiceLibrary={() => setShowVoicesModal(true)}
      />

      {/* Main Glass Panel Card */}
      <div className="glass-panel w-full max-w-4xl rounded-2xl p-6 md:p-8 relative overflow-hidden">

        {/* Abstract Background Glows */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[128px] -z-10" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[128px] -z-10" />

        {/* Mode Toggle Switch */}
        <AppModeToggle mode={appMode} setMode={setAppMode} />

        {/* Dynamic Mode Forms */}
        <div className="relative z-10 animate-fade-in">
          {appMode === 'subtitle' ? (
            <SubtitleMode />
          ) : (
            <ScriptMode />
          )}
        </div>

      </div>

      {/* Result Audio Player */}
      <AppAudioResult audioUrl={audioUrl} isProcessing={isProcessing} />

      {/* Footer */}
      <SystemFooter systemInfo={systemInfo} />

    </div>
  )
}

export default App
