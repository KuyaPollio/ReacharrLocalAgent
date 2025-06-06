import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface AgentConfig {
  agentId: string;
  radarrUrl: string;
  radarrApiKey: string;
  sonarrUrl: string;
  sonarrApiKey: string;
}

interface TestResult {
  success: boolean;
  message: string;
  version?: string;
}

const AgentSetup: React.FC = () => {
  const { currentUser } = useAuth();
  const [config, setConfig] = useState<AgentConfig>({
    agentId: '',
    radarrUrl: '',
    radarrApiKey: '',
    sonarrUrl: '',
    sonarrApiKey: ''
  });

  const [testing, setTesting] = useState({
    radarr: false,
    sonarr: false
  });

  const [testResults, setTestResults] = useState<{
    radarr?: TestResult;
    sonarr?: TestResult;
  }>({});

  const [saving, setSaving] = useState(false);
  const [mqttStatus, setMqttStatus] = useState<string>('disconnected');

  // Generate default agent ID when user logs in
  useEffect(() => {
    if (currentUser && !config.agentId) {
      // Use the correct format: {userId}_{agentIdentifier}
      const agentIdentifier = `agent-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`;
      const userSpecificAgentId = `${currentUser.uid}_${agentIdentifier}`;
      setConfig(prev => ({ ...prev, agentId: userSpecificAgentId }));
    }
  }, [currentUser, config.agentId]);

  // Handle input changes
  const handleInputChange = (field: keyof AgentConfig, value: string) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear test results when URL or API key changes
    if (field === 'radarrUrl' || field === 'radarrApiKey') {
      setTestResults(prev => ({ ...prev, radarr: undefined }));
    } else if (field === 'sonarrUrl' || field === 'sonarrApiKey') {
      setTestResults(prev => ({ ...prev, sonarr: undefined }));
    }
  };

  // Test Radarr connection
  const testRadarrConnection = async () => {
    if (!config.radarrUrl || !config.radarrApiKey) {
      setTestResults(prev => ({
        ...prev,
        radarr: { success: false, message: 'Please provide both URL and API key' }
      }));
      return;
    }

    setTesting(prev => ({ ...prev, radarr: true }));

    try {
      const response = await fetch('/api/test-radarr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: config.radarrUrl,
          apiKey: config.radarrApiKey
        })
      });

      const result = await response.json();
      setTestResults(prev => ({ ...prev, radarr: result }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        radarr: { success: false, message: 'Failed to test connection' }
      }));
    } finally {
      setTesting(prev => ({ ...prev, radarr: false }));
    }
  };

  // Test Sonarr connection
  const testSonarrConnection = async () => {
    if (!config.sonarrUrl || !config.sonarrApiKey) {
      setTestResults(prev => ({
        ...prev,
        sonarr: { success: false, message: 'Please provide both URL and API key' }
      }));
      return;
    }

    setTesting(prev => ({ ...prev, sonarr: true }));

    try {
      const response = await fetch('/api/test-sonarr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: config.sonarrUrl,
          apiKey: config.sonarrApiKey
        })
      });

      const result = await response.json();
      setTestResults(prev => ({ ...prev, sonarr: result }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        sonarr: { success: false, message: 'Failed to test connection' }
      }));
    } finally {
      setTesting(prev => ({ ...prev, sonarr: false }));
    }
  };

  // Save configuration and start agent
  const saveConfiguration = async () => {
    if (!currentUser) return;

    setSaving(true);

    try {
      // Get Firebase token
      const token = await currentUser.getIdToken();

      // Save configuration
      const response = await fetch('/api/agent/configure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(config)
      });

      if (response.ok) {
        alert('Agent configured successfully! The agent will now start collecting data.');
        setMqttStatus('connecting');
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (error) {
      console.error('Failed to save configuration:', error);
      alert('Failed to save configuration. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Check if configuration is valid
  const isConfigurationValid = () => {
    return (
      config.agentId &&
      ((config.radarrUrl && config.radarrApiKey) || (config.sonarrUrl && config.sonarrApiKey))
    );
  };

  const canSave = () => {
    return (
      isConfigurationValid() &&
      (testResults.radarr?.success || !config.radarrUrl) &&
      (testResults.sonarr?.success || !config.sonarrUrl)
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Setup Your Reacharr Agent
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Configure your local agent to connect to Radarr and Sonarr
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            {/* User Info */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Logged in as:</strong> {currentUser?.email}
              </p>
              <p className="text-sm text-blue-600 mt-1">
                <strong>User ID:</strong> {currentUser?.uid}
              </p>
            </div>

            {/* Agent ID */}
            <div className="mb-6">
              <label htmlFor="agentId" className="block text-sm font-medium text-gray-700">
                Agent ID
              </label>
              <input
                id="agentId"
                type="text"
                value={config.agentId}
                onChange={(e) => handleInputChange('agentId', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter a unique agent identifier"
              />
              <p className="mt-1 text-xs text-gray-500">
                This identifies your agent in the dashboard
              </p>
            </div>

            {/* Radarr Configuration */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Radarr Configuration</h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="radarrUrl" className="block text-sm font-medium text-gray-700">
                    Radarr URL
                  </label>
                  <input
                    id="radarrUrl"
                    type="url"
                    value={config.radarrUrl}
                    onChange={(e) => handleInputChange('radarrUrl', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="http://localhost:7878"
                  />
                </div>

                <div>
                  <label htmlFor="radarrApiKey" className="block text-sm font-medium text-gray-700">
                    Radarr API Key
                  </label>
                  <input
                    id="radarrApiKey"
                    type="text"
                    value={config.radarrApiKey}
                    onChange={(e) => handleInputChange('radarrApiKey', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Your Radarr API key"
                  />
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={testRadarrConnection}
                    disabled={testing.radarr || !config.radarrUrl || !config.radarrApiKey}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 border border-transparent rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {testing.radarr ? 'Testing...' : 'Test Connection'}
                  </button>
                </div>

                {testResults.radarr && (
                  <div className={`p-3 rounded-md ${testResults.radarr.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                    <p className="text-sm">
                      {testResults.radarr.message}
                      {testResults.radarr.version && ` (v${testResults.radarr.version})`}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Sonarr Configuration */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Sonarr Configuration</h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="sonarrUrl" className="block text-sm font-medium text-gray-700">
                    Sonarr URL
                  </label>
                  <input
                    id="sonarrUrl"
                    type="url"
                    value={config.sonarrUrl}
                    onChange={(e) => handleInputChange('sonarrUrl', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="http://localhost:8989"
                  />
                </div>

                <div>
                  <label htmlFor="sonarrApiKey" className="block text-sm font-medium text-gray-700">
                    Sonarr API Key
                  </label>
                  <input
                    id="sonarrApiKey"
                    type="text"
                    value={config.sonarrApiKey}
                    onChange={(e) => handleInputChange('sonarrApiKey', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Your Sonarr API key"
                  />
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={testSonarrConnection}
                    disabled={testing.sonarr || !config.sonarrUrl || !config.sonarrApiKey}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 border border-transparent rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {testing.sonarr ? 'Testing...' : 'Test Connection'}
                  </button>
                </div>

                {testResults.sonarr && (
                  <div className={`p-3 rounded-md ${testResults.sonarr.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                    <p className="text-sm">
                      {testResults.sonarr.message}
                      {testResults.sonarr.version && ` (v${testResults.sonarr.version})`}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* MQTT Status */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Agent Status</h4>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  mqttStatus === 'connected' ? 'bg-green-500' :
                  mqttStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
                <span className="text-sm text-gray-700">
                  {mqttStatus === 'connected' ? 'Connected to server' :
                   mqttStatus === 'connecting' ? 'Connecting to server...' : 'Not connected'}
                </span>
              </div>
            </div>

            {/* Save Button */}
            <div>
              <button
                onClick={saveConfiguration}
                disabled={!canSave() || saving}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Configuration & Start Agent'}
              </button>
            </div>

            {/* Help Text */}
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                At least one service (Radarr or Sonarr) must be configured.<br/>
                Test connections before saving to ensure everything works correctly.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentSetup; 