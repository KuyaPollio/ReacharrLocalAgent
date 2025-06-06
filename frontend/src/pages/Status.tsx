import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Box, 
  Grid, 
  Card, 
  CardContent, 
  Chip, 
  LinearProgress,
  Button,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert
} from '@mui/material';
import { 
  CheckCircle, 
  Error, 
  Warning, 
  Info, 
  Refresh,
  Cloud,
  Movie,
  Tv,
  Router
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

interface ServiceStatus {
  name: string;
  status: 'connected' | 'disconnected' | 'error' | 'unknown';
  message: string;
  version?: string;
  lastCheck?: string;
  url?: string;
}

interface AgentStatus {
  agentId: string;
  online: boolean;
  timestamp: number;
  services: {
    radarr: ServiceStatus;
    sonarr: ServiceStatus;
    mqtt: ServiceStatus;
  };
}

const Status: React.FC = () => {
  const { currentUser } = useAuth();
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      loadStatus();
      // Set up automatic refresh every 30 seconds
      const interval = setInterval(loadStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const loadStatus = async () => {
    try {
      const response = await fetch('/api/agent/status');
      if (response.ok) {
        const statusData = await response.json();
        setStatus(statusData);
        setLastUpdate(new Date());
        setError(null);
      } else {
        setError('Failed to fetch status');
      }
    } catch (err) {
      console.error('Failed to load status:', err);
      setError('Failed to load agent status');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    loadStatus();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle color="success" />;
      case 'disconnected':
        return <Error color="error" />;
      case 'error':
        return <Warning color="warning" />;
      default:
        return <Info color="disabled" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'success';
      case 'disconnected':
        return 'error';
      case 'error':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getServiceIcon = (serviceName: string) => {
    switch (serviceName) {
      case 'radarr':
        return <Movie />;
      case 'sonarr':
        return <Tv />;
      case 'mqtt':
        return <Cloud />;
      default:
        return <Router />;
    }
  };

  if (!currentUser) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="warning">
          Please log in to view agent status
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Agent Status
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleRefresh}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {loading && <LinearProgress sx={{ mb: 3 }} />}
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {status && (
        <Grid container spacing={3}>
          {/* Overall Agent Status */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Agent Overview</Typography>
                <Chip 
                  label={status.online ? 'Online' : 'Offline'} 
                  color={status.online ? 'success' : 'error'}
                  icon={status.online ? <CheckCircle /> : <Error />}
                />
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Agent ID:</strong> {status.agentId}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Last Updated:</strong> {lastUpdate?.toLocaleString()}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Service Status Cards */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Movie sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Radarr</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Chip 
                    label={status.services.radarr.status.toUpperCase()} 
                    color={getStatusColor(status.services.radarr.status) as any}
                    size="small"
                    icon={getStatusIcon(status.services.radarr.status)}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {status.services.radarr.message}
                </Typography>
                {status.services.radarr.version && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Version:</strong> {status.services.radarr.version}
                  </Typography>
                )}
                {status.services.radarr.url && (
                  <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                    <strong>URL:</strong> {status.services.radarr.url}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Tv sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Sonarr</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Chip 
                    label={status.services.sonarr.status.toUpperCase()} 
                    color={getStatusColor(status.services.sonarr.status) as any}
                    size="small"
                    icon={getStatusIcon(status.services.sonarr.status)}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {status.services.sonarr.message}
                </Typography>
                {status.services.sonarr.version && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Version:</strong> {status.services.sonarr.version}
                  </Typography>
                )}
                {status.services.sonarr.url && (
                  <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                    <strong>URL:</strong> {status.services.sonarr.url}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Cloud sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Remote MQTT</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Chip 
                    label={status.services.mqtt.status.toUpperCase()} 
                    color={getStatusColor(status.services.mqtt.status) as any}
                    size="small"
                    icon={getStatusIcon(status.services.mqtt.status)}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {status.services.mqtt.message}
                </Typography>
                {status.services.mqtt.lastCheck && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Last Check:</strong> {new Date(status.services.mqtt.lastCheck).toLocaleString()}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Detailed Status Information */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Detailed Status Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <List>
                <ListItem>
                  <ListItemIcon>
                    {getServiceIcon('radarr')}
                  </ListItemIcon>
                  <ListItemText
                    primary="Radarr Service"
                    secondary={
                      <Box>
                        <Typography variant="body2" component="span">
                          Status: {status.services.radarr.status} - {status.services.radarr.message}
                        </Typography>
                        {status.services.radarr.version && (
                          <Typography variant="body2" component="div">
                            Version: {status.services.radarr.version}
                          </Typography>
                        )}
                        {status.services.radarr.lastCheck && (
                          <Typography variant="body2" component="div">
                            Last checked: {new Date(status.services.radarr.lastCheck).toLocaleString()}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <Box sx={{ ml: 2 }}>
                    {getStatusIcon(status.services.radarr.status)}
                  </Box>
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    {getServiceIcon('sonarr')}
                  </ListItemIcon>
                  <ListItemText
                    primary="Sonarr Service"
                    secondary={
                      <Box>
                        <Typography variant="body2" component="span">
                          Status: {status.services.sonarr.status} - {status.services.sonarr.message}
                        </Typography>
                        {status.services.sonarr.version && (
                          <Typography variant="body2" component="div">
                            Version: {status.services.sonarr.version}
                          </Typography>
                        )}
                        {status.services.sonarr.lastCheck && (
                          <Typography variant="body2" component="div">
                            Last checked: {new Date(status.services.sonarr.lastCheck).toLocaleString()}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <Box sx={{ ml: 2 }}>
                    {getStatusIcon(status.services.sonarr.status)}
                  </Box>
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    {getServiceIcon('mqtt')}
                  </ListItemIcon>
                  <ListItemText
                    primary="Remote MQTT Connection"
                    secondary={
                      <Box>
                        <Typography variant="body2" component="span">
                          Status: {status.services.mqtt.status} - {status.services.mqtt.message}
                        </Typography>
                        {status.services.mqtt.lastCheck && (
                          <Typography variant="body2" component="div">
                            Last checked: {new Date(status.services.mqtt.lastCheck).toLocaleString()}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <Box sx={{ ml: 2 }}>
                    {getStatusIcon(status.services.mqtt.status)}
                  </Box>
                </ListItem>
              </List>
            </Paper>
          </Grid>

          {/* System Information */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                System Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Agent Start Time:</strong> {new Date(status.timestamp).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Current User:</strong> {currentUser.email}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Auto-refresh:</strong> Status updates automatically every 30 seconds
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      )}

      {!status && !loading && !error && (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No status data available
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Make sure your agent is configured and running
          </Typography>
          <Button variant="contained" onClick={handleRefresh} sx={{ mt: 2 }}>
            Try Again
          </Button>
        </Paper>
      )}
    </Container>
  );
};

export default Status; 