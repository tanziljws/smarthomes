document.addEventListener('DOMContentLoaded', () => {
    const btnAddGroup = document.getElementById('btnAddGroup');
    const addGroupModal = document.getElementById('addGroupModal');
    const addCctvModal = document.getElementById('addCctvModal');
    const cctvGroups = document.getElementById('cctvGroups');

    const app = {
        async fetchGroups() {
            try {
                document.querySelector('.cctv-header').innerHTML = `
                    <div class="header-left">
                        <h1>CCTV Management</h1>
                    </div>
                    <div class="header-actions">
                        <button class="btn-select" onclick="app.toggleSelectMode()">
                            <span class="material-icons">checklist</span>
                            Select
                        </button>
                        <button class="btn-add-group" onclick="app.openAddGroupModal()">
                            <span class="material-icons">add</span>
                            Add Group
                        </button>
                    </div>
                `;

                const response = await fetch('/cctv/groups');
                const groups = await response.json();
                this.renderGroups(groups);
            } catch (error) {
                console.error('Error fetching groups:', error);
            }
        },

        toggleSelectMode() {
            this.isSelectMode = !this.isSelectMode;
            const headerActions = document.querySelector('.header-actions');

            if (this.isSelectMode) {
                headerActions.innerHTML = `
                    <div class="selection-actions">
                        <span class="selection-counter">0 selected</span>
                        <button class="btn-edit-selected" onclick="app.editSelectedGroups()">
                            <span class="material-icons">edit</span>
                            Edit
                        </button>
                        <button class="btn-delete-selected" onclick="app.deleteSelectedGroups()">
                            <span class="material-icons">delete</span>
                            Delete
                        </button>
                        <button class="btn-cancel-select" onclick="app.toggleSelectMode()">
                            <span class="material-icons">close</span>
                            Cancel
                        </button>
                    </div>
                `;

                document.querySelectorAll('.cctv-group-card').forEach(card => {
                    card.classList.add('selectable');
                    card.insertAdjacentHTML('afterbegin', `
                        <div class="select-checkbox">
                            <input type="checkbox"
                                   data-group-id="${card.dataset.groupId}"
                                   onchange="app.updateSelectionCounter()"
                                   onclick="event.stopPropagation()">
                        </div>
                    `);
                });
            } else {
                this.fetchGroups();
            }
        },

        updateSelectionCounter() {
            const selectedCount = document.querySelectorAll('.cctv-group-card input:checked').length;
            const counter = document.querySelector('.selection-counter');
            if (counter) {
                counter.textContent = `${selectedCount} selected`;
            }

            // Update button states
            const editBtn = document.querySelector('.btn-edit-selected');
            const deleteBtn = document.querySelector('.btn-delete-selected');

            if (editBtn && deleteBtn) {
                if (selectedCount === 0) {
                    editBtn.disabled = true;
                    deleteBtn.disabled = true;
                    editBtn.style.opacity = '0.5';
                    deleteBtn.style.opacity = '0.5';
                } else {
                    editBtn.disabled = false;
                    deleteBtn.disabled = false;
                    editBtn.style.opacity = '1';
                    deleteBtn.style.opacity = '1';
                }

                // Edit hanya bisa untuk 1 item
                if (selectedCount > 1) {
                    editBtn.disabled = true;
                    editBtn.style.opacity = '0.5';
                }
            }
        },

        async deleteSelectedGroups() {
            const selectedGroups = Array.from(document.querySelectorAll('.cctv-group-card input:checked'))
                .map(checkbox => checkbox.closest('.cctv-group-card').dataset.groupId)
                .filter(id => id);

            if (selectedGroups.length === 0) {
                alert('Please select groups to delete');
                return;
            }

            if (confirm('Are you sure you want to delete selected groups?')) {
                try {
                    const deletePromises = selectedGroups.map(async groupId => {
                        const response = await fetch(`/cctv/groups/${groupId}`, {
                            method: 'DELETE',
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        });

                        if (!response.ok) {
                            const errorData = await response.json();
                            throw new Error(errorData.error || 'Failed to delete group');
                        }

                        return response.json();
                    });

                    await Promise.all(deletePromises);
                    console.log('All selected groups deleted successfully');
                    this.toggleSelectMode();
                    await this.fetchGroups();
                } catch (error) {
                    console.error('Error deleting groups:', error);
                    alert(`Error deleting groups: ${error.message}`);
                }
            }
        },

        setupTabs() {
            const tabBtns = document.querySelectorAll('.tab-btn');
            tabBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    this.switchTab(btn.dataset.tab);
                });
            });
        },

        switchTab(tabId) {
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });

            document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
            document.getElementById(`${tabId}Tab`).classList.add('active');

            if (tabId === 'streams') {
                this.loadAllStreams();
            }
        },

        async renderGroups(groups) {
            cctvGroups.innerHTML = groups.map(group => `
                <div class="cctv-group-card" data-group-id="${group.id}">
                    <div class="group-header">
                        <h3>${group.name}</h3>
                        <div class="group-stats">
                            <span class="material-icons">videocam</span>
                            ${group.cctvs ? group.cctvs.length : 0} CCTVs
                        </div>
                    </div>
                    <div class="group-content">
                        <div class="group-thumbnail">
                            ${group.cctvs && group.cctvs[0] ?
                                `<div class="cctv-preview-item">
                                    <img src="${group.cctvs[0].stream_url}" alt="${group.name}" />
                                </div>` :
                                '<div class="no-stream">No CCTV Added</div>'
                            }
                        </div>
                        <div class="group-info">
                            <div class="group-description">
                                <p class="cctv-count">${group.cctvs ? group.cctvs.length : 0} cameras connected</p>
                            </div>
                            <div class="group-actions">
                                <button class="btn-add-cctv" onclick="app.openAddCctvModal('${group.id}')">
                                    <span class="material-icons">add_circle</span>
                                    ADD CCTV
                                </button>
                                <button class="btn-view" onclick="app.showGroupDetail('${group.id}')">
                                    <span class="material-icons">visibility</span>
                                    VIEW
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        },

        async showGroupDetail(groupId) {
            if (!groupId) {
                console.error('No group ID provided');
                return;
            }

            try {
                const response = await fetch(`/cctv/groups/${groupId}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch group details');
                }

                const data = await response.json();
                
                const viewModal = document.getElementById('viewCctvModal');
                viewModal.innerHTML = `
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2>${data.name}</h2>
                            <button class="btn-close" onclick="app.closeModal()">
                                <span class="material-icons">close</span>
                            </button>
                        </div>
                        <div class="cctv-streams">
                            ${data.cctvs && data.cctvs.length > 0 ? 
                                data.cctvs.map(cctv => `
                                    <div class="cctv-stream-container">
                                        <div class="stream-header">${cctv.name}</div>
                                        <div class="stream-wrapper" onclick="app.showFullScreen('${cctv.id}', '${cctv.stream_url}', '${cctv.name}')">
                                            <img src="${cctv.stream_url}" alt="${cctv.name}">
                                        </div>
                                        <button class="btn-delete" onclick="app.deleteCctv('${cctv.id}')">
                                            <span class="material-icons">delete</span>
                                        </button>
                                    </div>
                                `).join('') : 
                                '<div class="no-cctv">No CCTVs in this group</div>'
                            }
                        </div>
                    </div>
                `;
                viewModal.style.display = 'block';
            } catch (error) {
                console.error('Error:', error);
                alert('Failed to load CCTV group details');
            }
        },

        showFullScreen(cctvId, streamUrl, cctvName) {
            const expandedView = document.createElement('div');
            expandedView.className = 'stream-expanded';

            expandedView.innerHTML = `
                <div class="expanded-content">
                    <div class="expanded-header">
                        <h3>${cctvName}</h3>
                        <button class="close-expanded" onclick="this.closest('.stream-expanded').remove()">
                            <span class="material-icons">close</span>
                        </button>
                    </div>
                    <div class="expanded-stream">
                        <img src="${streamUrl}" alt="${cctvName}">
                    </div>
                </div>
            `;

            document.body.appendChild(expandedView);

            // Tambahkan click listener untuk menutup saat klik di luar
            expandedView.addEventListener('click', (e) => {
                if (e.target === expandedView) {
                    expandedView.remove();
                }
            });
        },

        closeModal() {
            const modal = document.getElementById('viewCctvModal');
            if (modal) {
                modal.style.display = 'none';
            }
        },

        async loadAllStreams() {
            try {
                const response = await fetch('/cctv/all');
                const cctvs = await response.json();
                const streamsContainer = document.getElementById('streamsTab');

                streamsContainer.innerHTML = `
                    <div class="streams-grid">
                        ${cctvs.map(cctv => `
                            <div class="stream-card">
                                <div class="stream-header">
                                    <h3>${cctv.name}</h3>
                                </div>
                                <div class="stream-content" onclick="app.showFullScreen(${cctv.id}, '${cctv.stream_url}', '${cctv.name}')">
                                    <img src="${cctv.stream_url}" alt="${cctv.name}" />
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            } catch (error) {
                console.error('Error loading streams:', error);
            }
        },

        async deleteCctv(cctvId) {
            if (confirm('Are you sure you want to delete this CCTV?')) {
                try {
                    const response = await fetch(`/cctv/${cctvId}`, {
                        method: 'DELETE'
                    });

                    if (response.ok) {
                        const groupId = addCctvModal.dataset.groupId;
                        if (groupId) {
                            this.showGroupDetail(groupId);
                        } else {
                            this.fetchGroups();
                        }
                    } else {
                        alert('Failed to delete CCTV');
                    }
                } catch (error) {
                    console.error('Error deleting CCTV:', error);
                    alert('Error deleting CCTV');
                }
            }
        },

        async editSelectedGroups() {
            const selectedGroups = document.querySelectorAll('.cctv-group-card input:checked');
            if (selectedGroups.length !== 1) {
                alert('Pilih satu grup untuk diedit');
                return;
            }

            const groupId = selectedGroups[0].closest('.cctv-group-card').dataset.groupId;

            try {
                const response = await fetch(`/cctv/groups/${groupId}`);
                const group = await response.json();

                // Isi form edit dengan data yang ada
                document.getElementById('editGroupName').value = group.name;

                // Tampilkan modal edit
                const editModal = document.getElementById('editGroupModal');
                editModal.style.display = 'block';
                editModal.dataset.groupId = groupId;
            } catch (error) {
                console.error('Error fetching group details:', error);
                alert('Gagal mengambil data grup');
            }
        },

        async updateGroupName(groupId) {
            const newName = document.getElementById('editGroupName').value.trim();

            if (!newName) {
                alert('Group name cannot be empty');
                return;
            }

            try {
                const response = await fetch(`/cctv/groups/${groupId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name: newName })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to update group name');
                }

                // Tutup modal
                document.querySelector('.modal').remove();

                // Reset selection mode dan refresh groups
                this.toggleSelectMode();
                await this.fetchGroups();

            } catch (error) {
                console.error('Error updating group name:', error);
                alert(`Error updating group name: ${error.message}`);
            }
        },

        closeAddCctvModal() {
            const modal = document.getElementById('addCctvModal');
            modal.style.display = 'none';
            // Reset form
            document.getElementById('addCctvForm').reset();
        },

        closeAddGroupModal() {
            const modal = document.getElementById('addGroupModal');
            modal.style.display = 'none';
            // Reset form
            document.getElementById('addGroupForm').reset();
        },

        openAddGroupModal() {
            const modal = document.getElementById('addGroupModal');
            if (!modal) {
                console.error('Add Group Modal not found');
                return;
            }
            modal.style.display = 'block';
        },

        toggleSidebar() {
            const sidebar = document.querySelector('.sidebar');
            const mainContent = document.querySelector('.main-content');
            
            if (sidebar) {
                sidebar.classList.toggle('show');
                
                if (sidebar.classList.contains('show')) {
                    sidebar.style.transform = 'translateX(0)';
                    sidebar.style.visibility = 'visible';
                } else {
                    sidebar.style.transform = 'translateX(-100%)';
                    setTimeout(() => {
                        if (!sidebar.classList.contains('show')) {
                            sidebar.style.visibility = 'hidden';
                        }
                    }, 300);
                }
            }
        },

        init() {
            document.getElementById('addGroupForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const groupName = document.getElementById('groupName').value;

                try {
                    const response = await fetch('/cctv/groups', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ name: groupName }),
                    });

                    if (response.ok) {
                        this.closeAddGroupModal();
                        await this.fetchGroups();
                    } else {
                        alert('Failed to add group');
                    }
                } catch (error) {
                    console.error('Error adding group:', error);
                    alert('Error adding group');
                }
            });

            document.getElementById('addCctvForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const modal = document.getElementById('addCctvModal');
                const groupId = modal.dataset.groupId;
                const cctvName = document.getElementById('cctvName').value.trim();
                const streamUrl = document.getElementById('cctvUrl').value.trim();

                if (!groupId) {
                    alert('Invalid group selection');
                    return;
                }

                if (!cctvName || !streamUrl) {
                    alert('Please fill in all fields');
                    return;
                }

                try {
                    const response = await fetch('/cctv/add', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            group_id: groupId,
                            name: cctvName,
                            stream_url: streamUrl
                        }),
                    });

                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.message || 'Failed to add CCTV');
                    }

                    // Close modal and refresh data
                    this.closeAddCctvModal();
                    await this.fetchGroups();
                    await this.showGroupDetail(groupId);
                } catch (error) {
                    console.error('Error adding CCTV:', error);
                    alert(error.message || 'Error adding CCTV');
                }
            });

            window.onclick = (event) => {
                const addGroupModal = document.getElementById('addGroupModal');
                const addCctvModal = document.getElementById('addCctvModal');

                if (event.target === addGroupModal) {
                    this.closeAddGroupModal();
                }
                if (event.target === addCctvModal) {
                    this.closeAddCctvModal();
                }
            };

            this.setupTabs();
            this.fetchGroups();

            // Close sidebar when clicking outside on mobile
            document.addEventListener('click', (e) => {
                const sidebar = document.querySelector('.sidebar');
                const burgerMenu = document.querySelector('.burger-menu');
                if (window.innerWidth <= 768 &&
                    sidebar.classList.contains('active') &&
                    !sidebar.contains(e.target) &&
                    !burgerMenu.contains(e.target)) {
                    this.toggleSidebar();
                }
            });

            // Handle window resize
            window.addEventListener('resize', () => {
                if (window.innerWidth > 768) {
                    const sidebar = document.querySelector('.sidebar');
                    const overlay = document.querySelector('.sidebar-overlay');
                    sidebar.classList.remove('active');
                    if (overlay) overlay.style.display = 'none';
                }
            });
        },

        openAddCctvModal(groupId) {
            if (!groupId) {
                console.error('No group ID provided');
                return;
            }
            
            const modal = document.getElementById('addCctvModal');
            if (modal) {
                modal.dataset.groupId = groupId;
                modal.style.display = 'block';
                
                // Reset form
                document.getElementById('addCctvForm').reset();
            }
        }
    };

    window.app = app;
    app.init();
});

// Tambahkan styles
const style = document.createElement('style');
style.textContent = `
    .stream-expanded {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.9);
        z-index: 9999;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 20px;
    }

    .expanded-content {
        background: #1e1e1e;
        border-radius: 8px;
        overflow: hidden;
        width: 90%;
        max-width: 1200px;
    }

    .expanded-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px 20px;
        background: #2a2a2a;
    }

    .expanded-stream {
        padding: 20px;
    }

    .expanded-stream img {
        width: auto;
        height: auto;
        max-width: 100%;
        max-height: calc(90vh - 100px);
        display: block;
        margin: 0 auto;
    }

    .stream-wrapper {
        cursor: pointer;
        transition: transform 0.2s ease;
    }

    .stream-wrapper:hover {
        transform: scale(1.02);
    }

    .sidebar {
        position: fixed;
        left: 0;
        top: 0;
        height: 100vh;
        width: 250px;
        background-color: #1a1a1a;
        color: white;
        transform: translateX(-100%);
        transition: transform 0.3s ease;
        z-index: 1000;
        visibility: hidden;
    }

    .sidebar.show {
        transform: translateX(0);
        visibility: visible;
    }

    .sidebar .logo {
        padding: 20px;
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .sidebar .logo h2 {
        margin: 0;
        font-size: 1.5rem;
    }

    .sidebar nav {
        padding: 20px 0;
    }

    .sidebar nav a {
        display: flex;
        align-items: center;
        padding: 15px 20px;
        color: white;
        text-decoration: none;
        gap: 10px;
        transition: background-color 0.3s;
    }

    .sidebar nav a:hover {
        background-color: rgba(255, 255, 255, 0.1);
    }

    .sidebar nav a.active {
        background-color: rgba(255, 255, 255, 0.2);
    }

    .sidebar nav a span {
        font-size: 1.1rem;
    }

    .sidebar nav a .material-icons {
        font-size: 24px;
    }

    /* Tambahan style untuk halaman CCTV */
    .cctv-container {
        padding: 20px;
        margin-left: 0;
        transition: margin-left 0.3s ease;
    }

    .cctv-container.shifted {
        margin-left: 250px;
    }

    .menu-btn {
        position: fixed;
        top: 20px;
        left: 20px;
        z-index: 1001;
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 10px;
    }

    .menu-btn:hover {
        background-color: rgba(255, 255, 255, 0.1);
        border-radius: 50%;
    }
`;

document.head.appendChild(style);

// Pastikan script dijalankan setelah DOM loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded');
    initializeEventListeners();
});

function initializeEventListeners() {
    console.log('DOM loaded');

    // Event listener untuk tombol edit di toolbar
    const editBtn = document.querySelector('button[data-action="edit"]');
    if (editBtn) {
        editBtn.addEventListener('click', handleEditClick);
        console.log('Edit button listener attached');
    }

    // Event listener untuk seleksi CCTV
    document.addEventListener('click', (e) => {
        const cctvItem = e.target.closest('.cctv-item');
        if (cctvItem) {
            // Remove selection from other items
            document.querySelectorAll('.cctv-item.selected').forEach(item => {
                if (item !== cctvItem) {
                    item.classList.remove('selected');
                }
            });
            cctvItem.classList.toggle('selected');
            console.log('CCTV item selected');
        }
    });

    // Event listener untuk form edit
    const editForm = document.getElementById('editCctvForm');
    if (editForm) {
        editForm.addEventListener('submit', handleEditSubmit);
        console.log('Edit form listener attached');
    }
}

function handleEditClick(e) {
    e.preventDefault();
    console.log('Edit button clicked');

    const selectedItem = document.querySelector('.cctv-item.selected');
    if (!selectedItem) {
        alert('Please select a CCTV first');
        return;
    }

    const groupName = selectedItem.querySelector('.cctv-name').textContent;
    document.getElementById('editGroupName').value = groupName;

    const modal = document.getElementById('editCctvModal');
    modal.style.display = 'block';
}

async function handleEditSubmit(e) {
    e.preventDefault();
    console.log('Form submitted');

    const selectedItem = document.querySelector('.cctv-item.selected');
    const newGroupName = document.getElementById('editGroupName').value;

    try {
        const response = await fetch(`/api/cctv/${selectedItem.dataset.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: newGroupName
            })
        });

        if (response.ok) {
            selectedItem.querySelector('.cctv-name').textContent = newGroupName;
            closeEditModal();
            console.log('CCTV updated successfully');
        } else {
            throw new Error('Failed to update CCTV');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to update CCTV');
    }
}

