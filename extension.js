const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

let fileData = {}; // data z JSON souboru
let wholeTime = null; // celkový čas od aktivace rozšíření

let currentFile = null; // aktuálně otevřený soubor
let currentTime = null; // čas konkrétního souboru
let timesFile = {}; // časy souborů dnes
let opened = 0; // Počet otevření souboru

const fileName = 'code-time-data.json';

const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
const filePath = workspaceFolder
    ? path.join(workspaceFolder, fileName)
    : path.join(__dirname, fileName);

const outputChannel = vscode.window.createOutputChannel('Code Time Analyzer');
outputChannel.appendLine('Code Time Analyzer activated!');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) { // Aktivace rozšíření
    wholeTime = new Date();
    wholeTime.setHours(wholeTime.getHours() + 2); // SELČ
    fileData = getDataFromFile();
    setTimesFile(fileData);

    statusBarInit(context);

    const changeEditorDisposable = vscode.window.onDidChangeActiveTextEditor((editor) => { // Změna okna
        if (currentFile && currentTime) {
            let now = new Date();
            now.setHours(now.getHours() + 2); // SELČ
            // @ts-ignore
            const timeSpent = Math.floor((now - currentTime) / 1000);
            if (timesFile[currentFile])
                timesFile[currentFile] += timeSpent;
            else
                timesFile[currentFile] = timeSpent;

            saveToFile();
        }

        currentFile = editor?.document?.fileName;
        let temp = new Date();
        temp.setHours(temp.getHours() + 2); // SELČ
        currentTime = temp;
    });

    context.subscriptions.push(changeEditorDisposable);
}

function setTimesFile(data) { // Nastaví timesFile na aktuální data
    let now = new Date();
    now.setHours(now.getHours() + 2); // přidá 2 hodiny k aktuálnímu času
    let today = now.toISOString().split('T')[0]; // získej dnešní datum ve formátu YYYY-MM-DD

    timesFile = {};

    if (data[today] && data[today].files)
        timesFile = timesFileToSeconds(data[today].files); // převede časy souborů na sekundy
    else
        timesFile = {}; // pokud nejsou data pro dnešek, nastav prázdný objekt
}

function deactivate() { // Deaktivace rozšíření
    saveToFile();
}

