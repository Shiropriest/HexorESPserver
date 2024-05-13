/*
by: Tomas Hmiro
at: May 2024
for: Hexor II - at TUL 

In this file there are functions to control automatic movements of robot, functions to log operator actions
    
*/


let actionLog = [];
let PID_time = 10; //10ms base ~~ P

function atomaticNav() {
    directionPID();
}

function directionPID() {
    let endPoint = importantPathPoints[0];
    let next_impPoint_dir = [endPoint[0] - Robot.x, endPoint[1] - Robot.y];
    let rotToNextPoint = Math.asin(next_impPoint_dir[1] / next_impPoint_dir[0]);

    let d = (Robot.rot - rotToNextPoint);
    PID_time = 10 * d;
   
    if (d > 10 || d <= 180) {
        //steerLEFT
        dirBtnPushed("dirButton4");
        setTimeout(fcnStop, PID_time);
    }
    else if (d < -10 || d > -180) {
        //steerRight
        dirBtnPushed("dirButton6");
        setTimeout(fcnStop, PID_time);
    }
    else {
        //fwd
        dirBtnPushed("dirButton2");
    }
}

function fcnStop() {
    dirBtnPushed("dirButton5");
}

function loggingFunction(action) {
    //ver. 0.01 
    let currentDate = new Date();
    const timestamp = currentDate;
    const t_actionLog = { action: action, time: timestamp, operatorMode: robotMode - 5, operatorLogged: privilages }; 
    actionLog[actionLog.length] = t_actionLog;

    document.getElementById("lastCommand").innerHTML = "Posledni povel: btn: " + action + " mode: " + t_actionLog.operatorMode + " op: " + privilages ;
}

function askForObjectsAround() {
    let text = new XMLHttpRequest();
    text.onreadystatechange = function () {
        if (text.readyState == 4 && text.status == 200) {
            let response = 0;
            response = this.response.split(";");
            //offset for this map system
            const numberOfScanAngles = response[0]; //at first index there is deviding number
            const degInc = 180 / numberOfScanAngles; //angle increment

            for (let i = 0; i < response.length -1; i++) {
                const x = Math.floor(response[i + 1] * Math.cos(Robot.rot + (i * decInc) - 90));
                const y = Math.floor(response[i + 1] * Math.sin(Robot.rot + (i * decInc) - 90));

            }
        }
        else if (text.status == 404 || text.status == 204) {
            
        }
    }
    text.open("GET", "/par?position=&", true);
    text.send();
}

function mapAutoDraw(x,y) {
    const locX2 = x;
    const locY2 = y;
    
    img[locY2 * mapImageW + locX2] = 1;
    objGoal = document.getElementById("objGoal");
    objGoal.innerHTML = "Nová pøekážka na: " + locX2 + ", " + locY2;
    change = true;
    drawOpObjPath[drawOpPathIdx++] = 1;
    Target.change = true; 

}
function ResetTarget() {
    Target.en = true;
}