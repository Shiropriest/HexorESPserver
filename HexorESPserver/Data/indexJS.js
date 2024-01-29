const divider = document.getElementById('divider');
const divider1 = document.getElementById('divider1');
const column1 = document.getElementById('column1');
const column1Top = document.getElementById('column1-top');
const column1Bottom = document.getElementById('column1-bottom');
const column2 = document.getElementById('column2');
const mMBtn = document.getElementById('mainMenuButton');
const BtnTail = document.getElementById("MMtail"),
    BtnRobot = document.getElementById("MMrobot");

let isResizing = false;
var callCount = 0;
let remoteModes = ["robot", "tail"], remoteMode = remoteModes[0];
modeChange();
//var RFtimerID =
    setInterval(refreshData, 5000);

//init on 50% all;
column2.style.width = 75 + '%';
column1.style.width = 25 + '%';
column1Top.style.height = 45 + '%';
column1Bottom.style.height = 55 + '%';

//# in setKeys array for setting a keybinding
const   forward = 0, 
        back = 1,
        left = 2,
        right = 3,
        stop = 4,
        mode1 = 5, //teleoprator
        mode2 = 6, //semiauto
        mode3 = 7, //auto
        mode4 = 8; //presentation

const setKeys = ['w','s','a','d',' ','g','h','j','k'];

document.addEventListener('keypress', (e) => {
    console.log(e.key);

    switch (e.key) {
        case setKeys[left]: console.log('left');
            break;
        case setKeys[back]: console.log('back');
            break;
        case setKeys[right]: console.log('right');
            break;
        case setKeys[forward]: console.log('fwd');
            break; 
        case setKeys[stop]: console.log('stop');
            break;
        case setKeys[mode1]: console.log('mode1');
            break;
        case setKeys[mode2]: console.log('mode2');
            break;
        case setKeys[mode3]: console.log('mode3');
            break;
        case setKeys[mode4]: console.log('mode4');
            break;
        default:
            break;
    }
    
});

divider.addEventListener('mousedown', (e) => {
    isResizing = true;

    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
});

divider.addEventListener('touchstart', (e) => {
    isResizing = true;

    document.addEventListener('touchmove', handleResize);
    document.addEventListener('touchend', stopResize);
    document.addEventListener('touchcancel', stopResize);
});

divider1.addEventListener('mousedown', (e) => {
    isResizing = true;

    document.addEventListener('mousemove', handleResize1);
    document.addEventListener('mouseup', stopResize);
});

divider1.addEventListener('touchstart', (e) => {
    isResizing = true;

    document.addEventListener('touchmove', handleResize1);
    document.addEventListener('touchend', stopResize);
    document.addEventListener('touchcancel', stopResize);
});

BtnRobot.addEventListener("click", () => {
    remoteMode = remoteModes[0];
    modeChange();
});

BtnTail.addEventListener("click", () => {
    remoteMode = remoteModes[1];
    modeChange();
});

function handleResize(e) {
    if (isResizing) {
        const offset = (e.clientX/document.body.clientWidth)*100;
        column2.style.width = (100-offset) + '%';
        column1.style.width = offset + '%';
        draw();
    }
}

function handleResize1(e) {
    if (isResizing) {
        const offset = (e.clientY / document.body.clientHeight)*100;
        column1Top.style.height = offset + '%';
        column1Bottom.style.height = (100-offset) + '%';
    }
}

function stopResize() {
    isResizing = false;
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mousemove', handleResize1);
    document.removeEventListener('mouseup', stopResize);
}

function refreshData() {
    
    const battery = document.getElementById("battery");
    batteryStateColour = "#ae00ff";
    batteryPercentage = 100 + "%";
    let stav = "linear-gradient(90deg," + batteryStateColour + " " + batteryPercentage + ", lightgrey 1%)";
    battery.style.background = stav;
    //console.log(batteryPercentage);
    //callCount += 1;
    //if (callCount > 99){
    //     callCount = 0;
    //}   
}

function modeChange() {
    switch (remoteMode) {
        case remoteModes[0]:
            BtnRobot.style.backgroundColor = "#23ff01";
            BtnTail.style.backgroundColor = "lightgrey";
            break;
        case remoteModes[1]:
            BtnTail.style.backgroundColor = "#23ff01";
            BtnRobot.style.backgroundColor = "lightgrey";
            break;       
        default:
            remoteMode = remoteModes[0];
            modeChange();
            break;
    }
}


