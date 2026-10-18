
// ================================================
// TASKBLOOM — CALENDAR AND DAILY TASK MANAGEMENT
// PART 1 OF 2
// ================================================

"use strict";

// 1. HTML ELEMENTS
const taskForm = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const taskList = document.getElementById("task-list");
const taskFilter = document.getElementById("task-filter");

const totalCount = document.getElementById("total-count");
const completedCount = document.getElementById("completed-count");
const pendingCount = document.getElementById("pending-count");

const currentDate = document.getElementById("current-date");
const selectedDateLabel = document.getElementById("selected-date-label");

const calendarMonth = document.getElementById("calendar-month");
const calendarDays = document.getElementById("calendar-days");

const previousMonthButton = document.getElementById("prev-month");
const nextMonthButton = document.getElementById("next-month");
const todayButton = document.getElementById("today-button");

// 2. STORAGE CONFIGURATION
const STORAGE_KEY = "taskbloom-dated-tasks-v2";
const OLD_STORAGE_KEY = "taskbloom-tasks-v1";

// 3. DATE HELPERS
function toDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getTodayKey() {
    return toDateKey(new Date());
}

function isValidDateKey(value) {
    if (typeof value !== "string") return false;

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return false;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);

    return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
    );
}

function parseDateKey(dateKey) {
    if (!isValidDateKey(dateKey)) return new Date();

    const [year, month, day] = dateKey.split("-").map(Number);
    return new Date(year, month - 1, day);
}

function formatDate(dateKey, options = {}) {
    return parseDateKey(dateKey).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
        ...options
    });
}

function getDateFromTimestamp(timestamp) {
    if (typeof timestamp !== "string") return null;

    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return null;

    return toDateKey(date);
}

// 4. SELECTED DATE AND VISIBLE MONTH
let selectedDate = getTodayKey();
const initialDate = parseDateKey(selectedDate);

let visibleYear = initialDate.getFullYear();
let visibleMonth = initialDate.getMonth();

// 5. TASK STORAGE AND MIGRATION
function createTaskId() {
    if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
    ) {
        return crypto.randomUUID();
    }

    return `task-${Date.now().toString(36)}-${Math.random()
        .toString(36).slice(2)}`;
}

function normalizeTask(task) {
    if (!task || typeof task !== "object") return null;
    if (typeof task.title !== "string") return null;

    const title = task.title.trim();
    if (!title || title.length > 120) return null;

    let date = isValidDateKey(task.date)
        ? task.date
        : getDateFromTimestamp(task.createdAt);

    if (!date) date = getTodayKey();

    return {
        id: typeof task.id === "string" && task.id
            ? task.id
            : createTaskId(),
        title,
        completed: task.completed === true,
        date,
        createdAt: typeof task.createdAt === "string"
            ? task.createdAt
            : new Date().toISOString()
    };
}

function readTaskArray(storageKey) {
    const raw = localStorage.getItem(storageKey);
    if (raw === null) return null;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
        throw new Error("Saved task data is not a valid array.");
    }

    return parsed;
}

function loadTasks() {
    try {
        const currentTasks = readTaskArray(STORAGE_KEY);

        if (currentTasks !== null) {
            return currentTasks.map(normalizeTask).filter(Boolean);
        }

        const oldTasks = readTaskArray(OLD_STORAGE_KEY);

        if (oldTasks !== null) {
            const migratedTasks = oldTasks
                .map(normalizeTask)
                .filter(Boolean);

            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(migratedTasks)
            );

            console.info(
                `TaskBloom migrated ${migratedTasks.length} tasks.`
            );

            return migratedTasks;
        }

        return [];
    } catch (error) {
        console.error("Could not load saved tasks:", error);
        alert("TaskBloom could not read saved tasks. Check the browser console.");
        return [];
    }
}

let tasks = loadTasks();

function saveTasks() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        return true;
    } catch (error) {
        console.error("Could not save tasks:", error);
        alert("Could not save changes. Check your browser storage.");
        return false;
    }
}

