export function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

export function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

export function calculateSummary(transactions, person1Name, person2Name, currencySymbol) {
    const person1Total = transactions
        .filter(t => t.person === 'person1')
        .reduce((sum, t) => sum + t.amount, 0);
        
    const person2Total = transactions
        .filter(t => t.person === 'person2')
        .reduce((sum, t) => sum + t.amount, 0);
        
    const difference = Math.abs(person1Total - person2Total) / 2;
    
    return {
        person1Total,
        person2Total,
        total: person1Total + person2Total,
        difference,
        direction: person1Total > person2Total ? 
            `${person2Name} owes ${person1Name}` : 
            `${person1Name} owes ${person2Name}`
    };
}