export class UI {
    constructor(dbService, transactionsRenderer, trashRenderer) {
        this.db = dbService;
        this.transactionsRenderer = transactionsRenderer;
        this.trashRenderer = trashRenderer;
        
        this.transactions = [];
        this.trash = [];
        this.person1Name = 'Person 1';
        this.person2Name = 'Person 2';
        this.currencySymbol = '₹';
        
        this.init();
    }

    async init() {
        await this.loadSettings();
        await this.loadInitialData();
        this.setupEventListeners();
    }

    async loadSettings() {
        this.person1Name = await this.db.getSetting('person1Name') || 'Person 1';
        this.person2Name = await this.db.getSetting('person2Name') || 'Person 2';
        this.currencySymbol = await this.db.getSetting('currencySymbol') || '₹';
        
        document.getElementById('person1-name').textContent = this.person1Name;
        document.getElementById('person2-name').textContent = this.person2Name;
    }

    async loadInitialData() {
        try {
            this.transactions = await this.db.getTransactions();
            this.trash = await this.db.getTrashItems();
            
            this.transactionsRenderer.setData(this.transactions);
            this.trashRenderer.setData(this.trash);
            
            this.updateSummary();
        } catch (error) {
            console.error('Failed to load initial data:', error);
        }
    }

    updateSummary() {
        const person1Total = this.transactions
            .filter(t => t.person === 'person1')
            .reduce((sum, t) => sum + t.amount, 0);
            
        const person2Total = this.transactions
            .filter(t => t.person === 'person2')
            .reduce((sum, t) => sum + t.amount, 0);
            
        const difference = Math.abs(person1Total - person2Total) / 2;
        
        document.getElementById('person1-total').textContent = 
            `${this.currencySymbol}${person1Total.toFixed(2)}`;
        document.getElementById('person2-total').textContent = 
            `${this.currencySymbol}${person2Total.toFixed(2)}`;
        document.getElementById('total-amount').textContent = 
            `${this.currencySymbol}${(person1Total + person2Total).toFixed(2)}`;
        
        const settleDirection = document.getElementById('settle-direction');
        const settleAmount = document.getElementById('settle-amount');
        
        if (person1Total > person2Total) {
            settleDirection.textContent = 
                `${this.person2Name} owes ${this.person1Name}`;
            settleAmount.textContent = `${this.currencySymbol}${difference.toFixed(2)}`;
            settleAmount.className = 'gets';
        } else if (person2Total > person1Total) {
            settleDirection.textContent = 
                `${this.person1Name} owes ${this.person2Name}`;
            settleAmount.textContent = `${this.currencySymbol}${difference.toFixed(2)}`;
            settleAmount.className = 'owes';
        } else {
            settleDirection.textContent = 
                `${this.person1Name} and ${this.person2Name} are even`;
            settleAmount.textContent = `${this.currencySymbol}0.00`;
            settleAmount.className = '';
        }
    }

    setupEventListeners() {
        // Add transaction
        document.getElementById('add-transaction').addEventListener('click', () => {
            this.addTransaction();
        });
        
        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.getAttribute('data-tab');
                this.switchTab(tabId);
            });
        });
        
        // Quick add button
        document.getElementById('quick-add-btn').addEventListener('click', () => {
            document.getElementById('transaction-amount').focus();
        });
    }

    async addTransaction() {
        const person = document.getElementById('transaction-person').value;
        const amount = parseFloat(document.getElementById('transaction-amount').value);
        const category = document.getElementById('transaction-category').value;
        const desc = document.getElementById('transaction-desc').value.trim();
        
        if (!amount || isNaN(amount)) {
            alert('Please enter a valid amount');
            return;
        }
        
        if (!desc) {
            alert('Please enter a description');
            return;
        }
        
        const transaction = {
            id: Date.now().toString(),
            person,
            amount,
            category,
            desc,
            date: new Date().toISOString()
        };
        
        try {
            await this.db.addTransaction(transaction);
            this.transactions.unshift(transaction);
            this.transactionsRenderer.setData(this.transactions);
            this.updateSummary();
            
            // Clear form
            document.getElementById('transaction-amount').value = '';
            document.getElementById('transaction-desc').value = '';
        } catch (error) {
            console.error('Failed to add transaction:', error);
            alert('Failed to save transaction');
        }
    }

    switchTab(tabId) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.style.display = 'none';
        });
        
        // Show selected tab
        document.getElementById(`${tabId}-tab`).style.display = 'block';
        
        // Update active tab style
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`.tab[data-tab="${tabId}"]`).classList.add('active');
    }
}