// 6. DATE DISPLAY
function displayCurrentDate() {
    currentDate.textContent = new Date().toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function updateSelectedDateLabel() {
    selectedDateLabel.textContent = formatDate(selectedDate, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

// 7. CALENDAR RENDERING
function renderCalendar() {
    const firstDay = new Date(visibleYear, visibleMonth, 1);
    const numberOfDays = new Date(
        visibleYear,
        visibleMonth + 1,
        0
    ).getDate();

    const startingWeekday = firstDay.getDay();

    calendarMonth.textContent = firstDay.toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric"
    });

    calendarDays.replaceChildren();
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < startingWeekday; i++) {
        const emptyCell = document.createElement("div");
        emptyCell.className = "calendar-day empty";
        emptyCell.setAttribute("aria-hidden", "true");
        fragment.appendChild(emptyCell);
    }

    const todayKey = getTodayKey();

    for (let day = 1; day <= numberOfDays; day++) {
        const dateKey = toDateKey(
            new Date(visibleYear, visibleMonth, day)
        );

        const dayTasks = tasks.filter(task => task.date === dateKey);
        const button = document.createElement("button");

        button.type = "button";
        button.className = "calendar-day";
        button.setAttribute(
            "aria-label",
            `${formatDate(dateKey)}, ${dayTasks.length} tasks`
        );
        button.setAttribute(
            "aria-pressed",
            String(dateKey === selectedDate)
        );

        if (dateKey === todayKey) button.classList.add("is-today");
        if (dateKey === selectedDate) button.classList.add("is-selected");
        if (dayTasks.length > 0) button.classList.add("has-tasks");

        const dayNumber = document.createElement("span");
        dayNumber.className = "day-number";
        dayNumber.textContent = day;

        const indicator = document.createElement("span");
        indicator.className = "day-indicator";
        indicator.setAttribute("aria-hidden", "true");

        for (let i = 0; i < Math.min(dayTasks.length, 3); i++) {
            indicator.appendChild(document.createElement("span"));
        }

        button.append(dayNumber, indicator);
        button.addEventListener("click", () => selectDate(dateKey));

        fragment.appendChild(button);
    }

    calendarDays.appendChild(fragment);
}

// 8. SELECT A DATE
function selectDate(dateKey) {
    if (!isValidDateKey(dateKey)) return;

    selectedDate = dateKey;
    const date = parseDateKey(dateKey);

    visibleYear = date.getFullYear();
    visibleMonth = date.getMonth();

    updateSelectedDateLabel();
    renderCalendar();
    renderTasks();
}

// 9. MONTH NAVIGATION
previousMonthButton.addEventListener("click", () => {
    const date = new Date(visibleYear, visibleMonth - 1, 1);
    visibleYear = date.getFullYear();
    visibleMonth = date.getMonth();
    renderCalendar();
});

nextMonthButton.addEventListener("click", () => {
    const date = new Date(visibleYear, visibleMonth + 1, 1);
    visibleYear = date.getFullYear();
    visibleMonth = date.getMonth();
    renderCalendar();
});

todayButton.addEventListener("click", () => selectDate(getTodayKey()));

// 10. DAILY STATISTICS
function updateStatistics(dayTasks) {
    const total = dayTasks.length;
    const completed = dayTasks.filter(task => task.completed).length;

    totalCount.textContent = total;
    completedCount.textContent = completed;
    pendingCount.textContent = total - completed;
}

// 11. CREATE TASK CARD
function createTaskElement(task) {
    const card = document.createElement("article");
    card.className = "task-card";

    if (task.completed) card.classList.add("completed");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-checkbox";
    checkbox.checked = task.completed;
    checkbox.setAttribute("aria-label", `Mark ${task.title} as completed`);
    checkbox.addEventListener("change", () => toggleTask(task.id));

    const details = document.createElement("div");
    details.className = "task-details";

    const title = document.createElement("p");
    title.className = "task-title";
    title.textContent = task.title;

    const status = document.createElement("span");
    status.className = "task-status";
    status.textContent = task.completed ? "Completed" : "Pending";

    details.append(title, status);

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "edit-button";
    editButton.textContent = "Edit";
    editButton.setAttribute("aria-label", `Edit ${task.title}`);
    editButton.addEventListener("click", () => editTask(task.id));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-button";
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute("aria-label", `Delete ${task.title}`);
    deleteButton.addEventListener("click", () => deleteTask(task.id));

    actions.append(editButton, deleteButton);
    card.append(checkbox, details, actions);

    return card;
}

