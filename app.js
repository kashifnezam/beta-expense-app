class DatabaseService {
    constructor() {
        this.db = null;
        this.initializePromise = this.initDB();
    }

    initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('ExpenseTrackerDB', 3);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('transactions')) {
                    const store = db.createObjectStore('transactions', { keyPath: 'id' });
                    store.createIndex('by_date', 'date', { unique: false });
                    store.createIndex('by_person', 'person', { unique: false });
                }
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'name' });
                }
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    async getAllTransactions() {
        await this.initializePromise;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['transactions'], 'readonly');
            const store = transaction.objectStore('transactions');
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    async getTransactionsPaginated(page = 1, pageSize = 50) {
        await this.initializePromise;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['transactions'], 'readonly');
            const store = transaction.objectStore('transactions');
            const index = store.index('by_date');
            const request = index.getAll(null, (page - 1) * pageSize, pageSize);
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    async saveTransaction(transaction) {
        await this.initializePromise;
        return new Promise((resolve, reject) => {
            const transactionDB = this.db.transaction(['transactions'], 'readwrite');
            const store = transactionDB.objectStore('transactions');
            const request = store.put(transaction);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async deleteTransaction(id) {
        await this.initializePromise;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['transactions'], 'readwrite');
            const store = transaction.objectStore('transactions');
            const request = store.delete(id);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async saveSetting(name, value) {
        await this.initializePromise;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            const request = store.put({ name, value });
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getSetting(name) {
        await this.initializePromise;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.get(name);
            
            request.onsuccess = () => resolve(request.result?.value);
            request.onerror = () => reject(request.error);
        });
    }
}

class VirtualScrollRenderer {
    constructor(containerId, itemHeight, renderItemCallback) {
        this.container = document.getElementById(containerId);
        this.itemHeight = itemHeight;
        this.renderItem = renderItemCallback;
        this.visibleItems = [];
        this.currentData = [];
        this.scrollTop = 0;
        
        this.init();
    }

    init() {
        this.container.addEventListener('scroll', this.handleScroll.bind(this));
        this.updateContainerHeight();
    }

    setData(data) {
        this.currentData = data;
        this.updateContainerHeight();
        this.renderVisibleItems();
    }

    updateContainerHeight() {
        const totalHeight = this.currentData.length * this.itemHeight;
        this.container.style.height = `${totalHeight}px`;
    }

    handleScroll() {
        this.scrollTop = this.container.scrollTop;
        requestAnimationFrame(() => this.renderVisibleItems());
    }

    renderVisibleItems() {
        const startIndex = Math.floor(this.scrollTop / this.itemHeight);
        const endIndex = Math.min(
            startIndex + Math.ceil(this.container.clientHeight / this.itemHeight) + 2,
            this.currentData.length
        );
        
        const newVisibleItems = this.currentData.slice(startIndex, endIndex);
        
        if (JSON.stringify(this.visibleItems) !== JSON.stringify(newVisibleItems)) {
            this.visibleItems = newVisibleItems;
            const visibleItemsContainer = document.getElementById('visible-items');
            visibleItemsContainer.style.top = `${startIndex * this.itemHeight}px`;
            visibleItemsContainer.innerHTML = this.visibleItems.map((item, i) => 
                this.renderItem(item, startIndex + i)
            ).join('');
        }
    }
}

class ExpenseTrackerApp {
    constructor() {
        this.dbService = new DatabaseService();
        this.renderer = new VirtualScrollRenderer(
            'transactions-container',
            80, // item height in px
            this.renderTransaction.bind(this)
        );
        
        this.transactions = [];
        this.person1Name = 'Person 1';
        this.person2Name = 'Person 2';
        this.currencySymbol = '₹';
        this.isInitialized = false;
        
        this.init();
    }

    async init() {
        try {
            await this.loadSettings();
            await this.loadInitialTransactions();
            this.setupEventListeners();
            this.renderSummary();
            this.isInitialized = true;
        } catch (error) {
            console.error('Initialization failed:', error);
        }
    }

    async loadSettings() {
        this.person1Name = await this.dbService.getSetting('person1Name') || 'Person 1';
        this.person2Name = await this.dbService.getSetting('person2Name') || 'Person 2';
        this.currencySymbol = await this.dbService.getSetting('currencySymbol') || '₹';
        
        // Update select options
        const personSelect = document.getElementById('transaction-person');
        if (personSelect) {
            personSelect.innerHTML = `
                <option value="person1">${this.person1Name}</option>
                <option value="person2">${this.person2Name}</option>
            `;
        }
    }

    async loadInitialTransactions() {
        try {
            this.transactions = await this.dbService.getTransactionsPaginated(1, 100);
            this.renderer.setData(this.transactions);
        } catch (error) {
            console.error('Failed to load transactions:', error);
        }
    }

    renderTransaction(transaction) {
        const personName = transaction.person === 'person1' ? this.person1Name : this.person2Name;
        const formattedDate = new Date(transaction.date).toLocaleDateString();
        
        return `
            <div class="transaction" data-id="${transaction.id}">
                <div class="transaction-header">
                    <span>${personName}</span>
                    <span>${this.currencySymbol}${transaction.amount.toFixed(2)}</span>
                </div>
                <div class="transaction-desc">${transaction.desc}</div>
                <div class="transaction-date">${formattedDate}</div>
                <div class="transaction-actions">
                    <button class="delete-btn" data-id="${transaction.id}">Delete</button>
                </div>
            </div>
        `;
    }

    renderSummary() {
        const person1Total = this.transactions
            .filter(t => t.person === 'person1')
            .reduce((sum, t) => sum + t.amount, 0);
            
        const person2Total = this.transactions
            .filter(t => t.person === 'person2')
            .reduce((sum, t) => sum + t.amount, 0);
            
        const difference = Math.abs(person1Total - person2Total) / 2;
        
        document.getElementById('summary').innerHTML = `
            <h3>Summary</h3>
            <div>${this.person1Name}: ${this.currencySymbol}${person1Total.toFixed(2)}</div>
            <div>${this.person2Name}: ${this.currencySymbol}${person2Total.toFixed(2)}</div>
            <div>${person1Total > person2Total ? 
                `${this.person2Name} owes ${this.person1Name}` : 
                `${this.person1Name} owes ${this.person2Name}`}: 
                ${this.currencySymbol}${difference.toFixed(2)}
            </div>
        `;
    }

    setupEventListeners() {
        // Add transaction button
        document.getElementById('add-transaction-btn').addEventListener('click', () => {
            this.showAddTransactionModal();
        });
        
        // Save transaction
        document.getElementById('save-transaction').addEventListener('click', async () => {
            await this.saveNewTransaction();
        });
        
        // Cancel transaction
        document.getElementById('cancel-transaction').addEventListener('click', () => {
            this.hideAddTransactionModal();
        });
        
        // Delete transaction (delegated event)
        document.getElementById('visible-items').addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-btn')) {
                this.deleteTransaction(e.target.dataset.id);
            }
        });
    }

    showAddTransactionModal() {
        document.getElementById('add-transaction-modal').style.display = 'flex';
    }

    hideAddTransactionModal() {
        document.getElementById('add-transaction-modal').style.display = 'none';
        // Clear form
        document.getElementById('transaction-amount').value = '';
        document.getElementById('transaction-desc').value = '';
    }

    async saveNewTransaction() {
        const person = document.getElementById('transaction-person').value;
        const amount = parseFloat(document.getElementById('transaction-amount').value);
        const desc = document.getElementById('transaction-desc').value.trim();
        
        if (!amount || isNaN(amount)) {
            alert('Please enter a valid amount');
            return;
        }
        
        if (!desc) {
            alert('Please enter a description');
            return;
        }
        
        const newTransaction = {
            id: Date.now().toString(),
            person,
            amount,
            desc,
            date: new Date().toISOString()
        };
        
        try {
            await this.dbService.saveTransaction(newTransaction);
            this.transactions.unshift(newTransaction);
            this.renderer.setData(this.transactions);
            this.renderSummary();
            this.hideAddTransactionModal();
        } catch (error) {
            console.error('Failed to save transaction:', error);
            alert('Failed to save transaction');
        }
    }

    async deleteTransaction(id) {
        if (!confirm('Are you sure you want to delete this transaction?')) return;
        
        try {
            await this.dbService.deleteTransaction(id);
            this.transactions = this.transactions.filter(t => t.id !== id);
            this.renderer.setData(this.transactions);
            this.renderSummary();
        } catch (error) {
            console.error('Failed to delete transaction:', error);
            alert('Failed to delete transaction');
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new ExpenseTrackerApp();
    
    // Register service worker for offline support
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful');
            })
            .catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    }
});