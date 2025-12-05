import { mount } from 'humn'
import App from './app.humn'

const container = document.createElement('div')
container.id = 'humn-chat-container'
document.body.appendChild(container)
mount(document.getElementById('humn-chat-container'), App)
