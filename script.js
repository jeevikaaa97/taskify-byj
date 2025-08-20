const taskInput = document.getElementById('taskInput');
const descriptionInput = document.getElementById('description');
const categoryInput = document.getElementById('category');
const priorityInput = document.getElementById('priority');
const dueDateInput = document.getElementById('dueDate');
const addBtn = document.getElementById('addBtn');
const taskForm = document.getElementById('taskForm');
const taskList = document.getElementById('taskList');
const searchInput = document.getElementById('search');
const filterInput = document.getElementById('filter');
const sortInput = document.getElementById('sort');
const clearAllBtn = document.getElementById('clearAll');
const darkToggle = document.querySelector('.dark-toggle');
const undoDeleteBtn = document.getElementById('undoDelete');
const totalEl = document.getElementById('totalTasks');
const completedEl = document.getElementById('completedTasks');
const pendingEl = document.getElementById('pendingTasks');

let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
let lastDeleted = null;

function renderTasks(){
  taskList.innerHTML = "";
  let search = searchInput.value.toLowerCase();
  let filter = filterInput.value;
  let sort = sortInput.value;

  let today = new Date().toISOString().split("T")[0];

  let filtered = tasks.filter(t => {
    let matchesSearch = t.text.toLowerCase().includes(search) || (t.description || '').toLowerCase().includes(search);
    if(filter==="overdue") {
      return !t.completed && t.due && t.due < today;
    }
    let matchesFilter = filter==="all" 
      || (filter==="completed" && t.completed)
      || (filter==="pending" && !t.completed);
    return matchesSearch && matchesFilter;
  });

  // Sort Logic
  if(sort==="due"){
    filtered.sort((a,b)=>(a.due||"").localeCompare(b.due||""));
  } else if(sort==="priority"){
    const order = { high:1, medium:2, low:3 };
    filtered.sort((a,b)=> order[a.priority]-order[b.priority]);
  } else if(sort==="category"){
    filtered.sort((a,b)=> a.category.localeCompare(b.category));
  }

  filtered.forEach((task,i)=>{
    let li = document.createElement('li');
    li.className = 'task ' + (task.completed? "completed":"");
    let dueLabel = "";
    if(task.due){
      if(task.due < today && !task.completed){
        dueLabel = `<span style="color:red">⚠ Overdue</span>`;
      } else if(task.due===today && !task.completed){
        dueLabel = `<span style="color:orange">⏳ Due Today</span>`;
      }
    }
    // Task main info
    let infoHtml = `
      <span>
        <input type="checkbox" ${task.completed?"checked":""} data-index="${i}" class="completeChk"/> 
        ${task.text} 
        <span class="priority ${task.priority}">[${task.priority}]</span>
      </span>
      <div class="tags">
        <span class="tag ${task.category}">${task.category}</span>
        ${task.due? `<span>📅 ${task.due}</span>`:""}
        ${dueLabel}
      </div>
    `;
    // Task description
    let descHtml = task.description ? `<div class="description">${task.description}</div>` : "";

    // Completed date
    let completedHtml = (task.completed && task.completedDate)
      ? `<span class="completed-date">✔️ Completed: ${task.completedDate}</span>` : "";

    // Subtasks
    let subtasksHtml = "";
    if(task.subtasks && task.subtasks.length){
      subtasksHtml = `<div class="subtasks">
        ${task.subtasks.map((st,si)=>`
          <div class="subtask ${st.completed ? "completed" : ""}">
            <input type="checkbox" data-task="${i}" data-sub="${si}" ${st.completed?"checked":""}>
            ${st.text}
          </div>
        `).join('')}
      </div>`;
    }

    // Actions
    let actionsHtml = `<div class="task-actions">
      <button class="edit" onclick="editTask(${i})">✏️</button>
      <button class="delete" onclick="deleteTask(${i})">🗑️</button>
      <button class="addsub" onclick="addSubtask(${i})">➕ Subtask</button>
    </div>`;

    li.innerHTML = `<div class="task-info">${infoHtml}${descHtml}${completedHtml}${subtasksHtml}</div>${actionsHtml}`;

    taskList.appendChild(li);

    // Toggle completion
    li.querySelector(".completeChk").addEventListener("change",()=>{
      tasks[i].completed = !tasks[i].completed;
      if(tasks[i].completed) tasks[i].completedDate = new Date().toISOString().split("T")[0];
      else tasks[i].completedDate = "";
      saveTasks();
    });

    // Subtask checkbox handlers
    if(task.subtasks && task.subtasks.length){
      li.querySelectorAll(".subtasks input[type='checkbox']").forEach(cb=>{
        cb.addEventListener("change",function(){
          const subIdx = this.getAttribute("data-sub");
          tasks[i].subtasks[subIdx].completed = this.checked;
          saveTasks();
        });
      });
    }
  });

  updateStats();
  showUndoBtn();
}

