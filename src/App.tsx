import { useEffect, useState } from 'react';

function App() {
  const [isActive, setIsActive] = useState(true);
  const [dictStatus, setDictStatus] = useState<{
    loaded: boolean;
    wordCount: number;
    progress: number;
  }>({ loaded: false, wordCount: 0, progress: 0 });

  useEffect(() => {
    // Get initial state
    try {
      chrome.storage?.local?.get(
        ['isActive', 'dictionaryLoaded', 'dictionaryWordCount', 'dictionaryLoadProgress'],
        (result: any) => {
          if (chrome.runtime.lastError) {
            console.error('Focus Extension: Storage get error', chrome.runtime.lastError);
            return;
          }
          if (result.isActive !== undefined) {
            setIsActive(result.isActive);
          }
          setDictStatus({
            loaded: !!result.dictionaryLoaded,
            wordCount: result.dictionaryWordCount || 0,
            progress: result.dictionaryLoadProgress ?? 0,
          });
        }
      );
    } catch (e) {
      console.error('Focus Extension: Failed to access storage', e);
    }

    // Listen for changes
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.isActive) {
        setIsActive(changes.isActive.newValue as boolean);
      }
      if (changes.dictionaryLoaded || changes.dictionaryWordCount || changes.dictionaryLoadProgress) {
        setDictStatus((prev) => ({
          loaded: (changes.dictionaryLoaded?.newValue as boolean) ?? prev.loaded,
          wordCount: (changes.dictionaryWordCount?.newValue as number) ?? prev.wordCount,
          progress: (changes.dictionaryLoadProgress?.newValue as number) ?? prev.progress,
        }));
      }
    };

    if (chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener(listener);
    }
    return () => {
      if (chrome.storage?.onChanged) {
        chrome.storage.onChanged.removeListener(listener);
      }
    };
  }, []);

  const toggleActive = () => {
    const newState = !isActive;
    setIsActive(newState);
    try {
      if (chrome.storage?.local) {
        chrome.storage.local.set({ isActive: newState }, () => {
          if (chrome.runtime.lastError) {
            console.error('Focus Extension: Storage set error', chrome.runtime.lastError);
          }
        });
      }
    } catch (e) {
      console.error('Focus Extension: Failed to set storage', e);
    }
  };

  const formatWordCount = (count: number) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  };

  return (
    <div className="flex flex-col h-full min-h-100 bg-linear-to-br from-neutral-900 to-black p-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold bg-linear-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Focus
        </h1>

        <button
          onClick={toggleActive}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isActive ? 'bg-blue-600' : 'bg-neutral-600'}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`}
          />
        </button>
      </div>

      <div className="flex-1">
        {/* Status Card */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6 backdrop-blur-md">
          <h2 className="text-sm font-semibold text-neutral-400 mb-2 uppercase tracking-wider">Status</h2>
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              {isActive && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-3 w-3 ${isActive ? 'bg-green-500' : 'bg-neutral-500'}`}
              ></span>
            </span>
            <p className="text-neutral-200 font-medium">
              {isActive ? 'Extension is Active' : 'Extension is Paused'}
            </p>
          </div>
        </div>

        {/* Dictionary Card */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 backdrop-blur-md">
          <h2 className="text-sm font-semibold text-neutral-400 mb-3 uppercase tracking-wider">
            English Dictionary
          </h2>

          {dictStatus.loaded ? (
            /* Loaded state */
            <div className="flex items-center gap-3 bg-black/40 px-4 py-3 rounded-lg">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/20">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-neutral-200 text-sm font-medium">Offline Cache Ready</p>
                <p className="text-neutral-500 text-xs">
                  {formatWordCount(dictStatus.wordCount)} words loaded
                </p>
              </div>
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ) : dictStatus.progress >= 0 ? (
            /* Loading state */
            <div className="bg-black/40 px-4 py-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-neutral-300 text-sm font-medium">Importing dictionary...</p>
                <span className="text-neutral-400 text-xs">{dictStatus.progress}%</span>
              </div>
              <div className="w-full bg-neutral-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-linear-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${dictStatus.progress}%` }}
                ></div>
              </div>
              <p className="text-neutral-500 text-xs mt-2">First-time setup. This only happens once.</p>
            </div>
          ) : (
            /* Error state */
            <div className="flex items-center gap-3 bg-red-900/20 border border-red-500/20 px-4 py-3 rounded-lg">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <p className="text-red-300 text-sm">Failed to load dictionary. Restart the extension.</p>
            </div>
          )}
        </div>
      </div>

      <div className="pt-4 mt-6 border-t border-white/10 text-center text-xs text-neutral-500">
        <p>Select text on any page to Look-up</p>
      </div>
    </div>
  );
}

export default App;