// 12. RENDER TASKS FOR THE SELECTED DATE
function renderTasks() {
    const dailyTasks = tasks.filter(task => task.date === selectedDate);
    const selectedFilter = taskFilter.value;

    const filteredTasks = dailyTasks.filter(task => {
        if (selectedFilter === "pending") return !task.completed;
        if (selectedFilter === "completed") return task.completed;
        return true;
    });

    taskList.replaceChildren();

    if (filteredTasks.length === 0) {
        const emptyState = document.createElement("div");
        emptyState.className = "empty-state";

        const icon = document.createElement("span");
        icon.className = "empty-icon";
        icon.textContent = "🌷";

        const heading = document.createElement("h3");
        const message = document.createElement("p");

        if (dailyTasks.length === 0) {
            heading.textContent = "Your journey starts here!";
            message.textContent = "Add your first task to make this day count.";
        } else if (selectedFilter === "completed") {
            heading.textContent = "No completed tasks yet!";
            message.textContent = "Finish a task and it will appear here.";
        } else if (selectedFilter === "pending") {
            heading.textContent = "All caught up!";
            message.textContent = "You have no pending tasks for this day.";
        } else {
            heading.textContent = "No tasks found!";
            message.textContent = "Add a task to start planning your day.";
        }

        emptyState.append(icon, heading, message);
        taskList.appendChild(emptyState);
    } else {
        const fragment = document.createDocumentFragment();

        filteredTasks.forEach(task => {
            fragment.appendChild(createTaskElement(task));
        });

        taskList.appendChild(fragment);
    }

    updateStatistics(dailyTasks);
}

// 13. ADD A TASK
function addTask(title) {
    const task = {
        id: createTaskId(),
        title,
        completed: false,
        date: selectedDate,
        createdAt: new Date().toISOString()
    };

    tasks.unshift(task);

    if (!saveTasks()) {
        tasks.shift();
        return;
    }

    renderCalendar();
    renderTasks();
}

// 14. TOGGLE COMPLETION
function toggleTask(taskId) {
    const task = tasks.find(item => item.id === taskId);
    if (!task) return;

    const previousValue = task.completed;
    task.completed = !task.completed;

    if (!saveTasks()) {
        task.completed = previousValue;
        renderTasks();
        return;
    }

    renderCalendar();
    renderTasks();
}

// 15. EDIT A TASK
function editTask(taskId) {
    const task = tasks.find(item => item.id === taskId);
    if (!task) return;

    const updatedTitle = prompt("Edit your task:", task.title);
    if (updatedTitle === null) return;

    const cleanedTitle = updatedTitle.trim();

    if (!cleanedTitle) {
        alert("Task name cannot be empty.");
        return;
    }

    if (cleanedTitle.length > 120) {
        alert("Task name must be 120 characters or fewer.");
        return;
    }

    const previousTitle = task.title;
    task.title = cleanedTitle;

    if (!saveTasks()) {
        task.title = previousTitle;
        return;
    }

    renderCalendar();
    renderTasks();
}

// 16. DELETE A TASK
function deleteTask(taskId) {
    const taskIndex = tasks.findIndex(item => item.id === taskId);
    if (taskIndex === -1) return;

    const removedTask = tasks[taskIndex];

    if (!confirm(`Delete "${removedTask.title}"?`)) return;

    tasks.splice(taskIndex, 1);

    if (!saveTasks()) {
        tasks.splice(taskIndex, 0, removedTask);
        renderTasks();
        return;
    }

    renderCalendar();
    renderTasks();
}

// 17. ADD TASK FORM
taskForm.addEventListener("submit", event => {
    event.preventDefault();

    const title = taskInput.value.trim();

    if (!title) {
        taskInput.focus();
        return;
    }

    if (title.length > 120) {
        alert("Task name must be 120 characters or fewer.");
        return;
    }

    addTask(title);
    taskInput.value = "";
    taskInput.focus();
});

// 18. TASK FILTER
taskFilter.addEventListener("change", renderTasks);

// 19. INITIALIZE TASK APP
function initializeApp() {
    displayCurrentDate();
    updateSelectedDateLabel();
    renderCalendar();
    renderTasks();
}

initializeApp();

// ================================================
// TASKBLOOM — DYNAMIC POMODORO TIMER
// PART 2 OF 2
// ================================================

