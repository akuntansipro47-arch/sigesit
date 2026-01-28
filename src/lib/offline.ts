import { openDB } from 'idb';
import { createEntry, createFamilyMembers } from './api';

const DB_NAME = 'sigesit-offline';
const STORE_NAME = 'entry-queue';

const initDB = async () => {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    },
  });
};

export const saveToOfflineQueue = async (data: any) => {
  const db = await initDB();
  await db.add(STORE_NAME, {
    data,
    timestamp: Date.now(),
    type: 'create_entry'
  });
};

export const processOfflineQueue = async () => {
  if (!navigator.onLine) return;
  
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const items = await store.getAll();
  
  if (items.length === 0) return;

  console.log(`Processing ${items.length} offline items...`);

  for (const item of items) {
    try {
      if (item.type === 'create_entry') {
        const { entryData, membersData } = item.data;
        
        // Try to create entry
        const newEntry = await createEntry(entryData);
        
        if (newEntry && membersData && membersData.length > 0) {
          // Update members with real entry ID
          const membersWithId = membersData.map((m: any) => ({
            ...m,
            entry_id: newEntry.id
          }));
          await createFamilyMembers(membersWithId);
        }
        
        // Remove from queue if successful
        await db.delete(STORE_NAME, item.id);
      }
    } catch (error) {
      console.error('Failed to sync item:', item, error);
      // Keep in queue? Or move to error queue?
    }
  }
};

// Listen for online status
window.addEventListener('online', () => {
  console.log('Online! Syncing...');
  processOfflineQueue();
});
