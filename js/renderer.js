import { debounce } from './utils.js';

export class VirtualScrollRenderer {
    constructor(containerId, contentId, itemsId, itemHeight, renderItemCallback) {
        this.container = document.getElementById(containerId);
        this.content = document.getElementById(contentId);
        this.itemsContainer = document.getElementById(itemsId);
        this.itemHeight = itemHeight;
        this.renderItem = renderItemCallback;
        this.currentData = [];
        this.visibleItems = [];
        this.scrollTop = 0;
        
        this.init();
    }

    init() {
        this.container.addEventListener('scroll', debounce(() => {
            this.handleScroll();
        }, 16)); // ~60fps
    }

    setData(data) {
        this.currentData = data;
        this.updateContainerHeight();
        this.renderVisibleItems();
    }

    updateContainerHeight() {
        const totalHeight = this.currentData.length * this.itemHeight;
        this.content.style.height = `${totalHeight}px`;
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
            this.itemsContainer.style.top = `${startIndex * this.itemHeight}px`;
            this.itemsContainer.innerHTML = this.visibleItems.map((item, i) => 
                this.renderItem(item, startIndex + i)
            ).join('');
        }
    }
}