// 1. MOTIVATIONAL QUOTES
const motivationalQuotes = [
    { text: "Small steps every day lead to big changes.", author: "Your future self" },
    { text: "You do not have to be perfect. Just keep going.", author: "A little reminder" },
    { text: "Your dreams deserve your discipline.", author: "Believe in yourself" },
    { text: "Consistency beats motivation when motivation fades.", author: "Keep showing up" },
    { text: "You are capable of more than you think.", author: "Trust your journey" },
    { text: "Progress is progress, no matter how small.", author: "Celebrate yourself" },
    { text: "Start where you are. Use what you have.", author: "One step at a time" },
    { text: "Your future is created by what you do today.", author: "Make today count" },
    { text: "Take a breath, focus, and begin again.", author: "You have got this" },
    { text: "You are building habits your future self will thank you for.", author: "Little by little" },
    { text: "Do it with dedication, not just motivation.", author: "Stay committed" },
    { text: "Every focused minute is an investment in yourself.", author: "Keep blooming" },
    { text: "Believe in your ability to grow.", author: "Your journey matters" },
    { text: "Begin before you feel ready.", author: "One step at a time" },
    { text: "You deserve to be proud of your progress.", author: "Be kind to yourself" }
];

let lastQuoteIndex = -1;

function showRandomQuote() {
    const quoteElement = document.getElementById("motivational-quote");
    const authorElement = document.getElementById("quote-author");

    if (!quoteElement || !authorElement) return;

    let index = Math.floor(Math.random() * motivationalQuotes.length);

    if (index === lastQuoteIndex) {
        index = (index + 1) % motivationalQuotes.length;
    }

    lastQuoteIndex = index;

    quoteElement.textContent = `“${motivationalQuotes[index].text}”`;
    authorElement.textContent = `— ${motivationalQuotes[index].author}`;
}

// 2. TIMER ELEMENTS AND SETTINGS
const DEFAULT_TIMER_MINUTES = 25;
const MIN_TIMER_MINUTES = 1;
const MAX_TIMER_MINUTES = 180;
const SESSION_STORAGE_KEY = "taskbloom-pomodoro-sessions";

const timerMinutesInput = document.getElementById("timer-minutes");
const timerDisplay = document.getElementById("timer-display");
const timerStatus = document.getElementById("timer-status");
const timerProgressBar = document.getElementById("timer-progress-bar");

const startTimerButton = document.getElementById("start-timer");
const pauseTimerButton = document.getElementById("pause-timer");
const resetTimerButton = document.getElementById("reset-timer");
const sessionsCount = document.getElementById("sessions-count");
const stopAlarmButton = document.getElementById("stop-alarm");

let currentDurationSeconds = DEFAULT_TIMER_MINUTES * 60;
let remainingSeconds = currentDurationSeconds;
let timerInterval = null;
let endTime = null;
let sessionStarted = false;

// Restore the number of previously completed sessions.
let completedSessions = 0;

try {
    completedSessions = Math.max(
        0,
        Number(localStorage.getItem(SESSION_STORAGE_KEY)) || 0
    );
} catch (error) {
    console.warn("Could not load completed session count.", error);
}

// 3. READ AND VALIDATE THE DURATION
function readDurationInput() {
    if (!timerMinutesInput) {
        return DEFAULT_TIMER_MINUTES * 60;
    }

    const value = Number(timerMinutesInput.value);

    if (
        !Number.isInteger(value) ||
        value < MIN_TIMER_MINUTES ||
        value > MAX_TIMER_MINUTES
    ) {
        alert("Please choose a whole number from 1 to 180 minutes.");
        timerMinutesInput.focus();
        return null;
    }

    return value * 60;
}

// Update the preview when the user changes the duration.
if (timerMinutesInput) {
    timerMinutesInput.value = String(DEFAULT_TIMER_MINUTES);

    timerMinutesInput.addEventListener("input", () => {
        if (timerInterval !== null || sessionStarted) return;

        const value = Number(timerMinutesInput.value);

        if (
            timerMinutesInput.value.trim() !== "" &&
            Number.isInteger(value) &&
            value >= MIN_TIMER_MINUTES &&
            value <= MAX_TIMER_MINUTES
        ) {
            currentDurationSeconds = value * 60;
            remainingSeconds = currentDurationSeconds;
            updateTimerDisplay();
        }
    });
}