function closeEditModal() {
    const modal = document.getElementById('editCctvModal');
    modal.style.display = 'none';
}

// Fungsi sederhana untuk edit
function editCctv() {
    console.log('Edit button clicked!');

    // Cek item yang dipilih
    const selectedItem = document.querySelector('.cctv-item.selected');
    if (!selectedItem) {
        alert('Pilih CCTV dulu!');
        return;
    }

    // Ambil data
    const groupName = selectedItem.querySelector('.cctv-name').textContent;

    // Tampilkan modal
    const modal = document.getElementById('editCctvModal');
    const input = document.getElementById('editGroupName');

    if (modal && input) {
        input.value = groupName;
        modal.style.display = 'block';
    } else {
        alert('Error: Modal atau input tidak ditemukan!');
    }
}

// Fungsi untuk menutup modal
function closeEditModal() {
    const modal = document.getElementById('editCctvModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Fungsi untuk handle submit form
function saveEdit(event) {
    event.preventDefault();

    const newName = document.getElementById('editGroupName').value;
    const selectedItem = document.querySelector('.cctv-item.selected');

    if (selectedItem && newName) {
        selectedItem.querySelector('.cctv-name').textContent = newName;
        closeEditModal();
    }
}

// Tambahkan event listener untuk form edit
document.getElementById('editGroupForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const groupId = document.getElementById('editGroupModal').dataset.groupId;
    const newName = document.getElementById('editGroupName').value;

    try {
        const response = await fetch(`/cctv/groups/${groupId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: newName })
        });

        if (!response.ok) {
            throw new Error('Failed to update group');
        }

        // Tutup modal dan refresh data
        document.getElementById('editGroupModal').style.display = 'none';
        await app.fetchGroups();
        app.toggleSelectMode();
    } catch (error) {
        console.error('Error updating group:', error);
        alert('Gagal mengupdate grup');
    }
});

