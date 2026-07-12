import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react'
import { SequenceProvider } from './context/SequenceContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import theme from './theme.js'
import UpdatePassword from './components/auth/UpdatePassword.jsx'
import UserProfile from './components/UserProfile.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <AuthProvider>
        <SequenceProvider>
          <Router basename="/hifz_deck">
            <Routes>
              <Route path="/" element={<App />} />
              <Route path="/profile" element={<UserProfile />} />
              <Route path="/profile/:username" element={<UserProfile />} />
              <Route path="/update-password" element={<UpdatePassword />} />
            </Routes>
          </Router>
        </SequenceProvider>
      </AuthProvider>
    </ChakraProvider>
  </React.StrictMode>,
)