// TASK STATS
function updateStats(){
  totalEl.textContent = `Total: ${tasks.length}`;
  completedEl.textContent = `Completed: ${tasks.filter(t=>t.completed).length}`;
  pendingEl.textContent = `Pending: ${tasks.filter(t=>!t.completed).length}`;
}

// ADD TASK
taskForm.addEventListener("submit",function(e){
  e.preventDefault();
  let text = taskInput.value.trim();
  let description = descriptionInput.value.trim();
  if(!text) return alert("Task cannot be empty");
  tasks.push({
    text,
    description,
    category: categoryInput.value,
    priority: priorityInput.value,
    due: dueDateInput.value,
    completed: false,
    completedDate: "",
    subtasks: []
  });
  saveTasks();
  taskInput.value="";
  descriptionInput.value="";
  dueDateInput.value="";
});

// SAVE TO LOCALSTORAGE
function saveTasks(){
  localStorage.setItem("tasks",JSON.stringify(tasks));
  renderTasks();
}

// DELETE, UNDO
function deleteTask(i){
  if(confirm("Delete this task?")){
    lastDeleted = tasks[i];
    tasks.splice(i,1);
    saveTasks();
  }
}
function showUndoBtn(){
  undoDeleteBtn.style.display = lastDeleted ? "inline-block" : "none";
}
undoDeleteBtn.addEventListener("click",()=>{
  if(lastDeleted){
    tasks.push(lastDeleted);
    lastDeleted = null;
    saveTasks();
  }
});

// EDIT TASK
window.editTask = function(i){
  let t = tasks[i];
  let newText = prompt("Edit task:",t.text) || t.text;
  let newDesc = prompt("Edit description:",t.description || "") || t.description;
  let newCategory = prompt("Edit category (work/personal/other):",t.category) || t.category;
  let newPriority = prompt("Edit priority (high/medium/low):",t.priority) || t.priority;
  let newDue = prompt("Edit due date (YYYY-MM-DD):",t.due) || t.due;

  tasks[i] = {
    ...t,
    text:newText,
    description:newDesc,
    category:newCategory,
    priority:newPriority,
    due:newDue
  };
  saveTasks();
}

// ADD SUBTASK
window.addSubtask = function(i){
  let subText = prompt("Subtask description:");
  if(subText){
    if(!tasks[i].subtasks) tasks[i].subtasks = [];
    tasks[i].subtasks.push({text:subText,completed:false});
    saveTasks();
  }
}

// SEARCH, FILTER, SORT
searchInput.addEventListener("input",renderTasks);
filterInput.addEventListener("change",renderTasks);
sortInput.addEventListener("change",renderTasks);

// CLEAR ALL
clearAllBtn.addEventListener("click",()=>{
  if(confirm("Clear ALL tasks?")){
    tasks = [];
    saveTasks();
  }
});

// DARK MODE
darkToggle.addEventListener("click",()=>{
  document.body.classList.toggle("dark");
  localStorage.setItem("darkMode",document.body.classList.contains("dark"));
});
if(localStorage.getItem("darkMode")==="true"){
  document.body.classList.add("dark");
}

// =============================
// Reminders/Notifications
// =============================
function checkReminders(){
  let today = new Date().toISOString().split("T")[0];
  tasks.forEach(t=>{
    if(t.due){
      let dueDate = t.due;
      let notiKey = "notif-"+t.text+t.due;
      if(!t.completed && dueDate){
        // If task is due tomorrow
        let tomorrow = new Date();
        tomorrow.setDate(new Date().getDate()+1);
        let tomorrowStr = tomorrow.toISOString().split("T");
        if(dueDate===tomorrowStr && !localStorage.getItem(notiKey)){
          alert(`Reminder: Task "${t.text}" is due tomorrow (${tomorrowStr})!`);
          localStorage.setItem(notiKey,"1");
        }
        // Overdue notification
        if(dueDate < today && !localStorage.getItem(notiKey+"-over")){
          alert(`Task "${t.text}" is OVERDUE (${dueDate})!`);
          localStorage.setItem(notiKey+"-over","1");
        }
      }
    }
  });
}
// Run reminder check on load and periodically
renderTasks();
setTimeout(checkReminders, 1000);
// Optionally check every hour
setInterval(checkReminders, 60*60*1000);

