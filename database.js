import { SummaryCard } from "./summary.js";

let db;

export let dbRequest = indexedDB.open("FinanceDB", 3); // Change version to 2

export const dbReady = new Promise((resolve, reject) => {
    dbRequest.onupgradeneeded = (event) => {
        db = event.target.result;
        
        // Create category store if not exists
        if (!db.objectStoreNames.contains('category')) {
            const categoryStore = db.createObjectStore('category', {
                keyPath: 'id',
                autoIncrement: true
            });
            categoryStore.createIndex('name', 'name', { unique: true });
            categoryStore.add({ name: 'Food' });
            categoryStore.add({ name: 'Entertainment' });
            categoryStore.add({ name: 'Transport' });
        }

        // Create main transactions store if not exists
        if (!db.objectStoreNames.contains('main')) {
            const mainStore = db.createObjectStore('main', {
                keyPath: 'id',
                autoIncrement: true
            });
            mainStore.createIndex('type_idx', 'type');
            mainStore.createIndex('amount_idx', 'amount');
            mainStore.createIndex('date_idx', 'date');
            mainStore.createIndex('category_idx', 'category');
        }

        // Create estimated expenses store if not exists
        if (!db.objectStoreNames.contains('estimated_expenses')) {
            const estimatedStore = db.createObjectStore('estimated_expenses', {
                keyPath: 'id',
                autoIncrement: true
            });
            estimatedStore.createIndex('month_year', ['year', 'month']);
            estimatedStore.createIndex('category', 'categoryId');
            estimatedStore.createIndex('amount', 'amount');
        }
    };

    dbRequest.onsuccess = (event) => {
        db = event.target.result;
        resolve(db); 
    };

    dbRequest.onerror = (event) => {
        reject(event.target.error);
    };
});

export function getCategories() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['category'], 'readonly');
        const categoryStore = transaction.objectStore('category');
        const request = categoryStore.getAll();

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

export function addCategory(name) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['category'], 'readwrite');
        const categoryStore = transaction.objectStore('category');
        const request = categoryStore.add({ name });

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
};

export function addTransaction(transaction) {
    return new Promise((resolve, reject) => {
        const transactionStore = db.transaction(['main'], 'readwrite').objectStore('main');
        const request = transactionStore.add(transaction);

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

export function getTransactions() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['main'], 'readonly');
        const store = transaction.objectStore('main');
        const request = store.getAll();

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    })
}

export async function deleteTransaction(id) {
    try {
        await new Promise((resolve, reject) => {
            const transaction = db.transaction(['main'], 'readwrite').objectStore('main');
            const request = store.delete(id);

             request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => reject(event.target.error);
        });

    } catch (error) {
        console.error('Error in deleteTransaction:', error);
    }
}


export function addEstimatedExpense(expense) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['estimated_expenses'], 'readwrite');
        const store = transaction.objectStore('estimated_expenses');
        const request = store.add({
            ...expense,
            timestamp: new Date().toISOString()
        });

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    })
}

export function getEstimatedExpenses(year, month) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['estimated_expenses'], 'readonly');
        const store = transaction.objectStore('estimated_expenses');

        let request;

        if (year && month) {
            const index = store.index('month_year');
            request = index.getAll([year, month]);
        } else {
            request = store.getAll();
        }

        
        //const range = IDBKeyRange.only([year, month]);
        

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    })
}

export function updateEstimatedExpense(id, newData) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['estimated_expenses'], 'readwrite');
        const store = transaction.objectStore('estimated_expenses');
        const request = store.put({ id, ...newData});

        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
    })
}

export function deleteEstimatedExpense(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['estimated_expenses'], 'readwrite');
        const store = transaction.objectStore('estimated_expenses');
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    })
}
