import {getRecord,putRecord} from './database.js';
export const DEFAULT_SETTINGS={id:'app-settings',theme:'system',measurementSystem:'both',waterUnit:'both',additionalNutrients:true,historyBehavior:'live-future',updatedAt:null};
export async function loadSettings(){const saved=await getRecord('settings',DEFAULT_SETTINGS.id);return {...DEFAULT_SETTINGS,...(saved||{})};}
export async function saveSettings(changes){const current=await loadSettings();const next={...current,...changes,id:DEFAULT_SETTINGS.id,updatedAt:new Date().toISOString()};await putRecord('settings',next);return next;}