function changeTimerDuration(amount) {
    if (sessionStarted || timerInterval !== null || !timerMinutesInput) {
        return;
    }

    const currentValue = Number(timerMinutesInput.value);
    const startingValue =
        Number.isInteger(currentValue) ? currentValue : DEFAULT_TIMER_MINUTES;

    const newValue = Math.max(
        MIN_TIMER_MINUTES,
        Math.min(MAX_TIMER_MINUTES, startingValue + amount)
    );

    timerMinutesInput.value = String(newValue);
    currentDurationSeconds = newValue * 60;
    remainingSeconds = currentDurationSeconds;

    updateTimerDisplay();
}

document.getElementById("duration-minus").addEventListener(
    "click",
    () => changeTimerDuration(-1)
);

document.getElementById("duration-plus").addEventListener(
    "click",
    () => changeTimerDuration(1)
);

// 4. UPDATE TIMER DISPLAY AND PROGRESS RING

function updateTimerDisplay() {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;

    timerDisplay.textContent =
        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

    const elapsedPercentage = currentDurationSeconds > 0
        ? ((currentDurationSeconds - remainingSeconds) /
            currentDurationSeconds) * 100
        : 0;

    if (timerProgressBar) {
        timerProgressBar.style.width =
            `${Math.min(100, Math.max(0, elapsedPercentage))}%`;

        const progressTrack = timerProgressBar.parentElement;

        if (progressTrack) {
            progressTrack.setAttribute(
                "aria-valuenow",
                String(Math.round(elapsedPercentage))
            );
        }
    }
}


// 5. COMPLETED SESSION COUNTER
function updateSessionsDisplay() {
    sessionsCount.textContent = completedSessions;
}

