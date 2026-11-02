import {openDatabase} from './core/database.js';
import {initNavigation} from './features/navigation.js';
import {initSettings} from './features/settings-ui.js';
const status=document.querySelector('#connection-status');
function updateConnection(){const online=navigator.onLine;status.querySelector('span').textContent=online?'Ready':'Offline';status.title=online?'Application ready':'Offline mode';status.classList.toggle('is-offline',!online);}
function showError(message){const toast=document.querySelector('#toast');toast.textContent=message;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),4000);}
async function start(){document.querySelector('#today-date').textContent=new Intl.DateTimeFormat(undefined,{weekday:'short',month:'short',day:'numeric'}).format(new Date());document.querySelector('#today-label').textContent=new Intl.DateTimeFormat(undefined,{month:'long',year:'numeric'}).format(new Date()).toUpperCase();updateConnection();window.addEventListener('online',updateConnection);window.addEventListener('offline',updateConnection);try{await openDatabase();initNavigation();await initSettings();}catch(error){console.error('[Turnaround Life] Startup error:',error);showError('Local storage could not be initialized. Check browser storage settings.');initNavigation();}if('serviceWorker' in navigator && location.protocol!=='file:'){window.addEventListener('load',()=>navigator.serviceWorker.register('/service-worker.js').catch(error=>console.warn('[Turnaround Life] Service worker registration failed:',error)));}}
start();
