import React from 'react'
import ReactDOM from 'react-dom/client'
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import App from './App'
import theme from './theme'
import { SequenceProvider } from './context/SequenceContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <DndProvider backend={HTML5Backend}>
        <SequenceProvider>
          <App />
        </SequenceProvider>
      </DndProvider>
    </ChakraProvider>
  </React.StrictMode>
) 