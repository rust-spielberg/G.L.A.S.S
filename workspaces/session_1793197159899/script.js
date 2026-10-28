// Initial data
let items = [
    { id: 1, name: 'Task 1', completed: false },
    { id: 2, name: 'Task 2', completed: true },
    { id: 3, name: 'Task 3', completed: false },
    { id: 4, name: 'Task 4', completed: true },
    { id: 5, name: 'Task 5', completed: false }
];

// DOM references
const itemList = document.getElementById('itemList');
const removeBtn = document.getElementById('removeBtn');

// Render the list
function renderList() {
    itemList.innerHTML = '';
    items.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item.name;
        if (item.completed) {
            li.classList.add('completed');
        }
        itemList.appendChild(li);
    });
}

// Remove completed items (fixed version)
function removeCompleted() {
    // Use filter to create a new array without mutating during iteration
    items = items.filter(item => !item.completed);
    renderList();
}

// Event listener
removeBtn.addEventListener('click', removeCompleted);

// Initial render
renderList();