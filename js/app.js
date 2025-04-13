import { DatabaseService } from './db.js';
import { VirtualScrollRenderer } from './renderer.js';
import { UI } from './ui.js';

class ExpenseTrackerApp {
    constructor() {
        this.db = new DatabaseService();
        this.initRenderers();
        this.ui = new UI(this.db, this.transactionsRenderer, this.trashRenderer);
    }

    initRenderers() {
        // Transactions renderer
        this.transactionsRenderer = new VirtualScrollRenderer(
            'transactions-container',
            'scroll-content',
            'visible-items',
            80, // item height
            (transaction) => this.renderTransaction(transaction)
        );
        
        // Trash renderer
        this.trashRenderer = new VirtualScrollRenderer(
            'trash-container',
            'trash-scroll-content',
            'visible-trash-items',
            80,
            (transaction) => this.renderTrashItem(transaction)
        );
    }

    renderTransaction(transaction) {
        return `
            <div class="transaction">
                <div class="transaction-header">
                    <span>${transaction.person === 'person1' ? this.ui.person1Name : this.ui.person2Name}</span>
                    <span>${this.ui.currencySymbol}${transaction.amount.toFixed(2)}</span>
                </div>
                <div class="transaction-desc">${transaction.desc}</div>
                <div class="transaction-date">${formatDate(transaction.date)}</div>
                <div class="transaction-actions">
                    <button class="edit-btn" data-id="${transaction.id}">Edit</button>
                    <button class="trash-btn" data-id="${transaction.id}">Trash</button>
                </div>
            </div>
        `;
    }

    renderTrashItem(transaction) {
        return `
            <div class="transaction trash-item">
                <div class="transaction-header">
                    <span>${transaction.person === 'person1' ? this.ui.person1Name : this.ui.person2Name}</span>
                    <span>${this.ui.currencySymbol}${transaction.amount.toFixed(2)}</span>
                </div>
                <div class="transaction-desc">${transaction.desc}</div>
                <div class="transaction-date">${formatDate(transaction.date)}</div>
                <div class="transaction-actions">
                    <button class="recover-btn" data-id="${transaction.id}">Recover</button>
                </div>
            </div>
        `;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new ExpenseTrackerApp();
});

// Register service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful');
            })
            .catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}