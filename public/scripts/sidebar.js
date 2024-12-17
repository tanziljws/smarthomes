class Sidebar {
    constructor() {
        this.sidebar = document.querySelector('.sidebar');
        this.menuToggle = document.querySelector('.burger-menu');
        this.menuItems = document.querySelectorAll('.sidebar a');
        this.overlay = document.createElement('div');

        if (!this.sidebar || !this.menuToggle) {
            console.error('Required elements not found');
            return;
        }

        this.overlay.className = 'sidebar-overlay';
        document.body.appendChild(this.overlay);

        this.initialize();
    }

    initialize() {
        // Toggle button click handler
        this.menuToggle.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleSidebar();
        });

        // Overlay click handler
        this.overlay.addEventListener('click', () => this.closeSidebar());

        // Menu items click handler
        this.menuItems.forEach(item => {
            item.addEventListener('click', () => this.closeSidebar());
        });

        // Add close handler for escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeSidebar();
        });
    }

    toggleSidebar() {
        if (!this.sidebar) return;

        const isOpen = this.sidebar.classList.contains('open');
        if (isOpen) {
            this.closeSidebar();
        } else {
            this.openSidebar();
        }
    }

    openSidebar() {
        this.sidebar.classList.add('open');
        this.overlay.classList.add('active');
        document.body.classList.add('sidebar-open');
        this.menuToggle.classList.add('hidden');
    }

    closeSidebar() {
        this.sidebar.classList.remove('open');
        this.overlay.classList.remove('active');
        document.body.classList.remove('sidebar-open');
        this.menuToggle.classList.remove('hidden');
    }
}

// Initialize sidebar when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    window.sidebarInstance = new Sidebar();
}); 
