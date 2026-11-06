import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './features.css'
import './avatar.css'
import './themes.css'
import './customizer.css'
import './insights.css'
import './game.css'
import './planner.css'
import './rewards.css'
import './voice.css'
import './mobile.css'
import App from './App.jsx'
import AvatarLab from './dev/AvatarLab.jsx'

const lab = import.meta.env.DEV && new URLSearchParams(location.search).has('avatarlab')

createRoot(document.getElementById('root')).render(<StrictMode>{lab ? <AvatarLab /> : <App />}</StrictMode>)
