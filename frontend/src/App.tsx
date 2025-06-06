import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Link } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import './App.css';

// Import pages (to be created)
import Configuration from './pages/Configuration';
import Status from './pages/Status';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const NavigationBar: React.FC = () => {
  const location = useLocation();

  return (
    <AppBar position="static">
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          <img 
            src="/reacharr.png" 
            alt="Reacharr" 
            style={{ 
              height: '28px', 
              width: 'auto', 
              marginRight: '12px',
              filter: 'brightness(0) invert(1)'
            }} 
          />
          <Typography variant="h6" component="div">
            Reacharr Local Agent
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            color="inherit"
            component={Link}
            to="/"
            variant={location.pathname === '/' || location.pathname === '/configuration' ? 'outlined' : 'text'}
          >
            Configuration
          </Button>
          <Button
            color="inherit"
            component={Link}
            to="/status"
            variant={location.pathname === '/status' ? 'outlined' : 'text'}
          >
            Status
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <div className="App">
            <NavigationBar />
            <Routes>
              <Route path="/configuration" element={<Configuration />} />
              <Route path="/status" element={<Status />} />
              <Route path="/" element={<Configuration />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App; 