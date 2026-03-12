import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import WhatWeDoApp from './WhatWeDoApp.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WhatWeDoApp />
  </StrictMode>,
)
