const DB_NAME = 'turnaround-life';
// Phase 2 adds no new object stores: the Phase 1 schema already reserved them.
// Keeping version 1 avoids an unnecessary upgrade prompt for existing users.
const DB_VERSION = 1;
const STORES = ['settings','ingredients','recipes','meals','mealPlans','foodLogs','measurements','targets'];
let databasePromise;
export function openDatabase(){
  if(databasePromise) return databasePromise;
  databasePromise = new Promise((resolve,reject)=>{
    if(!('indexedDB' in window)){ reject(new Error('This browser does not support local database storage.')); return; }
    const request=indexedDB.open(DB_NAME,DB_VERSION);
    request.onupgradeneeded=()=>{ const db=request.result; for(const name of STORES){ if(!db.objectStoreNames.contains(name)){ const store=db.createObjectStore(name,{keyPath:'id'}); if(name!=='settings') store.createIndex('updatedAt','updatedAt',{unique:false}); } } };
    request.onsuccess=()=>{ const db=request.result; db.onversionchange=()=>{db.close();databasePromise=null;}; resolve(db); };
    request.onerror=()=>{databasePromise=null;reject(request.error || new Error('Unable to open local database.'));};
    request.onblocked=()=>{databasePromise=null;reject(new Error('Database upgrade is blocked by another open Turnaround Life tab.'));};
  });
  return databasePromise;
}
export async function getRecord(storeName,id){const db=await openDatabase();return new Promise((resolve,reject)=>{const tx=db.transaction(storeName,'readonly');const req=tx.objectStore(storeName).get(id);req.onsuccess=()=>resolve(req.result??null);req.onerror=()=>reject(req.error);tx.onabort=()=>reject(tx.error||new Error('Database read was cancelled.'));});}
export async function putRecord(storeName,record){const db=await openDatabase();return new Promise((resolve,reject)=>{const tx=db.transaction(storeName,'readwrite');tx.objectStore(storeName).put(record);tx.oncomplete=()=>resolve(record);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Database write was cancelled.'));});}
export async function deleteRecord(storeName,id){const db=await openDatabase();return new Promise((resolve,reject)=>{const tx=db.transaction(storeName,'readwrite');tx.objectStore(storeName).delete(id);tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Database delete was cancelled.'));});}
export async function getAllRecords(storeName){const db=await openDatabase();return new Promise((resolve,reject)=>{const tx=db.transaction(storeName,'readonly');const req=tx.objectStore(storeName).getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);tx.onabort=()=>reject(tx.error||new Error('Database read was cancelled.'));});}
export const databaseInfo={name:DB_NAME,version:DB_VERSION,stores:[...STORES]};
