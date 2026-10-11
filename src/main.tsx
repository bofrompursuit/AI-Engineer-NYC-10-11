import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './pip.css'
import { ConversationProvider } from '@elevenlabs/react'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConversationProvider><App /></ConversationProvider>
  </React.StrictMode>,
)
