import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Wifi, CheckCircle, Copy, Download, ExternalLink } from 'lucide-react';

interface Bridge {
  id: string;
  ip: string;
  name: string;
  modelId?: string;
}

interface SetupState {
  step: 'discovery' | 'authentication' | 'test' | 'complete';
  bridges: Bridge[];
  selectedBridge: Bridge | null;
  authProgress: number;
  authMessage: string;
  config: any;
  summary: any;
  error: string | null;
}

function App() {
  const [state, setState] = useState<SetupState>({
    step: 'discovery',
    bridges: [],
    selectedBridge: null,
    authProgress: 0,
    authMessage: '',
    config: null,
    summary: null,
    error: null,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showClaudeConfig, setShowClaudeConfig] = useState(false);
  const [claudeConfigData, setClaudeConfigData] = useState<any>(null);

  useEffect(() => {
    discoverBridges();
  }, []);

  const discoverBridges = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/discover', { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        setState(prev => ({ ...prev, bridges: data.bridges, error: null }));
      } else {
        setState(prev => ({ ...prev, error: data.error }));
      }
    } catch (error) {
      setState(prev => ({ ...prev, error: 'Failed to discover bridges' }));
    } finally {
      setIsLoading(false);
    }
  };

  const selectBridge = (bridge: Bridge) => {
    setState(prev => ({ ...prev, selectedBridge: bridge }));
  };

  const authenticate = async () => {
    if (!state.selectedBridge) return;
    
    setState(prev => ({ ...prev, step: 'authentication', authProgress: 0 }));
    
    try {
      const response = await fetch('/api/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bridgeIp: state.selectedBridge.ip }),
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = new TextDecoder().decode(value);
        const lines = text.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.step === 'waiting') {
                setState(prev => ({ 
                  ...prev, 
                  authMessage: data.message,
                  authProgress: ((data.maxAttempts - data.attempts) / data.maxAttempts) * 100
                }));
              } else if (data.step === 'success') {
                setState(prev => ({ 
                  ...prev, 
                  config: data.config,
                  step: 'test'
                }));
                await testConnection();
              } else if (data.step === 'error' || data.step === 'timeout') {
                setState(prev => ({ ...prev, error: data.error }));
              }
            } catch (e) {
              // Ignore JSON parse errors
            }
          }
        }
      }
    } catch (error) {
      setState(prev => ({ ...prev, error: 'Authentication failed' }));
    }
  };

  const testConnection = async () => {
    try {
      const response = await fetch('/api/test', { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        setState(prev => ({ 
          ...prev, 
          summary: data.summary,
          step: 'complete'
        }));
        await saveConfig();
      } else {
        setState(prev => ({ ...prev, error: data.error }));
      }
    } catch (error) {
      setState(prev => ({ ...prev, error: 'Connection test failed' }));
    }
  };

  const saveConfig = async () => {
    try {
      await fetch('/api/save-config', { method: 'POST' });
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  };

  const fetchClaudeConfig = async () => {
    try {
      const response = await fetch('/api/claude-config');
      const data = await response.json();
      
      if (data.success) {
        setClaudeConfigData(data);
        return data;
      }
    } catch (error) {
      console.error('Failed to get Claude config:', error);
    }
    return null;
  };

  const copyClaudeConfig = async () => {
    const data = claudeConfigData || await fetchClaudeConfig();
    if (!data) return;
    
    try {
      // Try modern clipboard API first
      await navigator.clipboard.writeText(data.configString);
      setShowClaudeConfig(true);
      setTimeout(() => setShowClaudeConfig(false), 2000);
    } catch (clipboardError) {
      // Fallback: show config in a text area for manual copy
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head><title>Claude Desktop Configuration</title></head>
            <body>
              <h2>Claude Desktop Configuration</h2>
              <p>Copy this configuration to your Claude Desktop settings:</p>
              <textarea style="width: 100%; height: 300px; font-family: monospace;">${data.configString}</textarea>
              <br><br>
              <button onclick="window.close()">Close</button>
            </body>
          </html>
        `);
      } else {
        // Last resort: show in alert
        alert('Copy this configuration to Claude Desktop:\\n\\n' + data.configString);
      }
    }
  };

  const downloadClaudeConfig = async () => {
    const data = claudeConfigData || await fetchClaudeConfig();
    if (!data) return;

    const blob = new Blob([data.configString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'claude-desktop-hue-config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🌈 Hue MCP Setup</h1>
          <p className="text-gray-600">Let's connect your Philips Hue bridge</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <AnimatePresence mode="wait">
            {state.step === 'discovery' && (
              <DiscoveryStep
                bridges={state.bridges}
                selectedBridge={state.selectedBridge}
                isLoading={isLoading}
                error={state.error}
                onSelectBridge={selectBridge}
                onNext={authenticate}
                onRetry={discoverBridges}
              />
            )}
            
            {state.step === 'authentication' && (
              <AuthenticationStep
                bridge={state.selectedBridge!}
                progress={state.authProgress}
                message={state.authMessage}
                error={state.error}
              />
            )}
            
            {state.step === 'test' && (
              <TestStep />
            )}
            
            {state.step === 'complete' && (
              <CompleteStep
                summary={state.summary}
                onCopyConfig={copyClaudeConfig}
                onDownloadConfig={downloadClaudeConfig}
                showCopied={showClaudeConfig}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// Step Components
function DiscoveryStep({ bridges, selectedBridge, isLoading, error, onSelectBridge, onNext, onRetry }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="text-center mb-6">
        <Search className="w-12 h-12 text-blue-500 mx-auto mb-3" />
        <h2 className="text-2xl font-semibold mb-2">Discover Bridges</h2>
        <p className="text-gray-600">Finding Hue bridges on your network...</p>
      </div>

      {isLoading && (
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-gray-600">Searching...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-700">{error}</p>
          <button 
            onClick={onRetry}
            className="mt-2 text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      )}

      {bridges.length > 0 && (
        <div className="space-y-3 mb-6">
          {bridges.map((bridge: Bridge) => (
            <div
              key={bridge.ip}
              onClick={() => onSelectBridge(bridge)}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${selectedBridge?.ip === bridge.ip 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <Wifi className="w-5 h-5 text-blue-500 mr-3" />
                <div>
                  <p className="font-medium">{bridge.name}</p>
                  <p className="text-sm text-gray-500">{bridge.ip}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedBridge && (
        <button
          onClick={onNext}
          className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors"
        >
          Connect to {selectedBridge.name}
        </button>
      )}
    </motion.div>
  );
}

function AuthenticationStep({ bridge, progress, message, error }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="text-center"
    >
      <div className="mb-6">
        <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center relative">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-3 h-3 bg-white rounded-full"
            />
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute w-8 h-8 border-2 border-blue-300 rounded-full"
            />
          </div>
        </div>
        <h2 className="text-2xl font-semibold mb-2">Press the Button</h2>
        <p className="text-gray-600 mb-4">Press the button on your Hue bridge to authenticate</p>
      </div>

      {message && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-blue-700">{message}</p>
        </div>
      )}

      {progress > 0 && (
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}
    </motion.div>
  );
}

function TestStep() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="text-center"
    >
      <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
      <h2 className="text-2xl font-semibold mb-2">Testing Connection</h2>
      <p className="text-gray-600">Verifying your Hue setup...</p>
    </motion.div>
  );
}

function CompleteStep({ summary, onCopyConfig, onDownloadConfig, showCopied }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="text-center mb-6">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <h2 className="text-2xl font-semibold mb-2">Setup Complete!</h2>
        <p className="text-gray-600">Your Hue MCP server is ready to use</p>
      </div>

      {summary && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold mb-2">System Summary</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-500">{summary.statistics.totalLights}</p>
              <p className="text-sm text-gray-600">Lights</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-500">{summary.statistics.rooms}</p>
              <p className="text-sm text-gray-600">Rooms</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-500">{summary.statistics.scenes}</p>
              <p className="text-sm text-gray-600">Scenes</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={onCopyConfig}
            className="bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center"
          >
            <Copy className="w-4 h-4 mr-2" />
            {showCopied ? 'Copied!' : 'Copy Config'}
          </button>
          
          <button
            onClick={onDownloadConfig}
            className="bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Download JSON
          </button>
        </div>
        
        <p className="text-sm text-gray-600 text-center">
          Copy or download the configuration, then paste it into your Claude Desktop settings and restart Claude.
        </p>
      </div>
    </motion.div>
  );
}

export default App;