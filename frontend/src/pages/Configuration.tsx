import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Box, 
  TextField, 
  Button, 
  Grid, 
  Card, 
  CardContent, 
  CardActions,
  Alert,
  Divider,
  Chip,
  CircularProgress
} from '@mui/material';
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

const Configuration: React.FC = () => {
  const { currentUser, login, loginWithGoogle, logout } = useAuth();
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });
  const [config, setConfig] = useState<AgentConfig>({
    agentId: '',
    radarrUrl: '',
    radarrApiKey: '',
    sonarrUrl: '',
    sonarrApiKey: ''
  });
  const [testResults, setTestResults] = useState<{
    radarr?: TestResult;
    sonarr?: TestResult;
  }>({});
  const [testing, setTesting] = useState({
    radarr: false,
    sonarr: false
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Generate default agent ID when user logs in
  useEffect(() => {
    if (currentUser && !config.agentId) {
      // Use the correct format: {userId}_{agentIdentifier}
      const agentIdentifier = `agent-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`;
      const userSpecificAgentId = `${currentUser.uid}_${agentIdentifier}`;
      setConfig(prev => ({ ...prev, agentId: userSpecificAgentId }));
    }
  }, [currentUser, config.agentId]);

  // Load existing configuration
  useEffect(() => {
    if (currentUser) {
      loadConfiguration();
    }
  }, [currentUser]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      await login(loginData.email, loginData.password);
      setSuccess('Successfully logged in!');
    } catch (error) {
      setError('Failed to log in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await loginWithGoogle();
      setSuccess('Successfully logged in with Google!');
    } catch (error) {
      setError('Failed to log in with Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setConfig({
        agentId: '',
        radarrUrl: '',
        radarrApiKey: '',
        sonarrUrl: '',
        sonarrApiKey: ''
      });
      setTestResults({});
      setSuccess('Successfully logged out!');
    } catch (error) {
      setError('Failed to log out.');
    }
  };

  const loadConfiguration = async () => {
    try {
      const response = await fetch('/api/agent/config');
      if (response.ok) {
        const savedConfig = await response.json();
        setConfig(savedConfig);
      }
    } catch (error) {
      console.error('Failed to load configuration:', error);
    }
  };

  const handleConfigChange = (field: keyof AgentConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    
    // Clear test results when URL or API key changes
    if (field === 'radarrUrl' || field === 'radarrApiKey') {
      setTestResults(prev => ({ ...prev, radarr: undefined }));
    } else if (field === 'sonarrUrl' || field === 'sonarrApiKey') {
      setTestResults(prev => ({ ...prev, sonarr: undefined }));
    }
  };

  const testConnection = async (service: 'radarr' | 'sonarr') => {
    const serviceConfig = service === 'radarr' 
      ? { url: config.radarrUrl, apiKey: config.radarrApiKey }
      : { url: config.sonarrUrl, apiKey: config.sonarrApiKey };

    if (!serviceConfig.url || !serviceConfig.apiKey) {
      setTestResults(prev => ({
        ...prev,
        [service]: { success: false, message: 'Please provide both URL and API key' }
      }));
      return;
    }

    setTesting(prev => ({ ...prev, [service]: true }));

    try {
      const response = await fetch(`/api/test-${service}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serviceConfig)
      });

      const result = await response.json();
      setTestResults(prev => ({ ...prev, [service]: result }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [service]: { success: false, message: 'Failed to test connection' }
      }));
    } finally {
      setTesting(prev => ({ ...prev, [service]: false }));
    }
  };

  const saveConfiguration = async () => {
    if (!currentUser) return;

    setSaving(true);
    setError(null);

    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/agent/configure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(config)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Show success message based on MQTT status
        if (result.mqtt?.status === 'connected') {
          setSuccess('Configuration saved successfully! Agent is connected to remote server.');
        } else if (result.mqtt?.status === 'failed') {
          setSuccess('Configuration saved successfully! Agent is running locally (remote features unavailable).');
        } else {
          setSuccess('Configuration saved successfully! Agent is now starting...');
        }
      } else {
        throw new Error(result.message || 'Failed to save configuration');
      }
    } catch (error) {
      setError('Failed to save configuration. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const isConfigurationValid = () => {
    return config.agentId && 
           ((config.radarrUrl && config.radarrApiKey) || (config.sonarrUrl && config.sonarrApiKey));
  };

  // If user is not logged in, show login form
  if (!currentUser) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <img 
                src="/reacharr.png" 
                alt="Reacharr Logo" 
                style={{ 
                  height: '60px', 
                  width: 'auto',
                  filter: 'brightness(0) invert(1)'
                }} 
              />
            </Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Reacharr Local Agent
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Sign in to configure your agent
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

          <Box component="form" onSubmit={handleLogin} sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={loginData.email}
              onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={loginData.password}
              onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
              margin="normal"
              required
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>
          </Box>

          <Divider sx={{ mb: 3 }}>
            <Chip label="OR" />
          </Divider>

          <Button
            fullWidth
            variant="outlined"
            onClick={handleGoogleLogin}
            disabled={loading}
            sx={{ mb: 2 }}
          >
            Sign in with Google
          </Button>
        </Paper>
      </Container>
    );
  }

  // If user is logged in, show configuration form
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* User Info and Logout */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h5">Welcome back!</Typography>
            <Typography variant="body2" color="text.secondary">
              Logged in as: {currentUser.email}
            </Typography>
          </Box>
          <Button variant="outlined" onClick={handleLogout}>
            Sign Out
          </Button>
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

      <Grid container spacing={3}>
        {/* Agent Configuration */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Agent Configuration
            </Typography>
            <TextField
              fullWidth
              label="Agent ID"
              value={config.agentId}
              onChange={(e) => handleConfigChange('agentId', e.target.value)}
              margin="normal"
              helperText="Unique identifier for this agent"
            />
          </Paper>
        </Grid>

        {/* Radarr Configuration */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Radarr Configuration
              </Typography>
              <TextField
                fullWidth
                label="Radarr URL"
                value={config.radarrUrl}
                onChange={(e) => handleConfigChange('radarrUrl', e.target.value)}
                margin="normal"
                placeholder="http://localhost:7878"
              />
              <TextField
                fullWidth
                label="API Key"
                value={config.radarrApiKey}
                onChange={(e) => handleConfigChange('radarrApiKey', e.target.value)}
                margin="normal"
                placeholder="Your Radarr API key"
              />
              {testResults.radarr && (
                <Alert 
                  severity={testResults.radarr.success ? "success" : "error"} 
                  sx={{ mt: 2 }}
                >
                  {testResults.radarr.message}
                  {testResults.radarr.version && ` (v${testResults.radarr.version})`}
                </Alert>
              )}
            </CardContent>
            <CardActions>
              <Button
                onClick={() => testConnection('radarr')}
                disabled={testing.radarr || !config.radarrUrl || !config.radarrApiKey}
                variant="outlined"
              >
                {testing.radarr ? <CircularProgress size={20} /> : 'Test Connection'}
              </Button>
            </CardActions>
          </Card>
        </Grid>

        {/* Sonarr Configuration */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Sonarr Configuration
              </Typography>
              <TextField
                fullWidth
                label="Sonarr URL"
                value={config.sonarrUrl}
                onChange={(e) => handleConfigChange('sonarrUrl', e.target.value)}
                margin="normal"
                placeholder="http://localhost:8989"
              />
              <TextField
                fullWidth
                label="API Key"
                value={config.sonarrApiKey}
                onChange={(e) => handleConfigChange('sonarrApiKey', e.target.value)}
                margin="normal"
                placeholder="Your Sonarr API key"
              />
              {testResults.sonarr && (
                <Alert 
                  severity={testResults.sonarr.success ? "success" : "error"} 
                  sx={{ mt: 2 }}
                >
                  {testResults.sonarr.message}
                  {testResults.sonarr.version && ` (v${testResults.sonarr.version})`}
                </Alert>
              )}
            </CardContent>
            <CardActions>
              <Button
                onClick={() => testConnection('sonarr')}
                disabled={testing.sonarr || !config.sonarrUrl || !config.sonarrApiKey}
                variant="outlined"
              >
                {testing.sonarr ? <CircularProgress size={20} /> : 'Test Connection'}
              </Button>
            </CardActions>
          </Card>
        </Grid>

        {/* Save Configuration */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Button
              variant="contained"
              size="large"
              onClick={saveConfiguration}
              disabled={!isConfigurationValid() || saving}
              sx={{ minWidth: 200 }}
            >
              {saving ? <CircularProgress size={24} /> : 'Save Configuration & Start Agent'}
            </Button>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              At least one service (Radarr or Sonarr) must be configured
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Configuration; 