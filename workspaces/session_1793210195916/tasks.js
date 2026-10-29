const taskInput = document.getElementById('new-task');
const addBtn = document.getElementById('add-task-btn');
const taskList = document.getElementById('task-list');

let tasks = JSON.parse(localStorage.getItem('pomodoroTasks') || '[]');

function render() {
    taskList.innerHTML = '';
    tasks.forEach((t, i) => {
        const li = document.createElement('li');
        li.className = t.done ? 'completed' : '';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = t.done;
        checkbox.addEventListener('change', () => toggleTask(i));
        const span = document.createElement('span');
        span.textContent = t.text;
        li.append(checkbox, span);
        taskList.appendChild(li);
    });
}

function addTask() {
    const text = taskInput.value.trim();
    if (!text) return;
    tasks.push({ text, done: false });
    taskInput.value = '';
    saveAndRender();
}

function toggleTask(index) {
    tasks[index].done = !tasks[index].done;
    saveAndRender();
}

function saveAndRender() {
    localStorage.setItem('pomodoroTasks', JSON.stringify(tasks));
    render();
}

addBtn.addEventListener('click', addTask);
taskInput.addEventListener('keypress', e => { if (e.key === 'Enter') addTask(); });

render();