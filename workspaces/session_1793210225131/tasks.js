const taskForm = document.getElementById('taskForm');
const taskInput = document.getElementById('taskInput');
const taskList = document.getElementById('taskList');
const STORAGE_KEY = 'pomodoroTasks';

let tasks = JSON.parse(localStorage.getItem(STORAGE_KEY))||[];

function render(){
    taskList.innerHTML='';
    tasks.forEach((t,i)=>{
        const li=document.createElement('li');
        li.className='task-item'+(t.done?' completed':'');
        li.innerHTML=`
            <input type="checkbox" ${t.done?'checked':''} data-index="${i}">
            <span>${t.text}</span>
        `;
        taskList.appendChild(li);
    });
}
function addTask(text){
    tasks.push({text,done:false});
    save();
    render();
}
function toggleTask(idx){
    tasks[idx].done=!tasks[idx].done;
    save();
    render();
}
function save(){
    localStorage.setItem(STORAGE_KEY,JSON.stringify(tasks));
}
taskForm.addEventListener('submit',e=>{
    e.preventDefault();
    const txt=taskInput.value.trim();
    if(txt){addTask(txt);taskInput.value='';}
});
taskList.addEventListener('change',e=>{
    if(e.target.matches('input[type=checkbox]')){
        const idx=e.target.dataset.index;
        toggleTask(idx);
    }
});
render();