// 6. TIMER CONTROL HELPERS
function stopTimerInterval() {
    if (timerInterval !== null) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateDurationInputAvailability() {
    if (timerMinutesInput) {
        timerMinutesInput.disabled = sessionStarted;
    }
}

// 7. START OR RESUME THE TIMER
function startPomodoro() {
    if (timerInterval !== null) return;

    // Read a new duration only when starting a new session.
    // A paused session always resumes with its remaining time.
    if (!sessionStarted) {
        const duration = readDurationInput();

        if (duration === null) return;

        currentDurationSeconds = duration;
        remainingSeconds = duration;
        sessionStarted = true;
    }

    if (remainingSeconds <= 0) return;

    updateDurationInputAvailability();

    timerStatus.textContent = "Focus time! You've got this 💪";
    pauseTimerButton.disabled = false;

    endTime = Date.now() + remainingSeconds * 1000;

    timerInterval = setInterval(() => {
        remainingSeconds = Math.max(
            0,
            Math.ceil((endTime - Date.now()) / 1000)
        );

        updateTimerDisplay();

        if (remainingSeconds === 0) {
            stopTimerInterval();
            endTime = null;

            pauseTimerButton.disabled = true;
            sessionStarted = false;
            updateDurationInputAvailability();

            completedSessions++;

            try {
                localStorage.setItem(
                    SESSION_STORAGE_KEY,
                    String(completedSessions)
                );
            } catch (error) {
                console.warn("Could not save session count.", error);
            }

            updateSessionsDisplay();

            timerStatus.textContent =
                "Focus session complete! Take a short break 🎉";

            playCompletionAlarm();
            showRandomQuote();
        }
    }, 250);

    updateTimerDisplay();
}

// 8. PAUSE THE TIMER
function pausePomodoro() {
    if (timerInterval === null) return;

    remainingSeconds = Math.max(
        0,
        Math.ceil((endTime - Date.now()) / 1000)
    );

    stopTimerInterval();
    endTime = null;

    pauseTimerButton.disabled = true;
    updateTimerDisplay();

    // Keep sessionStarted true so Start resumes this session.
    timerStatus.textContent =
        "Timer paused. Resume when you're ready.";
}

// 9. RESET THE TIMER
function resetPomodoro() {
    stopTimerInterval();
    endTime = null;

    // Stop any alarm tones that may still be playing.
    stopCompletionAlarm();

    sessionStarted = false;

    const duration = readDurationInput();

    if (duration !== null) {
        currentDurationSeconds = duration;
    } else if (timerMinutesInput) {
        timerMinutesInput.value = String(
            currentDurationSeconds / 60
        );
    }

    remainingSeconds = currentDurationSeconds;

    pauseTimerButton.disabled = true;
    updateDurationInputAvailability();
    updateTimerDisplay();

    timerStatus.textContent =
        "Ready for a fresh focus session? 🌸";

    showRandomQuote();
}

// 10. PREPARE AUDIO AFTER A USER CLICK

/* ==========================================
   TASKBLOOM — LOUDER 20-SECOND ALARM
========================================== */

let alarmAudioContext = null;
let alarmOscillators = [];
let alarmTimeout = null;
let alarmGeneration = 0;

function getAlarmAudioContext() {
    const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return null;

    if (!alarmAudioContext || alarmAudioContext.state === "closed") {
        alarmAudioContext = new AudioContextClass();
    }

    return alarmAudioContext;
}

// Called from Start Focus's existing click listener.
// This helps Chrome permit audio later when the timer finishes.
function prepareAlarmAudio() {
    const context = getAlarmAudioContext();

    if (context && context.state === "suspended") {
        context.resume().catch(error => {
            console.warn("Could not prepare alarm audio.", error);
        });
    }
}

// Used by Reset to silence any alarm already playing.
function stopCompletionAlarm() {
    alarmGeneration++;

    if (alarmTimeout !== null) {
        clearTimeout(alarmTimeout);
        alarmTimeout = null;
    }

    alarmOscillators.forEach(oscillator => {
        try {
            oscillator.stop();
        } catch (error) {
            // This tone may already have stopped.
        }
    });

    alarmOscillators = [];
}

function playCompletionAlarm() {
    stopCompletionAlarm();

    const context = getAlarmAudioContext();

    if (!context) {
        timerStatus.textContent =
            "Session complete! Your browser does not support audio.";
        return;
    }

    const thisAlarm = alarmGeneration;

    function startAlarm() {
        if (
            thisAlarm !== alarmGeneration ||
            context.state !== "running"
        ) {
            return;
        }

        // Alternating high-low alarm tones for approximately 20 seconds.
        const alarmLength = 20;
        const beepInterval = 0.58;
        const beepDuration = 0.46;
        const frequencies = [880, 1175, 880, 1320];

        for (
            let offset = 0, index = 0;
            offset < alarmLength - beepDuration;
            offset += beepInterval, index++
        ) {
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            const startsAt = context.currentTime + offset;

            oscillator.type = "square";
            oscillator.frequency.setValueAtTime(
                frequencies[index % frequencies.length],
                startsAt
            );

            // Stronger, clearly audible beep; actual loudness
            // also depends on the computer's output volume.
            gain.gain.setValueAtTime(0.0001, startsAt);
            gain.gain.exponentialRampToValueAtTime(
                0.45,
                startsAt + 0.025
            );
            gain.gain.setValueAtTime(
                0.45,
                startsAt + 0.34
            );
            gain.gain.exponentialRampToValueAtTime(
                0.0001,
                startsAt + beepDuration
            );

            oscillator.connect(gain);
            gain.connect(context.destination);

            alarmOscillators.push(oscillator);

            oscillator.start(startsAt);
            oscillator.stop(startsAt + beepDuration);
        }

        // Release references after the final beep has finished.
        alarmTimeout = setTimeout(() => {
            if (thisAlarm === alarmGeneration) {
                alarmOscillators = [];
                alarmGeneration++;
            }

            alarmTimeout = null;
        }, alarmLength * 1000);
    }

    if (context.state === "suspended") {
        context.resume()
            .then(startAlarm)
            .catch(error => {
                console.warn("Alarm playback failed.", error);
            });
    } else {
        startAlarm();
    }
}

// ================================================
// CONNECT BUTTONS AND INITIALIZE TASKBLOOM TIMER
// ================================================

startTimerButton.addEventListener("click", prepareAlarmAudio);
startTimerButton.addEventListener("click", startPomodoro);

pauseTimerButton.addEventListener("click", pausePomodoro);
resetTimerButton.addEventListener("click", resetPomodoro);

updateDurationInputAvailability();
updateTimerDisplay();
updateSessionsDisplay();
showRandomQuote();
