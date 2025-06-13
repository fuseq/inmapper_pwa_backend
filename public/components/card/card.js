class Card {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        this.options = {
            title: options.title || 'Card Title',
            subtitle: options.subtitle || '',
            content: options.content || '',
            buttons: options.buttons || []
        };
        
        this.render();
    }

    createButton(button) {
        const btn = document.createElement('button');
        btn.className = `card-button ${button.type || 'secondary'}`;
        btn.textContent = button.text;
        if (button.onClick) {
            btn.addEventListener('click', button.onClick);
        }
        return btn;
    }

    render() {
        const card = document.createElement('div');
        card.className = 'card';

        // Header
        const header = document.createElement('div');
        header.className = 'card-header';

        const title = document.createElement('h2');
        title.className = 'card-title';
        title.textContent = this.options.title;
        header.appendChild(title);

        if (this.options.subtitle) {
            const subtitle = document.createElement('p');
            subtitle.className = 'card-subtitle';
            subtitle.textContent = this.options.subtitle;
            header.appendChild(subtitle);
        }

        card.appendChild(header);

        // Content
        if (this.options.content) {
            const content = document.createElement('div');
            content.className = 'card-content';
            content.textContent = this.options.content;
            card.appendChild(content);
        }

        // Footer with buttons
        if (this.options.buttons.length > 0) {
            const footer = document.createElement('div');
            footer.className = 'card-footer';
            
            this.options.buttons.forEach(button => {
                footer.appendChild(this.createButton(button));
            });

            card.appendChild(footer);
        }

        this.container.appendChild(card);
    }

    // Card'ı güncelleme metodu
    update(options = {}) {
        Object.assign(this.options, options);
        this.container.innerHTML = ''; // Mevcut card'ı temizle
        this.render(); // Yeni options ile tekrar render et
    }

    // Card'ı kaldırma metodu
    remove() {
        const card = this.container.querySelector('.card');
        if (card) {
            card.remove();
        }
    }
} 