function formatTime(seconds) { // Formátuje čas v sekundách na HH:MM:SS
    // Kontrola na NaN a neplatné hodnoty
    if (isNaN(seconds) || seconds < 0) 
        return "00:00:00";
    

    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

function getDataFromFile() { // Získá data z JSON souboru
    if (fs.existsSync(filePath)) {
        try {
            const data = fs.readFileSync(filePath, 'utf-8');
            if (!data.trim()) {
                return {};
            }
            return JSON.parse(data);
        } catch (error) {
            vscode.window.showErrorMessage(`Error reading data file: ${error.message}`);
            if (outputChannel) {
                outputChannel.appendLine(`Error reading data file: ${error.message}`);
            }
            return {};
        }
    } else {
        return {};
    }
}

function statusBarInit(context) { // Inicializace stavového řádku
    const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    statusBar.tooltip = 'Zobrazit statistiky kódování';
    statusBar.command = 'extension.showCodingStats';

    statusBar.text = `$(clock) Coding Stats`;
    statusBar.show();

    // Funkce pro aktualizaci textu status baru
    function updateStatusBar() {
        // NOTE:
        saveToFile(); // Uložení dat do souboru při každé aktualizaci status baru
        let now = new Date();
        now.setHours(now.getHours() + 2); // SELČ
        let today = now.toISOString().split('T')[0];

        // Získej dnešní celkový čas
        const todayData = fileData[today]?.summary || { duration: '00:00:00' };
        //const currentFileTime = currentFile && timesFile[currentFile] ? formatTime(timesFile[currentFile]) : '00:00:00';

        statusBar.text = `$(clock) Today: ${todayData.duration} `; // | Current: ${currentFileTime}
    }

    // Počáteční aktualizace
    updateStatusBar();

    // Automatická aktualizace každých 1 sekundu
    const updateInterval = setInterval(updateStatusBar, 1000);

    // Přidej interval do subscriptions pro správné čištění
    context.subscriptions.push({
        dispose: () => clearInterval(updateInterval)
    });

    context.subscriptions.push(statusBar);

    const command = vscode.commands.registerCommand('extension.showCodingStats', () => {
        showWebviewPanel(context); // <-- předat context
    });
    context.subscriptions.push(command);
}

function convertToSeconds(timeString) { // Převede časový řetězec na sekundy
    if (!timeString || typeof timeString !== 'string') 
        return 0;
    

    const parts = timeString.split(':').map(Number);
    if (parts.length === 3 && !parts.some(isNaN))
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    else if (parts.length === 2 && !parts.some(isNaN))
        return parts[0] * 60 + parts[1];
    else if (parts.length === 1 && !isNaN(parts[0]))
        return parts[0];
    else
        return 0;
}

function saveToFile() { // Uloží data do JSON souboru
    try {
        let now = new Date();
        now.setHours(now.getHours() + 2); // SELČ
        let today = now.toISOString().split('T')[0];

        // @ts-ignore
        const durationTime = Math.floor((now - wholeTime) / 1000);
        wholeTime = new Date();
        wholeTime.setHours(wholeTime.getHours() + 2); // SELČ

        const existingDuration = fileData[today]?.summary?.duration ? convertToSeconds(fileData[today].summary.duration) : 0;
        const sumTime = durationTime + existingDuration;

        let data = { ...fileData };

        data[today] = {
            summary: {
                last_save: today,
                duration: formatTime(sumTime),
                opened: opened,
            },
            files: formatTimesFile({ ...timesFile })
        };

        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        fileData = data;

    } catch (error) {
        vscode.window.showErrorMessage(`Error saving data: ${error.message}`);
        if (outputChannel) {
            outputChannel.appendLine(`Error saving data: ${error.message}`);
        }
    }
}

function formatTimesFile(timesFile) { // Formátuje timesFile pro uložení
    const result = {};
    for (const [file, seconds] of Object.entries(timesFile)) {
        // Kontrola na platnou hodnotu před formátováním
        const validSeconds = isNaN(seconds) || seconds < 0 ? 0 : seconds;
        result[file] = formatTime(validSeconds);
    }
    return result;
}

function timesFileToSeconds(timesFile) { // Převede timesFile z formátu HH:MM:SS na sekundy
    if (!timesFile) return {};

    const result = {};
    for (const [file, time] of Object.entries(timesFile)) {
        if (typeof time === 'number' && !isNaN(time)) {
            result[file] = time;
            continue;
        }

        if (typeof time === 'string') {
            const converted = convertToSeconds(time);
            result[file] = converted;
        } else {
            result[file] = 0;
        }
    }
    return result;
}

function showWebviewPanel(context) { // <-- přijímat context
    const panel = vscode.window.createWebviewPanel(
        'codingStats',
        'Coding Time Report',
        vscode.ViewColumn.One,
        { enableScripts: true }
    );

    const now = new Date();
    now.setHours(now.getHours() + 2); // SELČ
    const today = now.toISOString().split('T')[0];
    const todayData = fileData[today]?.summary || { duration: '00:00:00', opened: 0, last_duration: '00:00:00' };

    const durations = Object.values(fileData)
        .map(entry => entry.summary?.duration)
        .filter(dur => typeof dur === 'string');

    let totalTime = 0;
    if (durations.length > 0) {
        totalTime = durations.reduce((acc, dur) => {
            const [h, m, s] = dur.split(':').map(Number);
            if (!isNaN(h) && !isNaN(m) && !isNaN(s)) {
                return acc + h * 3600 + m * 60 + s;
            }
            return acc;
        }, 0);
    }

    const totalH = Math.floor(totalTime / 3600).toString().padStart(2, '0');
    const totalM = Math.floor((totalTime % 3600) / 60).toString().padStart(2, '0');
    const totalS = Math.floor(totalTime % 60).toString().padStart(2, '0');
    const totalFormatted = `${totalH}:${totalM}:${totalS}`;

    const storedFileTimes = fileData[today]?.files || {};
    const fileTimeTable = Object.entries(storedFileTimes)
        .map(([file, timeValue]) => {
            let seconds = typeof timeValue === 'string' ? convertToSeconds(timeValue) : timeValue;

            // Kontrola na NaN
            if (isNaN(seconds) || seconds < 0) 
                seconds = 0;
            

            const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
            const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
            const s = Math.floor(seconds % 60).toString().padStart(2, '0');
            const timeFormatted = `${h}:${m}:${s}`;
            const shortName = path.basename(file);
            return `<tr><td>${shortName}</td><td>${timeFormatted}</td></tr>`;
        }).join('');

    panel.webview.html = getWebviewContent(todayData, totalFormatted, fileTimeTable);
}

function getWebviewContent(todayData, totalFormatted, fileTimeTable) { // Webview HTML obsah
    // Prepare data for the last 7 days
    const today = new Date();
    today.setHours(today.getHours() + 2); // SELČ
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        last7Days.push(d.toISOString().split('T')[0]);
    }

    // Get durations for each day
    const dailyDurations = last7Days.map(date => {
        const dur = (fileData[date]?.summary?.duration) || "00:00:00";
        return convertToSeconds(dur);
    });

    // Format labels for chart (e.g., "Mon", "Tue", ...)
    const dayLabels = last7Days.map(dateStr => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('cs-CZ', { weekday: 'short' });
    });

    // Prepare pie chart data for today's files
    const todayStr = today.toISOString().split('T')[0];
    const todayFiles = fileData[todayStr]?.files || {};

    const pieData = [];
    const pieLabels = [];
    const pieColors = [];

    // Generate colors for pie chart
    const colors = [
        '#00ffcc', '#ff6384', '#36a2eb', '#ffce56', '#4bc0c0',
        '#9966ff', '#ff9f40', '#ff6384', '#c9cbcf', '#4bc0c0'
    ];

    let colorIndex = 0;
    Object.entries(todayFiles).forEach(([file, timeValue]) => {
        const seconds = typeof timeValue === 'string' ? convertToSeconds(timeValue) : timeValue;
        if (seconds > 0) {
            pieData.push(seconds);
            pieLabels.push(path.basename(file));
            pieColors.push(colors[colorIndex % colors.length]);
            colorIndex++;
        }
    });

    return `
    <!DOCTYPE html>
    <html lang="cs">
    <head>
        <meta charset="UTF-8">
        <title>Statistiky kódování</title>
        <style>
            body {
                background-color: #1e1e1e;
                color: white;
                font-family: sans-serif;
                padding: 20px;
            }
            .card {
                background: #2e2e2e;
                padding: 15px;
                margin-bottom: 10px;
                border-radius: 10px;
                box-shadow: 0 0 10px #00000066;
            }
            h1 {
                color: #00ffcc;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 15px;
            }
            th, td {
                padding: 8px;
                text-align: left;
                border-bottom: 1px solid #444;
            }
            th {
                color: #00ffcc;
            }
            .chart-container {
                background: #232323;
                border-radius: 10px;
                padding: 20px;
                margin-bottom: 20px;
            }
            .charts-row {
                display: flex;
                gap: 20px;
                margin-bottom: 20px;
            }
            .chart-half {
                flex: 1;
                background: #232323;
                border-radius: 10px;
                padding: 20px;
                min-height: 400px;
            }
            .week-container {
                height: 350px;
                position: relative;
            }
            .pie-container {
                height: 350px;
                position: relative;
            }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    </head>
    <body>
        <h1>Coding Statistics</h1>
        
        <div class="charts-row">
            <div class="chart-half">
                <h3>📊 Týdenní přehled</h3>
                <div class="week-container">
                    <canvas id="weekChart"></canvas>
                </div>
            </div>
            <div class="chart-half">
                <h3>🥧 Dnešní soubory</h3>
                <div class="pie-container">
                    <canvas id="pieChart"></canvas>
                </div>
            </div>
        </div>
        
        <div class="card">🕒 Dnes: ${todayData.duration}</div>
        <div class="card">📈 Poslední session: ${todayData.last_duration}</div>
        <div class="card">🔁 Počet otevření dnes: ${todayData.opened}</div>
        <div class="card">📊 Celkem: ${totalFormatted}</div>

        <div class="card">
            <h2>🗂 Časy po souborech</h2>
            <table>
                <tr><th>Soubor</th><th>Čas</th></tr>
                ${fileTimeTable}
            </table>
        </div>
        <script>
            // Format seconds to HH:MM:SS
            function formatTime(sec) {
                if (isNaN(sec) || sec < 0) return "00:00:00";
                const h = Math.floor(sec / 3600).toString().padStart(2, '0');
                const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
                const s = Math.floor(sec % 60).toString().padStart(2, '0');
                return \`\${h}:\${m}:\${s}\`;
            }

            // Week chart
            const weekCtx = document.getElementById('weekChart').getContext('2d');
            const weekChart = new Chart(weekCtx, {
                type: 'bar',
                data: {
                    labels: ${JSON.stringify(dayLabels)},
                    datasets: [{
                        label: 'Doba kódování (hh:mm:ss)',
                        data: ${JSON.stringify(dailyDurations)},
                        backgroundColor: '#00ffcc88',
                        borderColor: '#00ffcc',
                        borderWidth: 2
                    }]
                },
                options: {
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return \`Doba kódování: \${formatTime(context.parsed.y)}\`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return formatTime(value);
                                },
                                color: "#fff"
                            },
                            grid: { color: "#444" }
                        },
                        x: {
                            ticks: { color: "#fff" },
                            grid: { color: "#444" }
                        }
                    },
                    responsive: true,
                    maintainAspectRatio: false
                }
            });

            // Pie chart for today's files
            const pieCtx = document.getElementById('pieChart').getContext('2d');
            const pieChart = new Chart(pieCtx, {
                type: 'pie',
                data: {
                    labels: ${JSON.stringify(pieLabels)},
                    datasets: [{
                        data: ${JSON.stringify(pieData)},
                        backgroundColor: ${JSON.stringify(pieColors)},
                        borderColor: '#1e1e1e',
                        borderWidth: 2
                    }]
                },
                options: {
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: '#fff',
                                padding: 15,
                                usePointStyle: true
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.parsed;
                                    const percentage = ((value / ${JSON.stringify(pieData)}.reduce((a, b) => a + b, 0)) * 100).toFixed(1);
                                    return \`\${label}: \${formatTime(value)} (\${percentage}%)\`;
                                }
                            }
                        }
                    },
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        animateScale: true,
                        animateRotate: true
                    }
                }
            });
        </script>
    </body>
    </html>
    `;
}

module.exports = {
    activate,
    deactivate
};
